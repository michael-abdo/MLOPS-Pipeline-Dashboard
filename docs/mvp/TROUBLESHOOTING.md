# 🔧 Troubleshooting Guide

## Overview

This guide helps resolve common issues with the MLOps Dashboard. Issues are organized by category with step-by-step solutions.

## 🚀 Quick Diagnostics

### Health Check Commands
```bash
# Check if backend is running
curl http://localhost:8000/health

# Check system status
curl http://localhost:8000/api/status

# Test file upload endpoint
curl -X POST -F "file=@test.csv" http://localhost:8000/api/upload

# Check logs
tail -f logs/mlops.log
```

### System Requirements Check
```bash
# Python version
python3 --version  # Should be 3.8+

# Memory usage
free -h

# Disk space
df -h

# CPU info
nproc
```

## 🌐 Server & Connection Issues

### Issue: Server Won't Start

**Error Messages:**
- `Port 8000 already in use`
- `Permission denied`
- `Module not found`

**Solutions:**

1. **Check if port is in use:**
   ```bash
   # Find process using port 8000
   lsof -i :8000
   
   # Kill process if needed
   kill -9 <PID>
   
   # Or use different port
   uvicorn backend.backend_api:app --port 8001
   ```

2. **Check permissions:**
   ```bash
   # Ensure you can bind to port
   sudo ufw allow 8000
   
   # For ports < 1024, run as root (not recommended)
   sudo python backend/backend_api.py
   ```

3. **Install missing dependencies:**
   ```bash
   # Activate virtual environment
   source venv/bin/activate
   
   # Reinstall requirements
   pip install -r requirements.txt
   
   # Check for missing modules
   python -c "import fastapi, uvicorn, pandas, sklearn"
   ```

### Issue: Can't Access Dashboard

**Error Messages:**
- `This site can't be reached`
- `Connection refused`
- `404 Not Found`

**Solutions:**

1. **Verify server is running:**
   ```bash
   ps aux | grep python
   netstat -tlnp | grep 8000
   ```

2. **Check firewall settings:**
   ```bash
   # Ubuntu/Debian
   sudo ufw status
   sudo ufw allow 8000
   
   # CentOS/RHEL
   sudo firewall-cmd --list-ports
   sudo firewall-cmd --add-port=8000/tcp --permanent
   ```

3. **Verify localhost access:**
   ```bash
   # Try different addresses
   curl http://localhost:8000
   curl http://127.0.0.1:8000
   curl http://0.0.0.0:8000
   ```

## 📁 File Upload Issues

### Issue: Upload Fails

**Error Messages:**
- `File too large`
- `Invalid file format`
- `Upload timeout`

**Solutions:**

1. **Check file size (max 50MB):**
   ```bash
   ls -lh your_file.csv
   
   # Reduce file size if needed
   head -1000 large_file.csv > smaller_file.csv
   ```

2. **Verify file format:**
   ```bash
   file your_file.csv  # Should show: text/plain, ASCII text
   
   # Check encoding
   file -bi your_file.csv  # Should show: text/plain; charset=utf-8
   ```

3. **Test with sample data:**
   ```csv
   # Create test.csv
   age,income,purchased
   25,50000,yes
   30,60000,no
   35,70000,yes
   ```

### Issue: CSV Parsing Errors

**Error Messages:**
- `ParserError: Error tokenizing data`
- `UnicodeDecodeError`
- `Column count mismatch`

**Solutions:**

1. **Check file encoding:**
   ```python
   import chardet
   
   with open('your_file.csv', 'rb') as f:
       result = chardet.detect(f.read())
       print(result)  # Shows encoding
   ```

2. **Fix encoding issues:**
   ```bash
   # Convert to UTF-8
   iconv -f ISO-8859-1 -t UTF-8 input.csv > output.csv
   
   # Remove BOM
   sed '1s/^\xEF\xBB\xBF//' input.csv > output.csv
   ```

3. **Handle special characters:**
   ```python
   import pandas as pd
   
   # Try different encodings
   encodings = ['utf-8', 'latin-1', 'iso-8859-1', 'cp1252']
   for encoding in encodings:
       try:
           df = pd.read_csv('file.csv', encoding=encoding)
           print(f"Success with {encoding}")
           break
       except:
           continue
   ```

## 🤖 Model Training Issues

### Issue: Training Fails

**Error Messages:**
- `Training job failed`
- `Not enough data`
- `All features are constant`

**Solutions:**

