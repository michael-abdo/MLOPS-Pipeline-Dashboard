/**
 * Core UI Components Library
 * Essential components: Card, Metric, ProgressBar, Grid
 * Split from ui-components.js for better performance
 */

// Card Component
class Card {
    /**
     * Creates a standardized card component
     * @param {Object} options - Card configuration
     * @param {string} options.title - Card title
     * @param {string} options.content - Card content (HTML string)
     * @param {string} options.className - Additional CSS classes
     * @param {string} options.id - Card ID
     * @param {Object} options.headerActions - Header action buttons/elements
     * @param {boolean} options.collapsible - Whether card can be collapsed
     * @param {string} options.icon - Optional icon for the title
     * @returns {HTMLElement} Card element
     */
    static create(options = {}) {
        const {
            title = '',
            content = '',
            className = '',
            id = '',
            headerActions = null,
            collapsible = false,
            icon = ''
        } = options;

        const card = document.createElement('div');
        card.className = `card ${className}`.trim();
        if (id) card.id = id;

        // Card header
        if (title) {
            const header = document.createElement('div');
            header.className = 'card-header';
            
            const titleElement = document.createElement('h3');
            titleElement.innerHTML = `${icon} ${title}`.trim();
            header.appendChild(titleElement);

            // Header actions
            if (headerActions) {
                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'card-header-actions';
                if (typeof headerActions === 'string') {
                    actionsDiv.innerHTML = headerActions;
                } else {
                    actionsDiv.appendChild(headerActions);
                }
                header.appendChild(actionsDiv);
            }

            // Collapsible functionality
            if (collapsible) {
                header.classList.add('collapsible');
                header.addEventListener('click', () => {
                    card.classList.toggle('collapsed');
                });
            }

            card.appendChild(header);
        }

        // Card content
        const contentDiv = document.createElement('div');
        contentDiv.className = 'card-content';
        if (typeof content === 'string') {
            contentDiv.innerHTML = content;
        } else {
            contentDiv.appendChild(content);
        }
        card.appendChild(contentDiv);

        return card;
    }

    /**
     * Updates card content dynamically
     * @param {HTMLElement|string} card - Card element or ID
     * @param {string} content - New content
     */
    static updateContent(card, content) {
        const cardElement = typeof card === 'string' ? document.getElementById(card) : card;
        if (cardElement) {
            const contentDiv = cardElement.querySelector('.card-content');
            if (contentDiv) {
                contentDiv.innerHTML = content;
            }
        }
    }
}

// Metric Component
class Metric {
    /**
     * Creates a standardized metric display
     * @param {Object} options - Metric configuration
     * @param {string|number} options.value - Metric value
     * @param {string} options.label - Metric label
     * @param {string} options.format - Value format (percent, number, currency, custom)
     * @param {string} options.trend - Trend direction (up, down, neutral)
     * @param {number} options.trendValue - Trend percentage
     * @param {string} options.className - Additional CSS classes
     * @param {string} options.id - Metric ID
     * @param {string} options.tooltip - Tooltip text
     * @returns {HTMLElement} Metric element
     */
    static create(options = {}) {
        const {
            value = '--',
            label = '',
            format = 'number',
            trend = null,
            trendValue = null,
            className = '',
            id = '',
            tooltip = ''
        } = options;

        const metric = document.createElement('div');
        metric.className = `metric ${className}`.trim();
        if (id) metric.id = id;
        if (tooltip) metric.title = tooltip;

        // Format value based on type
        let formattedValue = value;
        if (value !== '--' && value != null) {
            switch (format) {
                case 'percent':
                    formattedValue = `${parseFloat(value).toFixed(1)}%`;
                    break;
                case 'currency':
                    formattedValue = `$${parseFloat(value).toLocaleString()}`;
                    break;
                case 'number':
                    formattedValue = parseFloat(value).toLocaleString();
                    break;
                default:
                    formattedValue = value;
            }
        }

        // Value element
        const valueDiv = document.createElement('div');
        valueDiv.className = 'metric-value';
        valueDiv.textContent = formattedValue;
        metric.appendChild(valueDiv);

        // Trend indicator
        if (trend && trendValue !== null) {
            const trendDiv = document.createElement('div');
            trendDiv.className = `metric-trend trend-${trend}`;
            const arrow = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
            trendDiv.innerHTML = `${arrow} ${Math.abs(trendValue)}%`;
            metric.appendChild(trendDiv);
        }

        // Label element
        const labelDiv = document.createElement('div');
        labelDiv.className = 'metric-label';
        labelDiv.textContent = label;
        metric.appendChild(labelDiv);

        return metric;
    }

