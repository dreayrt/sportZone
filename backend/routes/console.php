<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('sportzone:send-reminders')
    ->everyFiveMinutes()
    ->timezone(config('app.timezone'))
    ->withoutOverlapping(10);
// Tự động quét và hủy đơn đặt sân unpaid quá 30 phút mỗi 15 phút
\Illuminate\Support\Facades\Schedule::command('bookings:cancel-unpaid --minutes=30')->everyFifteenMinutes();
