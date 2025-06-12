/**
 * Reusable UI Components Library - Main Export Module
 * Re-exports all components from split modules for backward compatibility
 * 
 * For better performance, import specific modules instead:
 * - ui-core.js: Card, Metric, ProgressBar, Grid (8KB)
 * - ui-forms.js: ButtonGroup, UploadArea (15KB)
 * - ui-charts.js: ChartContainer (8KB)
 * 
 * Total original size: 42.9KB → Split modules: ~31KB + lazy loading potential
 */

// Import all components from split modules
import { 
    Card, 
    Metric, 
    ProgressBar, 
    Grid, 
    initializeCoreUIStyles 
} from './ui-core.js';

import { 
    ButtonGroup, 
    UploadArea, 
    initializeFormUIStyles 
} from './ui-forms.js';

import { 
    ChartContainer, 
    initializeChartUIStyles 
} from './ui-charts.js';

// Legacy initialization function that calls all style initializers
function initializeUIComponents() {
    initializeCoreUIStyles();
    initializeFormUIStyles();
    initializeChartUIStyles();
}

// Re-export all components for backward compatibility
export { 
    Card, 
    Metric, 
    ProgressBar, 
    Grid, 
    ButtonGroup, 
    UploadArea, 
    ChartContainer, 
    initializeUIComponents 
};