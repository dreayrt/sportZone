# Kế hoạch triển khai Phần 4 — Thanh toán, Voucher & Ghép kèo

> Phạm vi theo [kế hoạch phát triển hệ thống](./KeHoachPhatTrienHeThong_SportZone.md), dành cho Thành viên 4.  
> Đây là kế hoạch cho đồ án môn học: chạy ở local/môi trường demo của nhóm, không triển khai production.

## 1. Kết luận để quyết định

**Khuyến nghị: NÊN THỰC HIỆN theo phạm vi đồ án.** Phần backend đã có nền tảng đáng kể cho thanh toán qua **SePay**, voucher và ghép kèo. Công việc chính còn lại là sửa ranh giới tin cậy của thanh toán, nối giao diện voucher với API thật, xây giao diện ghép kèo và đồng bộ schema cài đặt.

**Production không nằm trong mục tiêu của đồ án.** Sản phẩm cần chạy và demo trong môi trường local/nhóm. Trước buổi demo, cần xử lý các lỗi hiện trạng: frontend có thể gửi `payment_status: paid`, voucher đang dùng mã hard-code, chưa có trang ghép kèo, và file SQL cài đặt thiếu hai bảng ghép kèo.

| Quyết định | Khuyến nghị |
|---|---|
| Nhà cung cấp thanh toán | **Chỉ SePay**: dùng SePay để tạo QR và nhận webhook; không tích hợp MoMo, VNPay hoặc nhà cung cấp QR dự phòng khác. |
| Voucher | Voucher toàn hệ thống do Admin tạo và quản lý. Hoãn voucher riêng cho từng chủ sân vì schema hiện chưa có quyền sở hữu/phạm vi voucher. |
| Hoàn tiền | Không triển khai hoàn tiền tự động; chỉ mô tả/ghi nhận trạng thái phục vụ demo nếu cần. |
| Môi trường | Local hoặc môi trường demo của nhóm; không mở dịch vụ cho người dùng thật và không triển khai production. |
| Thời gian | Dự trù **10–12 ngày làm việc** cho một người đã quen codebase; thời gian chờ cấu hình/credential SePay của nhóm có thể làm lịch demo thay đổi. |

Các tính năng MoMo/VNPay, voucher riêng cho Owner và hoàn tiền tự động nằm ngoài phạm vi đồ án hiện tại.

## 2. Hiện trạng ban đầu (trước khi triển khai)

Bảng dưới đây ghi lại các thiếu sót tại thời điểm khảo sát để làm căn cứ cho kế hoạch; đây không phải trạng thái hiện tại của nhánh làm việc.

| Module | Đã có | Còn thiếu hoặc cần xử lý |
|---|---|---|
| Thanh toán | `PaymentController`, `VietQrService`, middleware xác thực SePay, API tạo QR/webhook/xem trạng thái; có test tính năng tương ứng. | Service còn QR dự phòng; booking wizard dùng QR/mã mẫu và gửi trạng thái `paid`; webhook chưa cộng dồn thanh toán một phần; schema chưa có unique constraint; API QR/trạng thái cần rà quyền. |
| Voucher | API xem/kiểm tra/quản trị voucher; `BookingService` tính giảm giá ở server; có test voucher. | Form booking đang tự kiểm tra một số mã hard-code thay vì gọi API validate. Quản lý hiện chỉ nằm dưới route Admin dù kế hoạch gốc có Owner Panel. Giới hạn lượt dùng cần được khóa/kiểm tra nguyên tử để tránh vượt lượt khi nhiều đơn cùng áp mã. |
| Ghép kèo | Model, migration, controller, routes và test cho tạo bài, xin tham gia, duyệt/từ chối và rút khỏi kèo. | Chưa có trang ghép kèo trong `frontend/src/app`. File `db/QuanLySanTheThao.sql` thiếu `match_posts` và `match_members`, dù migration `2026_10_12_000001_create_sportzone_matchmaking_tables.php` đã có. |

Các vị trí tham khảo: `backend/app/Http/Controllers/Api/V1/PaymentController.php`, `backend/app/Services/SePayQrService.php`, `backend/app/Http/Controllers/Api/V1/VoucherController.php`, `backend/app/Services/BookingService.php`, `backend/app/Http/Controllers/Api/V1/MatchPostController.php`, `backend/app/Http/Controllers/Api/V1/MatchMemberController.php`, `backend/routes/api.php`, `frontend/src/app/booking/[courtId]/page.tsx`.

