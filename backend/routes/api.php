<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\BookingController;
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

    // Public Court Slots & Calendar Timeline
    Route::get('/courts/{courtId}/slots', [BookingController::class, 'getCourtSlots']);
    Route::get('/venues/{venueId}/timeline', [BookingController::class, 'getTimeline']);
    Route::get('/owner/calendar', [BookingController::class, 'getTimeline']);

    // Đặt sân công khai (hỗ trợ cả khách vãng lai lẫn user đã đăng nhập)
    Route::post('/bookings', [BookingController::class, 'store']);
    Route::get('/bookings/lookup/{idOrCode}', [BookingController::class, 'show']);

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

        // Booking Quản lý (Customer / Owner / Admin)
        Route::prefix('bookings')->group(function () {
            Route::get('/', [BookingController::class, 'index']);
            Route::get('/{idOrCode}', [BookingController::class, 'show']);
            Route::put('/{id}', [BookingController::class, 'update']);
            Route::post('/{id}/cancel', [BookingController::class, 'cancel']);
            Route::post('/{id}/check-in', [BookingController::class, 'checkIn']);

            // Quản lý dịch vụ đi kèm trong đơn đặt (Addons)
            Route::post('/{id}/addons', [BookingController::class, 'addAddon']);
            Route::delete('/{id}/addons/{addonId}', [BookingController::class, 'removeAddon']);
        });

        // Owner & Admin Booking Report Export & Auto Cancel Unpaid
        Route::get('/owner/bookings/export', [BookingController::class, 'export']);
        Route::post('/owner/bookings/cancel-unpaid', [BookingController::class, 'cancelUnpaid']);

        // Admin Only Routes
        Route::middleware('role:admin')->prefix('admin')->group(function () {
            Route::post('/sport-categories', [SportCategoryController::class, 'store']);
            Route::put('/sport-categories/{id}', [SportCategoryController::class, 'update']);
            Route::delete('/sport-categories/{id}', [SportCategoryController::class, 'destroy']);
        });
    });
});
