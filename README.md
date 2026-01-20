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

Bạn có thể sử dụng các tài khoản sau để đăng nhập và thử chức năng "### Hướng dẫn Cài đặt trên Server Ubuntu 22 Offline

Đây là quy trình để triển khai ứng dụng trên một máy chủ Ubuntu không có kết nối internet. Yêu cầu đã chuẩn bị sẵn 2 thư mục trong project:
- `packages/`: Chứa các gói thư viện Python đã được tải về.
- `ubuntu-libs/`: Chứa các file `.deb` của các gói hệ thống cơ bản (python3-pip, unzip, ...).

---

#### **Phần 1: Cài đặt các gói hệ thống cơ bản**

Sau khi đã sao chép toàn bộ thư mục dự án vào server, hãy thực hiện các bước sau để cài đặt các gói `.deb` cần thiết.

1.  **Di chuyển vào thư mục `ubuntu-libs`:**
    ```bash
    cd /path/to/your/project/ubuntu-libs
    ```

2.  **Cài đặt tất cả các file .deb:**
    Lệnh `dpkg` sẽ cài đặt tất cả các gói trong thư mục. Dùng `*` để đảm bảo nó cài đặt cả các gói phụ thuộc bạn đã tải về.
    ```bash
    sudo dpkg -i *.deb
    ```
    Nếu có lỗi về thiếu phụ thuộc, bạn cần quay lại máy có internet, tìm và tải file `.deb` của gói còn thiếu đó, sau đó lặp lại bước này.

---

#### **Phần 2: Cài đặt Ứng dụng và Thư viện Python**

Sau khi các công cụ hệ thống đã sẵn sàng, hãy cài đặt môi trường cho ứng dụng.

1.  **Di chuyển về thư mục gốc của dự án.**
    ```bash
    cd /path/to/your/project
    ```

2.  **Tạo và kích hoạt môi trường ảo (venv):**
    ```bash
    python3 -m venv venv
    source venv/bin/activate
    ```

3.  **Cài đặt các thư viện Python offline:**
    Sử dụng các gói đã được tải sẵn trong thư mục `packages`.
    ```bash
    pip install --no-index --find-links=./packages -r requirements.txt
    ```

4.  **Tạo thư mục `uploads`:**
    Đảm bảo thư mục này tồn tại để ứng dụng có thể ghi file.
    ```bash
    mkdir -p uploads
    ```

---

#### **Phần 3: Chạy Ứng dụng**

Sử dụng Gunicorn để chạy ứng dụng một cách ổn định.

1.  **Khởi động Gunicorn:**
    (Phải chắc chắn rằng bạn vẫn đang ở trong môi trường ảo `venv`)
    ```bash
    gunicorn --workers 3 --bind 0.0.0.0:8000 app:app
    ```
    - `--workers 3`: Số tiến trình chạy ứng dụng.
    - `--bind 0.0.0.0:8000`: Lắng nghe trên tất cả các IP của server tại cổng 8000.
    - `app:app`: Tìm đối tượng `app` trong file `app.py`.

2.  **Truy cập ứng dụng:**
    Mở trình duyệt từ một máy trong cùng mạng và truy cập vào địa chỉ: `http://<IP_CUA_SERVER>:8000`
":

- **Tài khoản 1:**
  - **Tên đăng nhập:** `admin`
  - **Mật khẩu:** `password123`

- **Tài khoản 2:**
  - **Tên đăng nhập:** `user`
  - **Mật khẩu:** `123`

## Tích hợp Synology NAS (Dành cho bạn)

Để hoàn thiện chức năng upload file lên NAS, bạn cần chỉnh sửa file `app.py`. Tìm đến section có tên `PLACEHOLDER: TÍCH HỢP SYNOLOGY NAS` và làm theo hướng dẫn trong comment. Bạn sẽ cần cài đặt thêm thư viện `smbprotocol` bằng lệnh `pip install smbprotocol` và điền thông tin IP, tài khoản, mật khẩu NAS của bạn.
