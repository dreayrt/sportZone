<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::transaction(function (): void {
            DB::table('bookings')->where('status', 'pending')->lockForUpdate()->chunkById(500, function ($bookings): void {
                $ids = $bookings->pluck('id')->all();
                DB::table('bookings')->whereIn('id', $ids)->update(['status' => 'confirmed', 'updated_at' => now()]);
                DB::table('booking_status_history')->insert($bookings->map(fn ($booking) => [
                    'booking_id' => $booking->id,
                    'old_status' => 'pending',
                    'new_status' => 'confirmed',
                    'note' => 'Đồng bộ đơn sang luồng đặt sân tự động, không cần duyệt thủ công.',
                    'changed_by' => null,
                    'created_at' => now(),
                ])->all());
            });
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Preserve booking decisions and payment history when rolling back code.
    }
};
