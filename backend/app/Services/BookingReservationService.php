<?php

namespace App\Services;

use App\Models\Court;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class BookingReservationService
{
    public function __construct(private readonly BookingService $bookings) {}

    public function dates(array $payload): array
    {
        $frequency = $payload['frequency'] ?? null;
        if ($frequency === null) {
            return [$payload['booking_date']];
        }
        $policy = config('booking.recurrence.'.$frequency);
        $count = (int) ($payload['occurrences'] ?? 0);
        if (! $policy || $count < $policy['min_occurrences'] || $count > $policy['max_occurrences']) {
            throw ValidationException::withMessages(['occurrences' => 'Số lượt đặt không phù hợp với gói định kỳ.']);
        }
        $first = CarbonImmutable::parse($payload['booking_date']);

        return array_map(fn (int $index): string => ($frequency === 'weekly' ? $first->addWeeks($index) : $first->addMonthsNoOverflow($index))->toDateString(), range(0, $count - 1));
    }

    public function reserve(array $payload, User $user): array
    {
        return DB::transaction(function () use ($payload, $user): array {
            User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            $court = Court::lockForUpdate()->findOrFail($payload['court_id']);
            $venue = $court->venue()->lockForUpdate()->firstOrFail();
            $dates = $this->dates($payload);
            $start = $payload['start_time'].':00';
            $end = $payload['end_time'].':00';
            $step = max(15, (int) $court->slot_minutes);
            if ($court->status !== 'active' || $venue->status !== 'active' || $venue->admin_suspended_at !== null) {
                throw ValidationException::withMessages(['court_id' => 'Sân đang tạm ngưng hoạt động.']);
            }
            $this->bookings->calculatePricing($court, $start, $end);
            // A failed replacement restores the previous reservation with the transaction.
            DB::table('booking_holds')->where('user_id', $user->id)->delete();
            $token = (string) Str::uuid();
            $expires = now()->addMinutes(config('booking.hold_minutes'));
            foreach ($dates as $date) {
                $startsAt = CarbonImmutable::parse($date.' '.$start);
                $endsAt = CarbonImmutable::parse($date.' '.$end);
                if ($startsAt->lte(now()) || $start < $venue->open_time || $end > $venue->close_time
                    || (int) CarbonImmutable::parse($date.' '.$venue->open_time)->diffInMinutes($startsAt) % $step !== 0
                    || (int) $startsAt->diffInMinutes($endsAt) % $step !== 0) {
                    throw ValidationException::withMessages(['start_time' => 'Khung giờ phải trong tương lai, trong giờ mở cửa và đúng bước đặt sân.']);
                }
                if ($this->bookings->checkSlotConflict($court->id, $date, $start, $end)) {
                    throw ValidationException::withMessages(['slot' => "Khung giờ ngày {$date} đã có người đặt."]);
                }
                $this->bookings->assertNoHoldConflict($court->id, $date, $start, $end);
                DB::table('booking_holds')->insert([
                    'token' => $token, 'user_id' => $user->id, 'court_id' => $court->id,
                    'booking_date' => $date, 'start_time' => $start, 'end_time' => $end, 'expires_at' => $expires,
                ]);
            }

            return ['token' => $token, 'expires_at' => $expires->toIso8601String(), 'dates' => $dates,
                'discount_percent' => isset($payload['frequency']) ? config('booking.recurrence.'.$payload['frequency'].'.discount_percent') : 0];
        }, 3);
    }

    public function release(string $token, User $user): void
    {
        DB::table('booking_holds')->where('token', $token)->where('user_id', $user->id)->delete();
    }

    public function createRecurring(array $payload, User $user): array
    {
        if (! empty($payload['voucher_code'])) {
            throw ValidationException::withMessages(['voucher_code' => 'Ưu đãi định kỳ không áp dụng đồng thời với voucher.']);
        }

        return DB::transaction(function () use ($payload, $user): array {
            $dates = $this->dates($payload);
            $groupId = (string) Str::uuid();
            $percent = (int) config('booking.recurrence.'.$payload['frequency'].'.discount_percent');
            $bookings = [];
            foreach ($dates as $date) {
                $bookings[] = $this->bookings->createBooking(array_merge($payload, [
                    'booking_date' => $date, 'source' => 'website', 'payment_method' => 'vietqr', 'payment_status' => 'unpaid',
                ]), $user, ['group_id' => $groupId, 'frequency' => $payload['frequency'], 'discount_percent' => $percent]);
            }

            return ['group_id' => $groupId, 'discount_percent' => $percent, 'bookings' => $bookings,
                'total_price' => collect($bookings)->sum('total_price'), 'discount_amount' => collect($bookings)->sum('discount_amount')];
        }, 3);
    }
}
