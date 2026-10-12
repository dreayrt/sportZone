<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseController;
use Carbon\CarbonInterface;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Throwable;

class DashboardAnalyticsController extends BaseController
{
    private const BOOKING_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'];

    public function owner(Request $request): JsonResponse
    {
        try {
            $ownerId = (int) $request->user()->id;
            $now = now();

            $data = [
                'revenue' => $this->revenueSummary($this->paidRevenueQuery($ownerId), $now),
                'booking_statistics' => $this->bookingStatistics($ownerId),
                'revenue_chart' => $this->sevenDayRevenueChart($this->paidRevenueQuery($ownerId), $now),
                'top_courts' => $this->topCourts($ownerId),
                'peak_hours' => $this->peakHours($ownerId),
            ];

            return $this->successResponse($data, 'Lấy thống kê chủ sân thành công.');
        } catch (Throwable $exception) {
            report($exception);

            return $this->errorResponse('Không thể tải thống kê chủ sân.', 500);
        }
    }

    public function admin(): JsonResponse
    {
        try {
            $now = now();
            $bookingStatistics = $this->bookingStatistics();
            $userCounts = DB::table('users')
                ->select('role', DB::raw('COUNT(*) as total'))
                ->groupBy('role')
                ->pluck('total', 'role');

            $data = [
                'overview' => [
                    'total_gmv' => (int) $this->paidRevenueQuery()->sum('payments.amount'),
                    'total_users' => (int) $userCounts->sum(),
                    'total_customers' => (int) ($userCounts['customer'] ?? 0),
                    'total_owners' => (int) ($userCounts['owner'] ?? 0),
                    'total_venues' => DB::table('venues')->count(),
                    'total_courts' => DB::table('courts')->count(),
                    'total_bookings' => $bookingStatistics['total'],
                    'total_completed_bookings' => $bookingStatistics['completed'],
                ],
                'revenue_chart' => $this->sevenDayRevenueChart($this->paidRevenueQuery(), $now),
                'user_growth' => $this->sevenDayUserGrowth($now),
                'booking_statistics' => $bookingStatistics,
            ];

            return $this->successResponse($data, 'Lấy thống kê quản trị thành công.');
        } catch (Throwable $exception) {
            report($exception);

            return $this->errorResponse('Không thể tải thống kê quản trị.', 500);
        }
    }

    private function paidRevenueQuery(?int $ownerId = null): Builder
    {
        $query = DB::table('payments')
            ->join('bookings', 'bookings.id', '=', 'payments.booking_id')
            ->where('payments.status', 'paid')
            ->whereNotNull('payments.paid_at')
            ->where('bookings.status', '!=', 'cancelled');

        if ($ownerId !== null) {
            $query->join('venues', 'venues.id', '=', 'bookings.venue_id')
                ->where('venues.owner_id', $ownerId);
        }

        return $query;
    }

    /**
     * @return array{today: int, this_week: int, this_month: int, this_year: int}
     */
    private function revenueSummary(Builder $query, CarbonInterface $now): array
    {
        $summary = $query
            ->selectRaw(
                'COALESCE(SUM(CASE WHEN payments.paid_at BETWEEN ? AND ? THEN payments.amount ELSE 0 END), 0) as today,
                COALESCE(SUM(CASE WHEN payments.paid_at BETWEEN ? AND ? THEN payments.amount ELSE 0 END), 0) as this_week,
                COALESCE(SUM(CASE WHEN payments.paid_at BETWEEN ? AND ? THEN payments.amount ELSE 0 END), 0) as this_month,
                COALESCE(SUM(CASE WHEN payments.paid_at BETWEEN ? AND ? THEN payments.amount ELSE 0 END), 0) as this_year',
                [
                    $now->copy()->startOfDay(),
                    $now->copy()->endOfDay(),
                    $now->copy()->startOfWeek(),
                    $now->copy()->endOfWeek(),
                    $now->copy()->startOfMonth(),
                    $now->copy()->endOfMonth(),
                    $now->copy()->startOfYear(),
                    $now->copy()->endOfYear(),
                ]
            )
            ->first();

        return [
            'today' => (int) $summary->today,
            'this_week' => (int) $summary->this_week,
            'this_month' => (int) $summary->this_month,
            'this_year' => (int) $summary->this_year,
        ];
    }

    /**
     * @return array{total: int, pending: int, confirmed: int, completed: int, cancelled: int, no_show: int}
     */
    private function bookingStatistics(?int $ownerId = null): array
    {
        $query = DB::table('bookings')
            ->select('bookings.status', DB::raw('COUNT(*) as total'));

        if ($ownerId !== null) {
            $query->join('venues', 'venues.id', '=', 'bookings.venue_id')
                ->where('venues.owner_id', $ownerId);
        }

        $counts = $query
            ->groupBy('bookings.status')
            ->pluck('total', 'bookings.status');

        $statistics = ['total' => 0];

        foreach (self::BOOKING_STATUSES as $status) {
            $statistics[$status] = (int) ($counts[$status] ?? 0);
            $statistics['total'] += $statistics[$status];
        }

        return $statistics;
    }

