<?php

namespace Tests\Feature;

use App\Models\User;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialUser;
use Tests\TestCase;

class GoogleLoginTest extends TestCase
{
    public function test_google_registration_accepts_missing_phone_and_creates_a_login_token(): void
    {
        $social = (new SocialUser)->setRaw(['email_verified' => true])->map(['id' => 'google-123', 'name' => 'Google Customer', 'email' => 'google@example.test', 'avatar' => null]);
        $social->token = 'google-access';
        $social->expiresIn = 3600;
        Socialite::shouldReceive('driver->stateless->user')->once()->andReturn($social);

        $response = $this->get('/api/v1/auth/google/callback');

        $response->assertRedirect();
        $this->assertStringContainsString('/auth/callback/google?token=', $response->headers->get('Location'));
        $this->assertDatabaseHas('users', ['email' => 'google@example.test', 'phone' => null, 'password_hash' => null]);
        $this->assertDatabaseHas('social_accounts', ['provider' => 'google', 'provider_id' => 'google-123']);
        $this->assertDatabaseCount('personal_access_tokens', 1);
        $this->assertDatabaseCount('user_points', 1);
        $this->assertDatabaseCount('referral_codes', 1);
    }

    public function test_google_does_not_issue_a_token_for_a_blocked_account(): void
    {
        User::create(['full_name' => 'Blocked', 'email' => 'blocked@example.test', 'phone' => null, 'role' => 'customer', 'status' => 'blocked']);
        $social = (new SocialUser)->map(['id' => 'google-blocked', 'name' => 'Blocked', 'email' => 'blocked@example.test']);
        $social->token = 'google-access';
        Socialite::shouldReceive('driver->stateless->user')->once()->andReturn($social);

        $response = $this->get('/api/v1/auth/google/callback');

        $response->assertRedirect();
        $this->assertStringContainsString('/auth/login?error=', $response->headers->get('Location'));
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_oauth_failure_does_not_expose_sql_or_credentials_in_redirect(): void
    {
        Socialite::shouldReceive('driver->stateless->user')->once()->andThrow(new \RuntimeException('SQLSTATE secret database connection'));

        $response = $this->get('/api/v1/auth/google/callback');

        $response->assertRedirect();
        $this->assertStringNotContainsString('SQLSTATE', $response->headers->get('Location'));
        $this->assertStringNotContainsString('secret', $response->headers->get('Location'));
        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }
}