## 3. Phạm vi MVP

### Bao gồm

1. Hoàn tất luồng thanh toán qua SePay: tạo đơn chưa thanh toán, hiển thị QR do SePay cung cấp, nhận webhook SePay đã xác thực, cập nhật trạng thái và cho giao diện tra cứu kết quả. Không dùng nhà cung cấp hoặc dịch vụ QR dự phòng.
2. Tính voucher ở backend; frontend gọi API kiểm tra voucher và hiển thị số tiền backend trả về. Admin tạo, sửa, tạm ngưng voucher toàn hệ thống.
3. Cộng đồng ghép kèo: xem/lọc danh sách, xem chi tiết, đăng bài, xin tham gia, chủ bài duyệt/từ chối, người tham gia rút khỏi kèo.
4. Đồng bộ schema SQL dùng cho cài đặt thủ công với migration hiện hành.
5. Xử lý các tình huống cơ bản: webhook gửi lặp, thanh toán thiếu/nhiều lần, voucher hết hạn/hết lượt, kèo đủ người và thao tác không có quyền.

### Để giai đoạn sau

- Tích hợp MoMo, VNPay hoặc cổng thanh toán khác ngoài SePay.
- Hoàn tiền tự động hoặc xử lý giao dịch tiền thật cho người dùng production.
- Voucher riêng theo Owner/venue, mã dành riêng theo nhóm khách hoặc giới hạn số lần mỗi user.
- Chat/realtime, ghép kèo có thu phí, chia tiền giữa thành viên, kiểm duyệt nội dung nâng cao.

## 4. Kế hoạch theo thứ tự phụ thuộc

| Chặng | Thời lượng | Công việc | Bàn giao |
|---|---:|---|---|
| A. Chốt hợp đồng liên module | 0.5 ngày | Cùng Thành viên 3 thống nhất trạng thái booking ban đầu, thời gian giữ slot chưa trả tiền, hủy đơn quá hạn và payload tạo booking. Cùng Thành viên 1 chốt cấu hình SePay phục vụ demo, cách lưu secret local và schema nguồn chuẩn. | API/payload, trạng thái booking-payment và người phụ trách từng thay đổi được thống nhất. |
| B. Chặn bypass và hoàn thiện thanh toán | 2.5–3 ngày | Loại bỏ khả năng client tự đặt `paid`; tạo booking ở trạng thái unpaid/pending; nối API tạo QR SePay và polling trạng thái; xử lý webhook idempotent bằng ràng buộc DB; tính tổng tiền đã nhận để hỗ trợ trả nhiều lần; khóa thông tin tra cứu booking; ghi log giao dịch và lỗi đối soát. | Một đơn chỉ thành paid sau webhook hợp lệ; frontend hiển thị đúng đang chờ/thành công/thất bại/thiếu tiền trong demo. |
| C. Voucher thật trên checkout | 1.5–2 ngày | Thay kiểm tra hard-code bằng `/vouchers/validate`; server tự tính giá và áp voucher khi tạo booking; xử lý lượt dùng trong transaction/khóa phù hợp; dựng hoặc nối trang Admin quản lý voucher; đồng bộ SQL nếu có thay đổi schema. | Mã hợp lệ được áp đúng một lần; giá cuối cùng do server quyết định; voucher hết hạn/hết lượt bị từ chối. |
| D. Giao diện ghép kèo | 3–4 ngày | Tạo `/matches`, `/matches/[id]`, `/matches/new`; nối API list/detail/create/join/leave/accept/reject; lọc môn, ngày, khu vực, trình độ; thêm mục bài đã tạo/đã tham gia trong tài khoản nếu còn thời gian. Chống duyệt vượt số chỗ bằng transaction/lock. | Người dùng hoàn tất được luồng tìm kèo và xin tham gia; chủ bài duyệt được thành viên. |
| E. Đồng bộ cài đặt và nghiệm thu | 1.5–2 ngày | Bổ sung `match_posts`/`match_members` vào SQL dump hoặc sửa hướng dẫn để dùng migration làm nguồn cài đặt; kiểm tra seed/demo; rà quyền truy cập, lỗi API và trạng thái giao diện; chạy các test sẵn có và kiểm thử end-to-end trên môi trường local/nhóm. | Cài mới từ hướng dẫn vẫn có đủ schema; demo được luồng SePay, voucher và ghép kèo từ đầu đến cuối. |

