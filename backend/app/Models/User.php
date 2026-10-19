<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $table = 'users';

    protected $fillable = [
        'full_name',
        'email',
        'phone',
        'password_hash',
        'role',
        'status',
        'avatar',
        'last_login_at',
    ];

    protected $hidden = [
        'password_hash',
        'remember_token',
    ];

    protected $appends = [
        'has_password',
    ];

    /**
     * User đăng nhập OAuth có thể chưa đặt mật khẩu.
     */
    public function getHasPasswordAttribute(): bool
    {
        return !empty($this->password_hash);
    }

    protected function casts(): array
    {
        return [
            'last_login_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * Override lấy password hash cho Authentication của Laravel
     */
    public function getAuthPassword(): ?string
    {
        return $this->password_hash;
    }

    /**
     * Set password mutator tự động hash vào cột password_hash
     */
    public function setPasswordAttribute(?string $value): void
    {
        if ($value) {
            $this->attributes['password_hash'] = Hash::needsRehash($value) ? Hash::make($value) : $value;
        }
    }

    // Role helpers
    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isOwner(): bool
    {
        return $this->role === 'owner';
    }

    public function isCustomer(): bool
    {
        return $this->role === 'customer';
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    // Relationships
    public function venues(): HasMany
    {
        return $this->hasMany(Venue::class, 'owner_id');
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class, 'user_id');
    }

    public function socialAccounts(): HasMany
    {
        return $this->hasMany(SocialAccount::class, 'user_id');
    }

    public function points(): HasOne
    {
        return $this->hasOne(UserPoint::class, 'user_id');
    }

    public function pointTransactions(): HasMany
    {
        return $this->hasMany(PointTransaction::class, 'user_id');
    }

    public function referralCode(): HasOne
    {
        return $this->hasOne(ReferralCode::class, 'user_id');
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class, 'user_id');
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class, 'user_id');
    }

    public function searchHistories(): HasMany
    {
        return $this->hasMany(UserSearchHistory::class, 'user_id');
    }
}
