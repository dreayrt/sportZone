<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Booking;
use App\Models\Court;
use App\Models\Payment;
use App\Models\SportCategory;
use App\Models\User;
use App\Models\Venue;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class AdminVenueManagementTest extends TestCase
{
    use RefreshDatabase;

    public function createApplication(): Application
    {
        $app = parent::createApplication();
        $app['config']->set('database.default', 'sqlite');
        $app['config']->set('database.connections.sqlite.database', ':memory:');
        $app['config']->set('database.connections.sqlite.url', null);
        $app['config']->set('venues.cache_store', 'array');

        return $app;
    }

    public static function protectedEndpoints(): array
    {
        return [['GET', '/api/v1/admin/venues'], ['GET', '/api/v1/admin/venues/1'], ['PUT', '/api/v1/admin/venues/1/status']];
    }

    #[DataProvider('protectedEndpoints')]
    public function test_requires_authenticated_admin(string $method, string $url): void
    {
        $this->facility();
        $this->json($method, $url)->assertUnauthorized();
        Sanctum::actingAs($this->user('owner'));
        $this->json($method, $url)->assertForbidden();
        Sanctum::actingAs($this->user('customer'));
        $this->json($method, $url)->assertForbidden();
    }

    public function test_admin_monitors_each_venue_with_counts_owner_revenue_and_bookings(): void
    {
        [$owner, $venue, $court] = $this->facility();
        $booking = $this->booking($venue, $court);
        Payment::create(['booking_id' => $booking->id, 'amount' => 100000, 'method' => 'cash', 'status' => 'paid', 'paid_at' => now()]);
        Payment::create(['booking_id' => $booking->id, 'amount' => 50000, 'method' => 'cash', 'status' => 'refunded', 'paid_at' => now()]);
        Sanctum::actingAs($this->user('admin'));

        $this->getJson('/api/v1/admin/venues?per_page=1&search='.$venue->code)->assertOk()
            ->assertJsonPath('data.total', 1)->assertJsonPath('data.data.0.owner.id', $owner->id)
            ->assertJsonPath('data.data.0.courts_count', 1)->assertJsonPath('data.data.0.bookings_count', 1);
        $detail = $this->getJson('/api/v1/admin/venues/'.$venue->id)->assertOk()
            ->assertJsonPath('data.venue.id', $venue->id)->assertJsonPath('data.bookings.data.0.id', $booking->id);
        $this->assertSame(100000, (int) $detail->json('data.venue.paid_revenue'));
    }

    public function test_suspension_hides_public_venue_and_blocks_new_booking_without_cancelling_existing(): void
    {
        $this->travelTo('2026-11-13 10:00:00');
        [, $venue, $court] = $this->facility();
        $booking = $this->booking($venue, $court);
        $this->getJson('/api/v1/venues')->assertOk()->assertJsonPath('data.total', 1);
        Sanctum::actingAs($this->user('admin'));
        $this->putJson('/api/v1/admin/venues/'.$venue->id.'/status', ['suspended' => true, 'reason' => 'Kiểm tra chất lượng cơ sở'])->assertOk();

        $this->assertNotNull($venue->fresh()->admin_suspended_at);
        $this->assertSame('confirmed', $booking->fresh()->status);
        $this->getJson('/api/v1/venues')->assertOk()->assertJsonPath('data.total', 0);
        $this->getJson('/api/v1/venues/'.$venue->slug)->assertNotFound();
        $this->getJson('/api/v1/courts/'.$court->id.'/calendar?date=2026-11-14')->assertNotFound();
        $this->postJson('/api/v1/bookings', $this->payload($court))->assertUnprocessable();
        $this->assertDatabaseCount('bookings', 1);
        $this->assertDatabaseHas('audit_logs', ['entity_type' => 'venues', 'entity_id' => $venue->id, 'action' => 'VENUES_PUT_STATUS']);
        $this->getJson('/api/v1/admin/venues/'.$venue->id)->assertOk()->assertJsonCount(1, 'data.history');
    }

    public function test_owner_cannot_bypass_admin_suspension_by_editing_venue_status(): void
    {
        $this->travelTo('2026-11-13 10:00:00');
        [$owner, $venue, $court] = $this->facility();
        Sanctum::actingAs($this->user('admin'));
        $this->putJson('/api/v1/admin/venues/'.$venue->id.'/status', ['suspended' => true, 'reason' => 'Tạm dừng kiểm tra'])->assertOk();
        Sanctum::actingAs($owner);
        $this->putJson('/api/v1/owner/venues/'.$venue->id, [
            'name' => $venue->name, 'address' => $venue->address, 'city' => $venue->city, 'district' => $venue->district,
            'phone' => $venue->phone, 'open_time' => '06:00', 'close_time' => '23:00', 'status' => 'active', 'admin_suspended_at' => null,
        ])->assertOk();
        $this->assertNotNull($venue->fresh()->admin_suspended_at);
        $this->postJson('/api/v1/bookings', $this->payload($court))->assertUnprocessable();
        $slots = $this->getJson('/api/v1/owner/courts/'.$court->id.'/calendar?date=2026-11-14')->assertOk()->json('data.slots');
        $this->assertEmpty(array_filter($slots, fn ($slot) => $slot['available']));
    }

    public function test_resume_allows_booking_again_and_audits_both_reasons(): void
    {
        $this->travelTo('2026-11-13 10:00:00');
        [, $venue, $court] = $this->facility();
        Sanctum::actingAs($this->user('admin'));
        $this->putJson('/api/v1/admin/venues/'.$venue->id.'/status', ['suspended' => true, 'reason' => 'Kiểm tra cơ sở'])->assertOk();
        $this->putJson('/api/v1/admin/venues/'.$venue->id.'/status', ['suspended' => false, 'reason' => 'Đã khắc phục xong'])->assertOk();
        $this->assertNull($venue->fresh()->admin_suspended_at);
        $this->getJson('/api/v1/venues/'.$venue->slug)->assertOk();
        $this->postJson('/api/v1/bookings', $this->payload($court))->assertCreated();
        $history = $this->getJson('/api/v1/admin/venues/'.$venue->id)->assertOk()->json('data.history');
        $this->assertCount(2, $history);
        $this->assertSame('Đã khắc phục xong', json_decode($history[0]['details'], true)['reason']);
    }

    public function test_resume_does_not_override_owner_inactive_status(): void
    {
        [, $venue] = $this->facility();
        $venue->update(['status' => 'inactive']);
        Sanctum::actingAs($this->user('admin'));
        $this->putJson('/api/v1/admin/venues/'.$venue->id.'/status', ['suspended' => true, 'reason' => 'Kiểm tra thông tin'])->assertOk();
        $this->putJson('/api/v1/admin/venues/'.$venue->id.'/status', ['suspended' => false, 'reason' => 'Đã kiểm tra xong'])->assertOk();
        $this->assertSame('inactive', $venue->fresh()->status);
        $this->getJson('/api/v1/venues/'.$venue->slug)->assertNotFound();
    }

    public function test_status_requires_reason_and_listing_can_filter_suspended_venues(): void
    {
        [, $venue] = $this->facility();
        Sanctum::actingAs($this->user('admin'));
        $this->putJson('/api/v1/admin/venues/'.$venue->id.'/status', ['suspended' => true])->assertUnprocessable()->assertJsonValidationErrors('reason');
        $this->assertNull($venue->fresh()->admin_suspended_at);
        $this->assertDatabaseCount('audit_logs', 0);
        $this->putJson('/api/v1/admin/venues/'.$venue->id.'/status', ['suspended' => true, 'reason' => 'Kiểm tra thông tin'])->assertOk();
        $this->getJson('/api/v1/admin/venues?status=suspended')->assertOk()->assertJsonPath('data.total', 1);
        $this->getJson('/api/v1/admin/venues?status=active')->assertOk()->assertJsonPath('data.total', 0);
    }

    public function test_summary_stays_global_while_city_and_sort_filter_the_list(): void
    {
        [, $venue, $court] = $this->facility();
        $booking = $this->booking($venue, $court);
        Payment::create(['booking_id' => $booking->id, 'amount' => 100000, 'method' => 'cash', 'status' => 'paid', 'paid_at' => now()]);
        $other = $venue->replicate();
        $other->fill(['code' => 'OTHER', 'slug' => 'other', 'name' => 'Alpha Venue', 'city' => 'Hanoi', 'status' => 'inactive'])->save();
        Sanctum::actingAs($this->user('admin'));

        $this->getJson('/api/v1/admin/venues?city=Hanoi')->assertOk()->assertJsonPath('data.total', 1)
            ->assertJsonPath('data.data.0.id', $other->id)->assertJsonPath('data.summary.total', 2)
            ->assertJsonPath('data.summary.active', 1)->assertJsonPath('data.summary.inactive', 1)->assertJsonPath('data.summary.suspended', 0);
        $this->getJson('/api/v1/admin/venues?sort=revenue')->assertOk()->assertJsonPath('data.data.0.id', $venue->id);
        $this->getJson('/api/v1/admin/venues?sort=bookings')->assertOk()->assertJsonPath('data.data.0.id', $venue->id);
        $this->getJson('/api/v1/admin/venues?sort=name')->assertOk()->assertJsonPath('data.data.0.id', $other->id);
    }

    public function test_upcoming_count_excludes_slots_that_already_ended_today_and_monthly_revenue_is_scoped(): void
    {
        $this->travelTo('2026-11-14 12:00:00');
        [, $venue, $court] = $this->facility();
        $past = $this->booking($venue, $court);
        $future = $past->replicate();
        $future->fill(['booking_code' => 'SZFUTURE', 'start_time' => '13:00', 'end_time' => '14:00'])->save();
        Payment::create(['booking_id' => $past->id, 'amount' => 100000, 'method' => 'cash', 'status' => 'paid', 'paid_at' => '2026-10-14 10:00:00']);
        Payment::create(['booking_id' => $future->id, 'amount' => 200000, 'method' => 'cash', 'status' => 'paid', 'paid_at' => now()]);
        Sanctum::actingAs($this->user('admin'));

        $response = $this->getJson('/api/v1/admin/venues/'.$venue->id)->assertOk()
            ->assertJsonPath('data.venue.upcoming_bookings_count', 1)->assertJsonPath('data.venue.today_bookings_count', 2);
        $this->assertSame(200000, (int) $response->json('data.venue.monthly_revenue'));
        $this->assertSame(300000, (int) $response->json('data.venue.paid_revenue'));
    }

    public function test_booking_filters_and_history_pagination_only_return_the_selected_venue(): void
    {
        [, $venue, $court] = $this->facility();
        $booking = $this->booking($venue, $court);
        Sanctum::actingAs($this->user('admin'));
        $this->getJson('/api/v1/admin/venues/'.$venue->id.'?booking_search=SZTEST&booking_date=2026-11-14&payment_status=paid')->assertOk()->assertJsonPath('data.bookings.total', 1)->assertJsonPath('data.bookings.data.0.id', $booking->id);
        $this->getJson('/api/v1/admin/venues/'.$venue->id.'?payment_status=unpaid')->assertOk()->assertJsonPath('data.bookings.total', 0);
        for ($index = 0; $index < 12; $index++) {
            AuditLog::create(['user_id' => null, 'action' => 'VENUES_PUT_STATUS', 'entity_type' => 'venues', 'entity_id' => $venue->id]);
        }
        $this->getJson('/api/v1/admin/venues/'.$venue->id.'?history_page=2')->assertOk()->assertJsonCount(2, 'data.history')
            ->assertJsonPath('data.history_pagination.total', 12)->assertJsonPath('data.history_pagination.current_page', 2);
    }

    public function test_stale_admin_action_cannot_override_a_newer_suspension(): void
    {
        [, $venue] = $this->facility();
        Sanctum::actingAs($this->user('admin'));
        $version = $this->getJson('/api/v1/admin/venues/'.$venue->id)->assertOk()->json('data.venue.status_version');
        $this->putJson('/api/v1/admin/venues/'.$venue->id.'/status', ['suspended' => true, 'reason' => 'Kiểm tra theo yêu cầu', 'expected_version' => $version])->assertOk();
        $this->putJson('/api/v1/admin/venues/'.$venue->id.'/status', ['suspended' => false, 'reason' => 'Thao tác từ trang cũ', 'expected_version' => $version])->assertStatus(409);
        $this->assertNotNull($venue->fresh()->admin_suspended_at);
        $this->assertDatabaseCount('audit_logs', 1);
        $latestVersion = $this->getJson('/api/v1/admin/venues/'.$venue->id)->assertOk()->json('data.venue.status_version');
        $this->putJson('/api/v1/admin/venues/'.$venue->id.'/status', ['suspended' => false, 'reason' => 'Đã kiểm tra thông tin', 'expected_version' => $latestVersion])->assertOk();
        $this->assertNull($venue->fresh()->admin_suspended_at);
    }

    public function test_repeated_status_action_does_not_create_duplicate_success_logs(): void
    {
        [, $venue] = $this->facility();
        Sanctum::actingAs($this->user('admin'));
        $payload = ['suspended' => true, 'reason' => 'Kiểm tra theo yêu cầu'];
        $this->putJson('/api/v1/admin/venues/'.$venue->id.'/status', $payload)->assertOk();
        $this->putJson('/api/v1/admin/venues/'.$venue->id.'/status', $payload)->assertStatus(409);
        $this->assertDatabaseCount('audit_logs', 1);
    }

    private function user(string $role): User
    {
        return User::create(['full_name' => 'Test '.$role, 'phone' => '0900'.str_pad((string) (User::count() + 1), 6, '0', STR_PAD_LEFT), 'role' => $role, 'status' => 'active']);
    }

    private function facility(): array
    {
        $owner = $this->user('owner');
        $venue = Venue::create(['owner_id' => $owner->id, 'code' => 'VN-TEST', 'slug' => 'venue-test', 'name' => 'Test Venue', 'address' => '1 Test', 'district' => 'Q1', 'city' => 'HCM', 'phone' => '0901234567', 'open_time' => '06:00:00', 'close_time' => '23:00:00', 'status' => 'active']);
        $sport = SportCategory::create(['code' => 'test', 'name' => 'Test Sport', 'is_active' => true]);
        $court = Court::create(['venue_id' => $venue->id, 'sport_category_id' => $sport->id, 'code' => 'COURT-1', 'name' => 'Court 1', 'surface_type' => 'Mat', 'indoor' => true, 'hourly_rate_standard' => 100000, 'hourly_rate_peak' => 150000, 'peak_start' => '17:00', 'peak_end' => '21:00', 'min_booking_minutes' => 30, 'slot_minutes' => 30, 'status' => 'active']);

        return [$owner, $venue, $court];
    }

    private function payload(Court $court): array
    {
        return ['court_id' => $court->id, 'booking_date' => '2026-11-14', 'start_time' => '12:00', 'end_time' => '13:00', 'customer_name' => 'Test Guest', 'customer_phone' => '0901234567'];
    }

    private function booking(Venue $venue, Court $court): Booking
    {
        return Booking::create(['booking_code' => 'SZTEST', 'venue_id' => $venue->id, 'court_id' => $court->id, 'booking_date' => '2026-11-14', 'start_time' => '10:00', 'end_time' => '11:00', 'customer_name' => 'Test Guest', 'customer_phone' => '0901234567', 'court_fee' => 100000, 'total_price' => 100000, 'status' => 'confirmed', 'payment_status' => 'paid', 'payment_method' => 'cash']);
    }
}
