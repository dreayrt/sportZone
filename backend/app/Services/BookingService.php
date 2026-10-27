<?php

namespace App\Services;

use App\Models\Addon;
use App\Models\Booking;
use App\Models\BookingAddon;
use App\Models\BookingStatusHistory;
use App\Models\Court;
use App\Models\User;
use App\Models\Venue;
use App\Models\Voucher;
use Carbon\Carbon;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class BookingService
{
    /**
     * Kiểm tra xung đột lịch đặt sân (trùng slot)
     */
    public function checkSlotConflict(int $courtId, string $date, string $startTime, string $endTime, ?int $excludeBookingId = null): bool
    {
        $query = Booking::where('court_id', $courtId)
            ->where('booking_date', $date)
            ->whereNotIn('status', ['cancelled'])
            ->where(function ($q) use ($startTime, $endTime) {
                $q->where('start_time', '<', $endTime)
                    ->where('end_time', '>', $startTime);
            });

        if ($excludeBookingId) {
            $query->where('id', '!=', $excludeBookingId);
        }

        return $query->exists();
    }

    /**
     * Tính toán tự động chi phí đặt sân (court_fee theo standard/peak + addons + voucher)
     */
    public function calculatePricing(
        Court $court,
        string $startTime,
        string $endTime,
        array $addons = [],
        ?string $voucherCode = null
    ): array {
        $start = Carbon::createFromFormat('H:i:s', strlen($startTime) === 5 ? $startTime.':00' : $startTime);
        $end = Carbon::createFromFormat('H:i:s', strlen($endTime) === 5 ? $endTime.':00' : $endTime);

        if ($end->lte($start)) {
            throw ValidationException::withMessages([
                'end_time' => 'Thời gian kết thúc phải lớn hơn thời gian bắt đầu.',
            ]);
        }

        $totalMinutes = $start->diffInMinutes($end);
        if ($totalMinutes < ($court->min_booking_minutes ?? 30)) {
            throw ValidationException::withMessages([
                'duration' => "Thời gian đặt sân tối thiểu là {$court->min_booking_minutes} phút.",
            ]);
        }

        // 1. Phân bổ thời gian Giờ thường vs Giờ cao điểm (Peak Hours)
        $peakStartStr = $court->peak_start ?? '17:00:00';
        $peakEndStr = $court->peak_end ?? '21:00:00';

        $peakStart = Carbon::createFromFormat('H:i:s', strlen($peakStartStr) === 5 ? $peakStartStr.':00' : $peakStartStr);
        $peakEnd = Carbon::createFromFormat('H:i:s', strlen($peakEndStr) === 5 ? $peakEndStr.':00' : $peakEndStr);

        $overlapPeakMinutes = 0;
        if ($end->gt($peakStart) && $start->lt($peakEnd)) {
            $overlapStart = $start->copy()->max($peakStart);
            $overlapEnd = $end->copy()->min($peakEnd);
            $overlapPeakMinutes = max(0, $overlapStart->diffInMinutes($overlapEnd));
        }

        $standardMinutes = max(0, $totalMinutes - $overlapPeakMinutes);

        $rateStandard = $court->hourly_rate_standard;
        $ratePeak = $court->hourly_rate_peak ?? $rateStandard;

        $courtFee = (int) round(($standardMinutes / 60) * $rateStandard + ($overlapPeakMinutes / 60) * $ratePeak);

        // 2. Tính tiền dịch vụ đi kèm (Addons)
        $addonsFee = 0;
        $addonsDetails = [];

        if (! empty($addons)) {
            $addonIds = array_column($addons, 'addon_id');
            $addonModels = Addon::whereIn('id', $addonIds)->where('status', 'active')->get()->keyBy('id');

            foreach ($addons as $item) {
                $aId = (int) ($item['addon_id'] ?? 0);
                $qty = max(1, (int) ($item['quantity'] ?? 1));

                if (isset($addonModels[$aId])) {
                    $addon = $addonModels[$aId];
                    $subtotal = $addon->price * $qty;
                    $addonsFee += $subtotal;

                    $addonsDetails[] = [
                        'addon_id' => $addon->id,
                        'addon_name' => $addon->name,
                        'quantity' => $qty,
                        'unit_price' => $addon->price,
                        'total_price' => $subtotal,
                    ];
                }
            }
        }

        // 3. Tính tiền giảm giá qua Voucher (nếu có)
        $subtotalOrder = $courtFee + $addonsFee;
        $discountAmount = 0;
        $appliedVoucher = null;

        if (! empty($voucherCode)) {
            $voucher = Voucher::where('code', strtoupper(trim($voucherCode)))->first();
            if (! $voucher) {
                throw ValidationException::withMessages([
                    'voucher_code' => 'Mã giảm giá không tồn tại hoặc không còn khả dụng.',
                ]);
            }

            $validation = $voucher->validateForOrder($subtotalOrder);
            if (! $validation['valid']) {
                throw ValidationException::withMessages([
                    'voucher_code' => $validation['message'],
                ]);
            }

            $appliedVoucher = $voucher;
            $discountAmount = $validation['discount'];
        }

        $totalPrice = max(0, $subtotalOrder - $discountAmount);

        return [
            'total_minutes' => $totalMinutes,
            'standard_minutes' => $standardMinutes,
            'peak_minutes' => $overlapPeakMinutes,
            'court_fee' => $courtFee,
            'addons_fee' => $addonsFee,
            'discount_amount' => $discountAmount,
            'total_price' => $totalPrice,
            'voucher_id' => $appliedVoucher?->id,
            'voucher' => $appliedVoucher,
            'addons_details' => $addonsDetails,
        ];
    }

    /**
     * Tạo mã đơn đặt sân duy nhất dạng SZ-XXXXX
     */
    public function generateUniqueBookingCode(): string
    {
        do {
            $code = 'SZ-'.strtoupper(Str::random(5));
        } while (Booking::where('booking_code', $code)->exists());

        return $code;
    }

    /**
     * Tạo đơn đặt sân với Concurrency Lock chống trùng lịch tuyệt đối
     */
    public function createBooking(array $payload, ?User $user = null): Booking
    {
        return DB::transaction(function () use ($payload, $user) {
            $court = Court::with('venue')->findOrFail($payload['court_id']);

            if ($court->status !== 'active') {
                throw ValidationException::withMessages([
                    'court_id' => 'Sân này hiện đang bảo trì hoặc tạm ngưng hoạt động.',
                ]);
            }

            $bookingDate = $payload['booking_date'];
            $startTime = strlen($payload['start_time']) === 5 ? $payload['start_time'].':00' : $payload['start_time'];
            $endTime = strlen($payload['end_time']) === 5 ? $payload['end_time'].':00' : $payload['end_time'];

            // Khóa dòng pessimistic lock để chống race condition khi 2 người cùng đặt 1 lúc
            $conflict = Booking::where('court_id', $court->id)
                ->where('booking_date', $bookingDate)
                ->whereNotIn('status', ['cancelled'])
                ->where(function ($q) use ($startTime, $endTime) {
                    $q->where('start_time', '<', $endTime)
                        ->where('end_time', '>', $startTime);
                })
                ->lockForUpdate()
                ->exists();

            if ($conflict) {
                throw ValidationException::withMessages([
                    'slot' => 'Khung giờ này vừa có người đặt hoặc đang bị trùng lịch. Vui lòng chọn khung giờ khác.',
                ]);
            }

            $voucherCode = strtoupper(trim((string) ($payload['voucher_code'] ?? '')));
            if ($voucherCode !== '') {
                Voucher::where('code', $voucherCode)
                    ->lockForUpdate()
                    ->first();
            }

            // Tính toán chi phí
            $pricing = $this->calculatePricing(
                $court,
                $startTime,
                $endTime,
                $payload['addons'] ?? [],
                $payload['voucher_code'] ?? null
            );

            $bookingCode = $this->generateUniqueBookingCode();
            $status = $payload['status'] ?? 'confirmed';
            $paymentStatus = $payload['payment_status'] ?? 'unpaid';
            $paymentMethod = $payload['payment_method'] ?? 'vietqr';
            $source = $payload['source'] ?? ($user ? 'website' : 'website');

            $booking = Booking::create([
                'booking_code' => $bookingCode,
                'user_id' => $user?->id ?? ($payload['user_id'] ?? null),
                'venue_id' => $court->venue_id,
                'court_id' => $court->id,
                'voucher_id' => $pricing['voucher_id'],
                'source' => $source,
                'booking_date' => $bookingDate,
                'start_time' => $startTime,
                'end_time' => $endTime,
                'customer_name' => $payload['customer_name'] ?? ($user?->full_name ?? 'Khách hàng'),
                'customer_phone' => $payload['customer_phone'] ?? ($user?->phone ?? '0900000000'),
                'customer_email' => $payload['customer_email'] ?? ($user?->email ?? null),
                'note' => $payload['note'] ?? null,
                'court_fee' => $pricing['court_fee'],
                'addons_fee' => $pricing['addons_fee'],
                'discount_amount' => $pricing['discount_amount'],
                'total_price' => $pricing['total_price'],
                'status' => $status,
                'payment_status' => $paymentStatus,
                'payment_method' => $paymentMethod,
                'checked_in' => false,
            ]);

            // Lưu chi tiết dịch vụ đi kèm
            foreach ($pricing['addons_details'] as $addonDetail) {
                BookingAddon::create([
                    'booking_id' => $booking->id,
                    'addon_id' => $addonDetail['addon_id'],
                    'addon_name' => $addonDetail['addon_name'],
                    'quantity' => $addonDetail['quantity'],
                    'unit_price' => $addonDetail['unit_price'],
                    'total_price' => $addonDetail['total_price'],
                ]);
            }

            // Tăng số lượt dùng voucher nếu có
            if ($pricing['voucher_id'] && $pricing['voucher']) {
                $pricing['voucher']->increment('used_count');
            }

            // Ghi nhật ký trạng thái đầu tiên
            BookingStatusHistory::create([
                'booking_id' => $booking->id,
                'old_status' => null,
                'new_status' => $status,
                'note' => $source === 'counter' ? 'Tạo đơn tại quầy tiếp tân' : 'Khách tạo đơn đặt sân từ website',
                'changed_by' => $user?->id,
            ]);

            return $booking->load(['venue', 'court', 'bookingAddons', 'voucher']);
        });
    }

    /**
     * Xác thực check-in cho khách đến sân
     */
    public function checkInBooking(Booking $booking, ?User $staff = null): Booking
    {
        return DB::transaction(function () use ($booking, $staff) {
            if ($booking->status === 'cancelled') {
                throw new Exception('Không thể điểm danh đơn đặt đã bị hủy.');
            }

            if ($booking->payment_status !== 'paid') {
                throw new Exception('Chỉ đơn đã thanh toán đủ mới được check-in.');
            }

            if ($booking->checked_in) {
                return $booking; // Đã check-in rồi
            }

            $booking->update([
                'checked_in' => true,
                'checked_in_at' => now(),
            ]);

            BookingStatusHistory::create([
                'booking_id' => $booking->id,
                'old_status' => $booking->status,
                'new_status' => $booking->status,
                'note' => 'Xác nhận khách đã vào sân thi đấu (Check-in)',
                'changed_by' => $staff?->id,
            ]);

            return $booking;
        });
    }

    /**
     * Hủy đơn đặt sân và hoàn tác voucher
     */
    public function cancelBooking(Booking $booking, string $reason, ?User $cancelledBy = null): Booking
    {
        return DB::transaction(function () use ($booking, $reason, $cancelledBy) {
            if ($booking->status === 'completed') {
                throw new Exception('Không thể hủy trận đấu đã hoàn thành.');
            }

            if ($booking->status === 'cancelled') {
                return $booking;
            }

            $oldStatus = $booking->status;

            $booking->update([
                'status' => 'cancelled',
                'cancelled_at' => now(),
                'cancel_reason' => $reason,
            ]);

            // Trả lại lượt dùng voucher
            if ($booking->voucher_id) {
                Voucher::where('id', $booking->voucher_id)->where('used_count', '>', 0)->decrement('used_count');
            }

            BookingStatusHistory::create([
                'booking_id' => $booking->id,
                'old_status' => $oldStatus,
                'new_status' => 'cancelled',
                'note' => "Hủy đơn: {$reason}",
                'changed_by' => $cancelledBy?->id,
            ]);

            return $booking;
        });
    }

    /**
     * Cập nhật thông tin đơn đặt sân
     */
    public function updateBooking(Booking $booking, array $payload, ?User $actor = null): Booking
    {
        return DB::transaction(function () use ($booking, $payload, $actor) {
            $isOwnerOrAdmin = $actor && ($actor->isAdmin() || $actor->isOwner());

            // 1. Cập nhật trạng thái nếu có
            if (isset($payload['status']) && $payload['status'] !== $booking->status) {
                if (! $isOwnerOrAdmin) {
                    throw ValidationException::withMessages([
                        'status' => 'Chỉ chủ sân hoặc quản trị viên mới có quyền cập nhật trạng thái đơn.',
                    ]);
                }

                $oldStatus = $booking->status;
                $newStatus = $payload['status'];

                if ($newStatus === 'cancelled') {
                    return $this->cancelBooking($booking, $payload['cancel_reason'] ?? 'Hủy đơn bởi người quản lý', $actor);
                }

                $booking->status = $newStatus;

                BookingStatusHistory::create([
                    'booking_id' => $booking->id,
                    'old_status' => $oldStatus,
                    'new_status' => $newStatus,
                    'note' => $payload['status_note'] ?? "Cập nhật trạng thái từ {$oldStatus} sang {$newStatus}",
                    'changed_by' => $actor?->id,
                ]);
            }

            // 2. Cập nhật trạng thái thanh toán
            if (isset($payload['payment_status']) && $payload['payment_status'] !== $booking->payment_status) {
                if (! $isOwnerOrAdmin) {
                    throw ValidationException::withMessages([
                        'payment_status' => 'Chỉ chủ sân hoặc quản trị viên mới có quyền cập nhật trạng thái thanh toán.',
                    ]);
                }

                $usesSepay = $booking->payment_method === 'vietqr'
                    || ($payload['payment_method'] ?? null) === 'vietqr';
                if ($usesSepay && in_array($payload['payment_status'], ['partial', 'paid', 'refunded'], true)) {
                    throw ValidationException::withMessages([
                        'payment_status' => 'Thanh toán SePay chỉ được cập nhật từ webhook đã xác thực.',
                    ]);
                }

                $booking->payment_status = $payload['payment_status'];
            }

            if (isset($payload['payment_method']) && $isOwnerOrAdmin) {
                if (
                    ($booking->payment_method === 'vietqr' && $payload['payment_method'] !== 'vietqr')
                    || ($payload['payment_method'] === 'vietqr' && $booking->payment_status !== 'unpaid')
                ) {
                    throw ValidationException::withMessages([
                        'payment_method' => 'Không thể thay đổi phương thức của giao dịch SePay đã bắt đầu hoặc đã thanh toán.',
                    ]);
                }

                $booking->payment_method = $payload['payment_method'];
            }

            // 3. Cập nhật thông tin liên hệ / ghi chú
            if (array_key_exists('customer_name', $payload)) {
                $booking->customer_name = $payload['customer_name'];
            }
            if (array_key_exists('customer_phone', $payload)) {
                $booking->customer_phone = $payload['customer_phone'];
            }
            if (array_key_exists('customer_email', $payload)) {
                $booking->customer_email = $payload['customer_email'];
            }
            if (array_key_exists('note', $payload)) {
                $booking->note = $payload['note'];
            }

            $booking->save();

            return $booking->load(['venue', 'court', 'bookingAddons', 'voucher', 'statusHistories']);
        });
    }

    /**
     * Thêm hoặc cập nhật dịch vụ đi kèm trong đơn đặt sân
     */
    public function addOrUpdateBookingAddon(Booking $booking, int $addonId, int $quantity, ?User $actor = null): Booking
    {
        return DB::transaction(function () use ($booking, $addonId, $quantity, $actor) {
            if ($booking->status === 'cancelled') {
                throw new Exception('Không thể thêm dịch vụ vào đơn đặt sân đã bị hủy.');
            }
            if ($booking->status === 'completed') {
                throw new Exception('Không thể thêm dịch vụ vào trận đấu đã kết thúc.');
            }

            $addon = Addon::where('id', $addonId)->where('status', 'active')->firstOrFail();

            $existingAddon = BookingAddon::where('booking_id', $booking->id)
                ->where('addon_id', $addon->id)
                ->first();

            if ($existingAddon) {
                $existingAddon->update([
                    'quantity' => $quantity,
                    'unit_price' => $addon->price,
                    'total_price' => $addon->price * $quantity,
                ]);
                $actionNote = "Cập nhật dịch vụ '{$addon->name}' số lượng thành {$quantity}";
            } else {
                BookingAddon::create([
                    'booking_id' => $booking->id,
                    'addon_id' => $addon->id,
                    'addon_name' => $addon->name,
                    'quantity' => $quantity,
                    'unit_price' => $addon->price,
                    'total_price' => $addon->price * $quantity,
                ]);
                $actionNote = "Thêm dịch vụ '{$addon->name}' (x{$quantity}) vào đơn";
            }

            // Tính lại tổng tiền đơn đặt
            $this->recalculateBookingTotals($booking);

            BookingStatusHistory::create([
                'booking_id' => $booking->id,
                'old_status' => $booking->status,
                'new_status' => $booking->status,
                'note' => $actionNote,
                'changed_by' => $actor?->id,
            ]);

            return $booking->fresh(['venue', 'court', 'bookingAddons', 'voucher']);
        });
    }

    /**
     * Xóa dịch vụ đi kèm khỏi đơn đặt sân
     */
    public function removeBookingAddon(Booking $booking, int $addonId, ?User $actor = null): Booking
    {
        return DB::transaction(function () use ($booking, $addonId, $actor) {
            if ($booking->status === 'cancelled' || $booking->status === 'completed') {
                throw new Exception('Không thể xóa dịch vụ của đơn đặt đã hoàn thành hoặc đã bị hủy.');
            }

            $bookingAddon = BookingAddon::where('booking_id', $booking->id)
                ->where('addon_id', $addonId)
                ->firstOrFail();

            $addonName = $bookingAddon->addon_name;
            $bookingAddon->delete();

            // Tính lại tổng tiền đơn đặt
            $this->recalculateBookingTotals($booking);

            BookingStatusHistory::create([
                'booking_id' => $booking->id,
                'old_status' => $booking->status,
                'new_status' => $booking->status,
                'note' => "Xóa dịch vụ '{$addonName}' khỏi đơn",
                'changed_by' => $actor?->id,
            ]);

            return $booking->fresh(['venue', 'court', 'bookingAddons', 'voucher']);
        });
    }

    /**
     * Tính toán lại phụ phí dịch vụ và tổng tiền của đơn đặt sân
     */
    public function recalculateBookingTotals(Booking $booking): void
    {
        $addonsFee = (int) BookingAddon::where('booking_id', $booking->id)->sum('total_price');
        $courtFee = (int) $booking->court_fee;
        $subtotal = $courtFee + $addonsFee;

        $discountAmount = 0;
        if ($booking->voucher_id) {
            $voucher = Voucher::find($booking->voucher_id);
            if ($voucher && $voucher->isValid($subtotal)) {
                if ($voucher->discount_type === 'percent') {
                    $calcDiscount = (int) round($subtotal * ($voucher->discount_value / 100));
                    $discountAmount = $voucher->max_discount ? min($calcDiscount, $voucher->max_discount) : $calcDiscount;
                } else {
                    $discountAmount = min($voucher->discount_value, $subtotal);
                }
            }
        }

        $totalPrice = max(0, $subtotal - $discountAmount);

        $booking->update([
            'addons_fee' => $addonsFee,
            'discount_amount' => $discountAmount,
            'total_price' => $totalPrice,
        ]);
    }

    /**
     * Quét và tự động hủy các đơn đặt sân chưa thanh toán sau X phút
     */
    public function cancelUnpaidBookings(int $expireMinutes = 30): int
    {
        $threshold = Carbon::now()->subMinutes($expireMinutes);

        $unpaidBookings = Booking::whereIn('payment_status', ['unpaid', 'partial'])
            ->whereNotIn('status', ['cancelled', 'completed'])
            ->where('created_at', '<=', $threshold)
            ->get();

        $count = 0;
        foreach ($unpaidBookings as $booking) {
            try {
                $this->cancelBooking(
                    $booking,
                    "Hệ thống tự động hủy: Quá hạn thanh toán ({$expireMinutes} phút)"
                );
                $count++;
            } catch (Exception $e) {
                // Log and continue
            }
        }

        return $count;
    }

    /**
     * Lấy danh sách các slot trong ngày của một sân cùng trạng thái khả dụng
     */
    public function getCourtDaySlots(Court $court, string $date): array
    {
        $venue = $court->venue ?? Venue::findOrFail($court->venue_id);
        $openTimeStr = $venue->open_time ?? '06:00:00';
        $closeTimeStr = $venue->close_time ?? '23:00:00';

        $openHour = (int) explode(':', $openTimeStr)[0];
        $closeHour = (int) explode(':', $closeTimeStr)[0];

        $peakStart = $court->peak_start ?? '17:00:00';
        $peakEnd = $court->peak_end ?? '21:00:00';

        // Lấy tất cả bookings của court trong ngày
        $existingBookings = Booking::where('court_id', $court->id)
            ->where('booking_date', $date)
            ->whereNotIn('status', ['cancelled'])
            ->get();

        $slots = [];
        $slotStepMinutes = 90; // Chuẩn các ca đấu 1.5 giờ (90 phút)

        $currentTime = Carbon::createFromFormat('Y-m-d H:i:s', "{$date} ".sprintf('%02d:00:00', $openHour));
        $endLimit = Carbon::createFromFormat('Y-m-d H:i:s', "{$date} ".sprintf('%02d:00:00', $closeHour));

        while ($currentTime->copy()->addMinutes($slotStepMinutes)->lte($endLimit)) {
            $slotStart = $currentTime->copy();
            $slotEnd = $currentTime->copy()->addMinutes($slotStepMinutes);

            $startStr = $slotStart->format('H:i');
            $endStr = $slotEnd->format('H:i');
            $timeLabel = "{$startStr} - {$endStr}";

            // Kiểm tra trùng booking
            $matchedBooking = $existingBookings->first(function ($b) use ($startStr, $endStr) {
                $bStart = substr($b->start_time, 0, 5);
                $bEnd = substr($b->end_time, 0, 5);

                return $bStart < $endStr && $bEnd > $startStr;
            });

            // Kiểm tra có phải peak không
            $isPeak = ($startStr >= substr($peakStart, 0, 5) && $startStr < substr($peakEnd, 0, 5));
            $rate = (int) round(($slotStepMinutes / 60) * ($isPeak ? $court->hourly_rate_peak : $court->hourly_rate_standard));

            $slots[] = [
                'time' => $timeLabel,
                'start_time' => $slotStart->format('H:i:s'),
                'end_time' => $slotEnd->format('H:i:s'),
                'peak' => $isPeak,
                'rate' => $rate,
                'is_booked' => $matchedBooking !== null,
                'booking_code' => $matchedBooking?->booking_code,
                'customer_name' => $matchedBooking ? ($matchedBooking->customer_name.' ('.substr($matchedBooking->customer_phone, 0, 4).'***)') : null,
                'booking_status' => $matchedBooking?->status,
                'checked_in' => $matchedBooking?->checked_in ?? false,
            ];

            $currentTime->addMinutes($slotStepMinutes);
        }

        return $slots;
    }

    /**
     * Lấy Timeline ma trận lịch cho toàn bộ các sân của 1 cơ sở (Venue)
     */
    public function getVenueTimeline(Venue $venue, string $date): array
    {
        $courts = Court::where('venue_id', $venue->id)->where('status', 'active')->get();
        $bookings = Booking::where('venue_id', $venue->id)
            ->where('booking_date', $date)
            ->whereNotIn('status', ['cancelled'])
            ->get();

        $timeRows = [
            '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
            '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
            '18:00', '19:00', '20:00', '21:00', '22:00',
        ];

        $matrix = [];
        foreach ($timeRows as $slotHour) {
            $slotHourInt = (int) explode(':', $slotHour)[0];
            $isPeakHour = ($slotHourInt >= 17 && $slotHourInt < 21);

            $courtsData = [];
            foreach ($courts as $court) {
                $matchedBooking = $bookings->first(function ($b) use ($court, $slotHour) {
                    if ($b->court_id !== $court->id) {
                        return false;
                    }
                    $bStartHour = (int) explode(':', $b->start_time)[0];
                    $bEndHour = (int) explode(':', $b->end_time)[0];
                    $currentH = (int) explode(':', $slotHour)[0];

                    return $currentH >= $bStartHour && $currentH < $bEndHour;
                });

                $courtsData[$court->id] = [
                    'court_id' => $court->id,
                    'court_name' => $court->name,
                    'is_booked' => $matchedBooking !== null,
                    'booking_id' => $matchedBooking?->id,
                    'booking_code' => $matchedBooking?->booking_code,
                    'customer_name' => $matchedBooking?->customer_name,
                    'customer_phone' => $matchedBooking?->customer_phone,
                    'source' => $matchedBooking?->source,
                    'status' => $matchedBooking?->status,
                    'payment_status' => $matchedBooking?->payment_status,
                    'checked_in' => $matchedBooking?->checked_in ?? false,
                ];
            }

            $matrix[] = [
                'hour' => $slotHour,
                'is_peak' => $isPeakHour,
                'slots' => $courtsData,
            ];
        }

        return [
            'date' => $date,
            'venue' => [
                'id' => $venue->id,
                'name' => $venue->name,
                'open_time' => $venue->open_time,
                'close_time' => $venue->close_time,
            ],
            'courts' => $courts,
            'matrix' => $matrix,
        ];
    }
}
