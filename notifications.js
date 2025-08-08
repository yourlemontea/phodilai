// notifications.js - Advanced notification system
let notificationId = 0;
const activeNotifications = new Map();
const notificationQueue = [];
const maxNotifications = 5;
const defaultDuration = 5000;

// Notification types with their configurations
const notificationTypes = {
    success: {
        icon: '✓',
        className: 'success',
        sound: 'success',
        duration: 4000
    },
    error: {
        icon: '✗',
        className: 'error',
        sound: 'error',
        duration: 6000
    },
    warning: {
        icon: '⚠',
        className: 'warning',
        sound: 'warning',
        duration: 5000
    },
    info: {
        icon: 'ℹ',
        className: 'info',
        sound: 'info',
        duration: 4000
    }
};

// Sound effects for notifications
const notificationSounds = {
    success: { frequency: 800, duration: 200 },
    error: { frequency: 300, duration: 500 },
    warning: { frequency: 600, duration: 300 },
    info: { frequency: 500, duration: 150 }
};

// Initialize notification system
export function initializeNotifications() {
    createNotificationContainer();
    requestNotificationPermission();
    setupServiceWorkerNotifications();
}

// Create notification container if it doesn't exist
function createNotificationContainer() {
    let container = document.getElementById('notificationContainer');
    
    if (!container) {
        container = document.createElement('div');
        container.id = 'notificationContainer';
        container.className = 'notification-container';
        container.setAttribute('aria-live', 'polite');
        container.setAttribute('aria-label', 'Notifications');
        document.body.appendChild(container);
    }
    
    return container;
}

// Main notification function
export function showNotification(title, message = '', type = 'info', options = {}) {
    const id = ++notificationId;
    const config = { ...notificationTypes[type], ...options };
    
    const notification = {
        id,
        title,
        message,
        type,
        config,
        timestamp: new Date(),
        ...options
    };
    
    // Add to queue if too many notifications are active
    if (activeNotifications.size >= maxNotifications) {
        notificationQueue.push(notification);
        return id;
    }
    
    displayNotification(notification);
    return id;
}

// Display notification
function displayNotification(notification) {
    const container = createNotificationContainer();
    const element = createNotificationElement(notification);
    
    // Add to active notifications
    activeNotifications.set(notification.id, {
        ...notification,
        element
    });
    
    // Add to DOM with animation
    container.appendChild(element);
    
    // Trigger entrance animation
    requestAnimationFrame(() => {
        element.classList.add('show');
    });
    
    // Play sound if enabled
    if (notification.config.sound && getNotificationSettings().soundEnabled) {
        playNotificationSound(notification.config.sound);
    }
    
    // Auto dismiss if duration is set
    if (notification.config.duration > 0) {
        setTimeout(() => {
            dismissNotification(notification.id);
        }, notification.config.duration);
    }
    
    // Update notification badge
    updateNotificationBadge();
    
    // Send to service worker for persistent notifications if supported
    if (notification.persistent && 'serviceWorker' in navigator) {
        sendPersistentNotification(notification);
    }
}

// Create notification element
function createNotificationElement(notification) {
    const element = document.createElement('div');
    element.className = `notification ${notification.config.className}`;
    element.setAttribute('role', 'alert');
    element.setAttribute('data-notification-id', notification.id);
    
    // Add progress bar for timed notifications
    const progressBar = notification.config.duration > 0 ? 
        `<div class="notification-progress">
            <div class="notification-progress-bar" style="animation-duration: ${notification.config.duration}ms"></div>
        </div>` : '';
    
    // Add action buttons if provided
    const actions = notification.actions ? 
        notification.actions.map(action => 
            `<button class="notification-action" data-action="${action.id}">${action.label}</button>`
        ).join('') : '';
    
    element.innerHTML = `
        <div class="notification-content">
            <div class="notification-header">
                <div class="notification-icon">${notification.config.icon}</div>
                <div class="notification-title">${escapeHtml(notification.title)}</div>
                <button class="notification-close" aria-label="Close notification">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            ${notification.message ? `<div class="notification-message">${escapeHtml(notification.message)}</div>` : ''}
            ${actions ? `<div class="notification-actions">${actions}</div>` : ''}
        </div>
        ${progressBar}
    `;
    
    // Add event listeners
    setupNotificationEvents(element, notification);
    
    return element;
}

