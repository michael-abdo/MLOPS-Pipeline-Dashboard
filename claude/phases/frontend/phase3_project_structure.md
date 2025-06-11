# Phase 3: Project Structure Planning

## Recommended Directory Structure

```
mlops/development/
├── static/
│   ├── css/
│   │   ├── shared.css           # Common styles, design system
│   │   ├── dashboard.css        # Dashboard-specific styles
│   │   ├── pipeline.css         # Pipeline page styles
│   │   ├── architecture.css     # Architecture page styles
│   │   ├── data.css            # Data management styles
│   │   └── monitoring.css       # Monitoring page styles
│   │
│   ├── js/
│   │   ├── common/
│   │   │   ├── websocket.js    # WebSocket manager singleton
│   │   │   ├── api.js          # API client wrapper
│   │   │   ├── navigation.js   # Navigation component
│   │   │   ├── notifications.js # Notification system
│   │   │   └── utils.js        # Utility functions
│   │   │
│   │   ├── components/
│   │   │   ├── activity-feed.js    # Activity feed component
│   │   │   ├── status-bar.js       # System status component
│   │   │   ├── card.js            # Card component factory
│   │   │   ├── charts.js          # Chart utilities
│   │   │   └── forms.js           # Form components
│   │   │
│   │   ├── pages/
│   │   │   ├── dashboard.js       # Dashboard page logic
│   │   │   ├── pipeline.js        # Pipeline page logic
│   │   │   ├── architecture.js    # Architecture page logic
│   │   │   ├── data.js           # Data management logic
│   │   │   └── monitoring.js      # Monitoring page logic
│   │   │
│   │   └── init.js               # Global initialization
│   │
│   ├── index.html               # Dashboard page
│   ├── pipeline.html            # Pipeline management page
│   ├── architecture.html        # AI Architecture page
│   ├── data.html               # Data management page
│   ├── monitoring.html          # System monitoring page
│   └── settings.html           # Settings page (existing)
│
└── backend/
    ├── backend_api.py          # Update with new routes
    └── backend_simple.py       # Update with new routes
```

## File Naming Conventions

### HTML Files
- **Pattern**: `{page-name}.html`
- **Examples**: `index.html`, `pipeline.html`, `data.html`
- **Note**: Keep `index.html` as main dashboard for backward compatibility

### JavaScript Files
- **Pattern**: `{component-name}.js` (kebab-case)
- **Modules**: Use ES6 module pattern with explicit exports
- **Pages**: Match HTML filename without extension

### CSS Files
- **Pattern**: `{scope}.css`
- **Shared**: `shared.css` for all common styles
- **Page-specific**: Match HTML filename

## Module Hierarchy

### 1. Core Layer (common/)
- **websocket.js**: Singleton WebSocket manager
- **api.js**: Centralized API calls
- **utils.js**: Helper functions
- **navigation.js**: Navigation state management
- **notifications.js**: User feedback system

### 2. Component Layer (components/)
- Reusable UI components
- Self-contained functionality
- Event-based communication
- No direct page dependencies

### 3. Page Layer (pages/)
- Page-specific logic
- Orchestrates components
- Handles page lifecycle
- Manages local state

### 4. Entry Point (init.js)
- Global initialization
- Shared component setup
- Event listener registration
- WebSocket connection start

## Separation of Concerns

### Shared Functionality (static/js/common/)
- WebSocket connection management
- API communication patterns
- Global state management
- Utility functions
- Navigation orchestration

### UI Components (static/js/components/)
- Reusable UI elements
- Self-contained styles
- Event emitters
- No business logic
- Pure presentation

### Page Logic (static/js/pages/)
- Business logic
- API orchestration
- Component composition
- Page-specific state
- User interactions

### Styling (static/css/)
- **shared.css**: Design system, utilities, common components
- **{page}.css**: Page-specific overrides and unique styles

## Asset Organization

### Images/Icons
```
static/
└── assets/
    ├── icons/       # SVG icons
    ├── images/      # PNG/JPG images
    └── logos/       # Brand assets
```

### Data Files
```
uploads/            # User uploaded files (existing)
models/             # Trained models (existing)
```

## Configuration Management

### Frontend Config
```javascript
// static/js/common/config.js
const CONFIG = {
    API_BASE: '/api',
    WS_URL: 'ws://localhost:8000/ws',
    RECONNECT_DELAY: 1000,
    MAX_RECONNECT_ATTEMPTS: 5
};
```

### Shared Constants
```javascript
// static/js/common/constants.js
const PAGES = {
    DASHBOARD: '/',
    PIPELINE: '/pipeline',
    ARCHITECTURE: '/architecture',
    DATA: '/data',
    MONITORING: '/monitoring',
    SETTINGS: '/settings'
};
```

## Build Considerations

### Development
- No build process needed
- Direct file serving
- Browser ES6 module support
- Live reload during development

### Production (Future)
- Minification opportunity
- Bundle optimization
- Cache busting
- CDN deployment ready

## Benefits of This Structure

1. **Clear Separation**: Easy to find and modify code
2. **Reusability**: Components shared across pages
3. **Maintainability**: Logical organization
4. **Scalability**: Easy to add new pages/components
5. **Performance**: Lazy loading possible
6. **Testing**: Components can be tested in isolation
7. **Documentation**: Self-documenting structure