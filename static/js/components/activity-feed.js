import { API } from '../common/api.js';
import { wsManager } from '../common/websocket.js';

/**
 * Activity Feed Component
 * Displays real-time activity updates
 */
export class ActivityFeed {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.activities = [];
        this.maxActivities = options.maxActivities || 10;
        this.showTimestamps = options.showTimestamps !== false;
        
        if (!this.container) {
            console.error(`Activity feed container '${containerId}' not found`);
            return;
        }
        
        this.init();
    }
    
    async init() {
        // Load initial activities
        await this.loadActivities();
        
        // Setup WebSocket listener for real-time updates
        this.setupWebSocketListener();
        
        // Initial render
        this.render();
    }
    
    async loadActivities() {
        try {
            const activities = await API.getActivity();
            this.activities = activities.slice(0, this.maxActivities);
        } catch (error) {
            console.error('Failed to load activities:', error);
            this.activities = [];
        }
    }
    
    setupWebSocketListener() {
        wsManager.on('activity_update', (data) => {
            if (data.activity) {
                this.addActivity(data.activity);
            }
        });
    }
    
    addActivity(activity) {
        // Add to beginning of array
        this.activities.unshift(activity);
        
        // Keep only max activities
        if (this.activities.length > this.maxActivities) {
            this.activities.pop();
        }
        
        // Re-render
        this.render();
        
        // Animate new activity
        requestAnimationFrame(() => {
            const firstItem = this.container.querySelector('.activity-item');
            if (firstItem) {
                firstItem.classList.add('activity-new');
                setTimeout(() => {
                    firstItem.classList.remove('activity-new');
                }, 300);
            }
        });
    }
    
    render() {
        if (this.activities.length === 0) {
            this.container.innerHTML = `
                <div class="activity-empty">
                    <p>No recent activity</p>
                </div>
            `;
            return;
        }
        
        const activitiesHTML = this.activities.map(activity => {
            const statusClass = this.getStatusClass(activity.status);
            const timeAgo = this.formatTimeAgo(activity.timestamp);
            
            return `
                <div class="activity-item">
                    <div class="activity-status ${statusClass}"></div>
                    <div class="activity-content">
                        <div class="activity-title">${this.escapeHtml(activity.title)}</div>
                        <div class="activity-description">${this.escapeHtml(activity.description)}</div>
                    </div>
                    ${this.showTimestamps ? `
                        <div class="activity-timestamp" title="${new Date(activity.timestamp).toLocaleString()}">
                            ${timeAgo}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
        
        this.container.innerHTML = activitiesHTML;
    }
    
    getStatusClass(status) {
        switch (status) {
            case 'success':
                return 'success';
            case 'warning':
                return 'warning';
            case 'error':
                return 'error';
            default:
                return 'info';
        }
    }
    
    formatTimeAgo(timestamp) {
        const now = new Date();
        const date = new Date(timestamp);
        const seconds = Math.floor((now - date) / 1000);
        
        if (seconds < 60) {
            return 'Just now';
        } else if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);
            return `${minutes}m ago`;
        } else if (seconds < 86400) {
            const hours = Math.floor(seconds / 3600);
            return `${hours}h ago`;
        } else {
            const days = Math.floor(seconds / 86400);
            return `${days}d ago`;
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Public API
    clear() {
        this.activities = [];
        this.render();
    }
    
    refresh() {
        this.loadActivities().then(() => this.render());
    }
}

// CSS for activity feed animations
const style = document.createElement('style');
style.textContent = `
    .activity-item {
        transition: all 0.3s ease;
    }
    
    .activity-item.activity-new {
        animation: slideInRight 0.3s ease-out;
        background: rgba(37, 99, 235, 0.05);
    }
    
    .activity-empty {
        text-align: center;
        padding: var(--spacing-xl);
        color: var(--text-secondary);
    }
`;
document.head.appendChild(style);