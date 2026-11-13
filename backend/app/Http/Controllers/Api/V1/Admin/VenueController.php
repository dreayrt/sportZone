<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\BaseController;
use App\Models\AuditLog;
use App\Models\Booking;
use App\Models\Payment;
use App\Models\Venue;
use App\Services\VenueDirectory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class VenueController extends BaseController
{
    public function __construct(private VenueDirectory $directory) {}

    private function monitoredVenues(): Builder
    {
        return Venue::with('owner:id,full_name,phone,email,status')
            ->withCount(['courts', 'bookings', 'courts as active_courts_count' => fn ($q) => $q->where('status', 'active'),
                'courts as maintenance_courts_count' => fn ($q) => $q->where('status', 'maintenance'),
                'bookings as today_bookings_count' => fn ($q) => $q->whereDate('booking_date', today())->where('status', '!=', 'cancelled'),
                'bookings as upcoming_bookings_count' => fn ($q) => $q->whereNotIn('status', ['cancelled', 'completed', 'no_show'])->where(fn ($date) => $date->whereDate('booking_date', '>', today())->orWhere(fn ($current) => $current->whereDate('booking_date', today())->where('end_time', '>', now()->format('H:i:s')))),
            ])
            ->addSelect(['paid_revenue' => Payment::selectRaw('COALESCE(SUM(payments.amount), 0)')
                ->join('bookings', 'bookings.id', '=', 'payments.booking_id')->whereColumn('bookings.venue_id', 'venues.id')
                ->where('payments.status', 'paid')->whereNotNull('payments.paid_at')->where('bookings.status', '!=', 'cancelled'),
                'monthly_revenue' => Payment::selectRaw('COALESCE(SUM(payments.amount), 0)')
                    ->join('bookings', 'bookings.id', '=', 'payments.booking_id')->whereColumn('bookings.venue_id', 'venues.id')
                    ->where('payments.status', 'paid')->whereBetween('payments.paid_at', [now()->startOfMonth(), now()->endOfMonth()])->where('bookings.status', '!=', 'cancelled'),
            ]);
    }

    private function statusVersion(Venue $venue): string
    {
        return hash('sha256', json_encode([$venue->status, $venue->admin_suspended_at?->toIso8601String(), $venue->admin_suspension_reason, $venue->admin_suspended_by, $venue->updated_at?->toIso8601String()], JSON_THROW_ON_ERROR));
    }

    private function withVersion(Venue $venue): Venue
    {
        $venue->setAttribute('status_version', $this->statusVersion($venue));

        return $venue;
    }

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate(['search' => ['nullable', 'string', 'max:150'], 'city' => ['nullable', 'string', 'max:100'], 'sort' => ['nullable', 'in:newest,name,revenue,bookings'], 'status' => ['nullable', 'in:active,inactive,pending,suspended'], 'page' => ['nullable', 'integer', 'min:1'], 'per_page' => ['nullable', 'integer', 'between:1,100']]);
        $query = $this->monitoredVenues();
        if (! empty($data['search'])) {
            $keyword = '%'.$data['search'].'%';
            $query->where(fn ($q) => $q->where('name', 'like', $keyword)->orWhere('code', 'like', $keyword)->orWhere('city', 'like', $keyword)->orWhere('district', 'like', $keyword)->orWhere('address', 'like', $keyword)->orWhere('phone', 'like', $keyword)
                ->orWhereHas('owner', fn ($owner) => $owner->where('full_name', 'like', $keyword)->orWhere('phone', 'like', $keyword)->orWhere('email', 'like', $keyword)));
        }
        $query->when($data['city'] ?? null, fn ($q, $city) => $q->where('city', $city));
        if (($data['status'] ?? '') === 'suspended') {
            $query->whereNotNull('admin_suspended_at');
        } elseif (! empty($data['status'])) {
            $query->whereNull('admin_suspended_at')->where('status', $data['status']);
        }

        match ($data['sort'] ?? 'newest') {
            'name' => $query->orderBy('name'),
            'revenue' => $query->orderByDesc('paid_revenue'),
            'bookings' => $query->orderByDesc('bookings_count'),
            default => $query->orderByDesc('id'),
        };
        $venues = $query->orderBy('venues.id')->paginate($data['per_page'] ?? 12);
        $venues->getCollection()->each(fn (Venue $venue) => $this->withVersion($venue));
        $counts = Venue::selectRaw("COUNT(*) as total, SUM(CASE WHEN admin_suspended_at IS NULL AND status = 'active' THEN 1 ELSE 0 END) as active, SUM(CASE WHEN admin_suspended_at IS NOT NULL THEN 1 ELSE 0 END) as suspended, SUM(CASE WHEN admin_suspended_at IS NULL AND status = 'inactive' THEN 1 ELSE 0 END) as inactive, SUM(CASE WHEN admin_suspended_at IS NULL AND status = 'pending' THEN 1 ELSE 0 END) as pending")->first();

        return $this->successResponse(array_merge($venues->toArray(), [
            'summary' => collect($counts->only(['total', 'active', 'suspended', 'inactive', 'pending']))->map(fn ($count) => (int) $count)->all(),
            'cities' => Venue::whereNotNull('city')->where('city', '!=', '')->distinct()->orderBy('city')->pluck('city'),
        ]));
    }

    public function show(Request $request, int $venue): JsonResponse
    {
        $filters = $request->validate(['booking_search' => ['nullable', 'string', 'max:120'], 'booking_date' => ['nullable', 'date_format:Y-m-d'], 'payment_status' => ['nullable', 'in:unpaid,partial,paid,refunded'], 'bookings_page' => ['nullable', 'integer', 'min:1'], 'history_page' => ['nullable', 'integer', 'min:1']]);
        $facility = $this->withVersion($this->monitoredVenues()->with('courts.sportCategory:id,name')->findOrFail($venue));
        $bookings = Booking::with('court:id,name')->where('venue_id', $venue)
            ->when($filters['booking_search'] ?? null, fn ($q, $search) => $q->where(fn ($term) => $term->where('booking_code', 'like', '%'.$search.'%')->orWhere('customer_name', 'like', '%'.$search.'%')->orWhere('customer_phone', 'like', '%'.$search.'%')))
            ->when($filters['booking_date'] ?? null, fn ($q, $date) => $q->whereDate('booking_date', $date))
            ->when($filters['payment_status'] ?? null, fn ($q, $status) => $q->where('payment_status', $status))
            ->orderByDesc('id')->paginate(10, ['*'], 'bookings_page');
        $history = AuditLog::with('user:id,full_name')->where('entity_type', 'venues')->where('entity_id', $venue)->orderByDesc('id')->paginate(10, ['*'], 'history_page');

        return $this->successResponse(['venue' => $facility, 'bookings' => $bookings, 'history' => $history->items(), 'history_pagination' => collect($history->toArray())->only(['current_page', 'last_page', 'total', 'per_page'])->all()]);
    }

    public function updateStatus(Request $request, Venue $venue): JsonResponse
    {
        $data = $request->validate(['suspended' => ['required', 'boolean'], 'reason' => ['required', 'string', 'min:5', 'max:500'], 'expected_version' => ['nullable', 'string', 'size:64']]);
        $facility = DB::transaction(function () use ($venue, $request, $data): Venue {
            $locked = Venue::lockForUpdate()->findOrFail($venue->id);
            abort_if(isset($data['expected_version']) && ! hash_equals($this->statusVersion($locked), $data['expected_version']), 409, 'Thông tin cơ sở đã thay đổi. Vui lòng tải lại trạng thái trước khi tiếp tục.');
            abort_if((bool) $data['suspended'] === ($locked->admin_suspended_at !== null), 409, 'Cơ sở đã ở trạng thái này. Vui lòng tải lại thông tin mới nhất.');
            $locked->forceFill([
                'admin_suspended_at' => $data['suspended'] ? now() : null,
                'admin_suspension_reason' => $data['suspended'] ? $data['reason'] : null,
                'admin_suspended_by' => $data['suspended'] ? $request->user()->id : null,
            ])->save();

            return $locked;
        });
        $this->directory->invalidate();

        return $this->successResponse($facility, $data['suspended'] ? 'Đã tạm dừng nhận đặt sân mới tại cơ sở.' : 'Đã gỡ tạm dừng của quản trị viên.');
    }
}