    /**
     * Updates metric value with animation
     * @param {HTMLElement|string} metric - Metric element or ID
     * @param {string|number} newValue - New value
     * @param {Object} options - Update options
     */
    static update(metric, newValue, options = {}) {
        console.log(`🔧 Metric.update called: ${metric} = ${newValue}`, options);
        const metricElement = typeof metric === 'string' ? document.getElementById(metric) : metric;
        console.log(`🔧 Found element:`, metricElement);
        if (metricElement) {
            // Handle both cases: element is metric-value itself OR has metric-value child
            let valueDiv = metricElement.querySelector('.metric-value');
            if (!valueDiv && metricElement.classList.contains('metric-value')) {
                valueDiv = metricElement; // Element itself is the metric-value
            }
            console.log(`🔧 Found valueDiv:`, valueDiv);
            if (valueDiv) {
                // Add update animation
                valueDiv.classList.add('updating');
                
                // Format new value
                let formattedValue = newValue;
                if (options.format) {
                    switch (options.format) {
                        case 'percent':
                            formattedValue = `${parseFloat(newValue).toFixed(1)}%`;
                            break;
                        case 'currency':
                            formattedValue = `$${parseFloat(newValue).toLocaleString()}`;
                            break;
                        case 'number':
                            formattedValue = parseFloat(newValue).toLocaleString();
                            break;
                    }
                }
                
                valueDiv.textContent = formattedValue;
                
                // Remove animation class after animation completes
                setTimeout(() => {
                    valueDiv.classList.remove('updating');
                }, 500);
            }
        }
    }
}

// ProgressBar Component
class ProgressBar {
    /**
     * Creates a standardized progress bar
     * @param {Object} options - Progress bar configuration
     * @param {number} options.progress - Progress percentage (0-100)
     * @param {string} options.label - Progress label
     * @param {boolean} options.showPercentage - Show percentage text
     * @param {string} options.style - Progress bar style (default, success, warning, danger)
     * @param {boolean} options.animated - Animated stripe pattern
     * @param {string} options.className - Additional CSS classes
     * @param {string} options.id - Progress bar ID
     * @param {number} options.height - Bar height in pixels
     * @returns {HTMLElement} Progress bar element
     */
    static create(options = {}) {
        const {
            progress = 0,
            label = '',
            showPercentage = true,
            style = 'default',
            animated = false,
            className = '',
            id = '',
            height = 12
        } = options;

        const container = document.createElement('div');
        container.className = `progress-container ${className}`.trim();
        if (id) container.id = id;

        // Label and percentage
        if (label || showPercentage) {
            const labelDiv = document.createElement('div');
            labelDiv.className = 'progress-label';
            
            if (label) {
                const labelSpan = document.createElement('span');
                labelSpan.textContent = label;
                labelDiv.appendChild(labelSpan);
            }
            
            if (showPercentage) {
                const percentSpan = document.createElement('span');
                percentSpan.className = 'progress-percentage';
                percentSpan.textContent = `${progress}%`;
                labelDiv.appendChild(percentSpan);
            }
            
            container.appendChild(labelDiv);
        }

        // Progress bar
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        progressBar.style.height = `${height}px`;

        // Progress fill
        const progressFill = document.createElement('div');
        progressFill.className = `progress-fill ${style !== 'default' ? `progress-${style}` : ''}`;
        if (animated) progressFill.classList.add('animated');
        progressFill.style.width = `${Math.min(100, Math.max(0, progress))}%`;
        
        progressBar.appendChild(progressFill);
        container.appendChild(progressBar);

        return container;
    }

    /**
     * Updates progress bar with animation
     * @param {HTMLElement|string} progressBar - Progress bar element or ID
     * @param {number} newProgress - New progress value (0-100)
     * @param {Object} options - Update options
     */
    static update(progressBar, newProgress, options = {}) {
        const element = typeof progressBar === 'string' ? document.getElementById(progressBar) : progressBar;
        if (element) {
            const fill = element.querySelector('.progress-fill');
            const percentage = element.querySelector('.progress-percentage');
            
            if (fill) {
                const clampedProgress = Math.min(100, Math.max(0, newProgress));
                fill.style.width = `${clampedProgress}%`;
                
                // Update style if specified
                if (options.style) {
                    fill.className = `progress-fill ${options.style !== 'default' ? `progress-${options.style}` : ''}`;
                    if (options.animated !== undefined && options.animated) {
                        fill.classList.add('animated');
                    }
                }
            }
            
            if (percentage) {
                percentage.textContent = `${newProgress}%`;
            }
            
            // Update label if specified
            if (options.label) {
                const labelSpan = element.querySelector('.progress-label span:first-child');
                if (labelSpan) {
                    labelSpan.textContent = options.label;
                }
            }
        }
    }
}

