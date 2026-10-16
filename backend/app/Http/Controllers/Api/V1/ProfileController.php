<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProfileController extends BaseController
{
    /**
     * Xem thông tin profile của người dùng hiện tại
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user()->load(['points', 'referralCode', 'socialAccounts']);

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
            'phone' => ['sometimes', 'nullable', 'string', 'max:20', 'unique:users,phone,' . $user->id],
            'avatar' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);

        $user->update($validated);

        return $this->successResponse($user->fresh(['points', 'referralCode', 'socialAccounts']), 'Cập nhật thông tin thành công.');
    }

    /**
     * Tải ảnh đại diện mới (jpg/png/gif/webp, tối đa 2MB).
     * File cũ trên storage local sẽ bị xóa.
     */
    public function updateAvatar(Request $request): JsonResponse
    {
        $request->validate([
            'avatar' => ['required', 'image', 'mimes:jpeg,jpg,png,gif,webp', 'max:2048'],
        ], [
            'avatar.required' => 'Vui lòng chọn file ảnh.',
            'avatar.image' => 'File phải là ảnh.',
            'avatar.mimes' => 'Ảnh phải có định dạng jpeg, png, gif hoặc webp.',
            'avatar.max' => 'Ảnh không được vượt quá 2MB.',
        ]);

        $user = $request->user();

        $path = $request->file('avatar')->store('avatars', 'public');

        // Xóa file avatar cũ nếu nằm trên storage local
        if ($user->avatar) {
            $oldPath = $this->localAvatarPath($user->avatar);
            if ($oldPath) {
                Storage::disk('public')->delete($oldPath);
            }
        }

        $user->update(['avatar' => url(Storage::url($path))]);

        return $this->successResponse($user->fresh(['points', 'referralCode', 'socialAccounts']), 'Cập nhật ảnh đại diện thành công.');
    }

    /**
     * Trích relative path trên disk public từ URL avatar, null nếu là URL ngoài.
     */
    protected function localAvatarPath(string $avatar): ?string
    {
        foreach ([url('/storage/'), '/storage/'] as $prefix) {
            if (str_starts_with($avatar, $prefix)) {
                return Str::after($avatar, $prefix);
            }
        }

        return null;
    }

    /**
     * Đổi mật khẩu (user OAuth chưa có mật khẩu thì được đặt mới không cần mật khẩu cũ)
     */
    public function changePassword(Request $request): JsonResponse
    {
        $user = $request->user();

        $request->validate([
            'current_password' => ['nullable', 'string'],
            'new_password' => ['required', 'string', 'min:6', 'confirmed'],
        ], [
            'new_password.required' => 'Vui lòng nhập mật khẩu mới.',
            'new_password.min' => 'Mật khẩu mới phải có tối thiểu 6 ký tự.',
            'new_password.confirmed' => 'Xác nhận mật khẩu mới không khớp.',
        ]);

        if ($user->password_hash) {
            if (!$request->current_password || !Hash::check($request->current_password, $user->password_hash)) {
                return $this->errorResponse('Mật khẩu hiện tại không chính xác.', 422, [
                    'current_password' => ['Mật khẩu hiện tại không chính xác.'],
                ]);
            }
        }

        $user->update([
            'password_hash' => Hash::make($request->new_password),
        ]);

        return $this->successResponse(null, 'Đổi mật khẩu thành công!');
    }
}
