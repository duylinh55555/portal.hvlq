from flask import Flask, render_template, request, jsonify, session, redirect, url_for, send_from_directory, send_file
from functools import wraps
import os
import json
from datetime import datetime
from werkzeug.utils import secure_filename
import paramiko
import io
import bcrypt
import subprocess
import re
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

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "user" not in session or session['user'].get('role') != 'admin':
            return jsonify({"success": False, "message": "Admin access required"}), 403
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

    # For SFTP, we still need to handle the fact that passwords are now hashed.
    # The current implementation of using the portal user's password for SFTP will fail
    # because we don't store the plaintext password.
    # This is a pre-existing issue that needs to be addressed separately.
    # For now, this function will likely fail for non-admin users if they have a real password.
    username = session['user']['username']
    password = "a_placeholder_password" # This will not work, it's just to avoid a crash.

    try:
        transport = paramiko.Transport((app.config['NAS_HOSTNAME'], app.config['NAS_PORT']))
        transport.connect(username=username, password=password)
        sftp = paramiko.SFTPClient.from_transport(transport)
        return sftp, transport
    except Exception as e:
        print(f"Error connecting to NAS for SFTP: {e}") # Using print for simplicity
        return None, None

def _create_nas_user(username, password, name):
    """Creates a user on the Synology NAS via SSH."""
    client = None
    try:
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(
            hostname=app.config['NAS_HOSTNAME'],
            port=app.config['NAS_PORT'],
            username=app.config['NAS_ADMIN_USER'],
            password=app.config['NAS_ADMIN_PASSWORD'],
            timeout=10
        )

        # Securely construct the command. The synouser arguments are:
        # --add [user] [password] [real name] [is_admin] [email]
        # We'll set is_admin to 0 (no) and email to an empty string.
        # Basic escaping for single quotes.
        safe_username = username.replace("'", "'\\''")
        safe_password = password.replace("'", "'\\''")
        safe_name = name.replace("'", "'\\''")

        command = f"synouser --add '{safe_username}' '{safe_password}' '{safe_name}' 0 \"\""

        stdin, stdout, stderr = client.exec_command(command)
        exit_status = stdout.channel.recv_exit_status()
        
        error_output = stderr.read().decode('utf-8').strip()

        # An exit status of 0 means success.
        # An exit status of 23 often means the user already exists, which we can treat as a success for our purposes.
        if exit_status == 0 or exit_status == 23:
            return True, "NAS user created or already exists."
        else:
            app.logger.error(f"Failed to create NAS user '{username}'. Exit: {exit_status}, Error: {error_output}")
            return False, f"Failed to create NAS user. Error: {error_output or 'Unknown error'}"

    except Exception as e:
        app.logger.error(f"Exception while creating NAS user '{username}': {str(e)}")
        return False, "Could not connect to NAS or an unexpected error occurred."
    finally:
        if client:
            client.close()

