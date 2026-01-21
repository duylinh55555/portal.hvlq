import os

# Secret key for Flask session management.
# For production, you should use a more complex, randomly generated key
# and ideally load it from an environment variable.
# You can generate a new key with: python -c 'import secrets; print(secrets.token_hex(16))'
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-default-secret-key-change-me')

# Add any other configuration variables your application might need below.