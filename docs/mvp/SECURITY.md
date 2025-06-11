# 🔒 MLOps Dashboard Security Guide

## Overview

This document outlines security best practices and implementation guidelines for the MLOps Dashboard. Security is critical when handling sensitive data and machine learning models.

## 🛡️ Security Principles

1. **Defense in Depth**: Multiple layers of security controls
2. **Least Privilege**: Grant minimum necessary permissions
3. **Zero Trust**: Verify everything, trust nothing
4. **Data Privacy**: Protect sensitive information at all times
5. **Audit Everything**: Log and monitor all activities

## 🔐 Authentication & Authorization

### Current State (MVP)
- No authentication required
- Open access to all endpoints
- Suitable for development/testing only

### Phase 2 Implementation

#### JWT Authentication
```python
# backend/backend_api.py additions
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Create access token
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Verify token
async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    return username
```

#### Role-Based Access Control (RBAC)
```python
# User roles
class UserRole(Enum):
    ADMIN = "admin"
    DATA_SCIENTIST = "data_scientist"
    ANALYST = "analyst"
    VIEWER = "viewer"

# Permission decorators
def require_role(allowed_roles: List[UserRole]):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, user: User = Depends(get_current_user), **kwargs):
            if user.role not in allowed_roles:
                raise HTTPException(
                    status_code=403,
                    detail="Insufficient permissions"
                )
            return await func(*args, user=user, **kwargs)
        return wrapper
    return decorator

# Usage
@app.post("/api/models/{model_id}/deploy")
@require_role([UserRole.ADMIN, UserRole.DATA_SCIENTIST])
async def deploy_model(model_id: str, user: User = Depends(get_current_user)):
    # Deploy logic
    pass
```

## 🔏 Data Security

### 1. Encryption at Rest

#### Database Encryption
```sql
-- PostgreSQL Transparent Data Encryption
ALTER SYSTEM SET ssl = on;
ALTER SYSTEM SET ssl_cert_file = 'server.crt';
ALTER SYSTEM SET ssl_key_file = 'server.key';
```

#### File Encryption
```python
from cryptography.fernet import Fernet

class FileEncryption:
    def __init__(self, key: bytes):
        self.cipher = Fernet(key)
    
    def encrypt_file(self, file_path: str):
        with open(file_path, 'rb') as f:
            encrypted = self.cipher.encrypt(f.read())
        with open(file_path + '.enc', 'wb') as f:
            f.write(encrypted)
    
    def decrypt_file(self, encrypted_path: str):
        with open(encrypted_path, 'rb') as f:
            decrypted = self.cipher.decrypt(f.read())
        return decrypted
```

### 2. Encryption in Transit

#### HTTPS Configuration
```python
# Force HTTPS in production
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware

if ML_ENV == "production":
    app.add_middleware(HTTPSRedirectMiddleware)
```

#### API Encryption
```python
# Encrypt sensitive API responses
def encrypt_response(data: dict) -> dict:
    sensitive_fields = ['ssn', 'credit_card', 'api_key']
    for field in sensitive_fields:
        if field in data:
            data[field] = encrypt_field(data[field])
    return data
```

### 3. Data Anonymization

```python
import hashlib
from faker import Faker

fake = Faker()

def anonymize_data(df):
    """Anonymize sensitive columns in dataframe"""
    sensitive_columns = ['name', 'email', 'phone', 'address']
    
    for col in sensitive_columns:
        if col in df.columns:
            if col == 'email':
                df[col] = df[col].apply(lambda x: hashlib.sha256(x.encode()).hexdigest()[:8] + '@example.com')
            elif col == 'name':
                df[col] = df[col].apply(lambda x: fake.name())
            elif col == 'phone':
                df[col] = df[col].apply(lambda x: fake.phone_number())
            else:
                df[col] = df[col].apply(lambda x: hashlib.sha256(x.encode()).hexdigest())
    
    return df
```

## 🚫 Input Validation & Sanitization

### 1. File Upload Security

