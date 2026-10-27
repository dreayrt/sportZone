# Đặt sân và thanh toán trên SportZone

SportZone quản lý đơn đặt sân theo các trạng thái: chờ xác nhận (`pending`), đã xác nhận (`confirmed`), đã hoàn thành (`completed`), đã hủy (`cancelled`) và không đến sân (`no_show`). Một khung giờ có đơn đang chờ xác nhận, đã xác nhận hoặc đã hoàn thành được xem là không còn trống.

Khách đặt sân trực tuyến thanh toán bằng QR SePay và nhận xác nhận qua webhook SePay. Trong cơ sở dữ liệu, phương thức này được lưu với mã `vietqr` để chỉ định hình thức chuyển khoản QR. Đơn tại quầy có thể được nhân viên ghi nhận bằng tiền mặt hoặc chuyển khoản ngân hàng. Đồ án không tích hợp MoMo hay cổng thanh toán khác. Trạng thái thanh toán gồm chưa thanh toán, thanh toán một phần, đã thanh toán và đã hoàn tiền.

Phiên bản hiện tại chưa định nghĩa một chính sách chung về thời hạn được hủy sân, phí hủy hay điều kiện hoàn tiền. Khách hàng cần liên hệ trực tiếp cơ sở thể thao hoặc bộ phận hỗ trợ để xác nhận quy định áp dụng cho đơn cụ thể. Trợ lý không được tự suy đoán thời hạn hoặc mức hoàn tiền.

Hệ thống có lưu trạng thái check-in và thời điểm check-in của đơn, nhưng chưa có quy định vận hành chung về thời gian phải đến trước hoặc xử lý khi check-in muộn.
