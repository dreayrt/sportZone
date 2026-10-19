# Kết quả kiểm tra phần 2

## Đã thực hiện

- `npm ci --ignore-scripts`: cài đúng package-lock gốc, không sửa dependencies.
- `npm run build`: thành công với Next.js 15.5.25, kiểm tra TypeScript và tạo đủ
  25 routes, bao gồm trang map và lịch sân cơ sở mới.
- Parser PHP 8.3: đọc thành công 72 file PHP trong project, không lỗi cú pháp.
  Đây là kiểm tra parser, không phải chạy PHP/Laravel.
- Kiểm tra UI bằng Chromium/Playwright trên bản production, intercept API bằng
  fixture riêng trong thư mục QA bên ngoài deliverable:
  - Trang chủ nhận danh mục và cơ sở qua API;
  - Chọn môn và tìm kiếm gửi sport vào query;
  - Đổi grid/list;
  - Chi tiết cơ sở hiển thị lịch;
  - Slug sai hiển thị lỗi, không lấy cơ sở đầu tiên;
  - Sửa giá sân gửi PUT với đúng hourly_rate_standard và venue_id;
  - Người chưa đăng nhập bị chặn tại màn hình quản lý;
  - Trang owner và directory ở viewport 390 px không tràn ngang;
  - Bản đồ chưa có key hiển thị thông báo;
  - Không có lỗi JavaScript trong lượt kiểm tra cuối.
- Xem ảnh render nội bộ của form quản lý cơ sở và trang danh sách trên điện thoại.
- Đối chiếu SHA-256 với ZIP đầu vào: chỉ 10 file có sẵn được sửa, đều thuộc phần 2
  hoặc là điểm kết nối route/model/sidebar cần thiết cho phần 2. Code chức năng
  các thành viên khác và SQL gốc không thay đổi. CHANGES_PART_2.json liệt kê file.
- Không dùng mock-data.ts trong các trang và component phần 2 mới.

Fixture API chỉ dùng trong QA, không nằm trong ZIP và không thay thế MySQL trong app.
Kiểm tra UI này không chứng minh nghiệp vụ Laravel/MySQL hoạt động end-to-end.

## Chưa thực hiện được tại môi trường bàn giao

- Chạy Laravel/PHPUnit và migration/seed trên MySQL: môi trường không có PHP và
  Composer. Việc tải/chạy script cài PHP hệ thống bị kiểm tra tự động từ chối vì
  user chỉ ủy quyền chỉnh project, không cài phần mềm hệ thống từ nguồn ngoài.
  Vì vậy không thay composer.json, không cài Boost vào project và không tuyên bố
  backend đã vượt qua test runtime.
- FULLTEXT/geolocation thực thi trên MySQL thật; Redis với extension PHP thật.
- Google Maps JavaScript/Geocoding với key và billing thật.
- Cloudinary upload với account thật.

Code, cấu hình mẫu và bộ test backend đã được bổ sung. Cần chạy các lệnh trong
HUONG_DAN_PHAN_2.md trên máy Laragon của bạn để kiểm chứng runtime. Không chạy
migrate:fresh trên database hiện có. Không nhập SQL gốc lên database hiện có.

## Tài liệu đối chiếu tích hợp

- [Cloudinary Upload API](https://cloudinary.com/documentation/image_upload_api_reference)
- [Cloudinary authentication signatures](https://cloudinary.com/documentation/authentication_signatures)
- [Google Maps JavaScript setup](https://developers.google.com/maps/documentation/javascript/get-api-key)
- [Google Maps JavaScript loading](https://developers.google.com/maps/documentation/javascript/load-maps-js-api)