// Setup notification event listeners
function setupNotificationEvents(element, notification) {
    // Close button
    const closeBtn = element.querySelector('.notification-close');
    closeBtn?.addEventListener('click', () => {
        dismissNotification(notification.id);
    });
    
    // Action buttons
    const actionBtns = element.querySelectorAll('.notification-action');
    actionBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const actionId = e.target.dataset.action;
            const action = notification.actions?.find(a => a.id === actionId);
            
            if (action && action.callback) {
                action.callback(notification);
            }
            
            // Auto-dismiss after action unless specified otherwise
            if (!action?.keepOpen) {
                dismissNotification(notification.id);
            }
        });
    });
    
    // Click to dismiss (optional)
    if (notification.clickToDismiss !== false) {
        element.addEventListener('click', (e) => {
            // Don't dismiss if clicking on action buttons
            if (!e.target.closest('.notification-action, .notification-close')) {
                dismissNotification(notification.id);
            }
        });
    }
    
    // Pause auto-dismiss on hover
    if (notification.config.duration > 0) {
        let remainingTime = notification.config.duration;
        let pauseTime = 0;
        let timeoutId;
        
        element.addEventListener('mouseenter', () => {
            pauseTime = Date.now();
            clearTimeout(timeoutId);
            element.classList.add('paused');
        });
        
        element.addEventListener('mouseleave', () => {
            if (pauseTime > 0) {
                remainingTime -= (Date.now() - pauseTime);
                pauseTime = 0;
                
                if (remainingTime > 0) {
                    timeoutId = setTimeout(() => {
                        dismissNotification(notification.id);
                    }, remainingTime);
                }
                
                element.classList.remove('paused');
            }
        });
    }
}

// Dismiss notification
export function dismissNotification(id) {
    const notification = activeNotifications.get(id);
    if (!notification) return;
    
    const element = notification.element;
    
    // Animate out
    element.classList.add('dismissing');
    element.classList.remove('show');
    
    // Remove from DOM after animation
    setTimeout(() => {
        if (element.parentNode) {
            element.parentNode.removeChild(element);
        }
        activeNotifications.delete(id);
        
        // Process queue
        processNotificationQueue();
        
        // Update badge
        updateNotificationBadge();
    }, 300);
}

// Dismiss all notifications
export function dismissAllNotifications() {
    const notifications = Array.from(activeNotifications.keys());
    notifications.forEach(id => dismissNotification(id));
    notificationQueue.length = 0;
}

// Process notification queue
function processNotificationQueue() {
    if (notificationQueue.length > 0 && activeNotifications.size < maxNotifications) {
        const nextNotification = notificationQueue.shift();
        displayNotification(nextNotification);
    }
}

// Update notification badge
function updateNotificationBadge() {
    const badge = document.querySelector('.notification-badge');
    const count = activeNotifications.size;
    
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'block' : 'none';
    }
}

// Play notification sound
function playNotificationSound(soundType) {
    try {
        const soundConfig = notificationSounds[soundType];
        if (!soundConfig) return;
        
        // Create audio context
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(soundConfig.frequency, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + soundConfig.duration / 1000);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + soundConfig.duration / 1000);
        
    } catch (error) {
        console.warn('Could not play notification sound:', error);
    }
}

// Request notification permission for browser notifications
async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.warn('This browser does not support notifications');
        return false;
    }
    
    if (Notification.permission === 'granted') {
        return true;
    }
    
    if (Notification.permission === 'denied') {
        return false;
    }
    
    try {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    } catch (error) {
        console.error('Error requesting notification permission:', error);
        return false;
    }
}

// Send persistent notification via service worker
async function sendPersistentNotification(notification) {
    if (!('serviceWorker' in navigator) || !('showNotification' in ServiceWorkerRegistration.prototype)) {
        return;
    }
    
    try {
        const registration = await navigator.serviceWorker.ready;
        
        const options = {
            body: notification.message,
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            tag: notification.tag || `notification-${notification.id}`,
            requireInteraction: notification.requireInteraction || false,
            silent: !getNotificationSettings().soundEnabled,
            data: {
                id: notification.id,
                type: notification.type,
                timestamp: notification.timestamp,
                ...notification.data
            }
        };
        
        if (notification.actions) {
            options.actions = notification.actions.map(action => ({
                action: action.id,
                title: action.label,
                icon: action.icon
            }));
        }
        
        await registration.showNotification(notification.title, options);
        
    } catch (error) {
        console.error('Error showing persistent notification:', error);
    }
}

// Setup service worker notification handlers
function setupServiceWorkerNotifications() {
    if (!('serviceWorker' in navigator)) return;
    
    navigator.serviceWorker.addEventListener('message', event => {
        const { type, data } = event.data;
        
        if (type === 'NOTIFICATION_CLICKED') {
            handleNotificationClick(data);
        } else if (type === 'NOTIFICATION_CLOSED') {
            handleNotificationClose(data);
        }
    });
}

// Handle notification click from service worker
function handleNotificationClick(data) {
    // Handle different notification types
    switch (data.type) {
        case 'order_update':
            // Navigate to order tracking
            window.location.hash = `#order-${data.orderId}`;
            break;
        case 'promotion':
            // Navigate to promotions
            window.location.hash = '#promotions';
            break;
        case 'chat':
            // Open chat
            document.getElementById('chatToggle')?.click();
            break;
        default:
            console.log('Notification clicked:', data);
    }
}

// Handle notification close from service worker
function handleNotificationClose(data) {
    console.log('Notification closed:', data);
}

