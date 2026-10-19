<?php

use App\Http\Controllers\Api\V1\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\HealthCheckController;
use App\Http\Controllers\Api\V1\MatchMemberController;
use App\Http\Controllers\Api\V1\MatchPostController;
use App\Http\Controllers\Api\V1\PaymentController;
use App\Http\Controllers\Api\V1\ProfileController;
use App\Http\Controllers\Api\V1\SportCategoryController;
use App\Http\Controllers\Api\V1\VoucherController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes - Version 1 (v1)
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {
    // Health Check
    Route::get('/health', [HealthCheckController::class, 'index']);

    // Public Authentication
    Route::prefix('auth')->group(function () {
        Route::post('/register', [AuthController::class, 'register']);
        Route::post('/login', [AuthController::class, 'login']);
        Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
        Route::post('/reset-password', [AuthController::class, 'resetPassword']);

        // OAuth2 Social Login
        Route::get('/{provider}/redirect', [AuthController::class, 'redirectToProvider'])
            ->where('provider', 'google|facebook');
        Route::get('/{provider}/callback', [AuthController::class, 'handleProviderCallback'])
            ->where('provider', 'google|facebook');
    });

    // Public Sport Categories
    Route::get('/sport-categories', [SportCategoryController::class, 'index']);
    Route::get('/sport-categories/{idOrCode}', [SportCategoryController::class, 'show']);

    // =========================================================================
    // PHẦN 4: THANH TOÁN (PAYMENTS & VIETQR)
    // =========================================================================
    Route::prefix('payments')->group(function () {
        // 1. Sinh mã VietQR động cho đơn đặt sân (Public hoặc Auth)
        Route::post('/generate-qr', [PaymentController::class, 'generatePaymentQR']);

        // 2. Webhook SePay (Bảo mật HMAC-SHA256)
        Route::post('/sepay-webhook', [PaymentController::class, 'handleSepayWebhook'])
            ->middleware('sepay.verify');

        // 3. Polling kiểm tra trạng thái thanh toán (Theo booking_id hoặc booking_code)
        Route::get('/status/{idOrCode}', [PaymentController::class, 'checkPaymentStatus']);
    });

    // Alias hỗ trợ SePay gọi qua /api/v1/hooks/sepay-payment
    Route::post('/hooks/sepay-payment', [PaymentController::class, 'handleSepayWebhook'])
        ->middleware('sepay.verify');

    // =========================================================================
    // PHẦN 4: VOUCHERS (MÃ GIẢM GIÁ)
    // =========================================================================
    Route::prefix('vouchers')->group(function () {
        // Lấy danh sách mã giảm giá khả dụng
        Route::get('/', [VoucherController::class, 'index']);

        // Kiểm tra mã và tính số tiền giảm
        Route::post('/validate', [VoucherController::class, 'validateVoucher']);

        // Chi tiết mã giảm giá
        Route::get('/{idOrCode}', [VoucherController::class, 'show']);
    });

    // =========================================================================
    // PHẦN 4: MATCHMAKING (CỘNG ĐỒNG GHÉP KÈO / TÌM ĐỐI)
    // =========================================================================
    Route::prefix('matches')->group(function () {
        // Danh sách kèo tìm đối công khai
        Route::get('/', [MatchPostController::class, 'index']);
        // Chi tiết kèo tìm đối
        Route::get('/{id}', [MatchPostController::class, 'show']);
    });

    // Protected Routes (Yêu cầu đăng nhập Sanctum token)
    Route::middleware(['auth:sanctum', 'check.status'])->group(function () {
        // Auth session
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/auth/me', [AuthController::class, 'me']);

        // Social Account linking (cho user đã đăng nhập)
        Route::prefix('social')->group(function () {
            Route::get('/{provider}/link', [AuthController::class, 'linkSocialAccount'])
                ->where('provider', 'google|facebook');
            Route::delete('/{provider}/unlink', [AuthController::class, 'unlinkSocialAccount'])
                ->where('provider', 'google|facebook');
        });

        // Profile cá nhân
        Route::prefix('profile')->group(function () {
            Route::get('/', [ProfileController::class, 'show']);
            Route::put('/', [ProfileController::class, 'update']);
            Route::put('/password', [ProfileController::class, 'changePassword']);
            Route::post('/avatar', [ProfileController::class, 'updateAvatar']);
        });

        // =====================================================================
        // PHẦN 4: MATCHMAKING - QUẢN LÝ KÈO & THÀNH VIÊN
        // =====================================================================
        Route::prefix('matches')->group(function () {
            // Đăng bài tìm đối mới
            Route::post('/', [MatchPostController::class, 'store']);
            // Chỉnh sửa bài đăng
            Route::put('/{id}', [MatchPostController::class, 'update']);
            // Hủy bài đăng
            Route::delete('/{id}', [MatchPostController::class, 'destroy']);

            // Đăng ký tham gia kèo
            Route::post('/{id}/join', [MatchMemberController::class, 'join']);
            // Rút khỏi kèo
            Route::post('/{id}/leave', [MatchMemberController::class, 'leave']);

            // Duyệt / Từ chối thành viên (Dành cho chủ bài đăng)
            Route::put('/{matchId}/members/{memberId}/accept', [MatchMemberController::class, 'accept']);
            Route::put('/{matchId}/members/{memberId}/reject', [MatchMemberController::class, 'reject']);
        });

        // Quản lý kèo cá nhân
        Route::prefix('my-matches')->group(function () {
            Route::get('/created', [MatchPostController::class, 'myPosts']);
            Route::get('/joined', [MatchPostController::class, 'myJoined']);
        });

        // Quản lý thanh toán (Admin / Owner)
        Route::get('/payments', [PaymentController::class, 'index']);

        // Admin Only Routes
        Route::middleware('role:admin')->prefix('admin')->group(function () {
            Route::post('/sport-categories', [SportCategoryController::class, 'store']);
            Route::put('/sport-categories/{id}', [SportCategoryController::class, 'update']);
            Route::delete('/sport-categories/{id}', [SportCategoryController::class, 'destroy']);

            // Quản lý Vouchers (Admin)
            Route::prefix('vouchers')->group(function () {
                Route::get('/', [VoucherController::class, 'adminIndex']);
                Route::post('/', [VoucherController::class, 'store']);
                Route::put('/{id}', [VoucherController::class, 'update']);
                Route::delete('/{id}', [VoucherController::class, 'destroy']);
            });

            // Quản lý người dùng
            Route::get('/users', [AdminUserController::class, 'index']);
            Route::put('/users/{id}/status', [AdminUserController::class, 'updateStatus']);
            Route::put('/users/{id}/role', [AdminUserController::class, 'updateRole']);
        });
    });
});
