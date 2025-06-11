# Contributing to MLOps Simple Dashboard

Thank you for your interest in contributing to the MLOps Simple Dashboard! This document provides guidelines for contributing to the project.

## 🚀 Quick Start

1. **Fork the repository**
2. **Clone your fork**
   ```bash
   git clone https://github.com/your-username/mlops-simple-dashboard.git
   cd mlops-simple-dashboard
   ```
3. **Set up development environment**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```
4. **Run tests**
   ```bash
   python tests/test_simple.py
   ```

## 📋 Development Guidelines

### Code Style
- Follow PEP 8 for Python code
- Use meaningful variable and function names
- Add docstrings for functions and classes
- Keep functions focused and small

### Testing
- Write tests for new features
- Ensure all existing tests pass
- Test both happy path and error scenarios
- Use the test pipeline: `python test_pipeline.py`

### Commit Messages
Use clear, descriptive commit messages:
```
feat: add model export functionality
fix: resolve file upload validation issue
docs: update API documentation
test: add tests for prediction endpoint
```

### Pull Request Process
1. Create a feature branch from main
2. Make your changes
3. Add/update tests as needed
4. Update documentation
5. Submit pull request with clear description

## 🐛 Bug Reports

When reporting bugs, please include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- System information (OS, Python version)
- Error messages/logs

## 💡 Feature Requests

For new features:
- Check if feature aligns with project goals (simplicity)
- Describe the use case
- Consider impact on existing users
- Propose implementation approach

## 📖 Documentation

- Update README.md for user-facing changes
- Update technical docs in `docs/` folder
- Include code examples where helpful
- Keep documentation simple and clear

## 🔧 Development Setup

### Backend Development
```bash
# Start development server
python backend_simple.py

# Start full ML backend
python backend_api.py
```

### Frontend Development
- Frontend files are in `static/`
- Changes to HTML/CSS/JS take effect immediately
- Test in browser at `http://localhost:8000`

### Testing
```bash
# Basic API tests
python tests/test_simple.py

# Complete pipeline test
python test_pipeline.py

# Full test suite
pytest tests/ -v
```

## 🎯 Project Goals

This project aims to be:
- **Simple**: 5-minute learnable
- **User-friendly**: No ML expertise required
- **Reliable**: Works consistently
- **Fast**: Quick setup and training
- **Maintainable**: Clean, readable code

## ❓ Questions?

- Check existing issues and documentation
- Create an issue for questions
- Join discussions in pull requests

Thank you for contributing! 🎉