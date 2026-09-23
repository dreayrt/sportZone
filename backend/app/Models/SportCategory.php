<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SportCategory extends Model
{
    use HasFactory;

    protected $table = 'sport_categories';

    public $timestamps = false;

    protected $fillable = [
        'code',
        'name',
        'description',
        'banner_image',
        'is_active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'sort_order' => 'integer',
            'created_at' => 'datetime',
        ];
    }

    public function courts(): HasMany
    {
        return $this->hasMany(Court::class, 'sport_category_id');
    }

    public function searchHistories(): HasMany
    {
        return $this->hasMany(UserSearchHistory::class, 'sport_category_id');
    }
}
