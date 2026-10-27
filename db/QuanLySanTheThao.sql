DROP DATABASE IF EXISTS sportzone_db;
CREATE DATABASE sportzone_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sportzone_db;
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS=0;

CREATE TABLE users (
 id INT AUTO_INCREMENT PRIMARY KEY,
 full_name VARCHAR(120) NOT NULL,
 email VARCHAR(150) NULL UNIQUE,
 phone VARCHAR(20) NOT NULL UNIQUE,
 password_hash VARCHAR(255) NULL COMMENT 'NULL nếu user đăng ký qua Social Login',
 role ENUM('customer','owner','admin') NOT NULL DEFAULT 'customer',
 status ENUM('active','blocked') NOT NULL DEFAULT 'active',
 avatar VARCHAR(500) NULL,
 last_login_at DATETIME NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 INDEX idx_users_role_status(role,status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- OAuth2 Social Login: Liên kết tài khoản mạng xã hội
CREATE TABLE social_accounts (
 id INT AUTO_INCREMENT PRIMARY KEY,
 user_id INT NOT NULL,
 provider ENUM('google','facebook') NOT NULL COMMENT 'Nhà cung cấp OAuth2',
 provider_id VARCHAR(255) NOT NULL COMMENT 'ID user trên provider',
 provider_email VARCHAR(255) NULL COMMENT 'Email từ provider',
 provider_name VARCHAR(255) NULL COMMENT 'Tên từ provider',
 provider_avatar VARCHAR(500) NULL COMMENT 'Avatar URL từ provider',
 access_token TEXT NULL COMMENT 'Access token (mã hóa)',
 refresh_token TEXT NULL COMMENT 'Refresh token (mã hóa)',
 token_expires_at DATETIME NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 CONSTRAINT fk_social_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
 UNIQUE KEY uq_provider_account(provider, provider_id),
 INDEX idx_social_user(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE sport_categories (
 id INT AUTO_INCREMENT PRIMARY KEY,
 code VARCHAR(30) NOT NULL UNIQUE,
 name VARCHAR(100) NOT NULL,
 description VARCHAR(255) NULL,
 banner_image VARCHAR(500) NULL,
 is_active TINYINT(1) NOT NULL DEFAULT 1,
 sort_order INT NOT NULL DEFAULT 0,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE venues (
 id INT AUTO_INCREMENT PRIMARY KEY,
 owner_id INT NULL,
 code VARCHAR(50) NOT NULL UNIQUE,
 name VARCHAR(255) NOT NULL,
 slug VARCHAR(255) NOT NULL UNIQUE,
 description TEXT NULL,
 address VARCHAR(255) NOT NULL,
 ward VARCHAR(100) NULL,
 district VARCHAR(100) NOT NULL,
 city VARCHAR(100) NOT NULL,
 latitude DECIMAL(10,7) NULL,
 longitude DECIMAL(10,7) NULL,
 phone VARCHAR(20) NOT NULL,
 email VARCHAR(150) NULL,
 open_time TIME NOT NULL DEFAULT '06:00:00',
 close_time TIME NOT NULL DEFAULT '23:00:00',
 rating DECIMAL(2,1) NOT NULL DEFAULT 0,
 review_count INT NOT NULL DEFAULT 0,
 image VARCHAR(500) NULL,
 status ENUM('active','inactive','pending') NOT NULL DEFAULT 'active',
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 CONSTRAINT fk_venues_owner FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE SET NULL,
 INDEX idx_venues_owner(owner_id), INDEX idx_venues_city_status(city,status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE venue_amenities (
 id INT AUTO_INCREMENT PRIMARY KEY,
 venue_id INT NOT NULL,
 name VARCHAR(150) NOT NULL,
 icon VARCHAR(50) NULL,
 CONSTRAINT fk_amenities_venue FOREIGN KEY(venue_id) REFERENCES venues(id) ON DELETE CASCADE,
 UNIQUE KEY uq_venue_amenity(venue_id,name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE courts (
 id INT AUTO_INCREMENT PRIMARY KEY,
 venue_id INT NOT NULL,
 sport_category_id INT NOT NULL,
 code VARCHAR(50) NOT NULL UNIQUE,
 name VARCHAR(150) NOT NULL,
 surface_type VARCHAR(150) NOT NULL,
 indoor TINYINT(1) NOT NULL DEFAULT 0,
 capacity INT NULL,
 hourly_rate_standard INT NOT NULL,
 hourly_rate_peak INT NOT NULL,
 peak_start TIME NOT NULL DEFAULT '17:00:00',
 peak_end TIME NOT NULL DEFAULT '21:00:00',
 min_booking_minutes SMALLINT NOT NULL DEFAULT 60,
 slot_minutes SMALLINT NOT NULL DEFAULT 30,
 description TEXT NULL,
 image VARCHAR(500) NULL,
 status ENUM('active','maintenance','closed') NOT NULL DEFAULT 'active',
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 CONSTRAINT fk_courts_venue FOREIGN KEY(venue_id) REFERENCES venues(id) ON DELETE CASCADE,
 CONSTRAINT fk_courts_sport FOREIGN KEY(sport_category_id) REFERENCES sport_categories(id),
 INDEX idx_courts_venue_sport_status(venue_id,sport_category_id,status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE addons (
 id INT AUTO_INCREMENT PRIMARY KEY,
 code VARCHAR(50) NOT NULL UNIQUE,
 name VARCHAR(180) NOT NULL,
 category ENUM('drink','equipment','service') NOT NULL,
 price INT NOT NULL,
 unit VARCHAR(50) NOT NULL,
 stock_quantity INT NULL,
 image VARCHAR(500) NULL,
 status ENUM('active','inactive') NOT NULL DEFAULT 'active',
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE vouchers (
 id INT AUTO_INCREMENT PRIMARY KEY,
 code VARCHAR(50) NOT NULL UNIQUE,
 name VARCHAR(150) NOT NULL,
 discount_type ENUM('fixed','percent') NOT NULL,
 discount_value INT NOT NULL,
 max_discount INT NULL,
 min_order_value INT NOT NULL DEFAULT 0,
 usage_limit INT NULL,
 used_count INT NOT NULL DEFAULT 0,
 starts_at DATETIME NOT NULL,
 ends_at DATETIME NOT NULL,
 status ENUM('active','inactive') NOT NULL DEFAULT 'active',
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_vouchers_active(code,status,starts_at,ends_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE bookings (
 id INT AUTO_INCREMENT PRIMARY KEY,
 booking_code VARCHAR(30) NOT NULL UNIQUE,
 user_id INT NULL,
 venue_id INT NOT NULL,
 court_id INT NOT NULL,
 voucher_id INT NULL,
 source ENUM('website','counter','admin') NOT NULL DEFAULT 'website',
 booking_date DATE NOT NULL,
 start_time TIME NOT NULL,
 end_time TIME NOT NULL,
 customer_name VARCHAR(120) NOT NULL,
 customer_phone VARCHAR(20) NOT NULL,
 customer_email VARCHAR(150) NULL,
 note TEXT NULL,
 court_fee INT NOT NULL DEFAULT 0,
 addons_fee INT NOT NULL DEFAULT 0,
 discount_amount INT NOT NULL DEFAULT 0,
 total_price INT NOT NULL DEFAULT 0,
 status ENUM('pending','confirmed','completed','cancelled','no_show') NOT NULL DEFAULT 'confirmed',
 payment_status ENUM('unpaid','partial','paid','refunded') NOT NULL DEFAULT 'unpaid',
 payment_method ENUM('vietqr','momo','cash','bank_transfer') NOT NULL DEFAULT 'cash',
 checked_in TINYINT(1) NOT NULL DEFAULT 0,
 checked_in_at DATETIME NULL,
 cancelled_at DATETIME NULL,
 cancel_reason VARCHAR(255) NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 CONSTRAINT fk_bookings_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL,
 CONSTRAINT fk_bookings_venue FOREIGN KEY(venue_id) REFERENCES venues(id),
 CONSTRAINT fk_bookings_court FOREIGN KEY(court_id) REFERENCES courts(id),
 CONSTRAINT fk_bookings_voucher FOREIGN KEY(voucher_id) REFERENCES vouchers(id) ON DELETE SET NULL,
 INDEX idx_booking_lookup(booking_code,customer_phone),
 INDEX idx_booking_slot(court_id,booking_date,start_time,end_time),
 INDEX idx_booking_venue_date(venue_id,booking_date,status),
 CONSTRAINT chk_booking_time CHECK(end_time > start_time),
 CONSTRAINT chk_booking_money CHECK(total_price >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE booking_addons (
 id INT AUTO_INCREMENT PRIMARY KEY,
 booking_id INT NOT NULL,
 addon_id INT NOT NULL,
 addon_name VARCHAR(180) NOT NULL,
 quantity INT NOT NULL DEFAULT 1,
 unit_price INT NOT NULL,
 total_price INT NOT NULL,
 CONSTRAINT fk_booking_addons_booking FOREIGN KEY(booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
 CONSTRAINT fk_booking_addons_addon FOREIGN KEY(addon_id) REFERENCES addons(id),
 UNIQUE KEY uq_booking_addon(booking_id,addon_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE payments (
 id INT AUTO_INCREMENT PRIMARY KEY,
 booking_id INT NOT NULL,
 amount INT NOT NULL,
 method ENUM('vietqr','momo','cash','bank_transfer') NOT NULL,
 status ENUM('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
 transaction_code VARCHAR(100) NULL,
 note VARCHAR(255) NULL,
 paid_at DATETIME NULL,
 created_by INT NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT fk_payments_booking FOREIGN KEY(booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
 CONSTRAINT fk_payments_user FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
 UNIQUE KEY uq_payments_transaction_code(transaction_code),
 INDEX idx_payments_booking_status(booking_id,status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE booking_status_history (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 booking_id INT NOT NULL,
 old_status VARCHAR(30) NULL,
 new_status VARCHAR(30) NOT NULL,
 note VARCHAR(255) NULL,
 changed_by INT NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT fk_history_booking FOREIGN KEY(booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
 CONSTRAINT fk_history_user FOREIGN KEY(changed_by) REFERENCES users(id) ON DELETE SET NULL,
 INDEX idx_history_booking(booking_id,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE match_posts (
 id INT AUTO_INCREMENT PRIMARY KEY,
 user_id INT NOT NULL,
 sport_category_id INT NOT NULL,
 venue_id INT NULL,
 court_id INT NULL,
 title VARCHAR(200) NOT NULL,
 description TEXT NULL,
 match_date DATE NOT NULL,
 start_time TIME NOT NULL,
 end_time TIME NOT NULL,
 location_note VARCHAR(255) NULL,
 skill_level ENUM('all','beginner','intermediate','advanced') NOT NULL DEFAULT 'all',
 required_members INT NOT NULL DEFAULT 1,
 current_members INT NOT NULL DEFAULT 1,
 estimated_cost_per_person INT NULL DEFAULT 0,
 contact_phone VARCHAR(20) NULL,
 status ENUM('open','full','completed','cancelled') NOT NULL DEFAULT 'open',
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 CONSTRAINT fk_match_posts_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
 CONSTRAINT fk_match_posts_category FOREIGN KEY(sport_category_id) REFERENCES sport_categories(id),
 CONSTRAINT fk_match_posts_venue FOREIGN KEY(venue_id) REFERENCES venues(id) ON DELETE SET NULL,
 CONSTRAINT fk_match_posts_court FOREIGN KEY(court_id) REFERENCES courts(id) ON DELETE SET NULL,
 INDEX idx_matches_category_status_date(sport_category_id,status,match_date),
 INDEX idx_matches_user_status(user_id,status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE match_members (
 id INT AUTO_INCREMENT PRIMARY KEY,
 match_post_id INT NOT NULL,
 user_id INT NOT NULL,
 message VARCHAR(255) NULL,
 status ENUM('pending','accepted','rejected','left') NOT NULL DEFAULT 'pending',
 joined_at TIMESTAMP NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 CONSTRAINT fk_match_members_post FOREIGN KEY(match_post_id) REFERENCES match_posts(id) ON DELETE CASCADE,
 CONSTRAINT fk_match_members_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
 UNIQUE KEY uq_match_member(match_post_id,user_id),
 INDEX idx_match_members_post_status(match_post_id,status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE reviews (
 id INT AUTO_INCREMENT PRIMARY KEY,
 venue_id INT NOT NULL,
 user_id INT NULL,
 booking_id INT NULL,
 customer_name VARCHAR(120) NOT NULL,
 rating TINYINT NOT NULL,
 comment TEXT NULL,
 status ENUM('visible','hidden') NOT NULL DEFAULT 'visible',
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT fk_reviews_venue FOREIGN KEY(venue_id) REFERENCES venues(id) ON DELETE CASCADE,
 CONSTRAINT fk_reviews_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL,
 CONSTRAINT fk_reviews_booking FOREIGN KEY(booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
 CONSTRAINT chk_rating CHECK(rating BETWEEN 1 AND 5),
 INDEX idx_reviews_venue(venue_id,status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE audit_logs (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 user_id INT NULL,
 action VARCHAR(80) NOT NULL,
 entity_type VARCHAR(80) NULL,
 entity_id INT NULL,
 details TEXT NULL,
 ip_address VARCHAR(45) NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT fk_audit_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL,
 INDEX idx_audit_user_time(user_id,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE system_settings (
 setting_key VARCHAR(100) PRIMARY KEY,
 setting_value TEXT NULL,
 description VARCHAR(255) NULL,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- BẢNG BỔ SUNG CHO AI FEATURES & NÂNG CAO
-- =====================================================

-- Hệ thống thông báo & Smart Reminder
CREATE TABLE notifications (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 user_id INT NOT NULL,
 type ENUM('booking_confirmed','booking_reminder','booking_cancelled','payment_success','review_reply','loyalty_points','referral_reward','system') NOT NULL,
 title VARCHAR(255) NOT NULL,
 message TEXT NOT NULL,
 reference_type VARCHAR(50) NULL COMMENT 'booking, match_post, review, voucher...',
 reference_id INT NULL COMMENT 'ID của entity liên quan',
 channel ENUM('in_app','email','sms','push') NOT NULL DEFAULT 'in_app',
 is_read TINYINT(1) NOT NULL DEFAULT 0,
 read_at DATETIME NULL,
 scheduled_at DATETIME NULL COMMENT 'Thời điểm gửi (dùng cho Smart Reminder)',
 sent_at DATETIME NULL COMMENT 'Thời điểm thực tế đã gửi',
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT fk_notifications_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
 INDEX idx_notifications_user_read(user_id, is_read, created_at),
 INDEX idx_notifications_scheduled(channel, scheduled_at, sent_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Loyalty Program: Điểm tích lũy của user
CREATE TABLE user_points (
 id INT AUTO_INCREMENT PRIMARY KEY,
 user_id INT NOT NULL UNIQUE,
 total_points INT NOT NULL DEFAULT 0 COMMENT 'Tổng điểm hiện có',
 lifetime_points INT NOT NULL DEFAULT 0 COMMENT 'Tổng điểm đã tích từ trước đến nay',
 tier ENUM('bronze','silver','gold','platinum') NOT NULL DEFAULT 'bronze',
 tier_updated_at DATETIME NULL,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 CONSTRAINT fk_user_points_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Loyalty Program: Lịch sử tích/đổi điểm
CREATE TABLE point_transactions (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 user_id INT NOT NULL,
 type ENUM('earn','redeem','expire','bonus','refund') NOT NULL,
 points INT NOT NULL COMMENT 'Số điểm (+earn, -redeem)',
 balance_after INT NOT NULL COMMENT 'Số dư sau giao dịch',
 source VARCHAR(80) NOT NULL COMMENT 'booking, referral, promotion, admin...',
 reference_id INT NULL COMMENT 'ID booking, voucher, referral...',
 description VARCHAR(255) NULL,
 expires_at DATETIME NULL COMMENT 'Thời hạn sử dụng điểm',
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT fk_point_trans_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
 INDEX idx_point_trans_user(user_id, created_at),
 INDEX idx_point_trans_type(type, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Referral Program: Mã giới thiệu
CREATE TABLE referral_codes (
 id INT AUTO_INCREMENT PRIMARY KEY,
 user_id INT NOT NULL UNIQUE COMMENT 'Chủ mã giới thiệu',
 code VARCHAR(20) NOT NULL UNIQUE COMMENT 'Mã giới thiệu duy nhất (VD: MINHANH2026)',
 total_referrals INT NOT NULL DEFAULT 0 COMMENT 'Tổng số người đã giới thiệu thành công',
 total_rewards INT NOT NULL DEFAULT 0 COMMENT 'Tổng thưởng đã nhận (VNĐ hoặc điểm)',
 is_active TINYINT(1) NOT NULL DEFAULT 1,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT fk_referral_codes_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Referral Program: Tracking thưởng giới thiệu
CREATE TABLE referral_rewards (
 id INT AUTO_INCREMENT PRIMARY KEY,
 referrer_id INT NOT NULL COMMENT 'Người giới thiệu',
 referred_id INT NOT NULL COMMENT 'Người được giới thiệu',
 referral_code_id INT NOT NULL,
 reward_type ENUM('points','voucher','cash') NOT NULL DEFAULT 'points',
 referrer_reward_value INT NOT NULL DEFAULT 0 COMMENT 'Thưởng cho người giới thiệu',
 referred_reward_value INT NOT NULL DEFAULT 0 COMMENT 'Thưởng cho người được giới thiệu',
 status ENUM('pending','completed','cancelled') NOT NULL DEFAULT 'pending',
 completed_at DATETIME NULL COMMENT 'Hoàn thành khi referred user đặt sân lần đầu',
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT fk_referral_rewards_referrer FOREIGN KEY(referrer_id) REFERENCES users(id) ON DELETE CASCADE,
 CONSTRAINT fk_referral_rewards_referred FOREIGN KEY(referred_id) REFERENCES users(id) ON DELETE CASCADE,
 CONSTRAINT fk_referral_rewards_code FOREIGN KEY(referral_code_id) REFERENCES referral_codes(id) ON DELETE CASCADE,
 UNIQUE KEY uq_referral_pair(referrer_id, referred_id),
 INDEX idx_referral_rewards_status(status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- AI Recommendation: Lịch sử tìm kiếm & hành vi user
CREATE TABLE user_search_history (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 user_id INT NULL COMMENT 'NULL nếu khách vãng lai',
 session_id VARCHAR(100) NULL COMMENT 'Session ID cho khách vãng lai',
 search_query VARCHAR(255) NULL COMMENT 'Từ khóa tìm kiếm',
 sport_category_id INT NULL,
 city VARCHAR(100) NULL,
 district VARCHAR(100) NULL,
 latitude DECIMAL(10,7) NULL,
 longitude DECIMAL(10,7) NULL,
 filters_json JSON NULL COMMENT 'Các filter đã chọn: giá, indoor, rating...',
 result_count INT NULL COMMENT 'Số kết quả trả về',
 clicked_venue_id INT NULL COMMENT 'Venue mà user click vào từ kết quả',
 clicked_court_id INT NULL COMMENT 'Court mà user click vào',
 converted_booking_id INT NULL COMMENT 'Booking tạo từ search này (nếu có)',
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT fk_search_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL,
 CONSTRAINT fk_search_sport FOREIGN KEY(sport_category_id) REFERENCES sport_categories(id) ON DELETE SET NULL,
 CONSTRAINT fk_search_venue FOREIGN KEY(clicked_venue_id) REFERENCES venues(id) ON DELETE SET NULL,
 CONSTRAINT fk_search_court FOREIGN KEY(clicked_court_id) REFERENCES courts(id) ON DELETE SET NULL,
 CONSTRAINT fk_search_booking FOREIGN KEY(converted_booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
 INDEX idx_search_user(user_id, created_at),
 INDEX idx_search_sport_city(sport_category_id, city, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Password demo: password
INSERT INTO users(id,full_name,email,phone,password_hash,role,status) VALUES
(1,'Quản trị SportZone','admin@sportzone.local','0908000001','$2y$12$zo66U0l9KZHH82PmOk6XFeT2c7ZCd0HnIWh1qNWscg/fay6rhjss.','admin','active'),
(2,'Chủ sân Chấn Hưng','owner1@sportzone.local','0908000002','$2y$12$zo66U0l9KZHH82PmOk6XFeT2c7ZCd0HnIWh1qNWscg/fay6rhjss.','owner','active'),
(3,'Chủ sân D-Sports','owner2@sportzone.local','0908000003','$2y$12$zo66U0l9KZHH82PmOk6XFeT2c7ZCd0HnIWh1qNWscg/fay6rhjss.','owner','active'),
(4,'Nguyễn Minh Anh','minhanh@example.com','0912345678','$2y$12$zo66U0l9KZHH82PmOk6XFeT2c7ZCd0HnIWh1qNWscg/fay6rhjss.','customer','active');

INSERT INTO sport_categories(id,code,name,description,banner_image,sort_order) VALUES
(1,'football','Bóng Đá Mini','Sân cỏ nhân tạo 5 người & 7 người','https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80',1),
(2,'badminton','Cầu Lông','Sân thảm chống trượt, ánh sáng chống chói','https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=80',2),
(3,'pickleball','Pickleball','Sân Acrylic trong nhà và ngoài trời','https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=1200&q=80',3),
(4,'tennis','Quần Vợt','Sân cứng tiêu chuẩn thi đấu','https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=1200&q=80',4),
(5,'basketball','Bóng Rổ','Sàn gỗ và sân 3x3/5x5','https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1200&q=80',5);

INSERT INTO venues(id,owner_id,code,name,slug,description,address,ward,district,city,phone,email,open_time,close_time,rating,review_count,image,status) VALUES
(1,2,'CHAN-HUNG','SportZone Chấn Hưng Complex','sportzone-chan-hung','Cụm sân đa môn tại Tân Bình.','48 Chấn Hưng','Phường 6','Quận Tân Bình','TP. Hồ Chí Minh','0908123456','chanhung@sportzone.local','06:00','23:00',4.8,342,'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=1200&q=80','active'),
(2,3,'D-SPORTS','D-Sports Pickleball & Tennis Arena','dsports-pickleball-arena','Trung tâm pickleball và tennis trong nhà.','202 Hoàng Văn Thụ','Phường 9','Quận Phú Nhuận','TP. Hồ Chí Minh','0938889990','dsports@sportzone.local','05:30','23:00',4.9,489,'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=1200&q=80','active'),
(3,2,'HOOP-ZONE','Hoop Zone & Badminton Center Hà Nội','hoopzone-badminton-hanoi','Trung tâm bóng rổ và cầu lông.','180 Hoàng Quốc Việt',NULL,'Quận Cầu Giấy','Hà Nội','0977654321',NULL,'06:00','22:30',4.7,215,'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1200&q=80','active');

INSERT INTO venue_amenities(venue_id,name) VALUES
(1,'Gửi xe ô tô & xe máy'),(1,'Căng tin máy lạnh'),(1,'Phòng tắm nóng lạnh'),(1,'Dàn đèn LED 500 Lux'),(1,'Wifi tốc độ cao'),
(2,'Mái che cao cấp'),(2,'Phòng tắm máy nước nóng'),(2,'Pro Shop phụ kiện'),(2,'Quán cà phê view sân'),(2,'Bãi đỗ xe rộng'),
(3,'Sàn gỗ giảm chấn'),(3,'Hệ thống thông gió'),(3,'Tủ locker khóa từ'),(3,'Bàn bóng bàn giải trí');

INSERT INTO courts(id,venue_id,sport_category_id,code,name,surface_type,indoor,capacity,hourly_rate_standard,hourly_rate_peak,description,status) VALUES
(1,1,1,'FB-1','Sân Bóng Đá 1 (5 người)','Cỏ nhân tạo Monofilament 50mm',0,10,220000,340000,'Mặt cỏ mới, kích thước 20m x 40m','active'),
(2,1,1,'FB-2','Sân Bóng Đá 2 (5 người)','Cỏ nhân tạo Monofilament 50mm',0,10,220000,340000,'Ghế chờ có mái che, quạt công nghiệp','active'),
(3,1,1,'FB-7','Sân Bóng Đá 7 Người','Cỏ nhân tạo cao cấp VFF',0,14,450000,680000,'Phù hợp giao hữu công ty và giải đấu','active'),
(4,1,2,'BM-1','Sân Cầu Lông VIP 1','Thảm Yonex 5.0mm',1,4,90000,140000,'Trần cao 9m, đèn chống chói','active'),
(5,1,2,'BM-2','Sân Cầu Lông VIP 2','Thảm Yonex 5.0mm',1,4,90000,140000,'Gần khu quạt mát và ghế cổ vũ','active'),
(6,2,3,'PB-1','Pickleball Center Court 1','Acrylic 8 lớp tiêu chuẩn USA',1,4,150000,240000,'Mái vòm cao, đèn chuẩn giải đấu','active'),
(7,2,3,'PB-2','Pickleball Court 2','Acrylic chống trượt',1,4,150000,240000,'Khoảng cách biên an toàn','active'),
(8,2,3,'PB-3','Pickleball Court 3','Cao su tổng hợp giảm chấn',0,4,120000,190000,'Sân ngoài trời thoáng','active'),
(9,2,4,'TN-1','Tennis Center Court','Hard Court Acrylic Decoturf',1,4,200000,320000,'Có mái che và máy bắn banh','active'),
(10,3,5,'BB-1','Sân Bóng Rổ Full Court 5x5','Sàn gỗ Maple',1,10,300000,450000,'Bảng điểm LED và vạch FIBA','active'),
(11,3,5,'BB-2','Sân Bóng Rổ Half Court 3x3','Sàn cao su giảm xóc',1,6,160000,250000,'Phù hợp tập luyện 3x3','active'),
(12,3,2,'BM-HN-1','Sân Cầu Lông Hà Nội 1','Thảm PVC chống trượt',1,4,80000,120000,'Trần cao và thông gió tốt','active');

INSERT INTO addons(id,code,name,category,price,unit,stock_quantity,status) VALUES
(1,'WATER-AQUA','Nước suối Aquafina 500ml','drink',10000,'Chai',200,'active'),
(2,'WATER-POCARI','Nước điện giải Pocari Sweat 500ml','drink',20000,'Chai',100,'active'),
(3,'WATER-REVIVE','Revive Chanh muối','drink',18000,'Chai',100,'active'),
(4,'RENT-BM','Thuê vợt Cầu lông Yonex Carbon','equipment',30000,'Cây/Trận',20,'active'),
(5,'RENT-PB','Thuê vợt Pickleball Pro + bóng','equipment',40000,'Set',20,'active'),
(6,'RENT-FB','Thuê bóng đá Molten size 4/5','equipment',25000,'Quả',15,'active'),
(7,'RENT-BIBS','Thuê bộ 10 áo Bib','equipment',30000,'Bộ',10,'active'),
(8,'REFEREE','Trọng tài chuyên nghiệp','service',150000,'Trận 60p',NULL,'active');

INSERT INTO vouchers(id,code,name,discount_type,discount_value,max_discount,min_order_value,usage_limit,used_count,starts_at,ends_at,status) VALUES
(1,'SPORTZONE50','Giảm 50.000đ cho đơn từ 300.000đ','fixed',50000,NULL,300000,100,1,DATE_SUB(NOW(),INTERVAL 30 DAY),DATE_ADD(NOW(),INTERVAL 365 DAY),'active'),
(2,'WELCOME10','Giảm 10% tối đa 80.000đ','percent',10,80000,200000,200,0,DATE_SUB(NOW(),INTERVAL 30 DAY),DATE_ADD(NOW(),INTERVAL 365 DAY),'active'),
(3,'SPORT30','Giảm 30.000đ','fixed',30000,NULL,150000,100,0,DATE_SUB(NOW(),INTERVAL 30 DAY),DATE_ADD(NOW(),INTERVAL 365 DAY),'active');

INSERT INTO bookings(id,booking_code,user_id,venue_id,court_id,voucher_id,source,booking_date,start_time,end_time,customer_name,customer_phone,customer_email,note,court_fee,addons_fee,discount_amount,total_price,status,payment_status,payment_method,checked_in,checked_in_at,created_at) VALUES
(1,'SZ-77812',4,1,1,1,'website',CURDATE(),'18:00','19:30','Nguyễn Minh Anh','0912345678','minhanh@example.com','Đội mặc áo xanh',510000,40000,50000,500000,'confirmed','paid','vietqr',0,NULL,NOW()),
(2,'SZ-88301',NULL,2,6,NULL,'website',DATE_ADD(CURDATE(),INTERVAL 1 DAY),'19:00','20:30','Trần Quốc Huy','0909888777',NULL,NULL,360000,20000,0,380000,'confirmed','partial','cash',0,NULL,NOW()),
(3,'SZ-66021',NULL,1,4,NULL,'counter',CURDATE(),'07:00','08:00','Lê Thu Trang','0988111222',NULL,'Khách tại quầy',90000,0,0,90000,'completed','paid','cash',1,NOW(),DATE_SUB(NOW(),INTERVAL 1 DAY));

INSERT INTO booking_addons(booking_id,addon_id,addon_name,quantity,unit_price,total_price) VALUES
(1,2,'Nước điện giải Pocari Sweat 500ml',2,20000,40000),(2,1,'Nước suối Aquafina 500ml',2,10000,20000);
INSERT INTO payments(booking_id,amount,method,status,transaction_code,paid_at,created_by) VALUES
(1,500000,'vietqr','paid','VQR77812',NOW(),1),(2,190000,'cash','paid','CASH88301',NOW(),3),(3,90000,'cash','paid','COUNTER66021',NOW(),2);
INSERT INTO booking_status_history(booking_id,old_status,new_status,note,changed_by) VALUES
(1,NULL,'confirmed','Tạo đơn từ website',4),(2,NULL,'confirmed','Tạo đơn từ website',NULL),(3,NULL,'confirmed','Đặt tại quầy',2),(3,'confirmed','completed','Khách đã sử dụng sân',2);

INSERT INTO reviews(venue_id,user_id,booking_id,customer_name,rating,comment) VALUES
(1,4,1,'Nguyễn Minh Anh',5,'Sân sạch, đèn sáng, nhân viên hỗ trợ nhanh.'),(2,NULL,NULL,'Hoàng Nam',5,'Sân pickleball đẹp và thoáng.');

INSERT INTO system_settings(setting_key,setting_value,description) VALUES
('site_name','SportZone','Tên hệ thống'),('hotline','1900 6868','Hotline hiển thị'),('bank_name','Vietcombank','Ngân hàng nhận chuyển khoản'),('bank_account','0123456789','Số tài khoản demo'),('bank_account_name','SPORTZONE VIETNAM','Chủ tài khoản'),
('loyalty_points_per_10k','1','Số điểm tích cho mỗi 10.000đ chi tiêu'),
('loyalty_silver_threshold','500','Điểm cần để lên hạng Silver'),
('loyalty_gold_threshold','2000','Điểm cần để lên hạng Gold'),
('loyalty_platinum_threshold','5000','Điểm cần để lên hạng Platinum'),
('referral_referrer_points','50','Điểm thưởng cho người giới thiệu'),
('referral_referred_points','30','Điểm thưởng cho người được giới thiệu'),
('reminder_before_minutes','60','Gửi nhắc nhở trước giờ chơi (phút)');

-- =====================================================
-- SEED DATA: BẢNG BỔ SUNG AI FEATURES
-- =====================================================

-- Notifications demo
INSERT INTO notifications(user_id,type,title,message,reference_type,reference_id,channel,is_read) VALUES
(4,'booking_confirmed','Đặt sân thành công!','Bạn đã đặt Sân Bóng Đá 1 (5 người) lúc 18:00 ngày hôm nay. Chúc bạn thi đấu vui vẻ!','booking',1,'in_app',1),
(4,'booking_reminder','Nhắc nhở: Còn 1 giờ nữa đến giờ chơi','Sân Bóng Đá 1 (5 người) tại SportZone Chấn Hưng - 18:00 hôm nay. Đừng quên mang giày và nước uống nhé!','booking',1,'email',0),
(4,'loyalty_points','Bạn vừa nhận 50 điểm!','Tích 50 điểm từ đơn đặt sân SZ-77812. Tổng điểm hiện tại: 50 điểm.','booking',1,'in_app',0);

-- User points demo
INSERT INTO user_points(user_id,total_points,lifetime_points,tier) VALUES
(4,50,50,'bronze');

-- Point transactions demo
INSERT INTO point_transactions(user_id,type,points,balance_after,source,reference_id,description,expires_at) VALUES
(4,'earn',50,50,'booking',1,'Tích điểm đặt sân SZ-77812 (500.000đ × 1pt/10.000đ)',DATE_ADD(NOW(),INTERVAL 365 DAY));

-- Referral codes demo
INSERT INTO referral_codes(user_id,code,total_referrals,total_rewards,is_active) VALUES
(4,'MINHANH2026',0,0,1);

-- User search history demo
INSERT INTO user_search_history(user_id,search_query,sport_category_id,city,district,filters_json,result_count,clicked_venue_id,clicked_court_id,converted_booking_id) VALUES
(4,'sân bóng đá tân bình',1,'TP. Hồ Chí Minh','Quận Tân Bình','{"indoor": false, "max_price": 500000}',3,1,1,1),
(4,'pickleball phú nhuận',3,'TP. Hồ Chí Minh','Quận Phú Nhuận',NULL,2,2,NULL,NULL),
(4,NULL,2,NULL,NULL,NULL,5,1,4,3);

SET FOREIGN_KEY_CHECKS=1;