```python
import magic
from pathlib import Path

ALLOWED_EXTENSIONS = {'.csv', '.xlsx', '.json'}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

async def validate_upload(file: UploadFile):
    # Check file size
    if file.size > MAX_FILE_SIZE:
        raise HTTPException(400, "File too large")
    
    # Check file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"File type {file_ext} not allowed")
    
    # Check MIME type
    file_content = await file.read()
    mime = magic.from_buffer(file_content, mime=True)
    
    allowed_mimes = {
        'text/csv',
        'application/vnd.ms-excel',
        'application/json'
    }
    
    if mime not in allowed_mimes:
        raise HTTPException(400, "Invalid file type")
    
    # Reset file pointer
    await file.seek(0)
    
    # Scan for malware (optional)
    # scan_result = await scan_file_for_malware(file_content)
    # if scan_result.is_malicious:
    #     raise HTTPException(400, "Malicious file detected")
    
    return True
```

### 2. SQL Injection Prevention

```python
from sqlalchemy import text
from sqlalchemy.orm import Session

# Bad - vulnerable to SQL injection
def get_model_unsafe(db: Session, model_name: str):
    query = f"SELECT * FROM models WHERE name = '{model_name}'"
    return db.execute(query).fetchall()

# Good - parameterized queries
def get_model_safe(db: Session, model_name: str):
    query = text("SELECT * FROM models WHERE name = :name")
    return db.execute(query, {"name": model_name}).fetchall()

# Best - use ORM
def get_model_orm(db: Session, model_name: str):
    return db.query(Model).filter(Model.name == model_name).first()
```

### 3. XSS Prevention

```python
import html
from markupsafe import Markup, escape

def sanitize_input(user_input: str) -> str:
    """Sanitize user input to prevent XSS"""
    # Escape HTML entities
    sanitized = html.escape(user_input)
    
    # Remove potentially dangerous patterns
    dangerous_patterns = [
        '<script', '</script>',
        'javascript:', 'on\w+\s*=',
        '<iframe', '<object', '<embed'
    ]
    
    for pattern in dangerous_patterns:
        sanitized = re.sub(pattern, '', sanitized, flags=re.IGNORECASE)
    
    return sanitized
```

## 🔑 Secrets Management

### 1. Environment Variables

```python
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Never hardcode secrets
# Bad
API_KEY = "sk-1234567890abcdef"

# Good
API_KEY = os.getenv("API_KEY")
if not API_KEY:
    raise ValueError("API_KEY environment variable not set")
```

### 2. Secrets Rotation

```python
import secrets
from datetime import datetime, timedelta

class SecretManager:
    def __init__(self):
        self.secrets = {}
        self.rotation_interval = timedelta(days=90)
    
    def generate_secret(self, name: str) -> str:
        """Generate a new secret"""
        secret = secrets.token_urlsafe(32)
        self.secrets[name] = {
            'value': secret,
            'created': datetime.utcnow(),
            'expires': datetime.utcnow() + self.rotation_interval
        }
        return secret
    
    def should_rotate(self, name: str) -> bool:
        """Check if secret should be rotated"""
        if name not in self.secrets:
            return True
        return datetime.utcnow() > self.secrets[name]['expires']
```

## 🚨 Security Headers

### Nginx Configuration
```nginx
# Security headers
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### FastAPI Middleware
```python
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,  # Specific origins only
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

# Session security
app.add_middleware(
    SessionMiddleware,
    secret_key=SECRET_KEY,
    same_site="strict",
    https_only=True  # In production
)
```

## 📊 Logging & Monitoring

### 1. Security Logging

```python
import logging
from datetime import datetime

