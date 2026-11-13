<?php

namespace App\Console\Commands;

use App\Services\BookingService;
use Illuminate\Console\Command;

class MarkNoShowBookingsCommand extends Command
{
    /**
     * Tên và cú pháp của lệnh Artisan
     */
    protected $signature = 'bookings:mark-no-shows {--venue= : ID cơ sở cụ thể cần quét}';

    /**
     * Mô tả lệnh
     */
    protected $description = 'Tự động quét và cập nhật các đơn đặt sân đã quá giờ thi đấu mà chưa check-in thành Khách không đến (no_show)';

    /**
     * Thực thi lệnh
     */
    public function handle(BookingService $bookingService): int
    {
        $venueId = $this->option('venue') ? (int) $this->option('venue') : null;
        $this->info('Bắt đầu quét các đơn đặt sân quá giờ thi đấu...');

        $result = $bookingService->autoFinalizeExpiredBookings(null, $venueId);

        $this->info("Kết quả: Đã hoàn thành {$result['completed']} đơn, ghi nhận {$result['no_shows']} đơn khách không đến.");

        return Command::SUCCESS;
    }
}

