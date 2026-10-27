<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MatchPost extends Model
{
    use HasFactory;

    protected $table = 'match_posts';

    protected $fillable = [
        'user_id',
        'sport_category_id',
        'venue_id',
        'court_id',
        'title',
        'description',
        'match_date',
        'start_time',
        'end_time',
        'location_note',
        'skill_level',
        'required_members',
        'current_members',
        'estimated_cost_per_person',
        'contact_phone',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'match_date' => 'date',
            'required_members' => 'integer',
            'current_members' => 'integer',
            'estimated_cost_per_person' => 'integer',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function sportCategory(): BelongsTo
    {
        return $this->belongsTo(SportCategory::class, 'sport_category_id');
    }

    public function venue(): BelongsTo
    {
        return $this->belongsTo(Venue::class, 'venue_id');
    }

    public function court(): BelongsTo
    {
        return $this->belongsTo(Court::class, 'court_id');
    }

    public function members(): HasMany
    {
        return $this->hasMany(MatchMember::class, 'match_post_id');
    }

    public function acceptedMembers(): HasMany
    {
        return $this->hasMany(MatchMember::class, 'match_post_id')->where('status', 'accepted');
    }

    public function pendingMembers(): HasMany
    {
        return $this->hasMany(MatchMember::class, 'match_post_id')->where('status', 'pending');
    }

    /**
     * Cập nhật lại số lượng thành viên thực tế và trạng thái của kèo
     */
    public function syncMembersCount(): void
    {
        $acceptedCount = $this->acceptedMembers()->count();
        $totalMembers = 1 + $acceptedCount; // 1 người tạo + số người đã duyệt

        $maxCapacity = 1 + (int) $this->required_members;

        $newStatus = $this->status;
        if ($this->status === 'open' && $totalMembers >= $maxCapacity) {
            $newStatus = 'full';
        } elseif ($this->status === 'full' && $totalMembers < $maxCapacity) {
            $newStatus = 'open';
        }

        $this->update([
            'current_members' => $totalMembers,
            'status' => $newStatus,
        ]);
    }

    /**
     * Scope lọc kèo tìm đối
     */
    public function scopeFilter($query, array $filters)
    {
        if (! empty($filters['sport_category_id'])) {
            $query->where('sport_category_id', $filters['sport_category_id']);
        }

        if (! empty($filters['skill_level']) && $filters['skill_level'] !== 'all') {
            $query->where(function ($q) use ($filters) {
                $q->where('skill_level', $filters['skill_level'])
                    ->orWhere('skill_level', 'all');
            });
        }

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (! empty($filters['date'])) {
            $query->whereDate('match_date', $filters['date']);
        }

        if (! empty($filters['city'])) {
            $query->where(function ($cityQuery) use ($filters) {
                $cityQuery->whereHas('venue', function ($venueQuery) use ($filters) {
                    $venueQuery->where('city', 'like', "%{$filters['city']}%");
                })->orWhere('location_note', 'like', "%{$filters['city']}%");
            });
        }

        if (! empty($filters['keyword'])) {
            $kw = $filters['keyword'];
            $query->where(function ($q) use ($kw) {
                $q->where('title', 'like', "%{$kw}%")
                    ->orWhere('description', 'like', "%{$kw}%")
                    ->orWhere('location_note', 'like', "%{$kw}%");
            });
        }

        return $query;
    }
}
