<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Court;
use App\Models\Payment;
use App\Models\SportCategory;
use App\Models\User;
use App\Models\Venue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class DashboardAnalyticsControllerTest extends TestCase
{
    use DatabaseTransactions;

    public function test_owner_can_get_analytics_with_complete_empty_state(): void
    {
        $owner = $this->createUser('owner');
        Sanctum::actingAs($owner);

        $response = $this->getJson('/api/v1/owner/analytics');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.revenue.today', 0)
            ->assertJsonPath('data.booking_statistics.total', 0)
            ->assertJsonPath('data.booking_statistics.no_show', 0)
            ->assertJsonCount(7, 'data.revenue_chart')
            ->assertJsonCount(0, 'data.top_courts')
            ->assertJsonCount(0, 'data.peak_hours');
    }

    #[DataProvider('forbiddenAnalyticsAccess')]
    public function test_role_restrictions_are_enforced(string $role, string $endpoint): void
    {
        Sanctum::actingAs($this->createUser($role));

        $this->getJson($endpoint)
            ->assertForbidden()
            ->assertJsonPath('success', false);
    }

    public function test_admin_can_get_platform_analytics(): void
    {
        $admin = $this->createUser('admin');
        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/v1/admin/analytics');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'overview' => [
                        'total_gmv',
                        'total_users',
                        'total_customers',
                        'total_owners',
                        'total_venues',
                        'total_courts',
                        'total_bookings',
                        'total_completed_bookings',
                    ],
                    'revenue_chart',
                    'user_growth',
                    'booking_statistics',
                ],
            ])
            ->assertJsonCount(7, 'data.revenue_chart')
            ->assertJsonCount(7, 'data.user_growth');
    }

    public function test_owner_analytics_is_isolated_from_other_owners_data(): void
    {
        $this->travelTo('2026-10-12 12:00:00');
        $ownerA = $this->createUser('owner');
        $ownerB = $this->createUser('owner');
        [$venueA, $courtA] = $this->createVenueAndCourt($ownerA, 'A');
        [$venueB, $courtB] = $this->createVenueAndCourt($ownerB, 'B');
        $bookingA = $this->createBooking($venueA, $courtA, ['status' => 'completed']);
        $bookingB = $this->createBooking($venueB, $courtB, ['status' => 'completed']);
        $this->createPayment($bookingA, 120000, 'paid', now());
        $this->createPayment($bookingB, 990000, 'paid', now());
        Sanctum::actingAs($ownerA);

        $response = $this->getJson('/api/v1/owner/analytics');

        $response->assertOk()
            ->assertJsonPath('data.revenue.today', 120000)
            ->assertJsonPath('data.booking_statistics.total', 1)
            ->assertJsonPath('data.top_courts.0.court_id', $courtA->id)
            ->assertJsonMissing(['court_id' => $courtB->id]);
    }

    public function test_today_revenue_only_sums_valid_paid_payments(): void
    {
        $this->travelTo('2026-10-12 12:00:00');
        $owner = $this->createUser('owner');
        [$venue, $court] = $this->createVenueAndCourt($owner, 'REV');
        $validBooking = $this->createBooking($venue, $court, ['status' => 'completed']);
        $cancelledBooking = $this->createBooking($venue, $court, ['status' => 'cancelled']);
        $oldBooking = $this->createBooking($venue, $court, ['status' => 'completed']);
        $this->createPayment($validBooking, 100000, 'paid', now()->subHour());
        $this->createPayment($validBooking, 50000, 'paid', now());
        $this->createPayment($validBooking, 800000, 'pending', null);
        $this->createPayment($validBooking, 700000, 'failed', now());
        $this->createPayment($validBooking, 600000, 'refunded', now());
        $this->createPayment($cancelledBooking, 900000, 'paid', now());
        $this->createPayment($oldBooking, 30000, 'paid', now()->subDay());
        Sanctum::actingAs($owner);

        $response = $this->getJson('/api/v1/owner/analytics');

        $response->assertOk()
            ->assertJsonPath('data.revenue.today', 150000)
            ->assertJsonPath('data.revenue.this_week', 150000)
            ->assertJsonPath('data.revenue.this_month', 180000)
            ->assertJsonCount(7, 'data.revenue_chart');
    }

    public function test_top_courts_are_sorted_and_peak_hours_are_aggregated(): void
    {
        $owner = $this->createUser('owner');
        [$venue, $firstCourt] = $this->createVenueAndCourt($owner, 'TOP1');
        $secondCourt = $this->createCourt($venue, $firstCourt->sport_category_id, 'TOP2');

        for ($index = 0; $index < 3; $index++) {
            $booking = $this->createBooking($venue, $firstCourt, ['start_time' => '18:00:00']);
            $this->createPayment($booking, 100000, 'paid', now());
        }

        $otherBooking = $this->createBooking($venue, $secondCourt, [
            'start_time' => '20:00:00',
            'end_time' => '21:00:00',
        ]);
        $this->createPayment($otherBooking, 500000, 'paid', now());
        Sanctum::actingAs($owner);

        $response = $this->getJson('/api/v1/owner/analytics');

        $response->assertOk()
            ->assertJsonPath('data.top_courts.0.court_id', $firstCourt->id)
            ->assertJsonPath('data.top_courts.0.total_bookings', 3)
            ->assertJsonPath('data.top_courts.0.revenue', 300000)
            ->assertJsonPath('data.top_courts.1.court_id', $secondCourt->id)
            ->assertJsonPath('data.peak_hours.0.hour', 18)
            ->assertJsonPath('data.peak_hours.0.booking_count', 3)
            ->assertJsonPath('data.peak_hours.1.hour', 20)
            ->assertJsonPath('data.peak_hours.1.booking_count', 1);
    }

    /**
     * @return array<string, array{string, string}>
     */
    public static function forbiddenAnalyticsAccess(): array
    {
        return [
            'customer cannot access owner analytics' => ['customer', '/api/v1/owner/analytics'],
            'customer cannot access admin analytics' => ['customer', '/api/v1/admin/analytics'],
            'owner cannot access admin analytics' => ['owner', '/api/v1/admin/analytics'],
            'admin cannot access owner analytics' => ['admin', '/api/v1/owner/analytics'],
        ];
    }

    private function createUser(string $role): User
    {
        $identifier = Str::lower(Str::random(12));

        return User::create([
            'full_name' => "Analytics {$role}",
            'email' => "analytics-{$identifier}@sportzone.local",
            'phone' => "A{$identifier}",
            'password_hash' => Hash::make('password'),
            'role' => $role,
            'status' => 'active',
        ]);
    }

    /**
     * @return array{Venue, Court}
     */
    private function createVenueAndCourt(User $owner, string $suffix): array
    {
        $identifier = Str::lower(Str::random(8));
        $category = SportCategory::create([
            'code' => "CAT-{$suffix}-{$identifier}",
            'name' => "Môn {$suffix}",
            'is_active' => true,
            'sort_order' => 0,
        ]);
        $venue = Venue::create([
            'owner_id' => $owner->id,
            'code' => "VEN-{$suffix}-{$identifier}",
            'name' => "Cơ sở {$suffix}",
            'slug' => "venue-{$suffix}-{$identifier}",
            'address' => '1 Đường Kiểm Thử',
            'district' => 'Quận 1',
            'city' => 'TP.HCM',
            'phone' => "V{$identifier}",
            'status' => 'active',
        ]);

        return [$venue, $this->createCourt($venue, $category->id, $suffix)];
    }

    private function createCourt(Venue $venue, int $categoryId, string $suffix): Court
    {
        $identifier = Str::lower(Str::random(8));

        return Court::create([
            'venue_id' => $venue->id,
            'sport_category_id' => $categoryId,
            'code' => "CRT-{$suffix}-{$identifier}",
            'name' => "Sân {$suffix}",
            'surface_type' => 'Sàn kiểm thử',
            'indoor' => true,
            'hourly_rate_standard' => 100000,
            'hourly_rate_peak' => 150000,
            'status' => 'active',
        ]);
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function createBooking(Venue $venue, Court $court, array $overrides = []): Booking
    {
        $identifier = Str::upper(Str::random(10));

        return Booking::create(array_merge([
            'booking_code' => "AT-{$identifier}",
            'venue_id' => $venue->id,
            'court_id' => $court->id,
            'source' => 'website',
            'booking_date' => now()->toDateString(),
            'start_time' => '18:00:00',
            'end_time' => '19:00:00',
            'customer_name' => 'Khách kiểm thử',
            'customer_phone' => "B{$identifier}",
            'court_fee' => 100000,
            'addons_fee' => 0,
            'discount_amount' => 0,
            'total_price' => 100000,
            'status' => 'confirmed',
            'payment_status' => 'paid',
            'payment_method' => 'cash',
            'checked_in' => false,
        ], $overrides));
    }

    private function createPayment(Booking $booking, int $amount, string $status, mixed $paidAt): Payment
    {
        return Payment::create([
            'booking_id' => $booking->id,
            'amount' => $amount,
            'method' => 'cash',
            'status' => $status,
            'paid_at' => $paidAt,
        ]);
    }
}
