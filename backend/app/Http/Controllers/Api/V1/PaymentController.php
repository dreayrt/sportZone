<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseController;
use App\Models\Booking;
use App\Models\BookingStatusHistory;
use App\Models\Payment;
use App\Models\User;
use App\Services\SePayQrService;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PaymentController extends BaseController
{
    public function __construct(
        protected SePayQrService $sePayQrService
    ) {}

    /**
     * Sinh QR thanh toán SePay cho đơn đặt sân
     * POST /api/v1/payments/generate-qr
     */
    public function generatePaymentQR(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'booking_code' => 'required|string|max:30',
        ]);

        $booking = Booking::with(['court.venue'])
            ->where('booking_code', strtoupper(trim($validated['booking_code'])))
            ->first();

        if (! $booking) {
            return $this->notFound('Không tìm thấy thông tin đơn đặt sân.');
        }

        if (! $this->canAccessBooking($request->user(), $booking)) {
            return $this->forbidden('Bạn không có quyền thanh toán đơn đặt sân này.');
        }

        if (in_array($booking->status, ['cancelled', 'completed', 'no_show'], true)) {
            return $this->errorResponse('Đơn đặt sân đã kết thúc hoặc đã hủy nên không thể thanh toán.', 400);
        }

        if ($booking->payment_method !== 'vietqr') {
            return $this->errorResponse('Đơn này không sử dụng thanh toán SePay.', 400);
        }

        if ($booking->payment_status === 'paid') {
            return $this->errorResponse('Đơn đặt sân này đã được thanh toán hoàn tất.', 400, [
                'payment_status' => $booking->payment_status,
                'status' => $booking->status,
            ]);
        }

        $totalPaid = (int) $booking->payments()->where('status', 'paid')->sum('amount');
        $remainingAmount = max(0, (int) $booking->total_price - $totalPaid);
        if ($remainingAmount === 0) {
            return $this->errorResponse('Đơn đặt sân này đã được thanh toán đủ.', 400, [
                'payment_status' => $booking->payment_status,
                'total_paid' => $totalPaid,
            ]);
        }

        // Tạo nội dung chuyển khoản chuẩn (ví dụ SZ77812 hoặc SZ-77812)
        $transferDescription = $this->sePayQrService->makeTransferDescription(
            $booking->booking_code ?: $booking->id
        );

        $qrData = $this->sePayQrService->generateQrUrl(
            amount: $remainingAmount,
            description: $transferDescription
        );

        if (empty($qrData['account_no'])) {
            return $this->errorResponse('Chưa cấu hình tài khoản SePay cho môi trường demo.', 500);
        }

        return $this->successResponse([
            'booking' => [
                'booking_code' => $booking->booking_code,
                'booking_date' => $booking->booking_date?->format('Y-m-d'),
                'time_slot' => substr($booking->start_time, 0, 5).' - '.substr($booking->end_time, 0, 5),
                'total_price' => $booking->total_price,
                'payment_status' => $booking->payment_status,
                'status' => $booking->status,
            ],
            'payment' => [
                'provider' => 'sepay',
                'method' => 'vietqr',
                'qr_image_url' => $qrData['qr_image_url'],
                'bank_name' => $qrData['bank_name'],
                'account_no' => $qrData['account_no'],
                'account_name' => $qrData['account_name'],
                'amount' => $qrData['amount'],
                'transfer_content' => $transferDescription,
                'expires_in_minutes' => 15,
                'expires_at' => now()->addMinutes(15)->toIso8601String(),
            ],
        ], 'Tạo mã QR thanh toán qua SePay thành công.');
    }

    /**
     * Xử lý Webhook gửi sang từ SePay (Đã qua Middleware HMAC-SHA256)
     * POST /api/v1/payments/sepay-webhook
     */
    public function handleSepayWebhook(Request $request): JsonResponse
    {
        $payload = $request->all();

        Log::info('[SePay Webhook] Nhận thông báo giao dịch hợp lệ.', [
            'transaction_id' => $payload['id'] ?? null,
            'reference_code' => $payload['referenceCode'] ?? null,
            'transfer_type' => $payload['transferType'] ?? null,
            'amount' => $payload['transferAmount'] ?? null,
        ]);

        // 1. Chỉ xử lý giao dịch tiền vào (transferType = in)
        $transferType = strtolower($payload['transferType'] ?? 'in');
        if ($transferType !== 'in') {
            return response()->json([
                'success' => true,
                'message' => 'Bỏ qua: Không phải giao dịch tiền vào.',
            ]);
        }

        $transferAmount = (int) ($payload['transferAmount'] ?? 0);
        $content = (string) ($payload['content'] ?? '');
        $sepayTransactionId = trim((string) ($payload['id'] ?? ''));
        $bankReferenceCode = trim((string) ($payload['referenceCode'] ?? ''));
        $transactionCode = $sepayTransactionId !== ''
            ? 'SEPAY-'.$sepayTransactionId
            : $bankReferenceCode;
        $transactionDate = $payload['transactionDate'] ?? now();

        if ($transferAmount <= 0 || $transactionCode === '') {
            Log::warning('[SePay Webhook] Thiếu mã giao dịch hoặc số tiền không hợp lệ.', [
                'transaction_code' => $transactionCode,
                'amount' => $transferAmount,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Webhook thiếu mã giao dịch hoặc số tiền không hợp lệ.',
            ], 422);
        }

        // 2. Chống xử lý trùng lặp giao dịch (Idempotency)
        $existingPayment = Payment::where('transaction_code', $transactionCode)->first();
        if ($existingPayment) {
            Log::info("[SePay Webhook] Giao dịch {$transactionCode} đã được ghi nhận trước đó.");

            return response()->json([
                'success' => true,
                'message' => 'Giao dịch đã được xử lý trước đó.',
            ]);
        }

        // 3. Trích xuất mã tham chiếu đơn đặt sân từ nội dung chuyển khoản
        $paymentCode = (string) ($payload['code'] ?? '');
        $matchedReference = null;
        $booking = null;

        // SePay's `code` is derived from its own payment-code pattern and may
        // be shorter than the booking reference in the original bank memo.
        // Check the untouched content first, then fall back to the parsed code.
        foreach ([$content, $paymentCode] as $referenceSource) {
            $candidateReference = $this->sePayQrService->extractBookingReference($referenceSource);
            if (! $candidateReference) {
                continue;
            }

            $matchedReference ??= $candidateReference;
            $cleanCandidate = strtoupper(preg_replace('/[^A-Z0-9]/i', '', $candidateReference));
            $candidateBooking = Booking::whereRaw(
                "UPPER(REPLACE(REPLACE(booking_code, '-', ''), '_', '')) = ?",
                [$cleanCandidate]
            )->first();

            if ($candidateBooking) {
                $matchedReference = $candidateReference;
                $booking = $candidateBooking;
                break;
            }
        }

        if (! $matchedReference) {
            Log::warning('[SePay Webhook] Không tìm thấy mã đơn trong webhook.', [
                'transaction_code' => $transactionCode,
                'sepay_code' => $paymentCode,
                'content' => $content,
                'amount' => $transferAmount,
            ]);

            // Vẫn trả 200 cho SePay để không bị retry vô tận, đồng thời ghi log cảnh báo
            return response()->json([
                'success' => true,
                'message' => 'Không tìm thấy mã đơn đặt sân trong nội dung chuyển khoản.',
            ]);
        }

        if (! $booking) {
            Log::warning('[SePay Webhook] Không tìm thấy đơn khớp mã thanh toán.', [
                'transaction_code' => $transactionCode,
                'sepay_code' => $paymentCode,
                'matched_reference' => $matchedReference,
                'content' => $content,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Mã đơn không tồn tại.',
            ], 422);
        }

        $configuredAccountNo = preg_replace('/\D+/', '', (string) config('services.sepay.account_no', ''));
        $receivedAccountNo = preg_replace('/\D+/', '', (string) ($payload['accountNumber'] ?? ''));
        if ($configuredAccountNo !== '' && $configuredAccountNo !== $receivedAccountNo) {
            Log::warning('[SePay Webhook] Giao dịch đến sai tài khoản nhận tiền.', [
                'transaction_code' => $transactionCode,
                'booking_code' => $booking->booking_code,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Giao dịch đến tài khoản khác; cần đối soát thủ công.',
            ]);
        }

        try {
            $result = DB::transaction(function () use ($booking, $transferAmount, $transactionCode, $bankReferenceCode, $sepayTransactionId, $content, $transactionDate) {
                $lockedBooking = Booking::whereKey($booking->id)->lockForUpdate()->first();
                if (
                    ! $lockedBooking
                    || $lockedBooking->payment_method !== 'vietqr'
                    || in_array($lockedBooking->status, ['cancelled', 'completed', 'no_show'], true)
                ) {
                    return ['ignored' => true, 'booking' => $lockedBooking];
                }

                if (Payment::where('transaction_code', $transactionCode)->exists()) {
                    return ['duplicate' => true, 'booking' => null];
                }

                Payment::create([
                    'booking_id' => $lockedBooking->id,
                    'amount' => $transferAmount,
                    'method' => 'vietqr',
                    'status' => 'paid',
                    'transaction_code' => $transactionCode,
                    'note' => mb_substr(implode(' | ', array_filter([
                        $bankReferenceCode !== '' ? 'SePay reference: '.$bankReferenceCode : null,
                        $sepayTransactionId !== '' ? 'SePay ID: '.$sepayTransactionId : null,
                        $content,
                    ])), 0, 250),
                    'paid_at' => $transactionDate,
                    'created_by' => $lockedBooking->user_id,
                ]);

                $totalPaid = (int) $lockedBooking->payments()->where('status', 'paid')->sum('amount');
                $newPaymentStatus = $totalPaid >= $lockedBooking->total_price ? 'paid' : 'partial';
                $oldBookingStatus = $lockedBooking->status;
                $newBookingStatus = $newPaymentStatus === 'paid' && $oldBookingStatus === 'pending'
                    ? 'confirmed'
                    : $oldBookingStatus;

                $lockedBooking->update([
                    'payment_status' => $newPaymentStatus,
                    'payment_method' => 'vietqr',
                    'status' => $newBookingStatus,
                ]);

                $overpaidAmount = max(0, $totalPaid - (int) $lockedBooking->total_price);
                if ($overpaidAmount > 0) {
                    Log::warning('[SePay Webhook] Đơn bị thanh toán thừa, cần đối soát thủ công.', [
                        'booking_code' => $lockedBooking->booking_code,
                        'overpaid_amount' => $overpaidAmount,
                        'transaction_code' => $transactionCode,
                    ]);
                }

                if ($oldBookingStatus !== $newBookingStatus) {
                    BookingStatusHistory::create([
                        'booking_id' => $lockedBooking->id,
                        'old_status' => $oldBookingStatus,
                        'new_status' => $newBookingStatus,
                        'note' => "Thanh toán đủ qua SePay (Mã GD: {$transactionCode})",
                        'changed_by' => null,
                    ]);
                }

                return ['duplicate' => false, 'ignored' => false, 'booking' => $lockedBooking->refresh()];
            });

            if ($result['duplicate']) {
                return response()->json([
                    'success' => true,
                    'message' => 'Giao dịch đã được xử lý trước đó.',
                ]);
            }

            if ($result['ignored'] ?? false) {
                return response()->json([
                    'success' => true,
                    'message' => 'Đơn đã kết thúc hoặc đã hủy; giao dịch cần được đối soát thủ công.',
                ]);
            }

            $updatedBooking = $result['booking'];
            Log::info("[SePay Webhook] Đã ghi nhận giao dịch cho đơn #{$updatedBooking->id} ({$updatedBooking->booking_code})", [
                'received_amount' => $transferAmount,
                'total_paid' => $updatedBooking->payments()->where('status', 'paid')->sum('amount'),
                'payment_status' => $updatedBooking->payment_status,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Đã ghi nhận giao dịch SePay.',
                'booking_code' => $updatedBooking->booking_code,
                'payment_status' => $updatedBooking->payment_status,
                'status' => $updatedBooking->status,
            ]);
        } catch (QueryException $e) {
            if (Payment::where('transaction_code', $transactionCode)->exists()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Giao dịch đã được xử lý trước đó.',
                ]);
            }

            Log::error('[SePay Webhook] Lỗi khi cập nhật dữ liệu thanh toán: '.$e->getMessage(), [
                'transaction_code' => $transactionCode,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Lỗi hệ thống khi cập nhật trạng thái đơn.',
            ], 500);
        } catch (\Throwable $e) {
            Log::error('[SePay Webhook] Lỗi khi cập nhật dữ liệu thanh toán: '.$e->getMessage(), [
                'transaction_code' => $transactionCode,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Lỗi hệ thống khi cập nhật trạng thái đơn.',
            ], 500);
        }
    }

    /**
     * API kiểm tra trạng thái thanh toán (dành cho Frontend Polling)
     * GET /api/v1/payments/status/{bookingCode}
     */
    public function checkPaymentStatus(Request $request, string $bookingCode): JsonResponse
    {
        $booking = Booking::with(['court.venue'])
            ->where('booking_code', strtoupper(trim($bookingCode)))
            ->with(['payments'])
            ->first();

        if (! $booking) {
            return $this->notFound('Không tìm thấy thông tin đơn đặt sân.');
        }

        if (! $this->canAccessBooking($request->user(), $booking)) {
            return $this->forbidden('Bạn không có quyền xem trạng thái thanh toán của đơn này.');
        }

        return $this->successResponse([
            'booking_code' => $booking->booking_code,
            'total_price' => $booking->total_price,
            'total_paid' => (int) $booking->payments->where('status', 'paid')->sum('amount'),
            'payment_status' => $booking->payment_status,
            'status' => $booking->status,
            'is_paid' => $booking->payment_status === 'paid',
            'payments' => $booking->payments->map(fn ($p) => [
                'amount' => $p->amount,
                'status' => $p->status,
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
        $user = $request->user();
        if (! $user || (! $user->isAdmin() && ! $user->isOwner())) {
            return $this->forbidden('Chỉ chủ sân hoặc quản trị viên mới được xem lịch sử giao dịch.');
        }

        $query = Payment::with(['booking.court.venue', 'booking.user']);
        if ($user->isOwner()) {
            $query->whereHas('booking.court.venue', function ($venueQuery) use ($user) {
                $venueQuery->where('owner_id', $user->id);
            });
        }

        $payments = $query->orderByDesc('id')->paginate($request->integer('per_page', 20));

        return $this->successResponse($payments, 'Lấy danh sách giao dịch thành công.');
    }

    private function canAccessBooking(User $user, Booking $booking): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        if ($user->isOwner()) {
            return $booking->court?->venue?->owner_id === $user->id;
        }

        return $booking->user_id === $user->id;
    }
}
