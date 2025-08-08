// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
firebase.initializeApp({
    apiKey: "AIzaSyCgJYCKOeHmh57ro5vQ4JWJX-szldH-UeA",
    authDomain: "pdlvt-9aae7.firebaseapp.com",
    projectId: "pdlvt-9aae7",
    storageBucket: "pdlvt-9aae7.firebasestorage.app",
    messagingSenderId: "373888053638",
    appId: "1:373888053638:web:e50174ab1ab789bfe53c07",
    measurementId: "G-25P00B0M3Q"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function(payload) {
    console.log('[firebase-messaging-sw.js] Received background message:', payload);
    
    const { title, body, icon, data } = payload.notification || {};
    const customData = payload.data || {};
    
    // Customize notification based on type
    let notificationTitle = title || 'PHỐ ĐI LẠI LÝ NHÂN';
    let notificationOptions = {
        body: body || 'Bạn có thông báo mới',
        icon: icon || '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: customData.orderId || customData.type || 'general',
        requireInteraction: true,
        data: customData,
        actions: []
    };

    // Add different actions based on notification type
    switch (customData.type) {
        case 'new_order':
            notificationTitle = '🔔 Đơn hàng mới!';
            notificationOptions.body = `Đơn hàng #${customData.orderId} vừa được tạo`;
            notificationOptions.actions = [
                {
                    action: 'view_order',
                    title: 'Xem đơn hàng',
                    icon: '/icons/view-icon.png'
                },
                {
                    action: 'dismiss',
                    title: 'Đóng',
                    icon: '/icons/close-icon.png'
                }
            ];
            break;
            
        case 'order_status_update':
            notificationTitle = '📦 Cập nhật đơn hàng';
            notificationOptions.body = `Đơn hàng #${customData.orderId} đã ${customData.status}`;
            notificationOptions.actions = [
                {
                    action: 'track_order',
                    title: 'Theo dõi',
                    icon: '/icons/track-icon.png'
                }
            ];
            break;
            
        case 'promotion':
            notificationTitle = '🎉 Khuyến mãi mới!';
            notificationOptions.body = customData.promotionText || 'Có ưu đãi đặc biệt dành cho bạn';
            notificationOptions.actions = [
                {
                    action: 'view_promotion',
                    title: 'Xem ngay',
                    icon: '/icons/gift-icon.png'
                }
            ];
            break;
            
        case 'chat_message':
            notificationTitle = '💬 Tin nhắn mới';
            notificationOptions.body = `Hỗ trợ: ${body}`;
            notificationOptions.actions = [
                {
                    action: 'open_chat',
                    title: 'Trả lời',
                    icon: '/icons/chat-icon.png'
                }
            ];
            break;
            
        case 'feedback_request':
            notificationTitle = '⭐ Đánh giá dịch vụ';
            notificationOptions.body = 'Hãy chia sẻ trải nghiệm của bạn với chúng tôi';
            notificationOptions.actions = [
                {
                    action: 'give_feedback',
                    title: 'Đánh giá',
                    icon: '/icons/star-icon.png'
                }
            ];
            break;
    }

    // Show notification
    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click events
self.addEventListener('notificationclick', function(event) {
    console.log('[firebase-messaging-sw.js] Notification click received.');
    
    event.notification.close();
    
    const data = event.notification.data || {};
    const action = event.action;
    
    // Handle different actions
    let url = '/';
    
    switch (action) {
        case 'view_order':
        case 'track_order':
            if (data.orderId) {
                url = `/admin.html#order-${data.orderId}`;
            } else {
                url = '/admin.html#orders';
            }
            break;
            
        case 'view_promotion':
            url = '/#promotions';
            break;
            
        case 'open_chat':
            url = '/#chat';
            break;
            
        case 'give_feedback':
            url = '/#feedback';
            break;
            
        case 'dismiss':
            return; // Don't open any URL
            
        default:
            // Default click behavior
            if (data.url) {
                url = data.url;
            } else if (data.orderId) {
                url = `/admin.html#order-${data.orderId}`;
            }
    }
    
    // Open or focus the target URL
    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then(function(clientList) {
            // Check if the target URL is already open
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                const clientUrl = new URL(client.url);
                const targetUrl = new URL(url, self.location.origin);
                
                if (clientUrl.origin === targetUrl.origin) {
                    // Focus existing window and navigate to target
                    return client.focus().then(() => {
                        if (client.navigate) {
                            return client.navigate(targetUrl.href);
                        } else {
                            // Fallback: post message to client
                            return client.postMessage({
                                type: 'NAVIGATE',
                                url: targetUrl.href,
                                data: data
                            });
                        }
                    });
                }
            }
            
            // Open new window
            return clients.openWindow(url);
        })
    );
});

// Handle push events (for custom push notifications)
self.addEventListener('push', function(event) {
    console.log('[firebase-messaging-sw.js] Push event received:', event);
    
    if (event.data) {
        try {
            const payload = event.data.json();
            const { title, body, icon, data } = payload;
            
            const notificationOptions = {
                body: body,
                icon: icon || '/icons/icon-192.png',
                badge: '/icons/icon-192.png',
                data: data,
                requireInteraction: true
            };
            
            event.waitUntil(
                self.registration.showNotification(title, notificationOptions)
            );
        } catch (error) {
            console.error('[firebase-messaging-sw.js] Error parsing push data:', error);
        }
    }
});

// Cache management for offline support
const CACHE_NAME = 'pho-di-lai-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/admin.html',
    '/style.css',
    '/script-client.js',
    '/script-admin.js',
    '/firebase-config.js',
    '/firebase-messaging.js',
    '/notifications.js',
    '/translations.js',
    '/analytics.js',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png'
];

