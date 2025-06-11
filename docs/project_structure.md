# MLOps Simple Dashboard - Complete Implementation Guide

## Project Structure

```
mlops-simple-dashboard/
├── backend/
│   ├── main.py                 # FastAPI backend application
│   ├── requirements.txt        # Python dependencies
│   ├── config.py              # Configuration settings
│   └── models/                # Trained models storage
├── frontend/
│   ├── index.html             # Main dashboard (MVP implementation)
│   ├── settings.html          # Settings page
│   ├── assets/
│   │   ├── css/
│   │   │   └── styles.css     # Extracted CSS (optional)
│   │   └── js/
│   │       └── app.js         # Extracted JavaScript (optional)
├── uploads/                   # Temporary file uploads
├── static/                    # Static files served by FastAPI
├── docker/
│   ├── Dockerfile             # Container configuration
│   └── docker-compose.yml     # Multi-container setup
├── docs/
│   ├── API.md                 # API documentation
│   ├── USER_GUIDE.md          # User manual
│   └── DEPLOYMENT.md          # Deployment instructions
├── tests/
│   ├── test_api.py           # Backend tests
│   └── test_frontend.py      # Frontend tests
├── requirements.txt           # Main requirements
├── README.md                  # Project overview
└── .env.example              # Environment variables template
```

## Backend Requirements

Create `backend/requirements.txt`:

```txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
python-multipart==0.0.6
pandas==2.1.3
scikit-learn==1.3.2
joblib==1.3.2
numpy==1.25.2
python-dotenv==1.0.0
pytest==7.4.3
httpx==0.25.2
```

## Environment Configuration

Create `.env.example`:

```env
# Server Configuration
HOST=0.0.0.0
PORT=8000
DEBUG=True

# File Storage
MAX_FILE_SIZE_MB=50
UPLOAD_DIR=uploads
MODEL_DIR=models

# Model Training
DEFAULT_TRAINING_TIMEOUT=900  # 15 minutes in seconds
MAX_CONCURRENT_TRAINING=3

# Notifications (Optional)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
NOTIFICATION_EMAIL=

# Security
SECRET_KEY=your-secret-key-here
CORS_ORIGINS=http://localhost:3000,http://localhost:8080
```

## Enhanced Backend Configuration

Create `backend/config.py`:

```python
import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = True
    
    # File handling
    max_file_size_mb: int = 50
    upload_dir: str = "uploads"
    model_dir: str = "models"
    
    # Training
    default_training_timeout: int = 900  # 15 minutes
    max_concurrent_training: int = 3
    
    # Security
    secret_key: str = "dev-secret-key"
    cors_origins: List[str] = ["http://localhost:3000", "http://localhost:8080"]
    
    # Optional: Email notifications
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_pass: str = ""
    notification_email: str = ""
    
    class Config:
        env_file = ".env"

settings = Settings()
```

## Docker Configuration

Create `docker/Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY backend/ ./backend/
COPY frontend/ ./static/
COPY uploads/ ./uploads/
COPY models/ ./models/

# Create necessary directories
RUN mkdir -p uploads models static

# Expose port
EXPOSE 8000

# Start application
CMD ["python", "backend/main.py"]
```

Create `docker/docker-compose.yml`:

```yaml
version: '3.8'

services:
  mlops-dashboard:
    build:
      context: ..
      dockerfile: docker/Dockerfile
    ports:
      - "8000:8000"
    volumes:
      - ../uploads:/app/uploads
      - ../models:/app/models
    environment:
      - DEBUG=True
      - HOST=0.0.0.0
      - PORT=8000
    restart: unless-stopped
    
  # Optional: Add database for production
  # postgres:
  #   image: postgres:15
  #   environment:
  #     POSTGRES_DB: mlops
  #     POSTGRES_USER: mlops
  #     POSTGRES_PASSWORD: password
  #   volumes:
  #     - postgres_data:/var/lib/postgresql/data
  #   ports:
  #     - "5432:5432"

# volumes:
#   postgres_data:
```

## API Documentation

Create `docs/API.md`:

