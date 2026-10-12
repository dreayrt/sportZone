<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\PointTransaction;
use App\Models\SystemSetting;
use App\Models\User;
use App\Models\UserPoint;
use DomainException;
use Illuminate\Support\Facades\DB;

class LoyaltyService
{
    private const MONEY_PER_POINT_BLOCK = 10000;

    private const DEFAULT_POINTS_PER_BLOCK = 1;

    /** @var array<string, int> */
    private const DEFAULT_TIER_THRESHOLDS = [
        'bronze' => 0,
        'silver' => 500,
        'gold' => 2000,
        'platinum' => 5000,
    ];

    public function getOrCreateAccount(User $user): UserPoint
    {
        return DB::transaction(function () use ($user): UserPoint {
            $lockedUser = User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();

            return $this->getOrCreateLockedAccount($lockedUser);
        }, 3);
    }

    public function addPointsForBooking(Booking $booking): ?PointTransaction
    {
        return DB::transaction(function () use ($booking): ?PointTransaction {
            $lockedBooking = Booking::query()->whereKey($booking->id)->lockForUpdate()->firstOrFail();

            if ($lockedBooking->user_id === null) {
                return null;
            }

            $user = User::query()->whereKey($lockedBooking->user_id)->lockForUpdate()->first();

            if (! $user) {
                return null;
            }

            $existingTransaction = PointTransaction::query()
                ->where('user_id', $user->id)
                ->where('type', 'earn')
                ->where('source', 'booking')
                ->where('reference_id', $lockedBooking->id)
                ->first();

            if ($existingTransaction) {
                return $existingTransaction;
            }

            if ($lockedBooking->status !== 'completed' || $lockedBooking->payment_status !== 'paid') {
                return null;
            }

            $paidAmount = (int) $lockedBooking->payments()
                ->where('status', 'paid')
                ->whereNotNull('paid_at')
                ->sum('amount');

            if ($paidAmount < (int) $lockedBooking->total_price) {
                return null;
            }

            $points = intdiv((int) $lockedBooking->total_price, self::MONEY_PER_POINT_BLOCK)
                * $this->pointsPerBlock();

            if ($points <= 0) {
                return null;
            }

            return $this->addPointsLocked(
                $user,
                $points,
                "Tích điểm từ đơn đặt sân {$lockedBooking->booking_code}",
                'booking',
                (int) $lockedBooking->id,
            );
        }, 3);
    }

    public function addPoints(
        User $user,
        int $points,
        string $reason,
        ?string $referenceType = null,
        ?int $referenceId = null,
    ): PointTransaction {
        if ($points <= 0) {
            throw new DomainException('Số điểm cộng phải lớn hơn 0.');
        }

        return DB::transaction(function () use ($user, $points, $reason, $referenceType, $referenceId): PointTransaction {
            $lockedUser = User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();

            return $this->addPointsLocked($lockedUser, $points, $reason, $referenceType, $referenceId);
        }, 3);
    }

    public function redeemPoints(
        User $user,
        int $points,
        string $reason,
        ?string $referenceType = null,
        ?int $referenceId = null,
    ): PointTransaction {
        if ($points <= 0) {
            throw new DomainException('Số điểm đổi thưởng phải lớn hơn 0.');
        }

        return DB::transaction(function () use ($user, $points, $reason, $referenceType, $referenceId): PointTransaction {
            $lockedUser = User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();
            $source = $this->normalizeSource($referenceType, 'redemption');

            if ($referenceId !== null) {
                $existingTransaction = PointTransaction::query()
                    ->where('user_id', $lockedUser->id)
                    ->where('type', 'redeem')
                    ->where('source', $source)
                    ->where('reference_id', $referenceId)
                    ->first();

                if ($existingTransaction) {
                    return $existingTransaction;
                }
            }

            $account = $this->getOrCreateLockedAccount($lockedUser);

            if ((int) $account->total_points < $points) {
                throw new DomainException('Số điểm hiện tại không đủ để đổi thưởng.');
            }

            $account->total_points = (int) $account->total_points - $points;
            $account->save();

            return PointTransaction::create([
                'user_id' => $lockedUser->id,
                'type' => 'redeem',
                'points' => -$points,
                'balance_after' => (int) $account->total_points,
                'source' => $source,
                'reference_id' => $referenceId,
                'description' => $this->normalizeDescription($reason),
            ]);
        }, 3);
    }

    public function recalculateTier(UserPoint $account): UserPoint
    {
        return DB::transaction(function () use ($account): UserPoint {
            $lockedAccount = UserPoint::query()
                ->whereKey($account->id)
                ->lockForUpdate()
                ->firstOrFail();

            return $this->recalculateTierLocked($lockedAccount);
        }, 3);
    }

    private function recalculateTierLocked(UserPoint $account): UserPoint
    {
        $tier = $this->tierForLifetimePoints((int) $account->lifetime_points);

        if ($account->tier !== $tier) {
            $account->tier = $tier;
            $account->tier_updated_at = now();
            $account->save();
        }

        return $account;
    }

