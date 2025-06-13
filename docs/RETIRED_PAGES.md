# Retired UI Pages Documentation

## Overview
As of December 6, 2025, all UI pages except the main dashboard have been retired to simplify the application and focus on the core functionality.

## Retired Pages
The following pages have been moved to the `retired` directory:

### HTML Pages (moved to `/static/retired/`)
- **pipeline.html** - Pipeline management interface
- **architecture.html** - System architecture visualization
- **data.html** - Data management interface
- **monitoring.html** - System monitoring dashboard
- **settings.html** - Application settings

### JavaScript Files (moved to `/static/js/pages/retired/`)
- **pipeline.js** - Pipeline page functionality
- **architecture.js** - Architecture visualization logic
- **data.js** - Data management logic
- **monitoring.js** - Monitoring dashboard logic
- **settings.js** - Settings page functionality

### CSS Files (moved to `/static/css/retired/`)
- **pipeline.css** - Pipeline page styles
- **architecture.css** - Architecture page styles
- **data.css** - Data page styles
- **monitoring.css** - Monitoring page styles

## Changes Made

### 1. Navigation Component
Updated `/static/js/components/navigation.js` to only show the Dashboard link:
```javascript
const pages = [
    { name: 'Dashboard', path: CONFIG.PAGES.DASHBOARD, icon: '📊' }
];
```

### 2. File Organization
All retired files have been preserved in their respective `retired` subdirectories:
- `/static/retired/` - HTML files
- `/static/js/pages/retired/` - JavaScript files
- `/static/css/retired/` - CSS files

### 3. Active Files
The following files remain active:
- `/static/index.html` - Main dashboard
- `/static/js/pages/dashboard.js` - Dashboard functionality
- `/static/css/dashboard.css` - Dashboard styles
- `/static/css/shared.css` - Shared styles
- `/static/css/critical.css` - Critical above-the-fold styles
- `/static/css/accessibility-improvements.css` - Accessibility enhancements

## Rationale
The decision to retire these pages was made to:
1. Simplify the user interface
2. Focus development efforts on the main dashboard
3. Reduce maintenance overhead
4. Improve performance by reducing code size

## Recovery
If any of the retired pages need to be restored, they can be found in their respective `retired` directories with all functionality intact.

## Impact
- Navigation menu now only shows "Dashboard"
- All functionality is consolidated into the main dashboard
- WebSocket connection status remains visible
- No loss of core ML pipeline functionality