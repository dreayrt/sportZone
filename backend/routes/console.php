<?php

use App\Models\Booking;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('sportzone:send-reminders')
    ->everyFiveMinutes()
    ->timezone(config('app.timezone'))
    ->withoutOverlapping(10);
Schedule::command('bookings:cancel-unpaid --minutes='.Booking::PAYMENT_TIMEOUT_MINUTES)
    ->everyMinute()
    ->withoutOverlapping();

// Tự động quét và chuyển đơn quá giờ chưa check-in thành Khách không đến (no_show) mỗi 10 phút
Schedule::command('bookings:mark-no-shows')->everyTenMinutes();
Schedule::call(fn () => DB::table('booking_holds')->where('expires_at', '<=', now())->delete())->hourly();
