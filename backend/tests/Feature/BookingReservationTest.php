<?php

namespace Tests\Feature;

use App\Models\Addon;
use App\Models\Booking;
use App\Models\Court;
use App\Models\SportCategory;
use App\Models\User;
use App\Models\Venue;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BookingReservationTest extends TestCase
{
    public function test_holds_and_recurring_bookings_require_authentication(): void
    {
        $this->postJson('/api/v1/booking-holds')->assertUnauthorized();
        $this->postJson('/api/v1/bookings/recurring')->assertUnauthorized();
        $this->assertDatabaseCount('booking_holds', 0);
        $this->assertDatabaseCount('bookings', 0);
    }

    public function test_hold_is_visible_to_other_clients_without_exposing_identity_or_token(): void
    {
        $this->travelTo('2026-11-17 09:00:00');
        [$customer, $court] = $this->facility();
        Sanctum::actingAs($customer);
        $held = $this->postJson('/api/v1/booking-holds', $this->payload($court))->assertOk();
        Sanctum::actingAs($this->customer());

        $response = $this->getJson('/api/v1/courts/'.$court->id.'/slots?date=2026-11-18')->assertOk()
            ->assertJsonPath('data.slots.12.state', 'held')->assertJsonPath('data.slots.12.is_booked', true)
            ->assertJsonPath('data.slots.12.is_own_hold', false)->assertJsonPath('data.slots.12.customer_name', null);

        $this->assertStringNotContainsString($held->json('data.token'), $response->getContent());
        $this->assertDatabaseCount('booking_holds', 1);
        $this->getJson('/api/v1/courts/'.$court->id.'/calendar?date=2026-11-18')->assertOk()
            ->assertJsonPath('data.slots.12.state', 'held')->assertJsonPath('data.slots.12.available', false);
    }

    public function test_conflicting_holds_and_bookings_are_rejected_but_adjacent_times_are_available(): void
    {
        $this->travelTo('2026-11-17 09:00:00');
        [$customer, $court] = $this->facility();
        Sanctum::actingAs($customer);
        $token = $this->postJson('/api/v1/booking-holds', $this->payload($court))->assertOk()->json('data.token');
        Sanctum::actingAs($this->customer());

        $this->postJson('/api/v1/booking-holds', $this->payload($court, ['start_time' => '12:30', 'end_time' => '13:30']))->assertUnprocessable();
        $this->postJson('/api/v1/bookings', $this->payload($court))->assertUnprocessable();
        $this->postJson('/api/v1/bookings', $this->payload($court, ['hold_token' => $token]))->assertUnprocessable();
        $this->postJson('/api/v1/bookings', $this->payload($court, ['start_time' => '13:00', 'end_time' => '14:00']))->assertCreated();

        $this->assertDatabaseCount('booking_holds', 1);
        $this->assertDatabaseCount('bookings', 1);
    }

    public function test_only_holder_can_release_or_consume_hold(): void
    {
        $this->travelTo('2026-11-17 09:00:00');
        [$customer, $court] = $this->facility();
        Sanctum::actingAs($customer);
        $token = $this->postJson('/api/v1/booking-holds', $this->payload($court))->assertOk()->json('data.token');
        Sanctum::actingAs($this->customer());
        $this->deleteJson('/api/v1/booking-holds/'.$token)->assertOk();
        $this->assertDatabaseCount('booking_holds', 1);
        Sanctum::actingAs($customer);

        $this->postJson('/api/v1/bookings', $this->payload($court, ['hold_token' => $token]))->assertCreated();

        $this->assertDatabaseCount('booking_holds', 0);
        $this->assertDatabaseHas('bookings', ['user_id' => $customer->id, 'status' => 'confirmed']);
        $this->postJson('/api/v1/bookings', $this->payload($court))->assertUnprocessable();
        $this->assertDatabaseCount('bookings', 1);
    }

    public function test_expired_hold_is_released_without_scheduler_and_stale_token_is_rejected(): void
    {
        $this->travelTo('2026-11-17 09:00:00');
        [$customer, $court] = $this->facility();
        Sanctum::actingAs($customer);
        $token = $this->postJson('/api/v1/booking-holds', $this->payload($court))->assertOk()->json('data.token');
        $this->travel(5)->minutes();

        $this->getJson('/api/v1/courts/'.$court->id.'/slots?date=2026-11-18')->assertOk()->assertJsonPath('data.slots.12.state', 'available');
        $this->postJson('/api/v1/bookings', $this->payload($court, ['hold_token' => $token]))->assertUnprocessable();
        $this->assertDatabaseCount('bookings', 0);
        Sanctum::actingAs($this->customer());
        $this->postJson('/api/v1/bookings', $this->payload($court))->assertCreated();
    }

    public function test_releasing_a_hold_makes_it_immediately_available(): void
    {
        $this->travelTo('2026-11-17 09:00:00');
        [$customer, $court] = $this->facility();
        Sanctum::actingAs($customer);
        $token = $this->postJson('/api/v1/booking-holds', $this->payload($court))->assertOk()->json('data.token');

        $this->deleteJson('/api/v1/booking-holds/'.$token)->assertOk();

        $this->assertDatabaseCount('booking_holds', 0);
        $this->getJson('/api/v1/courts/'.$court->id.'/slots?date=2026-11-18')->assertOk()->assertJsonPath('data.slots.12.state', 'available');
    }

    public function test_replacing_a_hold_is_atomic_and_a_conflict_preserves_the_original_hold(): void
    {
        $this->travelTo('2026-11-17 09:00:00');
        [$customer, $court] = $this->facility();
        $this->postJson('/api/v1/bookings', $this->payload($court, ['start_time' => '14:00', 'end_time' => '15:00']))->assertCreated();
        Sanctum::actingAs($customer);
        $original = $this->postJson('/api/v1/booking-holds', $this->payload($court))->assertOk()->json('data.token');

        $this->postJson('/api/v1/booking-holds', $this->payload($court, ['start_time' => '14:00', 'end_time' => '15:00']))->assertUnprocessable();
        $this->assertDatabaseHas('booking_holds', ['token' => $original, 'start_time' => '12:00:00']);
        $replacement = $this->postJson('/api/v1/booking-holds', $this->payload($court, ['start_time' => '13:00', 'end_time' => '14:00']))->assertOk()->json('data.token');

        $this->assertDatabaseCount('booking_holds', 1);
        $this->assertDatabaseMissing('booking_holds', ['token' => $original]);
        $this->assertDatabaseHas('booking_holds', ['token' => $replacement, 'start_time' => '13:00:00']);
    }

    public function test_recurring_holds_and_booking_creation_are_atomic_when_a_later_date_conflicts(): void
    {
        $this->travelTo('2026-11-17 09:00:00');
        [$customer, $court] = $this->facility();
        $this->postJson('/api/v1/bookings', $this->payload($court, ['booking_date' => '2026-11-25']))->assertCreated();
        Sanctum::actingAs($customer);
        $payload = $this->payload($court, ['frequency' => 'weekly', 'occurrences' => 4]);

        $this->postJson('/api/v1/booking-holds', $payload)->assertUnprocessable();
        $this->postJson('/api/v1/bookings/recurring', $payload)->assertUnprocessable();

        $this->assertDatabaseCount('booking_holds', 0);
        $this->assertDatabaseCount('bookings', 1);
        $this->assertDatabaseMissing('bookings', ['booking_date' => '2026-11-18']);
    }

    public function test_weekly_booking_uses_server_discount_for_each_occurrence_and_addons(): void
    {
        $this->travelTo('2026-11-17 09:00:00');
        [$customer, $court] = $this->facility();
        $addon = Addon::create(['venue_id' => $court->venue_id, 'code' => 'water', 'name' => 'Water', 'price' => 10000, 'category' => 'drink', 'unit' => 'bottle', 'stock_quantity' => 10, 'status' => 'active']);
        Sanctum::actingAs($customer);
        $payload = $this->payload($court, ['frequency' => 'weekly', 'occurrences' => 4, 'discount_percent' => 99,
            'addons' => [['addon_id' => $addon->id, 'quantity' => 1]]]);
        $token = $this->postJson('/api/v1/booking-holds', $payload)->assertOk()->assertJsonCount(4, 'data.dates')->json('data.token');

        $response = $this->postJson('/api/v1/bookings/recurring', array_merge($payload, ['hold_token' => $token]))->assertCreated()
            ->assertJsonPath('data.discount_percent', 5)->assertJsonPath('data.total_price', 420000)
            ->assertJsonPath('data.discount_amount', 20000)->assertJsonCount(4, 'data.bookings');

        $this->assertDatabaseCount('bookings', 4);
        $this->assertDatabaseCount('booking_holds', 0);
        $this->assertSame(6, $addon->fresh()->stock_quantity);
        $this->assertSame(1, Booking::distinct()->count('recurrence_group_id'));
        $this->assertDatabaseHas('bookings', ['booking_date' => '2026-12-09', 'total_price' => 105000, 'recurrence_discount_percent' => 5]);
        $bookingId = $response->json('data.bookings.0.id');
        $this->postJson('/api/v1/bookings/'.$bookingId.'/addons', ['addon_id' => $addon->id, 'quantity' => 2])->assertOk()->assertJsonPath('data.total_price', 115000)->assertJsonPath('data.discount_amount', 5000);
    }

    public function test_monthly_booking_preserves_original_day_after_a_short_month(): void
    {
        $this->travelTo('2026-11-17 09:00:00');
        [$customer, $court] = $this->facility();
        Sanctum::actingAs($customer);

        $this->postJson('/api/v1/bookings/recurring', $this->payload($court, ['booking_date' => '2027-01-31', 'frequency' => 'monthly', 'occurrences' => 3]))
            ->assertCreated()->assertJsonPath('data.total_price', 270000)->assertJsonPath('data.discount_percent', 10);

        $this->assertSame(['2027-01-31', '2027-02-28', '2027-03-31'], Booking::orderBy('booking_date')->get()->map(fn (Booking $booking): string => $booking->booking_date->toDateString())->all());
    }

    public function test_recurring_inventory_failure_rolls_back_all_bookings_stock_and_holds(): void
    {
        $this->travelTo('2026-11-17 09:00:00');
        [$customer, $court] = $this->facility();
        $addon = Addon::create(['venue_id' => $court->venue_id, 'code' => 'water', 'name' => 'Water', 'price' => 10000, 'category' => 'drink', 'unit' => 'bottle', 'stock_quantity' => 2, 'status' => 'active']);
        Sanctum::actingAs($customer);
        $payload = $this->payload($court, ['frequency' => 'weekly', 'occurrences' => 4]);
        $token = $this->postJson('/api/v1/booking-holds', $payload)->assertOk()->json('data.token');

        $this->postJson('/api/v1/bookings/recurring', array_merge($payload, ['hold_token' => $token, 'addons' => [['addon_id' => $addon->id, 'quantity' => 1]]]))->assertUnprocessable();

        $this->assertDatabaseCount('bookings', 0);
        $this->assertDatabaseCount('booking_addons', 0);
        $this->assertDatabaseCount('booking_holds', 4);
        $this->assertSame(2, $addon->fresh()->stock_quantity);
    }

    public function test_invalid_recurring_packages_and_voucher_stacking_are_rejected(): void
    {
        $this->travelTo('2026-11-17 09:00:00');
        [$customer, $court] = $this->facility();
        Sanctum::actingAs($customer);

        $this->postJson('/api/v1/bookings/recurring', $this->payload($court, ['frequency' => 'weekly', 'occurrences' => 3]))->assertUnprocessable();
        $this->postJson('/api/v1/bookings/recurring', $this->payload($court, ['frequency' => 'monthly', 'occurrences' => 13]))->assertUnprocessable();
        $this->postJson('/api/v1/bookings/recurring', $this->payload($court, ['frequency' => 'weekly', 'occurrences' => 4, 'voucher_code' => 'SAVE']))->assertUnprocessable();

        $this->assertDatabaseCount('bookings', 0);
    }

    public function test_unpaid_booking_is_held_then_released_after_payment_timeout(): void
    {
        $this->travelTo('2026-11-17 09:00:00');
        [, $court] = $this->facility();
        $id = $this->postJson('/api/v1/bookings', $this->payload($court))->assertCreated()->json('data.id');
        $this->getJson('/api/v1/courts/'.$court->id.'/slots?date=2026-11-18')->assertOk()->assertJsonPath('data.slots.12.state', 'held');
        $this->getJson('/api/v1/courts/'.$court->id.'/calendar?date=2026-11-18')->assertOk()->assertJsonPath('data.slots.12.state', 'held');
        $this->travel(30)->minutes();

        $this->getJson('/api/v1/courts/'.$court->id.'/slots?date=2026-11-18')->assertOk()->assertJsonPath('data.slots.12.state', 'available');

        $this->assertDatabaseHas('bookings', ['id' => $id, 'status' => 'cancelled']);
    }

    public function test_blocked_users_cannot_hold_or_create_recurring_bookings(): void
    {
        [$customer] = $this->facility();
        $customer->update(['status' => 'blocked']);
        Sanctum::actingAs($customer);

        $this->postJson('/api/v1/booking-holds')->assertForbidden();
        $this->postJson('/api/v1/bookings/recurring')->assertForbidden();

        $this->assertDatabaseCount('booking_holds', 0);
        $this->assertDatabaseCount('bookings', 0);
    }

    public function test_test_environment_cannot_use_the_application_database(): void
    {
        $this->assertSame('sqlite', DB::connection()->getDriverName());
        $this->assertSame(':memory:', DB::connection()->getDatabaseName());
    }

    private function customer(): User
    {
        return User::create(['full_name' => 'Customer', 'phone' => null, 'role' => 'customer', 'status' => 'active']);
    }

    private function facility(): array
    {
        $owner = User::create(['full_name' => 'Owner', 'phone' => '0900000001', 'role' => 'owner', 'status' => 'active']);
        $venue = Venue::create(['owner_id' => $owner->id, 'code' => 'test', 'slug' => 'test', 'name' => 'Test', 'address' => 'Test', 'district' => 'Q1', 'city' => 'HCM', 'phone' => '0900000001', 'open_time' => '06:00:00', 'close_time' => '23:00:00', 'status' => 'active']);
        $category = SportCategory::create(['code' => 'test', 'name' => 'Test Sport', 'is_active' => true]);
        $court = Court::create(['venue_id' => $venue->id, 'sport_category_id' => $category->id, 'code' => 'test', 'name' => 'Test Court', 'surface_type' => 'Mat', 'indoor' => true, 'hourly_rate_standard' => 100000, 'hourly_rate_peak' => 150000, 'peak_start' => '17:00:00', 'peak_end' => '21:00:00', 'slot_minutes' => 30, 'min_booking_minutes' => 60, 'status' => 'active']);

        return [$this->customer(), $court];
    }

    private function payload(Court $court, array $changes = []): array
    {
        return array_merge(['court_id' => $court->id, 'booking_date' => '2026-11-18', 'start_time' => '12:00', 'end_time' => '13:00', 'customer_name' => 'Test Customer', 'customer_phone' => '0901234567'], $changes);
    }
}
