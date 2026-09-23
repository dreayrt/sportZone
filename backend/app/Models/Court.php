<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Court extends Model
{
    use HasFactory;

    protected $table = 'courts';

    protected $fillable = [
        'venue_id',
        'sport_category_id',
        'code',
        'name',
        'surface_type',
        'indoor',
        'capacity',
        'hourly_rate_standard',
        'hourly_rate_peak',
        'peak_start',
        'peak_end',
        'min_booking_minutes',
        'slot_minutes',
        'description',
        'image',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'indoor' => 'boolean',
            'capacity' => 'integer',
            'hourly_rate_standard' => 'integer',
            'hourly_rate_peak' => 'integer',
            'min_booking_minutes' => 'integer',
            'slot_minutes' => 'integer',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function venue(): BelongsTo
    {
        return $this->belongsTo(Venue::class, 'venue_id');
    }

    public function sportCategory(): BelongsTo
    {
        return $this->belongsTo(SportCategory::class, 'sport_category_id');
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class, 'court_id');
    }
}
