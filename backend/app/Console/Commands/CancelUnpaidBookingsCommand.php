<?php

namespace App\Console\Commands;

use App\Services\BookingService;
use Illuminate\Console\Command;

class CancelUnpaidBookingsCommand extends Command
{
    /**
     * Tên và cú pháp của lệnh Artisan
     */
    protected $signature = 'bookings:cancel-unpaid {--minutes=30 : Số phút hết hạn thanh toán}';

    /**
     * Mô tả lệnh
     */
    protected $description = 'Tự động quét và hủy các đơn đặt sân chưa thanh toán sau X phút';

    /**
     * Thực thi lệnh
     */
    public function handle(BookingService $bookingService): int
    {
        $minutes = (int) $this->option('minutes');
        $this->info("Bắt đầu quét các đơn đặt sân unpaid quá {$minutes} phút...");

        $cancelledCount = $bookingService->cancelUnpaidBookings($minutes);

        if ($cancelledCount > 0) {
            $this->info("Đã hủy thành công {$cancelledCount} đơn đặt sân quá hạn thanh toán.");
        } else {
            $this->comment("Không có đơn đặt sân nào cần hủy.");
        }

        return Command::SUCCESS;
    }
}