```markdown
# ML Pipeline API Documentation

## Base URL
```
http://localhost:8000
```

## Endpoints

### File Upload
**POST** `/api/upload`
- Upload CSV file for training
- **Body**: multipart/form-data with file
- **Response**: File info and validation results

### Start Training
**POST** `/api/train`
- Start model training job
- **Body**: JSON with model_type and file_path
- **Response**: Training job ID

### Training Status
**GET** `/api/training/{job_id}`
- Get training job progress
- **Response**: Status, progress %, accuracy

### Models
**GET** `/api/models`
- List all trained models
- **Response**: Array of model info

**GET** `/api/models/{model_id}`
- Get specific model details
- **Response**: Model information and metrics

**POST** `/api/models/{model_id}/predict`
- Make prediction with model
- **Body**: JSON with input data
- **Response**: Prediction result

**POST** `/api/models/{model_id}/deploy`
- Deploy model to production
- **Response**: Deployment confirmation

**DELETE** `/api/models/{model_id}`
- Delete model
- **Response**: Deletion confirmation

### System
**GET** `/api/status`
- Get system status and metrics
- **Response**: System health info

**GET** `/api/activity`
- Get recent activity log
- **Response**: Array of recent activities

**GET** `/health`
- Health check endpoint
- **Response**: Service status
```

## Frontend Integration

Update the main dashboard to connect to the backend:

```javascript
// Add to existing dashboard JavaScript
const API_BASE = 'http://localhost:8000/api';

// Enhanced file upload with API integration
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        showLoadingState('Uploading file...');
        
        const response = await fetch(`${API_BASE}/upload`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
        }
        
        const result = await response.json();
        currentFile = result;
        
        updateUploadDisplay(result);
        document.getElementById('trainButton').disabled = false;
        
        hideLoadingState();
        
    } catch (error) {
        hideLoadingState();
        showError(`Upload failed: ${error.message}`);
    }
}

// Enhanced training with real API calls
async function startTraining() {
    if (!currentFile || isTraining) return;
    
    try {
        showLoadingState('Starting training...');
        
        const response = await fetch(`${API_BASE}/train`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model_type: 'automatic',
                file_path: currentFile.file_path
            })
        });
        
        if (!response.ok) {
            throw new Error(`Training failed: ${response.statusText}`);
        }
        
        const result = await response.json();
        currentJobId = result.job_id;
        
        isTraining = true;
        updateWorkflowSteps('training');
        
        // Poll for training status
        pollTrainingStatus(currentJobId);
        
        hideLoadingState();
        
    } catch (error) {
        hideLoadingState();
        showError(`Training failed: ${error.message}`);
    }
}

// Poll training status
async function pollTrainingStatus(jobId) {
    const interval = setInterval(async () => {
        try {
            const response = await fetch(`${API_BASE}/training/${jobId}`);
            const status = await response.json();
            
            updateTrainingProgress(status);
            
            if (status.status === 'completed') {
                clearInterval(interval);
                trainingComplete(status);
            } else if (status.status === 'failed') {
                clearInterval(interval);
                trainingFailed(status);
            }
            
        } catch (error) {
            console.error('Status polling error:', error);
        }
    }, 2000); // Poll every 2 seconds
}

// Utility functions for UI updates
function showLoadingState(message) {
    // Implementation for loading UI
}

function hideLoadingState() {
    // Implementation to hide loading UI
}

function showError(message) {
    alert('❌ Error: ' + message);
}

function updateUploadDisplay(fileInfo) {
    const uploadArea = document.querySelector('.upload-area');
    uploadArea.innerHTML = `
        <div class="upload-icon">✅</div>
        <h4>File Ready: ${fileInfo.filename}</h4>
        <p style="color: var(--text-secondary); margin-top: var(--spacing-sm);">
            ${fileInfo.rows} rows, ${fileInfo.columns} columns
        </p>
    `;
}

function updateTrainingProgress(status) {
    const progressBar = document.querySelector('.progress-fill');
    const progressLabel = document.querySelector('.progress-label span:last-child');
    
    progressBar.style.width = status.progress + '%';
    progressLabel.textContent = status.progress + '%';
    
    // Update status message if available
    if (status.message) {
        console.log('Training:', status.message);
    }
}
```

## Deployment Instructions

### Development Setup

