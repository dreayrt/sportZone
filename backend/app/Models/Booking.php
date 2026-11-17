<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;

class Booking extends Model
{
    use HasFactory;

    public const PAYMENT_TIMEOUT_MINUTES = 30;

    public function paymentExpiresAt(): Carbon
    {
        return $this->created_at->copy()->addMinutes(self::PAYMENT_TIMEOUT_MINUTES);
    }

    public function isPaymentExpired(): bool
    {
        return $this->payment_method === 'vietqr'
            && in_array($this->payment_status, ['unpaid', 'partial'], true)
            && now()->greaterThanOrEqualTo($this->paymentExpiresAt());
    }

    protected $table = 'bookings';

    protected $fillable = [
        'booking_code',
        'user_id',
        'venue_id',
        'court_id',
        'voucher_id',
        'source',
        'booking_date',
        'start_time',
        'end_time',
        'customer_name',
        'customer_phone',
        'customer_email',
        'note',
        'court_fee',
        'addons_fee',
        'discount_amount',
        'total_price',
        'status',
        'payment_status',
        'payment_method',
        'checked_in',
        'checked_in_at',
        'cancelled_at',
        'cancel_reason',
        'recurrence_group_id',
        'recurrence_frequency',
        'recurrence_discount_percent',
    ];

    protected function casts(): array
    {
        return [
            'booking_date' => 'date:Y-m-d',
            'court_fee' => 'integer',
            'addons_fee' => 'integer',
            'discount_amount' => 'integer',
            'total_price' => 'integer',
            'recurrence_discount_percent' => 'integer',
            'checked_in' => 'boolean',
            'checked_in_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function venue(): BelongsTo
    {
        return $this->belongsTo(Venue::class, 'venue_id');
    }

    public function court(): BelongsTo
    {
        return $this->belongsTo(Court::class, 'court_id');
    }

    public function voucher(): BelongsTo
    {
        return $this->belongsTo(Voucher::class, 'voucher_id');
    }

    public function bookingAddons(): HasMany
    {
        return $this->hasMany(BookingAddon::class, 'booking_id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class, 'booking_id');
    }

    public function statusHistories(): HasMany
    {
        return $this->hasMany(BookingStatusHistory::class, 'booking_id');
    }

    public function review(): HasOne
    {
        return $this->hasOne(Review::class, 'booking_id');
    }
}