    /** @return array<string, mixed> */
    public function summary(User $user): array
    {
        $account = $this->recalculateTier($this->getOrCreateAccount($user));
        $thresholds = $this->tierThresholds();
        $currentTier = $account->tier;
        $nextTier = match ($currentTier) {
            'bronze' => 'silver',
            'silver' => 'gold',
            'gold' => 'platinum',
            default => null,
        };

        $currentThreshold = $thresholds[$currentTier];
        $nextThreshold = $nextTier ? $thresholds[$nextTier] : $currentThreshold;
        $pointsToNextTier = $nextTier
            ? max(0, $nextThreshold - (int) $account->lifetime_points)
            : 0;
        $progressPercent = $nextTier
            ? (int) min(100, max(0, floor(
                (((int) $account->lifetime_points - $currentThreshold)
                    / max(1, $nextThreshold - $currentThreshold)) * 100
            )))
            : 100;

        return [
            'current_points' => (int) $account->total_points,
            'lifetime_points' => (int) $account->lifetime_points,
            'current_tier' => $currentTier,
            'next_tier' => $nextTier,
            'points_to_next_tier' => $pointsToNextTier,
            'progress_percent' => $progressPercent,
            'tier_thresholds' => $thresholds,
            'earning_rule' => [
                'amount_vnd' => self::MONEY_PER_POINT_BLOCK,
                'points' => $this->pointsPerBlock(),
            ],
        ];
    }

    /** @return array<string, int> */
    public function tierThresholds(): array
    {
        $settings = SystemSetting::query()
            ->whereIn('setting_key', [
                'loyalty_silver_threshold',
                'loyalty_gold_threshold',
                'loyalty_platinum_threshold',
            ])
            ->pluck('setting_value', 'setting_key');

        $silver = max(1, (int) ($settings['loyalty_silver_threshold'] ?? self::DEFAULT_TIER_THRESHOLDS['silver']));
        $gold = max($silver + 1, (int) ($settings['loyalty_gold_threshold'] ?? self::DEFAULT_TIER_THRESHOLDS['gold']));
        $platinum = max($gold + 1, (int) ($settings['loyalty_platinum_threshold'] ?? self::DEFAULT_TIER_THRESHOLDS['platinum']));

        return [
            'bronze' => self::DEFAULT_TIER_THRESHOLDS['bronze'],
            'silver' => $silver,
            'gold' => $gold,
            'platinum' => $platinum,
        ];
    }

    private function addPointsLocked(
        User $user,
        int $points,
        string $reason,
        ?string $referenceType,
        ?int $referenceId,
    ): PointTransaction {
        if ($points <= 0) {
            throw new DomainException('Số điểm cộng phải lớn hơn 0.');
        }

        $source = $this->normalizeSource($referenceType, 'manual');

        if ($referenceId !== null) {
            $existingTransaction = PointTransaction::query()
                ->where('user_id', $user->id)
                ->where('type', 'earn')
                ->where('source', $source)
                ->where('reference_id', $referenceId)
                ->first();

            if ($existingTransaction) {
                return $existingTransaction;
            }
        }

        $account = $this->getOrCreateLockedAccount($user);
        $account->total_points = (int) $account->total_points + $points;
        $account->lifetime_points = (int) $account->lifetime_points + $points;
        $this->recalculateTierLocked($account);
        $account->save();

        return PointTransaction::create([
            'user_id' => $user->id,
            'type' => 'earn',
            'points' => $points,
            'balance_after' => (int) $account->total_points,
            'source' => $source,
            'reference_id' => $referenceId,
            'description' => $this->normalizeDescription($reason),
        ]);
    }

    private function getOrCreateLockedAccount(User $user): UserPoint
    {
        $account = UserPoint::query()->where('user_id', $user->id)->lockForUpdate()->first();

        if ($account) {
            return $account;
        }

        UserPoint::query()->insertOrIgnore([
            'user_id' => $user->id,
            'total_points' => 0,
            'lifetime_points' => 0,
            'tier' => 'bronze',
            'updated_at' => now(),
        ]);

        return UserPoint::query()
            ->where('user_id', $user->id)
            ->lockForUpdate()
            ->firstOrFail();
    }

    private function tierForLifetimePoints(int $lifetimePoints): string
    {
        $thresholds = $this->tierThresholds();

        return match (true) {
            $lifetimePoints >= $thresholds['platinum'] => 'platinum',
            $lifetimePoints >= $thresholds['gold'] => 'gold',
            $lifetimePoints >= $thresholds['silver'] => 'silver',
            default => 'bronze',
        };
    }

    private function pointsPerBlock(): int
    {
        return max(0, (int) SystemSetting::getVal(
            'loyalty_points_per_10k',
            (string) self::DEFAULT_POINTS_PER_BLOCK,
        ));
    }

    private function normalizeSource(?string $source, string $default): string
    {
        $normalized = trim((string) $source);

        return mb_substr($normalized !== '' ? $normalized : $default, 0, 80);
    }

    private function normalizeDescription(string $description): string
    {
        return mb_substr(trim($description), 0, 255);
    }
}
