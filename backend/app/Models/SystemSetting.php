<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SystemSetting extends Model
{
    protected $table = 'system_settings';

    protected $primaryKey = 'setting_key';

    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false;

    protected $fillable = [
        'setting_key',
        'setting_value',
        'description',
    ];

    protected function casts(): array
    {
        return [
            'updated_at' => 'datetime',
        ];
    }

    /**
     * Lấy giá trị setting theo key, hỗ trợ fallback default
     */
    public static function getVal(string $key, ?string $default = null): ?string
    {
        $setting = static::find($key);
        return $setting ? $setting->setting_value : $default;
    }
}
