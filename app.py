from flask import Flask, render_template, request, jsonify, session, redirect, url_for, send_from_directory
from functools import wraps
import os
import json
from datetime import datetime
from werkzeug.utils import secure_filename

# --- Khởi tạo và Cấu hình ---
app = Flask(__name__, template_folder='templates', static_folder='static')

# Cấu hình khóa bí mật
app.secret_key = os.urandom(24)

# Cấu hình thư mục upload
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Cấu hình file lưu trữ thông báo
ANNOUNCEMENTS_FILE = 'announcements.json'

# Cấu hình file lưu chat
CHAT_HISTORY_FILE = 'chat_history.json'

# Cấu hình file lưu trữ người dùng
USERS_FILE = 'users.json'

def load_users():
    """Tải danh sách người dùng từ file JSON."""
    if not os.path.exists(USERS_FILE):
        return {}
    with open(USERS_FILE, 'r', encoding='utf-8') as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return {}

# --- Decorator Yêu cầu Đăng nhập ---
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "user" not in session:
            if request.path.startswith('/api/'):
                return jsonify({"success": False, "message": "Authentication required"}), 401
            return redirect(url_for('index'))
        return f(*args, **kwargs)
    return decorated_function

# --- Routes chính ---
@app.route('/')
def index():
    return render_template('giaodien.html')

@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    """Phục vụ file đã được tải lên. Yêu cầu đăng nhập để xem file."""
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# --- API Endpoints ---
@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    users = load_users()
    user_data = users.get(username)

    if user_data and user_data.get('password') == password:
        session['user'] = {
            'username': username,
            'name': user_data.get('name', username) 
        }
        return jsonify({"success": True, "message": "Đăng nhập thành công."})
    
    return jsonify({"success": False, "message": "Tên đăng nhập hoặc mật khẩu không đúng."}), 401

@app.route('/api/logout')
def api_logout():
    session.pop('user', None)
    return jsonify({"success": True, "message": "Đăng xuất thành công."})

@app.route('/api/check_auth')
def api_check_auth():
    if 'user' in session:
        return jsonify({"logged_in": True, "user": session['user']})
    return jsonify({"logged_in": False})

@app.route('/api/get_announcements')
def get_announcements():
    """Lấy danh sách các thông báo từ file JSON."""
    if not os.path.exists(ANNOUNCEMENTS_FILE):
        return jsonify([])
    with open(ANNOUNCEMENTS_FILE, 'r', encoding='utf-8') as f:
        try:
            announcements = json.load(f)
        except json.JSONDecodeError:
            announcements = []
    return jsonify(announcements)

@app.route('/api/announcements', methods=['POST'])
@login_required
def create_announcement():
    """Tạo thông báo mới, có thể kèm file upload."""
    if 'title' not in request.form or not request.form['title'].strip():
        return jsonify({"success": False, "message": "Tiêu đề là bắt buộc."}), 400

    title = request.form['title'].strip()
    content = request.form.get('content', '').strip()
    files = request.files.getlist('file')
    filenames = []
    
    for file in files:
        if file and file.filename:
            filename = secure_filename(file.filename)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)
            filenames.append(filename)

        # =================================================================
        # === PLACEHOLDER: TÍCH HỢP SYNOLOGY NAS ===
        # =================================================================
        # Tại đây, bạn sẽ thêm code để upload file lên NAS.
        # Bạn sẽ cần cài đặt một thư viện như `smbprotocol` hoặc `paramiko` (cho SFTP).
        #
        # VÍ DỤ VỚI `smbprotocol` (cần `pip install smbprotocol`):
        # -----------------------------------------------------
        # import smbclient
        #
        # try:
        #     # Đảm bảo thư mục trên NAS tồn tại
        #     smbclient.mkdir('//SERVER_IP/share_name/destination_folder',
        #                     username='YOUR_NAS_USERNAME', password='YOUR_NAS_PASSWORD')
        # except FileExistsError:
        #     pass # Thư mục đã tồn tại
        #
        # # Upload file
        # smbclient.upload_file(file_path,
        #                       f'//SERVER_IP/share_name/destination_folder/{filename}',
        #                       username='YOUR_NAS_USERNAME', password='YOUR_NAS_PASSWORD')
        #
        # print(f"File {filename} đã được upload thành công lên NAS.")
        #
        # # (Tùy chọn) Sau khi upload thành công lên NAS, bạn có thể xóa file cục bộ
        # # os.remove(file_path)
        #
        # except Exception as e:
        #     print(f"Lỗi khi upload file lên NAS: {e}")
        #     # Xử lý lỗi ở đây, ví dụ trả về thông báo lỗi cho người dùng
        #     return jsonify({"success": False, "message": f"Lỗi khi tải file lên NAS: {e}"}), 500
        # =================================================================

    # Lưu thông tin thông báo vào file JSON
    try:
        announcements = []
        if os.path.exists(ANNOUNCEMENTS_FILE):
            with open(ANNOUNCEMENTS_FILE, 'r', encoding='utf-8') as f:
                try:
                    announcements = json.load(f)
                except json.JSONDecodeError:
                    pass # File rỗng hoặc lỗi, sẽ được ghi đè
        
        new_announcement = {
            "id": len(announcements) + 1,
            "title": title,
            "content": content,
            "files": filenames,
            "author": session['user']['name'],
            "timestamp": datetime.utcnow().isoformat() + "Z" # Format UTC ISO 8601
        }
        announcements.insert(0, new_announcement) # Thêm vào đầu danh sách

        with open(ANNOUNCEMENTS_FILE, 'w', encoding='utf-8') as f:
            json.dump(announcements, f, ensure_ascii=False, indent=4)

    except Exception as e:
        return jsonify({"success": False, "message": f"Lỗi khi lưu thông báo: {e}"}), 500

    return jsonify({"success": True, "message": "Tạo thông báo thành công!"})


# --- API Endpoints cho Chat ---

@app.route('/api/chat/messages', methods=['GET', 'POST'])
def handle_chat_messages():
    """Lấy hoặc gửi tin nhắn chat."""
    # Đảm bảo file chat tồn tại
    if not os.path.exists(CHAT_HISTORY_FILE):
        with open(CHAT_HISTORY_FILE, 'w') as f:
            json.dump([], f)

    if request.method == 'POST':
        # Chỉ người dùng đã đăng nhập mới được gửi tin nhắn
        if "user" not in session:
            return jsonify({"success": False, "message": "Authentication required"}), 401
        
        data = request.get_json()
        if not data or 'message' not in data or not data['message'].strip():
            return jsonify({"success": False, "message": "Tin nhắn không được rỗng."}), 400

        message_text = data['message'].strip()
        
        new_message = {
            "id": int(datetime.utcnow().timestamp() * 1000), # Dùng timestamp cho ID
            "username": session['user']['username'],
            "name": session['user']['name'],
            "message": message_text,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }

        try:
            with open(CHAT_HISTORY_FILE, 'r+', encoding='utf-8') as f:
                history = json.load(f)
                history.append(new_message)
                f.seek(0)
                json.dump(history, f, ensure_ascii=False, indent=4)
        except (IOError, json.JSONDecodeError) as e:
            return jsonify({"success": False, "message": f"Lỗi khi lưu tin nhắn: {e}"}), 500

        return jsonify({"success": True, "message": new_message})

    else: # GET request
        with open(CHAT_HISTORY_FILE, 'r', encoding='utf-8') as f:
            try:
                history = json.load(f)
            except json.JSONDecodeError:
                history = []
        return jsonify(history)


# --- Chạy ứng dụng ---
if __name__ == '__main__':
    app.run(debug=True, port=5000)
