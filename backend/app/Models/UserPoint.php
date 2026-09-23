<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserPoint extends Model
{
    use HasFactory;

    protected $table = 'user_points';

    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'total_points',
        'lifetime_points',
        'tier',
        'tier_updated_at',
    ];

    protected function casts(): array
    {
        return [
            'total_points' => 'integer',
            'lifetime_points' => 'integer',
            'tier_updated_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
