# Phase 1: Data Preparation - CSV Complexity Testing

## Overview
Create three graduated complexity CSV datasets to test system monitoring authenticity and performance scaling.

## Dataset Specifications

### 1. Simple Dataset (`test_simple.csv`)
**Target**: Minimal processing load to establish baseline
- **Rows**: 10 data points
- **Columns**: 3 features (age, income, buy)
- **Data Types**: All numeric
- **Use Case**: Basic customer segmentation
- **Expected Impact**: 5-15% CPU, <50MB memory, 2-5s training

```csv
age,income,buy
25,50000,yes
30,60000,yes
20,30000,no
35,70000,yes
22,35000,no
40,80000,yes
45,90000,yes
28,55000,yes
19,25000,no
50,100000,yes
```

### 2. Medium Dataset (`test_medium.csv`)
**Target**: Moderate ML workload with mixed data types
- **Rows**: 1,000 data points
- **Columns**: 8 features (demographics + behavioral + transaction)
- **Data Types**: Mixed numeric, categorical, and boolean
- **Use Case**: E-commerce customer analytics
- **Expected Impact**: 20-40% CPU, 50-150MB memory, 15-30s training

**Schema**:
- age (numeric)
- income (numeric)
- region (categorical: North, South, East, West)
- education (categorical: High School, College, Graduate)
- previous_purchases (numeric)
- loyalty_member (boolean)
- session_duration (numeric)
- will_purchase (target: yes/no)

### 3. Complex Dataset (`test_complex.csv`)
**Target**: Heavy processing load requiring significant resources
- **Rows**: 10,000 data points
- **Columns**: 15 features (comprehensive feature engineering required)
- **Data Types**: Mixed with text processing requirements
- **Use Case**: Enterprise customer intelligence
- **Expected Impact**: 50-80% CPU, 150-300MB memory, 60-120s training

**Schema**:
- customer_id (string)
- age (numeric)
- income (numeric)
- region (categorical)
- education (categorical)
- job_category (categorical: Tech, Sales, Marketing, Finance, Other)
- previous_purchases (numeric)
- avg_order_value (numeric)
- loyalty_member (boolean)
- session_duration (numeric)
- pages_viewed (numeric)
- device_type (categorical: Mobile, Desktop, Tablet)
- referral_source (categorical: Google, Facebook, Direct, Email)
- customer_since_days (numeric)
- purchase_prediction (target: yes/no)

## Implementation Strategy

### File Creation Process
1. **Generate realistic data** that produces meaningful ML models
2. **Ensure data quality** with appropriate distributions and correlations
3. **Validate trainability** - datasets must work with existing pipeline
4. **Test file processing** - verify CSV parsing and upload functionality

### Data Generation Approach
- **Simple**: Manual creation with clear patterns
- **Medium**: Programmatic generation with realistic distributions
- **Complex**: Advanced generation with correlated features and realistic business logic

### Quality Assurance
- **Pattern Validation**: Ensure datasets have learnable patterns
- **Distribution Check**: Verify realistic data distributions
- **Correlation Analysis**: Confirm feature relationships make business sense
- **ML Compatibility**: Test with scikit-learn RandomForest

## File Placement
```
📁 uploads/
├── simple_test_data.csv          # Original (existing)
├── test_simple.csv               # ← NEW: 10 rows, 3 columns
├── test_medium.csv               # ← NEW: 1K rows, 8 columns
└── test_complex.csv              # ← NEW: 10K rows, 15 columns
```

## Success Criteria
- ✅ **Three distinct complexity levels** created and validated
- ✅ **Trainable datasets** that produce meaningful ML models
- ✅ **Realistic data distributions** appropriate for business use cases
- ✅ **Progressive complexity** ensuring clear system load differences
- ✅ **CSV compatibility** with existing upload and processing pipeline

## Expected System Impact Validation
- **Simple → Medium**: Should show 3-5x increase in processing load
- **Medium → Complex**: Should show 2-3x additional increase in resource usage
- **Training time progression**: Exponential increase with complexity
- **Memory usage scaling**: Linear correlation with dataset size

## Deliverables
- `test_simple.csv` - Baseline minimal complexity dataset
- `test_medium.csv` - Moderate complexity e-commerce dataset  
- `test_complex.csv` - High complexity enterprise dataset
- Validation that all datasets train successfully
- Confirmation of graduated complexity impact on system resources

**Next Phase**: Test Script Development - Automated monitoring framework