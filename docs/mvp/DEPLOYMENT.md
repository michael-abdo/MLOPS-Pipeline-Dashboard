# 🚀 MLOps Dashboard Deployment Guide

## Overview

This guide covers deploying the MLOps Dashboard to production environments. The application can be deployed to various platforms including cloud providers, VPS, or on-premises servers.

## 📋 Prerequisites

- Python 3.8+ installed
- 2GB+ RAM minimum (4GB+ recommended)
- 10GB+ storage for models and data
- PostgreSQL 12+ or MongoDB 4.4+ (for production)
- Domain name (optional, for custom domain)
- SSL certificate (recommended for production)

## 🐳 Docker Deployment (Recommended)

### 1. Create Dockerfile
```dockerfile
FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY backend_api.py .
COPY backend_simple.py .
COPY static/ ./static/

# Create necessary directories
RUN mkdir -p uploads models logs

# Expose port
EXPOSE 8000

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV ML_ENV=production

# Run the application
CMD ["uvicorn", "backend_api:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 2. Create docker-compose.yml
```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://mlops:password@db:5432/mlops_db
      - REDIS_URL=redis://redis:6379
      - SECRET_KEY=${SECRET_KEY}
      - ML_ENV=production
    volumes:
      - ./uploads:/app/uploads
      - ./models:/app/models
      - ./logs:/app/logs
    depends_on:
      - db
      - redis
    restart: unless-stopped

  db:
    image: postgres:14
    environment:
      - POSTGRES_USER=mlops
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=mlops_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - web
    restart: unless-stopped

volumes:
  postgres_data:
```

### 3. Deploy with Docker
```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## ☁️ Cloud Platform Deployments

### AWS EC2 Deployment

1. **Launch EC2 Instance**
   ```bash
   # Recommended: t3.medium or larger
   # OS: Ubuntu 22.04 LTS
   # Security Group: Open ports 22, 80, 443
   ```

2. **Connect and Setup**
   ```bash
   ssh -i your-key.pem ubuntu@your-instance-ip
   
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install dependencies
   sudo apt install python3-pip python3-venv nginx postgresql -y
   
   # Clone repository
   git clone <your-repo-url>
   cd mlops/development
   ```

3. **Setup Application**
   ```bash
   # Create virtual environment
   python3 -m venv venv
   source venv/bin/activate
   
   # Install dependencies
   pip install -r requirements.txt
   pip install gunicorn
   
   # Setup environment variables
   cp .env.example .env
   nano .env  # Edit with your values
   ```

4. **Configure Systemd Service**
   ```bash
   sudo nano /etc/systemd/system/mlops.service
   ```
   
   ```ini
   [Unit]
   Description=MLOps Dashboard
   After=network.target
   
   [Service]
   User=ubuntu
   Group=ubuntu
   WorkingDirectory=/home/ubuntu/mlops/development
   Environment="PATH=/home/ubuntu/mlops/development/venv/bin"
   ExecStart=/home/ubuntu/mlops/development/venv/bin/gunicorn -w 4 -k uvicorn.workers.UvicornWorker backend_api:app --bind 0.0.0.0:8000
   Restart=always
   
   [Install]
   WantedBy=multi-user.target
   ```
   
   ```bash
   sudo systemctl enable mlops
   sudo systemctl start mlops
   ```

### Heroku Deployment

1. **Create Procfile**
   ```
   web: uvicorn backend_api:app --host 0.0.0.0 --port $PORT
   ```

2. **Create runtime.txt**
   ```
   python-3.9.16
   ```

3. **Deploy to Heroku**
   ```bash
   heroku create your-app-name
   heroku addons:create heroku-postgresql:hobby-dev
   heroku config:set ML_ENV=production
   git push heroku main
   heroku open
   ```

### Google Cloud Platform (App Engine)

1. **Create app.yaml**
   ```yaml
   runtime: python39
   
   instance_class: F2
   
   env_variables:
     ML_ENV: "production"
   
   automatic_scaling:
     min_instances: 1
     max_instances: 10
   
   handlers:
   - url: /static
     static_dir: static
   
   - url: /.*
     script: auto
   ```

2. **Deploy**
   ```bash
   gcloud app deploy
   gcloud app browse
   ```

## 🔒 Production Configuration

