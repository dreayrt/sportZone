# SportZone — Bàn giao phần 2

Chỉ bổ sung phần quản lý cơ sở, sân, tiện ích, dịch vụ, tìm kiếm và bản đồ.
Các file đăng nhập, hồ sơ người dùng, đặt sân, thanh toán, đánh giá, loyalty, referral,
trang thống kê doanh thu và quản trị viên được giữ nguyên. Không sửa SQL gốc,
seeders gốc, Models Booking/Review/User, migrations gốc, composer.json hoặc package.json.
Xem CHANGES_PART_2.json để biết chính xác các file mới và sửa.

## 1. Cập nhật trên máy đang có database

1. Giữ một bản sao thư mục hiện tại và export database hiện tại trước khi cập nhật.
2. Chép các file đã thay đổi/mới từ bản này vào project đang chạy. Giữ `.env`,
   `.env.local`, `vendor`, `node_modules` và dữ liệu trong `storage` của máy bạn.
   Không cần thay thư mục `.git`.
3. Trong terminal Laragon, mở thư mục backend và chạy:

```powershell
php artisan migrate
php artisan db:seed --class=PartTwoSeeder
php artisan optimize:clear
php artisan serve --port=8000
```

Không chạy `migrate:fresh` trên database của bạn. Migration mới chỉ thêm:
- `venues.gallery`: JSON danh sách ảnh;
- `addons.venue_id`: nullable, kiểu số tương ứng khóa chính venues hiện tại;
- FULLTEXT index trên name, description, address của venues khi dùng MySQL.

Seeder chỉ sao chép dịch vụ toàn hệ thống thành dịch vụ riêng cho từng cơ sở có chủ.
Giữ nguyên ID và nội dung dịch vụ gốc để các đơn cũ không bị ảnh hưởng.
Chạy lại seeder không tạo bản sao trùng và không ghi đè giá/tồn kho bạn đã sửa.
Nếu không muốn dùng seeder, sau migration có thể chạy `db/Part2Supplement.sql`
trong database hiện tại; đây là cách thay thế, không cần chạy cả hai.

4. Mở terminal khác ở frontend:

```powershell
npm ci
npm run dev
```

5. Mở http://localhost:3000/venues và đăng nhập bằng tài khoản có role `owner`
   đang có trong database. Xem cơ sở tại `/dashboard/owner/venues`.
   Quyền quản lý lấy từ `venues.owner_id`, không lấy từ vị trí đầu tiên trong danh sách.

Nếu cài trên máy mới: import `db/QuanLySanTheThao.sql` vào database mới, cấu hình
`.env` như project gốc, cài dependencies, tạo APP_KEY nếu chưa có rồi thực hiện
các bước migrate/seed ở trên. SQL gốc có 3 cơ sở, 12 sân và 5 môn; các bảng này
không bị reset trong bước bổ sung phần 2.

## 2. Dịch vụ bên ngoài

Chép các dòng cần thiết trong `backend/.env.part-two.example` vào `.env` hiện tại.
Chép cấu hình frontend trong `frontend/.env.part-two.example` vào `.env.local`.
Sau khi đổi cấu hình: chạy `php artisan config:clear` và khởi động lại Next.js.

### Cloudinary

Điền CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET ở backend.
Ảnh jpeg/png/webp tối đa 5 MB; backend ký upload, giới hạn kích thước 1600×1600,
URL trả về dùng f_auto/q_auto khi phân phối ảnh. API secret không đưa vào frontend.
Form có URL ảnh và gallery (tối đa 12 URL) để nhập trực tiếp khi chưa có Cloudinary.
Nếu chưa cấu hình dịch vụ, nút upload trả lỗi rõ ràng; không giả báo thành công.

### Google Maps

- GOOGLE_MAPS_SERVER_KEY: key backend cho Geocoding API, dùng trong form cơ sở.
- NEXT_PUBLIC_GOOGLE_MAPS_KEY: key frontend cho Maps JavaScript API, giới hạn theo
  HTTP referrer website của bạn; bật Maps JavaScript API trong Google Cloud.
- NEXT_PUBLIC_GOOGLE_MAP_ID: Map ID cho marker nâng cao; nếu bỏ trống sử dụng
  DEMO_MAP_ID cho phát triển.

