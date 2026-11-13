<?php

namespace Tests\Feature;

use App\Models\Addon;
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

class OwnerOperationsTest extends TestCase
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

    #[DataProvider('staffEndpoints')]
    public function test_staff_endpoints_return_401_without_authentication(string $method, string $path): void
    {
        $this->json($method, $path)->assertUnauthorized();
    }

    #[DataProvider('staffEndpoints')]
    public function test_staff_endpoints_return_403_for_customers(string $method, string $path): void
    {
        Sanctum::actingAs($this->user('customer'));
        $this->json($method, $path)->assertForbidden();
    }

    public static function staffEndpoints(): array
    {
        return [
            'timeline' => ['GET', '/api/v1/owner/calendar'],
            'venue timeline' => ['GET', '/api/v1/venues/1/timeline'],
            'export' => ['GET', '/api/v1/owner/bookings/export'],
            'expiration' => ['POST', '/api/v1/owner/bookings/cancel-unpaid'],
            'refund' => ['POST', '/api/v1/bookings/1/refund'],
        ];
    }

    public function test_other_owner_cannot_read_or_modify_bookings(): void
    {
        [$owner, $venue, $court] = $this->facility();
        $booking = $this->booking($venue, $court);
        $other = $this->user('owner');
        Sanctum::actingAs($other);

        $this->getJson('/api/v1/bookings')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/v1/bookings/'.$booking->id)->assertForbidden();
        $this->getJson('/api/v1/owner/calendar?venue_id='.$venue->id)->assertForbidden();
        $this->getJson('/api/v1/venues/'.$venue->id.'/timeline')->assertForbidden();
        $this->postJson('/api/v1/bookings/'.$booking->id.'/cancel', ['reason' => 'Wrong owner'])->assertForbidden();
        $this->putJson('/api/v1/bookings/'.$booking->id, ['status' => 'completed'])->assertForbidden();
        $this->postJson('/api/v1/bookings/'.$booking->id.'/check-in')->assertForbidden();
        $this->postJson('/api/v1/bookings/'.$booking->id.'/addons', ['addon_id' => 1, 'quantity' => 1])->assertForbidden();
        $this->deleteJson('/api/v1/bookings/'.$booking->id.'/addons/1')->assertForbidden();
        $this->postJson('/api/v1/bookings/'.$booking->id.'/refund', ['note' => 'Wrong owner'])->assertForbidden();
        $csv = $this->get('/api/v1/owner/bookings/export')->assertOk()->streamedContent();
        $this->assertStringNotContainsString($booking->booking_code, $csv);
        $this->assertDatabaseHas('bookings', ['id' => $booking->id, 'status' => 'pending']);
    }

    public function test_paid_counter_booking_records_cash_payment_and_prevents_duplicates(): void
    {
        $this->travelTo('2026-11-12 10:00:00');
        [$owner, $venue, $court] = $this->facility();
        $addon = $this->addon($venue);
        Sanctum::actingAs($owner);

        $response = $this->postJson('/api/v1/bookings', $this->payload($court, [
            'start_time' => '16:30', 'end_time' => '18:00', 'payment_status' => 'paid',
            'addons' => [['addon_id' => $addon->id, 'quantity' => 2]],
        ]))->assertCreated()->assertJsonPath('data.total_price', 220000)->assertJsonPath('data.status', 'confirmed')->assertJsonPath('data.user_id', null);
        $id = $response->json('data.id');

        $this->putJson("/api/v1/bookings/{$id}", ['payment_status' => 'paid'])->assertOk();
        $this->assertDatabaseHas('payments', ['booking_id' => $id, 'amount' => 220000, 'method' => 'cash', 'status' => 'paid', 'created_by' => $owner->id]);
        $this->assertSame(1, Payment::where('booking_id', $id)->count());
        $this->assertSame(3, $addon->fresh()->stock_quantity);
        $this->getJson('/api/v1/owner/analytics')->assertOk()->assertJsonPath('data.revenue.today', 220000);
    }

    public function test_unpaid_counter_booking_is_confirmed_immediately_and_payment_is_recorded_separately(): void
    {
        $this->travelTo('2026-11-12 10:00:00');
        [$owner, , $court] = $this->facility();
        Sanctum::actingAs($owner);
        $id = $this->postJson('/api/v1/bookings', $this->payload($court))->assertCreated()->assertJsonPath('data.status', 'confirmed')->assertJsonPath('data.payment_status', 'unpaid')->json('data.id');

        $this->putJson("/api/v1/bookings/{$id}", ['payment_status' => 'paid'])->assertOk()->assertJsonPath('data.status', 'confirmed');
        $this->assertDatabaseHas('payments', ['booking_id' => $id, 'amount' => 100000, 'status' => 'paid']);
    }

    public function test_qr_counter_booking_is_confirmed_without_marking_it_paid(): void
    {
        $this->travelTo('2026-11-12 10:00:00');
        [$owner, , $court] = $this->facility();
        Sanctum::actingAs($owner);
        $id = $this->postJson('/api/v1/bookings', $this->payload($court, ['payment_method' => 'vietqr', 'payment_status' => 'paid']))
            ->assertCreated()->assertJsonPath('data.status', 'confirmed')->assertJsonPath('data.payment_status', 'unpaid')->json('data.id');
        $this->assertDatabaseMissing('payments', ['booking_id' => $id, 'status' => 'paid']);
        $this->postJson('/api/v1/bookings/'.$id.'/check-in')->assertBadRequest();
    }

    public function test_unpaid_confirmed_qr_expires_but_counter_cash_booking_is_kept(): void
    {
        $this->travelTo('2026-11-12 10:00:00');
        [$owner, $venue, $court] = $this->facility();
        $qr = $this->booking($venue, $court, ['status' => 'confirmed', 'payment_method' => 'vietqr', 'created_at' => now()->subHour()]);
        $cash = $this->booking($venue, $court, ['status' => 'confirmed', 'created_at' => now()->subHour()]);
        Sanctum::actingAs($owner);
        $this->postJson('/api/v1/owner/bookings/cancel-unpaid?minutes=30')->assertOk()->assertJsonPath('data.cancelled_count', 1);
        $this->assertSame('cancelled', $qr->fresh()->status);
        $this->assertSame('confirmed', $cash->fresh()->status);
    }

    public function test_existing_pending_bookings_are_synchronized_without_changing_payments_or_terminal_states(): void
    {
        [, $venue, $court] = $this->facility();
        $pending = $this->booking($venue, $court);
        $cancelled = $this->booking($venue, $court, ['status' => 'cancelled']);
        $paid = $this->booking($venue, $court, ['status' => 'confirmed', 'payment_status' => 'paid']);
        $migration = require database_path('migrations/2026_11_13_021318_auto_confirm_existing_pending_bookings.php');

        $migration->up();
        $migration->up();

        $this->assertDatabaseHas('bookings', ['id' => $pending->id, 'status' => 'confirmed', 'payment_status' => 'unpaid']);
        $this->assertSame('cancelled', $cancelled->fresh()->status);
        $this->assertSame('paid', $paid->fresh()->payment_status);
        $this->assertDatabaseCount('booking_status_history', 1);
        $this->assertDatabaseHas('booking_status_history', ['booking_id' => $pending->id, 'old_status' => 'pending', 'new_status' => 'confirmed']);
    }

    public function test_seconds_format_preserves_booking_day_and_local_history_timestamp(): void
    {
        $this->travelTo('2026-11-12 10:00:00');
        [$owner, , $court] = $this->facility();
        Sanctum::actingAs($owner);
        $id = $this->postJson('/api/v1/bookings', $this->payload($court, ['start_time' => '12:00:00', 'end_time' => '13:00:00']))
            ->assertCreated()->assertJsonPath('data.booking_date', '2026-11-12')->json('data.id');

        $this->getJson('/api/v1/bookings/'.$id)->assertOk()
            ->assertJsonPath('data.booking_date', '2026-11-12')
            ->assertJsonPath('data.status_histories.0.created_at', '2026-11-12T03:00:00.000000Z');
    }

    public function test_free_booking_does_not_require_a_bank_transfer(): void
    {
        $this->travelTo('2026-11-12 10:00:00');
        [, , $court] = $this->facility();
        $court->update(['hourly_rate_standard' => 0, 'hourly_rate_peak' => 0]);

        $this->postJson('/api/v1/bookings', $this->payload($court))->assertCreated()
            ->assertJsonPath('data.total_price', 0)->assertJsonPath('data.status', 'confirmed')->assertJsonPath('data.payment_status', 'paid');
        $this->assertDatabaseCount('payments', 0);
    }

    public function test_guest_cannot_forge_paid_counter_booking_and_owner_cannot_create_for_another_owner(): void
    {
        $this->travelTo('2026-11-12 10:00:00');
        [$owner, , $court] = $this->facility();
        $this->postJson('/api/v1/bookings', $this->payload($court, ['payment_status' => 'paid']))->assertCreated()
            ->assertJsonPath('data.source', 'website')->assertJsonPath('data.status', 'confirmed')->assertJsonPath('data.payment_status', 'unpaid');
        Sanctum::actingAs($this->user('owner'));
        $this->postJson('/api/v1/bookings', $this->payload($court))->assertForbidden();
        $this->assertDatabaseCount('payments', 0);
    }

    public function test_owner_cannot_manually_mark_qr_booking_paid_or_switch_it_to_cash(): void
    {
        $this->travelTo('2026-11-12 10:00:00');
        [$owner, , $court] = $this->facility();
        Sanctum::actingAs($owner);
        $id = $this->postJson('/api/v1/bookings', $this->payload($court, ['payment_method' => 'vietqr', 'payment_status' => 'paid']))
            ->assertCreated()->assertJsonPath('data.payment_status', 'unpaid')->json('data.id');

        $this->putJson('/api/v1/bookings/'.$id, ['payment_status' => 'paid'])->assertUnprocessable();
        $this->putJson('/api/v1/bookings/'.$id, ['payment_status' => 'paid', 'payment_method' => 'cash'])->assertUnprocessable();
        $this->assertDatabaseHas('bookings', ['id' => $id, 'payment_method' => 'vietqr', 'payment_status' => 'unpaid']);
        $this->assertDatabaseCount('payments', 0);
    }

    public function test_blocked_owner_cannot_create_counter_booking_with_bearer_token(): void
    {
        $this->travelTo('2026-11-12 10:00:00');
        [$owner, , $court] = $this->facility();
        $token = $owner->createToken('owner-test')->plainTextToken;
        $owner->update(['status' => 'blocked']);
        $this->withToken($token)->postJson('/api/v1/bookings', $this->payload($court))->assertForbidden();
        $this->assertDatabaseCount('bookings', 0);
    }

    public function test_owner_can_show_qr_and_signed_webhook_records_payment_only_once(): void
    {
        $this->travelTo('2026-11-12 10:00:00');
        config(['services.sepay.account_no' => '12345678', 'services.sepay.webhook_secret' => 'owner-test-secret']);
        [$owner, , $court] = $this->facility();
        Sanctum::actingAs($owner);
        $booking = $this->postJson('/api/v1/bookings', $this->payload($court, ['payment_method' => 'vietqr']))->assertCreated()->json('data');
        $this->postJson('/api/v1/payments/generate-qr', ['booking_code' => $booking['booking_code']])->assertOk()
            ->assertJsonPath('data.payment.amount', 100000)->assertJsonPath('data.payment.account_no', '12345678');

        $body = json_encode(['id' => 'owner-test-transaction', 'transferType' => 'in', 'accountNumber' => '12345678', 'transferAmount' => 100000, 'content' => $booking['booking_code'], 'transactionDate' => '2026-11-12 10:00:00'], JSON_THROW_ON_ERROR);
        $timestamp = (string) time();
        $headers = ['CONTENT_TYPE' => 'application/json', 'HTTP_X_SEPAY_TIMESTAMP' => $timestamp, 'HTTP_X_SEPAY_SIGNATURE' => 'sha256='.hash_hmac('sha256', $timestamp.'.'.$body, 'owner-test-secret')];
        $this->call('POST', '/api/v1/payments/sepay-webhook', [], [], [], $headers, $body)->assertOk()->assertJsonPath('payment_status', 'paid');
        $this->call('POST', '/api/v1/payments/sepay-webhook', [], [], [], $headers, $body)->assertOk();

        $this->assertDatabaseCount('payments', 1);
        $this->assertDatabaseHas('bookings', ['id' => $booking['id'], 'status' => 'confirmed', 'payment_status' => 'paid']);
        $this->getJson('/api/v1/owner/analytics')->assertOk()->assertJsonPath('data.revenue.today', 100000);
    }

    public function test_completion_awards_customer_loyalty_points_once(): void
    {
        $this->travelTo('2026-11-12 12:15:00');
        [$owner, $venue, $court] = $this->facility();
        $customer = $this->user('customer');
        $booking = $this->booking($venue, $court, ['user_id' => $customer->id, 'status' => 'confirmed', 'payment_status' => 'paid', 'checked_in' => true]);
        Payment::create(['booking_id' => $booking->id, 'amount' => 100000, 'method' => 'cash', 'status' => 'paid', 'paid_at' => now()]);
        Sanctum::actingAs($owner);

        $this->putJson('/api/v1/bookings/'.$booking->id, ['status' => 'completed'])->assertOk();
        $this->putJson('/api/v1/bookings/'.$booking->id, ['status' => 'completed'])->assertUnprocessable();
        $this->assertDatabaseHas('user_points', ['user_id' => $customer->id, 'total_points' => 10]);
        $this->assertDatabaseCount('point_transactions', 1);
    }

    #[DataProvider('invalidSlots')]
    public function test_invalid_booking_times_return_422(array $changes): void
    {
        $this->travelTo('2026-11-12 10:00:00');
        [$owner, , $court] = $this->facility();
        Sanctum::actingAs($owner);
        $this->postJson('/api/v1/bookings', $this->payload($court, $changes))->assertUnprocessable();
        $this->assertDatabaseCount('bookings', 0);
        $this->assertDatabaseCount('payments', 0);
    }

    public static function invalidSlots(): array
    {
        return [
            'past day' => [['booking_date' => '2026-11-11']],
            'past time' => [['start_time' => '08:00', 'end_time' => '09:00']],
            'before opening' => [['booking_date' => '2026-11-13', 'start_time' => '05:00', 'end_time' => '06:00']],
            'after closing' => [['start_time' => '22:30', 'end_time' => '23:30']],
            'reverse interval' => [['start_time' => '15:00', 'end_time' => '14:00']],
            'below minimum' => [['start_time' => '12:00', 'end_time' => '12:30']],
            'off grid' => [['start_time' => '12:15', 'end_time' => '13:15']],
            'malformed' => [['start_time' => 'invalid']],
        ];
    }

    public function test_overlapping_bookings_are_rejected_but_adjacent_booking_is_allowed(): void
    {
        $this->travelTo('2026-11-12 10:00:00');
        [$owner, , $court] = $this->facility();
        Sanctum::actingAs($owner);
        $this->postJson('/api/v1/bookings', $this->payload($court))->assertCreated();
        $this->postJson('/api/v1/bookings', $this->payload($court, ['start_time' => '12:30', 'end_time' => '13:30']))->assertUnprocessable();
        $this->postJson('/api/v1/bookings', $this->payload($court, ['start_time' => '13:00', 'end_time' => '14:00']))->assertCreated();
        $this->assertDatabaseCount('bookings', 2);
    }

    public function test_inactive_venue_and_maintenance_court_cannot_be_booked(): void
    {
        $this->travelTo('2026-11-12 10:00:00');
        [$owner, $venue, $court] = $this->facility();
        Sanctum::actingAs($owner);
        $venue->update(['status' => 'inactive']);
        $this->postJson('/api/v1/bookings', $this->payload($court))->assertUnprocessable();
        $venue->update(['status' => 'active']);
        $court->update(['status' => 'maintenance']);
        $this->postJson('/api/v1/bookings', $this->payload($court))->assertUnprocessable();
        $this->assertDatabaseCount('bookings', 0);
    }

    public function test_stock_is_reserved_adjusted_and_restored_once_on_cancellation(): void
    {
        $this->travelTo('2026-11-12 10:00:00');
        [$owner, $venue, $court] = $this->facility();
        $addon = $this->addon($venue);
        Sanctum::actingAs($owner);
        $id = $this->postJson('/api/v1/bookings', $this->payload($court, ['addons' => [['addon_id' => $addon->id, 'quantity' => 2]]]))->assertCreated()->json('data.id');
        $this->assertSame(3, $addon->fresh()->stock_quantity);

        $this->postJson("/api/v1/bookings/{$id}/addons", ['addon_id' => $addon->id, 'quantity' => 4])->assertOk()->assertJsonPath('data.total_price', 140000);
        $this->assertSame(1, $addon->fresh()->stock_quantity);
        $this->postJson("/api/v1/bookings/{$id}/addons", ['addon_id' => $addon->id, 'quantity' => 6])->assertUnprocessable();
        $this->assertSame(1, $addon->fresh()->stock_quantity);
        $this->postJson("/api/v1/bookings/{$id}/cancel", ['reason' => 'Khách đổi lịch'])->assertOk();
        $this->postJson("/api/v1/bookings/{$id}/cancel", ['reason' => 'Retry'])->assertOk();
        $this->assertSame(5, $addon->fresh()->stock_quantity);
    }

    public function test_addon_removal_restores_stock_and_recalculates_total(): void
    {
        $this->travelTo('2026-11-12 10:00:00');
        [$owner, $venue, $court] = $this->facility();
        $addon = $this->addon($venue);
        Sanctum::actingAs($owner);
        $id = $this->postJson('/api/v1/bookings', $this->payload($court, ['addons' => [['addon_id' => $addon->id, 'quantity' => 2]]]))->assertCreated()->json('data.id');
        $this->deleteJson("/api/v1/bookings/{$id}/addons/{$addon->id}")->assertOk()->assertJsonPath('data.total_price', 100000);
        $this->assertSame(5, $addon->fresh()->stock_quantity);
        $this->assertDatabaseCount('booking_addons', 0);
    }

    public function test_insufficient_stock_duplicate_and_foreign_addons_are_rejected_atomically(): void
    {
        $this->travelTo('2026-11-12 10:00:00');
        [$owner, $venue, $court] = $this->facility();
        [, $otherVenue] = $this->facility();
        $addon = $this->addon($venue);
        $foreignAddon = $this->addon($otherVenue);
        Sanctum::actingAs($owner);

        $this->postJson('/api/v1/bookings', $this->payload($court, ['addons' => [['addon_id' => $addon->id, 'quantity' => 6]]]))->assertUnprocessable();
        $this->postJson('/api/v1/bookings', $this->payload($court, ['addons' => [['addon_id' => $foreignAddon->id, 'quantity' => 1]]]))->assertUnprocessable();
        $this->postJson('/api/v1/bookings', $this->payload($court, ['addons' => [['addon_id' => $addon->id, 'quantity' => 1], ['addon_id' => $addon->id, 'quantity' => 1]]]))->assertUnprocessable();
        $this->assertSame(5, $addon->fresh()->stock_quantity);
        $this->assertDatabaseCount('bookings', 0);
    }

    public function test_extra_services_make_paid_booking_partial_until_balance_is_collected(): void
    {
        $this->travelTo('2026-11-12 10:00:00');
        [$owner, $venue, $court] = $this->facility();
        $addon = $this->addon($venue);
        Sanctum::actingAs($owner);
        $id = $this->postJson('/api/v1/bookings', $this->payload($court, ['payment_status' => 'paid']))->assertCreated()->json('data.id');

        $this->postJson("/api/v1/bookings/{$id}/addons", ['addon_id' => $addon->id, 'quantity' => 2])->assertOk()->assertJsonPath('data.payment_status', 'partial');
        $this->putJson("/api/v1/bookings/{$id}", ['payment_status' => 'paid'])->assertOk();
        $this->assertSame(120000, (int) Payment::where('booking_id', $id)->sum('amount'));
        $this->deleteJson("/api/v1/bookings/{$id}/addons/{$addon->id}")->assertUnprocessable();
        $this->assertSame(3, $addon->fresh()->stock_quantity);
        $this->assertDatabaseHas('booking_addons', ['booking_id' => $id, 'quantity' => 2]);
    }

    public function test_cancellation_preserves_received_money_until_manual_refund_is_recorded(): void
    {
        $this->travelTo('2026-11-12 10:00:00');
        [$owner, , $court] = $this->facility();
        Sanctum::actingAs($owner);
        $id = $this->postJson('/api/v1/bookings', $this->payload($court, ['payment_status' => 'paid']))->assertCreated()->json('data.id');

        $this->postJson("/api/v1/bookings/{$id}/refund", ['note' => 'Premature'])->assertUnprocessable();
        $this->postJson("/api/v1/bookings/{$id}/cancel", ['reason' => 'Khách hủy'])->assertOk()->assertJsonPath('data.payment_status', 'paid');
        $this->postJson("/api/v1/bookings/{$id}/refund", ['note' => 'Đã trả tiền mặt'])->assertOk()->assertJsonPath('data.payment_status', 'refunded');
        $this->postJson("/api/v1/bookings/{$id}/refund", ['note' => 'Retry'])->assertOk();
        $this->assertDatabaseCount('payments', 1);
        $this->assertDatabaseHas('payments', ['booking_id' => $id, 'amount' => 100000, 'status' => 'refunded']);
        $this->assertDatabaseCount('booking_status_history', 4);
    }

    public function test_expiration_only_cancels_own_unpaid_pending_bookings(): void
    {
        $this->travelTo('2026-11-12 10:00:00');
        [$owner, $venue, $court] = $this->facility();
        [, $foreignVenue, $foreignCourt] = $this->facility();
        $own = $this->booking($venue, $court, ['created_at' => now()->subHour()]);
        $other = $this->booking($foreignVenue, $foreignCourt, ['created_at' => now()->subHour()]);
        $partial = $this->booking($venue, $court, ['payment_status' => 'partial', 'created_at' => now()->subHour()]);
        Sanctum::actingAs($owner);

        $this->postJson('/api/v1/owner/bookings/cancel-unpaid?minutes=-1')->assertUnprocessable();
        $this->postJson('/api/v1/owner/bookings/cancel-unpaid?minutes=30')->assertOk()->assertJsonPath('data.cancelled_count', 1);
        $this->assertSame('cancelled', $own->fresh()->status);
        $this->assertSame('pending', $other->fresh()->status);
        $this->assertSame('pending', $partial->fresh()->status);
    }

    public function test_timeline_uses_opening_hours_and_marks_fractional_overlap(): void
    {
        $this->travelTo('2026-11-12 06:00:00');
        [$owner, $venue, $court] = $this->facility();
        $venue->update(['open_time' => '07:30:00', 'close_time' => '10:00:00']);
        $this->booking($venue, $court, ['start_time' => '08:30:00', 'end_time' => '09:30:00']);
        Sanctum::actingAs($owner);

        $response = $this->getJson('/api/v1/owner/calendar?venue_id='.$venue->id.'&date=2026-11-12')->assertOk()->assertJsonPath('data.matrix.0.hour', '07:30');
        $rows = collect($response->json('data.matrix'))->keyBy('hour');
        $this->assertTrue($rows['09:00']['slots'][$court->id]['is_booked']);
        $this->assertFalse($rows['09:30']['slots'][$court->id]['is_booked']);
        $this->assertSame('10:00', $rows->last()['end']);
    }

    public function test_half_hour_counter_booking_is_available_until_closing_time(): void
    {
        $this->travelTo('2026-11-12 06:00:00');
        [$owner, $venue, $court] = $this->facility();
        $venue->update(['close_time' => '22:30:00']);
        $migration = require database_path('migrations/2026_11_12_235446_set_thirty_minute_minimum_for_courts.php');
        $migration->up();
        Sanctum::actingAs($owner);

        $response = $this->getJson('/api/v1/owner/calendar?venue_id='.$venue->id.'&date=2026-11-12')->assertOk();
        $rows = collect($response->json('data.matrix'))->keyBy('hour');
        $this->assertTrue($rows['22:00']['slots'][$court->id]['available']);
        $this->postJson('/api/v1/bookings', $this->payload($court, ['start_time' => '22:00', 'end_time' => '22:30']))
            ->assertCreated()->assertJsonPath('data.total_price', 50000);
        $this->assertDatabaseHas('bookings', ['court_id' => $court->id, 'start_time' => '22:00:00', 'end_time' => '22:30:00', 'court_fee' => 50000]);
    }

    public function test_public_slots_hide_customer_details_and_split_peak_pricing(): void
    {
        $this->travelTo('2026-11-12 06:00:00');
        [, $venue, $court] = $this->facility();
        $this->booking($venue, $court, ['customer_name' => 'Private Person', 'customer_phone' => '0999988888']);

        $response = $this->getJson('/api/v1/courts/'.$court->id.'/slots?date=2026-11-12')->assertOk();
        $this->assertStringNotContainsString('Private Person', $response->getContent());
        $this->assertStringNotContainsString('0999988888', $response->getContent());
        $slots = collect($response->json('data.slots'))->keyBy('start_time');
        $this->assertSame(125000, $slots['16:30:00']['rate']);
    }

    public function test_check_in_and_completion_enforce_payment_time_and_terminal_state(): void
    {
        $this->travelTo('2026-11-12 10:00:00');
        [$owner, , $court] = $this->facility();
        Sanctum::actingAs($owner);
        $id = $this->postJson('/api/v1/bookings', $this->payload($court))->assertCreated()->json('data.id');
        $this->postJson("/api/v1/bookings/{$id}/check-in")->assertBadRequest();
        $this->putJson("/api/v1/bookings/{$id}", ['payment_status' => 'paid'])->assertOk();
        $this->postJson("/api/v1/bookings/{$id}/check-in")->assertBadRequest();
        $this->putJson("/api/v1/bookings/{$id}", ['status' => 'completed'])->assertUnprocessable();
        $this->travelTo('2026-11-12 11:45:00');
        $this->postJson("/api/v1/bookings/{$id}/check-in")->assertOk()->assertJsonPath('data.checked_in', true);
        $this->postJson("/api/v1/bookings/{$id}/cancel", ['reason' => 'Already checked in'])->assertBadRequest();
        $this->putJson("/api/v1/bookings/{$id}", ['status' => 'completed'])->assertOk();
        $this->putJson("/api/v1/bookings/{$id}", ['status' => 'confirmed'])->assertUnprocessable();
        $this->assertDatabaseHas('bookings', ['id' => $id, 'status' => 'completed']);
    }

    #[DataProvider('checkInTimes')]
    public function test_check_in_opens_fifteen_minutes_early_and_allows_late_arrival_until_end(string $time, bool $allowed): void
    {
        $this->travelTo('2026-11-12 '.$time);
        [$owner, $venue, $court] = $this->facility();
        $booking = $this->booking($venue, $court, ['status' => 'confirmed', 'payment_status' => 'paid']);
        Sanctum::actingAs($owner);

        $response = $this->postJson('/api/v1/bookings/'.$booking->id.'/check-in');

        if ($allowed) {
            $response->assertOk()->assertJsonPath('data.checked_in', true);
        } else {
            $response->assertBadRequest();
        }
        $this->assertDatabaseHas('bookings', ['id' => $booking->id, 'checked_in' => $allowed]);
    }

    public static function checkInTimes(): array
    {
        return [
            'too early' => ['11:30:00', false],
            'one second before opening' => ['11:44:59', false],
            'exactly fifteen minutes early' => ['11:45:00', true],
            'at start' => ['12:00:00', true],
            'late arrival' => ['12:30:00', true],
            'one second before ending' => ['12:59:59', true],
            'at end' => ['13:00:00', false],
            'after end' => ['13:00:01', false],
        ];
    }

    public function test_no_show_is_only_allowed_after_end_and_cannot_be_reopened(): void
    {
        $this->travelTo('2026-11-12 10:00:00');
        [$owner, $venue, $court] = $this->facility();
        $booking = $this->booking($venue, $court, ['status' => 'confirmed']);
        Sanctum::actingAs($owner);
        $this->putJson('/api/v1/bookings/'.$booking->id, ['status' => 'no_show'])->assertUnprocessable();
        $this->travelTo('2026-11-12 14:00:00');
        $this->putJson('/api/v1/bookings/'.$booking->id, ['status' => 'no_show'])->assertOk();
        $this->putJson('/api/v1/bookings/'.$booking->id, ['status' => 'confirmed'])->assertUnprocessable();
    }

    public function test_owner_export_applies_filters_and_escapes_spreadsheet_formulas(): void
    {
        [$owner, $venue, $court] = $this->facility();
        $selected = $this->booking($venue, $court, ['customer_name' => '=HYPERLINK("bad")', 'status' => 'confirmed']);
        $excluded = $this->booking($venue, $court);
        Sanctum::actingAs($owner);

        $response = $this->get('/api/v1/owner/bookings/export?date=2026-11-12&status=confirmed&court_id='.$court->id)->assertOk();
        $csv = $response->streamedContent();
        $this->assertStringContainsString($selected->booking_code, $csv);
        $this->assertStringNotContainsString($excluded->booking_code, $csv);
        $this->assertStringContainsString("'=HYPERLINK", $csv);
    }

    public function test_selected_venue_limits_all_dashboard_statistics_and_forbids_other_owners(): void
    {
        $this->travelTo('2026-11-12 10:00:00');
        [$owner, $first, $firstCourt] = $this->facility();
        [, $second, $secondCourt] = $this->facility($owner);
        [, $foreign] = $this->facility();
        $bookingA = $this->booking($first, $firstCourt, ['status' => 'confirmed', 'payment_status' => 'paid']);
        $bookingB = $this->booking($second, $secondCourt, ['status' => 'confirmed', 'payment_status' => 'paid', 'start_time' => '18:00:00']);
        Payment::create(['booking_id' => $bookingA->id, 'amount' => 100000, 'method' => 'cash', 'status' => 'paid', 'paid_at' => now()]);
        Payment::create(['booking_id' => $bookingB->id, 'amount' => 900000, 'method' => 'cash', 'status' => 'paid', 'paid_at' => now()]);
        Sanctum::actingAs($owner);

        $this->getJson('/api/v1/owner/analytics?venue_id='.$first->id)->assertOk()->assertJsonPath('data.revenue.today', 100000)->assertJsonPath('data.booking_statistics.total', 1)->assertJsonCount(1, 'data.top_courts')->assertJsonPath('data.top_courts.0.court_id', $firstCourt->id)->assertJsonCount(1, 'data.peak_hours')->assertJsonPath('data.peak_hours.0.hour', 12);
        $this->getJson('/api/v1/owner/analytics?venue_id='.$second->id)->assertOk()->assertJsonPath('data.revenue.today', 900000)->assertJsonPath('data.top_courts.0.court_id', $secondCourt->id);
        $this->getJson('/api/v1/owner/analytics?venue_id='.$foreign->id)->assertForbidden();
        $this->getJson('/api/v1/owner/analytics?venue_id=invalid')->assertUnprocessable();
    }

    public function test_owner_calendar_shows_booking_details_but_public_calendar_never_exposes_them(): void
    {
        $this->travelTo('2026-11-12 07:00:00');
        [$owner, $venue, $court] = $this->facility();
        $booking = $this->booking($venue, $court, ['start_time' => '08:30:00', 'end_time' => '09:30:00', 'customer_name' => 'Private Guest', 'customer_phone' => '0999988888']);
        $public = $this->getJson('/api/v1/courts/'.$court->id.'/calendar?date=2026-11-12')->assertOk();
        $this->assertStringNotContainsString('Private Guest', $public->getContent());
        $this->assertStringNotContainsString('0999988888', $public->getContent());
        $this->assertStringNotContainsString($booking->booking_code, $public->getContent());
        Sanctum::actingAs($owner);
        $response = $this->getJson('/api/v1/owner/courts/'.$court->id.'/calendar?date=2026-11-12')->assertOk();
        $slots = collect($response->json('data.slots'))->keyBy('start');
        $this->assertSame('booked', $slots['09:00']['state']);
        $this->assertSame('Private Guest', $slots['09:00']['booking']['customer_name']);
        $this->assertSame('past', $slots['06:00']['state']);
        $this->assertSame('available', $slots['09:30']['state']);
        $booking->update(['status' => 'cancelled']);
        $response = $this->getJson('/api/v1/owner/courts/'.$court->id.'/calendar?date=2026-11-12')->assertOk();
        $slots = collect($response->json('data.slots'))->keyBy('start');
        $this->assertSame('available', $slots['09:00']['state']);
        $this->assertNull($slots['09:00']['booking']);
        Sanctum::actingAs($this->user('owner'));
        $this->getJson('/api/v1/owner/courts/'.$court->id.'/calendar?date=2026-11-12')->assertForbidden();
    }

    public function test_bulk_expiration_is_limited_to_selected_venue_even_for_same_owner(): void
    {
        $this->travelTo('2026-11-12 10:00:00');
        [$owner, $first, $firstCourt] = $this->facility();
        [, $second, $secondCourt] = $this->facility($owner);
        [, $foreign] = $this->facility();
        $firstBooking = $this->booking($first, $firstCourt, ['created_at' => now()->subHour()]);
        $secondBooking = $this->booking($second, $secondCourt, ['created_at' => now()->subHour()]);
        Sanctum::actingAs($owner);
        $this->postJson('/api/v1/owner/bookings/cancel-unpaid?venue_id='.$foreign->id)->assertForbidden();
        $this->postJson('/api/v1/owner/bookings/cancel-unpaid?venue_id='.$first->id)->assertOk()->assertJsonPath('data.cancelled_count', 1);
        $this->assertSame('cancelled', $firstBooking->fresh()->status);
        $this->assertSame('pending', $secondBooking->fresh()->status);
    }

    private function user(string $role): User
    {
        return User::create(['full_name' => 'Test '.$role, 'phone' => '0900'.str_pad((string) (User::count() + 1), 6, '0', STR_PAD_LEFT), 'role' => $role, 'status' => 'active']);
    }

    /** @return array{User, Venue, Court} */
    private function facility(?User $owner = null): array
    {
        $owner ??= $this->user('owner');
        $code = 'test-'.$owner->id.'-'.(Venue::count() + 1);
        $venue = Venue::create(['owner_id' => $owner->id, 'code' => $code, 'slug' => $code, 'name' => 'Facility '.$code, 'address' => '1 Test', 'district' => 'Q1', 'city' => 'HCM', 'phone' => '0900000000', 'open_time' => '06:00:00', 'close_time' => '23:00:00', 'status' => 'active']);
        $category = SportCategory::firstOrCreate(['code' => 'test'], ['name' => 'Test Sport', 'is_active' => true]);
        $court = Court::create(['venue_id' => $venue->id, 'sport_category_id' => $category->id, 'code' => $code, 'name' => 'Court '.$code, 'surface_type' => 'Mat', 'indoor' => true, 'hourly_rate_standard' => 100000, 'hourly_rate_peak' => 150000, 'peak_start' => '17:00:00', 'peak_end' => '21:00:00', 'slot_minutes' => 30, 'min_booking_minutes' => 60, 'status' => 'active']);

        return [$owner, $venue, $court];
    }

    private function addon(Venue $venue): Addon
    {
        return Addon::create(['venue_id' => $venue->id, 'code' => 'water-'.$venue->id, 'name' => 'Water', 'price' => 10000, 'category' => 'drink', 'unit' => 'bottle', 'stock_quantity' => 5, 'status' => 'active']);
    }

    private function payload(Court $court, array $changes = []): array
    {
        return array_merge(['court_id' => $court->id, 'booking_date' => '2026-11-12', 'start_time' => '12:00', 'end_time' => '13:00', 'source' => 'counter', 'payment_method' => 'cash', 'payment_status' => 'unpaid', 'customer_name' => 'Test Guest', 'customer_phone' => '0901234567'], $changes);
    }

    private function booking(Venue $venue, Court $court, array $changes = []): Booking
    {
        $booking = Booking::create(array_merge(['venue_id' => $venue->id, 'court_id' => $court->id, 'booking_code' => 'TEST-'.(Booking::count() + 1), 'booking_date' => '2026-11-12', 'start_time' => '12:00:00', 'end_time' => '13:00:00', 'customer_name' => 'Test Guest', 'customer_phone' => '0901234567', 'court_fee' => 100000, 'total_price' => 100000, 'status' => 'pending', 'payment_status' => 'unpaid', 'payment_method' => 'cash'], $changes));
        if (isset($changes['created_at'])) {
            $booking->forceFill(['created_at' => $changes['created_at']])->save();
        }

        return $booking;
    }
}