**Phụ thuộc cần có trước chặng B:** Cấu hình/credential SePay mà nhóm có thể dùng cho đồ án và Thành viên 3 xác nhận vòng đời booking chưa thanh toán. Nếu không nhận được webhook vào môi trường local, dùng callback mô phỏng chỉ dành cho demo để kiểm tra luồng; ghi rõ đây là mô phỏng, không xác nhận giao dịch tiền thật.

## 5. Phân công và điểm bàn giao

- **Thành viên 4:** Payment/Voucher/Matchmaking API, giao diện checkout/payment, giao diện cộng đồng ghép kèo, xử lý lỗi và tài liệu cấu hình module.
- **Thành viên 3:** Chủ sở hữu vòng đời booking, giữ slot, hủy booking unpaid, dữ liệu giá cuối cùng và thông tin booking trả cho payment.
- **Thành viên 1:** Schema nền/seed dùng chung, cấu hình môi trường, secret và phân quyền cơ sở; xác nhận migration/SQL dump là nguồn cài đặt thống nhất.
- **Cả nhóm:** Một người chuẩn bị cấu hình/credential SePay phục vụ demo; thống nhất cách chạy webhook và chính sách hiển thị khoản thanh toán thiếu, thừa, quá hạn.

Không sửa trực tiếp logic booking của Thành viên 3 mà chưa thống nhất trạng thái/payload; thay đổi cần nằm trong cùng API contract để tránh booking được xác nhận trước thanh toán.

## 6. Tiêu chí nghiệm thu

### Payment

- Client không thể truyền trạng thái `paid` để tự xác nhận booking.
- QR hiển thị đúng số tiền, mã booking và thời hạn; booking đang chờ không được tính là đã thanh toán.
- Chữ ký sai hoặc webhook không hợp lệ không cập nhật booking; webhook lặp không tạo giao dịch lặp.
- Thanh toán thiếu được ghi nhận là partial; nhiều khoản hợp lệ được cộng dồn; chỉ chuyển paid khi đủ số tiền đơn.
- Người khác không tra cứu được dữ liệu booking chỉ bằng ID dễ đoán; trạng thái chỉ trả thông tin cần thiết cho đúng người/đúng mã xác thực.

### Voucher

- Backend là nơi quyết định discount và tổng tiền; sửa request từ trình duyệt không làm thay đổi giá.
- Hết hạn, chưa đến ngày, inactive, dưới giá trị tối thiểu hoặc hết lượt đều được báo rõ và không gắn vào booking.
- Một lượt dùng chỉ được tính khi booking được tạo thành công; request đồng thời không vượt `usage_limit`.
- Quyền quản trị khớp phạm vi MVP: Admin quản lý voucher toàn hệ thống.

### Ghép kèo

- Khách có thể xem danh sách và chi tiết; người đăng nhập có thể tạo bài/xin tham gia/rút; chỉ chủ bài hoặc Admin được duyệt/từ chối.
- Một user không thể xin tham gia trùng; không thể duyệt vượt số thành viên yêu cầu.
- Bộ lọc có kết quả đúng; trạng thái open/full/cancelled hiển thị nhất quán ở danh sách và chi tiết.
- Có migration và hướng dẫn cài đặt sạch cho cả hai bảng ghép kèo.

## 7. Rủi ro và việc cần xử lý trước buổi demo

