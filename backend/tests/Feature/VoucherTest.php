<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Voucher;
use Tests\TestCase;

class VoucherTest extends TestCase
{
    public function test_can_list_available_vouchers(): void
    {
        $response = $this->getJson('/api/v1/vouchers');

        $response->assertStatus(200)
            ->assertJson(['success' => true]);
    }

    public function test_validate_voucher_with_valid_fixed_code(): void
    {
        // SPORTZONE50: Giảm 50.000đ cho đơn từ 300.000đ
        $response = $this->postJson('/api/v1/vouchers/validate', [
            'code' => 'SPORTZONE50',
            'total_amount' => 500000,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'valid' => true,
                    'discount_amount' => 50000,
                    'final_amount' => 450000,
                ],
            ]);
    }

    public function test_validate_voucher_with_valid_percent_code(): void
    {
        // WELCOME10: Giảm 10% tối đa 80.000đ cho đơn từ 200.000đ
        $response = $this->postJson('/api/v1/vouchers/validate', [
            'code' => 'WELCOME10',
            'total_amount' => 300000, // 10% của 300k = 30k
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'valid' => true,
                    'discount_amount' => 30000,
                    'final_amount' => 270000,
                ],
            ]);
    }

    public function test_validate_voucher_percent_respects_max_discount(): void
    {
        // WELCOME10: 10% của 1.000.000đ là 100k, nhưng max_discount = 80k
        $response = $this->postJson('/api/v1/vouchers/validate', [
            'code' => 'WELCOME10',
            'total_amount' => 1000000,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'valid' => true,
                    'discount_amount' => 80000, // Bị giới hạn ở 80k
                    'final_amount' => 920000,
                ],
            ]);
    }

    public function test_validate_voucher_rejects_under_minimum_order_value(): void
    {
        // SPORTZONE50 yêu cầu tối thiểu 300.000đ, gửi lên 200.000đ
        $response = $this->postJson('/api/v1/vouchers/validate', [
            'code' => 'SPORTZONE50',
            'total_amount' => 200000,
        ]);

        $response->assertStatus(422)
            ->assertJson(['success' => false]);
    }

    public function test_validate_voucher_returns_404_for_non_existent_code(): void
    {
        $response = $this->postJson('/api/v1/vouchers/validate', [
            'code' => 'MA_KHONG_TON_TAI_999',
            'total_amount' => 500000,
        ]);

        $response->assertStatus(404)
            ->assertJson(['success' => false]);
    }

    public function test_admin_can_create_new_voucher(): void
    {
        $admin = User::where('role', 'admin')->first();
        if (!$admin) {
            $this->markTestSkipped('Chưa có user admin');
        }

        $code = 'TESTSALE' . rand(100, 999);

        $response = $this->actingAs($admin)->postJson('/api/v1/admin/vouchers', [
            'code' => $code,
            'name' => 'Mã giảm giá kiểm thử',
            'discount_type' => 'fixed',
            'discount_value' => 25000,
            'min_order_value' => 100000,
            'usage_limit' => 50,
            'starts_at' => now()->toDateString(),
            'ends_at' => now()->addDays(30)->toDateString(),
            'status' => 'active',
        ]);

        $response->assertStatus(201)
            ->assertJson(['success' => true]);

        $this->assertDatabaseHas('vouchers', ['code' => $code]);
    }
}
