<?php

namespace Tests\Feature;

use App\Models\PointTransaction;
use App\Models\ReferralCode;
use App\Models\ReferralReward;
use App\Models\SystemSetting;
use App\Models\User;
use App\Models\UserPoint;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReferralControllerTest extends TestCase
{
    use DatabaseTransactions;

    public function test_user_gets_one_stable_referral_code_across_repeated_requests(): void
    {
        $user = $this->createUser();
        Sanctum::actingAs($user);

        $firstResponse = $this->getJson('/api/v1/referral/my-code');
        $secondResponse = $this->getJson('/api/v1/referral/my-code');

        $firstResponse->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.total_referrals', 0)
            ->assertJsonPath('data.total_rewards', 0)
            ->assertJsonPath('data.has_claimed_referral', false)
            ->assertJsonCount(0, 'data.recent_rewards');
        $secondResponse->assertOk()
            ->assertJsonPath('data.code', $firstResponse->json('data.code'));
        $this->assertMatchesRegularExpression('/^SZ[A-HJ-NP-Z2-9]{8}$/', $firstResponse->json('data.code'));
        $this->assertSame(1, ReferralCode::query()->where('user_id', $user->id)->count());
    }

    public function test_user_cannot_claim_own_referral_code(): void
    {
        $user = $this->createUser();
        $code = $this->createReferralCode($user, 'SELFTEST');
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v1/referral/claim', ['code' => $code->code]);

        $response->assertUnprocessable()
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Bạn không thể sử dụng mã giới thiệu của chính mình.');
        $this->assertSame(0, ReferralReward::query()->where('referred_id', $user->id)->count());
    }

    public function test_invalid_referral_code_is_rejected(): void
    {
        $user = $this->createUser();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v1/referral/claim', ['code' => 'KHONGTONTAI']);

        $response->assertNotFound()
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Mã giới thiệu không tồn tại hoặc đã ngừng hoạt động.');
        $this->assertSame(0, ReferralReward::query()->where('referred_id', $user->id)->count());
    }

    public function test_claim_requires_a_referral_code(): void
    {
        Sanctum::actingAs($this->createUser());

        $response = $this->postJson('/api/v1/referral/claim', []);

        $response->assertUnprocessable()
            ->assertJsonPath('success', false)
            ->assertJsonPath('errors.code.0', 'Vui lòng nhập mã giới thiệu.');
    }

    public function test_user_can_claim_valid_code_and_creates_one_pending_points_reward(): void
    {
        $this->configureRewardPoints(50, 30);
        $referrer = $this->createUser();
        $referred = $this->createUser();
        $code = $this->createReferralCode($referrer, 'VALIDCODE');
        UserPoint::create([
            'user_id' => $referrer->id,
            'total_points' => 0,
            'lifetime_points' => 0,
            'tier' => 'bronze',
        ]);
        UserPoint::create([
            'user_id' => $referred->id,
            'total_points' => 0,
            'lifetime_points' => 0,
            'tier' => 'bronze',
        ]);
        $pointTransactionCount = PointTransaction::query()->count();
        Sanctum::actingAs($referred);

        $response = $this->postJson('/api/v1/referral/claim', ['code' => ' validcode ']);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.claim.code', 'VALIDCODE')
            ->assertJsonPath('data.claim.referrer.id', $referrer->id)
            ->assertJsonPath('data.claim.reward_type', 'points')
            ->assertJsonPath('data.claim.reward_value', 30)
            ->assertJsonPath('data.claim.status', 'pending')
            ->assertJsonPath('data.total_referrals', 1);
        $this->assertDatabaseHas('referral_rewards', [
            'referrer_id' => $referrer->id,
            'referred_id' => $referred->id,
            'referral_code_id' => $code->id,
            'reward_type' => 'points',
            'referrer_reward_value' => 50,
            'referred_reward_value' => 30,
            'status' => 'pending',
        ]);
        $this->assertSame(1, $code->fresh()->total_referrals);
        $this->assertSame(0, $code->fresh()->total_rewards);
        $this->assertSame(0, $referrer->points()->firstOrFail()->total_points);
        $this->assertSame(0, $referred->points()->firstOrFail()->total_points);
        $this->assertSame($pointTransactionCount, PointTransaction::query()->count());
    }

    public function test_user_cannot_claim_a_second_code_and_no_duplicate_reward_is_created(): void
    {
        $firstReferrer = $this->createUser();
        $secondReferrer = $this->createUser();
        $referred = $this->createUser();
        $firstCode = $this->createReferralCode($firstReferrer, 'FIRSTCODE');
        $secondCode = $this->createReferralCode($secondReferrer, 'SECONDCODE');
        Sanctum::actingAs($referred);

        $this->postJson('/api/v1/referral/claim', ['code' => $firstCode->code])->assertOk();
        $secondResponse = $this->postJson('/api/v1/referral/claim', ['code' => $secondCode->code]);

        $secondResponse->assertStatus(409)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Bạn đã sử dụng mã giới thiệu trước đó.');
        $this->assertSame(1, ReferralReward::query()->where('referred_id', $referred->id)->count());
        $this->assertSame(1, $firstCode->fresh()->total_referrals);
        $this->assertSame(0, $secondCode->fresh()->total_referrals);
    }

    public function test_referral_history_is_isolated_between_referrers(): void
    {
        $referrerA = $this->createUser();
        $referrerB = $this->createUser();
        $referredA = $this->createUser();
        $referredB = $this->createUser();
        $codeA = $this->createReferralCode($referrerA, 'HISTORYA');
        $codeB = $this->createReferralCode($referrerB, 'HISTORYB');

        Sanctum::actingAs($referredA);
        $this->postJson('/api/v1/referral/claim', ['code' => $codeA->code])->assertOk();
        Sanctum::actingAs($referredB);
        $this->postJson('/api/v1/referral/claim', ['code' => $codeB->code])->assertOk();
        Sanctum::actingAs($referrerA);

        $response = $this->getJson('/api/v1/referral/my-code');

        $response->assertOk()
            ->assertJsonCount(1, 'data.recent_rewards')
            ->assertJsonPath('data.recent_rewards.0.referred_user.id', $referredA->id)
            ->assertJsonMissing(['id' => $referredB->id, 'full_name' => $referredB->full_name]);
    }

    private function createUser(): User
    {
        $identifier = Str::lower(Str::random(12));

        return User::create([
            'full_name' => "Referral {$identifier}",
            'email' => "referral-{$identifier}@sportzone.local",
            'phone' => "R{$identifier}",
            'password_hash' => Hash::make('password'),
            'role' => 'customer',
            'status' => 'active',
        ]);
    }

    private function createReferralCode(User $user, string $code): ReferralCode
    {
        return ReferralCode::create([
            'user_id' => $user->id,
            'code' => $code,
            'total_referrals' => 0,
            'total_rewards' => 0,
            'is_active' => true,
        ]);
    }

    private function configureRewardPoints(int $referrerPoints, int $referredPoints): void
    {
        SystemSetting::updateOrCreate(
            ['setting_key' => 'referral_referrer_points'],
            ['setting_value' => (string) $referrerPoints, 'description' => 'Referral test setting']
        );
        SystemSetting::updateOrCreate(
            ['setting_key' => 'referral_referred_points'],
            ['setting_value' => (string) $referredPoints, 'description' => 'Referral test setting']
        );
    }
}
