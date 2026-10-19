<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Endpoint dự phòng nếu SePay gọi trực tiếp vào domain gốc /hooks/sepay-payment
Route::post('/hooks/sepay-payment', [\App\Http\Controllers\Api\V1\PaymentController::class, 'handleSepayWebhook'])
    ->middleware('sepay.verify');

