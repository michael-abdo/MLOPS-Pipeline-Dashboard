import { CONFIG } from '../common/config.js';
import { wsManager } from '../common/websocket.js';

/**
 * Navigation Component
 * Renders consistent navigation across all pages
 */
export class Navigation {
    constructor(containerId, currentPage) {
        this.container = document.getElementById(containerId);
        this.currentPage = currentPage || window.location.pathname;
        this.connectionStatusEl = null;
        
        if (!this.container) {
            console.error(`Navigation container '${containerId}' not found`);
            return;
        }
        
        this.init();
    }
    
    init() {
        this.render();
        this.setupWebSocketListeners();
    }
    
    render() {
        const pages = [
            { name: 'Dashboard', path: CONFIG.PAGES.DASHBOARD, icon: '📊' },
            { name: 'Pipeline', path: CONFIG.PAGES.PIPELINE, icon: '🔄' },
            { name: 'Architecture', path: CONFIG.PAGES.ARCHITECTURE, icon: '🏗️' },
            { name: 'Data', path: CONFIG.PAGES.DATA, icon: '📁' },
            { name: 'Monitoring', path: CONFIG.PAGES.MONITORING, icon: '📈' },
            { name: 'Settings', path: CONFIG.PAGES.SETTINGS, icon: '⚙️' }
        ];
        
        const navHTML = `
            <div class="nav-container">
                <div class="nav-brand">
                    <h1>ML Pipeline</h1>
                </div>
                <div class="nav-menu">
                    ${pages.map(page => `
                        <a href="${page.path}" 
                           class="nav-link ${this.isCurrentPage(page.path) ? 'active' : ''}"
                           title="${page.name}">
                            <span class="nav-icon">${page.icon}</span>
                            <span class="nav-text">${page.name}</span>
                        </a>
                    `).join('')}
                    
                    <div id="connectionStatus" class="connection-status disconnected" title="WebSocket connection status">
                        Connecting...
                    </div>
                </div>
            </div>
        `;
        
        this.container.innerHTML = navHTML;
        this.connectionStatusEl = document.getElementById('connectionStatus');
    }
    
    isCurrentPage(path) {
        // Handle both exact matches and index.html -> / mapping
        const currentPath = window.location.pathname;
        return path === currentPath || 
               (path === '/' && (currentPath === '/index.html' || currentPath === '/'));
    }
    
    setupWebSocketListeners() {
        // Update connection status
        wsManager.on('status_changed', ({ status }) => {
            this.updateConnectionStatus(status);
        });
        
        // Update connection quality
        wsManager.on('quality_changed', ({ quality, latency }) => {
            this.updateConnectionQuality(quality, latency);
        });
        
        // Set initial status
        const connInfo = wsManager.getConnectionInfo();
        this.updateConnectionStatus(connInfo.status);
        if (connInfo.isConnected) {
            this.updateConnectionQuality(connInfo.quality, connInfo.latency);
        }
    }
    
    updateConnectionStatus(status) {
        if (!this.connectionStatusEl) return;
        
        // Remove all status classes
        this.connectionStatusEl.className = 'connection-status';
        
        // Add appropriate class and text
        switch (status) {
            case 'connecting':
                this.connectionStatusEl.classList.add('connecting');
                this.connectionStatusEl.textContent = 'Connecting...';
                break;
                
            case 'connected':
                this.connectionStatusEl.classList.add('connected');
                this.connectionStatusEl.textContent = 'Connected';
                break;
                
            case 'reconnecting':
                this.connectionStatusEl.classList.add('reconnecting');
                const attempts = wsManager.reconnectAttempts;
                this.connectionStatusEl.textContent = `Reconnecting... (${attempts})`;
                break;
                
            case 'disconnected':
                this.connectionStatusEl.classList.add('disconnected');
                this.connectionStatusEl.textContent = 'Disconnected';
                break;
                
            case 'error':
                this.connectionStatusEl.classList.add('connection-error');
                this.connectionStatusEl.textContent = 'Connection Error';
                break;
        }
    }
    
    updateConnectionQuality(quality, latency) {
        if (!this.connectionStatusEl) return;
        
        this.connectionStatusEl.setAttribute('data-quality', quality);
        
        if (latency && latency < 1000) {
            this.connectionStatusEl.title = `Connection: ${quality} (${latency}ms latency)`;
        }
    }
}

// Auto-initialize navigation if nav element exists
document.addEventListener('DOMContentLoaded', () => {
    const navElement = document.getElementById('main-nav');
    if (navElement) {
        new Navigation('main-nav', window.location.pathname);
    }
});