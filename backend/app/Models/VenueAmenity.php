<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VenueAmenity extends Model
{
    use HasFactory;

    protected $table = 'venue_amenities';

    public $timestamps = false;

    protected $fillable = [
        'venue_id',
        'name',
        'icon',
    ];

    public function venue(): BelongsTo
    {
        return $this->belongsTo(Venue::class, 'venue_id');
    }
}
