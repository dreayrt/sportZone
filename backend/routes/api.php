<?php

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
    });

    // Public Sport Categories
    Route::get('/sport-categories', [SportCategoryController::class, 'index']);
    Route::get('/sport-categories/{idOrCode}', [SportCategoryController::class, 'show']);

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

        // Admin Only Routes
        Route::middleware('role:admin')->prefix('admin')->group(function () {
            Route::post('/sport-categories', [SportCategoryController::class, 'store']);
            Route::put('/sport-categories/{id}', [SportCategoryController::class, 'update']);
            Route::delete('/sport-categories/{id}', [SportCategoryController::class, 'destroy']);
        });
    });
});
