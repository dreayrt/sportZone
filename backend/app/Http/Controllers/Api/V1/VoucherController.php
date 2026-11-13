<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseController;
use App\Models\Court;
use App\Models\Venue;
use App\Models\Voucher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class VoucherController extends BaseController
{
    /**
     * Danh sách voucher công khai đang khả dụng
     * GET /api/v1/vouchers
     */
    public function index(Request $request): JsonResponse
    {
        $venueId = $request->input('venue_id');
        $courtId = $request->input('court_id');

        if (! $venueId && $courtId) {
            $venueId = DB::table('courts')->where('id', $courtId)->value('venue_id');
        }

        $query = Voucher::available($venueId ? (int) $venueId : null);

        // Lọc theo giá trị đơn hàng nếu client truyền lên
        if ($request->has('order_amount')) {
            $orderAmount = (int) $request->input('order_amount');
            $query->where('min_order_value', '<=', $orderAmount);
        }

        $vouchers = $query->with('venue:id,name')->orderByDesc('id')->get([
            'id',
            'venue_id',
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
        $voucher = Voucher::with('venue:id,name')
            ->where('id', $idOrCode)
            ->orWhere('code', strtoupper($idOrCode))
            ->first();

        if (! $voucher) {
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
            'venue_id' => 'nullable|integer',
            'court_id' => 'nullable|integer',
        ]);

        $code = strtoupper(trim($validated['code']));
        $totalAmount = (int) $validated['total_amount'];

        $venueId = $validated['venue_id'] ?? null;
        if (! $venueId && ! empty($validated['court_id'])) {
            $venueId = DB::table('courts')->where('id', $validated['court_id'])->value('venue_id');
        }

        $voucher = Voucher::with('venue:id,name')->where('code', $code)->first();

        if (! $voucher) {
            return $this->errorResponse('Mã giảm giá không tồn tại trong hệ thống.', 404, [
                'code' => $code,
            ]);
        }

        $validationResult = $voucher->validateForOrder($totalAmount, $venueId ? (int) $venueId : null);

        if (! $validationResult['valid']) {
            return $this->errorResponse($validationResult['message'], 422, [
                'code' => $code,
                'min_order_value' => $voucher->min_order_value,
                'starts_at' => $voucher->starts_at?->format('Y-m-d H:i:s'),
                'ends_at' => $voucher->ends_at?->format('Y-m-d H:i:s'),
                'venue_id' => $voucher->venue_id,
                'venue_name' => $voucher->venue?->name,
            ]);
        }

        $discountAmount = $validationResult['discount'];
        $finalAmount = max(0, $totalAmount - $discountAmount);

        return $this->successResponse([
            'valid' => true,
            'voucher' => [
                'id' => $voucher->id,
                'venue_id' => $voucher->venue_id,
                'venue' => $voucher->venue ? [
                    'id' => $voucher->venue->id,
                    'name' => $voucher->venue->name,
                ] : null,
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
            'message' => 'Áp dụng mã thành công! Bạn tiết kiệm được '.number_format($discountAmount).'đ.',
        ], 'Mã giảm giá hợp lệ.');
    }

    /**
     * Quản lý danh sách voucher (Admin)
     * GET /api/v1/admin/vouchers
     */
    public function adminIndex(Request $request): JsonResponse
    {
        $request->validate([
            'keyword' => ['nullable', 'string', 'max:150'],
            'status' => ['nullable', 'in:active,inactive'],
            'discount_type' => ['nullable', 'in:fixed,percent'],
            'venue_id' => ['nullable'],
            'per_page' => ['nullable', 'integer', 'between:1,100'],
        ]);
        $query = Voucher::with('venue:id,name');

        if ($venueId = $request->input('venue_id')) {
            if ($venueId === 'global' || $venueId === 'null') {
                $query->whereNull('venue_id');
            } else {
                $query->where('venue_id', (int) $venueId);
            }
        }

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
     * Tạo mã giảm giá mới (Admin)
     * POST /api/v1/admin/vouchers
     */
    public function store(Request $request): JsonResponse
    {
        if (is_string($request->input('code'))) {
            $request->merge(['code' => strtoupper(trim($request->input('code')))]);
        }
        if ($request->has('venue_id')) {
            $venueIdInput = $request->input('venue_id');
            if ($venueIdInput === '' || $venueIdInput === 'global' || $venueIdInput === 'null') {
                $request->merge(['venue_id' => null]);
            }
        }
        $validated = $request->validate([
            'venue_id' => 'nullable|integer|exists:venues,id',
            'code' => 'required|string|max:50|unique:vouchers,code',
            'name' => 'required|string|max:150',
            'discount_type' => 'required|in:fixed,percent',
            'discount_value' => 'required|integer|min:1'.($request->input('discount_type') === 'percent' ? '|max:100' : ''),
            'max_discount' => 'nullable|integer|min:0',
            'min_order_value' => 'nullable|integer|min:0',
            'usage_limit' => 'nullable|integer|min:1',
            'starts_at' => 'required|date',
            'ends_at' => 'required|date|after:starts_at',
            'status' => 'nullable|in:active,inactive',
        ]);

        $voucher = Voucher::create([
            'venue_id' => $validated['venue_id'] ?? null,
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

        $voucher->load('venue:id,name');

        return $this->successResponse($voucher, 'Tạo mã giảm giá mới thành công.', 201);
    }

    /**
     * Cập nhật thông tin mã giảm giá (Admin)
     * PUT /api/v1/admin/vouchers/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $voucher = Voucher::find($id);

        if (! $voucher) {
            return $this->notFound('Không tìm thấy mã giảm giá cần cập nhật.');
        }

        if (is_string($request->input('code'))) {
            $request->merge(['code' => strtoupper(trim($request->input('code')))]);
        }
        if ($request->has('venue_id')) {
            $venueIdInput = $request->input('venue_id');
            if ($venueIdInput === '' || $venueIdInput === 'global' || $venueIdInput === 'null') {
                $request->merge(['venue_id' => null]);
            }
        }

        $validated = $request->validate([
            'venue_id' => 'nullable|integer|exists:venues,id',
            'code' => ['sometimes', 'string', 'max:50', Rule::unique('vouchers', 'code')->ignore($id)],
            'name' => 'sometimes|string|max:150',
            'discount_type' => 'sometimes|in:fixed,percent',
            'discount_value' => 'sometimes|integer|min:1',
            'max_discount' => 'nullable|integer|min:0',
            'min_order_value' => 'sometimes|integer|min:0',
            'usage_limit' => 'nullable|integer|min:1',
            'starts_at' => 'sometimes|date',
            'ends_at' => 'sometimes|date',
            'status' => 'sometimes|in:active,inactive',
        ]);

        Validator::make(array_merge($voucher->only(['discount_type', 'discount_value', 'starts_at', 'ends_at']), $validated), [
            'discount_value' => 'integer|min:1'.(($validated['discount_type'] ?? $voucher->discount_type) === 'percent' ? '|max:100' : ''),
            'ends_at' => 'date|after:starts_at',
        ])->validate();

        if (isset($validated['code'])) {
            $validated['code'] = strtoupper(trim($validated['code']));
        }

        $voucher->update($validated);
        $voucher->load('venue:id,name');

        return $this->successResponse($voucher, 'Cập nhật mã giảm giá thành công.');
    }

    /**
     * Xóa hoặc tạm ngưng mã giảm giá (Admin)
     * DELETE /api/v1/admin/vouchers/{id}
     */
    public function destroy(int $id): JsonResponse
    {
        $voucher = Voucher::find($id);

        if (! $voucher) {
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

    // ==========================================
    // PHÂN HỆ CHỦ SÂN (VENUE OWNER)
    // ==========================================

    /**
     * Danh sách voucher thuộc các cơ sở của Chủ sân
     * GET /api/v1/owner/vouchers
     */
    public function ownerIndex(Request $request): JsonResponse
    {
        $user = $request->user();
        $ownerVenueIds = DB::table('venues')->where('owner_id', $user->id)->pluck('id')->toArray();

        $request->validate([
            'keyword' => ['nullable', 'string', 'max:150'],
            'status' => ['nullable', 'in:active,inactive'],
            'discount_type' => ['nullable', 'in:fixed,percent'],
            'venue_id' => ['nullable', 'integer'],
            'per_page' => ['nullable', 'integer', 'between:1,100'],
        ]);

        $query = Voucher::with('venue:id,name,address')
            ->whereIn('venue_id', $ownerVenueIds);

        if ($venueId = $request->input('venue_id')) {
            if (in_array((int) $venueId, $ownerVenueIds, true)) {
                $query->where('venue_id', (int) $venueId);
            }
        }

        if ($keyword = $request->input('keyword')) {
            $query->where(function ($q) use ($keyword) {
                $q->where('code', 'like', "%{$keyword}%")
                    ->orWhere('name', 'like', "%{$keyword}%");
            });
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($type = $request->input('discount_type')) {
            $query->where('discount_type', $type);
        }

        $vouchers = $query->orderByDesc('id')
            ->paginate($request->integer('per_page', 15));

        return $this->successResponse($vouchers, 'Lấy danh sách mã khuyến mãi của chủ sân thành công.');
    }

    /**
     * Tạo mã khuyến mãi mới gắn với cơ sở của Chủ sân
     * POST /api/v1/owner/vouchers
     */
    public function ownerStore(Request $request): JsonResponse
    {
        $user = $request->user();
        $ownerVenueIds = DB::table('venues')->where('owner_id', $user->id)->pluck('id')->toArray();

        if (empty($ownerVenueIds)) {
            return $this->errorResponse('Bạn chưa có cơ sở sân nào để tạo mã khuyến mãi.', 422);
        }

        if (is_string($request->input('code'))) {
            $request->merge(['code' => strtoupper(trim($request->input('code')))]);
        }
        if ($request->has('venue_id')) {
            $venueIdInput = $request->input('venue_id');
            if ($venueIdInput === '' || $venueIdInput === 'global' || $venueIdInput === 'null') {
                $request->merge(['venue_id' => null]);
            }
        }

        $validated = $request->validate([
            'venue_id' => ['required', 'integer', Rule::in($ownerVenueIds)],
            'code' => ['required', 'string', 'max:50', 'unique:vouchers,code'],
            'name' => ['required', 'string', 'max:150'],
            'discount_type' => ['required', 'in:fixed,percent'],
            'discount_value' => ['required', 'integer', 'min:1', ($request->input('discount_type') === 'percent' ? 'max:100' : '')],
            'max_discount' => ['nullable', 'integer', 'min:0'],
            'min_order_value' => ['nullable', 'integer', 'min:0'],
            'usage_limit' => ['nullable', 'integer', 'min:1'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['required', 'date', 'after:starts_at'],
            'status' => ['nullable', 'in:active,inactive'],
        ], [
            'venue_id.required' => 'Vui lòng chọn cơ sở áp dụng mã khuyến mãi.',
            'venue_id.in' => 'Cơ sở được chọn không thuộc quyền quản lý của bạn.',
            'code.unique' => 'Mã khuyến mãi này đã tồn tại trên hệ thống, vui lòng chọn mã khác.',
        ]);

        $voucher = Voucher::create([
            'venue_id' => $validated['venue_id'],
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

        $voucher->load('venue:id,name,address');

        return $this->successResponse($voucher, 'Tạo mã khuyến mãi cho cơ sở thành công.', 201);
    }

    /**
     * Cập nhật thông tin mã khuyến mãi của Chủ sân
     * PUT /api/v1/owner/vouchers/{id}
     */
    public function ownerUpdate(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $ownerVenueIds = DB::table('venues')->where('owner_id', $user->id)->pluck('id')->toArray();

        $voucher = Voucher::whereIn('venue_id', $ownerVenueIds)->find($id);
        if (! $voucher) {
            return $this->notFound('Không tìm thấy mã khuyến mãi hoặc bạn không có quyền chỉnh sửa mã này.');
        }

        if (is_string($request->input('code'))) {
            $request->merge(['code' => strtoupper(trim($request->input('code')))]);
        }
        if ($request->has('venue_id')) {
            $venueIdInput = $request->input('venue_id');
            if ($venueIdInput === '' || $venueIdInput === 'global' || $venueIdInput === 'null') {
                $request->merge(['venue_id' => null]);
            }
        }

        $validated = $request->validate([
            'venue_id' => ['sometimes', 'integer', Rule::in($ownerVenueIds)],
            'code' => ['sometimes', 'string', 'max:50', Rule::unique('vouchers', 'code')->ignore($id)],
            'name' => ['sometimes', 'string', 'max:150'],
            'discount_type' => ['sometimes', 'in:fixed,percent'],
            'discount_value' => ['sometimes', 'integer', 'min:1'],
            'max_discount' => ['nullable', 'integer', 'min:0'],
            'min_order_value' => ['sometimes', 'integer', 'min:0'],
            'usage_limit' => ['nullable', 'integer', 'min:1'],
            'starts_at' => ['sometimes', 'date'],
            'ends_at' => ['sometimes', 'date'],
            'status' => ['sometimes', 'in:active,inactive'],
        ], [
            'venue_id.in' => 'Cơ sở được chọn không thuộc quyền quản lý của bạn.',
            'code.unique' => 'Mã khuyến mãi này đã tồn tại trên hệ thống.',
        ]);

        Validator::make(array_merge($voucher->only(['discount_type', 'discount_value', 'starts_at', 'ends_at']), $validated), [
            'discount_value' => 'integer|min:1'.(($validated['discount_type'] ?? $voucher->discount_type) === 'percent' ? '|max:100' : ''),
            'ends_at' => 'date|after:starts_at',
        ])->validate();

        if (isset($validated['code'])) {
            $validated['code'] = strtoupper(trim($validated['code']));
        }

        $voucher->update($validated);
        $voucher->load('venue:id,name,address');

        return $this->successResponse($voucher, 'Cập nhật mã khuyến mãi thành công.');
    }

    /**
     * Xóa hoặc tạm ngưng mã khuyến mãi của Chủ sân
     * DELETE /api/v1/owner/vouchers/{id}
     */
    public function ownerDestroy(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $ownerVenueIds = DB::table('venues')->where('owner_id', $user->id)->pluck('id')->toArray();

        $voucher = Voucher::whereIn('venue_id', $ownerVenueIds)->find($id);
        if (! $voucher) {
            return $this->notFound('Không tìm thấy mã khuyến mãi hoặc bạn không có quyền xóa mã này.');
        }

        // Kiểm tra nếu đã có đơn đặt sân sử dụng mã này
        $hasBookings = DB::table('bookings')->where('voucher_id', $id)->exists();

        if ($hasBookings) {
            $voucher->update(['status' => 'inactive']);

            return $this->successResponse(
                $voucher,
                'Mã khuyến mãi đã có đơn đặt sân sử dụng nên được chuyển sang trạng thái ngưng hoạt động (inactive).'
            );
        }

        $voucher->delete();

        return $this->successResponse(null, 'Xóa mã khuyến mãi thành công.');
    }
}
