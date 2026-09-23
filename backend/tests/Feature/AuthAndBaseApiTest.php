<?php

namespace Tests\Feature;

use App\Models\User;
use Tests\TestCase;

class AuthAndBaseApiTest extends TestCase
{
    public function test_health_check_returns_ok(): void
    {
        $response = $this->getJson('/api/v1/health');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'status' => 'ok',
                    'database' => [
                        'status' => 'connected',
                    ],
                ],
            ]);
    }

    public function test_sport_categories_can_be_listed(): void
    {
        $response = $this->getJson('/api/v1/sport-categories');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    '*' => ['id', 'code', 'name', 'is_active', 'sort_order'],
                ],
            ]);
    }

    public function test_user_can_login_with_email(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'login' => 'admin@sportzone.local',
            'password' => 'password',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ])
            ->assertJsonStructure([
                'data' => [
                    'token',
                    'token_type',
                    'user' => ['id', 'full_name', 'email', 'role'],
                ],
            ]);
    }

    public function test_user_can_login_with_phone(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'login' => '0912345678',
            'password' => 'password',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);
    }

    public function test_user_can_get_profile_with_token(): void
    {
        $user = User::where('email', 'minhanh@example.com')->first();
        $token = $user->createToken('test_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/profile');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'email' => 'minhanh@example.com',
                ],
            ]);
    }

    public function test_customer_cannot_access_admin_routes(): void
    {
        $customer = User::where('role', 'customer')->first();
        $token = $customer->createToken('customer_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/admin/sport-categories', [
                'code' => 'table_tennis',
                'name' => 'Bóng bàn',
            ]);

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
            ]);
    }

    public function test_new_user_can_register(): void
    {
        $uniquePhone = '09' . mt_rand(10000000, 99999999);
        $uniqueEmail = 'test_' . uniqid() . '@sportzone.local';

        $response = $this->postJson('/api/v1/auth/register', [
            'full_name' => 'Test Register User',
            'email' => $uniqueEmail,
            'phone' => $uniquePhone,
            'password' => '123456',
            'role' => 'customer',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
            ])
            ->assertJsonStructure([
                'data' => [
                    'token',
                    'user' => [
                        'id',
                        'full_name',
                        'phone',
                        'points',
                        'referral_code',
                    ],
                ],
            ]);
    }
}
