<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseController;
use App\Http\Requests\Loyalty\RedeemPointsRequest;
use App\Models\PointTransaction;
use App\Models\Voucher;
use App\Services\LoyaltyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Throwable;

class LoyaltyController extends BaseController
{
    public function __construct(private readonly LoyaltyService $loyaltyService) {}

    public function summary(Request $request): JsonResponse
    {
        try {
            return $this->successResponse([
                ...$this->loyaltyService->summary($request->user()),
                'redemption' => $this->redemptionAvailability(),
            ], 'Lấy thông tin điểm thưởng thành công.');
        } catch (Throwable $exception) {
            report($exception);

            return $this->errorResponse('Không thể tải thông tin điểm thưởng.', 500);
        }
    }

    public function history(Request $request): JsonResponse
    {
        $perPage = max(1, min(50, $request->integer('per_page', 10)));
        $paginated = $request->user()
            ->pointTransactions()
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($perPage);

        $transactions = collect($paginated->items())
            ->map(fn (PointTransaction $transaction): array => [
                'id' => $transaction->id,
                'type' => $transaction->type,
                'points' => (int) $transaction->points,
                'balance_after' => (int) $transaction->balance_after,
                'reason' => $transaction->description,
                'reference' => [
                    'type' => $transaction->source,
                    'id' => $transaction->reference_id !== null
                        ? (int) $transaction->reference_id
                        : null,
                ],
                'created_at' => $transaction->created_at?->toIso8601String(),
            ])
            ->values();

        return $this->successResponse([
            'transactions' => $transactions,
            'pagination' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ], 'Lấy lịch sử giao dịch điểm thành công.');
    }

    public function redeem(RedeemPointsRequest $request): JsonResponse
    {
        try {
            $user = $request->user();
            $points = (int) $request->validated('points');

            $packages = [
                50 => 25000,
                100 => 50000,
                200 => 100000,
            ];

            if (! isset($packages[$points])) {
                return $this->errorResponse('Gói đổi thưởng không hợp lệ. Vui lòng chọn gói 50, 100 hoặc 200 điểm.', 422);
            }

            $discountValue = $packages[$points];

            return DB::transaction(function () use ($user, $points, $discountValue) {
                $account = $this->loyaltyService->getOrCreateAccount($user);
                if ((int) $account->total_points < $points) {
                    return $this->errorResponse('Số điểm hiện tại của bạn không đủ để đổi gói này.', 400);
                }

                $voucherCode = 'SZ' . $points . strtoupper(Str::random(6));

                $voucher = Voucher::create([
                    'code' => $voucherCode,
                    'name' => "Voucher đổi từ {$points} điểm ({$user->full_name})",
                    'discount_type' => 'fixed',
                    'discount_value' => $discountValue,
                    'min_order_value' => 0,
                    'usage_limit' => 1,
                    'used_count' => 0,
                    'starts_at' => now(),
                    'ends_at' => now()->addDays(30),
                    'status' => 'active',
                ]);

                $transaction = $this->loyaltyService->redeemPoints(
                    $user,
                    $points,
                    "Đổi {$points} điểm nhận mã voucher {$voucherCode} (" . number_format($discountValue, 0, ',', '.') . "đ)",
                    'voucher_reward',
                    (int) $voucher->id
                );

                return $this->successResponse([
                    'voucher' => [
                        'id' => $voucher->id,
                        'code' => $voucher->code,
                        'name' => $voucher->name,
                        'discount_value' => (int) $voucher->discount_value,
                        'discount_type' => $voucher->discount_type,
                        'ends_at' => $voucher->ends_at->toIso8601String(),
                    ],
                    'remaining_points' => (int) $transaction->balance_after,
                    'transaction_id' => $transaction->id,
                ], "Đổi thưởng thành công! Mã giảm giá của bạn là: {$voucher->code}");
            });
        } catch (Throwable $exception) {
            report($exception);

            return $this->errorResponse($exception->getMessage() ?: 'Không thể thực hiện đổi điểm.', 500);
        }
    }

    /** @return array{enabled: bool, reason: string, packages: array<int, array<string, mixed>>} */
    private function redemptionAvailability(): array
    {
        return [
            'enabled' => true,
            'reason' => 'Đổi điểm tích lũy lấy mã giảm giá áp dụng trực tiếp cho các lần đặt sân.',
            'packages' => [
                [
                    'points' => 50,
                    'discount_value' => 25000,
                    'label' => 'Voucher 25.000đ',
                    'description' => 'Áp dụng cho mọi đơn đặt sân trong 30 ngày',
                ],
                [
                    'points' => 100,
                    'discount_value' => 50000,
                    'label' => 'Voucher 50.000đ',
                    'description' => 'Áp dụng cho mọi đơn đặt sân trong 30 ngày',
                ],
                [
                    'points' => 200,
                    'discount_value' => 100000,
                    'label' => 'Voucher 100.000đ',
                    'description' => 'Áp dụng cho mọi đơn đặt sân trong 30 ngày',
                ],
            ],
        ];
    }
}