### 1. Environment Variables (.env)
```bash
# Application
ML_ENV=production
SECRET_KEY=your-secret-key-here
API_KEY=your-api-key-here

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/mlops_db
# or
MONGODB_URL=mongodb://user:password@localhost:27017/mlops_db

# Redis (for caching/queues)
REDIS_URL=redis://localhost:6379

# Storage (S3 for model storage)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET_NAME=mlops-models

# Email (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Monitoring
SENTRY_DSN=https://your-sentry-dsn

# Security
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
CORS_ORIGINS=https://yourdomain.com
```

### 2. Nginx Configuration
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static {
        alias /var/www/mlops/static;
        expires 30d;
    }
}
```

### 3. Database Setup

#### PostgreSQL
```sql
-- Create database and user
CREATE DATABASE mlops_db;
CREATE USER mlops_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE mlops_db TO mlops_user;

-- Create tables (run from application)
python -c "from backend_api import create_tables; create_tables()"
```

#### MongoDB
```javascript
// Create database and user
use mlops_db
db.createUser({
  user: "mlops_user",
  pwd: "secure_password",
  roles: [{role: "readWrite", db: "mlops_db"}]
})
```

## 📊 Monitoring Setup

### 1. Application Monitoring (with Prometheus)
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'mlops'
    static_configs:
      - targets: ['localhost:8000']
```

### 2. Logging (with ELK Stack)
```bash
# Install Filebeat
curl -L -O https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-8.6.0-amd64.deb
sudo dpkg -i filebeat-8.6.0-amd64.deb

# Configure Filebeat
sudo nano /etc/filebeat/filebeat.yml
```

### 3. Health Checks
```bash
# Add to crontab
*/5 * * * * curl -f http://localhost:8000/health || systemctl restart mlops
```

## 🔐 Security Hardening

### 1. Firewall Configuration
```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. SSL Certificate (Let's Encrypt)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 3. Security Headers
Add to Nginx configuration:
```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';" always;
```

## 🔄 Backup and Recovery

### 1. Automated Backups
```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/mlops"

# Backup database
pg_dump mlops_db > $BACKUP_DIR/db_$DATE.sql

# Backup models
tar -czf $BACKUP_DIR/models_$DATE.tar.gz /app/models

# Upload to S3
aws s3 cp $BACKUP_DIR/db_$DATE.sql s3://mlops-backups/
aws s3 cp $BACKUP_DIR/models_$DATE.tar.gz s3://mlops-backups/

# Clean old backups (keep 30 days)
find $BACKUP_DIR -type f -mtime +30 -delete
```

### 2. Restore Procedure
```bash
# Restore database
psql mlops_db < backup.sql

# Restore models
tar -xzf models_backup.tar.gz -C /app/models
```

## 📈 Scaling Considerations

### Horizontal Scaling
1. Use load balancer (Nginx, HAProxy, or cloud LB)
2. Deploy multiple application instances
3. Use shared storage for models (S3, NFS)
4. Use Redis for distributed caching

### Vertical Scaling
1. Increase instance size for more CPU/RAM
2. Use GPU instances for faster training
3. Optimize database queries and indexing

## 🚨 Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   sudo lsof -i :8000
   sudo kill -9 <PID>
   ```

2. **Database Connection Failed**
   - Check DATABASE_URL format
   - Verify database service is running
   - Check firewall rules

3. **Out of Memory**
   - Increase swap space
   - Limit concurrent training jobs
   - Use model quantization

4. **Slow Training**
   - Enable GPU support
   - Reduce model complexity
   - Use distributed training

## 📝 Post-Deployment Checklist

- [ ] SSL certificate installed and working
- [ ] Database backups configured
- [ ] Monitoring and alerts set up
- [ ] Security headers configured
- [ ] Firewall rules applied
- [ ] Environment variables secured
- [ ] Health checks running
- [ ] Logs being collected
- [ ] Error tracking enabled
- [ ] Performance baseline established

## 🔗 Additional Resources

- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)
- [PostgreSQL Best Practices](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Docker Production Guide](https://docs.docker.com/develop/dev-best-practices/)
- [AWS ML Best Practices](https://docs.aws.amazon.com/wellarchitected/latest/machine-learning-lens/welcome.html)