class SecurityLogger:
    def __init__(self):
        self.logger = logging.getLogger('security')
        handler = logging.FileHandler('security.log')
        handler.setFormatter(logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        ))
        self.logger.addHandler(handler)
        self.logger.setLevel(logging.INFO)
    
    def log_auth_attempt(self, username: str, success: bool, ip: str):
        self.logger.info(f"Auth attempt - User: {username}, Success: {success}, IP: {ip}")
    
    def log_data_access(self, user: str, resource: str, action: str):
        self.logger.info(f"Data access - User: {user}, Resource: {resource}, Action: {action}")
    
    def log_security_event(self, event_type: str, details: dict):
        self.logger.warning(f"Security event - Type: {event_type}, Details: {details}")
```

### 2. Intrusion Detection

```python
from collections import defaultdict
from datetime import datetime, timedelta

class IntrusionDetector:
    def __init__(self):
        self.failed_attempts = defaultdict(list)
        self.blocked_ips = set()
        self.max_attempts = 5
        self.block_duration = timedelta(hours=1)
    
    def record_failed_attempt(self, ip: str):
        now = datetime.utcnow()
        self.failed_attempts[ip].append(now)
        
        # Clean old attempts
        self.failed_attempts[ip] = [
            attempt for attempt in self.failed_attempts[ip]
            if now - attempt < timedelta(minutes=15)
        ]
        
        # Check if should block
        if len(self.failed_attempts[ip]) >= self.max_attempts:
            self.block_ip(ip)
    
    def block_ip(self, ip: str):
        self.blocked_ips.add(ip)
        # Log security event
        security_logger.log_security_event("IP_BLOCKED", {"ip": ip})
    
    def is_blocked(self, ip: str) -> bool:
        return ip in self.blocked_ips
```

## 🛑 Rate Limiting

```python
from fastapi import Request
from fastapi.responses import JSONResponse
import time
from collections import defaultdict

class RateLimiter:
    def __init__(self, requests_per_minute: int = 60):
        self.requests_per_minute = requests_per_minute
        self.requests = defaultdict(list)
    
    async def __call__(self, request: Request, call_next):
        client_ip = request.client.host
        now = time.time()
        minute_ago = now - 60
        
        # Clean old requests
        self.requests[client_ip] = [
            req_time for req_time in self.requests[client_ip]
            if req_time > minute_ago
        ]
        
        # Check rate limit
        if len(self.requests[client_ip]) >= self.requests_per_minute:
            return JSONResponse(
                status_code=429,
                content={"error": "Rate limit exceeded"}
            )
        
        # Record request
        self.requests[client_ip].append(now)
        
        response = await call_next(request)
        return response

# Add to app
app.add_middleware(RateLimiter)
```

## 🔍 Security Checklist

### Development
- [ ] Use environment variables for secrets
- [ ] Enable HTTPS in development
- [ ] Implement basic input validation
- [ ] Use parameterized database queries
- [ ] Enable CORS with specific origins

### Pre-Production
- [ ] Implement authentication system
- [ ] Add authorization/RBAC
- [ ] Enable all security headers
- [ ] Set up security logging
- [ ] Implement rate limiting
- [ ] Configure firewall rules
- [ ] Run security scan (OWASP ZAP)
- [ ] Perform penetration testing
- [ ] Review code for vulnerabilities
- [ ] Set up intrusion detection

### Production
- [ ] Use strong SSL certificates
- [ ] Enable Web Application Firewall (WAF)
- [ ] Implement DDoS protection
- [ ] Set up security monitoring/SIEM
- [ ] Configure automated backups
- [ ] Implement secret rotation
- [ ] Enable audit logging
- [ ] Set up incident response plan
- [ ] Regular security updates
- [ ] Compliance checks (GDPR, SOC2)

## 🚀 Security Tools

### Scanning Tools
```bash
# Dependency vulnerability scanning
pip install safety
safety check

# Code security scanning
pip install bandit
bandit -r backend/

# Container scanning (if using Docker)
docker scan your-image:tag
```

### Monitoring Tools
- **Sentry**: Application error tracking
- **Datadog**: Infrastructure and APM
- **Splunk**: Log aggregation and SIEM
- **CloudFlare**: DDoS protection and WAF

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)
- [Python Security Best Practices](https://python.readthedocs.io/en/latest/library/security_warnings.html)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)