Cấu hình dịch vụ và billing theo tài liệu Google. Không dùng chung secret backend
với key public frontend. Nếu không có key frontend, trang bản đồ nói rõ chưa cấu hình.
Trang chi tiết vẫn có bản đồ Google nhúng và link chỉ đường theo địa chỉ/tọa độ.
Có thể nhập lat/lng trực tiếp thay vì dùng Geocoding. Vị trí trình duyệt yêu cầu
người dùng cấp quyền và HTTPS khi triển khai (localhost được trình duyệt hỗ trợ).

### Redis

Mặc định phần 2 sử dụng file cache riêng, không thay CACHE_STORE của phần khác.
Để dùng Redis: đặt VENUE_CACHE_STORE=redis, cấu hình REDIS_* trong project và bật
extension Redis trên PHP. Cache listing 60 giây; thao tác sửa cơ sở/sân/tiện ích
đổi version cache ngay. Rating/lượt đặt do module khác thay đổi xuất hiện sau tối
đa thời gian TTL; không ghi lại rating bằng phần 2.
Không chọn Redis khi Redis chưa chạy: API sẽ báo lỗi kết nối, không dùng dữ liệu giả.

## 3. Các màn hình phần 2

| URL | Chức năng |
|---|---|
| `/` | Trang chủ, môn thể thao và cơ sở nổi bật lấy từ database |
| `/venues` | Tìm kiếm, city/district/sport/giá/rating, sort, grid/list, phân trang |
| `/venues/map` | Cùng bộ lọc, ghim cơ sở trong trang kết quả có tọa độ |
| `/venues/{slug}` | Gallery, tiện ích, bảng giá các sân, lịch trống, bản đồ |
| `/dashboard/owner/venues` | Tổng quan cơ sở/sân/tiện ích và CRUD cơ sở/tiện ích |
| `/dashboard/owner/courts` | CRUD sân, lọc cơ sở/môn/trạng thái, giá thường/cao điểm |
| `/dashboard/owner/addons` | CRUD dịch vụ riêng của từng cơ sở |
| `/dashboard/owner/venues/calendar` | Lịch từng sân theo ngày, dữ liệu bookings thật |

Trang `/dashboard/owner` gốc (thống kê doanh thu) và `/dashboard/owner/calendar`
gốc (timeline quản lý đơn/check-in) được giữ nguyên để không sửa phần của thành viên khác.
Dùng mục mới “Lịch sân cơ sở” để xem lịch thuộc phần 2.

## 4. Quy ước dữ liệu và kết nối nhóm

- Danh sách công khai chỉ có cơ sở active với ít nhất một sân active phù hợp bộ lọc.
  Giá lọc và “giá từ” là giá giờ thường của sân phù hợp, không phải tổng tiền đơn.
- Môn thể thao tra theo sport_categories.code; court lưu sport_category_id.
- Slug sinh khi tạo cơ sở, giữ ổn định khi sửa tên để tránh hỏng link cũ.
- Đơn pending/confirmed/completed chiếm lịch. cancelled/no_show không chiếm lịch.
  Khoảng thời gian là [start_time, end_time); hai slot nối tiếp không xung đột.
  Giờ mở/đóng và cao điểm trong phiên bản này nằm cùng một ngày.
- API lịch công khai chỉ trả slot trống/bận, không trả tên, điện thoại hoặc mã đơn.
  Phần 2 không tạo/hủy đơn, khóa đặt sân, check-in hoặc tính tiền đơn. Những thao tác
  này thuộc phần 3; trạng thái pending hết hạn phải được job phần 3 cập nhật.
- Nút “Đặt sân” giữ đường dẫn `/booking/{courtId}` của project gốc. Trang booking
  gốc chưa được nối dữ liệu bởi phần 2. Thành viên phần 3 cần đọc courtId thật từ
  database và dùng API lịch chung; các sân mới sẽ không có trong mock-data gốc.
- Rating/review_count đọc cột venues do phần 5 quản lý; không tự tạo đánh giá.
- Dịch vụ gốc có venue_id NULL vẫn được giữ để đơn cũ tham chiếu. API phần 2 chỉ
  cho chủ sửa dịch vụ có venue_id thuộc cơ sở của mình. Thành viên phần 3 cần lấy
  dịch vụ theo venue_id hoặc GET /venue-services/{venueId} khi ghép đặt sân.