1. **Check data quality:**
   ```python
   import pandas as pd
   
   df = pd.read_csv('your_data.csv')
   
   # Check shape
   print(f"Shape: {df.shape}")
   
   # Check for missing values
   print(f"Missing values:\n{df.isnull().sum()}")
   
   # Check target column
   target_col = df.columns[-1]
   print(f"Target values: {df[target_col].value_counts()}")
   
   # Check for constant features
   constant_cols = [col for col in df.columns[:-1] 
                   if df[col].nunique() <= 1]
   print(f"Constant columns: {constant_cols}")
   ```

2. **Fix data issues:**
   ```python
   # Remove constant columns
   df = df.loc[:, df.nunique() > 1]
   
   # Handle missing values
   for col in df.columns[:-1]:
       if df[col].dtype in ['int64', 'float64']:
           df[col].fillna(df[col].median(), inplace=True)
       else:
           df[col].fillna(df[col].mode()[0], inplace=True)
   
   # Ensure minimum data size
   assert len(df) >= 20, "Need at least 20 rows"
   assert len(df.columns) >= 2, "Need at least 2 columns"
   ```

### Issue: Low Model Accuracy

**Symptoms:**
- Accuracy below 60%
- Model predictions are random
- All predictions are the same

**Solutions:**

1. **Check data balance:**
   ```python
   # For classification
   target_counts = df[target_col].value_counts()
   print(f"Class distribution:\n{target_counts}")
   
   # Check for extreme imbalance
   min_class_ratio = target_counts.min() / target_counts.sum()
   if min_class_ratio < 0.05:
       print("Severe class imbalance detected")
   ```

2. **Improve data quality:**
   ```python
   # Remove outliers
   from scipy import stats
   df = df[(np.abs(stats.zscore(df.select_dtypes(include=[np.number]))) < 3).all(axis=1)]
   
   # Feature engineering
   # Create new features, normalize data, etc.
   
   # Increase data size
   # Collect more representative samples
   ```

3. **Use appropriate algorithms:**
   - Small datasets (< 1000 rows): Try Random Forest
   - Large datasets (> 10000 rows): Try Gradient Boosting
   - High-dimensional data: Try Linear models with regularization

### Issue: Training Takes Too Long

**Symptoms:**
- Training stuck in progress
- Timeout errors
- High CPU/memory usage

**Solutions:**

1. **Reduce data size:**
   ```python
   # Sample data
   df_sample = df.sample(n=10000, random_state=42)
   
   # Feature selection
   from sklearn.feature_selection import SelectKBest, f_classif
   
   X = df.iloc[:, :-1]
   y = df.iloc[:, -1]
   
   selector = SelectKBest(score_func=f_classif, k=10)
   X_selected = selector.fit_transform(X, y)
   ```

2. **Optimize algorithm parameters:**
   ```python
   # Faster Random Forest
   params = {
       'n_estimators': 50,  # Reduce from default 100
       'max_depth': 10,     # Limit tree depth
       'n_jobs': -1         # Use all CPU cores
   }
   ```

3. **Increase timeout:**
   ```python
   # In .env file
   MAX_TRAINING_TIME=600  # 10 minutes
   ```

## 💾 Database Issues

### Issue: Database Connection Failed

**Error Messages:**
- `Connection refused`
- `Authentication failed`
- `Database does not exist`

**Solutions:**

1. **Check database service:**
   ```bash
   # PostgreSQL
   sudo systemctl status postgresql
   sudo systemctl start postgresql
   
   # Check connection
   psql -h localhost -U mlops_user -d mlops_db
   ```

2. **Verify credentials:**
   ```bash
   # Check .env file
   cat .env | grep DATABASE_URL
   
   # Test connection
   python -c "
   from sqlalchemy import create_engine
   engine = create_engine('$DATABASE_URL')
   engine.connect()
   print('Connection successful')
   "
   ```

3. **Reset database:**
   ```sql
   -- Drop and recreate database
   DROP DATABASE IF EXISTS mlops_db;
   CREATE DATABASE mlops_db;
   GRANT ALL PRIVILEGES ON DATABASE mlops_db TO mlops_user;
   ```

## 🖥️ Frontend Issues

### Issue: Page Won't Load

**Symptoms:**
- Blank white page
- JavaScript errors in console
- Static files not loading

**Solutions:**

1. **Check browser console:**
   ```javascript
   // Press F12, look for errors like:
   // - Failed to load resource
   // - CORS policy error
   // - JavaScript syntax errors
   ```

2. **Verify static file serving:**
   ```bash
   # Check if files exist
   ls -la static/
   
   # Test direct access
   curl http://localhost:8000/static/index.html
   ```

