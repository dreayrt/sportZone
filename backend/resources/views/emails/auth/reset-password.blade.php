<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
</head>
<body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
<p>Xin chào {{ $userName }},</p>
<p>Bạn (hoặc ai đó) đã yêu cầu đặt lại mật khẩu cho tài khoản SportZone của mình.</p>
<p>Vui lòng bấm nút bên dưới để đặt mật khẩu mới (liên kết hiệu lực trong 60 phút):</p>
<p>
<a href="{!! $resetUrl !!}" style="display: inline-block; padding: 12px 24px; background-color: #16a34a; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold;">Đặt Lại Mật Khẩu</a>
</p>
<p>Nếu nút không hoạt động, hãy sao chép liên kết sau vào trình duyệt:</p>
<p style="word-break: break-all; font-size: 12px; color: #666;">{!! $resetUrl !!}</p>
<p>Nếu bạn không yêu cầu điều này, vui lòng bỏ qua email này. Tài khoản của bạn vẫn an toàn.</p>
<p>Trân trọng,<br>Đội ngũ SportZone</p>
</body>
</html>