- Không xóa cơ sở có đơn/đánh giá/dịch vụ, sân có đơn, dịch vụ có lịch sử sử dụng.
  Chuyển inactive/closed thay vì xóa để giữ dữ liệu lịch sử.
- Tìm kiếm khi đăng nhập lưu user_search_history qua endpoint riêng. Khách chưa
  đăng nhập vẫn tìm được sân nhưng không tạo lịch sử gắn tài khoản.
- Google bản đồ đánh dấu các cơ sở có lat/lng trong trang kết quả hiện tại (50
  cơ sở/trang); dùng phân trang nếu số cơ sở vượt giới hạn này.

## 5. API

Base URL: `/api/v1`. Response theo success/message/data/errors của project gốc.
GET listing trả paginator: danh sách ở `data.data`, số bản ghi ở `data.total`.
Owner endpoints cần Bearer token Sanctum, user active, role owner và đúng owner_id.

| Method | Endpoint | Mục đích |
|---|---|---|
| GET | `/venues/filters` | Danh mục môn và địa điểm từ database |
| GET | `/venues` | Listing public |
| GET | `/venues/{slug}` | Chi tiết cơ sở active |
| GET | `/courts/{id}/calendar?date=YYYY-MM-DD` | Lịch công khai |
| GET | `/venue-services/{venueId}` | Dịch vụ active theo cơ sở |
| GET/POST | `/owner/venues` | Cơ sở của chủ / tạo mới |
| PUT/DELETE | `/owner/venues/{id}` | Cập nhật / xóa |
| POST | `/owner/venues/{id}/amenities` | Thêm tiện ích |
| PUT/DELETE | `/owner/amenities/{id}` | Sửa / xóa tiện ích |
| GET/POST | `/owner/courts` | Sân của chủ / tạo mới |
| PUT/DELETE | `/owner/courts/{id}` | Sửa / xóa sân |
| GET | `/owner/courts/{id}/calendar?date=YYYY-MM-DD` | Lịch sân của chủ |
| GET/POST | `/owner/addons` | Dịch vụ của chủ / tạo mới |
| PUT/DELETE | `/owner/addons/{id}` | Sửa / xóa dịch vụ |
| POST | `/owner/images` | Upload multipart image |
| POST | `/owner/geocode` | Địa chỉ → tọa độ |
| GET/POST | `/search-history` | Lịch sử riêng / ghi một lần tìm kiếm |

Listing query: search, city, district, sport, min_price, max_price, rating,
sort (name/price_asc/price_desc/rating/popular/nearest), lat, lng, radius (km), page,
per_page (1–50). “Gần nhất” cần cả lat/lng. Giá min/max phải cùng thuộc một sân
phù hợp môn để không ghép giá sân bóng với bộ lọc cầu lông trong cùng cơ sở.
Owner courts query: venue_id, sport_category_id, status. Owner addons: venue_id.
PUT form gửi đầy đủ các trường của form, không gửi owner_id/code/rating từ client.

## 6. Kiểm tra trên máy bạn

```powershell
# backend
php artisan route:list --path=api/v1
php artisan test --configuration=phpunit.part-two.xml
# frontend
npm run build
```

Bộ test phần 2 dùng SQLite :memory: riêng, không chạy trên database MySQL của bạn.
PHP cần bật pdo_sqlite để chạy test. Đã thêm test quyền sở hữu, lọc cùng một sân,
cache invalidation, slot trùng/đơn hủy, slug sai, customer bị từ chối và chặn xóa sân
có lịch sử. Test geolocation/FULLTEXT và dịch vụ bên ngoài cần kiểm thử với MySQL,
Redis, Google và Cloudinary thật trên môi trường đã cấu hình.

Quy trình kiểm tra tay: đăng nhập owner → thêm cơ sở → thêm sân → thêm tiện ích →
thêm dịch vụ → tải lại trang để xác nhận dữ liệu còn → tìm cơ sở trên trang public →
thử lọc theo môn/giá → xem lịch → đăng nhập owner khác, bảo đảm không quản lý được
cơ sở vừa tạo. Kiểm tra dữ liệu trong phpMyAdmin khi cần.

Kết quả kiểm tra trong môi trường bàn giao được ghi ở VALIDATION_PART_2.md.
