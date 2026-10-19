# Kiểm tra dữ liệu đầu vào

Quy tắc dùng chung nằm trong `app/core/validation.py`; mỗi module khai báo thêm
schema và kiểm tra nghiệp vụ tại `schemas.py` và `service.py`.

## Quy tắc chính

- Họ tên: bỏ khoảng trắng hai đầu, bắt buộc có nội dung, tối đa 100 ký tự.
- Email: đúng định dạng, tối đa 100 ký tự, chuyển về chữ thường.
- SĐT: số di động Việt Nam gồm 10 chữ số ASCII, bắt đầu bằng 03/05/07/08/09.
  Trường SĐT tùy chọn nhận chuỗi trống để xóa giá trị.
- Mật khẩu mới: ít nhất 8 ký tự, tối đa 72 byte UTF-8 theo giới hạn bcrypt.
  Không tự động bỏ khoảng trắng trong mật khẩu. Đăng nhập vẫn hỗ trợ email hoặc SĐT.
- ID: 1–10 ký tự chữ/số, `_` hoặc `-`. Các khóa tham chiếu còn được kiểm tra
  tồn tại, quyền sở hữu hoặc vai trò tại service/database.
- URL: HTTP/HTTPS hợp lệ, tối đa 500 ký tự; không nhận `blob:`, `data:`,
  khoảng trắng hoặc thông tin đăng nhập trong URL.
- Tiền VND: số nguyên từ 0 đến 999.999.999.999; không nhận boolean, NaN, Infinity.
  Số lượng hạng mục phải dương, tối đa hai chữ số thập phân và nằm trong NUMERIC(10,2).
  Thành tiền, tiền công, linh kiện và tổng báo giá phải khớp nhau.
- Vĩ độ: -90 đến 90; kinh độ: -180 đến 180; phải gửi đủ cặp. SOS và trạng thái
  nhận việc của KTV cần GPS. Admin bật nhận việc có thể dùng tọa độ đã lưu hợp lệ.
- Ngày hẹn: `YYYY-MM-DD`, `TODAY` hoặc `TOMORROW`. Giờ: `HH:MM` theo UTC+7.
  Không nhận ngày/giờ sai định dạng, giờ thiếu ngày hoặc lịch trong quá khứ.
- Ngày mua: `YYYY-MM-DD`, không ở tương lai hoặc trước năm sản xuất.
  Năm sản xuất từ 1990 đến năm hiện tại.
- Tài khoản ngân hàng: đủ mã/tên ngân hàng, số tài khoản chỉ gồm chữ số và tên
  chủ tài khoản. Giữ số 0 ở đầu. `bank_account: null` xóa tài khoản đã lưu.
- Tạo tài khoản KTV mới cần SĐT và mật khẩu; CCCD nếu gửi phải gồm 12 chữ số.
  Kiểm tra email, SĐT và CCCD trùng trước khi ghi.
- Các trạng thái, loại thiết bị, loại sự cố, loại hạng mục và phương thức thanh toán
  phải thuộc danh sách hỗ trợ.
- Mỗi yêu cầu tối đa 20 URL ảnh, mỗi báo giá tối đa 100 hạng mục.
  Ghi chú tối đa 5.000 ký tự, lý do tối đa 1.000, địa chỉ tối đa 255.
- Ảnh tải lên: kiểm tra tệp rỗng, dung lượng, chữ ký JPEG/PNG/WebP, phần mở rộng
  và MIME tương ứng. Giới hạn hiện có: avatar 5 MB, thiết bị 10 MB, ảnh sửa chữa 50 MB.

## Cập nhật và tương thích

PATCH không thay đổi các trường bị bỏ qua. Các trường bắt buộc như họ tên,
email, vai trò và trạng thái không nhận `null` khi cập nhật.

Các tên trường cũ vẫn được hỗ trợ, gồm `totalCost`, `final_cost`,
`laborCost`, `partsCost`, `location_lat`, `location_lng` và các tên ảnh/ngày hẹn.
Nếu gửi nhiều tên cho cùng một giá trị thì các giá trị phải khớp nhau.
Không tự thay thiết bị không hợp lệ bằng một thiết bị khác khi tạo đơn.

Request body nội bộ từ chối trường không được khai báo. Webhook MoMo/SePay
cho phép nhà cung cấp bổ sung trường; không trim hay đổi nội dung đã ký.

## Phản hồi lỗi

Dữ liệu sai trả HTTP 422 với `code: VALIDATION_ERROR` và `details` chứa
`field`, `message`, `type`. Dữ liệu trùng trả 409. Các lỗi ràng buộc database
được ánh xạ thành lỗi đầu vào phù hợp; lỗi hạ tầng vẫn trả 500.

Chạy kiểm thử từ `backend/`:

```powershell
python -m unittest discover -s tests -v
```

`tests/test_validation.py` kiểm tra schema, API trả lỗi trước khi gọi service,
kiểm tra nghiệp vụ trước khi ghi và từ chối mọi kết nối HTTP bên ngoài.
