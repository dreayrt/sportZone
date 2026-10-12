<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Payment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PaymentSepayTest extends TestCase
{
    protected string $secret = 'kho-doan-lam-hihi-lam-kho-doan';

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.sepay.webhook_secret' => $this->secret]);
    }

    public function test_generate_qr_fails_for_invalid_booking(): void
    {
        $response = $this->postJson('/api/v1/payments/generate-qr', [
            'booking_id' => 999999,
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
            ['X-SePay-Signature' => 'invalid_signature_hash']
        );

        $response->assertStatus(401)
            ->assertJson(['success' => false]);
    }

    public function test_sepay_webhook_accepts_valid_hmac_signature(): void
    {
        // Tạo một booking mẫu nếu chưa có
        $booking = Booking::first();
        if (!$booking) {
            $this->markTestSkipped('Chưa có booking trong database để test.');
        }

        $booking->update([
            'payment_status' => 'unpaid',
            'status' => 'pending',
        ]);

        $timestamp = (string)time();
        $payload = [
            'id' => 99901,
            'gateway' => 'MBBank',
            'transactionDate' => date('Y-m-d H:i:s'),
            'accountNumber' => '0123456789',
            'transferType' => 'in',
            'transferAmount' => $booking->total_price,
            'accumulated' => 1000000,
            'code' => null,
            'content' => 'Thanh toan ' . $booking->booking_code . ' qua chuyen khoan',
            'referenceCode' => 'TEST_FT_' . uniqid(),
        ];

        $rawBody = json_encode($payload);
        $signature = hash_hmac('sha256', $timestamp . '.' . $rawBody, $this->secret);

        $response = $this->call(
            'POST',
            '/api/v1/payments/sepay-webhook',
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_X_SEPAY_SIGNATURE' => 'sha256=' . $signature,
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
}