// Grid System
class Grid {
    /**
     * Creates a responsive grid layout
     * @param {Object} options - Grid configuration
     * @param {number} options.columns - Number of columns (1-12)
     * @param {string} options.gap - Gap size (sm, md, lg, xl)
     * @param {Object} options.responsive - Responsive breakpoints {sm: 1, md: 2, lg: 3}
     * @param {string} options.className - Additional CSS classes
     * @param {Array} options.children - Child elements
     * @returns {HTMLElement} Grid element
     */
    static create(options = {}) {
        const {
            columns = 3,
            gap = 'lg',
            responsive = {},
            className = '',
            children = []
        } = options;

        const grid = document.createElement('div');
        grid.className = `grid grid-${columns} gap-${gap} ${className}`.trim();
        
        // Add responsive classes
        if (responsive.sm) grid.classList.add(`grid-sm-${responsive.sm}`);
        if (responsive.md) grid.classList.add(`grid-md-${responsive.md}`);
        if (responsive.lg) grid.classList.add(`grid-lg-${responsive.lg}`);
        
        // Add children
        children.forEach(child => {
            if (typeof child === 'string') {
                const div = document.createElement('div');
                div.innerHTML = child;
                grid.appendChild(div);
            } else {
                grid.appendChild(child);
            }
        });

        return grid;
    }

    /**
     * Creates a metric grid - specialized grid for metrics
     * @param {Array} metrics - Array of metric configurations
     * @param {Object} options - Grid options
     * @returns {HTMLElement} Grid element with metrics
     */
    static createMetricGrid(metrics = [], options = {}) {
        const metricElements = metrics.map(metric => Metric.create(metric));
        return Grid.create({
            ...options,
            children: metricElements,
            className: `metric-grid ${options.className || ''}`.trim()
        });
    }
}

// Core styles initialization function
function initializeCoreUIStyles() {
    // Add core component CSS if not already present
    if (!document.getElementById('ui-core-styles')) {
        const style = document.createElement('style');
        style.id = 'ui-core-styles';
        style.textContent = `
            /* Card Component Styles */
            .card-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: var(--spacing-lg);
            }
            
            .card-header h3 {
                margin: 0;
            }
            
            .card-header-actions {
                display: flex;
                gap: var(--spacing-sm);
            }
            
            .card.collapsed .card-content {
                display: none;
            }
            
            .card-header.collapsible {
                cursor: pointer;
                user-select: none;
            }
            
            .card-header.collapsible:hover {
                opacity: 0.8;
            }
            
            /* Metric Component Styles */
            .metric-trend {
                font-size: 0.8rem;
                margin: var(--spacing-xs) 0;
                font-weight: 600;
            }
            
            .metric-trend.trend-up {
                color: var(--success-color);
            }
            
            .metric-trend.trend-down {
                color: var(--danger-color);
            }
            
            .metric-trend.trend-neutral {
                color: var(--text-secondary);
            }
            
            .metric-value.updating {
                animation: pulse 0.5s ease-in-out;
            }
            
            /* Progress Bar Styles */
            .progress-success .progress-fill {
                background: var(--success-color);
            }
            
            .progress-warning .progress-fill {
                background: var(--warning-color);
            }
            
            .progress-danger .progress-fill {
                background: var(--danger-color);
            }
            
            .progress-fill.animated {
                background-image: linear-gradient(
                    45deg,
                    rgba(255, 255, 255, 0.15) 25%,
                    transparent 25%,
                    transparent 50%,
                    rgba(255, 255, 255, 0.15) 50%,
                    rgba(255, 255, 255, 0.15) 75%,
                    transparent 75%,
                    transparent
                );
                background-size: 1rem 1rem;
                animation: progress-animation 1s linear infinite;
            }
            
            @keyframes progress-animation {
                0% { background-position: 0 0; }
                100% { background-position: 1rem 1rem; }
            }
            
            /* Grid System Styles */
            .gap-sm { gap: var(--spacing-sm); }
            .gap-md { gap: var(--spacing-md); }
            .gap-lg { gap: var(--spacing-lg); }
            .gap-xl { gap: var(--spacing-xl); }
            
            /* Responsive Grid */
            @media (max-width: 640px) {
                .grid-sm-1 { grid-template-columns: 1fr; }
                .grid-sm-2 { grid-template-columns: repeat(2, 1fr); }
            }
            
            @media (max-width: 768px) {
                .grid-md-1 { grid-template-columns: 1fr; }
                .grid-md-2 { grid-template-columns: repeat(2, 1fr); }
                .grid-md-3 { grid-template-columns: repeat(3, 1fr); }
            }
            
            @media (max-width: 1024px) {
                .grid-lg-1 { grid-template-columns: 1fr; }
                .grid-lg-2 { grid-template-columns: repeat(2, 1fr); }
                .grid-lg-3 { grid-template-columns: repeat(3, 1fr); }
                .grid-lg-4 { grid-template-columns: repeat(4, 1fr); }
            }
            
            .metric-grid .metric {
                padding: var(--spacing-md);
                background: var(--surface-secondary);
                border-radius: var(--radius-md);
                transition: transform 0.2s ease;
            }
            
            .metric-grid .metric:hover {
                transform: translateY(-2px);
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
initializeCoreUIStyles();

export { Card, Metric, ProgressBar, Grid, initializeCoreUIStyles };