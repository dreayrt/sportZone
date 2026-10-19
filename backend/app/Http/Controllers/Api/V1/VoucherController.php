<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseController;
use App\Models\Voucher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class VoucherController extends BaseController
{
    /**
     * Danh sách voucher công khai đang khả dụng
     * GET /api/v1/vouchers
     */
    public function index(Request $request): JsonResponse
    {
        $query = Voucher::available();

        // Lọc theo giá trị đơn hàng nếu client truyền lên
        if ($request->has('order_amount')) {
            $orderAmount = (int)$request->input('order_amount');
            $query->where('min_order_value', '<=', $orderAmount);
        }

        $vouchers = $query->orderByDesc('id')->get([
            'id',
            'code',
            'name',
            'discount_type',
            'discount_value',
            'max_discount',
            'min_order_value',
            'starts_at',
            'ends_at',
        ]);

        return $this->successResponse($vouchers, 'Lấy danh sách mã giảm giá khả dụng thành công.');
    }

    /**
     * Xem thông tin chi tiết một voucher
     * GET /api/v1/vouchers/{idOrCode}
     */
    public function show(string|int $idOrCode): JsonResponse
    {
        $voucher = Voucher::where('id', $idOrCode)
            ->orWhere('code', strtoupper($idOrCode))
            ->first();

        if (!$voucher) {
            return $this->notFound('Không tìm thấy thông tin mã giảm giá.');
        }

        return $this->successResponse($voucher, 'Lấy chi tiết mã giảm giá thành công.');
    }

    /**
     * Kiểm tra tính hợp lệ và tính số tiền giảm giá
     * POST /api/v1/vouchers/validate
     */
    public function validateVoucher(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => 'required|string|max:50',
            'total_amount' => 'required|integer|min:0',
        ]);

        $code = strtoupper(trim($validated['code']));
        $totalAmount = (int)$validated['total_amount'];

        $voucher = Voucher::where('code', $code)->first();

        if (!$voucher) {
            return $this->errorResponse('Mã giảm giá không tồn tại trong hệ thống.', 404, [
                'code' => $code,
            ]);
        }

        $validationResult = $voucher->validateForOrder($totalAmount);

        if (!$validationResult['valid']) {
            return $this->errorResponse($validationResult['message'], 422, [
                'code' => $code,
                'min_order_value' => $voucher->min_order_value,
                'starts_at' => $voucher->starts_at?->format('Y-m-d H:i:s'),
                'ends_at' => $voucher->ends_at?->format('Y-m-d H:i:s'),
            ]);
        }

        $discountAmount = $validationResult['discount'];
        $finalAmount = max(0, $totalAmount - $discountAmount);

        return $this->successResponse([
            'valid' => true,
            'voucher' => [
                'id' => $voucher->id,
                'code' => $voucher->code,
                'name' => $voucher->name,
                'discount_type' => $voucher->discount_type,
                'discount_value' => $voucher->discount_value,
                'max_discount' => $voucher->max_discount,
                'min_order_value' => $voucher->min_order_value,
            ],
            'total_amount' => $totalAmount,
            'discount_amount' => $discountAmount,
            'final_amount' => $finalAmount,
            'message' => 'Áp dụng mã thành công! Bạn tiết kiệm được ' . number_format($discountAmount) . 'đ.',
        ], 'Mã giảm giá hợp lệ.');
    }

    /**
     * Quản lý danh sách voucher (Admin / Owner)
     * GET /api/v1/admin/vouchers
     */
    public function adminIndex(Request $request): JsonResponse
    {
        $query = Voucher::query();

        // Tìm kiếm theo code hoặc tên
        if ($keyword = $request->input('keyword')) {
            $query->where(function ($q) use ($keyword) {
                $q->where('code', 'like', "%{$keyword}%")
                    ->orWhere('name', 'like', "%{$keyword}%");
            });
        }

        // Lọc theo trạng thái
        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        // Lọc theo loại giảm giá
        if ($type = $request->input('discount_type')) {
            $query->where('discount_type', $type);
        }

        $vouchers = $query->orderByDesc('id')
            ->paginate($request->integer('per_page', 15));

        return $this->successResponse($vouchers, 'Lấy danh sách mã giảm giá thành công.');
    }

    /**
     * Tạo mã giảm giá mới (Admin / Owner)
     * POST /api/v1/admin/vouchers
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => 'required|string|max:50|unique:vouchers,code',
            'name' => 'required|string|max:150',
            'discount_type' => 'required|in:fixed,percent',
            'discount_value' => 'required|integer|min:1',
            'max_discount' => 'nullable|integer|min:0',
            'min_order_value' => 'nullable|integer|min:0',
            'usage_limit' => 'nullable|integer|min:1',
            'starts_at' => 'required|date',
            'ends_at' => 'required|date|after:starts_at',
            'status' => 'nullable|in:active,inactive',
        ]);

        $voucher = Voucher::create([
            'code' => strtoupper(trim($validated['code'])),
            'name' => $validated['name'],
            'discount_type' => $validated['discount_type'],
            'discount_value' => $validated['discount_value'],
            'max_discount' => $validated['max_discount'] ?? null,
            'min_order_value' => $validated['min_order_value'] ?? 0,
            'usage_limit' => $validated['usage_limit'] ?? null,
            'used_count' => 0,
            'starts_at' => $validated['starts_at'],
            'ends_at' => $validated['ends_at'],
            'status' => $validated['status'] ?? 'active',
        ]);

        return $this->successResponse($voucher, 'Tạo mã giảm giá mới thành công.', 201);
    }

    /**
     * Cập nhật thông tin mã giảm giá (Admin / Owner)
     * PUT /api/v1/admin/vouchers/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $voucher = Voucher::find($id);

        if (!$voucher) {
            return $this->notFound('Không tìm thấy mã giảm giá cần cập nhật.');
        }

        $validated = $request->validate([
            'code' => ['sometimes', 'string', 'max:50', Rule::unique('vouchers', 'code')->ignore($id)],
            'name' => 'sometimes|string|max:150',
            'discount_type' => 'sometimes|in:fixed,percent',
            'discount_value' => 'sometimes|integer|min:1',
            'max_discount' => 'nullable|integer|min:0',
            'min_order_value' => 'sometimes|integer|min:0',
            'usage_limit' => 'nullable|integer|min:1',
            'starts_at' => 'sometimes|date',
            'ends_at' => 'sometimes|date|after:starts_at',
            'status' => 'sometimes|in:active,inactive',
        ]);

        if (isset($validated['code'])) {
            $validated['code'] = strtoupper(trim($validated['code']));
        }

        $voucher->update($validated);

        return $this->successResponse($voucher, 'Cập nhật mã giảm giá thành công.');
    }

    /**
     * Xóa hoặc tạm ngưng mã giảm giá (Admin / Owner)
     * DELETE /api/v1/admin/vouchers/{id}
     */
    public function destroy(int $id): JsonResponse
    {
        $voucher = Voucher::find($id);

        if (!$voucher) {
            return $this->notFound('Không tìm thấy mã giảm giá cần xóa.');
        }

        // Kiểm tra nếu đã có đơn đặt sân sử dụng mã này
        $hasBookings = DB::table('bookings')->where('voucher_id', $id)->exists();

        if ($hasBookings) {
            // Thay vì xóa cứng làm hỏng quan hệ dữ liệu, chuyển trạng thái sang inactive
            $voucher->update(['status' => 'inactive']);
            return $this->successResponse(
                $voucher,
                'Mã giảm giá đã có đơn sử dụng nên đã được chuyển sang trạng thái ngưng hoạt động (inactive).'
            );
        }

        $voucher->delete();

        return $this->successResponse(null, 'Xóa mã giảm giá thành công.');
    }
}
