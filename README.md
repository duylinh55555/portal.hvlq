# Cổng thông tin điện tử Học viện Lục quân (Bản demo)

Đây là một ứng dụng web Flask đơn giản mô phỏng một cổng thông tin nội bộ với các chức năng chính:
- Đăng nhập/Đăng xuất (hỗ trợ cả khách truy cập).
- Tạo thông báo mới có đính kèm file.
- Hiển thị danh sách các thông báo một cách động.
- Một phòng chat trực tuyến đơn giản.

## Cài đặt và Chạy ứng dụng

Vui lòng thực hiện các bước sau từ terminal trong thư mục gốc của dự án (`portal.hvlq`).

### 1. (Chỉ lần đầu) Tạo môi trường ảo

Môi trường ảo giúp cô lập các thư viện của dự án, tránh xung đột với các dự án Python khác trên máy của bạn.

```bash
python -m venv venv
```

### 2. Kích hoạt môi trường ảo

Mỗi khi bạn mở một terminal mới để làm việc với dự án, bạn cần chạy lệnh này.

**Trên Windows (Command Prompt hoặc PowerShell):**
```bash
.\venv\Scripts\activate
```

**Trên macOS/Linux:**
```bash
source venv/bin/activate
```

Bạn sẽ thấy `(venv)` ở đầu dòng lệnh, cho biết môi trường ảo đã được kích hoạt.

### 3. Cài đặt các thư viện cần thiết

Lệnh này sẽ đọc file `requirements.txt` (tôi sẽ tạo nó ngay sau đây) và cài đặt các thư viện Flask cần thiết.

```bash
pip install Flask Werkzeug
```
*(Lưu ý: Thông thường sẽ dùng `pip install -r requirements.txt`, tôi sẽ tạo file này để tiện cho bạn).*

### 4. Chạy ứng dụng

```bash
flask run
```

Ứng dụng sẽ khởi động. Terminal sẽ hiển thị một địa chỉ, thường là `http://127.0.0.1:5000`.

### 5. Truy cập ứng dụng

Mở trình duyệt web của bạn (Chrome, Firefox, etc.) và truy cập vào địa chỉ:
[http://127.0.0.1:5000](http://127.0.0.1:5000)

## Thông tin đăng nhập Demo

Bạn có thể sử dụng các tài khoản sau để đăng nhập và thử chức năng "Thêm mới":

- **Tài khoản 1:**
  - **Tên đăng nhập:** `admin`
  - **Mật khẩu:** `password123`

- **Tài khoản 2:**
  - **Tên đăng nhập:** `user`
  - **Mật khẩu:** `123`

## Tích hợp Synology NAS (Dành cho bạn)

Để hoàn thiện chức năng upload file lên NAS, bạn cần chỉnh sửa file `app.py`. Tìm đến section có tên `PLACEHOLDER: TÍCH HỢP SYNOLOGY NAS` và làm theo hướng dẫn trong comment. Bạn sẽ cần cài đặt thêm thư viện `smbprotocol` bằng lệnh `pip install smbprotocol` và điền thông tin IP, tài khoản, mật khẩu NAS của bạn.
