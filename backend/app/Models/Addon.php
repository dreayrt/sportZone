<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Addon extends Model
{
    use HasFactory;

    protected $table = 'addons';

    public $timestamps = false;

    protected $fillable = [
        'code',
        'name',
        'category',
        'price',
        'unit',
        'stock_quantity',
        'image',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'integer',
            'stock_quantity' => 'integer',
            'created_at' => 'datetime',
        ];
    }

    public function bookingAddons(): HasMany
    {
        return $this->hasMany(BookingAddon::class, 'addon_id');
    }
}
