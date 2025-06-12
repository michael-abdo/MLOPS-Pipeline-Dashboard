/**
 * Chart UI Components Library
 * Chart-related components: ChartContainer
 * Split from ui-components.js for better performance
 */

// ChartContainer Component
class ChartContainer {
    /**
     * Creates a chart container with loading and error states
     * @param {Object} options - Chart container configuration
     * @param {string} options.title - Chart title
     * @param {string} options.type - Chart type (line, bar, pie, area)
     * @param {Array} options.data - Chart data
     * @param {Object} options.config - Chart.js configuration
     * @param {boolean} options.loading - Initial loading state
     * @param {string} options.height - Chart height (CSS value)
     * @param {Function} options.onUpdate - Update callback for real-time data
     * @param {string} options.className - Additional CSS classes
     * @param {string} options.id - Chart container ID
     * @returns {HTMLElement} Chart container element
     */
    static create(options = {}) {
        const {
            title = '',
            type = 'line',
            data = [],
            config = {},
            loading = false,
            height = '300px',
            onUpdate = null,
            className = '',
            id = ''
        } = options;

        const container = document.createElement('div');
        container.className = `chart-container ${className}`.trim();
        if (id) container.id = id;

        // Chart header
        if (title) {
            const header = document.createElement('div');
            header.className = 'chart-header';
            
            const titleElement = document.createElement('h4');
            titleElement.className = 'chart-title';
            titleElement.textContent = title;
            header.appendChild(titleElement);

            // Chart actions (could be expanded with export, refresh buttons)
            const actions = document.createElement('div');
            actions.className = 'chart-actions';
            header.appendChild(actions);

            container.appendChild(header);
        }

        // Chart content area
        const chartContent = document.createElement('div');
        chartContent.className = 'chart-content';
        chartContent.style.height = height;
        chartContent.style.position = 'relative';

        // Canvas for chart
        const canvas = document.createElement('canvas');
        canvas.className = 'chart-canvas';
        chartContent.appendChild(canvas);

        // Loading overlay
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'chart-loading';
        loadingOverlay.innerHTML = `
            <div class="chart-spinner">📊</div>
            <div class="chart-loading-text">Loading chart...</div>
        `;
        if (!loading) loadingOverlay.style.display = 'none';
        chartContent.appendChild(loadingOverlay);

        // Error overlay
        const errorOverlay = document.createElement('div');
        errorOverlay.className = 'chart-error';
        errorOverlay.innerHTML = `
            <div class="chart-error-icon">⚠️</div>
            <div class="chart-error-text">Failed to load chart</div>
            <button class="btn btn-secondary btn-sm chart-retry">Retry</button>
        `;
        errorOverlay.style.display = 'none';
        chartContent.appendChild(errorOverlay);

        container.appendChild(chartContent);

        // Store configuration for later use
        container._chartConfig = {
            type,
            data,
            config,
            onUpdate
        };

        return container;
    }

    /**
     * Updates chart loading state
     * @param {HTMLElement|string} container - Chart container element or ID
     * @param {boolean} loading - Loading state
     */
    static setLoading(container, loading) {
        const element = typeof container === 'string' ? document.getElementById(container) : container;
        if (element) {
            const loadingOverlay = element.querySelector('.chart-loading');
            const errorOverlay = element.querySelector('.chart-error');
            
            if (loadingOverlay) {
                loadingOverlay.style.display = loading ? 'flex' : 'none';
            }
            
            if (errorOverlay) {
                errorOverlay.style.display = 'none';
            }
        }
    }

    /**
     * Updates chart error state
     * @param {HTMLElement|string} container - Chart container element or ID
     * @param {string} errorMessage - Error message
     */
    static setError(container, errorMessage = 'Failed to load chart') {
        const element = typeof container === 'string' ? document.getElementById(container) : container;
        if (element) {
            const loadingOverlay = element.querySelector('.chart-loading');
            const errorOverlay = element.querySelector('.chart-error');
            const errorText = element.querySelector('.chart-error-text');
            
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
            
            if (errorOverlay) {
                errorOverlay.style.display = 'flex';
            }
            
            if (errorText) {
                errorText.textContent = errorMessage;
            }
        }
    }

    /**
     * Updates chart data (placeholder for Chart.js integration)
     * @param {HTMLElement|string} container - Chart container element or ID
     * @param {Array} newData - New chart data
     * @param {Object} options - Update options
     */
    static updateData(container, newData, options = {}) {
        const element = typeof container === 'string' ? document.getElementById(container) : container;
        if (element && element._chartConfig) {
            // This would integrate with Chart.js when available
            element._chartConfig.data = newData;
            
            // Hide loading and error states
            ChartContainer.setLoading(element, false);
            
            // Trigger onUpdate callback if provided
            if (element._chartConfig.onUpdate) {
                element._chartConfig.onUpdate(newData, options);
            }
        }
    }

