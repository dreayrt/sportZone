<?php

use App\Http\Controllers\Api\V1\AiAssistantController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\DashboardAnalyticsController;
use App\Http\Controllers\Api\V1\HealthCheckController;
use App\Http\Controllers\Api\V1\LoyaltyController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\ProfileController;
use App\Http\Controllers\Api\V1\ReferralController;
use App\Http\Controllers\Api\V1\ReviewController;
use App\Http\Controllers\Api\V1\SportCategoryController;
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
    });

    // Public Sport Categories
    Route::get('/sport-categories', [SportCategoryController::class, 'index']);
    Route::get('/sport-categories/{idOrCode}', [SportCategoryController::class, 'show']);

    // Public AI assistant (Gemini intent parsing + MySQL/RAG retrieval)
    Route::post('/ai/chat', [AiAssistantController::class, 'chat'])->middleware('throttle:10,1');

    // Public Reviews
    Route::get('/venues/{venueId}/reviews', [ReviewController::class, 'index']);

    // Protected Routes (Yêu cầu đăng nhập Sanctum token)
    Route::middleware(['auth:sanctum', 'check.status'])->group(function () {
        // Auth session
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/auth/me', [AuthController::class, 'me']);

        // Profile cá nhân
        Route::prefix('profile')->group(function () {
            Route::get('/', [ProfileController::class, 'show']);
            Route::put('/', [ProfileController::class, 'update']);
            Route::put('/password', [ProfileController::class, 'changePassword']);
        });

        // Reviews
        Route::get('/venues/{venueId}/my-reviewable-bookings', [ReviewController::class, 'getReviewableBookings']);
        Route::post('/reviews', [ReviewController::class, 'store']);

        // Notification Center
        Route::prefix('notifications')->group(function () {
            Route::get('/', [NotificationController::class, 'index']);
            Route::put('/read-all', [NotificationController::class, 'markAllAsRead']);
            Route::put('/{id}/read', [NotificationController::class, 'markAsRead'])->whereNumber('id');
        });

        // Referral Program
        Route::prefix('referral')->group(function () {
            Route::get('/my-code', [ReferralController::class, 'myCode']);
            Route::post('/claim', [ReferralController::class, 'claim'])->middleware('throttle:10,1');
        });

        // Loyalty Program
        Route::prefix('loyalty')->group(function () {
            Route::get('/summary', [LoyaltyController::class, 'summary']);
            Route::get('/history', [LoyaltyController::class, 'history']);
            Route::post('/redeem', [LoyaltyController::class, 'redeem'])->middleware('throttle:10,1');
        });

        // Owner Analytics
        Route::middleware('role:owner')->prefix('owner')->group(function () {
            Route::get('/analytics', [DashboardAnalyticsController::class, 'owner']);
        });

        // Admin Only Routes
        Route::middleware('role:admin')->prefix('admin')->group(function () {
            Route::get('/analytics', [DashboardAnalyticsController::class, 'admin']);
            Route::post('/sport-categories', [SportCategoryController::class, 'store']);
            Route::put('/sport-categories/{id}', [SportCategoryController::class, 'update']);
            Route::delete('/sport-categories/{id}', [SportCategoryController::class, 'destroy']);

            // Admin Review Moderation
            Route::put('/reviews/{id}/status', [ReviewController::class, 'updateStatus']);
        });
    });
});