    /**
     * @return list<array{date: string, label: string, revenue: int}>
     */
    private function sevenDayRevenueChart(Builder $query, CarbonInterface $now): array
    {
        $startDate = $now->copy()->subDays(6)->startOfDay();
        $endDate = $now->copy()->endOfDay();
        $revenueByDate = $query
            ->whereBetween('payments.paid_at', [$startDate, $endDate])
            ->selectRaw('DATE(payments.paid_at) as revenue_date, SUM(payments.amount) as revenue')
            ->groupByRaw('DATE(payments.paid_at)')
            ->pluck('revenue', 'revenue_date');

        $chart = [];

        for ($offset = 0; $offset < 7; $offset++) {
            $date = $startDate->copy()->addDays($offset);
            $dateKey = $date->toDateString();
            $chart[] = [
                'date' => $dateKey,
                'label' => $date->format('d/m'),
                'revenue' => (int) ($revenueByDate[$dateKey] ?? 0),
            ];
        }

        return $chart;
    }

    /**
     * @return list<array{court_id: int, court_name: string, venue_name: string, total_bookings: int, revenue: int}>
     */
    private function topCourts(int $ownerId): array
    {
        $paidByBooking = DB::table('payments')
            ->select('booking_id', DB::raw('SUM(amount) as paid_revenue'))
            ->where('status', 'paid')
            ->whereNotNull('paid_at')
            ->groupBy('booking_id');

        return DB::table('bookings')
            ->join('courts', 'courts.id', '=', 'bookings.court_id')
            ->join('venues', 'venues.id', '=', 'bookings.venue_id')
            ->leftJoinSub($paidByBooking, 'paid_by_booking', function ($join): void {
                $join->on('paid_by_booking.booking_id', '=', 'bookings.id');
            })
            ->where('venues.owner_id', $ownerId)
            ->where('bookings.status', '!=', 'cancelled')
            ->select([
                'courts.id as court_id',
                'courts.name as court_name',
                'venues.name as venue_name',
            ])
            ->selectRaw('COUNT(bookings.id) as total_bookings, COALESCE(SUM(paid_by_booking.paid_revenue), 0) as revenue')
            ->groupBy('courts.id', 'courts.name', 'venues.id', 'venues.name')
            ->orderByDesc('total_bookings')
            ->orderByDesc('revenue')
            ->orderBy('courts.id')
            ->limit(5)
            ->get()
            ->map(fn (object $court): array => [
                'court_id' => (int) $court->court_id,
                'court_name' => $court->court_name,
                'venue_name' => $court->venue_name,
                'total_bookings' => (int) $court->total_bookings,
                'revenue' => (int) $court->revenue,
            ])
            ->all();
    }

    /**
     * @return list<array{hour: int, label: string, booking_count: int}>
     */
    private function peakHours(int $ownerId): array
    {
        return DB::table('bookings')
            ->join('venues', 'venues.id', '=', 'bookings.venue_id')
            ->where('venues.owner_id', $ownerId)
            ->where('bookings.status', '!=', 'cancelled')
            ->selectRaw('HOUR(bookings.start_time) as booking_hour, COUNT(*) as booking_count')
            ->groupByRaw('HOUR(bookings.start_time)')
            ->orderByDesc('booking_count')
            ->orderBy('booking_hour')
            ->limit(5)
            ->get()
            ->map(function (object $row): array {
                $hour = (int) $row->booking_hour;

                return [
                    'hour' => $hour,
                    'label' => sprintf('%02d:00 - %02d:00', $hour, ($hour + 1) % 24),
                    'booking_count' => (int) $row->booking_count,
                ];
            })
            ->all();
    }

    /**
     * @return list<array{date: string, label: string, new_users: int}>
     */
    private function sevenDayUserGrowth(CarbonInterface $now): array
    {
        $startDate = $now->copy()->subDays(6)->startOfDay();
        $endDate = $now->copy()->endOfDay();
        $usersByDate = DB::table('users')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->selectRaw('DATE(created_at) as joined_date, COUNT(*) as new_users')
            ->groupByRaw('DATE(created_at)')
            ->pluck('new_users', 'joined_date');

        $chart = [];

        for ($offset = 0; $offset < 7; $offset++) {
            $date = $startDate->copy()->addDays($offset);
            $dateKey = $date->toDateString();
            $chart[] = [
                'date' => $dateKey,
                'label' => $date->format('d/m'),
                'new_users' => (int) ($usersByDate[$dateKey] ?? 0),
            ];
        }

        return $chart;
    }
}
