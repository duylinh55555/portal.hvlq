import os

# Secret key for Flask session management.
# For production, you should use a more complex, randomly generated key
# and ideally load it from an environment variable.
# You can generate a new key with: python -c 'import secrets; print(secrets.token_hex(16))'
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-default-secret-key-change-me')

# --- Synology NAS Configuration ---
# Replace with your Synology NAS details
NAS_HOSTNAME = os.environ.get('NAS_HOSTNAME', '192.168.2.153')
NAS_PORT = int(os.environ.get('NAS_PORT', 22))  # Default SFTP port is 22
# The absolute path to the shared folder on your NAS.
# This often starts with '/volume1/' or similar. Please verify the correct path on your NAS.
REMOTE_PATH = os.environ.get('REMOTE_PATH', '/volume1/Portal') # The absolute path on the NAS


# Add any other configuration variables your application might need below.