// Notification settings
function getNotificationSettings() {
    const defaultSettings = {
        enabled: true,
        soundEnabled: true,
        browserNotifications: true,
        types: {
            orders: true,
            promotions: true,
            system: true,
            chat: true
        }
    };
    
    try {
        const saved = localStorage.getItem('notification_settings');
        return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    } catch {
        return defaultSettings;
    }
}

// Update notification settings
export function updateNotificationSettings(settings) {
    try {
        const current = getNotificationSettings();
        const updated = { ...current, ...settings };
        localStorage.setItem('notification_settings', JSON.stringify(updated));
        return updated;
    } catch (error) {
        console.error('Error updating notification settings:', error);
        return getNotificationSettings();
    }
}

// Specialized notification functions
export function showOrderNotification(title, message, orderId, type = 'info') {
    return showNotification(title, message, type, {
        tag: `order-${orderId}`,
        data: { orderId, type: 'order_update' },
        persistent: true,
        actions: [
            {
                id: 'view',
                label: 'Xem đơn hàng',
                callback: () => {
                    window.location.hash = `#order-${orderId}`;
                }
            }
        ]
    });
}

export function showPromotionNotification(title, message, promotionId) {
    return showNotification(title, message, 'info', {
        tag: `promotion-${promotionId}`,
        data: { promotionId, type: 'promotion' },
        persistent: true,
        duration: 8000,
        actions: [
            {
                id: 'view',
                label: 'Xem khuyến mãi',
                callback: () => {
                    window.location.hash = '#promotions';
                }
            }
        ]
    });
}

export function showChatNotification(title, message, conversationId) {
    return showNotification(title, message, 'info', {
        tag: `chat-${conversationId}`,
        data: { conversationId, type: 'chat' },
        persistent: true,
        actions: [
            {
                id: 'reply',
                label: 'Trả lời',
                callback: () => {
                    document.getElementById('chatToggle')?.click();
                }
            }
        ]
    });
}

export function showSystemNotification(title, message, type = 'info') {
    return showNotification(title, message, type, {
        tag: 'system',
        data: { type: 'system' },
        persistent: false
    });
}

// Toast notifications (simple, temporary)
export function showToast(message, type = 'info', duration = 3000) {
    return showNotification('', message, type, {
        duration,
        clickToDismiss: true,
        className: `toast ${type}`
    });
}

// Loading notifications with progress
export function showLoadingNotification(title, message = 'Đang xử lý...') {
    return showNotification(title, message, 'info', {
        duration: 0, // Don't auto-dismiss
        icon: '<div class="loading-spinner"></div>',
        className: 'loading',
        clickToDismiss: false
    });
}

// Update loading notification
export function updateLoadingNotification(id, message, progress = null) {
    const notification = activeNotifications.get(id);
    if (!notification) return;
    
    const messageElement = notification.element.querySelector('.notification-message');
    if (messageElement) {
        messageElement.textContent = message;
    }
    
    if (progress !== null) {
        let progressBar = notification.element.querySelector('.loading-progress');
        if (!progressBar) {
            progressBar = document.createElement('div');
            progressBar.className = 'loading-progress';
            progressBar.innerHTML = '<div class="loading-progress-bar"></div>';
            notification.element.appendChild(progressBar);
        }
        
        const progressBarFill = progressBar.querySelector('.loading-progress-bar');
        progressBarFill.style.width = `${Math.max(0, Math.min(100, progress))}%`;
    }
}

// Batch notifications for related events
export function showBatchNotification(title, items, type = 'info') {
    const message = items.length > 1 ? 
        `${items.length} items` : 
        items[0];
    
    return showNotification(title, message, type, {
        data: { batch: true, items },
        actions: items.length > 1 ? [
            {
                id: 'expand',
                label: 'Xem chi tiết',
                callback: (notification) => {
                    // Show detailed list
                    showNotification(
                        title,
                        items.map((item, i) => `${i + 1}. ${item}`).join('\n'),
                        type,
                        { duration: 10000 }
                    );
                }
            }
        ] : undefined
    });
}

// Confirmation notifications with actions
export function showConfirmationNotification(title, message, onConfirm, onCancel = null) {
    return showNotification(title, message, 'warning', {
        duration: 0, // Don't auto-dismiss
        actions: [
            {
                id: 'confirm',
                label: 'Xác nhận',
                callback: (notification) => {
                    if (onConfirm) onConfirm();
                }
            },
            {
                id: 'cancel',
                label: 'Hủy',
                callback: (notification) => {
                    if (onCancel) onCancel();
                }
            }
        ]
    });
}

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export all functions
export default {
    initializeNotifications,
    showNotification,
    dismissNotification,
    dismissAllNotifications,
    updateNotificationSettings,
    showOrderNotification,
    showPromotionNotification,
    showChatNotification,
    showSystemNotification,
    showToast,
    showLoadingNotification,
    updateLoadingNotification,
    showBatchNotification,
    showConfirmationNotification
};
