from flask import Flask, render_template, request, jsonify, session, redirect, url_for, send_from_directory, send_file
from functools import wraps
import os
import json
from datetime import datetime
from werkzeug.utils import secure_filename
import paramiko
import io
import config # Import the new config file

# --- Khởi tạo và Cấu hình ---
app = Flask(__name__, template_folder='templates', static_folder='static')

# Tải cấu hình từ file config.py
app.config.from_object('config')

# Cấu hình khóa bí mật
app.secret_key = os.urandom(24)



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
            # For API requests, return a JSON error. Otherwise, redirect to the main page.
            if request.path.startswith('/api/'):
                return jsonify({"success": False, "message": "Authentication required"}), 401
            return redirect(url_for('index'))
        return f(*args, **kwargs)
    return decorated_function

def _get_sftp_client():
    """Establishes an SFTP connection using the logged-in user's credentials."""
    if 'user' not in session or 'username' not in session['user']:
        return None, None

    users = load_users()
    user_data = users.get(session['user']['username'])
    
    if not user_data or 'password' not in user_data:
        return None, None

    username = session['user']['username']
    password = user_data['password']

    try:
        transport = paramiko.Transport((app.config['NAS_HOSTNAME'], app.config['NAS_PORT']))
        transport.connect(username=username, password=password)
        sftp = paramiko.SFTPClient.from_transport(transport)
        return sftp, transport
    except Exception as e:
        print(f"Error connecting to NAS: {e}") # Using print for simplicity
        return None, None

# --- Routes chính ---
@app.route('/')
def index():
    return render_template('giaodien.html')



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
    """Kiểm tra trạng thái đăng nhập và thông tin người dùng."""
    if 'user' in session:
        return jsonify({"logged_in": True, "user": session['user']})
    
    user_ip = request.remote_addr
    
    if 'user' not in session or session['user'].get('name') == user_ip:
        guest_user = {
            "username": user_ip,
            "name": user_ip
        }
        return jsonify({
            "logged_in": False,
            "user": guest_user,
            "prompt_for_name": True
        })
    
    return jsonify({
        "logged_in": False,
        "user": session['user'],
        "prompt_for_name": False
    })
    
@app.route('/api/set_guest_name', methods=['POST'])
def set_guest_name():
    data = request.get_json()
    name = data.get('name')
    if not name or not name.strip():
        return jsonify({"success": False, "message": "Tên không được rỗng."}), 400
    if 'user' not in session:
        session['user'] = {'username': request.remote_addr, 'name': name.strip()}
    else:
        session['user']['name'] = name.strip()
    session.modified = True
    return jsonify({"success": True, "user": session['user']})

# --- Synology NAS API Endpoints ---

@app.route('/api/nas/files', methods=['GET'])
@login_required
def list_nas_files():
    """Lấy danh sách các tệp từ thư mục được cấu hình trên NAS."""
    sftp, transport = _get_sftp_client()
    if not sftp:
        return jsonify({"success": False, "message": "Không thể kết nối đến NAS."}), 500
    
    try:
        remote_path = app.config['REMOTE_PATH']
        files = sftp.listdir(remote_path)
        return jsonify({"success": True, "files": files})
    except FileNotFoundError:
        return jsonify({"success": False, "message": f"Thư mục không tồn tại trên NAS: {remote_path}"}), 404
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if sftp: sftp.close()
        if transport: transport.close()

