<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\BaseController;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends BaseController
{
    /**
     * Danh sách người dùng (tìm kiếm, lọc role/status, phân trang).
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:150'],
            'role' => ['nullable', 'in:customer,owner,admin'],
            'status' => ['nullable', 'in:active,blocked'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = User::query()->withCount('socialAccounts');

        if (!empty($validated['search'])) {
            $search = $validated['search'];
            $query->where(function ($q) use ($search) {
                $q->where('full_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        if (!empty($validated['role'])) {
            $query->where('role', $validated['role']);
        }

        if (!empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        $users = $query->orderByDesc('id')
            ->paginate($validated['per_page'] ?? 15);

        return $this->successResponse($users, 'Lấy danh sách người dùng thành công.');
    }

    /**
     * Khóa / mở khóa tài khoản.
     * Khóa xong sẽ thu hồi toàn bộ token để đá user ra ngay lập tức.
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'in:active,blocked'],
        ], [
            'status.required' => 'Vui lòng chọn trạng thái.',
            'status.in' => 'Trạng thái không hợp lệ.',
        ]);

        $target = User::find($id);

        if (!$target) {
            return $this->notFound('Không tìm thấy người dùng.');
        }

        if ($target->id === $request->user()->id) {
            return $this->errorResponse('Không thể tự thay đổi trạng thái tài khoản của chính mình.', 422);
        }

        if ($target->role === 'admin') {
            return $this->errorResponse('Không thể thay đổi trạng thái tài khoản quản trị viên khác.', 422);
        }

        $target->update(['status' => $validated['status']]);

        // Khóa -> thu hồi hết token để user bị đăng xuất ngay
        if ($validated['status'] === 'blocked') {
            $target->tokens()->delete();
        }

        return $this->successResponse(
            $target->fresh()->loadCount('socialAccounts'),
            $validated['status'] === 'blocked' ? 'Đã khóa tài khoản.' : 'Đã mở khóa tài khoản.'
        );
    }

    /**
     * Đổi vai trò người dùng.
     */
    public function updateRole(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'role' => ['required', 'in:customer,owner,admin'],
        ], [
            'role.required' => 'Vui lòng chọn vai trò.',
            'role.in' => 'Vai trò không hợp lệ.',
        ]);

        $target = User::find($id);

        if (!$target) {
            return $this->notFound('Không tìm thấy người dùng.');
        }

        if ($target->id === $request->user()->id) {
            return $this->errorResponse('Không thể tự thay đổi vai trò của chính mình.', 422);
        }

        if ($target->role === 'admin') {
            return $this->errorResponse('Không thể thay đổi vai trò của quản trị viên khác.', 422);
        }

        $target->update(['role' => $validated['role']]);

        return $this->successResponse(
            $target->fresh()->loadCount('socialAccounts'),
            'Đã cập nhật vai trò thành ' . $validated['role'] . '.'
        );
    }
}
