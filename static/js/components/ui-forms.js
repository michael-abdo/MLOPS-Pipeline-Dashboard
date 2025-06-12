/**
 * Form UI Components Library
 * Form-related components: ButtonGroup, UploadArea
 * Split from ui-components.js for better performance and lazy loading
 */

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
        
        // Add accessibility attributes
        uploadArea.setAttribute('role', 'button');
        uploadArea.setAttribute('tabindex', '0');
        uploadArea.setAttribute('aria-label', 'Upload data file. Supported formats: CSV, XLSX. Use Enter or Space to select file.');

        // Hidden file input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = accept.join(',');
        fileInput.multiple = multiple;
        fileInput.style.display = 'none';
        fileInput.setAttribute('aria-label', 'File input for upload area');
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
        
        // Keyboard accessibility
        uploadArea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInput.click();
            }
        });
        
        // Focus styles
        uploadArea.addEventListener('focus', function() {
            this.style.outline = '3px solid var(--primary-color)';
            this.style.outlineOffset = '2px';
        });
        
        uploadArea.addEventListener('blur', function() {
            this.style.outline = '';
            this.style.outlineOffset = '';
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

// Form styles initialization function
function initializeFormUIStyles() {
    // Add form component CSS if not already present
    if (!document.getElementById('ui-forms-styles')) {
        const style = document.createElement('style');
        style.id = 'ui-forms-styles';
        style.textContent = `
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
            
            @keyframes pulse {
                0%, 100% { opacity: 0.7; }
                50% { opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
}

// Initialize styles when module loads
initializeFormUIStyles();

export { ButtonGroup, UploadArea, initializeFormUIStyles };