@app.route('/api/nas/upload', methods=['POST'])
@login_required
def upload_to_nas():
    """Tải tệp trực tiếp lên Synology NAS."""
    if 'file' not in request.files:
        return jsonify({"success": False, "message": "Không có tệp nào được chọn."}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({"success": False, "message": "Tên tệp không hợp lệ."}), 400

    filename = secure_filename(file.filename)
    
    sftp, transport = _get_sftp_client()
    if not sftp:
        return jsonify({"success": False, "message": "Không thể kết nối đến NAS."}), 500
        
    try:
        remote_filepath = os.path.join(app.config['REMOTE_PATH'], filename).replace("\\", "/")
        # Dùng putfo để upload file-like object, tránh lưu trung gian
        sftp.putfo(file, remote_filepath)
        return jsonify({"success": True, "message": f"Tệp '{filename}' đã được tải lên NAS thành công."})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if sftp: sftp.close()
        if transport: transport.close()

@app.route('/api/nas/download/<path:filename>', methods=['GET'])
@login_required
def download_from_nas(filename):
    """Tải tệp từ Synology NAS về máy khách."""
    sftp, transport = _get_sftp_client()
    if not sftp:
        return jsonify({"success": False, "message": "Không thể kết nối đến NAS."}), 500
        
    try:
        remote_filepath = os.path.join(app.config['REMOTE_PATH'], filename).replace("\\", "/")
        
        # Tạo một đối tượng file trong bộ nhớ
        file_obj = io.BytesIO()
        
        # Tải nội dung file từ NAS vào đối tượng BytesIO
        sftp.getfo(remote_filepath, file_obj)
        
        # Di chuyển con trỏ về đầu file để có thể đọc từ đầu
        file_obj.seek(0)
        
        return send_file(
            file_obj,
            as_attachment=True,
            download_name=filename # Tên file khi tải về
        )
    except FileNotFoundError:
        return jsonify({"success": False, "message": "Tệp không tồn tại trên NAS."}), 404
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if sftp: sftp.close()
        if transport: transport.close()

# --- API Endpoints cho Thông báo và Chat (giữ nguyên) ---

@app.route('/api/get_announcements')
def get_announcements():
    if not os.path.exists(ANNOUNCEMENTS_FILE):
        return jsonify({"announcements": [], "total": 0})
    try:
        offset = int(request.args.get('offset', 0))
        limit = int(request.args.get('limit', 10))
    except ValueError:
        return jsonify({"success": False, "message": "offset và limit phải là số nguyên."}), 400
    with open(ANNOUNCEMENTS_FILE, 'r', encoding='utf-8') as f:
        try: announcements = json.load(f)
        except json.JSONDecodeError: announcements = []
    total_announcements = len(announcements)
    paginated_announcements = announcements[offset:offset + limit]
    return jsonify({"announcements": paginated_announcements, "total": total_announcements})

@app.route('/api/announcements', methods=['POST'])
@login_required
def create_announcement():
    if 'title' not in request.form or not request.form['title'].strip():
        return jsonify({"success": False, "message": "Tiêu đề là bắt buộc."}), 400

    title = request.form['title'].strip()
    content = request.form.get('content', '').strip()
    files = request.files.getlist('file')
    filenames = []

    # --- Start NAS Upload Logic ---
    sftp, transport = None, None
    if files: # Only connect if there are files
        sftp, transport = _get_sftp_client()
        if not sftp:
            return jsonify({"success": False, "message": "Không thể kết nối đến máy chủ file để tải lên. Vui lòng kiểm tra lại thông tin đăng nhập và cấu hình NAS."}), 500

    try:
        for file in files:
            if file and file.filename:
                filename = secure_filename(file.filename)
                
                # Upload to NAS
                remote_filepath = os.path.join(app.config['REMOTE_PATH'], filename).replace("\\\\", "/")
                sftp.putfo(file, remote_filepath) # Use putfo to stream file obj
                
                filenames.append(filename)
    except Exception as e:
        return jsonify({"success": False, "message": f"Lỗi khi tải file lên NAS: {e}"}), 500
    finally:
        # Make sure to close the connection
        if sftp: sftp.close()
        if transport: transport.close()
    # --- End NAS Upload Logic ---

    try:
        announcements = []
        if os.path.exists(ANNOUNCEMENTS_FILE):
            with open(ANNOUNCEMENTS_FILE, 'r', encoding='utf-8') as f:
                try: announcements = json.load(f)
                except json.JSONDecodeError: pass
        
        new_announcement = {
            "id": len(announcements) + 1,
            "title": title, "content": content, "files": filenames,
            "author": session['user']['name'],
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        announcements.insert(0, new_announcement)

        with open(ANNOUNCEMENTS_FILE, 'w', encoding='utf-8') as f:
            json.dump(announcements, f, ensure_ascii=False, indent=4)
    except Exception as e:
        return jsonify({"success": False, "message": f"Lỗi khi lưu thông báo: {e}"}), 500

    return jsonify({"success": True, "message": "Tạo thông báo thành công!"})

@app.route('/api/chat/messages', methods=['GET', 'POST'])
def handle_chat_messages():
    if not os.path.exists(CHAT_HISTORY_FILE):
        with open(CHAT_HISTORY_FILE, 'w') as f: json.dump([], f)

    if request.method == 'POST':
        data = request.get_json()
        if not data or 'message' not in data or not data['message'].strip():
            return jsonify({"success": False, "message": "Tin nhắn không được rỗng."}), 400
        message_text = data['message'].strip()
        user_ip = request.remote_addr
        if "user" in session:
            username = session['user']['username']
            display_name = session['user']['name']
        else:
            username = user_ip
            display_name = user_ip
        new_message = {
            "id": int(datetime.utcnow().timestamp() * 1000), "username": username,
            "name": display_name, "message": message_text,
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
    else:
        with open(CHAT_HISTORY_FILE, 'r', encoding='utf-8') as f:
            try: history = json.load(f)
            except json.JSONDecodeError: history = []
        return jsonify(history)

# --- Chạy ứng dụng ---
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
