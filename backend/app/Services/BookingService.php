<?php

namespace App\Services;

use App\Models\Addon;
use App\Models\Booking;
use App\Models\BookingAddon;
use App\Models\BookingStatusHistory;
use App\Models\Court;
use App\Models\Payment;
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
    public function __construct(private readonly LoyaltyService $loyaltyService) {}

    /**
     * Kiểm tra xung đột lịch đặt sân (trùng slot)
     */
    public function checkSlotConflict(int $courtId, string $date, string $startTime, string $endTime, ?int $excludeBookingId = null): bool
    {
        $query = Booking::where('court_id', $courtId)
            ->whereDate('booking_date', $date)
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
            $addonModels = Addon::whereIn('id', $addonIds)->where('venue_id', $court->venue_id)->where('status', 'active')->orderBy('id')->lockForUpdate()->get()->keyBy('id');

            foreach ($addons as $item) {
                $aId = (int) ($item['addon_id'] ?? 0);
                $qty = max(1, (int) ($item['quantity'] ?? 1));

                if (! isset($addonModels[$aId])) {
                    throw ValidationException::withMessages(['addons' => 'Dịch vụ không khả dụng tại cơ sở này.']);
                }
                if (isset($addonModels[$aId])) {
                    $addon = $addonModels[$aId];
                    if ($addon->stock_quantity !== null && $addon->stock_quantity < $qty) {
                        throw ValidationException::withMessages(['addons' => "Dịch vụ {$addon->name} không đủ tồn kho."]);
                    }
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
            $voucher = Voucher::with('venue')->where('code', strtoupper(trim($voucherCode)))->first();
            if (! $voucher) {
                throw ValidationException::withMessages([
                    'voucher_code' => 'Mã giảm giá không tồn tại hoặc không còn khả dụng.',
                ]);
            }

            $validation = $voucher->validateForOrder($subtotalOrder, $court->venue_id);
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
            $court = Court::with('venue')->lockForUpdate()->findOrFail($payload['court_id']);
            $court->setRelation('venue', Venue::lockForUpdate()->findOrFail($court->venue_id));

            if ($court->status !== 'active' || $court->venue?->status !== 'active' || $court->venue->admin_suspended_at !== null) {
                throw ValidationException::withMessages([
                    'court_id' => 'Sân này hiện đang bảo trì hoặc tạm ngưng hoạt động.',
                ]);
            }

            $bookingDate = $payload['booking_date'];
            $startTime = strlen($payload['start_time']) === 5 ? $payload['start_time'].':00' : $payload['start_time'];
            $endTime = strlen($payload['end_time']) === 5 ? $payload['end_time'].':00' : $payload['end_time'];

            $startsAt = Carbon::parse($bookingDate.' '.$startTime);
            if ($startsAt->lt(now()) || $startTime < $court->venue->open_time || $endTime > $court->venue->close_time) {
                throw ValidationException::withMessages(['start_time' => 'Chỉ được đặt giờ trong tương lai và trong giờ hoạt động của cơ sở.']);
            }
            $step = max(15, (int) $court->slot_minutes);
            $open = Carbon::parse($bookingDate.' '.$court->venue->open_time);
            if ((int) $open->diffInMinutes($startsAt) % $step !== 0 || (int) $startsAt->diffInMinutes(Carbon::parse($bookingDate.' '.$endTime)) % $step !== 0) {
                throw ValidationException::withMessages(['start_time' => "Giờ đặt và thời lượng phải theo bước {$step} phút kể từ giờ mở cửa."]);
            }

            // Khóa dòng pessimistic lock để chống race condition khi 2 người cùng đặt 1 lúc
            $conflict = Booking::where('court_id', $court->id)
                ->whereDate('booking_date', $bookingDate)
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
            $status = 'confirmed';
            $paymentStatus = $payload['payment_status'] ?? 'unpaid';
            $paymentMethod = $payload['payment_method'] ?? 'vietqr';
            $source = $payload['source'] ?? ($user ? 'website' : 'website');
            if ($pricing['total_price'] === 0) {
                $status = 'confirmed';
                $paymentStatus = 'paid';
            }

            $booking = Booking::create([
                'booking_code' => $bookingCode,
                'user_id' => $source === 'website' ? $user?->id : null,
                'venue_id' => $court->venue_id,
                'court_id' => $court->id,
                'voucher_id' => $pricing['voucher_id'],
                'source' => $source,
                'booking_date' => $bookingDate,
                'start_time' => $startTime,
                'end_time' => $endTime,
                'customer_name' => $payload['customer_name'] ?? ($user?->full_name ?? 'Khách hàng'),
                'customer_phone' => $payload['customer_phone'] ?? ($user?->phone ?? '0900000000'),
                'customer_email' => $payload['customer_email'] ?? ($source === 'website' ? $user?->email : null),
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
                Addon::whereKey($addonDetail['addon_id'])->whereNotNull('stock_quantity')->decrement('stock_quantity', $addonDetail['quantity']);
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

            if ($paymentStatus === 'paid' && $paymentMethod !== 'vietqr') {
                $this->recordManualPayment($booking, $user);
            }

            return $booking->load(['venue', 'court', 'bookingAddons', 'voucher']);
        });
    }

    /**
     * Xác thực check-in cho khách đến sân
     */
    public function checkInBooking(Booking $booking, ?User $staff = null): Booking
    {
        return DB::transaction(function () use ($booking, $staff) {
            $booking = Booking::lockForUpdate()->findOrFail($booking->id);
            if ($booking->status !== 'confirmed') {
                throw new Exception('Chỉ được điểm danh đơn đã xác nhận.');
            }

            $start = Carbon::parse($booking->booking_date->format('Y-m-d').' '.$booking->start_time);
            $end = Carbon::parse($booking->booking_date->format('Y-m-d').' '.$booking->end_time);
            if (now()->lt($start->copy()->subMinutes(15)) || now()->gte($end)) {
                throw new Exception('Chỉ được check-in từ 15 phút trước giờ bắt đầu đến trước giờ kết thúc.');
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
            $booking = Booking::lockForUpdate()->findOrFail($booking->id);
            if (in_array($booking->status, ['completed', 'no_show'], true) || $booking->checked_in) {
                throw new Exception('Không thể hủy đơn đã vào sân hoặc đã kết thúc.');
            }

            if ($booking->status === 'cancelled') {
                return $booking;
            }

            $oldStatus = $booking->status;

            foreach ($booking->bookingAddons()->orderBy('addon_id')->get() as $item) {
                $addon = Addon::lockForUpdate()->find($item->addon_id);
                if ($addon && $addon->stock_quantity !== null) {
                    $addon->increment('stock_quantity', $item->quantity);
                }
            }

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
            $booking = Booking::lockForUpdate()->findOrFail($booking->id);
            $isOwnerOrAdmin = $actor && ($actor->isAdmin() || $actor->isOwner());

            if (in_array($booking->status, ['cancelled', 'completed', 'no_show'], true)) {
                throw ValidationException::withMessages(['status' => 'Đơn đã kết thúc, không thể chỉnh sửa.']);
            }

            // 1. Cập nhật trạng thái nếu có
            if (isset($payload['status']) && $payload['status'] !== $booking->status) {
                if (! $isOwnerOrAdmin) {
                    throw ValidationException::withMessages([
                        'status' => 'Chỉ chủ sân hoặc quản trị viên mới có quyền cập nhật trạng thái đơn.',
                    ]);
                }

                $oldStatus = $booking->status;
                $newStatus = $payload['status'];

                if ($newStatus === 'pending' || ($newStatus === 'completed' && ($booking->status !== 'confirmed' || ! $booking->checked_in || $booking->payment_status !== 'paid'))) {
                    throw ValidationException::withMessages(['status' => 'Chỉ hoàn thành đơn đã xác nhận, thanh toán đủ và check-in; không được chuyển ngược về chờ xác nhận.']);
                }
                if ($newStatus === 'no_show') {
                    $endsAt = Carbon::parse($booking->booking_date->format('Y-m-d').' '.$booking->end_time);
                    if ($booking->checked_in || now()->lt($endsAt)) {
                        throw ValidationException::withMessages(['status' => 'Chỉ ghi nhận khách không đến sau khi hết giờ và chưa check-in.']);
                    }
                }

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

                if ($payload['payment_status'] !== 'paid') {
                    throw ValidationException::withMessages(['payment_status' => 'Chỉ được ghi nhận thu đủ tiền. Dùng chức năng hoàn tiền cho đơn đã hủy.']);
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

            if ($isOwnerOrAdmin && ($payload['payment_status'] ?? null) === 'paid' && $booking->payment_method !== 'vietqr') {
                $this->recordManualPayment($booking, $actor);
                if ($booking->status === 'pending') {
                    $booking->update(['status' => 'confirmed']);
                    BookingStatusHistory::create(['booking_id' => $booking->id, 'old_status' => 'pending', 'new_status' => 'confirmed', 'note' => 'Đã thu đủ tiền tại quầy', 'changed_by' => $actor?->id]);
                }
            }
            if ($booking->status === 'completed') {
                $this->loyaltyService->addPointsForBooking($booking);
            }

            return $booking->load(['venue', 'court', 'bookingAddons', 'voucher', 'statusHistories']);
        });
    }

    /**
     * Thêm hoặc cập nhật dịch vụ đi kèm trong đơn đặt sân
     */
    public function addOrUpdateBookingAddon(Booking $booking, int $addonId, int $quantity, ?User $actor = null): Booking
    {
        return DB::transaction(function () use ($booking, $addonId, $quantity, $actor) {
            $booking = Booking::lockForUpdate()->findOrFail($booking->id);
            if ($booking->status === 'cancelled') {
                throw new Exception('Không thể thêm dịch vụ vào đơn đặt sân đã bị hủy.');
            }
            if (in_array($booking->status, ['completed', 'no_show'], true)) {
                throw new Exception('Không thể thêm dịch vụ vào trận đấu đã kết thúc.');
            }

            $addon = Addon::where('id', $addonId)->where('venue_id', $booking->venue_id)->where('status', 'active')->lockForUpdate()->firstOrFail();

            $existingAddon = BookingAddon::where('booking_id', $booking->id)
                ->where('addon_id', $addon->id)
                ->first();

            $delta = $quantity - ($existingAddon?->quantity ?? 0);
            if ($addon->stock_quantity !== null) {
                if ($addon->stock_quantity < $delta) {
                    throw ValidationException::withMessages(['quantity' => 'Không đủ tồn kho.']);
                }
                $addon->decrement('stock_quantity', $delta);
            }

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
            $booking = Booking::lockForUpdate()->findOrFail($booking->id);
            if (in_array($booking->status, ['cancelled', 'completed', 'no_show'], true)) {
                throw new Exception('Không thể xóa dịch vụ của đơn đặt đã hoàn thành hoặc đã bị hủy.');
            }

            $bookingAddon = BookingAddon::where('booking_id', $booking->id)
                ->where('addon_id', $addonId)
                ->firstOrFail();

            $addonName = $bookingAddon->addon_name;
            $addon = Addon::lockForUpdate()->findOrFail($addonId);
            if ($addon->stock_quantity !== null) {
                $addon->increment('stock_quantity', $bookingAddon->quantity);
            }
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
            if ($voucher) {
                if ($voucher->discount_type === 'percent') {
                    $calcDiscount = (int) round($subtotal * ($voucher->discount_value / 100));
                    $discountAmount = $voucher->max_discount ? min($calcDiscount, $voucher->max_discount) : $calcDiscount;
                } else {
                    $discountAmount = min($voucher->discount_value, $subtotal);
                }
            }
        }

        $totalPrice = max(0, $subtotal - $discountAmount);

        $paid = (int) $booking->payments()->where('status', 'paid')->sum('amount');
        if ($totalPrice < $paid) {
            throw ValidationException::withMessages(['addons' => 'Tổng tiền mới thấp hơn số đã thu. Hãy xử lý hủy/hoàn tiền trước.']);
        }

        $booking->update([
            'addons_fee' => $addonsFee,
            'discount_amount' => $discountAmount,
            'total_price' => $totalPrice,
            'payment_status' => $paid >= $totalPrice ? 'paid' : ($paid > 0 ? 'partial' : 'unpaid'),
        ]);
    }

    /**
     * Quét và tự động hủy các đơn đặt sân chưa thanh toán sau X phút
     */
    public function cancelUnpaidBookings(int $expireMinutes = 30, ?int $ownerId = null, ?int $venueId = null): int
    {
        $threshold = Carbon::now()->subMinutes($expireMinutes);

        $unpaidBookings = Booking::where('payment_status', 'unpaid')
            ->when($venueId !== null, fn ($q) => $q->where('venue_id', $venueId))
            ->where(fn ($query) => $query->where('status', 'pending')->orWhere(fn ($qr) => $qr->where('status', 'confirmed')->where('payment_method', 'vietqr')->where('checked_in', false)))
            ->whereDoesntHave('payments', fn ($q) => $q->where('status', 'paid'))
            ->when($ownerId !== null, fn ($q) => $q->whereHas('venue', fn ($v) => $v->where('owner_id', $ownerId)))
            ->where('created_at', '<=', $threshold)
            ->get();

        $count = 0;
        foreach ($unpaidBookings as $booking) {
            try {
                $count += DB::transaction(function () use ($booking, $expireMinutes): int {
                    $locked = Booking::lockForUpdate()->findOrFail($booking->id);
                    $canExpire = $locked->status === 'pending' || ($locked->status === 'confirmed' && $locked->payment_method === 'vietqr' && ! $locked->checked_in);
                    if (! $canExpire || $locked->payment_status !== 'unpaid' || $locked->payments()->where('status', 'paid')->exists()) {
                        return 0;
                    }
                    $this->cancelBooking($locked, "Hệ thống tự động hủy: Quá hạn thanh toán ({$expireMinutes} phút)");

                    return 1;
                });
            } catch (Exception $e) {
                // Log and continue
            }
        }

        return $count;
    }

    /**
     * Tự động quét và hoàn thành các đơn đã check-in, thanh toán đủ và đã kết thúc khung giờ thi đấu
     */
    public function markExpiredCompleted(?int $ownerId = null, ?int $venueId = null): int
    {
        $today = Carbon::today()->toDateString();
        $currentTime = Carbon::now()->format('H:i:s');

        $completedBookings = Booking::where('status', 'confirmed')
            ->where('checked_in', true)
            ->where('payment_status', 'paid')
            ->where(function ($query) use ($today, $currentTime) {
                $query->whereDate('booking_date', '<', $today)
                    ->orWhere(function ($q) use ($today, $currentTime) {
                        $q->whereDate('booking_date', '=', $today)
                            ->where('end_time', '<=', $currentTime);
                    });
            })
            ->when($venueId !== null, fn ($q) => $q->where('venue_id', $venueId))
            ->when($ownerId !== null, fn ($q) => $q->whereHas('venue', fn ($v) => $v->where('owner_id', $ownerId)))
            ->get();

        $count = 0;
        foreach ($completedBookings as $booking) {
            try {
                $count += DB::transaction(function () use ($booking): int {
                    $locked = Booking::lockForUpdate()->findOrFail($booking->id);
                    if ($locked->status !== 'confirmed' || ! $locked->checked_in || $locked->payment_status !== 'paid') {
                        return 0;
                    }

                    $locked->update([
                        'status' => 'completed',
                    ]);

                    BookingStatusHistory::create([
                        'booking_id' => $locked->id,
                        'old_status' => 'confirmed',
                        'new_status' => 'completed',
                        'note' => 'Hệ thống tự động hoàn thành đơn sau khi kết thúc khung giờ thi đấu.',
                        'changed_by' => null,
                    ]);

                    return 1;
                });
            } catch (Exception $e) {
                // Tiếp tục xử lý các đơn khác
            }
        }

        return $count;
    }

    /**
     * Tự động hoàn tất tất cả các đơn đặt sân đã quá giờ thi đấu:
     * - Nếu chưa check-in -> chuyển sang "Khách không đến" (no_show)
     * - Nếu đã check-in và thanh toán đủ -> chuyển sang "Hoàn thành" (completed)
     */
    public function autoFinalizeExpiredBookings(?int $ownerId = null, ?int $venueId = null): array
    {
        $noShows = $this->markExpiredNoShows($ownerId, $venueId);
        $completed = $this->markExpiredCompleted($ownerId, $venueId);

        return [
            'no_shows' => $noShows,
            'completed' => $completed,
        ];
    }

    /**
     * Tự động quét và cập nhật các đơn hết giờ thi đấu mà chưa check-in thành "Khách không đến" (no_show)
     */
    public function markExpiredNoShows(?int $ownerId = null, ?int $venueId = null): int
    {
        $today = Carbon::today()->toDateString();
        $currentTime = Carbon::now()->format('H:i:s');

        $expiredBookings = Booking::where('status', 'confirmed')
            ->where('checked_in', false)
            ->where(function ($query) use ($today, $currentTime) {
                $query->whereDate('booking_date', '<', $today)
                    ->orWhere(function ($q) use ($today, $currentTime) {
                        $q->whereDate('booking_date', '=', $today)
                            ->where('end_time', '<=', $currentTime);
                    });
            })
            ->when($venueId !== null, fn ($q) => $q->where('venue_id', $venueId))
            ->when($ownerId !== null, fn ($q) => $q->whereHas('venue', fn ($v) => $v->where('owner_id', $ownerId)))
            ->get();

        $count = 0;
        foreach ($expiredBookings as $booking) {
            try {
                $count += DB::transaction(function () use ($booking): int {
                    $locked = Booking::lockForUpdate()->findOrFail($booking->id);
                    if ($locked->status !== 'confirmed' || $locked->checked_in) {
                        return 0;
                    }

                    $locked->update([
                        'status' => 'no_show',
                    ]);

                    BookingStatusHistory::create([
                        'booking_id' => $locked->id,
                        'old_status' => 'confirmed',
                        'new_status' => 'no_show',
                        'note' => 'Hệ thống tự động ghi nhận: Khách không đến check-in sau khi hết giờ thi đấu.',
                        'changed_by' => null,
                    ]);

                    return 1;
                });
            } catch (Exception $e) {
                // Tiếp tục xử lý các đơn khác
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

        $peakStart = $court->peak_start ?? '17:00:00';
        $peakEnd = $court->peak_end ?? '21:00:00';

        // Lấy tất cả bookings của court trong ngày
        $existingBookings = Booking::where('court_id', $court->id)
            ->whereDate('booking_date', $date)
            ->whereNotIn('status', ['cancelled'])
            ->get();

        $slots = [];
        $slotStepMinutes = max(15, (int) $court->slot_minutes);
        $duration = max($slotStepMinutes, (int) $court->min_booking_minutes);

        $currentTime = Carbon::parse("{$date} {$openTimeStr}");
        $endLimit = Carbon::parse("{$date} {$closeTimeStr}");

        while ($currentTime->copy()->addMinutes($duration)->lte($endLimit)) {
            $slotStart = $currentTime->copy();
            $slotEnd = $currentTime->copy()->addMinutes($duration);

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
            $rate = $this->calculatePricing($court, $slotStart->format('H:i:s'), $slotEnd->format('H:i:s'))['court_fee'];

            $slots[] = [
                'time' => $timeLabel,
                'start_time' => $slotStart->format('H:i:s'),
                'end_time' => $slotEnd->format('H:i:s'),
                'peak' => $isPeak,
                'rate' => $rate,
                'is_booked' => $matchedBooking !== null || $court->status !== 'active' || $court->venue->status !== 'active' || $court->venue->admin_suspended_at !== null || $slotStart->lt(now()),
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
        $courts = Court::where('venue_id', $venue->id)->orderBy('id')->get();
        $bookings = Booking::where('venue_id', $venue->id)
            ->whereDate('booking_date', $date)
            ->whereNotIn('status', ['cancelled'])
            ->get();

        $timeRows = [];
        $rowStep = 0;
        foreach ($courts as $court) {
            $a = $rowStep;
            $b = max(15, (int) $court->slot_minutes);
            while ($b !== 0) {
                [$a, $b] = [$b, $a % $b];
            }
            $rowStep = $a;
        }
        $rowStep = max(15, $rowStep ?: 30);
        $cursor = Carbon::parse($date.' '.$venue->open_time);
        $close = Carbon::parse($date.' '.$venue->close_time);
        while ($cursor->lt($close)) {
            $timeRows[] = ['start' => $cursor->format('H:i'), 'end' => $cursor->copy()->addMinutes($rowStep)->min($close)->format('H:i')];
            $cursor->addMinutes($rowStep);
        }

        $matrix = [];
        foreach ($timeRows as $row) {
            $slotHour = $row['start'];

            $courtsData = [];
            foreach ($courts as $court) {
                $startsAt = Carbon::parse($date.' '.$slotHour);
                $minimumEnd = $startsAt->copy()->addMinutes($court->min_booking_minutes);
                $hasConflict = $bookings->contains(fn (Booking $booking): bool => $booking->court_id === $court->id && substr($booking->start_time, 0, 5) < $minimumEnd->format('H:i') && substr($booking->end_time, 0, 5) > $slotHour);
                $matchedBooking = $bookings->first(function ($b) use ($court, $slotHour, $row) {
                    if ($b->court_id !== $court->id) {
                        return false;
                    }

                    return substr($b->start_time, 0, 5) < $row['end'] && substr($b->end_time, 0, 5) > $slotHour;
                });

                $courtsData[$court->id] = [
                    'court_id' => $court->id,
                    'court_name' => $court->name,
                    'is_booked' => $matchedBooking !== null,
                    'available' => ! $hasConflict && $court->status === 'active' && $venue->status === 'active' && $venue->admin_suspended_at === null && $startsAt->gte(now()) && (int) Carbon::parse($date.' '.$venue->open_time)->diffInMinutes($startsAt) % max(15, (int) $court->slot_minutes) === 0 && $minimumEnd->lte($close),
                    'is_peak' => $slotHour >= substr($court->peak_start, 0, 5) && $slotHour < substr($court->peak_end, 0, 5),
                    'start_time' => $matchedBooking?->start_time,
                    'end_time' => $matchedBooking?->end_time,
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
                'end' => $row['end'],
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

    private function recordManualPayment(Booking $booking, ?User $actor): void
    {
        $paid = (int) $booking->payments()->where('status', 'paid')->sum('amount');
        $remaining = max(0, $booking->total_price - $paid);
        if ($remaining > 0) {
            Payment::create([
                'booking_id' => $booking->id,
                'amount' => $remaining,
                'method' => $booking->payment_method,
                'status' => 'paid',
                'transaction_code' => 'COUNTER-'.Str::uuid(),
                'paid_at' => now(),
                'created_by' => $actor?->id,
                'note' => 'Chủ sân xác nhận đã thu tiền tại quầy',
            ]);
            BookingStatusHistory::create(['booking_id' => $booking->id, 'old_status' => $booking->status, 'new_status' => $booking->status, 'note' => "Ghi nhận thu {$remaining}đ tại quầy", 'changed_by' => $actor?->id]);
        }
    }

    public function recordRefund(Booking $booking, string $note, User $actor): Booking
    {
        return DB::transaction(function () use ($booking, $note, $actor): Booking {
            $booking = Booking::lockForUpdate()->findOrFail($booking->id);
            if ($booking->status !== 'cancelled') {
                throw ValidationException::withMessages(['status' => 'Chỉ ghi nhận hoàn tiền cho đơn đã hủy.']);
            }
            if ($booking->payment_status === 'refunded') {
                return $booking->load('payments');
            }
            $payments = $booking->payments()->where('status', 'paid')->lockForUpdate()->get();
            if ($payments->isEmpty()) {
                throw ValidationException::withMessages(['payment_status' => 'Không có giao dịch đã thu để hoàn tiền.']);
            }
            $amount = $payments->sum('amount');
            foreach ($payments as $payment) {
                $payment->update(['status' => 'refunded']);
            }
            $booking->update(['payment_status' => 'refunded']);
            BookingStatusHistory::create(['booking_id' => $booking->id, 'old_status' => 'cancelled', 'new_status' => 'cancelled', 'note' => mb_substr("Đã hoàn {$amount}đ thủ công: {$note}", 0, 255), 'changed_by' => $actor->id]);

            return $booking->load(['payments', 'statusHistories']);
        });
    }
}
