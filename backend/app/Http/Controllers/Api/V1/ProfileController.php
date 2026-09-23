<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class ProfileController extends BaseController
{
    /**
     * Xem thông tin profile của người dùng hiện tại
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user()->load(['points', 'referralCode']);

        return $this->successResponse($user, 'Lấy thông tin profile thành công.');
    }

    /**
     * Cập nhật thông tin profile
     */
    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'full_name' => ['sometimes', 'string', 'max:120'],
            'email' => ['sometimes', 'nullable', 'email', 'max:150', 'unique:users,email,' . $user->id],
            'phone' => ['sometimes', 'string', 'max:20', 'unique:users,phone,' . $user->id],
            'avatar' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);

        $user->update($validated);

        return $this->successResponse($user->fresh(['points', 'referralCode']), 'Cập nhật thông tin thành công.');
    }

    /**
     * Đổi mật khẩu
     */
    public function changePassword(Request $request): JsonResponse
    {
        $user = $request->user();

        $request->validate([
            'current_password' => ['required', 'string'],
            'new_password' => ['required', 'string', 'min:6', 'confirmed'],
        ], [
            'current_password.required' => 'Vui lòng nhập mật khẩu hiện tại.',
            'new_password.required' => 'Vui lòng nhập mật khẩu mới.',
            'new_password.min' => 'Mật khẩu mới phải có tối thiểu 6 ký tự.',
            'new_password.confirmed' => 'Xác nhận mật khẩu mới không khớp.',
        ]);

        if (!Hash::check($request->current_password, $user->password_hash)) {
            return $this->errorResponse('Mật khẩu hiện tại không chính xác.', 422, [
                'current_password' => ['Mật khẩu hiện tại không chính xác.'],
            ]);
        }

        $user->update([
            'password_hash' => Hash::make($request->new_password),
        ]);

        return $this->successResponse(null, 'Đổi mật khẩu thành công!');
    }
}
