/**
 * Reusable UI Components Library
 * Provides standardized components to reduce code duplication
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
        const metricElement = typeof metric === 'string' ? document.getElementById(metric) : metric;
        if (metricElement) {
            const valueDiv = metricElement.querySelector('.metric-value');
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

// Utility function to initialize all components on page load
function initializeUIComponents() {
    // Add component-specific CSS if not already present
    if (!document.getElementById('ui-components-styles')) {
        const style = document.createElement('style');
        style.id = 'ui-components-styles';
        style.textContent = `
            /* Card Component Enhancements */
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
            
            /* Metric Component Enhancements */
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
            
            /* Progress Bar Enhancements */
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
                0% {
                    background-position: 0 0;
                }
                100% {
                    background-position: 1rem 1rem;
                }
            }
            
            /* Grid System Enhancements */
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
            
            /* ButtonGroup Component Styles */
            .btn-group {
                display: flex;
                gap: var(--spacing-sm);
            }
            
            .btn-group-center {
                justify-content: center;
            }
            
            .btn-group-right {
                justify-content: flex-end;
            }
            
            .btn-group-justified {
                justify-content: space-between;
            }
            
            .btn {
                display: inline-flex;
                align-items: center;
                gap: var(--spacing-xs);
                padding: var(--spacing-sm) var(--spacing-md);
                border: 1px solid transparent;
                border-radius: var(--radius-md);
                font-size: 0.9rem;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                text-decoration: none;
                background: none;
            }
            
            .btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }
            
            .btn-sm {
                padding: var(--spacing-xs) var(--spacing-sm);
                font-size: 0.8rem;
            }
            
            .btn-lg {
                padding: var(--spacing-md) var(--spacing-lg);
                font-size: 1rem;
            }
            
            .btn-primary {
                background: var(--primary-color);
                color: white;
                border-color: var(--primary-color);
            }
            
            .btn-primary:hover:not(:disabled) {
                background: var(--primary-dark);
                border-color: var(--primary-dark);
            }
            
            .btn-secondary {
                background: var(--surface-secondary);
                color: var(--text-primary);
                border-color: var(--border-color);
            }
            
            .btn-secondary:hover:not(:disabled) {
                background: var(--surface-hover);
            }
            
            .btn-success {
                background: var(--success-color);
                color: white;
                border-color: var(--success-color);
            }
            
            .btn-success:hover:not(:disabled) {
                background: var(--success-dark);
            }
            
            .btn-warning {
                background: var(--warning-color);
                color: white;
                border-color: var(--warning-color);
            }
            
            .btn-warning:hover:not(:disabled) {
                background: var(--warning-dark);
            }
            
            .btn-danger {
                background: var(--danger-color);
                color: white;
                border-color: var(--danger-color);
            }
            
            .btn-danger:hover:not(:disabled) {
                background: var(--danger-dark);
            }
            
            .btn-loading .btn-spinner {
                animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            /* UploadArea Component Styles */
            .upload-area {
                border: 2px dashed var(--border-color);
                border-radius: var(--radius-lg);
                padding: var(--spacing-xl);
                text-align: center;
                cursor: pointer;
                transition: all 0.3s ease;
                background: var(--surface-secondary);
            }
            
            .upload-area:hover {
                border-color: var(--primary-color);
                background: var(--surface-hover);
            }
            
            .upload-area.upload-dragover {
                border-color: var(--primary-color);
                background: var(--primary-light);
                transform: scale(1.02);
            }
            
            .upload-content {
                pointer-events: none;
            }
            
            .upload-icon {
                font-size: 3rem;
                margin-bottom: var(--spacing-md);
                opacity: 0.7;
            }
            
            .upload-text {
                font-size: 1.1rem;
                font-weight: 500;
                color: var(--text-primary);
                margin-bottom: var(--spacing-sm);
            }
            
            .upload-hint {
                font-size: 0.9rem;
                color: var(--text-secondary);
            }
            
            .upload-area.upload-uploading {
                border-color: var(--primary-color);
                background: var(--primary-light);
            }
            
            .upload-area.upload-uploading .upload-icon {
                animation: pulse 1.5s ease-in-out infinite;
            }
            
            .upload-area.upload-success {
                border-color: var(--success-color);
                background: var(--success-light);
            }
            
            .upload-area.upload-error {
                border-color: var(--danger-color);
                background: var(--danger-light);
            }
            
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
            
            @keyframes pulse {
                0%, 100% { opacity: 0.7; }
                50% { opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
}

// ButtonGroup Component
class ButtonGroup {
    /**
     * Creates a standardized button group
     * @param {Object} options - Button group configuration
     * @param {Array} options.buttons - Array of button configurations
     * @param {string} options.alignment - Button alignment (left, center, right, justified)
     * @param {string} options.size - Button size (sm, md, lg)
     * @param {string} options.variant - Default variant (primary, secondary, success, warning, danger)
     * @param {string} options.className - Additional CSS classes
     * @param {string} options.id - Button group ID
     * @returns {HTMLElement} Button group element
     */
    static create(options = {}) {
        const {
            buttons = [],
            alignment = 'left',
            size = 'md',
            variant = 'primary',
            className = '',
            id = ''
        } = options;

        const buttonGroup = document.createElement('div');
        buttonGroup.className = `btn-group btn-group-${alignment} ${className}`.trim();
        if (id) buttonGroup.id = id;

        buttons.forEach(buttonConfig => {
            const button = ButtonGroup.createButton({
                size,
                variant,
                ...buttonConfig
            });
            buttonGroup.appendChild(button);
        });

        return buttonGroup;
    }

    /**
     * Creates a single button
     * @param {Object} options - Button configuration
     * @param {string} options.text - Button text
     * @param {string} options.icon - Button icon
     * @param {string} options.variant - Button variant (primary, secondary, success, warning, danger)
     * @param {string} options.size - Button size (sm, md, lg)
     * @param {Function} options.onClick - Click handler
     * @param {boolean} options.disabled - Disabled state
     * @param {boolean} options.loading - Loading state
     * @param {string} options.type - Button type (button, submit, reset)
     * @param {string} options.className - Additional CSS classes
     * @param {string} options.id - Button ID
     * @returns {HTMLElement} Button element
     */
    static createButton(options = {}) {
        const {
            text = '',
            icon = '',
            variant = 'primary',
            size = 'md',
            onClick = null,
            disabled = false,
            loading = false,
            type = 'button',
            className = '',
            id = ''
        } = options;

        const button = document.createElement('button');
        button.type = type;
        button.className = `btn btn-${variant} btn-${size} ${className}`.trim();
        button.disabled = disabled || loading;
        if (id) button.id = id;

        // Loading state
        if (loading) {
            button.classList.add('btn-loading');
            const spinner = document.createElement('span');
            spinner.className = 'btn-spinner';
            spinner.innerHTML = '🔄';
            button.appendChild(spinner);
        } else {
            // Icon
            if (icon) {
                const iconSpan = document.createElement('span');
                iconSpan.className = 'btn-icon';
                iconSpan.innerHTML = icon;
                button.appendChild(iconSpan);
            }

            // Text
            if (text) {
                const textSpan = document.createElement('span');
                textSpan.className = 'btn-text';
                textSpan.textContent = text;
                button.appendChild(textSpan);
            }
        }

        // Click handler
        if (onClick && typeof onClick === 'function') {
            button.addEventListener('click', onClick);
        }

        return button;
    }

    /**
     * Updates button loading state
     * @param {HTMLElement|string} button - Button element or ID
     * @param {boolean} loading - Loading state
     */
    static setLoading(button, loading) {
        const buttonElement = typeof button === 'string' ? document.getElementById(button) : button;
        if (buttonElement) {
            buttonElement.disabled = loading;
            if (loading) {
                buttonElement.classList.add('btn-loading');
                buttonElement.innerHTML = '<span class="btn-spinner">🔄</span>';
            } else {
                buttonElement.classList.remove('btn-loading');
                // Restore original content - this would need to be enhanced
                // to remember original state in a real implementation
            }
        }
    }
}

// UploadArea Component
class UploadArea {
    /**
     * Creates a standardized upload area with drag & drop
     * @param {Object} options - Upload area configuration
     * @param {Array} options.accept - Accepted file types (e.g., ['.csv', '.xlsx'])
     * @param {boolean} options.multiple - Allow multiple files
     * @param {number} options.maxSize - Max file size in MB
     * @param {Function} options.onUpload - Upload callback
     * @param {Function} options.onError - Error callback
     * @param {string} options.placeholder - Placeholder text
     * @param {string} options.className - Additional CSS classes
     * @param {string} options.id - Upload area ID
     * @returns {HTMLElement} Upload area element
     */
    static create(options = {}) {
        const {
            accept = ['.csv'],
            multiple = false,
            maxSize = 50, // MB
            onUpload = null,
            onError = null,
            placeholder = 'Drag & drop files here or click to browse',
            className = '',
            id = ''
        } = options;

        const uploadArea = document.createElement('div');
        uploadArea.className = `upload-area ${className}`.trim();
        if (id) uploadArea.id = id;

        // Hidden file input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = accept.join(',');
        fileInput.multiple = multiple;
        fileInput.style.display = 'none';
        // Use provided ID or generate unique ID, but maintain fileInput compatibility if specified
        if (id === 'modernUploadArea') {
            fileInput.id = 'fileInput'; // For main dashboard compatibility
        }

        // Upload content
        const uploadContent = document.createElement('div');
        uploadContent.className = 'upload-content';
        uploadContent.innerHTML = `
            <div class="upload-icon">📁</div>
            <div class="upload-text">${placeholder}</div>
            <div class="upload-hint">Supported: ${accept.join(', ')} • Max size: ${maxSize}MB</div>
        `;

        uploadArea.appendChild(fileInput);
        uploadArea.appendChild(uploadContent);

        // File validation
        const validateFile = (file) => {
            const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
            const fileSizeMB = file.size / (1024 * 1024);

            if (!accept.includes(fileExtension)) {
                return `File type ${fileExtension} not supported. Accepted: ${accept.join(', ')}`;
            }

            if (fileSizeMB > maxSize) {
                return `File too large (${fileSizeMB.toFixed(1)}MB). Max size: ${maxSize}MB`;
            }

            return null;
        };

        // Handle file selection
        const handleFiles = (files) => {
            const fileArray = Array.from(files);
            const validFiles = [];
            const errors = [];

            fileArray.forEach(file => {
                const error = validateFile(file);
                if (error) {
                    errors.push(`${file.name}: ${error}`);
                } else {
                    validFiles.push(file);
                }
            });

            if (errors.length > 0 && onError) {
                onError(errors);
            }

            if (validFiles.length > 0 && onUpload) {
                onUpload(multiple ? validFiles : validFiles[0]);
            }
        };

        // Click to browse
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFiles(e.target.files);
            }
        });

        // Drag & drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('upload-dragover');
        });

        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            if (!uploadArea.contains(e.relatedTarget)) {
                uploadArea.classList.remove('upload-dragover');
            }
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('upload-dragover');
            
            if (e.dataTransfer.files.length > 0) {
                handleFiles(e.dataTransfer.files);
            }
        });

        return uploadArea;
    }

    /**
     * Updates upload area state
     * @param {HTMLElement|string} uploadArea - Upload area element or ID
     * @param {string} state - State (uploading, success, error, ready)
     * @param {string} message - Optional message
     */
    static setState(uploadArea, state, message = '') {
        const element = typeof uploadArea === 'string' ? document.getElementById(uploadArea) : uploadArea;
        if (element) {
            // Reset classes
            element.classList.remove('upload-uploading', 'upload-success', 'upload-error');
            
            // Add new state
            if (state !== 'ready') {
                element.classList.add(`upload-${state}`);
            }

            // Update content based on state
            const uploadText = element.querySelector('.upload-text');
            if (uploadText) {
                switch (state) {
                    case 'uploading':
                        uploadText.textContent = message || 'Uploading...';
                        break;
                    case 'success':
                        uploadText.textContent = message || 'Upload successful!';
                        break;
                    case 'error':
                        uploadText.textContent = message || 'Upload failed. Try again.';
                        break;
                    default:
                        uploadText.textContent = message || 'Drag & drop files here or click to browse';
                }
            }
        }
    }
}

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
}

// Export components for use in other modules
export { Card, Metric, ProgressBar, Grid, ButtonGroup, UploadArea, ChartContainer, initializeUIComponents };