3. **Clear browser cache:**
   ```bash
   # Chrome/Firefox: Ctrl+Shift+R
   # Or use private/incognito mode
   ```

### Issue: API Calls Failing

**Symptoms:**
- Loading indicators stuck
- Error messages in browser
- Network errors in dev tools

**Solutions:**

1. **Check CORS configuration:**
   ```python
   # In backend/backend_api.py
   from fastapi.middleware.cors import CORSMiddleware
   
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["http://localhost:3000", "http://localhost:8000"],
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```

2. **Test API endpoints:**
   ```bash
   # Test each endpoint
   curl -X GET http://localhost:8000/api/status
   curl -X POST -F "file=@test.csv" http://localhost:8000/api/upload
   ```

## 🔍 Performance Issues

### Issue: Slow Response Times

**Symptoms:**
- Pages take long to load
- API calls timeout
- High CPU/memory usage

**Solutions:**

1. **Monitor system resources:**
   ```bash
   # Check CPU and memory
   htop
   
   # Check disk I/O
   iostat -x 1
   
   # Check network
   netstat -i
   ```

2. **Optimize database queries:**
   ```sql
   -- Add indexes
   CREATE INDEX idx_model_created_at ON models(created_at);
   
   -- Analyze slow queries
   EXPLAIN ANALYZE SELECT * FROM models WHERE status = 'deployed';
   ```

3. **Enable caching:**
   ```python
   # Add Redis caching
   import redis
   
   redis_client = redis.Redis(host='localhost', port=6379, db=0)
   
   @app.get("/api/models")
   async def get_models():
       # Check cache first
       cached = redis_client.get("models")
       if cached:
           return json.loads(cached)
       
       # Get from database
       models = fetch_models_from_db()
       
       # Cache for 5 minutes
       redis_client.setex("models", 300, json.dumps(models))
       return models
   ```

## 🚨 Error Code Reference

### HTTP Status Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 400 | Bad Request | Invalid file format, missing parameters |
| 401 | Unauthorized | Missing or invalid API key |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Model/resource doesn't exist |
| 413 | Payload Too Large | File exceeds 50MB limit |
| 422 | Unprocessable Entity | Data validation failed |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |
| 503 | Service Unavailable | Server overloaded |

### Application Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `INVALID_FORMAT` | File format not supported | Use CSV format |
| `FILE_TOO_LARGE` | File exceeds size limit | Reduce file size |
| `TRAINING_FAILED` | Model training error | Check data quality |
| `MODEL_NOT_FOUND` | Model doesn't exist | Verify model ID |
| `INSUFFICIENT_DATA` | Not enough training data | Add more rows |
| `DUPLICATE_MODEL` | Model name already exists | Use different name |

## 🛠️ Debugging Tools

### Enable Debug Mode
```bash
# Set environment variable
export DEBUG=True

# Or in .env file
DEBUG=True

# Run with verbose logging
python backend/backend_api.py --log-level debug
```

### Log Analysis
```bash
# View real-time logs
tail -f logs/mlops.log

# Search for errors
grep -i error logs/mlops.log

# Filter by timestamp
grep "2024-01-20" logs/mlops.log
```

### Database Debugging
```sql
-- Check table sizes
SELECT 
    table_name,
    pg_size_pretty(pg_total_relation_size(table_name::regclass)) as size
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Find slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

## 📞 Getting Help

### Before Contacting Support

1. ✅ Check this troubleshooting guide
2. ✅ Review error logs
3. ✅ Test with sample data
4. ✅ Verify system requirements
5. ✅ Check GitHub issues

### Information to Include

When reporting issues, provide:
- Operating system and version
- Python version
- Exact error message
- Steps to reproduce
- Sample data (if applicable)
- Log files
- Browser/version (for frontend issues)

### Useful Commands for Support

```bash
# System information
uname -a
python3 --version
pip list | grep -E "(fastapi|uvicorn|pandas|sklearn)"

# Error logs
tail -50 logs/mlops.log

# System resources
free -h && df -h

# Network configuration
ss -tlnp | grep 8000
```

## 🔧 Quick Fixes Summary

| Problem | Quick Fix |
|---------|-----------|
| Server won't start | `lsof -i :8000` then `kill -9 <PID>` |
| Upload fails | Check file size < 50MB, format = CSV |
| Training fails | Verify data has >20 rows, >2 columns |
| Page won't load | Clear browser cache, check console |
| Database error | Check connection string in .env |
| High memory usage | Restart server, reduce data size |
| CORS error | Check allow_origins in backend |

Remember: When in doubt, restart the server and try with sample data first!