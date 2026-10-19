<?php

namespace App\Console\Commands;

use App\Models\Booking;
use App\Models\Notification;
use Carbon\CarbonImmutable;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

#[Signature('sportzone:send-reminders')]
#[Description('Tạo thông báo nhắc lịch cho các booking bắt đầu trong 60 phút tới')]
class SendBookingReminders extends Command
{
    private const REMINDER_WINDOW_MINUTES = 60;

    private const CHUNK_SIZE = 200;

    private const RESULT_CREATED = 'created';

    private const RESULT_DUPLICATE = 'duplicate';

    private const RESULT_SKIPPED = 'skipped';

    /** @var list<string> */
    private const ELIGIBLE_STATUSES = ['pending', 'confirmed'];

    public function handle(): int
    {
        $timezone = (string) config('app.timezone', 'UTC');
        $now = CarbonImmutable::now($timezone);
        $windowEnd = $now->addMinutes(self::REMINDER_WINDOW_MINUTES);
        $scanned = 0;
        $created = 0;
        $skipped = 0;
        $errors = 0;

        Booking::query()
            ->select('id')
            ->whereNotNull('user_id')
            ->whereIn('status', self::ELIGIBLE_STATUSES)
            ->whereBetween('booking_date', [$now->toDateString(), $windowEnd->toDateString()])
            ->orderBy('id')
            ->chunkById(self::CHUNK_SIZE, function ($bookings) use (
                $now,
                $windowEnd,
                $timezone,
                &$scanned,
                &$created,
                &$skipped,
                &$errors,
            ): void {
                foreach ($bookings as $booking) {
                    $scanned++;

                    try {
                        $result = $this->createReminder(
                            (int) $booking->id,
                            $now,
                            $windowEnd,
                            $timezone,
                        );

                        if ($result === self::RESULT_CREATED) {
                            $created++;
                        } else {
                            $skipped++;
                        }
                    } catch (Throwable $exception) {
                        $errors++;
                        $skipped++;

                        Log::error('Không thể tạo thông báo nhắc lịch đặt sân.', [
                            'booking_id' => (int) $booking->id,
                            'exception' => $exception,
                        ]);
                    }
                }
            });

        $summary = [
            'scanned' => $scanned,
            'created' => $created,
            'skipped' => $skipped,
            'errors' => $errors,
            'window_start' => $now->toIso8601String(),
            'window_end' => $windowEnd->toIso8601String(),
            'timezone' => $timezone,
        ];

        Log::info('Đã hoàn tất tác vụ nhắc lịch đặt sân SportZone.', $summary);

        $this->info(sprintf(
            'Đã quét %d booking, tạo %d reminder, bỏ qua %d, lỗi %d.',
            $scanned,
            $created,
            $skipped,
            $errors,
        ));

        return self::SUCCESS;
    }

    private function createReminder(
        int $bookingId,
        CarbonImmutable $now,
        CarbonImmutable $windowEnd,
        string $timezone,
    ): string {
        return DB::transaction(function () use ($bookingId, $now, $windowEnd, $timezone): string {
            $booking = Booking::query()
                ->with(['court:id,name', 'venue:id,name'])
                ->whereKey($bookingId)
                ->lockForUpdate()
                ->first();

            if (! $booking
                || $booking->user_id === null
                || ! in_array($booking->status, self::ELIGIBLE_STATUSES, true)) {
                return self::RESULT_SKIPPED;
            }

            $startsAt = CarbonImmutable::parse(
                $booking->booking_date->format('Y-m-d').' '.$booking->start_time,
                $timezone,
            );

            if (! $startsAt->greaterThan($now) || $startsAt->greaterThan($windowEnd)) {
                return self::RESULT_SKIPPED;
            }

            $alreadyExists = Notification::query()
                ->where('type', 'booking_reminder')
                ->where('reference_type', 'booking')
                ->where('reference_id', $booking->id)
                ->exists();

            if ($alreadyExists) {
                return self::RESULT_DUPLICATE;
            }

            $courtName = $booking->court?->name ?? 'sân đã đặt';
            $venueName = $booking->venue?->name;
            $location = $venueName ? "{$courtName} tại {$venueName}" : $courtName;
            $dayLabel = $startsAt->isSameDay($now) ? 'hôm nay' : 'ngày mai';

            Notification::create([
                'user_id' => $booking->user_id,
                'type' => 'booking_reminder',
                'title' => 'Nhắc lịch đặt sân',
                'message' => sprintf(
                    'Bạn có lịch chơi tại %s lúc %s %s. Vui lòng đến sớm 10 phút.',
                    $location,
                    $startsAt->format('H:i'),
                    $dayLabel,
                ),
                'reference_type' => 'booking',
                'reference_id' => $booking->id,
                'channel' => 'in_app',
                'is_read' => false,
                'scheduled_at' => $startsAt->subMinutes(self::REMINDER_WINDOW_MINUTES),
                'sent_at' => $now,
            ]);

            return self::RESULT_CREATED;
        }, 3);
    }
}
