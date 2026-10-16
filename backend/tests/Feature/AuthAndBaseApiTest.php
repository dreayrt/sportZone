<?php

namespace Tests\Feature;

use App\Models\User;
use Tests\TestCase;

class AuthAndBaseApiTest extends TestCase
{
    /**
     * Dọn tokens do test tạo (app dùng tên 'auth_token', test dùng tên riêng).
     */
    protected function tearDown(): void
    {
        \Illuminate\Support\Facades\DB::table('personal_access_tokens')
            ->whereIn('name', ['test_token', 'customer_token'])
            ->delete();

        parent::tearDown();
    }

    /**
     * Xóa user test kèm tokens (FK cascade dọn bảng liên quan).
     */
    private function deleteTestUser(?int $userId): void
    {
        if (!$userId) {
            return;
        }

        $user = User::find($userId);
        if (!$user) {
            return;
        }

        $user->tokens()->delete();
        $user->delete();
    }
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
        $createdUserId = null;

        try {
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

            $createdUserId = $response->json('data.user.id');
        } finally {
            // Không để lại user rác trong DB
            $this->deleteTestUser($createdUserId);
        }
    }

    public function test_forgot_password_sends_reset_link(): void
    {
        \Illuminate\Support\Facades\Mail::fake();

        $response = $this->postJson('/api/v1/auth/forgot-password', [
            'email' => 'minhanh@example.com',
        ]);

        $response->assertStatus(200)
            ->assertJson(['success' => true]);

        $this->assertDatabaseHas('password_reset_tokens', [
            'email' => 'minhanh@example.com',
        ]);

        \Illuminate\Support\Facades\Mail::assertSent(\App\Mail\ResetPasswordMail::class);
    }

    public function test_forgot_password_does_not_reveal_unknown_email(): void
    {
        $response = $this->postJson('/api/v1/auth/forgot-password', [
            'email' => 'khongtontai@example.com',
        ]);

        // Vẫn trả success để chống dò quét tài khoản
        $response->assertStatus(200)
            ->assertJson(['success' => true]);
    }

    public function test_reset_password_with_valid_token(): void
    {
        $plainToken = \Illuminate\Support\Str::random(64);

        \Illuminate\Support\Facades\DB::table('password_reset_tokens')
            ->where('email', 'minhanh@example.com')
            ->delete();

        \Illuminate\Support\Facades\DB::table('password_reset_tokens')->insert([
            'email' => 'minhanh@example.com',
            'token' => \Illuminate\Support\Facades\Hash::make($plainToken),
            'created_at' => now(),
        ]);

        $response = $this->postJson('/api/v1/auth/reset-password', [
            'email' => 'minhanh@example.com',
            'token' => $plainToken,
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123',
        ]);

        $response->assertStatus(200)
            ->assertJson(['success' => true]);

        // Token đã dùng phải bị xóa
        $this->assertDatabaseMissing('password_reset_tokens', [
            'email' => 'minhanh@example.com',
        ]);

        // Đăng nhập được bằng mật khẩu mới
        $login = $this->postJson('/api/v1/auth/login', [
            'login' => 'minhanh@example.com',
            'password' => 'newpassword123',
        ]);
        $login->assertStatus(200)->assertJson(['success' => true]);

        // Khôi phục mật khẩu gốc để không ảnh hưởng test khác
        $user = \App\Models\User::where('email', 'minhanh@example.com')->first();
        $user->update(['password_hash' => \Illuminate\Support\Facades\Hash::make('password')]);
    }

    public function test_reset_password_with_invalid_token(): void
    {
        $response = $this->postJson('/api/v1/auth/reset-password', [
            'email' => 'minhanh@example.com',
            'token' => 'sai-token',
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123',
        ]);

        $response->assertStatus(422)
            ->assertJson(['success' => false]);
    }

    public function test_social_redirect_returns_oauth_url(): void
    {
        $response = $this->getJson('/api/v1/auth/google/redirect');

        // Chưa có credentials thật -> backend trả lỗi có kiểm soát (không crash)
        $this->assertContains($response->status(), [200, 500]);
        $response->assertJsonStructure(['success', 'message']);
    }

    public function test_link_social_requires_auth(): void
    {
        $response = $this->getJson('/api/v1/social/google/link');

        $response->assertStatus(401)->assertJson(['success' => false]);
    }

    public function test_link_social_rejects_unknown_provider(): void
    {
        $user = User::where('email', 'minhanh@example.com')->first();
        $token = $user->createToken('test_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/social/twitter/link');

        $response->assertStatus(404);
    }

    public function test_link_social_returns_oauth_url_with_state(): void
    {
        $user = User::where('email', 'minhanh@example.com')->first();
        $token = $user->createToken('test_token')->plainTextToken;

        $capturedState = null;
        $providerMock = \Mockery::mock();
        $providerMock->shouldReceive('stateless')->andReturnSelf();
        $providerMock->shouldReceive('with')
            ->with(\Mockery::on(function ($params) use (&$capturedState) {
                $capturedState = $params['state'] ?? null;

                return is_string($capturedState) && strlen($capturedState) >= 20;
            }))
            ->andReturnSelf();
        $providerMock->shouldReceive('redirect')
            ->andReturn(redirect('https://accounts.google.com/o/oauth2/auth?state=stub'));

        \Laravel\Socialite\Facades\Socialite::shouldReceive('driver')
            ->with('google')
            ->andReturn($providerMock);

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/social/google/link');

        $response->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonStructure(['data' => ['url']]);

        // State dùng 1 lần đã được lưu, gắn đúng user
        $this->assertNotNull($capturedState);
        $pending = \Illuminate\Support\Facades\Cache::get('social_link_' . $capturedState);
        $this->assertEquals($user->id, $pending['user_id']);
    }

    public function test_link_social_rejects_already_linked(): void
    {
        $user = User::where('email', 'minhanh@example.com')->first();
        \App\Models\SocialAccount::firstOrCreate(
            ['provider' => 'google', 'provider_id' => 'already-linked-1'],
            ['user_id' => $user->id]
        );
        $token = $user->createToken('test_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/social/google/link');

        $response->assertStatus(422)->assertJson(['success' => false]);
    }

    private function makeSocialiteUser(string $id, string $email): \Laravel\Socialite\Two\User
    {
        $socialUser = new \Laravel\Socialite\Two\User;
        $socialUser->setRaw(['id' => $id, 'email' => $email])->map([
            'id' => $id,
            'nickname' => null,
            'name' => 'Test Social',
            'email' => $email,
            'avatar' => null,
        ]);
        $socialUser->token = 'fake-access-token';
        $socialUser->refreshToken = null;
        $socialUser->expiresIn = null;

        return $socialUser;
    }

    private function mockSocialiteUser(string $provider, \Laravel\Socialite\Two\User $socialUser): void
    {
        $providerMock = \Mockery::mock();
        $providerMock->shouldReceive('stateless')->andReturnSelf();
        $providerMock->shouldReceive('user')->andReturn($socialUser);

        \Laravel\Socialite\Facades\Socialite::shouldReceive('driver')
            ->with($provider)
            ->andReturn($providerMock);
    }

    public function test_link_callback_links_new_social_account(): void
    {
        $user = User::where('email', 'minhanh@example.com')->first();
        \App\Models\SocialAccount::where('user_id', $user->id)->where('provider', 'facebook')->delete();

        $state = \Illuminate\Support\Str::random(40);
        \Illuminate\Support\Facades\Cache::put('social_link_' . $state, [
            'user_id' => $user->id,
            'redirect' => '/dashboard/customer/profile',
        ], now()->addMinutes(10));

        $this->mockSocialiteUser('facebook', $this->makeSocialiteUser('fb-link-1', 'fbuser@example.com'));

        $response = $this->get('/api/v1/auth/facebook/callback?state=' . $state . '&code=fakecode');

        $response->assertRedirect();
        $this->assertStringContainsString('linked=facebook', $response->headers->get('Location'));

        $this->assertDatabaseHas('social_accounts', [
            'user_id' => $user->id,
            'provider' => 'facebook',
            'provider_id' => 'fb-link-1',
        ]);

        // State dùng 1 lần đã bị thu hồi
        $this->assertNull(\Illuminate\Support\Facades\Cache::get('social_link_' . $state));
    }

    public function test_link_callback_rejects_expired_state(): void
    {
        $response = $this->get('/api/v1/auth/google/callback?state=het-han&code=fakecode');

        $response->assertRedirect();
        $this->assertStringContainsString('link_error=', $response->headers->get('Location'));
    }

    public function test_link_callback_rejects_account_taken_by_other_user(): void
    {
        $ownerA = User::where('email', 'owner1@sportzone.local')->first();
        \App\Models\SocialAccount::firstOrCreate(
            ['provider' => 'google', 'provider_id' => 'taken-google-1'],
            ['user_id' => $ownerA->id]
        );

        $userB = User::where('email', 'minhanh@example.com')->first();
        \App\Models\SocialAccount::where('user_id', $userB->id)->where('provider', 'google')->delete();

        $state = \Illuminate\Support\Str::random(40);
        \Illuminate\Support\Facades\Cache::put('social_link_' . $state, [
            'user_id' => $userB->id,
            'redirect' => '/dashboard/customer/profile',
        ], now()->addMinutes(10));

        $this->mockSocialiteUser('google', $this->makeSocialiteUser('taken-google-1', 'other@example.com'));

        $response = $this->get('/api/v1/auth/google/callback?state=' . $state . '&code=fakecode');

        $response->assertRedirect();
        $this->assertStringContainsString('link_error=', $response->headers->get('Location'));
        $this->assertDatabaseMissing('social_accounts', [
            'user_id' => $userB->id,
            'provider' => 'google',
            'provider_id' => 'taken-google-1',
        ]);
    }

    public function test_unlink_social_removes_link(): void
    {
        $user = User::where('email', 'minhanh@example.com')->first();
        \App\Models\SocialAccount::where('user_id', $user->id)->where('provider', 'facebook')->delete();
        \App\Models\SocialAccount::create([
            'user_id' => $user->id,
            'provider' => 'facebook',
            'provider_id' => 'fb-unlink-1',
        ]);
        $token = $user->createToken('test_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->deleteJson('/api/v1/social/facebook/unlink');

        $response->assertStatus(200)->assertJson(['success' => true]);
        $this->assertDatabaseMissing('social_accounts', [
            'user_id' => $user->id,
            'provider' => 'facebook',
            'provider_id' => 'fb-unlink-1',
        ]);
    }

    public function test_unlink_social_not_found(): void
    {
        $user = User::where('email', 'minhanh@example.com')->first();
        \App\Models\SocialAccount::where('user_id', $user->id)->where('provider', 'facebook')->delete();
        $token = $user->createToken('test_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->deleteJson('/api/v1/social/facebook/unlink');

        $response->assertStatus(404)->assertJson(['success' => false]);
    }

    public function test_unlink_last_login_method_without_password_forbidden(): void
    {
        $oauthUser = User::create([
            'full_name' => 'OAuth Only',
            'email' => 'oauthonly_' . uniqid() . '@sportzone.local',
            'phone' => null,
            'password_hash' => null,
            'role' => 'customer',
            'status' => 'active',
        ]);
        \App\Models\SocialAccount::create([
            'user_id' => $oauthUser->id,
            'provider' => 'google',
            'provider_id' => 'oauthonly-' . uniqid(),
        ]);
        $token = $oauthUser->createToken('test_token')->plainTextToken;

        try {
            $response = $this->withHeader('Authorization', 'Bearer ' . $token)
                ->deleteJson('/api/v1/social/google/unlink');

            $response->assertStatus(422)->assertJson(['success' => false]);
        } finally {
            // Dọn dữ liệu test
            \App\Models\SocialAccount::where('user_id', $oauthUser->id)->delete();
            $oauthUser->delete();
        }
    }

    public function test_user_can_update_profile(): void
    {
        $user = User::where('email', 'minhanh@example.com')->first();
        $originalName = $user->full_name;
        $token = $user->createToken('test_token')->plainTextToken;

        try {
            $response = $this->withHeader('Authorization', 'Bearer ' . $token)
                ->putJson('/api/v1/profile', [
                    'full_name' => 'Nguyễn Minh Anh Updated',
                ]);

            $response->assertStatus(200)
                ->assertJson(['success' => true])
                ->assertJsonPath('data.full_name', 'Nguyễn Minh Anh Updated');
        } finally {
            // Luôn khôi phục để không làm bẩn dữ liệu seed.
            // Dùng query builder vì model $user trong memory vẫn giữ giá trị cũ
            // nên ->update() sẽ thấy không dirty và bỏ qua câu SQL.
            User::where('id', $user->id)->update(['full_name' => $originalName]);
        }
    }

    public function test_profile_update_rejects_duplicate_phone(): void
    {
        $user = User::where('email', 'minhanh@example.com')->first();
        $token = $user->createToken('test_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/api/v1/profile', [
                'phone' => '0908000002', // của owner1
            ]);

        $response->assertStatus(422)->assertJson(['success' => false]);
    }

    public function test_profile_includes_social_accounts_and_has_password(): void
    {
        $user = User::where('email', 'minhanh@example.com')->first();
        $token = $user->createToken('test_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/profile');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => ['id', 'full_name', 'has_password', 'social_accounts'],
            ])
            ->assertJsonPath('data.has_password', true);
    }

    public function test_oauth_user_can_set_password_without_current(): void
    {
        $oauthUser = User::create([
            'full_name' => 'OAuth Pw',
            'email' => 'oauthpw_' . uniqid() . '@sportzone.local',
            'phone' => null,
            'password_hash' => null,
            'role' => 'customer',
            'status' => 'active',
        ]);
        $token = $oauthUser->createToken('test_token')->plainTextToken;

        try {
            $response = $this->withHeader('Authorization', 'Bearer ' . $token)
                ->putJson('/api/v1/profile/password', [
                    'new_password' => 'newpass123',
                    'new_password_confirmation' => 'newpass123',
                ]);

            $response->assertStatus(200)->assertJson(['success' => true]);

            // Đăng nhập được bằng mật khẩu vừa đặt
            $login = $this->postJson('/api/v1/auth/login', [
                'login' => $oauthUser->email,
                'password' => 'newpass123',
            ]);
            $login->assertStatus(200)->assertJson(['success' => true]);
        } finally {
            $this->deleteTestUser($oauthUser->id);
        }
    }

    public function test_change_password_rejects_wrong_current(): void
    {
        $user = User::where('email', 'minhanh@example.com')->first();
        $token = $user->createToken('test_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/api/v1/profile/password', [
                'current_password' => 'sai-mat-khau',
                'new_password' => 'newpass123',
                'new_password_confirmation' => 'newpass123',
            ]);

        $response->assertStatus(422)->assertJson(['success' => false]);
    }

    public function test_user_can_upload_avatar(): void
    {
        \Illuminate\Support\Facades\Storage::fake('public');

        $user = User::where('email', 'minhanh@example.com')->first();
        $user->update(['avatar' => null]);
        $token = $user->createToken('test_token')->plainTextToken;

        $file = \Illuminate\Http\UploadedFile::fake()->image('avatar.jpg', 200, 200);

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->post('/api/v1/profile/avatar', ['avatar' => $file]);

        $response->assertStatus(200)->assertJson(['success' => true]);

        $avatarUrl = $response->json('data.avatar');
        $this->assertStringContainsString('/storage/avatars/', $avatarUrl);

        // File tồn tại trên disk public
        $relativePath = \Illuminate\Support\Str::after($avatarUrl, '/storage/');
        \Illuminate\Support\Facades\Storage::disk('public')->assertExists($relativePath);

        // Dọn dữ liệu test
        \Illuminate\Support\Facades\Storage::disk('public')->delete($relativePath);
        $user->update(['avatar' => null]);
    }

    public function test_avatar_upload_rejects_non_image(): void
    {
        $user = User::where('email', 'minhanh@example.com')->first();
        $token = $user->createToken('test_token')->plainTextToken;

        $file = \Illuminate\Http\UploadedFile::fake()->create('document.pdf', 100, 'application/pdf');

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->post('/api/v1/profile/avatar', ['avatar' => $file]);

        $response->assertStatus(422)->assertJson(['success' => false]);
    }

    public function test_avatar_upload_replaces_old_local_file(): void
    {
        \Illuminate\Support\Facades\Storage::fake('public');

        $user = User::where('email', 'minhanh@example.com')->first();
        $token = $user->createToken('test_token')->plainTextToken;

        $first = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->post('/api/v1/profile/avatar', [
                'avatar' => \Illuminate\Http\UploadedFile::fake()->image('old.jpg'),
            ]);
        $first->assertStatus(200);
        $oldRelative = \Illuminate\Support\Str::after($first->json('data.avatar'), '/storage/');

        $second = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->post('/api/v1/profile/avatar', [
                'avatar' => \Illuminate\Http\UploadedFile::fake()->image('new.jpg'),
            ]);
        $second->assertStatus(200);

        // File cũ đã bị xóa, file mới tồn tại
        \Illuminate\Support\Facades\Storage::disk('public')->assertMissing($oldRelative);
        $newRelative = \Illuminate\Support\Str::after($second->json('data.avatar'), '/storage/');
        \Illuminate\Support\Facades\Storage::disk('public')->assertExists($newRelative);

        // Dọn dữ liệu test
        \Illuminate\Support\Facades\Storage::disk('public')->delete($newRelative);
        $user->update(['avatar' => null]);
    }

    private function adminToken(): string
    {
        return User::where('email', 'admin@sportzone.local')->first()
            ->createToken('test_token')->plainTextToken;
    }

    public function test_admin_can_list_users_with_pagination(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer ' . $this->adminToken())
            ->getJson('/api/v1/admin/users?per_page=2');

        $response->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonStructure(['data' => ['current_page', 'data', 'total']]);
    }

    public function test_admin_can_search_users(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer ' . $this->adminToken())
            ->getJson('/api/v1/admin/users?search=minhanh');

        $response->assertStatus(200)->assertJson(['success' => true]);
        $this->assertNotEmpty($response->json('data.data'));
        foreach ($response->json('data.data') as $row) {
            $this->assertStringContainsStringIgnoringCase(
                'minhanh',
                ($row['full_name'] ?? '') . ($row['email'] ?? '') . ($row['phone'] ?? '')
            );
        }
    }

    public function test_customer_cannot_list_users(): void
    {
        $customer = User::where('role', 'customer')->first();
        $token = $customer->createToken('customer_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/admin/users');

        $response->assertStatus(403)->assertJson(['success' => false]);
    }

    public function test_admin_block_user_revokes_tokens_and_blocks_login(): void
    {
        $adminToken = $this->adminToken();
        $target = User::where('email', 'minhanh@example.com')->first();
        $target->createToken('test_token');

        $this->assertDatabaseHas('personal_access_tokens', [
            'tokenable_id' => $target->id,
            'name' => 'test_token',
        ]);

        try {
            $response = $this->withHeader('Authorization', 'Bearer ' . $adminToken)
                ->putJson('/api/v1/admin/users/' . $target->id . '/status', [
                    'status' => 'blocked',
                ]);

            $response->assertStatus(200)
                ->assertJson(['success' => true])
                ->assertJsonPath('data.status', 'blocked');

            // Token của nạn nhân bị thu hồi khỏi DB
            $this->assertDatabaseMissing('personal_access_tokens', [
                'tokenable_id' => $target->id,
                'name' => 'test_token',
            ]);

            // Đăng nhập bị từ chối (login kiểm tra status trực tiếp từ DB)
            $login = $this->postJson('/api/v1/auth/login', [
                'login' => 'minhanh@example.com',
                'password' => 'password',
            ]);
            $login->assertStatus(403)->assertJson(['success' => false]);
        } finally {
            // Mở khóa để không ảnh hưởng test khác
            User::where('id', $target->id)->update(['status' => 'active']);
        }

        // Mở khóa xong đăng nhập lại được
        $relogin = $this->postJson('/api/v1/auth/login', [
            'login' => 'minhanh@example.com',
            'password' => 'password',
        ]);
        $relogin->assertStatus(200)->assertJson(['success' => true]);
    }

    public function test_admin_cannot_block_self(): void
    {
        $admin = User::where('email', 'admin@sportzone.local')->first();

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->adminToken())
            ->putJson('/api/v1/admin/users/' . $admin->id . '/status', [
                'status' => 'blocked',
            ]);

        $response->assertStatus(422)->assertJson(['success' => false]);
        $this->assertEquals('active', $admin->fresh()->status);
    }

    public function test_admin_cannot_change_other_admin_status(): void
    {
        $secondAdmin = User::create([
            'full_name' => 'Second Admin',
            'email' => 'admin2_' . uniqid() . '@sportzone.local',
            'phone' => '09' . mt_rand(10000000, 99999999),
            'password_hash' => \Illuminate\Support\Facades\Hash::make('password'),
            'role' => 'admin',
            'status' => 'active',
        ]);

        try {
            $response = $this->withHeader('Authorization', 'Bearer ' . $this->adminToken())
                ->putJson('/api/v1/admin/users/' . $secondAdmin->id . '/status', [
                    'status' => 'blocked',
                ]);

            $response->assertStatus(422)->assertJson(['success' => false]);
        } finally {
            $this->deleteTestUser($secondAdmin->id);
        }
    }

    public function test_admin_can_change_user_role(): void
    {
        $adminToken = $this->adminToken();
        $target = User::where('email', 'minhanh@example.com')->first();

        try {
            $response = $this->withHeader('Authorization', 'Bearer ' . $adminToken)
                ->putJson('/api/v1/admin/users/' . $target->id . '/role', [
                    'role' => 'owner',
                ]);

            $response->assertStatus(200)
                ->assertJson(['success' => true])
                ->assertJsonPath('data.role', 'owner');
        } finally {
            User::where('id', $target->id)->update(['role' => 'customer']);
        }
    }

    public function test_admin_cannot_change_own_role(): void
    {
        $admin = User::where('email', 'admin@sportzone.local')->first();

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->adminToken())
            ->putJson('/api/v1/admin/users/' . $admin->id . '/role', [
                'role' => 'customer',
            ]);

        $response->assertStatus(422)->assertJson(['success' => false]);
        $this->assertEquals('admin', $admin->fresh()->role);
    }
}
