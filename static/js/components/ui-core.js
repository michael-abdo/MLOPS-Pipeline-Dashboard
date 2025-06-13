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
        const metricElement = typeof metric === 'string' ? document.getElementById(metric) : metric;
        if (metricElement) {
            // Handle both cases: element is metric-value itself OR has metric-value child
            let valueDiv = metricElement.querySelector('.metric-value');
            if (!valueDiv && metricElement.classList.contains('metric-value')) {
                valueDiv = metricElement; // Element itself is the metric-value
            }
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

    /**
     * Sets trend indicator for a metric with real-time animation
     * @param {HTMLElement|string} metric - Metric element or ID
     * @param {string} trendDirection - Trend direction ('up', 'down', 'stable', 'neutral')
     * @param {number} trendValue - Trend percentage change
     * @param {Object} options - Trend options
     */
    static setTrend(metric, trendDirection, trendValue = null, options = {}) {
        const {
            animated = true,
            threshold = 5, // Minimum change % to show trend
            showValue = true,
            duration = 300
        } = options;

        const metricElement = typeof metric === 'string' ? document.getElementById(metric) : metric;
        if (!metricElement) return;

        // Remove existing trend indicator
        const existingTrend = metricElement.querySelector('.metric-trend');
        if (existingTrend) {
            existingTrend.remove();
        }

        // Only show trend if change exceeds threshold
        if (Math.abs(trendValue) < threshold && trendDirection !== 'stable') {
            return;
        }

        // Create new trend indicator
        const trendDiv = document.createElement('div');
        trendDiv.className = `metric-trend trend-${trendDirection}`;
        
        // Set trend icon
        let trendIcon;
        switch (trendDirection) {
            case 'up':
                trendIcon = '↗';
                trendDiv.classList.add('trend-positive');
                break;
            case 'down':
                trendIcon = '↘';
                trendDiv.classList.add('trend-negative');
                break;
            case 'stable':
                trendIcon = '→';
                trendDiv.classList.add('trend-stable');
                break;
            default:
                trendIcon = '→';
                trendDiv.classList.add('trend-neutral');
        }

        // Set trend content
        if (showValue && trendValue !== null) {
            trendDiv.innerHTML = `${trendIcon} ${Math.abs(trendValue).toFixed(1)}%`;
        } else {
            trendDiv.innerHTML = trendIcon;
        }

        // Insert trend indicator after the value
        const valueDiv = metricElement.querySelector('.metric-value');
        if (valueDiv) {
            valueDiv.insertAdjacentElement('afterend', trendDiv);
        } else {
            metricElement.appendChild(trendDiv);
        }

        // Add animation
        if (animated) {
            trendDiv.style.opacity = '0';
            trendDiv.style.transform = 'scale(0.8)';
            
            // Animate in
            setTimeout(() => {
                trendDiv.style.transition = `all ${duration}ms ease-out`;
                trendDiv.style.opacity = '1';
                trendDiv.style.transform = 'scale(1)';
            }, 10);
        }
    }

    /**
     * Updates metric with pulse animation for real-time updates
     * @param {HTMLElement|string} metric - Metric element or ID
     * @param {Object} options - Pulse options
     */
    static pulse(metric, options = {}) {
        const {
            duration = 600,
            intensity = 'medium', // 'light', 'medium', 'strong'
            color = null // Override pulse color
        } = options;

        const metricElement = typeof metric === 'string' ? document.getElementById(metric) : metric;
        if (!metricElement) return;

        // Remove existing pulse classes
        metricElement.classList.remove('pulse-light', 'pulse-medium', 'pulse-strong');
        
        // Add pulse class
        const pulseClass = `pulse-${intensity}`;
        metricElement.classList.add(pulseClass);

        // Apply custom color if provided
        if (color) {
            metricElement.style.setProperty('--pulse-color', color);
        }

        // Remove pulse class after animation
        setTimeout(() => {
            metricElement.classList.remove(pulseClass);
            if (color) {
                metricElement.style.removeProperty('--pulse-color');
            }
        }, duration);
    }

    /**
     * Updates metric health status with color coding
     * @param {HTMLElement|string} metric - Metric element or ID
     * @param {string} healthStatus - Health status ('healthy', 'warning', 'critical')
     * @param {Object} options - Health options
     */
    static setHealth(metric, healthStatus, options = {}) {
        const {
            animated = true,
            showIcon = true
        } = options;

        const metricElement = typeof metric === 'string' ? document.getElementById(metric) : metric;
        if (!metricElement) return;

        // Remove existing health classes
        metricElement.classList.remove('health-healthy', 'health-warning', 'health-critical');
        
        // Add new health class
        metricElement.classList.add(`health-${healthStatus}`);

        // Add health icon if requested
        if (showIcon) {
            let healthIcon;
            switch (healthStatus) {
                case 'healthy':
                    healthIcon = '✓';
                    break;
                case 'warning':
                    healthIcon = '⚠';
                    break;
                case 'critical':
                    healthIcon = '✗';
                    break;
                default:
                    healthIcon = '';
            }

            // Update or create health indicator
            let healthIndicator = metricElement.querySelector('.metric-health');
            if (!healthIndicator && healthIcon) {
                healthIndicator = document.createElement('span');
                healthIndicator.className = 'metric-health';
                
                // Insert after value
                const valueDiv = metricElement.querySelector('.metric-value');
                if (valueDiv) {
                    valueDiv.appendChild(healthIndicator);
                }
            }

            if (healthIndicator) {
                healthIndicator.textContent = healthIcon;
                healthIndicator.className = `metric-health health-${healthStatus}`;

                // Add animation
                if (animated) {
                    healthIndicator.style.animation = 'healthBounce 0.4s ease-out';
                    setTimeout(() => {
                        healthIndicator.style.animation = '';
                    }, 400);
                }
            }
        }
    }

    /**
     * Enhanced update method with health-based color coding
     * @param {HTMLElement|string} metric - Metric element or ID
     * @param {string|number} newValue - New value
     * @param {Object} options - Update options with health thresholds
     */
    static updateWithHealth(metric, newValue, options = {}) {
        const {
            format = 'number',
            tooltip = '',
            metricType = 'generic', // 'accuracy', 'response_time', 'prediction_rate'
            previousValue = null,
            animated = true,
            showTrend = true
        } = options;
        
        // Import CONFIG for thresholds
        import('../common/config.js').then(({ CONFIG }) => {
            const metricElement = typeof metric === 'string' ? document.getElementById(metric) : metric;
            if (!metricElement) return;
            
            // Update the value first
            this.update(metric, newValue, { format, tooltip });
            
            // Determine health status based on metric type and value
            let healthStatus = 'healthy';
            const numValue = parseFloat(newValue);
            
            if (metricType === 'accuracy') {
                const thresholds = CONFIG.MODEL_METRICS.ACCURACY_THRESHOLDS;
                if (numValue >= thresholds.EXCELLENT) {
                    healthStatus = 'healthy';
                } else if (numValue >= thresholds.WARNING) {
                    healthStatus = 'healthy';
                } else if (numValue >= thresholds.CRITICAL) {
                    healthStatus = 'warning';
                } else {
                    healthStatus = 'critical';
                }
            } else if (metricType === 'response_time') {
                const thresholds = CONFIG.MODEL_METRICS.RESPONSE_TIME_THRESHOLDS;
                if (numValue <= thresholds.EXCELLENT) {
                    healthStatus = 'healthy';
                } else if (numValue <= thresholds.WARNING) {
                    healthStatus = 'healthy';
                } else if (numValue <= thresholds.CRITICAL) {
                    healthStatus = 'warning';
                } else {
                    healthStatus = 'critical';
                }
            }
            
            // Apply health status
            this.setHealth(metric, healthStatus, { animated });
            
            // Calculate and show trend if previous value available
            if (showTrend && previousValue !== null && numValue !== previousValue) {
                const change = ((numValue - previousValue) / previousValue) * 100;
                const threshold = CONFIG.MODEL_METRICS.VISUAL_INDICATORS.TREND_ARROW_THRESHOLD;
                
                if (Math.abs(change) >= threshold) {
                    const trendDirection = change > 0 ? 'up' : 'down';
                    this.setTrend(metric, trendDirection, Math.abs(change), {
                        animated: true,
                        threshold
                    });
                    
                    // Add pulse for significant changes
                    if (Math.abs(change) >= threshold * 2) {
                        this.pulse(metric, { 
                            intensity: 'medium',
                            duration: CONFIG.MODEL_METRICS.VISUAL_INDICATORS.PULSE_ANIMATION_DURATION
                        });
                    }
                }
            }
        }).catch(() => {
            // Fallback if CONFIG import fails
            this.update(metric, newValue, { format, tooltip });
        });
    }

    /**
     * Real-time metric updater with rate limiting
     * @param {HTMLElement|string} metric - Metric element or ID
     * @param {string|number} newValue - New value
     * @param {Object} options - Update options
     */
    static updateRealTime(metric, newValue, options = {}) {
        const metricElement = typeof metric === 'string' ? document.getElementById(metric) : metric;
        if (!metricElement) return;
        
        // Rate limiting check
        const now = Date.now();
        const lastUpdate = metricElement.dataset.lastUpdate || 0;
        const minInterval = options.minInterval || 100; // Minimum 100ms between updates
        
        if (now - lastUpdate < minInterval) {
            // Queue the update
            clearTimeout(metricElement.updateTimeout);
            metricElement.updateTimeout = setTimeout(() => {
                this.updateWithHealth(metric, newValue, options);
                metricElement.dataset.lastUpdate = Date.now();
            }, minInterval - (now - lastUpdate));
            return;
        }
        
        // Store previous value for trend calculation
        const valueElement = metricElement.querySelector('.metric-value');
        const previousValue = valueElement ? parseFloat(valueElement.textContent.replace(/[^\d.-]/g, '')) : null;
        
        // Update with previous value for trend calculation
        this.updateWithHealth(metric, newValue, {
            ...options,
            previousValue
        });
        
        metricElement.dataset.lastUpdate = now;
    }

    /**
     * Start real-time monitoring for a metric
     * @param {HTMLElement|string} metric - Metric element or ID
     * @param {Function} dataSource - Function that returns current value
     * @param {Object} options - Monitoring options
     */
    static startRealTimeMonitoring(metric, dataSource, options = {}) {
        const {
            interval = 2000, // 2 seconds default
            metricType = 'generic',
            format = 'number'
        } = options;
        
        const metricElement = typeof metric === 'string' ? document.getElementById(metric) : metric;
        if (!metricElement) return;
        
        // Stop existing monitoring
        this.stopRealTimeMonitoring(metric);
        
        // Start new monitoring
        const monitoringInterval = setInterval(async () => {
            try {
                const newValue = await dataSource();
                if (newValue !== null && newValue !== undefined) {
                    this.updateRealTime(metric, newValue, {
                        metricType,
                        format,
                        showTrend: true,
                        animated: true
                    });
                }
            } catch (error) {
                console.warn('Real-time metric update failed:', error);
            }
        }, interval);
        
        // Store interval for cleanup
        metricElement.dataset.monitoringInterval = monitoringInterval;
    }

    /**
     * Stop real-time monitoring for a metric
     * @param {HTMLElement|string} metric - Metric element or ID
     */
    static stopRealTimeMonitoring(metric) {
        const metricElement = typeof metric === 'string' ? document.getElementById(metric) : metric;
        if (!metricElement) return;
        
        const intervalId = metricElement.dataset.monitoringInterval;
        if (intervalId) {
            clearInterval(parseInt(intervalId));
            delete metricElement.dataset.monitoringInterval;
        }
        
        // Clear any pending updates
        if (metricElement.updateTimeout) {
            clearTimeout(metricElement.updateTimeout);
            delete metricElement.updateTimeout;
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
            
            /* Enhanced Metric Component Styles */
            .metric {
                position: relative;
                transition: all 0.3s ease;
            }
            
            .metric-value {
                transition: all 0.3s ease;
                position: relative;
            }
            
            .metric-value.updating {
                animation: metricPulse 0.5s ease-in-out;
            }
            
            .metric-trend {
                font-size: 0.8rem;
                margin: var(--spacing-xs) 0;
                font-weight: 600;
                display: inline-flex;
                align-items: center;
                gap: 2px;
                transition: all 0.3s ease;
            }
            
            .metric-trend.trend-positive,
            .metric-trend.trend-up {
                color: var(--success-color, #10b981);
            }
            
            .metric-trend.trend-negative,
            .metric-trend.trend-down {
                color: var(--danger-color, #ef4444);
            }
            
            .metric-trend.trend-stable,
            .metric-trend.trend-neutral {
                color: var(--text-secondary, #6b7280);
            }
            
            /* Health Status Colors */
            .metric.health-healthy {
                border-left: 3px solid var(--success-color, #10b981);
            }
            
            .metric.health-warning {
                border-left: 3px solid var(--warning-color, #f59e0b);
            }
            
            .metric.health-critical {
                border-left: 3px solid var(--danger-color, #ef4444);
            }
            
            .metric-health {
                font-size: 0.9em;
                margin-left: 4px;
                vertical-align: middle;
            }
            
            .metric-health.health-healthy {
                color: var(--success-color, #10b981);
            }
            
            .metric-health.health-warning {
                color: var(--warning-color, #f59e0b);
            }
            
            .metric-health.health-critical {
                color: var(--danger-color, #ef4444);
            }
            
            /* Real-time Pulse Animations */
            .pulse-light {
                animation: pulseLightAnimation 0.6s ease-out;
            }
            
            .pulse-medium {
                animation: pulseMediumAnimation 0.8s ease-out;
            }
            
            .pulse-strong {
                animation: pulseStrongAnimation 1.0s ease-out;
            }
            
            @keyframes pulseLightAnimation {
                0% { 
                    transform: scale(1);
                    box-shadow: 0 0 0 0 rgba(var(--pulse-color, 59, 130, 246), 0.4);
                }
                70% {
                    transform: scale(1.02);
                    box-shadow: 0 0 0 10px rgba(var(--pulse-color, 59, 130, 246), 0);
                }
                100% {
                    transform: scale(1);
                    box-shadow: 0 0 0 0 rgba(var(--pulse-color, 59, 130, 246), 0);
                }
            }
            
            @keyframes pulseMediumAnimation {
                0% { 
                    transform: scale(1);
                    box-shadow: 0 0 0 0 rgba(var(--pulse-color, 59, 130, 246), 0.6);
                }
                70% {
                    transform: scale(1.05);
                    box-shadow: 0 0 0 15px rgba(var(--pulse-color, 59, 130, 246), 0);
                }
                100% {
                    transform: scale(1);
                    box-shadow: 0 0 0 0 rgba(var(--pulse-color, 59, 130, 246), 0);
                }
            }
            
            @keyframes pulseStrongAnimation {
                0% { 
                    transform: scale(1);
                    box-shadow: 0 0 0 0 rgba(var(--pulse-color, 59, 130, 246), 0.8);
                }
                70% {
                    transform: scale(1.08);
                    box-shadow: 0 0 0 20px rgba(var(--pulse-color, 59, 130, 246), 0);
                }
                100% {
                    transform: scale(1);
                    box-shadow: 0 0 0 0 rgba(var(--pulse-color, 59, 130, 246), 0);
                }
            }
            
            @keyframes metricPulse {
                0%, 100% { 
                    opacity: 1;
                    transform: scale(1);
                }
                50% { 
                    opacity: 0.8;
                    transform: scale(1.02);
                }
            }
            
            @keyframes healthBounce {
                0%, 20%, 50%, 80%, 100% {
                    transform: translateY(0);
                }
                40% {
                    transform: translateY(-3px);
                }
                60% {
                    transform: translateY(-2px);
                }
            }
            
            /* Enhanced Trend Indicators */
            .metric-trend::before {
                content: '';
                width: 0;
                height: 0;
                margin-right: 2px;
                transition: all 0.3s ease;
            }
            
            .metric-trend.trend-up::before {
                border-left: 4px solid transparent;
                border-right: 4px solid transparent;
                border-bottom: 6px solid var(--success-color, #10b981);
            }
            
            .metric-trend.trend-down::before {
                border-left: 4px solid transparent;
                border-right: 4px solid transparent;
                border-top: 6px solid var(--danger-color, #ef4444);
            }
            
            /* Smooth Transitions */
            .metric-value,
            .metric-trend,
            .metric-health {
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            /* Active/Live Indicators */
            .metric.metric-live::after {
                content: '';
                position: absolute;
                top: 4px;
                right: 4px;
                width: 8px;
                height: 8px;
                background: var(--success-color, #10b981);
                border-radius: 50%;
                animation: livePulse 2s infinite;
            }
            
            @keyframes livePulse {
                0%, 100% {
                    opacity: 1;
                    transform: scale(1);
                }
                50% {
                    opacity: 0.5;
                    transform: scale(1.2);
                }
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