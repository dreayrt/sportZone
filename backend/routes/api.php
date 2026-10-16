<?php

use App\Http\Controllers\Api\V1\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\HealthCheckController;
use App\Http\Controllers\Api\V1\ProfileController;
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

        // Admin Only Routes
        Route::middleware('role:admin')->prefix('admin')->group(function () {
            Route::post('/sport-categories', [SportCategoryController::class, 'store']);
            Route::put('/sport-categories/{id}', [SportCategoryController::class, 'update']);
            Route::delete('/sport-categories/{id}', [SportCategoryController::class, 'destroy']);

            // Quản lý người dùng
            Route::get('/users', [AdminUserController::class, 'index']);
            Route::put('/users/{id}/status', [AdminUserController::class, 'updateStatus']);
            Route::put('/users/{id}/role', [AdminUserController::class, 'updateRole']);
        });
    });
});
