-- Bổ sung trường venue_id cho bảng vouchers để hỗ trợ chủ sân tạo mã khuyến mãi riêng cho từng cơ sở
-- Có thể chạy trong phpMyAdmin nếu không dùng lệnh php artisan migrate

SET FOREIGN_KEY_CHECKS = 0;

-- Thêm cột venue_id nếu chưa có
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'vouchers' 
    AND COLUMN_NAME = 'venue_id');

SET @query := IF(@exist = 0, 
    'ALTER TABLE vouchers ADD COLUMN venue_id INT NULL AFTER id, ADD INDEX idx_vouchers_venue (venue_id);', 
    'SELECT "Column venue_id already exists";');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Thêm khóa ngoại liên kết tới bảng venues
SET @fk_exist := (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
    WHERE CONSTRAINT_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'vouchers' 
    AND CONSTRAINT_NAME = 'fk_vouchers_venue_id');

SET @query_fk := IF(@fk_exist = 0, 
    'ALTER TABLE vouchers ADD CONSTRAINT fk_vouchers_venue_id FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE;', 
    'SELECT "Foreign key fk_vouchers_venue_id already exists";');
PREPARE stmt_fk FROM @query_fk;
EXECUTE stmt_fk;
DEALLOCATE PREPARE stmt_fk;

-- Tạo thử 1 voucher mẫu cho cơ sở đầu tiên nếu muốn kiểm thử
INSERT INTO vouchers (venue_id, code, name, discount_type, discount_value, max_discount, min_order_value, usage_limit, used_count, starts_at, ends_at, status)
SELECT id, 'SANVIET20', 'Ưu đãi đặt sân cơ sở 20k', 'fixed', 20000, NULL, 100000, 50, 0, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 'active'
FROM venues WHERE owner_id IS NOT NULL LIMIT 1
ON DUPLICATE KEY UPDATE name = VALUES(name);

SET FOREIGN_KEY_CHECKS = 1;

