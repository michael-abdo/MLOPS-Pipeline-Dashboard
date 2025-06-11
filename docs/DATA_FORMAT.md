# 📊 Data Format Specification

## Overview

This document describes the data format requirements for the MLOps Dashboard. Understanding these requirements ensures successful model training and accurate predictions.

## 📁 Supported File Formats

### CSV (Recommended)
- **Extension**: `.csv`
- **Encoding**: UTF-8 (preferred), UTF-16, ASCII
- **Delimiter**: Comma (`,`) default, also supports pipe (`|`) and tab (`\t`)
- **Size Limit**: 50MB
- **Headers**: Required in first row

### Excel (Coming Soon)
- **Extensions**: `.xlsx`, `.xls`
- **Sheets**: First sheet used by default
- **Size Limit**: 50MB

### JSON (Coming Soon)
- **Extension**: `.json`
- **Format**: Array of objects or nested structure
- **Size Limit**: 50MB

## 📋 Data Requirements

### Basic Structure

```csv
feature1,feature2,feature3,target
value1,value2,value3,label1
value4,value5,value6,label2
```

### Requirements Checklist

1. ✅ **Headers Required**: First row must contain column names
2. ✅ **Target Column**: Last column is assumed to be the target/label
3. ✅ **Minimum Rows**: At least 10 rows (excluding header)
4. ✅ **Minimum Columns**: At least 2 columns (1 feature + 1 target)
5. ✅ **Consistent Types**: Each column should have consistent data types
6. ✅ **No Empty Headers**: All columns must have names
7. ✅ **UTF-8 Encoding**: For special characters support

## 🎯 Target Column Guidelines

### Classification Tasks

Binary Classification:
```csv
age,income,purchased
25,50000,yes
34,75000,no
28,45000,yes
```

Multi-class Classification:
```csv
temperature,humidity,activity,weather_type
25,65,low,sunny
10,80,medium,rainy
30,40,high,cloudy
```

### Regression Tasks

Continuous Values:
```csv
size,bedrooms,location,price
1200,2,downtown,250000
1800,3,suburbs,350000
2400,4,suburbs,450000
```

## 📝 Data Types

### Supported Feature Types

| Type | Examples | Notes |
|------|----------|-------|
| **Numeric** | `25`, `3.14`, `-100` | Integer or float values |
| **Categorical** | `red`, `blue`, `green` | Text categories |
| **Boolean** | `true`/`false`, `yes`/`no`, `1`/`0` | Binary values |
| **Date** | `2024-01-20`, `01/20/2024` | ISO format preferred |
| **Text** | `"Product is great"` | For NLP tasks (Phase 2) |

### Automatic Type Detection

The system automatically detects:
- Numeric columns (int/float)
- Categorical columns (string with < 50 unique values)
- Date columns (common date formats)
- Boolean columns (binary values)

## 🚫 Common Issues & Solutions

### Issue 1: Missing Values

**Problem**: Empty cells or missing data
```csv
age,income,purchased
25,50000,yes
,75000,no  # Missing age
28,,yes    # Missing income
```

**Solution**: 
- Remove rows with missing target values
- Fill numeric features with mean/median
- Fill categorical features with mode or "unknown"

### Issue 2: Inconsistent Formats

**Problem**: Mixed data types in same column
```csv
age,income,purchased
25,50000,yes
"twenty",75000,no  # Text in numeric column
28,$45,000,yes     # Formatted number
```

**Solution**:
- Ensure consistent numeric formats
- Remove currency symbols and commas
- Convert text numbers to numeric

### Issue 3: Special Characters

**Problem**: Encoding issues with special characters
```csv
name,city,sales
José,São Paulo,1000  # May cause encoding errors
```

**Solution**:
- Save file as UTF-8
- Use ASCII alternatives if needed
- Escape special characters

## 🔄 Data Preprocessing

### Automatic Preprocessing

The system automatically handles:
1. **Whitespace Trimming**: Removes leading/trailing spaces
2. **Empty String Handling**: Converts to null/missing
3. **Case Normalization**: For boolean values
4. **Number Parsing**: Removes commas, currency symbols
5. **Date Parsing**: Converts to standard format

### Manual Preprocessing Tips

