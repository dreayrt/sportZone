<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReferralReward extends Model
{
    use HasFactory;

    protected $table = 'referral_rewards';

    public $timestamps = false;

    protected $fillable = [
        'referrer_id',
        'referred_id',
        'referral_code_id',
        'reward_type',
        'referrer_reward_value',
        'referred_reward_value',
        'status',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'referrer_reward_value' => 'integer',
            'referred_reward_value' => 'integer',
            'completed_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    public function referrer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'referrer_id');
    }

    public function referred(): BelongsTo
    {
        return $this->belongsTo(User::class, 'referred_id');
    }

    public function referralCode(): BelongsTo
    {
        return $this->belongsTo(ReferralCode::class, 'referral_code_id');
    }
}