// Install event - cache resources
self.addEventListener('install', function(event) {
    console.log('[firebase-messaging-sw.js] Install event');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                console.log('[firebase-messaging-sw.js] Caching resources');
                return cache.addAll(urlsToCache.map(url => new Request(url, {
                    credentials: 'same-origin'
                })));
            })
            .catch(function(error) {
                console.error('[firebase-messaging-sw.js] Cache install failed:', error);
            })
    );
    
    // Skip waiting to activate immediately
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', function(event) {
    console.log('[firebase-messaging-sw.js] Activate event');
    
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[firebase-messaging-sw.js] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(function() {
            // Claim all clients
            return self.clients.claim();
        })
    );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', function(event) {
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }
    
    // Skip Firebase and external URLs
    const url = new URL(event.request.url);
    if (!url.origin.includes(self.location.origin) && 
        !url.hostname.includes('googleapis.com')) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then(function(response) {
                // Return cached version or fetch from network
                if (response) {
                    return response;
                }
                
                return fetch(event.request).then(function(response) {
                    // Don't cache if not a valid response
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    
                    // Clone the response
                    const responseToCache = response.clone();
                    
                    caches.open(CACHE_NAME)
                        .then(function(cache) {
                            cache.put(event.request, responseToCache);
                        });
                    
                    return response;
                });
            })
            .catch(function() {
                // Return offline fallback for navigation requests
                if (event.request.destination === 'document') {
                    return caches.match('/index.html');
                }
            })
    );
});

// Message handling from client
self.addEventListener('message', function(event) {
    console.log('[firebase-messaging-sw.js] Message received:', event.data);
    
    switch (event.data.type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'GET_VERSION':
            event.ports[0].postMessage({
                type: 'VERSION',
                version: CACHE_NAME
            });
            break;
            
        case 'CACHE_UPDATE':
            // Force cache update
            event.waitUntil(
                caches.open(CACHE_NAME).then(cache => {
                    return cache.addAll(urlsToCache);
                })
            );
            break;
    }
});

// Sync event for background sync
self.addEventListener('sync', function(event) {
    console.log('[firebase-messaging-sw.js] Background sync:', event.tag);
    
    if (event.tag === 'background-sync') {
        event.waitUntil(
            // Perform background tasks like syncing offline orders
            syncOfflineData()
        );
    }
});

// Function to sync offline data
async function syncOfflineData() {
    try {
        // Get offline orders from IndexedDB or localStorage
        const offlineOrders = JSON.parse(localStorage.getItem('offline_orders') || '[]');
        
        if (offlineOrders.length > 0) {
            console.log('[firebase-messaging-sw.js] Syncing offline orders:', offlineOrders.length);
            
            // Send offline orders to main app for processing
            const clients = await self.clients.matchAll();
            clients.forEach(client => {
                client.postMessage({
                    type: 'SYNC_OFFLINE_ORDERS',
                    orders: offlineOrders
                });
            });
        }
    } catch (error) {
        console.error('[firebase-messaging-sw.js] Error syncing offline data:', error);
    }
}

