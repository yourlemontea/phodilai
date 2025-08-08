// firebase-messaging.js
import { messaging, vapidKey, handleFirebaseError } from './firebase-config.js';
import { getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";
import { showNotification } from './notifications.js';

class FirebaseMessagingService {
    constructor() {
        this.token = null;
        this.isSupported = this.checkSupport();
        this.init();
    }

    checkSupport() {
        return !!(
            'serviceWorker' in navigator &&
            'Notification' in window &&
            'PushManager' in window &&
            messaging
        );
    }

    async init() {
        if (!this.isSupported) {
            console.warn('⚠️ Firebase Messaging not supported in this browser');
            return;
        }

        try {
            await this.requestPermission();
            await this.setupMessageListener();
            console.log('✅ Firebase Messaging initialized successfully');
        } catch (error) {
            console.error('❌ Firebase Messaging initialization failed:', error);
        }
    }

    async requestPermission() {
        try {
            const permission = await Notification.requestPermission();
            
            if (permission === 'granted') {
                console.log('✅ Notification permission granted');
                await this.getRegistrationToken();
                return true;
            } else if (permission === 'denied') {
                console.log('❌ Notification permission denied');
                showNotification('Thông báo bị từ chối', 'Bạn sẽ không nhận được thông báo đơn hàng mới.', 'warning');
                return false;
            } else {
                console.log('⚠️ Notification permission dismissed');
                return false;
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            return false;
        }
    }

    async getRegistrationToken() {
        try {
            // Register service worker first
            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            console.log('✅ Service Worker registered:', registration);

            // Wait for service worker to be ready
            await navigator.serviceWorker.ready;

            // Get FCM token
            this.token = await getToken(messaging, { 
                vapidKey: vapidKey,
                serviceWorkerRegistration: registration
            });

            if (this.token) {
                console.log('🔑 FCM Registration token:', this.token);
                
                // Store token in localStorage for potential server registration
                localStorage.setItem('fcm_token', this.token);
                
                // You can send this token to your server to store it
                await this.sendTokenToServer(this.token);
                
                return this.token;
            } else {
                console.log('⚠️ No registration token available');
                return null;
            }
        } catch (error) {
            console.error('❌ Error getting registration token:', error);
            const friendlyError = handleFirebaseError(error, 'getting FCM token');
            showNotification('Lỗi thiết lập thông báo', friendlyError, 'error');
            return null;
        }
    }

    async sendTokenToServer(token) {
        try {
            // In a real app, you would send this to your backend server
            // For now, we'll just store it locally
            const tokenData = {
                token: token,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                userId: localStorage.getItem('user_id') || 'anonymous'
            };
            
            localStorage.setItem('fcm_token_data', JSON.stringify(tokenData));
            console.log('📝 Token stored locally');
        } catch (error) {
            console.error('Error storing token:', error);
        }
    }

    setupMessageListener() {
        if (!messaging) return;

        // Handle foreground messages
        onMessage(messaging, (payload) => {
            console.log('📥 Foreground message received:', payload);
            
            const { title, body, icon, data } = payload.notification || {};
            const customData = payload.data || {};
            
            // Show custom notification
            this.showCustomNotification(title, body, icon, customData);
            
            // Play notification sound
            this.playNotificationSound();
            
            // Handle specific notification types
            this.handleNotificationAction(customData);
        });
    }

    showCustomNotification(title, body, icon, data) {
        // Use our custom notification system
        showNotification(
            title || 'Thông báo mới',
            body || 'Bạn có thông báo mới',
            data.type || 'info'
        );

        // Also show browser notification if permission granted
        if (Notification.permission === 'granted') {
            const notification = new Notification(title, {
                body: body,
                icon: icon || '/icons/icon-192.png',
                badge: '/icons/icon-192.png',
                tag: data.orderId || 'general',
                requireInteraction: true,
                data: data
            });

            notification.onclick = () => {
                window.focus();
                notification.close();
                
                // Handle notification click
                if (data.action) {
                    this.handleNotificationClick(data);
                }
            };

            // Auto close after 10 seconds
            setTimeout(() => {
                notification.close();
            }, 10000);
        }
    }

    handleNotificationAction(data) {
        switch (data.type) {
            case 'new_order':
                // Trigger order refresh or navigation
                window.dispatchEvent(new CustomEvent('newOrder', { detail: data }));
                break;
            case 'order_status_update':
                // Update order status in UI
                window.dispatchEvent(new CustomEvent('orderStatusUpdate', { detail: data }));
                break;
            case 'promotion':
                // Show promotion modal or navigate to promotions
                window.dispatchEvent(new CustomEvent('newPromotion', { detail: data }));
                break;
            case 'chat_message':
                // Show chat notification
                window.dispatchEvent(new CustomEvent('newChatMessage', { detail: data }));
                break;
            default:
                console.log('Unknown notification type:', data.type);
        }
    }

    handleNotificationClick(data) {
        switch (data.action) {
            case 'view_order':
                if (data.orderId) {
                    // Navigate to order details
                    window.location.hash = `#order-${data.orderId}`;
                }
                break;
            case 'open_chat':
                // Open chat widget
                document.getElementById('chatToggle')?.click();
                break;
            case 'view_menu':
                // Scroll to menu section
                document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' });
                break;
            default:
                console.log('Unknown notification action:', data.action);
        }
    }

    playNotificationSound() {
        try {
            // Create audio context for better browser support
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create a simple notification tone
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (error) {
            console.warn('Could not play notification sound:', error);
        }
    }

    async updateToken() {
        if (!this.isSupported) return null;
        
        try {
            await this.getRegistrationToken();
            return this.token;
        } catch (error) {
            console.error('Error updating FCM token:', error);
            return null;
        }
    }

    async deleteToken() {
        try {
            if (messaging && this.token) {
                await deleteToken(messaging);
                localStorage.removeItem('fcm_token');
                localStorage.removeItem('fcm_token_data');
                this.token = null;
                console.log('✅ FCM token deleted');
            }
        } catch (error) {
            console.error('Error deleting FCM token:', error);
        }
    }

    getStoredToken() {
        return localStorage.getItem('fcm_token');
    }

    isPermissionGranted() {
        return Notification.permission === 'granted';
    }

    // Send test notification (for testing purposes)
    async sendTestNotification() {
        if (!this.token) {
            console.warn('No FCM token available for test notification');
            return;
        }

        // This would typically be called from your server
        // For testing, we'll just show a local notification
        this.showCustomNotification(
            'Thông báo thử nghiệm',
            'Hệ thống thông báo đang hoạt động bình thường',
            '/icons/icon-192.png',
            { type: 'test', action: 'view_menu' }
        );
    }
}

// Create global instance
const fcmService = new FirebaseMessagingService();

// Export for use in other modules
export default fcmService;
export { fcmService };

// Global event handlers for notification events
window.addEventListener('newOrder', (event) => {
    console.log('New order notification received:', event.detail);
    // Refresh orders in admin panel if open
    if (window.location.pathname.includes('admin')) {
        window.dispatchEvent(new CustomEvent('refreshOrders'));
    }
});

window.addEventListener('orderStatusUpdate', (event) => {
    console.log('Order status update received:', event.detail);
    // Update UI accordingly
    window.dispatchEvent(new CustomEvent('refreshOrderStatus', { detail: event.detail }));
});

window.addEventListener('newPromotion', (event) => {
    console.log('New promotion notification received:', event.detail);
    // Update promotions display
    window.dispatchEvent(new CustomEvent('refreshPromotions'));
});

window.addEventListener('newChatMessage', (event) => {
    console.log('New chat message received:', event.detail);
    // Show chat notification badge
    const chatToggle = document.getElementById('chatToggle');
    if (chatToggle && !document.getElementById('chatWindow').classList.contains('active')) {
        chatToggle.classList.add('has-new-message');
    }
});
