<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseController;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Mail\ResetPasswordMail;
use App\Models\ReferralCode;
use App\Models\SocialAccount;
use App\Models\User;
use App\Models\UserPoint;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

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
                'user' => $user->load(['points', 'referralCode', 'socialAccounts']),
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

        // Tài khoản OAuth chưa đặt mật khẩu
        if ($user && !$user->password_hash) {
            return $this->errorResponse('Tài khoản này đăng nhập bằng Google/Facebook. Vui lòng dùng nút social login hoặc đặt mật khẩu trong profile.', 401);
        }

        if (!$user || !$user->password_hash || !Hash::check($request->password, $user->password_hash)) {
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
            'user' => $user->load(['points', 'referralCode', 'socialAccounts']),
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
     * Gửi liên kết đặt lại mật khẩu qua email (hiệu lực 60 phút)
     */
    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        $user = User::where('email', $request->email)->first();

        // Không tiết lộ email có tồn tại hay không (chống dò quét tài khoản)
        if (!$user) {
            return $this->successResponse(null, 'Nếu email tồn tại trong hệ thống, liên kết đặt lại mật khẩu đã được gửi.');
        }

        // Tài khoản OAuth chưa có mật khẩu -> hướng dẫn đặt mật khẩu khác
        if (!$user->password_hash && $user->socialAccounts()->exists()) {
            return $this->errorResponse('Tài khoản này đăng nhập bằng Google/Facebook và chưa có mật khẩu. Vui lòng đăng nhập bằng social login.', 422);
        }

        try {
            // Xóa token cũ của email này (nếu có)
            DB::table('password_reset_tokens')->where('email', $user->email)->delete();

            $plainToken = Str::random(64);

            DB::table('password_reset_tokens')->insert([
                'email' => $user->email,
                'token' => Hash::make($plainToken),
                'created_at' => now(),
            ]);

            $frontendUrl = rtrim(env('FRONTEND_URL', 'http://localhost:3000'), '/');
            $resetUrl = $frontendUrl . '/auth/reset-password?token=' . $plainToken . '&email=' . urlencode($user->email);

            Mail::to($user->email)->send(new ResetPasswordMail($resetUrl, $user->full_name));

            return $this->successResponse(null, 'Nếu email tồn tại trong hệ thống, liên kết đặt lại mật khẩu đã được gửi.');
        } catch (\Exception $e) {
            return $this->errorResponse('Không thể gửi email đặt lại mật khẩu: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Đặt lại mật khẩu bằng token từ email
     */
    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        $record = DB::table('password_reset_tokens')->where('email', $request->email)->first();

        if (!$record) {
            return $this->errorResponse('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.', 422);
        }

        // Token hiệu lực 60 phút
        if (now()->diffInMinutes($record->created_at) > 60) {
            DB::table('password_reset_tokens')->where('email', $request->email)->delete();

            return $this->errorResponse('Liên kết đặt lại mật khẩu đã hết hạn. Vui lòng yêu cầu liên kết mới.', 422);
        }

        if (!Hash::check($request->token, $record->token)) {
            return $this->errorResponse('Liên kết đặt lại mật khẩu không hợp lệ.', 422);
        }

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return $this->errorResponse('Không tìm thấy tài khoản với email này.', 404);
        }

        DB::transaction(function () use ($user, $request) {
            $user->update(['password_hash' => Hash::make($request->password)]);

            // Thu hồi toàn bộ token cũ để buộc đăng nhập lại
            $user->tokens()->delete();

            DB::table('password_reset_tokens')->where('email', $request->email)->delete();
        });

        return $this->successResponse(null, 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.');
    }

    /**
     * Lấy thông tin tài khoản người dùng hiện tại
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load(['points', 'referralCode', 'socialAccounts']);

        return $this->successResponse($user, 'Lấy thông tin tài khoản thành công.');
    }

    /**
     * Redirect to OAuth provider (Google / Facebook)
     */
    public function redirectToProvider(string $provider): JsonResponse
    {
        if (!in_array($provider, ['google', 'facebook'])) {
            return $this->errorResponse('Nhà cung cấp không được hỗ trợ.', 400);
        }

        try {
            $url = Socialite::driver($provider)->stateless()->redirect()->getTargetUrl();
            return $this->successResponse(['url' => $url], 'Chuyển hướng đến ' . ucfirst($provider) . ' OAuth.');
        } catch (\Exception $e) {
            return $this->errorResponse('Không thể khởi tạo OAuth: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Handle OAuth callback from provider.
     * Hai chế độ: liên kết tài khoản (có state hợp lệ) hoặc đăng nhập/đăng ký.
     */
    public function handleProviderCallback(Request $request, string $provider): RedirectResponse|JsonResponse
    {
        if (!in_array($provider, ['google', 'facebook'])) {
            return $this->errorResponse('Nhà cung cấp không được hỗ trợ.', 400);
        }

        // Chế độ liên kết: frontend đã xin state khi user đang đăng nhập
        if ($request->filled('state')) {
            return $this->handleLinkCallback($request, $provider);
        }

        try {
            $socialUser = Socialite::driver($provider)->stateless()->user();

            // Tìm hoặc tạo user
            $user = DB::transaction(function () use ($provider, $socialUser) {
                // Kiểm tra đã liên kết tài khoản này chưa
                $socialAccount = SocialAccount::where('provider', $provider)
                    ->where('provider_id', $socialUser->getId())
                    ->first();

                if ($socialAccount) {
                    // Đã liên kết -> cập nhật token và trả về user
                    $socialAccount->update([
                        'access_token' => $socialUser->token,
                        'refresh_token' => $socialUser->refreshToken,
                        'token_expires_at' => $socialUser->expiresIn ? now()->addSeconds($socialUser->expiresIn) : null,
                        'provider_avatar' => $socialUser->getAvatar(),
                        'provider_name' => $socialUser->getName(),
                        'provider_email' => $socialUser->getEmail(),
                    ]);
                    return $socialAccount->user;
                }

                // Kiểm tra email đã tồn tại trong hệ thống chưa
                $existingUser = null;
                if ($socialUser->getEmail()) {
                    $existingUser = User::where('email', $socialUser->getEmail())->first();
                }

                if ($existingUser) {
                    // Tài khoản email đã tồn tại -> liên kết social account
                    SocialAccount::create([
                        'user_id' => $existingUser->id,
                        'provider' => $provider,
                        'provider_id' => $socialUser->getId(),
                        'provider_email' => $socialUser->getEmail(),
                        'provider_name' => $socialUser->getName(),
                        'provider_avatar' => $socialUser->getAvatar(),
                        'access_token' => $socialUser->token,
                        'refresh_token' => $socialUser->refreshToken,
                        'token_expires_at' => $socialUser->expiresIn ? now()->addSeconds($socialUser->expiresIn) : null,
                    ]);

                    // Cập nhật avatar nếu chưa có
                    if (!$existingUser->avatar && $socialUser->getAvatar()) {
                        $existingUser->update(['avatar' => $socialUser->getAvatar()]);
                    }

                    return $existingUser;
                }

                // Tạo user mới từ social account (phone để NULL vì OAuth không có SĐT)
                $user = User::create([
                    'full_name' => $socialUser->getName() ?? 'Social User',
                    'email' => $socialUser->getEmail(),
                    'phone' => null,
                    'password_hash' => null, // NULL vì đăng nhập qua OAuth
                    'role' => 'customer',
                    'status' => 'active',
                    'avatar' => $socialUser->getAvatar(),
                ]);

                // Tạo social account
                SocialAccount::create([
                    'user_id' => $user->id,
                    'provider' => $provider,
                    'provider_id' => $socialUser->getId(),
                    'provider_email' => $socialUser->getEmail(),
                    'provider_name' => $socialUser->getName(),
                    'provider_avatar' => $socialUser->getAvatar(),
                    'access_token' => $socialUser->token,
                    'refresh_token' => $socialUser->refreshToken,
                    'token_expires_at' => $socialUser->expiresIn ? now()->addSeconds($socialUser->expiresIn) : null,
                ]);

                // Khởi tạo điểm thưởng và mã giới thiệu
                UserPoint::create([
                    'user_id' => $user->id,
                    'total_points' => 0,
                    'lifetime_points' => 0,
                    'tier' => 'bronze',
                ]);

                $refCode = 'SZ' . $user->id . strtoupper(Str::random(4));
                ReferralCode::create([
                    'user_id' => $user->id,
                    'code' => $refCode,
                    'total_referrals' => 0,
                    'total_rewards' => 0,
                    'is_active' => true,
                ]);

                return $user;
            });

            $token = $user->createToken('auth_token')->plainTextToken;

            // Redirect về frontend với token
            $frontendUrl = env('FRONTEND_URL', 'http://localhost:3000');
            $redirectUrl = $frontendUrl . '/auth/callback/' . $provider . '?token=' . $token;

            return redirect()->away($redirectUrl);

        } catch (\Exception $e) {
            $frontendUrl = env('FRONTEND_URL', 'http://localhost:3000');
            $errorUrl = $frontendUrl . '/auth/login?error=' . urlencode('OAuth thất bại: ' . $e->getMessage());
            return redirect()->away($errorUrl);
        }
    }

    /**
     * Liên kết thêm tài khoản mạng xã hội (cho user đã đăng nhập).
     * Cấp state token dùng 1 lần (hiệu lực 10 phút) để callback xác minh.
     */
    public function linkSocialAccount(Request $request, string $provider): JsonResponse
    {
        if (!in_array($provider, ['google', 'facebook'])) {
            return $this->errorResponse('Nhà cung cấp không được hỗ trợ.', 400);
        }

        $user = $request->user();

        // Kiểm tra đã liên kết provider này chưa
        $existing = SocialAccount::where('user_id', $user->id)
            ->where('provider', $provider)
            ->first();

        if ($existing) {
            return $this->errorResponse('Tài khoản ' . ucfirst($provider) . ' đã được liên kết.', 422);
        }

        $redirect = $request->input('redirect');
        if (!is_string($redirect) || !str_starts_with($redirect, '/') || str_starts_with($redirect, '//')) {
            $redirect = '/dashboard/customer/profile';
        }

        try {
            $state = Str::random(40);
            Cache::put('social_link_' . $state, [
                'user_id' => $user->id,
                'redirect' => $redirect,
            ], now()->addMinutes(10));

            $url = Socialite::driver($provider)->stateless()
                ->with(['state' => $state])
                ->redirect()->getTargetUrl();

            return $this->successResponse(['url' => $url], 'Chuyển hướng để liên kết ' . ucfirst($provider) . '.');
        } catch (\Exception $e) {
            return $this->errorResponse('Không thể khởi tạo OAuth: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Xử lý callback liên kết tài khoản (xác minh state dùng 1 lần).
     */
    protected function handleLinkCallback(Request $request, string $provider): RedirectResponse
    {
        $frontendUrl = rtrim(env('FRONTEND_URL', 'http://localhost:3000'), '/');

        $fail = function (string $fallbackRedirect, string $message) use ($frontendUrl) {
            $sep = str_contains($fallbackRedirect, '?') ? '&' : '?';

            return redirect()->away($frontendUrl . $fallbackRedirect . $sep . 'link_error=' . urlencode($message));
        };

        $pending = Cache::pull('social_link_' . $request->input('state'));

        if (!$pending || !isset($pending['user_id'])) {
            return $fail('/dashboard/customer/profile', 'Phiên liên kết đã hết hạn. Vui lòng thử lại.');
        }

        $user = User::find($pending['user_id']);
        $fallback = $pending['redirect'] ?? '/dashboard/customer/profile';

        if (!$user || $user->status === 'blocked') {
            return $fail($fallback, 'Tài khoản không tồn tại hoặc đã bị khóa.');
        }

        try {
            $socialUser = Socialite::driver($provider)->stateless()->user();
        } catch (\Exception $e) {
            return $fail($fallback, 'OAuth thất bại: ' . $e->getMessage());
        }

        // Tài khoản social này đã gắn với user khác?
        $taken = SocialAccount::where('provider', $provider)
            ->where('provider_id', $socialUser->getId())
            ->first();

        if ($taken && $taken->user_id !== $user->id) {
            return $fail($fallback, 'Tài khoản ' . ucfirst($provider) . ' này đã được liên kết với tài khoản khác.');
        }

        if ($taken) {
            $taken->update([
                'access_token' => $socialUser->token,
                'refresh_token' => $socialUser->refreshToken,
                'token_expires_at' => $socialUser->expiresIn ? now()->addSeconds($socialUser->expiresIn) : null,
                'provider_avatar' => $socialUser->getAvatar(),
                'provider_name' => $socialUser->getName(),
                'provider_email' => $socialUser->getEmail(),
            ]);
        } else {
            $ownLink = SocialAccount::where('user_id', $user->id)
                ->where('provider', $provider)
                ->first();

            if ($ownLink) {
                return $fail($fallback, 'Bạn đã liên kết ' . ucfirst($provider) . ' rồi.');
            }

            SocialAccount::create([
                'user_id' => $user->id,
                'provider' => $provider,
                'provider_id' => $socialUser->getId(),
                'provider_email' => $socialUser->getEmail(),
                'provider_name' => $socialUser->getName(),
                'provider_avatar' => $socialUser->getAvatar(),
                'access_token' => $socialUser->token,
                'refresh_token' => $socialUser->refreshToken,
                'token_expires_at' => $socialUser->expiresIn ? now()->addSeconds($socialUser->expiresIn) : null,
            ]);

            if (!$user->avatar && $socialUser->getAvatar()) {
                $user->update(['avatar' => $socialUser->getAvatar()]);
            }
        }

        $sep = str_contains($fallback, '?') ? '&' : '?';

        return redirect()->away($frontendUrl . $fallback . $sep . 'linked=' . $provider);
    }

    /**
     * Xóa liên kết tài khoản mạng xã hội
     */
    public function unlinkSocialAccount(Request $request, string $provider): JsonResponse
    {
        if (!in_array($provider, ['google', 'facebook'])) {
            return $this->errorResponse('Nhà cung cấp không được hỗ trợ.', 400);
        }

        $user = $request->user();

        $socialAccount = SocialAccount::where('user_id', $user->id)
            ->where('provider', $provider)
            ->first();

        if (!$socialAccount) {
            return $this->notFound('Không tìm thấy tài khoản ' . ucfirst($provider) . ' đã liên kết.');
        }

        // Không cho xóa nếu user không có password và chỉ có 1 social account
        if (!$user->password_hash && $user->socialAccounts()->count() === 1) {
            return $this->errorResponse('Không thể hủy liên kết tài khoản duy nhất khi chưa đặt mật khẩu.', 422);
        }

        $socialAccount->delete();

        return $this->successResponse(null, 'Đã hủy liên kết ' . ucfirst($provider) . ' thành công.');
    }
}
