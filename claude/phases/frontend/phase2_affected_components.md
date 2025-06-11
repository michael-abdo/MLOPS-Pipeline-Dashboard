# Phase 2: Affected Components and Dependencies

## Components That Will Change

### 1. Backend Routes (backend_api.py & backend_simple.py)
**Current State**: Only serves index.html and settings.html
**Changes Needed**:
- Add routes for: `/pipeline`, `/architecture`, `/data`, `/monitoring`
- Ensure consistent HTML serving pattern
- Maintain WebSocket endpoint compatibility

### 2. Navigation Component
**Current State**: Hardcoded in each HTML file with inconsistent hrefs
**Changes Needed**:
- Extract to shared component
- Dynamic active state management
- Consistent href patterns
- WebSocket status indicator integration

### 3. WebSocket Manager
**Current State**: Inline in index.html, missing in settings.html
**Changes Needed**:
- Extract to shared JavaScript module
- Singleton pattern to maintain connection
- Event system for cross-page updates
- Reconnection logic preservation

### 4. CSS Styles
**Current State**: 800+ lines duplicated between files
**Changes Needed**:
- Extract common styles to shared.css
- Page-specific styles in separate files
- Maintain design system variables
- Remove duplication

### 5. Activity Feed
**Current State**: Only in index.html
**Changes Needed**:
- Make it a reusable component
- Allow embedding in any page
- Maintain real-time updates
- Consistent styling

### 6. System Status Indicators
**Current State**: Part of dashboard only
**Changes Needed**:
- Global status bar component
- Visible on all pages
- Real-time updates via WebSocket
- Connection quality indicator

## Dependencies to Preserve

### Critical Functionality
1. **File Upload Flow**: Must work seamlessly
2. **Training Progress**: Real-time updates must continue
3. **Model Management**: All CRUD operations
4. **Settings Persistence**: LocalStorage integration
5. **Activity Logging**: Historical and real-time

### API Integrations
- All `/api/*` endpoints must remain compatible
- WebSocket message format unchanged
- Response handling consistency
- Error management patterns

### User Experience
- Loading states during navigation
- Progress indicators
- Notification system
- Drag-and-drop functionality

## New Dependencies to Add

### Shared Modules Needed
1. **common.js**
   - WebSocket manager
   - API client
   - Notification system
   - Utility functions

2. **components.js**
   - Navigation bar
   - Activity feed
   - Status indicators
   - Card templates
   - Button components

3. **shared.css**
   - Design system variables
   - Layout classes
   - Component styles
   - Utility classes

### Page-Specific Modules
1. **dashboard.js** - Extract from current index.html
2. **pipeline.js** - New pipeline management logic
3. **architecture.js** - New architecture visualization
4. **data.js** - New data management logic
5. **monitoring.js** - New monitoring charts

## Risk Assessment

### High Risk Changes
1. **WebSocket Extraction**: Must maintain singleton behavior
2. **Navigation State**: Active page detection across routes
3. **CSS Conflicts**: Extracting styles may break layouts

### Medium Risk Changes
1. **API Client**: Consolidating fetch calls
2. **Event System**: Cross-component communication
3. **Loading States**: Consistent UX during transitions

### Low Risk Changes
1. **New Page Creation**: Independent implementations
2. **Route Addition**: Simple backend changes
3. **Component Templates**: HTML structure extraction

## Migration Strategy

### Phase 1: Extract without breaking
- Create shared files alongside existing
- Test shared components in isolation
- Maintain backward compatibility

### Phase 2: Gradual adoption
- Update index.html to use shared components
- Verify functionality preservation
- Update settings.html similarly

### Phase 3: New page implementation
- Create new pages using shared components
- Implement page-specific features
- Test navigation flow

### Phase 4: Cleanup
- Remove duplicate code
- Optimize shared components
- Document component usage