```python
import pandas as pd

# Load and clean data
df = pd.read_csv('data.csv')

# Remove duplicates
df = df.drop_duplicates()

# Handle missing values
df['numeric_col'] = df['numeric_col'].fillna(df['numeric_col'].mean())
df['category_col'] = df['category_col'].fillna('unknown')

# Remove outliers (optional)
Q1 = df['numeric_col'].quantile(0.25)
Q3 = df['numeric_col'].quantile(0.75)
IQR = Q3 - Q1
df = df[~((df['numeric_col'] < (Q1 - 1.5 * IQR)) | 
          (df['numeric_col'] > (Q3 + 1.5 * IQR)))]

# Save cleaned data
df.to_csv('data_cleaned.csv', index=False)
```

## 📏 Size & Performance Guidelines

### Recommended Limits

| Metric | Recommended | Maximum | Notes |
|--------|-------------|---------|-------|
| File Size | < 10MB | 50MB | Larger files take longer |
| Row Count | 1K - 100K | 1M | Performance degrades > 100K |
| Column Count | 5 - 50 | 200 | Feature selection recommended |
| Unique Categories | < 20 | 50 | Per categorical column |

### Performance Tips

1. **Sampling**: For large datasets, use representative sample
2. **Feature Selection**: Remove irrelevant columns
3. **Aggregation**: Aggregate time-series data if needed
4. **Chunking**: Split very large files into batches

## 🎨 Example Datasets

### 1. Customer Churn (Classification)
```csv
customer_id,age,tenure_months,monthly_charges,total_charges,contract_type,churned
1001,25,12,45.00,540.00,monthly,no
1002,34,36,75.00,2700.00,yearly,no
1003,28,6,50.00,300.00,monthly,yes
1004,45,48,85.00,4080.00,two_year,no
1005,22,3,40.00,120.00,monthly,yes
```

### 2. House Prices (Regression)
```csv
sqft,bedrooms,bathrooms,age,garage,location,price
1500,3,2,10,2,suburbs,250000
2000,4,3,5,2,downtown,450000
1200,2,1,15,1,rural,180000
1800,3,2.5,8,2,suburbs,320000
2500,5,4,2,3,downtown,650000
```

### 3. Product Categories (Multi-class)
```csv
weight,size,color,material,fragile,category
0.5,small,red,plastic,no,toy
2.0,medium,silver,metal,yes,electronics
0.1,small,blue,paper,no,stationery
5.0,large,black,metal,no,appliance
0.3,small,green,glass,yes,decoration
```

## 🛠️ Validation Tools

### Built-in Validation

The dashboard validates:
- ✅ File format and encoding
- ✅ Column headers presence
- ✅ Minimum row/column count
- ✅ Data type consistency
- ✅ Missing value percentage
- ✅ Target column validity

### Pre-upload Validation Script

```python
import pandas as pd
import sys

def validate_csv(filename):
    """Validate CSV file before upload"""
    try:
        # Load file
        df = pd.read_csv(filename)
        
        # Basic checks
        assert len(df) >= 10, "Need at least 10 rows"
        assert len(df.columns) >= 2, "Need at least 2 columns"
        assert not df.columns.duplicated().any(), "Duplicate column names"
        
        # Check for empty columns
        empty_cols = df.columns[df.isna().all()].tolist()
        assert not empty_cols, f"Empty columns: {empty_cols}"
        
        # Check target column
        target_col = df.columns[-1]
        assert df[target_col].notna().sum() > 0, "Target column is empty"
        
        # Check data types
        for col in df.columns[:-1]:  # Features
            if df[col].dtype == 'object':
                unique_ratio = df[col].nunique() / len(df)
                assert unique_ratio < 0.9, f"Column {col} might be ID field"
        
        print("✅ Validation passed!")
        print(f"Shape: {df.shape}")
        print(f"Columns: {list(df.columns)}")
        print(f"Target: {target_col}")
        
    except Exception as e:
        print(f"❌ Validation failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    validate_csv("your_data.csv")
```

## 📚 Additional Resources

### Sample Datasets
- [UCI Machine Learning Repository](https://archive.ics.uci.edu/ml/index.php)
- [Kaggle Datasets](https://www.kaggle.com/datasets)
- [Google Dataset Search](https://datasetsearch.research.google.com/)

### Data Preparation Tools
- [Pandas Profiling](https://github.com/pandas-profiling/pandas-profiling)
- [OpenRefine](https://openrefine.org/)
- [Trifacta Wrangler](https://www.trifacta.com/)

### Best Practices
- [Google's Data Preparation Guide](https://developers.google.com/machine-learning/data-prep)
- [AWS ML Data Preparation](https://docs.aws.amazon.com/machine-learning/latest/dg/data-preparation.html)