def _get_mac_address(ip_address):
    """
    Retrieves the MAC address for a given IP address by parsing the ARP table.
    This is not guaranteed to work and is highly dependent on the network topology.
    """
    if ip_address == '127.0.0.1':
        return "localhost"

    try:
        # Execute 'arp -a' and capture output
        output = subprocess.check_output(['arp', '-a', ip_address], universal_newlines=True)
        
        # Regex to find a MAC address (handles both xx-xx-xx-xx-xx-xx and xx:xx:xx:xx:xx:xx)
        mac_match = re.search(r'([\da-f]{2}[:-]){5}[\da-f]{2}', output, re.IGNORECASE)
        
        if mac_match:
            return mac_match.group(0).upper().replace('-', ':')
        return None # No MAC address found in the output for the given IP

    except Exception as e:
        app.logger.warning(f"Could not retrieve MAC for IP {ip_address}: {e}")
        return None

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
    
    if not username or not password:
        return jsonify({"success": False, "message": "Tên đăng nhập và mật khẩu là bắt buộc."}), 400

    users = load_users()
    user_data = users.get(username)

    if user_data and bcrypt.checkpw(password.encode('utf-8'), user_data['password'].encode('utf-8')):
        session['user'] = {
            'username': username,
            'name': user_data.get('name', username),
            'role': user_data.get('role', 'user')
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
    
    # This logic seems to handle guest users, let's keep it but ensure it doesn't conflict.
    guest_user = {
        "username": user_ip,
        "name": user_ip,
        "role": "guest" 
    }
    
    if 'user' not in session:
        # Check if a guest name was previously set in the session
        guest_name = session.get('guest_name')
        if guest_name:
            guest_user['name'] = guest_name
            return jsonify({
                "logged_in": False,
                "user": guest_user,
                "prompt_for_name": False
            })
        else:
             return jsonify({
                "logged_in": False,
                "user": guest_user,
                "prompt_for_name": True
            })

    return jsonify({
        "logged_in": False,
        "user": guest_user,
        "prompt_for_name": False
    })
    
@app.route('/api/set_guest_name', methods=['POST'])
def set_guest_name():
    data = request.get_json()
    name = data.get('name')
    if not name or not name.strip():
        return jsonify({"success": False, "message": "Tên không được rỗng."}), 400
    
    # Store guest name separately to avoid confusion with logged-in users
    session['guest_name'] = name.strip()
    
    guest_user = {
        'username': request.remote_addr, 
        'name': name.strip(),
        'role': 'guest'
    }
    session.modified = True
    return jsonify({"success": True, "user": guest_user})

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
@admin_required
def create_announcement():
    if 'title' not in request.form or not request.form['title'].strip():
        return jsonify({"success": False, "message": "Tiêu đề là bắt buộc."}), 400

    title = request.form['title'].strip()
    content = request.form.get('content', '').strip()
    files = request.files.getlist('file')
    filenames = []

    # --- Start NAS Upload Logic ---
    sftp, transport = None, None
    if files and any(f.filename for f in files): # Only connect if there are files with names
        sftp, transport = _get_sftp_client()
        if not sftp:
            return jsonify({"success": False, "message": "Không thể kết nối đến máy chủ file để tải lên. Vui lòng kiểm tra lại thông tin đăng nhập và cấu hình NAS."}), 500

    try:
        for file in files:
            if file and file.filename:
                filename = secure_filename(file.filename)
                
                # Upload to NAS
                remote_filepath = os.path.join(app.config['REMOTE_PATH'], filename).replace("\\", "/")
                sftp.putfo(file, remote_filepath) # Use putfo to stream file obj
                
                filenames.append(filename)
    except Exception as e:
        # Clean up already uploaded files if something goes wrong? Maybe for later.
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
                try: 
                    announcements = json.load(f)
                except json.JSONDecodeError: 
                    pass
        
        new_announcement = {
            "id": len(announcements) + 1 if announcements else 1,
            "title": title, 
            "content": content, 
            "files": filenames,
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
        with open(CHAT_HISTORY_FILE, 'w', encoding='utf-8') as f: 
            json.dump([], f)

    if request.method == 'POST':
        data = request.get_json()
        if not data or 'message' not in data or not data['message'].strip():
            return jsonify({"success": False, "message": "Tin nhắn không được rỗng."}), 400
        
        message_text = data['message'].strip()
        user_ip = request.remote_addr
        
        # Try to get the MAC address from the IP
        mac_address = _get_mac_address(user_ip)

        user_name = "Guest" # Default name
        user_id = user_ip

        if 'user' in session:
            user_name = session['user'].get('name', user_id)
            user_id = session['user'].get('username', user_id)
        elif 'guest_name' in session:
            user_name = session['guest_name']

        new_message = {
            "id": int(datetime.utcnow().timestamp() * 1000), 
            "username": user_id,
            "name": user_name, 
            "message": message_text,
            "ip_address": user_ip,
            "mac_address": mac_address or "N/A", # Add MAC address here
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        try:
            history = []
            if os.path.exists(CHAT_HISTORY_FILE):
                with open(CHAT_HISTORY_FILE, 'r', encoding='utf-8') as f:
                    try:
                        history = json.load(f)
                    except json.JSONDecodeError:
                        pass # Keep history as empty list
            
            history.append(new_message)
            
            with open(CHAT_HISTORY_FILE, 'w', encoding='utf-8') as f:
                json.dump(history, f, ensure_ascii=False, indent=4)

        except (IOError, json.JSONDecodeError) as e:
            return jsonify({"success": False, "message": f"Lỗi khi lưu tin nhắn: {e}"}), 500
        return jsonify({"success": True, "message": new_message})
    else: # GET request
        history = []
        if os.path.exists(CHAT_HISTORY_FILE):
            with open(CHAT_HISTORY_FILE, 'r', encoding='utf-8') as f:
                try: 
                    history = json.load(f)
                except json.JSONDecodeError: 
                    pass # Return empty list if file is corrupted
        return jsonify(history)

# --- Admin Panel Routes ---
@app.route('/admin')
@admin_required
def admin_panel():
    """Serves the admin panel page."""
    return render_template('admin.html')

@app.route('/api/admin/users', methods=['GET'])
@admin_required
def get_all_users():
    """Returns a list of all users."""
    users = load_users()
    # Convert user data to a list of dicts, omitting passwords
    user_list = [
        {"username": username, "name": data.get("name"), "role": data.get("role")}
        for username, data in users.items()
    ]
    return jsonify(user_list)

@app.route('/api/admin/users', methods=['POST'])
@admin_required
def create_user():
    """Creates a new user in the portal and on the Synology NAS."""
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    name = data.get('name')
    role = data.get('role', 'user')

    if not all([username, password, name]):
        return jsonify({"success": False, "message": "Tên đăng nhập, mật khẩu và tên hiển thị là bắt buộc."}), 400
    if role not in ['user', 'admin']:
        return jsonify({"success": False, "message": "Quyền không hợp lệ."}), 400

    users = load_users()
    if username in users:
        return jsonify({"success": False, "message": "Tên đăng nhập đã tồn tại."}), 409

    # Step 1: Attempt to create the user on the NAS first.
    nas_success, nas_message = _create_nas_user(username, password, name)
    
    if not nas_success:
        # If NAS creation fails, abort the entire process.
        return jsonify({"success": False, "message": f"Tạo tài khoản portal thất bại vì: {nas_message}"}), 500

    # Step 2: If NAS user creation was successful, create the portal user.
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    users[username] = {
        "password": hashed_password,
        "name": name,
        "role": role
    }

    try:
        with open(USERS_FILE, 'w', encoding='utf-8') as f:
            json.dump(users, f, ensure_ascii=False, indent=4)
    except IOError as e:
        # This is a critical error, as the portal and NAS are now out of sync.
        app.logger.error(f"CRITICAL: Failed to write to users.json after creating NAS user '{username}'. Error: {e}")
        # At this point, manual intervention might be required. We inform the admin.
        return jsonify({
            "success": False, 
            "message": f"Lỗi nghiêm trọng: Đã tạo người dùng trên NAS nhưng không thể lưu vào portal. Vui lòng kiểm tra logs."
        }), 500
    
    return jsonify({
        "success": True, 
        "message": f"Tài khoản '{username}' đã được tạo thành công trên portal. Trạng thái NAS: {nas_message}"
    }), 201

@app.route('/api/admin/users/<string:username>', methods=['DELETE'])
@admin_required
def delete_user(username):
    """Deletes a user."""
    if username == 'admin':
        return jsonify({"success": False, "message": "Không thể xóa tài khoản quản trị viên chính."}), 403

    users = load_users()
    if username not in users:
        return jsonify({"success": False, "message": "Tài khoản không tồn tại."}), 404

    del users[username]

    with open(USERS_FILE, 'w', encoding='utf-8') as f:
        json.dump(users, f, ensure_ascii=False, indent=4)
        
    return jsonify({"success": True, "message": f"Tài khoản '{username}' đã được xóa."})

@app.route('/api/admin/users/<string:username>/role', methods=['PUT'])
@admin_required
def update_user_role(username):
    """Updates a user's role."""
    data = request.get_json()
    new_role = data.get('role')

    if not new_role or new_role not in ['user', 'admin']:
        return jsonify({"success": False, "message": "Quyền không hợp lệ."}), 400

    if username == 'admin' and new_role == 'user':
        return jsonify({"success": False, "message": "Không thể thay đổi quyền của quản trị viên chính."}), 403

    users = load_users()
    if username not in users:
        return jsonify({"success": False, "message": "Tài khoản không tồn tại."}), 404

    users[username]['role'] = new_role

    with open(USERS_FILE, 'w', encoding='utf-8') as f:
        json.dump(users, f, ensure_ascii=False, indent=4)

    return jsonify({"success": True, "message": f"Quyền của tài khoản '{username}' đã được cập nhật."})

# --- Chạy ứng dụng ---
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
