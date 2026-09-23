<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseController;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\ReferralCode;
use App\Models\User;
use App\Models\UserPoint;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthController extends BaseController
{
    /**
     * Đăng ký tài khoản mới (Customer / Owner)
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        try {
            $user = DB::transaction(function () use ($request) {
                $user = User::create([
                    'full_name' => $request->full_name,
                    'email' => $request->email,
                    'phone' => $request->phone,
                    'password_hash' => Hash::make($request->password),
                    'role' => $request->role ?? 'customer',
                    'status' => 'active',
                ]);

                // Khởi tạo điểm thưởng và mã giới thiệu cho khách hàng
                if ($user->role === 'customer') {
                    UserPoint::create([
                        'user_id' => $user->id,
                        'total_points' => 0,
                        'lifetime_points' => 0,
                        'tier' => 'bronze',
                    ]);

                    // Sinh mã giới thiệu duy nhất: VD SZ + ID + 4 ký tự ngẫu nhiên
                    $refCode = 'SZ' . $user->id . strtoupper(Str::random(4));
                    ReferralCode::create([
                        'user_id' => $user->id,
                        'code' => $refCode,
                        'total_referrals' => 0,
                        'total_rewards' => 0,
                        'is_active' => true,
                    ]);
                }

                return $user;
            });

            $token = $user->createToken('auth_token')->plainTextToken;

            return $this->successResponse([
                'user' => $user->load(['points', 'referralCode']),
                'token' => $token,
                'token_type' => 'Bearer',
            ], 'Đăng ký tài khoản thành công!', 201);
        } catch (\Exception $e) {
            return $this->errorResponse('Không thể tạo tài khoản: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Đăng nhập bằng Email hoặc Số điện thoại
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $loginField = filter_var($request->login, FILTER_VALIDATE_EMAIL) ? 'email' : 'phone';

        $user = User::where($loginField, $request->login)->first();

        if (!$user || !Hash::check($request->password, $user->password_hash)) {
            return $this->errorResponse('Thông tin đăng nhập hoặc mật khẩu không chính xác.', 401);
        }

        if ($user->status === 'blocked') {
            return $this->forbidden('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ ban quản trị.');
        }

        // Cập nhật thời điểm đăng nhập gần nhất
        $user->update([
            'last_login_at' => now(),
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return $this->successResponse([
            'user' => $user->load(['points', 'referralCode']),
            'token' => $token,
            'token_type' => 'Bearer',
        ], 'Đăng nhập thành công!');
    }

    /**
     * Đăng xuất & thu hồi token hiện tại
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return $this->successResponse(null, 'Đăng xuất thành công!');
    }

    /**
     * Lấy thông tin tài khoản người dùng hiện tại
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load(['points', 'referralCode']);

        return $this->successResponse($user, 'Lấy thông tin tài khoản thành công.');
    }
}
