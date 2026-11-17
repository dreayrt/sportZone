<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PaymentSepayTest extends TestCase
{
    use RefreshDatabase;

    protected string $secret = 'sepay-test-secret';

    public function createApplication(): Application
    {
        $app = parent::createApplication();
        $app['config']->set('database.default', 'sqlite');
        $app['config']->set('database.connections.sqlite.database', ':memory:');
        $app['config']->set('database.connections.sqlite.url', null);

        return $app;
    }

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.sepay.webhook_secret' => $this->secret]);
        config(['services.sepay.account_no' => '0123456789']);
    }

    public function test_generate_qr_fails_for_invalid_booking(): void
    {
        $this->seed();
        Sanctum::actingAs(User::findOrFail(4));
        $response = $this->postJson('/api/v1/payments/generate-qr', [
            'booking_code' => 'SZ-NOTFOUND',
        ]);

        $response->assertStatus(404)
            ->assertJson(['success' => false]);
    }

    public function test_sepay_webhook_rejects_missing_signature(): void
    {
        $response = $this->postJson('/api/v1/payments/sepay-webhook', [
            'id' => 1234,
            'transferAmount' => 100000,
            'content' => 'Test',
        ]);

        $response->assertStatus(401)
            ->assertJson(['success' => false]);
    }

    public function test_sepay_webhook_rejects_invalid_signature(): void
    {
        $response = $this->postJson(
            '/api/v1/payments/sepay-webhook',
            ['id' => 1234, 'transferAmount' => 100000, 'content' => 'Test'],
            ['X-SePay-Signature' => 'sha256='.str_repeat('0', 64), 'X-SePay-Timestamp' => (string) time()]
        );

        $response->assertStatus(401)
            ->assertJson(['success' => false]);
    }

    public function test_sepay_webhook_accepts_valid_hmac_signature(): void
    {
        $booking = $this->booking();

        $timestamp = (string) time();
        $payload = [
            'id' => 99901,
            'gateway' => 'MBBank',
            'transactionDate' => date('Y-m-d H:i:s'),
            'accountNumber' => '0123456789',
            'transferType' => 'in',
            'transferAmount' => $booking->total_price,
            'accumulated' => 1000000,
            'code' => null,
            'content' => 'Thanh toan '.$booking->booking_code.' qua chuyen khoan',
            'referenceCode' => 'TEST_FT_'.uniqid(),
        ];

        $rawBody = json_encode($payload);
        $signature = hash_hmac('sha256', $timestamp.'.'.$rawBody, $this->secret);

        $response = $this->call(
            'POST',
            '/api/v1/payments/sepay-webhook',
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_X_SEPAY_SIGNATURE' => 'sha256='.$signature,
                'HTTP_X_SEPAY_TIMESTAMP' => $timestamp,
            ],
            $rawBody
        );

        $response->assertStatus(200)
            ->assertJson(['success' => true]);

        // Kiểm tra booking được cập nhật thành 'paid'
        $booking->refresh();
        $this->assertEquals('paid', $booking->payment_status);

        // Kiểm tra record payment đã tạo
        $this->assertDatabaseHas('payments', [
            'booking_id' => $booking->id,
            'status' => 'paid',
            'method' => 'vietqr',
        ]);
    }

    public function test_payment_endpoints_require_authentication(): void
    {
        $this->postJson('/api/v1/payments/generate-qr', ['booking_code' => 'SZ-TEST'])->assertUnauthorized();
        $this->getJson('/api/v1/payments/status/SZ-TEST')->assertUnauthorized();
    }

    public function test_other_customer_cannot_access_qr_or_payment_status(): void
    {
        $booking = $this->booking();
        Sanctum::actingAs(User::findOrFail(5));

        $this->postJson('/api/v1/payments/generate-qr', ['booking_code' => $booking->booking_code])->assertForbidden();
        $this->getJson('/api/v1/payments/status/'.$booking->booking_code)->assertForbidden();
    }

    public function test_regenerating_qr_does_not_extend_the_booking_deadline(): void
    {
        $this->travelTo('2026-11-17 10:00:00');
        $booking = $this->booking();
        Sanctum::actingAs(User::findOrFail(4));
        $this->travel(10)->minutes();

        $this->postJson('/api/v1/payments/generate-qr', ['booking_code' => $booking->booking_code])
            ->assertOk()->assertJsonPath('data.payment.expires_at', '2026-11-17T10:30:00+07:00')
            ->assertJsonPath('data.payment.expires_in_minutes', 20);
    }

    public function test_expired_unpaid_booking_is_cancelled_and_cannot_generate_qr(): void
    {
        $this->freezeTime();
        $booking = $this->booking();
        Sanctum::actingAs(User::findOrFail(4));
        $this->travel(30)->minutes();

        $this->postJson('/api/v1/payments/generate-qr', ['booking_code' => $booking->booking_code])->assertStatus(400);

        $this->assertDatabaseHas('bookings', ['id' => $booking->id, 'status' => 'cancelled', 'payment_status' => 'unpaid']);
    }

    public function test_status_poll_expires_booking_without_waiting_for_scheduler(): void
    {
        $this->freezeTime();
        $booking = $this->booking();
        Sanctum::actingAs(User::findOrFail(4));
        $this->travel(30)->minutes();

        $this->getJson('/api/v1/payments/status/'.$booking->booking_code)->assertOk()
            ->assertJsonPath('data.is_expired', true)->assertJsonPath('data.status', 'cancelled');

        $this->assertDatabaseHas('bookings', ['id' => $booking->id, 'status' => 'cancelled']);
    }

    public function test_partial_payments_accumulate_and_duplicate_webhook_is_idempotent(): void
    {
        $booking = $this->booking();

        $this->webhook($booking, 101, 40000)->assertOk()->assertJsonPath('payment_status', 'partial');
        $this->webhook($booking, 101, 40000)->assertOk();
        $this->webhook($booking, 102, 60000)->assertOk()->assertJsonPath('payment_status', 'paid');

        $this->assertSame(2, $booking->payments()->count());
        $this->assertSame(100000, (int) $booking->payments()->sum('amount'));
        $this->assertDatabaseHas('bookings', ['id' => $booking->id, 'payment_status' => 'paid', 'status' => 'confirmed']);
    }

    public function test_late_payment_does_not_revive_an_expired_booking(): void
    {
        $this->freezeTime();
        $booking = $this->booking();
        $this->travel(30)->minutes();

        $this->webhook($booking, 103, 100000)->assertOk()->assertJsonPath('success', true);

        $this->assertDatabaseMissing('payments', ['transaction_code' => 'SEPAY-103']);
        $this->assertDatabaseHas('bookings', ['id' => $booking->id, 'status' => 'cancelled', 'payment_status' => 'unpaid']);
    }

    public function test_expired_partial_payment_is_preserved_for_reconciliation(): void
    {
        $this->freezeTime();
        $booking = $this->booking();
        $this->webhook($booking, 104, 40000)->assertOk()->assertJsonPath('payment_status', 'partial');
        Sanctum::actingAs(User::findOrFail(4));
        $this->travel(30)->minutes();

        $this->getJson('/api/v1/payments/status/'.$booking->booking_code)->assertOk()
            ->assertJsonPath('data.payment_status', 'partial')->assertJsonPath('data.is_expired', true)
            ->assertJsonPath('data.total_paid', 40000)->assertJsonPath('data.status', 'pending');
        $this->postJson('/api/v1/payments/generate-qr', ['booking_code' => $booking->booking_code])->assertStatus(400);
        $this->webhook($booking, 105, 60000)->assertOk();

        $this->assertDatabaseMissing('payments', ['transaction_code' => 'SEPAY-105']);
        $this->assertDatabaseHas('bookings', ['id' => $booking->id, 'status' => 'pending', 'payment_status' => 'partial']);
    }

    public function test_webhook_to_another_bank_account_does_not_change_booking(): void
    {
        $booking = $this->booking();

        $this->webhook($booking, 106, 100000, ['accountNumber' => '99999999'])->assertOk();

        $this->assertDatabaseMissing('payments', ['transaction_code' => 'SEPAY-106']);
        $this->assertDatabaseHas('bookings', ['id' => $booking->id, 'payment_status' => 'unpaid']);
    }

    public function test_overpayment_is_recorded_without_changing_the_order_total(): void
    {
        $booking = $this->booking();

        $this->webhook($booking, 107, 150000)->assertOk()->assertJsonPath('payment_status', 'paid');

        $this->assertDatabaseHas('payments', ['booking_id' => $booking->id, 'amount' => 150000, 'status' => 'paid']);
        $this->assertDatabaseHas('bookings', ['id' => $booking->id, 'total_price' => 100000, 'payment_status' => 'paid']);
    }

    public function test_cancelled_booking_is_not_reopened_by_webhook(): void
    {
        $booking = $this->booking();
        $booking->update(['status' => 'cancelled']);

        $this->webhook($booking, 108, 100000)->assertOk()->assertJsonPath('success', true);

        $this->assertDatabaseMissing('payments', ['transaction_code' => 'SEPAY-108']);
        $this->assertDatabaseHas('bookings', ['id' => $booking->id, 'status' => 'cancelled', 'payment_status' => 'unpaid']);
    }

    private function booking(): Booking
    {
        $this->seed();

        return Booking::create([
            'booking_code' => 'SZ-TEST01', 'user_id' => 4, 'venue_id' => 1, 'court_id' => 1,
            'booking_date' => now()->addDay()->toDateString(), 'start_time' => '12:00:00', 'end_time' => '13:00:00',
            'customer_name' => 'Test Customer', 'customer_phone' => '0912345678',
            'court_fee' => 100000, 'total_price' => 100000, 'status' => 'pending',
            'payment_status' => 'unpaid', 'payment_method' => 'vietqr', 'source' => 'website',
        ]);
    }

    private function webhook(Booking $booking, int $id, int $amount, array $overrides = []): TestResponse
    {
        $payload = array_merge([
            'id' => $id, 'transferType' => 'in', 'transferAmount' => $amount,
            'content' => $booking->booking_code, 'accountNumber' => '0123456789',
            'transactionDate' => now()->toDateTimeString(),
        ], $overrides);
        $body = json_encode($payload, JSON_THROW_ON_ERROR);
        $timestamp = (string) time();

        return $this->call('POST', '/api/v1/payments/sepay-webhook', [], [], [], [
            'CONTENT_TYPE' => 'application/json', 'HTTP_X_SEPAY_TIMESTAMP' => $timestamp,
            'HTTP_X_SEPAY_SIGNATURE' => 'sha256='.hash_hmac('sha256', $timestamp.'.'.$body, $this->secret),
        ], $body);
    }
}
