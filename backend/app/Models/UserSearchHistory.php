<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserSearchHistory extends Model
{
    use HasFactory;

    protected $table = 'user_search_history';

    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'session_id',
        'search_query',
        'sport_category_id',
        'city',
        'district',
        'latitude',
        'longitude',
        'filters_json',
        'result_count',
        'clicked_venue_id',
        'clicked_court_id',
        'converted_booking_id',
    ];

    protected function casts(): array
    {
        return [
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'filters_json' => 'array',
            'result_count' => 'integer',
            'created_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function sportCategory(): BelongsTo
    {
        return $this->belongsTo(SportCategory::class, 'sport_category_id');
    }

    public function clickedVenue(): BelongsTo
    {
        return $this->belongsTo(Venue::class, 'clicked_venue_id');
    }

    public function clickedCourt(): BelongsTo
    {
        return $this->belongsTo(Court::class, 'clicked_court_id');
    }

    public function convertedBooking(): BelongsTo
    {
        return $this->belongsTo(Booking::class, 'converted_booking_id');
    }
}
