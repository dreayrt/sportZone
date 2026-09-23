<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ReferralCode extends Model
{
    use HasFactory;

    protected $table = 'referral_codes';

    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'code',
        'total_referrals',
        'total_rewards',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'total_referrals' => 'integer',
            'total_rewards' => 'integer',
            'is_active' => 'boolean',
            'created_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function rewards(): HasMany
    {
        return $this->hasMany(ReferralReward::class, 'referral_code_id');
    }
}
