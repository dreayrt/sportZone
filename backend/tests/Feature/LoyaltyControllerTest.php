<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Court;
use App\Models\Payment;
use App\Models\PointTransaction;
use App\Models\SportCategory;
use App\Models\SystemSetting;
use App\Models\User;
use App\Models\UserPoint;
use App\Models\Venue;
use App\Services\LoyaltyService;
use DomainException;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LoyaltyControllerTest extends TestCase
{
    use DatabaseTransactions;

    public function test_summary_requires_authentication(): void
    {
        $this->getJson('/api/v1/loyalty/summary')->assertUnauthorized();
    }

    public function test_user_only_sees_their_own_points_and_transactions(): void
    {
        $user = $this->createUser();
        $otherUser = $this->createUser();
        UserPoint::create([
            'user_id' => $user->id,
            'total_points' => 120,
            'lifetime_points' => 620,
            'tier' => 'silver',
        ]);
        UserPoint::create([
            'user_id' => $otherUser->id,
            'total_points' => 999,
            'lifetime_points' => 999,
            'tier' => 'silver',
        ]);
        $mine = $this->createPointTransaction($user, 120, 120, 'Phần thưởng của tôi');
        $theirs = $this->createPointTransaction($otherUser, 999, 999, 'Phần thưởng người khác');
        Sanctum::actingAs($user);

        $summary = $this->getJson('/api/v1/loyalty/summary');
        $history = $this->getJson('/api/v1/loyalty/history');

        $summary->assertOk()
            ->assertJsonPath('data.current_points', 120)
            ->assertJsonPath('data.lifetime_points', 620)
            ->assertJsonPath('data.current_tier', 'silver')
            ->assertJsonPath('data.next_tier', 'gold')
            ->assertJsonPath('data.points_to_next_tier', 1380)
            ->assertJsonPath('data.redemption.enabled', false);
        $history->assertOk()
            ->assertJsonCount(1, 'data.transactions')
            ->assertJsonPath('data.transactions.0.id', $mine->id)
            ->assertJsonMissing(['id' => $theirs->id]);
    }

    public function test_completed_and_fully_paid_booking_earns_configured_points_once(): void
    {
        SystemSetting::updateOrCreate(
            ['setting_key' => 'loyalty_points_per_10k'],
            ['setting_value' => '2', 'description' => 'Loyalty test setting']
        );
        $user = $this->createUser();
        $booking = $this->createPaidCompletedBooking($user, 125000);
        $service = app(LoyaltyService::class);

        $first = $service->addPointsForBooking($booking);
        $second = $service->addPointsForBooking($booking);

        $this->assertNotNull($first);
        $this->assertNotNull($second);
        $this->assertSame($first->id, $second->id);
        $this->assertSame(24, $first->points);
        $this->assertSame(24, $user->points()->firstOrFail()->total_points);
        $this->assertSame(24, $user->points()->firstOrFail()->lifetime_points);
        $this->assertSame(1, PointTransaction::query()
            ->where('user_id', $user->id)
            ->where('source', 'booking')
            ->where('reference_id', $booking->id)
            ->count());
    }

    public function test_booking_without_eligible_payment_does_not_earn_points(): void
    {
        $user = $this->createUser();
        $booking = $this->createPaidCompletedBooking($user, 100000, 'pending');

        $transaction = app(LoyaltyService::class)->addPointsForBooking($booking);

        $this->assertNull($transaction);
        $this->assertSame(0, PointTransaction::query()->where('user_id', $user->id)->count());
        $this->assertNull($user->points()->first());
    }

    public function test_generic_referral_integration_is_idempotent_and_recalculates_tier(): void
    {
        $user = $this->createUser();
        UserPoint::create([
            'user_id' => $user->id,
            'total_points' => 480,
            'lifetime_points' => 480,
            'tier' => 'bronze',
        ]);
        $service = app(LoyaltyService::class);

        $first = $service->addPoints($user, 30, 'Thưởng giới thiệu', 'referral', 91);
        $second = $service->addPoints($user, 30, 'Thưởng giới thiệu', 'referral', 91);

        $account = $user->points()->firstOrFail();
        $this->assertSame($first->id, $second->id);
        $this->assertSame(510, $account->total_points);
        $this->assertSame(510, $account->lifetime_points);
        $this->assertSame('silver', $account->tier);
        $this->assertNotNull($account->tier_updated_at);
        $this->assertSame(1, PointTransaction::query()
            ->where('user_id', $user->id)
            ->where('source', 'referral')
            ->where('reference_id', 91)
            ->count());
    }

    public function test_redeem_decreases_current_points_but_not_lifetime_points_and_records_history(): void
    {
        $user = $this->createUser();
        UserPoint::create([
            'user_id' => $user->id,
            'total_points' => 150,
            'lifetime_points' => 600,
            'tier' => 'silver',
        ]);

        $transaction = app(LoyaltyService::class)->redeemPoints(
            $user,
            100,
            'Đổi phần thưởng thử nghiệm',
            'voucher_reward',
            42,
        );

        $account = $user->points()->firstOrFail();
        $this->assertSame(50, $account->total_points);
        $this->assertSame(600, $account->lifetime_points);
        $this->assertSame('redeem', $transaction->type);
        $this->assertSame(-100, $transaction->points);
        $this->assertSame(50, $transaction->balance_after);
        $this->assertDatabaseHas('point_transactions', [
            'id' => $transaction->id,
            'user_id' => $user->id,
            'source' => 'voucher_reward',
            'reference_id' => 42,
        ]);
    }

    public function test_redeem_with_insufficient_points_rolls_back_without_negative_balance_or_history(): void
    {
        $user = $this->createUser();
        UserPoint::create([
            'user_id' => $user->id,
            'total_points' => 50,
            'lifetime_points' => 150,
            'tier' => 'bronze',
        ]);

        try {
            app(LoyaltyService::class)->redeemPoints($user, 100, 'Không đủ điểm');
            $this->fail('Expected insufficient points to throw a domain exception.');
        } catch (DomainException $exception) {
            $this->assertSame('Số điểm hiện tại không đủ để đổi thưởng.', $exception->getMessage());
        }

        $this->assertSame(50, $user->points()->firstOrFail()->total_points);
        $this->assertSame(0, PointTransaction::query()->where('user_id', $user->id)->count());
    }

    public function test_redeem_api_does_not_deduct_points_while_user_voucher_ownership_is_unavailable(): void
    {
        $user = $this->createUser();
        UserPoint::create([
            'user_id' => $user->id,
            'total_points' => 500,
            'lifetime_points' => 500,
            'tier' => 'silver',
        ]);
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v1/loyalty/redeem', ['points' => 100]);

        $response->assertStatus(409)
            ->assertJsonPath('success', false)
            ->assertJsonPath('errors.redemption.enabled', false);
        $this->assertSame(500, $user->points()->firstOrFail()->total_points);
        $this->assertSame(0, PointTransaction::query()->where('user_id', $user->id)->count());
    }

    public function test_history_is_paginated_newest_first(): void
    {
        $user = $this->createUser();
        $older = $this->createPointTransaction($user, 10, 10, 'Cũ', now()->subDay());
        $newer = $this->createPointTransaction($user, 20, 30, 'Mới', now());
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v1/loyalty/history?per_page=1');

        $response->assertOk()
            ->assertJsonCount(1, 'data.transactions')
            ->assertJsonPath('data.transactions.0.id', $newer->id)
            ->assertJsonPath('data.pagination.total', 2)
            ->assertJsonPath('data.pagination.per_page', 1)
            ->assertJsonMissing(['id' => $older->id]);
    }

    private function createUser(): User
    {
        $identifier = Str::lower(Str::random(12));

        return User::create([
            'full_name' => "Loyalty {$identifier}",
            'email' => "loyalty-{$identifier}@sportzone.local",
            'phone' => 'L'.Str::upper(Str::random(14)),
            'password_hash' => Hash::make('password'),
            'role' => 'customer',
            'status' => 'active',
        ]);
    }

    private function createPaidCompletedBooking(User $user, int $totalPrice, string $paymentStatus = 'paid'): Booking
    {
        $identifier = Str::upper(Str::random(10));
        $owner = $this->createUser();
        $owner->role = 'owner';
        $owner->save();
        $sport = SportCategory::create([
            'code' => "LS{$identifier}",
            'name' => "Loyalty Sport {$identifier}",
            'is_active' => true,
            'sort_order' => 0,
        ]);
        $venue = Venue::create([
            'owner_id' => $owner->id,
            'code' => "LV{$identifier}",
            'name' => "Loyalty Venue {$identifier}",
            'slug' => 'loyalty-venue-'.Str::lower($identifier),
            'address' => '1 Test Street',
            'district' => 'Test District',
            'city' => 'Test City',
            'phone' => '0900000000',
            'status' => 'active',
        ]);
        $court = Court::create([
            'venue_id' => $venue->id,
            'sport_category_id' => $sport->id,
            'code' => "LC{$identifier}",
            'name' => "Loyalty Court {$identifier}",
            'surface_type' => 'Test',
            'hourly_rate_standard' => $totalPrice,
            'hourly_rate_peak' => $totalPrice,
            'status' => 'active',
        ]);
        $booking = Booking::create([
            'booking_code' => "LB{$identifier}",
            'user_id' => $user->id,
            'venue_id' => $venue->id,
            'court_id' => $court->id,
            'booking_date' => now()->toDateString(),
            'start_time' => '08:00:00',
            'end_time' => '09:00:00',
            'customer_name' => $user->full_name,
            'customer_phone' => $user->phone,
            'court_fee' => $totalPrice,
            'total_price' => $totalPrice,
            'status' => 'completed',
            'payment_status' => 'paid',
            'payment_method' => 'cash',
        ]);
        Payment::create([
            'booking_id' => $booking->id,
            'amount' => $totalPrice,
            'method' => 'cash',
            'status' => $paymentStatus,
            'paid_at' => $paymentStatus === 'paid' ? now() : null,
            'created_by' => $owner->id,
        ]);

        return $booking;
    }

    private function createPointTransaction(
        User $user,
        int $points,
        int $balanceAfter,
        string $description,
        mixed $createdAt = null,
    ): PointTransaction {
        return PointTransaction::create([
            'user_id' => $user->id,
            'type' => 'earn',
            'points' => $points,
            'balance_after' => $balanceAfter,
            'source' => 'test',
            'description' => $description,
            'created_at' => $createdAt ?? now(),
        ]);
    }
}