    /**
     * Create a simple data visualization using HTML/CSS (fallback for when Chart.js isn't available)
     * @param {Object} options - Simple chart options
     * @param {Array} options.data - Array of data points with labels and values
     * @param {string} options.type - Chart type (bar, line)
     * @param {string} options.title - Chart title
     * @returns {HTMLElement} Simple chart element
     */
    static createSimpleChart(options = {}) {
        const { data = [], type = 'bar', title = '', className = '', id = '' } = options;
        
        const container = document.createElement('div');
        container.className = `simple-chart chart-${type} ${className}`.trim();
        if (id) container.id = id;

        if (title) {
            const titleElement = document.createElement('h4');
            titleElement.className = 'chart-title';
            titleElement.textContent = title;
            container.appendChild(titleElement);
        }

        const chartArea = document.createElement('div');
        chartArea.className = 'simple-chart-area';

        if (type === 'bar') {
            // Create simple bar chart
            const maxValue = Math.max(...data.map(d => d.value));
            
            data.forEach(item => {
                const barContainer = document.createElement('div');
                barContainer.className = 'bar-container';
                
                const bar = document.createElement('div');
                bar.className = 'bar';
                bar.style.height = `${(item.value / maxValue) * 100}%`;
                bar.title = `${item.label}: ${item.value}`;
                
                const label = document.createElement('div');
                label.className = 'bar-label';
                label.textContent = item.label;
                
                barContainer.appendChild(bar);
                barContainer.appendChild(label);
                chartArea.appendChild(barContainer);
            });
        }

        container.appendChild(chartArea);
        return container;
    }
}

// Chart component styles initialization
function initializeChartUIStyles() {
    if (!document.getElementById('ui-charts-styles')) {
        const style = document.createElement('style');
        style.id = 'ui-charts-styles';
        style.textContent = `
            /* ChartContainer Component Styles */
            .chart-container {
                background: var(--surface-primary);
                border-radius: var(--radius-lg);
                padding: var(--spacing-lg);
                border: 1px solid var(--border-color);
            }
            
            .chart-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: var(--spacing-lg);
                padding-bottom: var(--spacing-md);
                border-bottom: 1px solid var(--border-color);
            }
            
            .chart-title {
                margin: 0;
                font-size: 1.2rem;
                font-weight: 600;
                color: var(--text-primary);
            }
            
            .chart-actions {
                display: flex;
                gap: var(--spacing-sm);
            }
            
            .chart-content {
                position: relative;
                width: 100%;
            }
            
            .chart-canvas {
                width: 100%;
                height: 100%;
            }
            
            .chart-loading,
            .chart-error {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                background: rgba(var(--surface-primary-rgb), 0.9);
                border-radius: var(--radius-md);
                gap: var(--spacing-md);
            }
            
            .chart-spinner,
            .chart-error-icon {
                font-size: 2rem;
                opacity: 0.7;
            }
            
            .chart-spinner {
                animation: pulse 1.5s ease-in-out infinite;
            }
            
            .chart-loading-text,
            .chart-error-text {
                font-size: 1rem;
                color: var(--text-secondary);
                margin-bottom: var(--spacing-sm);
            }
            
            .chart-retry {
                margin-top: var(--spacing-sm);
            }
            
            /* Simple Chart Fallback Styles */
            .simple-chart {
                background: var(--surface-primary);
                border-radius: var(--radius-lg);
                padding: var(--spacing-lg);
                border: 1px solid var(--border-color);
            }
            
            .simple-chart .chart-title {
                margin-bottom: var(--spacing-lg);
                text-align: center;
            }
            
            .simple-chart-area {
                min-height: 200px;
                display: flex;
                align-items: flex-end;
                justify-content: space-around;
                gap: var(--spacing-sm);
                padding: var(--spacing-md);
                border-bottom: 2px solid var(--border-color);
                position: relative;
            }
            
            .bar-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                flex: 1;
                max-width: 60px;
            }
            
            .bar {
                width: 100%;
                min-height: 4px;
                background: var(--primary-color);
                border-radius: var(--radius-sm) var(--radius-sm) 0 0;
                transition: all 0.3s ease;
                margin-bottom: var(--spacing-xs);
            }
            
            .bar:hover {
                background: var(--primary-dark);
                transform: translateY(-2px);
            }
            
            .bar-label {
                font-size: 0.8rem;
                color: var(--text-secondary);
                text-align: center;
                word-break: break-word;
            }
            
            @keyframes pulse {
                0%, 100% { opacity: 0.7; }
                50% { opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
}

// Initialize styles when module loads
initializeChartUIStyles();

export { ChartContainer, initializeChartUIStyles };