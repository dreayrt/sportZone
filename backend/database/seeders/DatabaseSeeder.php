<?php

namespace Database\Seeders;

use App\Models\Addon;
use App\Models\Booking;
use App\Models\BookingAddon;
use App\Models\BookingStatusHistory;
use App\Models\Court;
use App\Models\Notification;
use App\Models\Payment;
use App\Models\PointTransaction;
use App\Models\ReferralCode;
use App\Models\Review;
use App\Models\SportCategory;
use App\Models\SystemSetting;
use App\Models\User;
use App\Models\UserPoint;
use App\Models\UserSearchHistory;
use App\Models\Venue;
use App\Models\VenueAmenity;
use App\Models\Voucher;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Users
        $defaultPassword = Hash::make('password');

        $users = [
            [
                'id' => 1,
                'full_name' => 'Quản trị SportZone',
                'email' => 'admin@sportzone.local',
                'phone' => '0908000001',
                'password_hash' => $defaultPassword,
                'role' => 'admin',
                'status' => 'active',
            ],
            [
                'id' => 2,
                'full_name' => 'Chủ sân Chấn Hưng',
                'email' => 'owner1@sportzone.local',
                'phone' => '0908000002',
                'password_hash' => $defaultPassword,
                'role' => 'owner',
                'status' => 'active',
            ],
            [
                'id' => 3,
                'full_name' => 'Chủ sân D-Sports',
                'email' => 'owner2@sportzone.local',
                'phone' => '0908000003',
                'password_hash' => $defaultPassword,
                'role' => 'owner',
                'status' => 'active',
            ],
            [
                'id' => 4,
                'full_name' => 'Nguyễn Minh Anh',
                'email' => 'minhanh@example.com',
                'phone' => '0912345678',
                'password_hash' => $defaultPassword,
                'role' => 'customer',
                'status' => 'active',
            ],
        ];

        foreach ($users as $u) {
            User::updateOrCreate(['id' => $u['id']], $u);
        }

        // 2. Sport Categories
        $categories = [
            ['id' => 1, 'code' => 'football', 'name' => 'Bóng Đá Mini', 'description' => 'Sân cỏ nhân tạo 5 người & 7 người', 'banner_image' => 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80', 'sort_order' => 1],
            ['id' => 2, 'code' => 'badminton', 'name' => 'Cầu Lông', 'description' => 'Sân thảm chống trượt, ánh sáng chống chói', 'banner_image' => 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=80', 'sort_order' => 2],
            ['id' => 3, 'code' => 'pickleball', 'name' => 'Pickleball', 'description' => 'Sân Acrylic trong nhà và ngoài trời', 'banner_image' => 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=1200&q=80', 'sort_order' => 3],
            ['id' => 4, 'code' => 'tennis', 'name' => 'Quần Vợt', 'description' => 'Sân cứng tiêu chuẩn thi đấu', 'banner_image' => 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=1200&q=80', 'sort_order' => 4],
            ['id' => 5, 'code' => 'basketball', 'name' => 'Bóng Rổ', 'description' => 'Sàn gỗ và sân 3x3/5x5', 'banner_image' => 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1200&q=80', 'sort_order' => 5],
        ];

        foreach ($categories as $c) {
            SportCategory::updateOrCreate(['id' => $c['id']], $c);
        }

        // 3. Venues
        $venues = [
            [
                'id' => 1,
                'owner_id' => 2,
                'code' => 'CHAN-HUNG',
                'name' => 'SportZone Chấn Hưng Complex',
                'slug' => 'sportzone-chan-hung',
                'description' => 'Cụm sân đa môn tại Tân Bình.',
                'address' => '48 Chấn Hưng',
                'ward' => 'Phường 6',
                'district' => 'Quận Tân Bình',
                'city' => 'TP. Hồ Chí Minh',
                'phone' => '0908123456',
                'email' => 'chanhung@sportzone.local',
                'open_time' => '06:00:00',
                'close_time' => '23:00:00',
                'rating' => 4.8,
                'review_count' => 342,
                'image' => 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=1200&q=80',
                'status' => 'active',
            ],
            [
                'id' => 2,
                'owner_id' => 3,
                'code' => 'D-SPORTS',
                'name' => 'D-Sports Pickleball & Tennis Arena',
                'slug' => 'dsports-pickleball-arena',
                'description' => 'Trung tâm pickleball và tennis trong nhà.',
                'address' => '202 Hoàng Văn Thụ',
                'ward' => 'Phường 9',
                'district' => 'Quận Phú Nhuận',
                'city' => 'TP. Hồ Chí Minh',
                'phone' => '0938889990',
                'email' => 'dsports@sportzone.local',
                'open_time' => '05:30:00',
                'close_time' => '23:00:00',
                'rating' => 4.9,
                'review_count' => 489,
                'image' => 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=1200&q=80',
                'status' => 'active',
            ],
            [
                'id' => 3,
                'owner_id' => 2,
                'code' => 'HOOP-ZONE',
                'name' => 'Hoop Zone & Badminton Center Hà Nội',
                'slug' => 'hoopzone-badminton-hanoi',
                'description' => 'Trung tâm bóng rổ và cầu lông.',
                'address' => '180 Hoàng Quốc Việt',
                'ward' => null,
                'district' => 'Quận Cầu Giấy',
                'city' => 'Hà Nội',
                'phone' => '0977654321',
                'email' => null,
                'open_time' => '06:00:00',
                'close_time' => '22:30:00',
                'rating' => 4.7,
                'review_count' => 215,
                'image' => 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1200&q=80',
                'status' => 'active',
            ],
        ];

        foreach ($venues as $v) {
            Venue::updateOrCreate(['id' => $v['id']], $v);
        }

        // 4. Venue Amenities
        $amenities = [
            ['venue_id' => 1, 'name' => 'Gửi xe ô tô & xe máy'],
            ['venue_id' => 1, 'name' => 'Căng tin máy lạnh'],
            ['venue_id' => 1, 'name' => 'Phòng tắm nóng lạnh'],
            ['venue_id' => 1, 'name' => 'Dàn đèn LED 500 Lux'],
            ['venue_id' => 1, 'name' => 'Wifi tốc độ cao'],
            ['venue_id' => 2, 'name' => 'Mái che cao cấp'],
            ['venue_id' => 2, 'name' => 'Phòng tắm máy nước nóng'],
            ['venue_id' => 2, 'name' => 'Pro Shop phụ kiện'],
            ['venue_id' => 2, 'name' => 'Quán cà phê view sân'],
            ['venue_id' => 2, 'name' => 'Bãi đỗ xe rộng'],
            ['venue_id' => 3, 'name' => 'Sàn gỗ giảm chấn'],
            ['venue_id' => 3, 'name' => 'Hệ thống thông gió'],
            ['venue_id' => 3, 'name' => 'Tủ locker khóa từ'],
            ['venue_id' => 3, 'name' => 'Bàn bóng bàn giải trí'],
        ];

        foreach ($amenities as $a) {
            VenueAmenity::updateOrCreate(['venue_id' => $a['venue_id'], 'name' => $a['name']], $a);
        }

        // 5. Courts
        $courts = [
            ['id' => 1, 'venue_id' => 1, 'sport_category_id' => 1, 'code' => 'FB-1', 'name' => 'Sân Bóng Đá 1 (5 người)', 'surface_type' => 'Cỏ nhân tạo Monofilament 50mm', 'indoor' => 0, 'capacity' => 10, 'hourly_rate_standard' => 220000, 'hourly_rate_peak' => 340000, 'description' => 'Mặt cỏ mới, kích thước 20m x 40m', 'status' => 'active'],
            ['id' => 2, 'venue_id' => 1, 'sport_category_id' => 1, 'code' => 'FB-2', 'name' => 'Sân Bóng Đá 2 (5 người)', 'surface_type' => 'Cỏ nhân tạo Monofilament 50mm', 'indoor' => 0, 'capacity' => 10, 'hourly_rate_standard' => 220000, 'hourly_rate_peak' => 340000, 'description' => 'Ghế chờ có mái che, quạt công nghiệp', 'status' => 'active'],
            ['id' => 3, 'venue_id' => 1, 'sport_category_id' => 1, 'code' => 'FB-7', 'name' => 'Sân Bóng Đá 7 Người', 'surface_type' => 'Cỏ nhân tạo cao cấp VFF', 'indoor' => 0, 'capacity' => 14, 'hourly_rate_standard' => 450000, 'hourly_rate_peak' => 680000, 'description' => 'Phù hợp giao hữu công ty và giải đấu', 'status' => 'active'],
            ['id' => 4, 'venue_id' => 1, 'sport_category_id' => 2, 'code' => 'BM-1', 'name' => 'Sân Cầu Lông VIP 1', 'surface_type' => 'Thảm Yonex 5.0mm', 'indoor' => 1, 'capacity' => 4, 'hourly_rate_standard' => 90000, 'hourly_rate_peak' => 140000, 'description' => 'Trần cao 9m, đèn chống chói', 'status' => 'active'],
            ['id' => 5, 'venue_id' => 1, 'sport_category_id' => 2, 'code' => 'BM-2', 'name' => 'Sân Cầu Lông VIP 2', 'surface_type' => 'Thảm Yonex 5.0mm', 'indoor' => 1, 'capacity' => 4, 'hourly_rate_standard' => 90000, 'hourly_rate_peak' => 140000, 'description' => 'Gần khu quạt mát và ghế cổ vũ', 'status' => 'active'],
            ['id' => 6, 'venue_id' => 2, 'sport_category_id' => 3, 'code' => 'PB-1', 'name' => 'Pickleball Center Court 1', 'surface_type' => 'Acrylic 8 lớp tiêu chuẩn USA', 'indoor' => 1, 'capacity' => 4, 'hourly_rate_standard' => 150000, 'hourly_rate_peak' => 240000, 'description' => 'Mái vòm cao, đèn chuẩn giải đấu', 'status' => 'active'],
            ['id' => 7, 'venue_id' => 2, 'sport_category_id' => 3, 'code' => 'PB-2', 'name' => 'Pickleball Court 2', 'surface_type' => 'Acrylic chống trượt', 'indoor' => 1, 'capacity' => 4, 'hourly_rate_standard' => 150000, 'hourly_rate_peak' => 240000, 'description' => 'Khoảng cách biên an toàn', 'status' => 'active'],
            ['id' => 8, 'venue_id' => 2, 'sport_category_id' => 3, 'code' => 'PB-3', 'name' => 'Pickleball Court 3', 'surface_type' => 'Cao su tổng hợp giảm chấn', 'indoor' => 0, 'capacity' => 4, 'hourly_rate_standard' => 120000, 'hourly_rate_peak' => 190000, 'description' => 'Sân ngoài trời thoáng', 'status' => 'active'],
            ['id' => 9, 'venue_id' => 2, 'sport_category_id' => 4, 'code' => 'TN-1', 'name' => 'Tennis Center Court', 'surface_type' => 'Hard Court Acrylic Decoturf', 'indoor' => 1, 'capacity' => 4, 'hourly_rate_standard' => 200000, 'hourly_rate_peak' => 320000, 'description' => 'Có mái che và máy bắn banh', 'status' => 'active'],
            ['id' => 10, 'venue_id' => 3, 'sport_category_id' => 5, 'code' => 'BB-1', 'name' => 'Sân Bóng Rổ Full Court 5x5', 'surface_type' => 'Sàn gỗ Maple', 'indoor' => 1, 'capacity' => 10, 'hourly_rate_standard' => 300000, 'hourly_rate_peak' => 450000, 'description' => 'Bảng điểm LED và vạch FIBA', 'status' => 'active'],
            ['id' => 11, 'venue_id' => 3, 'sport_category_id' => 5, 'code' => 'BB-2', 'name' => 'Sân Bóng Rổ Half Court 3x3', 'surface_type' => 'Sàn cao su giảm xóc', 'indoor' => 1, 'capacity' => 6, 'hourly_rate_standard' => 160000, 'hourly_rate_peak' => 250000, 'description' => 'Phù hợp tập luyện 3x3', 'status' => 'active'],
            ['id' => 12, 'venue_id' => 3, 'sport_category_id' => 2, 'code' => 'BM-HN-1', 'name' => 'Sân Cầu Lông Hà Nội 1', 'surface_type' => 'Thảm PVC chống trượt', 'indoor' => 1, 'capacity' => 4, 'hourly_rate_standard' => 80000, 'hourly_rate_peak' => 120000, 'description' => 'Trần cao và thông gió tốt', 'status' => 'active'],
        ];

        foreach ($courts as $court) {
            Court::updateOrCreate(['id' => $court['id']], $court);
        }

        // 6. Addons
        $addons = [
            ['id' => 1, 'code' => 'WATER-AQUA', 'name' => 'Nước suối Aquafina 500ml', 'category' => 'drink', 'price' => 10000, 'unit' => 'Chai', 'stock_quantity' => 200, 'status' => 'active'],
            ['id' => 2, 'code' => 'WATER-POCARI', 'name' => 'Nước điện giải Pocari Sweat 500ml', 'category' => 'drink', 'price' => 20000, 'unit' => 'Chai', 'stock_quantity' => 100, 'status' => 'active'],
            ['id' => 3, 'code' => 'WATER-REVIVE', 'name' => 'Revive Chanh muối', 'category' => 'drink', 'price' => 18000, 'unit' => 'Chai', 'stock_quantity' => 100, 'status' => 'active'],
            ['id' => 4, 'code' => 'RENT-BM', 'name' => 'Thuê vợt Cầu lông Yonex Carbon', 'category' => 'equipment', 'price' => 30000, 'unit' => 'Cây/Trận', 'stock_quantity' => 20, 'status' => 'active'],
            ['id' => 5, 'code' => 'RENT-PB', 'name' => 'Thuê vợt Pickleball Pro + bóng', 'category' => 'equipment', 'price' => 40000, 'unit' => 'Set', 'stock_quantity' => 20, 'status' => 'active'],
            ['id' => 6, 'code' => 'RENT-FB', 'name' => 'Thuê bóng đá Molten size 4/5', 'category' => 'equipment', 'price' => 25000, 'unit' => 'Quả', 'stock_quantity' => 15, 'status' => 'active'],
            ['id' => 7, 'code' => 'RENT-BIBS', 'name' => 'Thuê bộ 10 áo Bib', 'category' => 'equipment', 'price' => 30000, 'unit' => 'Bộ', 'stock_quantity' => 10, 'status' => 'active'],
            ['id' => 8, 'code' => 'REFEREE', 'name' => 'Trọng tài chuyên nghiệp', 'category' => 'service', 'price' => 150000, 'unit' => 'Trận 60p', 'stock_quantity' => null, 'status' => 'active'],
        ];

        foreach ($addons as $addon) {
            Addon::updateOrCreate(['id' => $addon['id']], $addon);
        }

        // 7. Vouchers
        $vouchers = [
            ['id' => 1, 'code' => 'SPORTZONE50', 'name' => 'Giảm 50.000đ cho đơn từ 300.000đ', 'discount_type' => 'fixed', 'discount_value' => 50000, 'max_discount' => null, 'min_order_value' => 300000, 'usage_limit' => 100, 'used_count' => 1, 'starts_at' => now()->subDays(30), 'ends_at' => now()->addDays(365), 'status' => 'active'],
            ['id' => 2, 'code' => 'WELCOME10', 'name' => 'Giảm 10% tối đa 80.000đ', 'discount_type' => 'percent', 'discount_value' => 10, 'max_discount' => 80000, 'min_order_value' => 200000, 'usage_limit' => 200, 'used_count' => 0, 'starts_at' => now()->subDays(30), 'ends_at' => now()->addDays(365), 'status' => 'active'],
            ['id' => 3, 'code' => 'SPORT30', 'name' => 'Giảm 30.000đ', 'discount_type' => 'fixed', 'discount_value' => 30000, 'max_discount' => null, 'min_order_value' => 150000, 'usage_limit' => 100, 'used_count' => 0, 'starts_at' => now()->subDays(30), 'ends_at' => now()->addDays(365), 'status' => 'active'],
        ];

        foreach ($vouchers as $voucher) {
            Voucher::updateOrCreate(['id' => $voucher['id']], $voucher);
        }

        // 8. Bookings
        $bookings = [
            [
                'id' => 1,
                'booking_code' => 'SZ-77812',
                'user_id' => 4,
                'venue_id' => 1,
                'court_id' => 1,
                'voucher_id' => 1,
                'source' => 'website',
                'booking_date' => now()->toDateString(),
                'start_time' => '18:00:00',
                'end_time' => '19:30:00',
                'customer_name' => 'Nguyễn Minh Anh',
                'customer_phone' => '0912345678',
                'customer_email' => 'minhanh@example.com',
                'note' => 'Đội mặc áo xanh',
                'court_fee' => 510000,
                'addons_fee' => 40000,
                'discount_amount' => 50000,
                'total_price' => 500000,
                'status' => 'confirmed',
                'payment_status' => 'paid',
                'payment_method' => 'vietqr',
                'checked_in' => false,
            ],
            [
                'id' => 2,
                'booking_code' => 'SZ-88301',
                'user_id' => null,
                'venue_id' => 2,
                'court_id' => 6,
                'voucher_id' => null,
                'source' => 'website',
                'booking_date' => now()->addDay()->toDateString(),
                'start_time' => '19:00:00',
                'end_time' => '20:30:00',
                'customer_name' => 'Trần Quốc Huy',
                'customer_phone' => '0909888777',
                'customer_email' => null,
                'note' => null,
                'court_fee' => 360000,
                'addons_fee' => 20000,
                'discount_amount' => 0,
                'total_price' => 380000,
                'status' => 'confirmed',
                'payment_status' => 'partial',
                'payment_method' => 'cash',
                'checked_in' => false,
            ],
            [
                'id' => 3,
                'booking_code' => 'SZ-66021',
                'user_id' => null,
                'venue_id' => 1,
                'court_id' => 4,
                'voucher_id' => null,
                'source' => 'counter',
                'booking_date' => now()->toDateString(),
                'start_time' => '07:00:00',
                'end_time' => '08:00:00',
                'customer_name' => 'Lê Thu Trang',
                'customer_phone' => '0988111222',
                'customer_email' => null,
                'note' => 'Khách tại quầy',
                'court_fee' => 90000,
                'addons_fee' => 0,
                'discount_amount' => 0,
                'total_price' => 90000,
                'status' => 'completed',
                'payment_status' => 'paid',
                'payment_method' => 'cash',
                'checked_in' => true,
                'checked_in_at' => now(),
            ],
        ];

        foreach ($bookings as $b) {
            Booking::updateOrCreate(['id' => $b['id']], $b);
        }

        // 9. Booking Addons
        $bAddons = [
            ['booking_id' => 1, 'addon_id' => 2, 'addon_name' => 'Nước điện giải Pocari Sweat 500ml', 'quantity' => 2, 'unit_price' => 20000, 'total_price' => 40000],
            ['booking_id' => 2, 'addon_id' => 1, 'addon_name' => 'Nước suối Aquafina 500ml', 'quantity' => 2, 'unit_price' => 10000, 'total_price' => 20000],
        ];

        foreach ($bAddons as $ba) {
            BookingAddon::updateOrCreate(['booking_id' => $ba['booking_id'], 'addon_id' => $ba['addon_id']], $ba);
        }

        // 10. Payments
        $payments = [
            ['id' => 1, 'booking_id' => 1, 'amount' => 500000, 'method' => 'vietqr', 'status' => 'paid', 'transaction_code' => 'VQR77812', 'paid_at' => now(), 'created_by' => 1],
            ['id' => 2, 'booking_id' => 2, 'amount' => 190000, 'method' => 'cash', 'status' => 'paid', 'transaction_code' => 'CASH88301', 'paid_at' => now(), 'created_by' => 3],
            ['id' => 3, 'booking_id' => 3, 'amount' => 90000, 'method' => 'cash', 'status' => 'paid', 'transaction_code' => 'COUNTER66021', 'paid_at' => now(), 'created_by' => 2],
        ];

        foreach ($payments as $p) {
            Payment::updateOrCreate(['id' => $p['id']], $p);
        }

        // 11. Booking Status History
        $histories = [
            ['booking_id' => 1, 'old_status' => null, 'new_status' => 'confirmed', 'note' => 'Tạo đơn từ website', 'changed_by' => 4],
            ['booking_id' => 2, 'old_status' => null, 'new_status' => 'confirmed', 'note' => 'Tạo đơn từ website', 'changed_by' => null],
            ['booking_id' => 3, 'old_status' => null, 'new_status' => 'confirmed', 'note' => 'Đặt tại quầy', 'changed_by' => 2],
            ['booking_id' => 3, 'old_status' => 'confirmed', 'new_status' => 'completed', 'note' => 'Khách đã sử dụng sân', 'changed_by' => 2],
        ];

        foreach ($histories as $h) {
            BookingStatusHistory::firstOrCreate($h);
        }

        // 12. Reviews
        $reviews = [
            ['id' => 1, 'venue_id' => 1, 'user_id' => 4, 'booking_id' => 1, 'customer_name' => 'Nguyễn Minh Anh', 'rating' => 5, 'comment' => 'Sân sạch, đèn sáng, nhân viên hỗ trợ nhanh.', 'status' => 'visible'],
            ['id' => 2, 'venue_id' => 2, 'user_id' => null, 'booking_id' => null, 'customer_name' => 'Hoàng Nam', 'rating' => 5, 'comment' => 'Sân pickleball đẹp và thoáng.', 'status' => 'visible'],
        ];

        foreach ($reviews as $r) {
            Review::updateOrCreate(['id' => $r['id']], $r);
        }

        // 13. System Settings
        $settings = [
            ['setting_key' => 'site_name', 'setting_value' => 'SportZone', 'description' => 'Tên hệ thống'],
            ['setting_key' => 'hotline', 'setting_value' => '1900 6868', 'description' => 'Hotline hiển thị'],
            ['setting_key' => 'bank_name', 'setting_value' => 'Vietcombank', 'description' => 'Ngân hàng nhận chuyển khoản'],
            ['setting_key' => 'bank_account', 'setting_value' => '0123456789', 'description' => 'Số tài khoản demo'],
            ['setting_key' => 'bank_account_name', 'setting_value' => 'SPORTZONE VIETNAM', 'description' => 'Chủ tài khoản'],
            ['setting_key' => 'loyalty_points_per_10k', 'setting_value' => '1', 'description' => 'Số điểm tích cho mỗi 10.000đ chi tiêu'],
            ['setting_key' => 'loyalty_silver_threshold', 'setting_value' => '500', 'description' => 'Điểm cần để lên hạng Silver'],
            ['setting_key' => 'loyalty_gold_threshold', 'setting_value' => '2000', 'description' => 'Điểm cần để lên hạng Gold'],
            ['setting_key' => 'loyalty_platinum_threshold', 'setting_value' => '5000', 'description' => 'Điểm cần để lên hạng Platinum'],
            ['setting_key' => 'referral_referrer_points', 'setting_value' => '50', 'description' => 'Điểm thưởng cho người giới thiệu'],
            ['setting_key' => 'referral_referred_points', 'setting_value' => '30', 'description' => 'Điểm thưởng cho người được giới thiệu'],
            ['setting_key' => 'reminder_before_minutes', 'setting_value' => '60', 'description' => 'Gửi nhắc nhở trước giờ chơi (phút)'],
        ];

        foreach ($settings as $s) {
            SystemSetting::updateOrCreate(['setting_key' => $s['setting_key']], $s);
        }

        // 14. Notifications
        $notifications = [
            ['id' => 1, 'user_id' => 4, 'type' => 'booking_confirmed', 'title' => 'Đặt sân thành công!', 'message' => 'Bạn đã đặt Sân Bóng Đá 1 (5 người) lúc 18:00 ngày hôm nay. Chúc bạn thi đấu vui vẻ!', 'reference_type' => 'booking', 'reference_id' => 1, 'channel' => 'in_app', 'is_read' => true],
            ['id' => 2, 'user_id' => 4, 'type' => 'booking_reminder', 'title' => 'Nhắc nhở: Còn 1 giờ nữa đến giờ chơi', 'message' => 'Sân Bóng Đá 1 (5 người) tại SportZone Chấn Hưng - 18:00 hôm nay. Đừng quên mang giày và nước uống nhé!', 'reference_type' => 'booking', 'reference_id' => 1, 'channel' => 'email', 'is_read' => false],
            ['id' => 3, 'user_id' => 4, 'type' => 'loyalty_points', 'title' => 'Bạn vừa nhận 50 điểm!', 'message' => 'Tích 50 điểm từ đơn đặt sân SZ-77812. Tổng điểm hiện tại: 50 điểm.', 'reference_type' => 'booking', 'reference_id' => 1, 'channel' => 'in_app', 'is_read' => false],
        ];

        foreach ($notifications as $n) {
            Notification::updateOrCreate(['id' => $n['id']], $n);
        }

        // 15. User Points & Transactions
        UserPoint::updateOrCreate(['user_id' => 4], [
            'user_id' => 4,
            'total_points' => 50,
            'lifetime_points' => 50,
            'tier' => 'bronze',
        ]);

        PointTransaction::firstOrCreate([
            'user_id' => 4,
            'source' => 'booking',
            'reference_id' => 1,
        ], [
            'type' => 'earn',
            'points' => 50,
            'balance_after' => 50,
            'description' => 'Tích điểm đặt sân SZ-77812 (500.000đ × 1pt/10.000đ)',
            'expires_at' => now()->addDays(365),
        ]);

        // 16. Referral Codes
        ReferralCode::updateOrCreate(['user_id' => 4], [
            'user_id' => 4,
            'code' => 'MINHANH2026',
            'total_referrals' => 0,
            'total_rewards' => 0,
            'is_active' => true,
        ]);

        // 17. User Search History
        UserSearchHistory::firstOrCreate([
            'user_id' => 4,
            'search_query' => 'sân bóng đá tân bình',
        ], [
            'sport_category_id' => 1,
            'city' => 'TP. Hồ Chí Minh',
            'district' => 'Quận Tân Bình',
            'filters_json' => ['indoor' => false, 'max_price' => 500000],
            'result_count' => 3,
            'clicked_venue_id' => 1,
            'clicked_court_id' => 1,
            'converted_booking_id' => 1,
        ]);
    }
}
