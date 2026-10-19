<?php

namespace Tests\Feature\Console\Commands;

use App\Models\Booking;
use App\Models\Court;
use App\Models\Notification;
use App\Models\SportCategory;
use App\Models\User;
use App\Models\Venue;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class SendBookingRemindersTest extends TestCase
{
    use DatabaseTransactions;

    public function test_booking_starting_within_sixty_minutes_creates_correct_unread_reminder(): void
    {
        $this->travelTo('2026-10-13 10:00:00');
        $user = $this->createUser();
        $booking = $this->createBooking(
            $user,
            'confirmed',
            CarbonImmutable::parse('2026-10-13 10:55:00', config('app.timezone')),
        );

        $exitCode = Artisan::call('sportzone:send-reminders');

        $this->assertSame(0, $exitCode);
        $notification = Notification::query()
            ->where('type', 'booking_reminder')
            ->where('reference_type', 'booking')
            ->where('reference_id', $booking->id)
            ->firstOrFail();
        $this->assertSame($user->id, $notification->user_id);
        $this->assertSame('Nhắc lịch đặt sân', $notification->title);
        $this->assertSame('in_app', $notification->channel);
        $this->assertFalse($notification->is_read);
        $this->assertNull($notification->read_at);
        $this->assertSame('2026-10-13 09:55:00', $notification->scheduled_at?->format('Y-m-d H:i:s'));
        $this->assertSame('2026-10-13 10:00:00', $notification->sent_at?->format('Y-m-d H:i:s'));
        $this->assertStringContainsString('10:55 hôm nay', $notification->message);
        $this->assertStringContainsString('Vui lòng đến sớm 10 phút.', $notification->message);
    }

    #[DataProvider('ineligibleStatuses')]
    public function test_ineligible_booking_status_does_not_create_reminder(string $status): void
    {
        $this->travelTo('2026-10-13 10:00:00');
        $booking = $this->createBooking(
            $this->createUser(),
            $status,
            CarbonImmutable::parse('2026-10-13 10:55:00', config('app.timezone')),
        );

        Artisan::call('sportzone:send-reminders');

        $this->assertSame(0, Notification::query()
            ->where('type', 'booking_reminder')
            ->where('reference_type', 'booking')
            ->where('reference_id', $booking->id)
            ->count());
    }

    public function test_guest_booking_without_user_does_not_create_reminder(): void
    {
        $this->travelTo('2026-10-13 10:00:00');
        $booking = $this->createBooking(
            null,
            'confirmed',
            CarbonImmutable::parse('2026-10-13 10:55:00', config('app.timezone')),
        );

        Artisan::call('sportzone:send-reminders');

        $this->assertSame(0, Notification::query()
            ->where('type', 'booking_reminder')
            ->where('reference_type', 'booking')
            ->where('reference_id', $booking->id)
            ->count());
    }

    public function test_running_command_twice_still_creates_only_one_reminder(): void
    {
        $this->travelTo('2026-10-13 10:00:00');
        $booking = $this->createBooking(
            $this->createUser(),
            'confirmed',
            CarbonImmutable::parse('2026-10-13 10:30:00', config('app.timezone')),
        );

        Artisan::call('sportzone:send-reminders');
        Artisan::call('sportzone:send-reminders');

        $this->assertSame(1, Notification::query()
            ->where('type', 'booking_reminder')
            ->where('reference_type', 'booking')
            ->where('reference_id', $booking->id)
            ->count());
        $this->assertStringContainsString('tạo 0 reminder, bỏ qua 1', Artisan::output());
    }

    public function test_booking_outside_sixty_minute_window_does_not_create_reminder(): void
    {
        $this->travelTo('2026-10-13 10:00:00');
        $booking = $this->createBooking(
            $this->createUser(),
            'confirmed',
            CarbonImmutable::parse('2026-10-13 11:01:00', config('app.timezone')),
        );

        Artisan::call('sportzone:send-reminders');

        $this->assertSame(0, Notification::query()
            ->where('type', 'booking_reminder')
            ->where('reference_type', 'booking')
            ->where('reference_id', $booking->id)
            ->count());
    }

    public function test_reminder_window_handles_booking_after_midnight(): void
    {
        $this->travelTo('2026-10-13 23:30:00');
        $booking = $this->createBooking(
            $this->createUser(),
            'pending',
            CarbonImmutable::parse('2026-10-14 00:15:00', config('app.timezone')),
        );

        Artisan::call('sportzone:send-reminders');

        $notification = Notification::query()
            ->where('type', 'booking_reminder')
            ->where('reference_type', 'booking')
            ->where('reference_id', $booking->id)
            ->firstOrFail();
        $this->assertStringContainsString('00:15 ngày mai', $notification->message);
    }

    /** @return array<string, array{string}> */
    public static function ineligibleStatuses(): array
    {
        return [
            'cancelled booking' => ['cancelled'],
            'completed booking' => ['completed'],
            'no-show booking' => ['no_show'],
        ];
    }

    private function createBooking(
        ?User $user,
        string $status,
        CarbonImmutable $startsAt,
    ): Booking {
        $identifier = Str::upper(Str::random(10));
        $owner = $this->createUser('owner');
        $sport = SportCategory::create([
            'code' => "RS{$identifier}",
            'name' => "Reminder Sport {$identifier}",
            'is_active' => true,
            'sort_order' => 0,
        ]);
        $venue = Venue::create([
            'owner_id' => $owner->id,
            'code' => "RV{$identifier}",
            'name' => "Reminder Venue {$identifier}",
            'slug' => 'reminder-venue-'.Str::lower($identifier),
            'address' => '1 Reminder Street',
            'district' => 'Reminder District',
            'city' => 'Reminder City',
            'phone' => '0900000000',
            'status' => 'active',
        ]);
        $court = Court::create([
            'venue_id' => $venue->id,
            'sport_category_id' => $sport->id,
            'code' => "RC{$identifier}",
            'name' => "Reminder Court {$identifier}",
            'surface_type' => 'Test',
            'hourly_rate_standard' => 100000,
            'hourly_rate_peak' => 120000,
            'status' => 'active',
        ]);

        return Booking::create([
            'booking_code' => "RB{$identifier}",
            'user_id' => $user?->id,
            'venue_id' => $venue->id,
            'court_id' => $court->id,
            'booking_date' => $startsAt->toDateString(),
            'start_time' => $startsAt->format('H:i:s'),
            'end_time' => $startsAt->addHour()->format('H:i:s'),
            'customer_name' => $user?->full_name ?? 'Guest Reminder',
            'customer_phone' => $user?->phone ?? '0909999999',
            'court_fee' => 100000,
            'total_price' => 100000,
            'status' => $status,
            'payment_status' => 'paid',
            'payment_method' => 'cash',
        ]);
    }

    private function createUser(string $role = 'customer'): User
    {
        $identifier = Str::lower(Str::random(12));

        return User::create([
            'full_name' => "Reminder {$identifier}",
            'email' => "reminder-{$identifier}@sportzone.local",
            'phone' => 'M'.Str::upper(Str::random(14)),
            'password_hash' => Hash::make('password'),
            'role' => $role,
            'status' => 'active',
        ]);
    }
}
