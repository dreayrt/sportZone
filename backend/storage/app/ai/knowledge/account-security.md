# Tài khoản và đổi mật khẩu

Khách hàng đã đăng nhập có thể mở mục **Hồ sơ cá nhân** trong dashboard tại đường dẫn `/dashboard/customer/profile`. Khu vực **Đổi Mật Khẩu** yêu cầu nhập mật khẩu hiện tại, mật khẩu mới và xác nhận mật khẩu mới. Mật khẩu mới phải có ít nhất 6 ký tự và phần xác nhận phải trùng khớp.

Backend SportZone có API đổi mật khẩu dành cho người dùng đã đăng nhập tại `PUT /api/v1/profile/password`. API kiểm tra mật khẩu hiện tại trước khi cập nhật mật khẩu mới.

Ở phiên bản frontend hiện tại, giao diện đổi mật khẩu đã được hiển thị nhưng nút cập nhật chưa được nối với API. Vì vậy thao tác bấm nút trên trang Hồ sơ cá nhân chưa thực sự thay đổi mật khẩu. Đây là giới hạn hiện tại của giao diện Profile; trợ lý AI không được tự đổi mật khẩu hoặc yêu cầu người dùng gửi mật khẩu trong khung chat.

Không gửi mật khẩu hiện tại, mật khẩu mới, token đăng nhập hoặc thông tin bảo mật vào chatbot. Trợ lý SportZone chỉ hướng dẫn vị trí chức năng, không xử lý hay lưu mật khẩu.