| Mức | Rủi ro | Cách xử lý |
|---|---|---|
| P0 | Frontend gửi `payment_status: paid`, backend nhận giá trị này khi tạo booking. | Chỉ backend/webhook có quyền chuyển trạng thái thanh toán; frontend chỉ gửi phương thức thanh toán. Kiểm tra lại trạng thái ban đầu của booking. |
| P0 | SQL dump được README hướng dẫn import thiếu hai bảng ghép kèo. | Đồng bộ dump với migration hoặc đổi hướng dẫn cài đặt; xác nhận cài mới tạo đủ bảng. |
| P1 | Voucher đang kiểm tra bằng mã hard-code trong checkout. | Gọi API validate; vẫn tính/kiểm tra lại toàn bộ ở server lúc tạo booking. |
| P1 | Giao dịch lặp/đồng thời và thanh toán nhiều phần có thể cho trạng thái sai. | Unique transaction reference, transaction/lock, cộng tổng payment thành công và quy định rõ xử lý thừa tiền. |
| P1 | Endpoint QR/status có thể tiết lộ thông tin booking nếu chỉ dựa vào ID/mã. | Ràng buộc auth hoặc token tra cứu khó đoán; chỉ trả dữ liệu tối thiểu. |
| P2 | Kế hoạch gốc nhắc MoMo/VNPay và Owner quản lý voucher. | Đồ án dùng duy nhất SePay và voucher Admin toàn cục; ghi các tính năng còn lại ngoài phạm vi. |

## 8. Phạm vi đã chốt và quyết định còn lại

### Đã chốt theo yêu cầu

- Chỉ tích hợp **SePay** làm nhà cung cấp thanh toán; QR được lấy từ luồng SePay, không cấu hình cổng/QR dự phòng.
- Chỉ chạy local hoặc môi trường demo của nhóm; **không triển khai production** vì đây là đồ án môn học.
- Không tích hợp hoàn tiền tự động.

### Cần nhóm thống nhất

1. Voucher do Admin quản lý toàn hệ thống (phương án đơn giản, phù hợp đồ án) hay cần Owner tạo voucher riêng?
2. Nhóm có cấu hình/credential SePay để nhận webhook cho buổi demo hay sẽ dùng callback mô phỏng local?
3. Nhóm có đủ 10–12 ngày làm việc và sự phối hợp của Thành viên 1/3 cho các điểm giao tiếp không?

### Quyết định đề xuất

**GO cho bản demo đồ án** sau khi xử lý các mục P0 và hoàn tất luồng SePay trong môi trường nhóm. Tiêu chí kết thúc là cài/chạy được, demo được luồng thanh toán-voucher-ghép kèo và trình bày rõ phần callback nào dùng SePay thật hay mô phỏng. Production không phải tiêu chí nghiệm thu.

## 9. Bàn giao cuối phần việc

- API và giao diện chạy xuyên suốt cho payment, voucher và ghép kèo.
- Hướng dẫn cấu hình SePay cho môi trường demo, URL webhook/callback local, cách kiểm thử và các trạng thái payment.
- Schema cài đặt khớp migration; dữ liệu seed tối thiểu cho demo.
- Danh sách API, payload và trạng thái bàn giao cho các thành viên liên quan.
- Biên bản nghiệm thu theo mục 6; các mục ngoài MVP được ghi thành backlog giai đoạn sau.

## 10. Tình trạng triển khai trong nhánh làm việc

- Đã nối checkout với API voucher và QR SePay; backend tự giữ trạng thái booking chưa thanh toán, kiểm tra quyền tạo QR/trạng thái, xác thực webhook HMAC, chống ghi nhận giao dịch lặp, cộng dồn thanh toán một phần và ghi log giao dịch thừa để đối soát.
- Đã thêm trang Admin quản lý voucher, các trang xem/đăng/xin tham gia/duyệt kèo và mục kèo của khách hàng; đã đồng bộ hai bảng ghép kèo vào SQL dump và thêm migration unique cho mã giao dịch.
- Build frontend đã chạy thành công; bộ test chưa được chạy.
- Nhóm cần cấu hình thông tin tài khoản/secret SePay trong `backend/.env` từ các biến mẫu `SEPAY_*` ở `backend/.env.example` trước khi demo webhook thật. Migration unique cho mã giao dịch đã được áp dụng vào MySQL local `sportzone_v2`; không áp dụng migration trên production. Không đưa secret vào Git.
- Chưa triển khai production. Buổi demo cần dùng cấu hình SePay/test phù hợp và endpoint webhook có thể nhận callback; theo [hướng dẫn bảo mật webhook của SePay](https://developer.sepay.vn/vi/sepay-webhooks/bao-mat), endpoint webhook cần truy cập được qua Internet bằng HTTPS nên SePay không gọi trực tiếp vào `localhost`.