1. **Clone and Setup**:
```bash
git clone <repository>
cd mlops-simple-dashboard
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

2. **Environment Configuration**:
```bash
cp .env.example .env
# Edit .env with your settings
```

3. **Create Directories**:
```bash
mkdir -p uploads models static
```

4. **Copy Frontend Files**:
```bash
cp frontend/*.html static/
```

5. **Run Development Server**:
```bash
cd backend
python main.py
```

6. **Access Application**:
- Open browser to `http://localhost:8000`

### Production Deployment

#### Option 1: Docker (Recommended)

```bash
# Build and run with Docker Compose
docker-compose -f docker/docker-compose.yml up -d

# Check logs
docker-compose -f docker/docker-compose.yml logs -f
```

#### Option 2: Traditional Server

```bash
# Install production server
pip install gunicorn

# Run with Gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker backend.main:app --bind 0.0.0.0:8000

# Or with systemd service (create /etc/systemd/system/mlops.service)
```

#### Option 3: Cloud Deployment

**Heroku**:
```bash
# Install Heroku CLI and create Procfile
echo "web: gunicorn -w 4 -k uvicorn.workers.UvicornWorker backend.main:app --bind 0.0.0.0:\$PORT" > Procfile

heroku create your-app-name
heroku config:set DEBUG=False
git push heroku main
```

**AWS/GCP/Azure**: Use container deployment with the provided Dockerfile.

## Testing

Create `tests/test_api.py`:

```python
import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_system_status():
    response = client.get("/api/status")
    assert response.status_code == 200
    data = response.json()
    assert "total_models" in data
    assert "system_health" in data

def test_upload_invalid_file():
    response = client.post("/api/upload", files={"file": ("test.txt", "invalid data", "text/plain")})
    assert response.status_code == 400

# Add more tests as needed
```

Run tests:
```bash
pytest tests/
```

## User Guide

Create `docs/USER_GUIDE.md`:

```markdown
# ML Pipeline User Guide

## Getting Started

1. **Upload Your Data**
   - Click the upload area or drag & drop a CSV file
   - File should have columns with your data and a target column
   - Maximum file size: 50MB

2. **Start Training**
   - Click "Start Training" after uploading data
   - Watch the progress bar for training status
   - Training typically takes 5-15 minutes

3. **View Results**
   - Check the accuracy percentage
   - Review model performance metrics
   - View training activity in the log

4. **Use Your Model**
   - Click "Use This Model" to deploy
   - Model is now ready for predictions
   - Check the activity log for confirmation

## Tips for Best Results

- **Data Quality**: Clean data produces better models
- **File Format**: Use CSV files with headers
- **Target Column**: Place your prediction target in the last column
- **Data Size**: More data (1000+ rows) generally improves accuracy

## Troubleshooting

- **Upload Failed**: Check file format and size
- **Training Failed**: Verify data has at least 2 columns
- **Low Accuracy**: Try cleaning your data or adding more samples
```

## Maintenance & Monitoring

### Log Monitoring
```bash
# View application logs
tail -f /var/log/mlops/app.log

# Monitor with Docker
docker-compose logs -f mlops-dashboard
```

### Backup Strategy
```bash
# Backup models and data
tar -czf backup-$(date +%Y%m%d).tar.gz models/ uploads/

# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d)
tar -czf "backup-$DATE.tar.gz" models/ uploads/
aws s3 cp "backup-$DATE.tar.gz" s3://your-backup-bucket/
```

### Performance Monitoring
- Monitor `/health` endpoint for uptime
- Check `/api/status` for system metrics
- Use application logs for debugging
- Monitor disk space for model storage

## Next Steps (Phase 2)

After successful MVP deployment, consider:

1. **User Authentication**: Add login system
2. **Database Integration**: Replace in-memory storage
3. **Advanced Models**: Support for deep learning
4. **Model Monitoring**: Track model drift and performance
5. **Multi-user Support**: Team collaboration features
6. **API Scaling**: Load balancing and caching
7. **Advanced Visualizations**: Detailed charts and insights

## Budget & Timeline

**MVP Phase (Current)**:
- Timeline: 1-2 weeks
- Budget: $1.5K-2K
- Features: Basic pipeline, simple UI, core functionality

**Phase 2 (Enterprise)**:
- Timeline: 4-6 weeks additional
- Budget: $3.5K-4K additional
- Features: Full enterprise capabilities

Total investment for complete platform: $5K over 2 phases.
```

This complete implementation guide provides everything needed to build and deploy the simplified MLOps dashboard MVP, following all the consensus decisions from our triangulated perspectives process.