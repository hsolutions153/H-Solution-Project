\# 🛠️ H-SOLUTION GIT CHEATSHEET (BẢN NHỎ GỌN CHO TEAM)



Tài liệu tra cứu nhanh các câu lệnh Git cơ bản dành cho thành viên trong team dự án H-Solution.



\---



\## 1. CẬP NHẬT CODE MỚI NHẤT (Làm đầu tiên mỗi ngày)

Luôn gõ lệnh này trước khi bắt đầu code để lấy code mới từ mọi người về máy:

git pull origin main

2\. QUẢN LÝ NHÁNH (Tránh đè code lên nhau)

Tuyệt đối không code trực tiếp trên nhánh main. Hãy tạo nhánh riêng cho mỗi tính năng:



Tạo và chuyển sang nhánh mới:

git checkout -b feature/ten-tinh-nang

Kiểm tra xem mình đang ở nhánh nào:

git branch

Chuyển qua lại giữa các nhánh:

git checkout <ten\_nhanh>

3\. VÒNG LẶP CODE HÀNG NGÀY (Sau khi làm xong việc)

Thực hiện 4 bước sau để lưu và đẩy code lên GitHub:



Kiểm tra file đã sửa:

git status

Chọn toàn bộ file thay đổi:

git add .

Lưu lịch sử kèm ghi chú rõ ràng:

git commit -m "feat: mo ta ngan gon noi dung da lam"

Đẩy code lên nhánh của bạn trên GitHub:

git push origin <ten\_nhanh\_cua\_ban>

4\. LỆNH CỨU CẢNH KHI LỖI

Xóa sạch mọi thay đổi chưa lưu, đưa code về trạng thái chuẩn gần nhất:

git reset --hard HEAD

Khôi phục lại một file bị sửa hỏng:

git checkout -- <ten\_file>

⚠️ Lưu ý: Nếu Terminal/Git Bash hiện chữ màu đỏ báo lỗi (Conflict hoặc Error), tuyệt đối không gõ bừa. Hãy chụp màn hình gửi ngay vào group để được hỗ trợ!

