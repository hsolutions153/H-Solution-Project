# Cấu hình đăng nhập, OTP và thanh toán

Các tích hợp đọc cấu hình ở backend; không đưa khóa bí mật vào biến `NEXT_PUBLIC_*`.
Xem các tên biến trong `backend/example.env`. Khởi động lại backend sau khi thay cấu hình.

- **Google:** đặt `GOOGLE_CLIENT_ID` ở backend bằng `AUTH_GOOGLE_ID` của User-app.
  User-app cần `AUTH_GOOGLE_SECRET` và `AUTH_SECRET`. Backend xác minh chữ ký,
  issuer, audience, thời hạn và email đã xác minh của Google ID token trước khi cấp JWT.
  Thiếu cấu hình sẽ trả lỗi 503.
- **OTP:** đặt `SMS_WEBHOOK_URL` đến dịch vụ gửi SMS của hệ thống. Backend gửi
  POST JSON gồm `phone`, `code`, `message`; có thể đặt `SMS_WEBHOOK_TOKEN` để gửi
  bearer token. Dịch vụ phải trả HTTP 2xx khi chấp nhận gửi SMS. Khi triển khai thật,
  đặt `APP_ENV=production` và `OTP_EXPOSE_IN_RESPONSE=false`. Mã thử nghiệm chỉ
  được trả trong môi trường phát triển khi bật cờ này. Gửi SMS thất bại làm mã vừa
  tạo mất hiệu lực và API trả lỗi, không báo đã gửi thành công.
- **SePay:** đặt tài khoản, ngân hàng, tên chủ tài khoản và `SEPAY_API_KEY`.
  Cấu hình webhook `POST /api/v1/payments/webhook/sepay` với header
  `Authorization: Apikey <SEPAY_API_KEY>`. Chỉ khoản chuyển vào đúng tài khoản,
  đúng mã và đủ số tiền mới thanh toán hóa đơn. Khoản thiếu tiền được tiếp nhận
  nhưng hóa đơn vẫn chưa thanh toán; hiện chưa cộng dồn nhiều khoản chuyển thiếu.
- **MoMo:** đặt `MOMO_PARTNER_CODE`, `MOMO_ACCESS_KEY`, `MOMO_SECRET_KEY` và các
  URL create/query tương ứng với tài khoản của nhà cung cấp. URL mặc định trong
  file mẫu là môi trường thử nghiệm. Đặt `USER_APP_URL` theo địa chỉ User-app và
  `PUBLIC_API_URL` theo địa chỉ backend công khai; có thể dùng `MOMO_IPN_URL` để
  chỉ định webhook HTTPS `POST /api/v1/payments/webhook/momo`.
  Kết quả được đối chiếu qua query của MoMo hoặc callback có chữ ký; nút trên
  giao diện chỉ kiểm tra kết quả, không tự đánh dấu đã thanh toán. Callback hợp lệ
  trả HTTP 204. Thiếu cấu hình/kết nối thất bại trả lỗi; không tạo đường dẫn giả.
  Giao dịch được lưu trước khi gọi MoMo để callback vẫn đối chiếu được nếu request
  bị timeout; gửi lại dùng cùng request ID. Giao dịch bị hủy/hết hạn/thất bại được
  ghi `FAILED` và có thể tạo lại bằng mã giao dịch mới.

Thanh toán dùng chi phí cuối cùng của đơn `COMPLETED`, bao gồm 0 đồng. Thanh toán
không đổi trạng thái sửa chữa hoặc chi phí nghiệm thu. Dữ liệu MoMo được lưu trong
`payments.note`; phương thức lưu là `QR`, tiền mặt là `CASH`, phù hợp schema hiện có.
Đánh giá được lưu vào bảng `reviews` hiện có, một đánh giá cho mỗi đơn; cập nhật
đánh giá dùng cùng bản ghi và tính lại điểm trung bình của kỹ thuật viên.

Kiểm thử tự động chặn mọi lời gọi nhà cung cấp và database bằng dữ liệu giả lập.
Kiểm tra giao dịch, OAuth và việc nhận SMS thật cần cấu hình/tài khoản thật.

Tài liệu nhà cung cấp: [Google ID token](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token),
[MoMo query](https://developers.momo.vn/v3/docs/payment/api/payment-api/query/),
[MoMo IPN](https://developers.momo.vn/v3/docs/payment/api/result-handling/notification/),
[mã kết quả MoMo](https://developers.momo.vn/v3/docs/payment/api/result-handling/resultcode/),
[SePay webhook](https://docs.sepay.vn/tich-hop-webhooks.html).
