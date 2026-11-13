<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseController;
use App\Models\Booking;
use App\Models\Court;
use App\Models\Venue;
use App\Services\BookingService;
use Exception;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class BookingController extends BaseController
{
    protected BookingService $bookingService;

    public function __construct(BookingService $bookingService)
    {
        $this->bookingService = $bookingService;
    }

    /**
     * Danh sách đơn đặt sân (phân quyền & lọc đa tiêu chí)
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Booking::with(['venue:id,name,address,city', 'court:id,name,surface_type', 'bookingAddons', 'voucher:id,code,name']);

        // Tự động quét và hoàn tất các đơn hết giờ thi đấu
        $this->bookingService->autoFinalizeExpiredBookings(
            $user && $user->isOwner() ? $user->id : null,
            $request->filled('venue_id') ? $request->integer('venue_id') : null
        );

        // Phân quyền dữ liệu
        if ($user) {
            if ($user->isCustomer()) {
                $query->where('user_id', $user->id);
            } elseif ($user->isOwner()) {
                $ownerVenueIds = Venue::where('owner_id', $user->id)->pluck('id');
                $query->whereIn('venue_id', $ownerVenueIds);
            }
            // Admin thấy toàn bộ
        }

        $this->validateFilters($request);

        // Lọc theo ngày
        if ($request->filled('date')) {
            $query->whereDate('booking_date', $request->query('date'));
        }

        // Lọc theo cơ sở
        if ($request->filled('venue_id')) {
            $query->where('venue_id', $request->query('venue_id'));
        }

        // Lọc theo sân
        if ($request->filled('court_id')) {
            $query->where('court_id', $request->query('court_id'));
        }

        // Lọc theo trạng thái
        if ($request->filled('status') && $request->query('status') !== 'all') {
            $query->where('status', $request->query('status'));
        }

        // Lọc theo trạng thái thanh toán
        if ($request->filled('payment_status') && $request->query('payment_status') !== 'all') {
            $query->where('payment_status', $request->query('payment_status'));
        }

        // Tìm kiếm nhanh (mã đơn, tên, SĐT)
        if ($request->filled('search')) {
            $search = trim($request->query('search'));
            $query->where(function ($q) use ($search) {
                $q->where('booking_code', 'LIKE', "%{$search}%")
                    ->orWhere('customer_name', 'LIKE', "%{$search}%")
                    ->orWhere('customer_phone', 'LIKE', "%{$search}%");
            });
        }

        if ($request->has('page') || $request->has('per_page')) {
            $bookings = $query->orderByDesc('id')->paginate($request->integer('per_page', 15));
        } else {
            $bookings = $query->orderByDesc('id')->get();
        }

        return $this->successResponse($bookings, 'Lấy danh sách đơn đặt sân thành công');
    }

    /**
     * Tạo đơn đặt sân mới (hỗ trợ online và tại quầy)
     */
    public function store(Request $request): JsonResponse
    {
        foreach (['start_time', 'end_time'] as $field) {
            $time = $request->input($field);
            if (is_string($time) && preg_match('/^\d{2}:\d{2}:00$/', $time)) {
                $request->merge([$field => substr($time, 0, 5)]);
            }
        }

        // This endpoint also supports guest checkout, so it is intentionally
        // outside auth:sanctum middleware. Resolve an optional bearer token
        // explicitly so signed-in customers are still linked to their booking.
        $user = $request->user('sanctum');
        if ($user && $user->status !== 'active') {
            return $this->forbidden('Tài khoản đã bị khóa.');
        }
        $requestedSource = $request->input('source', 'website');
        $isStaffBooking = $user
            && ($user->isOwner() || $user->isAdmin())
            && in_array($requestedSource, ['counter', 'admin'], true);

        $rules = [
            'court_id' => 'required|integer|exists:courts,id',
            'booking_date' => 'required|date_format:Y-m-d',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'customer_name' => 'required|string|max:120',
            'customer_phone' => 'required|string|max:20',
            'customer_email' => 'nullable|email|max:150',
            'note' => 'nullable|string|max:500',
            'addons' => 'nullable|array',
            'addons.*.addon_id' => 'required|integer|distinct|exists:addons,id',
            'addons.*.quantity' => 'required|integer|min:1',
            'voucher_code' => 'nullable|string|max:50',
        ];

        if ($isStaffBooking) {
            $rules['payment_method'] = 'nullable|in:vietqr,cash,bank_transfer';
            $rules['payment_status'] = 'nullable|in:unpaid,paid';
            $rules['source'] = 'required|in:counter,admin';
        }

        $validator = Validator::make($request->all(), $rules, [
            'court_id.required' => 'Vui lòng chọn sân thi đấu.',
            'booking_date.required' => 'Vui lòng chọn ngày đặt sân.',
            'start_time.required' => 'Vui lòng chọn giờ bắt đầu.',
            'end_time.required' => 'Vui lòng chọn giờ kết thúc.',
            'customer_name.required' => 'Vui lòng nhập tên người đặt.',
            'customer_phone.required' => 'Vui lòng nhập số điện thoại liên hệ.',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        try {
            $payload = $validator->validated();

            if ($isStaffBooking) {
                if ($user->isOwner()) {
                    $court = Court::with('venue')->findOrFail($payload['court_id']);
                    if ($court->venue?->owner_id !== $user->id) {
                        return $this->forbidden('Bạn chỉ có thể tạo đơn tại cơ sở sân của mình.');
                    }

                    $payload['source'] = 'counter';
                }

                $payload['payment_method'] = $payload['payment_method'] ?? 'cash';
                $payload['status'] = 'confirmed';
                if ($payload['payment_method'] === 'vietqr') {
                    $payload['payment_status'] = 'unpaid';
                } else {
                    $payload['payment_status'] = $payload['payment_status'] ?? 'unpaid';
                }
            } else {
                // Booking acceptance is automatic; payment is recorded separately.
                $payload['source'] = 'website';
                $payload['status'] = 'confirmed';
                $payload['payment_status'] = 'unpaid';
                $payload['payment_method'] = 'vietqr';
            }

            $booking = $this->bookingService->createBooking(
                $payload,
                $user
            );

            return $this->successResponse($booking, 'Đặt sân thành công! Mã đơn của bạn là '.$booking->booking_code, 201);
        } catch (ValidationException $e) {
            return $this->validationError($e->errors());
        } catch (Exception $e) {
            return $this->errorResponse($e->getMessage(), 422);
        }
    }

    /**
     * Chi tiết đơn đặt sân
     */
    public function show(Request $request, string $idOrCode): JsonResponse
    {
        $user = $request->user();

        $booking = Booking::with([
            'venue:id,owner_id,name,address,district,city,phone',
            'court:id,name,surface_type,indoor,hourly_rate_standard,hourly_rate_peak',
            'bookingAddons',
            'voucher:id,code,name,discount_type,discount_value',
            'statusHistories',
            'payments',
        ])
            ->where(function ($q) use ($idOrCode) {
                if (is_numeric($idOrCode)) {
                    $q->where('id', (int) $idOrCode);
                } else {
                    $q->where('booking_code', strtoupper($idOrCode));
                }
            })
            ->first();

        if (! $booking) {
            return $this->notFound('Không tìm thấy đơn đặt sân tương ứng.');
        }

        if (! $user) {
            return $this->forbidden('Vui lòng đăng nhập để xem thông tin đơn đặt sân.');
        }

        if ($user->isCustomer() && $booking->user_id !== $user->id) {
            return $this->forbidden('Bạn không có quyền xem thông tin đơn đặt sân này.');
        }

        if ($user->isOwner() && $booking->venue?->owner_id !== $user->id) {
            return $this->forbidden('Bạn chỉ có thể xem đơn đặt sân thuộc cơ sở của mình.');
        }

        if (! $user->isAdmin() && ! $user->isCustomer() && ! $user->isOwner()) {
            return $this->forbidden('Bạn không có quyền xem thông tin đơn đặt sân này.');
        }

        return $this->successResponse($booking, 'Lấy chi tiết đơn đặt sân thành công');
    }

    /**
     * Hủy đơn đặt sân
     */
    public function cancel(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $booking = Booking::with('venue')->findOrFail($id);

        if ($user->isOwner() && $booking->venue?->owner_id !== $user->id) {
            return $this->forbidden('Bạn chỉ có thể hủy đơn thuộc cơ sở sân của mình.');
        }

        // Kiểm tra quyền hủy
        if ($user && $user->isCustomer() && $booking->user_id !== $user->id) {
            return $this->forbidden('Bạn không có quyền hủy đơn đặt này.');
        }

        $request->validate(['reason' => 'required|string|max:255']);
        $reason = $request->input('reason');

        try {
            $updated = $this->bookingService->cancelBooking($booking, $reason, $user);

            return $this->successResponse($updated, 'Đã hủy đơn đặt sân thành công.');
        } catch (Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Xác nhận khách vào sân (Check-in)
     */
    public function checkIn(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        if (! $user || (! $user->isOwner() && ! $user->isAdmin())) {
            return $this->forbidden('Chỉ chủ sân hoặc quản trị viên mới có quyền check-in đơn đặt sân.');
        }

        $booking = Booking::with('venue')->findOrFail($id);
        if ($user->isOwner() && $booking->venue?->owner_id !== $user->id) {
            return $this->forbidden('Bạn chỉ có thể check-in đơn thuộc cơ sở sân của mình.');
        }

        try {
            $updated = $this->bookingService->checkInBooking($booking, $user);

            return $this->successResponse($updated, "Điểm danh thành công cho đơn {$updated->booking_code}!");
        } catch (Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }

    /**
     * Cập nhật thông tin đơn đặt sân
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $booking = Booking::with('venue')->findOrFail($id);

        // Kiểm tra quyền
        if ($user && $user->isCustomer() && $booking->user_id !== $user->id) {
            return $this->forbidden('Bạn không có quyền chỉnh sửa đơn đặt này.');
        }

        if ($user && $user->isOwner() && $booking->venue && $booking->venue->owner_id !== $user->id) {
            return $this->forbidden('Bạn chỉ có thể quản lý đơn thuộc cơ sở sân của mình.');
        }

        $validator = Validator::make($request->all(), [
            'customer_name' => 'sometimes|required|string|max:120',
            'customer_phone' => 'sometimes|required|string|max:20',
            'customer_email' => 'nullable|email|max:150',
            'note' => 'nullable|string|max:500',
            'status' => 'nullable|in:pending,confirmed,completed,cancelled,no_show',
            'payment_status' => 'nullable|in:unpaid,partial,paid,refunded',
            'payment_method' => 'nullable|in:vietqr,cash,bank_transfer',
            'cancel_reason' => 'nullable|string|max:255',
            'status_note' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        try {
            $updated = $this->bookingService->updateBooking($booking, $validator->validated(), $user);

            return $this->successResponse($updated, 'Cập nhật thông tin đơn đặt thành công.');
        } catch (Exception $e) {
            return $this->errorResponse($e->getMessage(), 422);
        }
    }

    /**
     * Thêm hoặc cập nhật dịch vụ đi kèm trong đơn đặt sân
     */
    public function addAddon(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $booking = Booking::with('venue')->findOrFail($id);

        if ($user && $user->isCustomer() && $booking->user_id !== $user->id) {
            return $this->forbidden('Bạn không có quyền thêm dịch vụ vào đơn đặt này.');
        }

        if ($user && $user->isOwner() && $booking->venue && $booking->venue->owner_id !== $user->id) {
            return $this->forbidden('Bạn chỉ có thể quản lý đơn thuộc cơ sở sân của mình.');
        }

        $validator = Validator::make($request->all(), [
            'addon_id' => 'required|integer|exists:addons,id',
            'quantity' => 'required|integer|min:1',
        ], [
            'addon_id.required' => 'Vui lòng chọn dịch vụ đi kèm.',
            'quantity.required' => 'Vui lòng nhập số lượng.',
            'quantity.min' => 'Số lượng dịch vụ tối thiểu là 1.',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        try {
            $updated = $this->bookingService->addOrUpdateBookingAddon(
                $booking,
                (int) $request->input('addon_id'),
                (int) $request->input('quantity'),
                $user
            );

            return $this->successResponse($updated, 'Đã cập nhật dịch vụ đi kèm vào đơn đặt thành công.');
        } catch (Exception $e) {
            return $this->errorResponse($e->getMessage(), 422);
        }
    }

    /**
     * Xóa dịch vụ đi kèm khỏi đơn đặt sân
     */
    public function removeAddon(Request $request, int $id, int $addonId): JsonResponse
    {
        $user = $request->user();
        $booking = Booking::with('venue')->findOrFail($id);

        if ($user && $user->isCustomer() && $booking->user_id !== $user->id) {
            return $this->forbidden('Bạn không có quyền chỉnh sửa dịch vụ của đơn đặt này.');
        }

        if ($user && $user->isOwner() && $booking->venue && $booking->venue->owner_id !== $user->id) {
            return $this->forbidden('Bạn chỉ có thể quản lý đơn thuộc cơ sở sân của mình.');
        }

        try {
            $updated = $this->bookingService->removeBookingAddon($booking, $addonId, $user);

            return $this->successResponse($updated, 'Đã xóa dịch vụ đi kèm khỏi đơn đặt sân.');
        } catch (Exception $e) {
            return $this->errorResponse($e->getMessage(), 422);
        }
    }

    /**
     * Tự động quét và hủy các đơn unpaid quá hạn
     */
    public function cancelUnpaid(Request $request): JsonResponse
    {
        $request->validate(['minutes' => 'nullable|integer|between:15,1440', 'venue_id' => 'nullable|integer|exists:venues,id']);
        $venueId = $request->filled('venue_id') ? $request->integer('venue_id') : null;
        if ($venueId !== null && $request->user()->isOwner() && ! Venue::whereKey($venueId)->where('owner_id', $request->user()->id)->exists()) {
            return $this->forbidden('Bạn chỉ có thể quản lý cơ sở của mình.');
        }
        $minutes = $request->integer('minutes', 30);
        $count = $this->bookingService->cancelUnpaidBookings($minutes, $request->user()->isOwner() ? $request->user()->id : null, $venueId);

        return $this->successResponse([
            'cancelled_count' => $count,
            'expire_minutes' => $minutes,
        ], "Đã quét và hủy {$count} đơn đặt sân quá hạn thanh toán.");
    }

    public function markNoShows(Request $request): JsonResponse
    {
        $request->validate(['venue_id' => 'nullable|integer|exists:venues,id']);
        $venueId = $request->filled('venue_id') ? $request->integer('venue_id') : null;
        if ($venueId !== null && $request->user()->isOwner() && ! Venue::whereKey($venueId)->where('owner_id', $request->user()->id)->exists()) {
            return $this->forbidden('Bạn chỉ có thể quản lý cơ sở của mình.');
        }

        $result = $this->bookingService->autoFinalizeExpiredBookings($request->user()->isOwner() ? $request->user()->id : null, $venueId);

        return $this->successResponse([
            'no_show_count' => $result['no_shows'],
            'completed_count' => $result['completed'],
        ], "Đã quét và cập nhật: {$result['completed']} đơn hoàn thành, {$result['no_shows']} đơn khách không đến.");
    }

    /**
     * Lấy các slot trong ngày và kiểm tra slot trống
     */
    public function getCourtSlots(Request $request, int $courtId): JsonResponse
    {
        $request->validate(['date' => 'nullable|date_format:Y-m-d']);
        $court = Court::with('venue')->findOrFail($courtId);
        abort_unless($court->venue?->status === 'active', 404);
        $date = $request->query('date', now()->toDateString());

        $slots = $this->bookingService->getCourtDaySlots($court, $date);

        return $this->successResponse([
            'court' => [
                'id' => $court->id,
                'name' => $court->name,
                'venue_name' => $court->venue?->name,
                'hourly_rate_standard' => $court->hourly_rate_standard,
                'hourly_rate_peak' => $court->hourly_rate_peak,
                'peak_start' => $court->peak_start,
                'peak_end' => $court->peak_end,
            ],
            'date' => $date,
            'slots' => $slots,
        ], 'Lấy lịch slot sân thành công');
    }

    /**
     * Timeline / Ma trận lịch sân theo ngày cho Chủ sân
     */
    public function getTimeline(Request $request): JsonResponse
    {
        $request->validate(['venue_id' => 'nullable|integer|exists:venues,id', 'date' => 'nullable|date_format:Y-m-d']);
        $user = $request->user();
        $venueId = $request->query('venue_id', $request->route('venueId'));

        if (! $venueId) {
            if ($user && $user->isOwner()) {
                $venue = Venue::where('owner_id', $user->id)->first();
            } else {
                $venue = Venue::first();
            }
        } else {
            $venue = Venue::findOrFail($venueId);
        }

        if (! $venue) {
            return $this->notFound('Không tìm thấy cơ sở sân tương ứng.');
        }

        if ($user->isOwner() && $venue->owner_id !== $user->id) {
            return $this->forbidden('Bạn chỉ có thể xem lịch cơ sở của mình.');
        }

        $date = $request->query('date', now()->toDateString());
        $this->bookingService->autoFinalizeExpiredBookings(null, $venue->id);
        $timelineData = $this->bookingService->getVenueTimeline($venue, $date);

        return $this->successResponse($timelineData, 'Lấy ma trận lịch sân thành công');
    }

    /**
     * Xuất danh sách đơn đặt dạng CSV (Report)
     */
    public function export(Request $request): StreamedResponse
    {
        $this->validateFilters($request);
        $date = $request->query('date', 'all');
        $query = Booking::with(['court', 'venue'])->orderByDesc('id');
        if ($request->user()->isOwner()) {
            $query->whereHas('venue', fn (Builder $q) => $q->where('owner_id', $request->user()->id));
        }
        foreach (['date' => 'booking_date', 'venue_id' => 'venue_id', 'court_id' => 'court_id', 'status' => 'status', 'payment_status' => 'payment_status'] as $param => $column) {
            if ($request->filled($param) && $request->query($param) !== 'all') {
                if ($param === 'date') {
                    $query->whereDate($column, $request->query($param));
                } else {
                    $query->where($column, $request->query($param));
                }
            }
        }
        if ($request->filled('search')) {
            $search = '%'.trim($request->query('search')).'%';
            $query->where(fn (Builder $q) => $q->where('booking_code', 'like', $search)->orWhere('customer_name', 'like', $search)->orWhere('customer_phone', 'like', $search));
        }

        $bookings = $query->get();

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"SportZone_Bookings_{$date}.csv\"",
        ];

        return response()->stream(function () use ($bookings) {
            $handle = fopen('php://output', 'w');
            fprintf($handle, chr(0xEF).chr(0xBB).chr(0xBF)); // UTF-8 BOM

            fputcsv($handle, ['Mã đơn', 'Khách hàng', 'SĐT', 'Sân', 'Ngày', 'Bắt đầu', 'Kết thúc', 'Tổng tiền', 'Trạng thái', 'Thanh toán', 'Điểm danh']);

            foreach ($bookings as $b) {
                $cells = [
                    $b->booking_code,
                    $b->customer_name,
                    $b->customer_phone,
                    $b->court?->name ?? 'N/A',
                    $b->booking_date->format('Y-m-d'),
                    substr($b->start_time, 0, 5),
                    substr($b->end_time, 0, 5),
                    $b->total_price,
                    $b->status,
                    $b->payment_status,
                    $b->checked_in ? 'Đã đến sân' : 'Chưa đến',
                ];
                fputcsv($handle, array_map(fn ($value) => is_string($value) && preg_match('/^[=+\-@\t\r\n]/', $value) ? "'".$value : $value, $cells));
            }

            fclose($handle);
        }, 200, $headers);
    }

    public function refund(Request $request, int $id): JsonResponse
    {
        $booking = Booking::with('venue')->findOrFail($id);
        if ($request->user()->isOwner() && $booking->venue?->owner_id !== $request->user()->id) {
            return $this->forbidden('Bạn chỉ có thể hoàn tiền đơn thuộc cơ sở của mình.');
        }
        $data = $request->validate(['note' => 'required|string|max:200']);

        try {
            return $this->successResponse($this->bookingService->recordRefund($booking, $data['note'], $request->user()), 'Đã ghi nhận hoàn tiền thủ công.');
        } catch (ValidationException $e) {
            return $this->validationError($e->errors());
        }
    }

    private function validateFilters(Request $request): void
    {
        $request->validate([
            'date' => 'nullable|date_format:Y-m-d',
            'venue_id' => 'nullable|integer',
            'court_id' => 'nullable|integer',
            'status' => 'nullable|in:all,pending,confirmed,completed,cancelled,no_show',
            'payment_status' => 'nullable|in:all,unpaid,partial,paid,refunded',
            'search' => 'nullable|string|max:120',
        ]);
    }
}
