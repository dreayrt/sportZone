# Tích điểm và giới thiệu bạn bè

Quy tắc tích điểm mặc định của SportZone là mỗi 10.000 đồng chi tiêu hợp lệ nhận 1 điểm. Điểm booking chỉ đủ điều kiện ghi nhận khi booking thuộc người dùng, có trạng thái đã hoàn thành, có trạng thái thanh toán đã thanh toán và tổng giao dịch thanh toán thành công đủ giá trị đơn. Mỗi booking chỉ được ghi nhận điểm một lần.

Các ngưỡng hạng mặc định là Bronze từ 0 điểm tích lũy trọn đời, Silver từ 500 điểm, Gold từ 2.000 điểm và Platinum từ 5.000 điểm. Quản trị viên có thể thay đổi các ngưỡng này bằng cấu hình hệ thống, vì vậy màn hình tài khoản là nguồn chính xác cho hạng hiện tại.

Chức năng đổi điểm lấy voucher chưa khả dụng vì voucher hiện là mã dùng chung và chưa có quan hệ sở hữu voucher theo từng người dùng.

Mỗi người dùng có một mã giới thiệu riêng. Người dùng không được dùng mã của chính mình và mỗi người chỉ được nhận một mã giới thiệu. Phần thưởng mặc định là 50 điểm cho người giới thiệu và 30 điểm cho người được giới thiệu. Yêu cầu giới thiệu mới được ghi ở trạng thái chờ; điều kiện dự kiến là người được giới thiệu hoàn thành booking đầu tiên. Phiên bản hiện tại chưa nối trigger Booking để tự hoàn tất phần thưởng, nên trợ lý không được khẳng định điểm đã được cộng khi phần thưởng còn chờ.
