<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseController;
use App\Services\BookingReservationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BookingReservationController extends BaseController
{
    public function __construct(private readonly BookingReservationService $reservations) {}

    public function store(Request $request): JsonResponse
    {
        $payload = $request->validate($this->slotRules());

        return $this->successResponse($this->reservations->reserve($payload, $request->user()), 'Đã giữ chỗ trong 5 phút.');
    }

    public function destroy(Request $request, string $token): JsonResponse
    {
        $this->reservations->release($token, $request->user());

        return $this->successResponse(null, 'Đã trả khung giờ.');
    }

    public function recurring(Request $request): JsonResponse
    {
        $payload = $request->validate(array_merge($this->slotRules(), [
            'frequency' => 'required|in:weekly,monthly',
            'occurrences' => 'required|integer|min:3|max:12',
            'customer_name' => 'required|string|max:120',
            'customer_phone' => 'required|string|max:20',
            'customer_email' => 'nullable|email|max:150',
            'note' => 'nullable|string|max:500',
            'hold_token' => 'nullable|uuid',
            'voucher_code' => 'nullable|string|max:50',
            'addons' => 'nullable|array',
            'addons.*.addon_id' => 'required|integer|distinct|exists:addons,id',
            'addons.*.quantity' => 'required|integer|min:1',
        ]));

        return $this->successResponse($this->reservations->createRecurring($payload, $request->user()), 'Đã tạo lịch đặt sân định kỳ. Thanh toán từng lượt bằng mã đơn tương ứng.', 201);
    }

    private function slotRules(): array
    {
        return [
            'court_id' => 'required|integer|exists:courts,id',
            'booking_date' => 'required|date_format:Y-m-d|after_or_equal:today',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'frequency' => 'nullable|in:weekly,monthly',
            'occurrences' => 'required_with:frequency|integer|min:3|max:12',
        ];
    }
}
