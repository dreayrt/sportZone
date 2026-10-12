<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseController;
use App\Models\Booking;
use App\Models\BookingStatusHistory;
use App\Models\Payment;
use App\Services\VietQrService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PaymentController extends BaseController
{
    public function __construct(
        protected VietQrService $vietQrService
    ) {}

    /**
     * Sinh mã VietQR động cho đơn đặt sân
     * POST /api/v1/payments/generate-qr
     */
    public function generatePaymentQR(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'booking_id' => 'required_without:booking_code|integer|nullable',
            'booking_code' => 'required_without:booking_id|string|nullable',
        ]);

        $query = Booking::query();

        if (!empty($validated['booking_id'])) {
            $query->where('id', $validated['booking_id']);
        } else {
            $query->where('booking_code', $validated['booking_code']);
        }

        $booking = $query->with(['court.venue', 'user'])->first();

        if (!$booking) {
            return $this->notFound('Không tìm thấy thông tin đơn đặt sân.');
        }

        // Kiểm tra nếu đơn đã thanh toán xong
        if ($booking->payment_status === 'paid') {
            return $this->errorResponse('Đơn đặt sân này đã được thanh toán hoàn tất.', 400, [
                'payment_status' => $booking->payment_status,
                'status' => $booking->status,
            ]);
        }

        // Tạo nội dung chuyển khoản chuẩn (ví dụ SZ77812 hoặc SZ-77812)
        $transferDescription = $this->vietQrService->makeTransferDescription(
            $booking->booking_code ?: $booking->id
        );

        $qrData = $this->vietQrService->generateQrUrl(
            amount: (int)$booking->total_price,
            description: $transferDescription
        );

        return $this->successResponse([
            'booking' => [
                'id' => $booking->id,
                'booking_code' => $booking->booking_code,
                'customer_name' => $booking->customer_name,
                'customer_phone' => $booking->customer_phone,
                'court_name' => $booking->court?->name,
                'venue_name' => $booking->court?->venue?->name,
                'booking_date' => $booking->booking_date?->format('Y-m-d'),
                'time_slot' => substr($booking->start_time, 0, 5) . ' - ' . substr($booking->end_time, 0, 5),
                'total_price' => $booking->total_price,
                'payment_status' => $booking->payment_status,
                'status' => $booking->status,
            ],
            'payment' => [
                'method' => 'vietqr',
                'qr_image_url' => $qrData['qr_image_url'],
                'fallback_qr_url' => $qrData['fallback_qr_url'],
                'bank_name' => $qrData['bank_name'],
                'account_no' => $qrData['account_no'],
                'account_name' => $qrData['account_name'],
                'amount' => $qrData['amount'],
                'transfer_content' => $transferDescription,
                'expires_in_minutes' => 15,
                'expires_at' => now()->addMinutes(15)->toIso8601String(),
            ],
        ], 'Tạo mã VietQR thanh toán thành công.');
    }

    /**
     * Xử lý Webhook gửi sang từ SePay (Đã qua Middleware HMAC-SHA256)
     * POST /api/v1/payments/sepay-webhook
     */
    public function handleSepayWebhook(Request $request): JsonResponse
    {
        $payload = $request->all();

        Log::info('[SePay Webhook] Nhận thông báo giao dịch hợp lệ', $payload);

        // 1. Chỉ xử lý giao dịch tiền vào (transferType = in)
        $transferType = strtolower($payload['transferType'] ?? 'in');
        if ($transferType !== 'in') {
            return response()->json([
                'success' => true,
                'message' => 'Bỏ qua: Không phải giao dịch tiền vào.',
            ]);
        }

        $transferAmount = (int)($payload['transferAmount'] ?? 0);
        $content = (string)($payload['content'] ?? '');
        $referenceCode = (string)($payload['referenceCode'] ?? ($payload['id'] ?? uniqid('sepay_')));
        $transactionDate = $payload['transactionDate'] ?? now();

        // 2. Chống xử lý trùng lặp giao dịch (Idempotency)
        $existingPayment = Payment::where('transaction_code', $referenceCode)->first();
        if ($existingPayment) {
            Log::info("[SePay Webhook] Giao dịch {$referenceCode} đã được ghi nhận trước đó.");
            return response()->json([
                'success' => true,
                'message' => 'Giao dịch đã được xử lý trước đó.',
            ]);
        }

        // 3. Trích xuất mã tham chiếu đơn đặt sân từ nội dung chuyển khoản
        $matchedReference = $this->vietQrService->extractBookingReference($content);

        if (!$matchedReference) {
            Log::warning("[SePay Webhook] Không tìm thấy mã đơn trong nội dung CK: '{$content}'", [
                'reference_code' => $referenceCode,
                'amount' => $transferAmount,
            ]);

            // Vẫn trả 200 cho SePay để không bị retry vô tận, đồng thời ghi log cảnh báo
            return response()->json([
                'success' => true,
                'message' => 'Không tìm thấy mã đơn đặt sân trong nội dung chuyển khoản.',
            ]);
        }

        // 4. Tìm kiếm đơn đặt sân trong database
        // Thử tìm theo mã chuẩn, mã bỏ gạch ngang, hoặc theo ID
        $cleanRef = str_replace(['-', '_'], '', $matchedReference);
        
        $booking = Booking::where('booking_code', $matchedReference)
            ->orWhereRaw("REPLACE(REPLACE(booking_code, '-', ''), '_', '') = ?", [$cleanRef])
            ->orWhere(function ($q) use ($matchedReference, $cleanRef) {
                // Trích xuất số cuối nếu là dạng SZ12 hoặc SZ-12
                if (preg_match('/\d+$/', $cleanRef, $m)) {
                    $q->where('id', (int)$m[0]);
                }
            })
            ->first();

        if (!$booking) {
            Log::warning("[SePay Webhook] Đơn đặt sân không tồn tại trong hệ thống: '{$matchedReference}'");
            return response()->json([
                'success' => true,
                'message' => 'Mã đơn không tồn tại.',
            ]);
        }

        // 5. Cập nhật trạng thái và lưu lịch sử giao dịch trong DB Transaction
        DB::beginTransaction();
        try {
            // Xác định trạng thái thanh toán mới
            $oldStatus = $booking->status;
            $newPaymentStatus = ($transferAmount >= $booking->total_price) ? 'paid' : 'partial';
            $newBookingStatus = ($booking->status === 'pending') ? 'confirmed' : $booking->status;

            // Tạo record trong bảng payments
            Payment::create([
                'booking_id' => $booking->id,
                'amount' => $transferAmount,
                'method' => 'vietqr',
                'status' => 'paid',
                'transaction_code' => $referenceCode,
                'note' => mb_substr($content, 0, 250),
                'paid_at' => $transactionDate,
                'created_by' => $booking->user_id,
            ]);

            // Cập nhật booking
            $booking->update([
                'payment_status' => $newPaymentStatus,
                'payment_method' => 'vietqr',
                'status' => $newBookingStatus,
            ]);

            // Ghi lịch sử trạng thái nếu có thay đổi
            BookingStatusHistory::create([
                'booking_id' => $booking->id,
                'old_status' => $oldStatus,
                'new_status' => $newBookingStatus,
                'note' => "Thanh toán thành công " . number_format($transferAmount) . "đ qua SePay VietQR (Mã GD: {$referenceCode})",
                'changed_by' => null, // Hệ thống tự động
            ]);

            DB::commit();

            Log::info("[SePay Webhook] Đã xác nhận thanh toán thành công cho đơn #{$booking->id} ({$booking->booking_code})");

            return response()->json([
                'success' => true,
                'message' => 'Xác nhận thanh toán thành công.',
                'booking_id' => $booking->id,
                'booking_code' => $booking->booking_code,
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('[SePay Webhook] Lỗi khi cập nhật dữ liệu thanh toán: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Lỗi hệ thống khi cập nhật trạng thái đơn.',
            ], 500);
        }
    }

    /**
     * API kiểm tra trạng thái thanh toán (dành cho Frontend Polling)
     * GET /api/v1/payments/status/{idOrCode}
     */
    public function checkPaymentStatus(string|int $idOrCode): JsonResponse
    {
        $booking = Booking::where('id', $idOrCode)
            ->orWhere('booking_code', $idOrCode)
            ->with(['payments'])
            ->first();

        if (!$booking) {
            return $this->notFound('Không tìm thấy thông tin đơn đặt sân.');
        }

        return $this->successResponse([
            'booking_id' => $booking->id,
            'booking_code' => $booking->booking_code,
            'total_price' => $booking->total_price,
            'payment_status' => $booking->payment_status,
            'status' => $booking->status,
            'is_paid' => $booking->payment_status === 'paid',
            'payments' => $booking->payments->map(fn($p) => [
                'id' => $p->id,
                'amount' => $p->amount,
                'method' => $p->method,
                'status' => $p->status,
                'transaction_code' => $p->transaction_code,
                'paid_at' => $p->paid_at?->format('Y-m-d H:i:s'),
            ]),
        ], 'Lấy trạng thái thanh toán thành công.');
    }

    /**
     * Danh sách lịch sử giao dịch (Dành cho Admin / Owner)
     * GET /api/v1/payments
     */
    public function index(Request $request): JsonResponse
    {
        $payments = Payment::with(['booking.court.venue', 'booking.user'])
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 20));

        return $this->successResponse($payments, 'Lấy danh sách giao dịch thành công.');
    }
}
