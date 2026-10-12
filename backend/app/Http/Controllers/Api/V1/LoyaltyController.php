<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseController;
use App\Http\Requests\Loyalty\RedeemPointsRequest;
use App\Models\PointTransaction;
use App\Services\LoyaltyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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
        return $this->errorResponse(
            'Chức năng đổi điểm đang chờ Voucher hỗ trợ gán phần thưởng theo từng người dùng.',
            409,
            ['redemption' => $this->redemptionAvailability()]
        );
    }

    /** @return array{enabled: bool, reason: string} */
    private function redemptionAvailability(): array
    {
        return [
            'enabled' => false,
            'reason' => 'Voucher hiện là mã dùng chung và chưa có quan hệ sở hữu theo người dùng.',
        ];
    }
}
