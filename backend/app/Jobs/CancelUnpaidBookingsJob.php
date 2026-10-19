<?php

namespace App\Jobs;

use App\Services\BookingService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class CancelUnpaidBookingsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Số phút hết hạn thanh toán
     */
    protected int $expireMinutes;

    public function __construct(int $expireMinutes = 30)
    {
        $this->expireMinutes = $expireMinutes;
    }

    /**
     * Thực thi Job hủy các đơn unpaid quá hạn
     */
    public function handle(BookingService $bookingService): void
    {
        $count = $bookingService->cancelUnpaidBookings($this->expireMinutes);

        if ($count > 0) {
            Log::info("CancelUnpaidBookingsJob: Đã tự động hủy {$count} đơn đặt sân unpaid quá {$this->expireMinutes} phút.");
        }
    }
}
