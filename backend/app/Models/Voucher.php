<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Voucher extends Model
{
    use HasFactory;

    protected $table = 'vouchers';

    public $timestamps = false;

    protected $fillable = [
        'code',
        'name',
        'discount_type',
        'discount_value',
        'max_discount',
        'min_order_value',
        'usage_limit',
        'used_count',
        'starts_at',
        'ends_at',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'discount_value' => 'integer',
            'max_discount' => 'integer',
            'min_order_value' => 'integer',
            'usage_limit' => 'integer',
            'used_count' => 'integer',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class, 'voucher_id');
    }

    public function isValid(int $orderValue = 0): bool
    {
        $now = now();

        if ($this->status !== 'active') {
            return false;
        }

        if ($now->lt($this->starts_at) || $now->gt($this->ends_at)) {
            return false;
        }

        if ($this->usage_limit !== null && $this->used_count >= $this->usage_limit) {
            return false;
        }

        if ($orderValue < $this->min_order_value) {
            return false;
        }

        return true;
    }
}
