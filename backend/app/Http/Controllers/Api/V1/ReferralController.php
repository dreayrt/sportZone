<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseController;
use App\Http\Requests\Referral\ClaimReferralRequest;
use App\Models\ReferralCode;
use App\Models\ReferralReward;
use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use Throwable;

class ReferralController extends BaseController
{
    private const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    private const MAX_CODE_GENERATION_ATTEMPTS = 10;

    public function myCode(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $referralCode = $this->getOrCreateReferralCode((int) $user->id);

            return $this->successResponse(
                $this->buildReferralData($user, $referralCode),
                'Lấy thông tin giới thiệu thành công.'
            );
        } catch (Throwable $exception) {
            report($exception);

            return $this->errorResponse('Không thể tải thông tin giới thiệu.', 500);
        }
    }

    public function claim(ClaimReferralRequest $request): JsonResponse
    {
        try {
            $outcome = DB::transaction(function () use ($request): array {
                $referredUser = User::query()
                    ->whereKey($request->user()->id)
                    ->lockForUpdate()
                    ->firstOrFail();

                $referralCode = ReferralCode::query()
                    ->where('code', $request->validated('code'))
                    ->where('is_active', true)
                    ->lockForUpdate()
                    ->first();

                if (! $referralCode) {
                    return [
                        'success' => false,
                        'message' => 'Mã giới thiệu không tồn tại hoặc đã ngừng hoạt động.',
                        'status' => 404,
                    ];
                }

                if ((int) $referralCode->user_id === (int) $referredUser->id) {
                    return [
                        'success' => false,
                        'message' => 'Bạn không thể sử dụng mã giới thiệu của chính mình.',
                        'status' => 422,
                    ];
                }

                $existingReward = ReferralReward::query()
                    ->where('referred_id', $referredUser->id)
                    ->first();

                if ($existingReward) {
                    return [
                        'success' => false,
                        'message' => 'Bạn đã sử dụng mã giới thiệu trước đó.',
                        'status' => 409,
                    ];
                }

                $reward = ReferralReward::create([
                    'referrer_id' => $referralCode->user_id,
                    'referred_id' => $referredUser->id,
                    'referral_code_id' => $referralCode->id,
                    'reward_type' => 'points',
                    'referrer_reward_value' => $this->referrerRewardPoints(),
                    'referred_reward_value' => $this->referredRewardPoints(),
                    'status' => 'pending',
                ]);

                $referralCode->increment('total_referrals');

                return [
                    'success' => true,
                    'reward' => $reward,
                    'referral_code' => $referralCode,
                ];
            }, 3);

            if (! $outcome['success']) {
                return $this->errorResponse($outcome['message'], $outcome['status']);
            }

            /** @var ReferralReward $reward */
            $reward = $outcome['reward'];
            /** @var ReferralCode $referralCode */
            $referralCode = $outcome['referral_code'];
            $reward->load(['referrer:id,full_name', 'referralCode:id,code']);

            return $this->successResponse([
                'claim' => $this->formatClaimedReferral($reward),
                'total_referrals' => (int) $referralCode->fresh()->total_referrals,
            ], 'Ghi nhận mã giới thiệu thành công. Phần thưởng đang chờ điều kiện hoàn tất chương trình.');
        } catch (Throwable $exception) {
            report($exception);

            return $this->errorResponse('Không thể ghi nhận mã giới thiệu.', 500);
        }
    }

    private function getOrCreateReferralCode(int $userId): ReferralCode
    {
        return DB::transaction(function () use ($userId): ReferralCode {
            User::query()->whereKey($userId)->lockForUpdate()->firstOrFail();

            $existingCode = ReferralCode::query()->where('user_id', $userId)->first();

            if ($existingCode) {
                return $existingCode;
            }

            for ($attempt = 0; $attempt < self::MAX_CODE_GENERATION_ATTEMPTS; $attempt++) {
                $code = $this->generateReadableCode();
                $inserted = DB::table('referral_codes')->insertOrIgnore([
                    'user_id' => $userId,
                    'code' => $code,
                    'total_referrals' => 0,
                    'total_rewards' => 0,
                    'is_active' => true,
                    'created_at' => now(),
                ]);

                if ($inserted === 1) {
                    return ReferralCode::query()->where('user_id', $userId)->firstOrFail();
                }

                $concurrentCode = ReferralCode::query()->where('user_id', $userId)->first();

                if ($concurrentCode) {
                    return $concurrentCode;
                }
            }

            throw new RuntimeException('Không thể sinh mã giới thiệu duy nhất.');
        }, 3);
    }

    private function generateReadableCode(): string
    {
        $suffix = '';
        $lastIndex = strlen(self::CODE_ALPHABET) - 1;

        for ($position = 0; $position < 8; $position++) {
            $suffix .= self::CODE_ALPHABET[random_int(0, $lastIndex)];
        }

        return 'SZ'.$suffix;
    }

    /**
     * @return array<string, mixed>
     */
    private function buildReferralData(User $user, ReferralCode $referralCode): array
    {
        $rewards = $referralCode->rewards()
            ->with('referred:id,full_name')
            ->latest('created_at')
            ->latest('id')
            ->limit(10)
            ->get()
            ->map(fn (ReferralReward $reward): array => [
                'id' => $reward->id,
                'referred_user' => [
                    'id' => $reward->referred->id,
                    'full_name' => $reward->referred->full_name,
                ],
                'reward_type' => $reward->reward_type,
                'reward_value' => (int) $reward->referrer_reward_value,
                'status' => $reward->status,
                'created_at' => $reward->created_at?->toIso8601String(),
                'completed_at' => $reward->completed_at?->toIso8601String(),
            ])
            ->all();

        $claimedReward = ReferralReward::query()
            ->with(['referrer:id,full_name', 'referralCode:id,code'])
            ->where('referred_id', $user->id)
            ->latest('created_at')
            ->latest('id')
            ->first();

        return [
            'code' => $referralCode->code,
            'referral_link' => '/dashboard/customer/referral?code='.rawurlencode($referralCode->code),
            'is_active' => (bool) $referralCode->is_active,
            'total_referrals' => (int) $referralCode->total_referrals,
            'total_rewards' => (int) $referralCode->total_rewards,
            'reward_policy' => [
                'reward_type' => 'points',
                'referrer_points' => $this->referrerRewardPoints(),
                'referred_points' => $this->referredRewardPoints(),
                'completion_condition' => 'first_completed_booking',
            ],
            'has_claimed_referral' => $claimedReward !== null,
            'claimed_referral' => $claimedReward ? $this->formatClaimedReferral($claimedReward) : null,
            'recent_rewards' => $rewards,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function formatClaimedReferral(ReferralReward $reward): array
    {
        return [
            'id' => $reward->id,
            'code' => $reward->referralCode->code,
            'referrer' => [
                'id' => $reward->referrer->id,
                'full_name' => $reward->referrer->full_name,
            ],
            'reward_type' => $reward->reward_type,
            'reward_value' => (int) $reward->referred_reward_value,
            'status' => $reward->status,
            'created_at' => $reward->created_at?->toIso8601String(),
            'completed_at' => $reward->completed_at?->toIso8601String(),
        ];
    }

    private function referrerRewardPoints(): int
    {
        return max(0, (int) SystemSetting::getVal('referral_referrer_points', '50'));
    }

    private function referredRewardPoints(): int
    {
        return max(0, (int) SystemSetting::getVal('referral_referred_points', '30'));
    }
}
