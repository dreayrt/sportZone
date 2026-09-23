<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Venue extends Model
{
    use HasFactory;

    protected $table = 'venues';

    protected $fillable = [
        'owner_id',
        'code',
        'name',
        'slug',
        'description',
        'address',
        'ward',
        'district',
        'city',
        'latitude',
        'longitude',
        'phone',
        'email',
        'open_time',
        'close_time',
        'rating',
        'review_count',
        'image',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'rating' => 'decimal:1',
            'review_count' => 'integer',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function amenities(): HasMany
    {
        return $this->hasMany(VenueAmenity::class, 'venue_id');
    }

    public function courts(): HasMany
    {
        return $this->hasMany(Court::class, 'venue_id');
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class, 'venue_id');
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class, 'venue_id');
    }
}
