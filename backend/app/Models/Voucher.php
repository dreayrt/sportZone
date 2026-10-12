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
        return $this->validateForOrder($orderValue)['valid'];
    }

    /**
     * Kiểm tra chi tiết tính hợp lệ kèm thông báo lỗi cụ thể
     */
    public function validateForOrder(int $orderValue = 0): array
    {
        $now = now();

        if ($this->status !== 'active') {
            return [
                'valid' => false,
                'message' => 'Mã giảm giá hiện không khả dụng hoặc đã bị tạm ngưng.',
                'discount' => 0,
            ];
        }

        if ($now->lt($this->starts_at)) {
            return [
                'valid' => false,
                'message' => 'Mã giảm giá chưa đến thời gian áp dụng (bắt đầu từ ' . $this->starts_at->format('d/m/Y H:i') . ').',
                'discount' => 0,
            ];
        }

        if ($now->gt($this->ends_at)) {
            return [
                'valid' => false,
                'message' => 'Mã giảm giá đã hết hạn sử dụng vào ' . $this->ends_at->format('d/m/Y H:i') . '.',
                'discount' => 0,
            ];
        }

        if ($this->usage_limit !== null && $this->used_count >= $this->usage_limit) {
            return [
                'valid' => false,
                'message' => 'Mã giảm giá đã hết số lượt sử dụng.',
                'discount' => 0,
            ];
        }

        if ($orderValue < $this->min_order_value) {
            return [
                'valid' => false,
                'message' => 'Đơn đặt sân chưa đạt giá trị tối thiểu ' . number_format($this->min_order_value) . 'đ để áp dụng mã này.',
                'discount' => 0,
            ];
        }

        $discount = $this->calculateDiscount($orderValue);

        return [
            'valid' => true,
            'message' => 'Áp dụng mã giảm giá thành công.',
            'discount' => $discount,
        ];
    }

    /**
     * Tính toán số tiền được giảm dựa theo loại giảm giá
     */
    public function calculateDiscount(int $orderValue): int
    {
        if ($this->discount_type === 'percent') {
            $discount = (int) round(($orderValue * $this->discount_value) / 100);
            if ($this->max_discount !== null && $this->max_discount > 0) {
                $discount = min($discount, $this->max_discount);
            }
        } else {
            $discount = (int) $this->discount_value;
        }

        return max(0, min($discount, $orderValue));
    }

    /**
     * Scope lấy các voucher đang khả dụng cho khách hàng
     */
    public function scopeAvailable($query)
    {
        $now = now();

        return $query->where('status', 'active')
            ->where('starts_at', '<=', $now)
            ->where('ends_at', '>=', $now)
            ->where(function ($q) {
                $q->whereNull('usage_limit')
                    ->orWhereColumn('used_count', '<', 'usage_limit');
            });
    }
}
