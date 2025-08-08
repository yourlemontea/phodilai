// sw.js - Service Worker for PWA functionality
const CACHE_NAME = 'pho-di-lai-v1.0.0';
const STATIC_CACHE = `${CACHE_NAME}-static`;
const DYNAMIC_CACHE = `${CACHE_NAME}-dynamic`;
const OFFLINE_PAGE = '/offline.html';

// Files to cache immediately
const STATIC_ASSETS = [
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
    // Add placeholder icons (in real app these would exist)
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    // External dependencies that we want to cache
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Nunito:wght@300;400;600;700;800&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Dynamic assets that should be cached on request
const DYNAMIC_ASSETS_PATTERNS = [
    /^https:\/\/www\.gstatic\.com\/firebasejs\//,
    /^https:\/\/fonts\.googleapis\.com\//,
    /^https:\/\/fonts\.gstatic\.com\//,
    /^https:\/\/cdnjs\.cloudflare\.com\//,
    /^https:\/\/cdn\.jsdelivr\.net\//,
    /\.(jpg|jpeg|png|gif|webp|svg)$/i
];

// Network-first resources (always try network first)
const NETWORK_FIRST_PATTERNS = [
    /^https:\/\/.*\.googleapis\.com\/firestore\//,
    /^https:\/\/.*\.googleapis\.com\/.*\/messaging\//,
    /\/api\//
];

// Install event - cache static assets
self.addEventListener('install', event => {
    console.log('[SW] Install event');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS.map(url => {
                    return new Request(url, { 
                        credentials: 'same-origin',
                        mode: 'cors'
                    });
                }));
            })
            .then(() => {
                console.log('[SW] Static assets cached successfully');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('[SW] Failed to cache static assets:', error);
                // Continue even if some assets fail to cache
                return self.skipWaiting();
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('[SW] Activate event');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                const deletePromises = cacheNames
                    .filter(cacheName => {
                        return cacheName.startsWith('pho-di-lai-') && cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE;
                    })
                    .map(cacheName => {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    });
                
                return Promise.all(deletePromises);
            })
            .then(() => {
                console.log('[SW] Service Worker activated');
                return self.clients.claim();
            })
    );
});

// Fetch event - handle network requests
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip chrome-extension and other non-http(s) requests
    if (!url.protocol.startsWith('http')) {
        return;
    }
    
    // Handle different types of requests
    if (isNetworkFirstResource(request.url)) {
        event.respondWith(networkFirst(request));
    } else if (isStaticAsset(request.url)) {
        event.respondWith(cacheFirst(request));
    } else if (isDynamicAsset(request.url)) {
        event.respondWith(staleWhileRevalidate(request));
    } else {
        event.respondWith(networkFirst(request));
    }
});

// Network-first strategy (for API calls, Firebase, etc.)
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        
        // Cache successful responses for future offline use
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('[SW] Network failed for:', request.url);
        
        // Try to serve from cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // If it's a navigation request and we have no cached version, serve offline page
        if (request.destination === 'document') {
            const offlineResponse = await caches.match(OFFLINE_PAGE);
            if (offlineResponse) {
                return offlineResponse;
            }
            
            // Fallback offline response
            return new Response(`
                <!DOCTYPE html>
                <html lang="vi">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Không có kết nối</title>
                    <style>
                        body { 
                            font-family: Arial, sans-serif; 
                            text-align: center; 
                            padding: 50px; 
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                            margin: 0;
                            min-height: 100vh;
                            display: flex;
                            flex-direction: column;
                            justify-content: center;
                        }
                        .offline-icon { font-size: 4rem; margin-bottom: 20px; }
                        h1 { margin-bottom: 20px; }
                        .retry-btn { 
                            background: white; 
                            color: #667eea; 
                            border: none; 
                            padding: 15px 30px; 
                            border-radius: 25px; 
                            font-size: 16px; 
                            font-weight: bold;
                            cursor: pointer;
                            margin-top: 20px;
                        }
                        .retry-btn:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.2); }
                    </style>
                </head>
                <body>
                    <div class="offline-icon">☕</div>
                    <h1>Không có kết nối internet</h1>
                    <p>Vui lòng kiểm tra kết nối mạng và thử lại</p>
                    <button class="retry-btn" onclick="window.location.reload()">Thử lại</button>
                </body>
                </html>
            `, {
                headers: { 'Content-Type': 'text/html' }
            });
        }
        
        throw error;
    }
}

// Cache-first strategy (for static assets)
async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        const cache = await caches.open(STATIC_CACHE);
        cache.put(request, networkResponse.clone());
        return networkResponse;
    } catch (error) {
        console.error('[SW] Failed to fetch static asset:', request.url, error);
        throw error;
    }
}

// Stale-while-revalidate strategy (for dynamic content)
async function staleWhileRevalidate(request) {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    // Fetch from network in background
    const networkResponsePromise = fetch(request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    }).catch(error => {
        console.log('[SW] Network fetch failed in stale-while-revalidate:', error);
        return null;
    });
    
    // Return cached version immediately if available, otherwise wait for network
    return cachedResponse || await networkResponsePromise;
}

// Helper functions to determine caching strategy
function isNetworkFirstResource(url) {
    return NETWORK_FIRST_PATTERNS.some(pattern => pattern.test(url));
}

function isStaticAsset(url) {
    return STATIC_ASSETS.includes(url) || 
           url.endsWith('.css') || 
           url.endsWith('.js') && !url.includes('firebase');
}

function isDynamicAsset(url) {
    return DYNAMIC_ASSETS_PATTERNS.some(pattern => pattern.test(url));
}

// Background sync for offline orders
self.addEventListener('sync', event => {
    console.log('[SW] Background sync:', event.tag);
    
    if (event.tag === 'sync-offline-orders') {
        event.waitUntil(syncOfflineOrders());
    } else if (event.tag === 'sync-feedback') {
        event.waitUntil(syncOfflineFeedback());
    }
});

// Sync offline orders when connection is restored
async function syncOfflineOrders() {
    try {
        const offlineOrders = await getOfflineOrders();
        
        if (offlineOrders.length === 0) {
            return;
        }
        
        console.log('[SW] Syncing offline orders:', offlineOrders.length);
        
        // Send message to main app to handle sync
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'SYNC_OFFLINE_ORDERS',
                orders: offlineOrders
            });
        });
        
        // Clear offline orders after successful sync
        await clearOfflineOrders();
        
    } catch (error) {
        console.error('[SW] Error syncing offline orders:', error);
        throw error;
    }
}

// Sync offline feedback
async function syncOfflineFeedback() {
    try {
        const offlineFeedback = await getOfflineFeedback();
        
        if (offlineFeedback.length === 0) {
            return;
        }
        
        console.log('[SW] Syncing offline feedback:', offlineFeedback.length);
        
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'SYNC_OFFLINE_FEEDBACK',
                feedback: offlineFeedback
            });
        });
        
        await clearOfflineFeedback();
        
    } catch (error) {
        console.error('[SW] Error syncing offline feedback:', error);
        throw error;
    }
}

// IndexedDB helpers for offline storage
async function getOfflineOrders() {
    try {
        const stored = localStorage.getItem('offline_orders');
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('[SW] Error getting offline orders:', error);
        return [];
    }
}

async function clearOfflineOrders() {
    try {
        localStorage.removeItem('offline_orders');
    } catch (error) {
        console.error('[SW] Error clearing offline orders:', error);
    }
}

async function getOfflineFeedback() {
    try {
        const stored = localStorage.getItem('offline_feedback');
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('[SW] Error getting offline feedback:', error);
        return [];
    }
}

async function clearOfflineFeedback() {
    try {
        localStorage.removeItem('offline_feedback');
    } catch (error) {
        console.error('[SW] Error clearing offline feedback:', error);
    }
}

// Push notification handler
self.addEventListener('push', event => {
    console.log('[SW] Push event received:', event);
    
    let notificationData = {
        title: 'PHỐ ĐI LẠI LÝ NHÂN',
        body: 'Bạn có thông báo mới',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: 'general',
        requireInteraction: true,
        actions: [
            {
                action: 'view',
                title: 'Xem',
                icon: '/icons/view-icon.png'
            },
            {
                action: 'dismiss',
                title: 'Đóng',
                icon: '/icons/close-icon.png'
            }
        ]
    };
    
    if (event.data) {
        try {
            const pushData = event.data.json();
            notificationData = { ...notificationData, ...pushData };
        } catch (error) {
            console.error('[SW] Error parsing push data:', error);
        }
    }
    
    event.waitUntil(
        self.registration.showNotification(notificationData.title, notificationData)
    );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
    console.log('[SW] Notification clicked:', event);
    
    event.notification.close();
    
    const action = event.action;
    const data = event.notification.data || {};
    
    if (action === 'dismiss') {
        return;
    }
    
    // Determine URL to open
    let urlToOpen = '/';
    
    if (action === 'view' || !action) {
        if (data.url) {
            urlToOpen = data.url;
        } else if (data.orderId) {
            urlToOpen = `/admin.html#order-${data.orderId}`;
        } else if (data.type === 'promotion') {
            urlToOpen = '/#promotions';
        } else if (data.type === 'chat') {
            urlToOpen = '/#chat';
        }
    }
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(clientList => {
                // Check if app is already open
                for (const client of clientList) {
                    const clientUrl = new URL(client.url);
                    const targetUrl = new URL(urlToOpen, self.location.origin);
                    
                    if (clientUrl.origin === targetUrl.origin) {
                        // Focus existing window and navigate
                        return client.focus().then(() => {
                            return client.postMessage({
                                type: 'NAVIGATE',
                                url: urlToOpen,
                                data: data
                            });
                        });
                    }
                }
                
                // Open new window
                return clients.openWindow(urlToOpen);
            })
    );
});

// Message handler from main app
self.addEventListener('message', event => {
    console.log('[SW] Message received:', event.data);
    
    const { type, payload } = event.data;
    
    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'STORE_OFFLINE_ORDER':
            storeOfflineOrder(payload);
            break;
            
        case 'STORE_OFFLINE_FEEDBACK':
            storeOfflineFeedback(payload);
            break;
            
        case 'CLEAR_CACHE':
            clearAllCaches();
            break;
            
        case 'GET_CACHE_STATUS':
            getCacheStatus().then(status => {
                event.ports[0].postMessage(status);
            });
            break;
            
        case 'UPDATE_CACHE':
            updateCache();
            break;
    }
});

// Store offline order
async function storeOfflineOrder(orderData) {
    try {
        const orders = await getOfflineOrders();
        orders.push({
            ...orderData,
            offlineTimestamp: Date.now()
        });
        localStorage.setItem('offline_orders', JSON.stringify(orders));
        
        // Register for background sync
        await self.registration.sync.register('sync-offline-orders');
        
    } catch (error) {
        console.error('[SW] Error storing offline order:', error);
    }
}

// Store offline feedback
async function storeOfflineFeedback(feedbackData) {
    try {
        const feedback = await getOfflineFeedback();
        feedback.push({
            ...feedbackData,
            offlineTimestamp: Date.now()
        });
        localStorage.setItem('offline_feedback', JSON.stringify(feedback));
        
        // Register for background sync
        await self.registration.sync.register('sync-feedback');
        
    } catch (error) {
        console.error('[SW] Error storing offline feedback:', error);
    }
}

// Clear all caches
async function clearAllCaches() {
    try {
        const cacheNames = await caches.keys();
        await Promise.all(
            cacheNames.map(cacheName => caches.delete(cacheName))
        );
        console.log('[SW] All caches cleared');
    } catch (error) {
        console.error('[SW] Error clearing caches:', error);
    }
}

// Get cache status
async function getCacheStatus() {
    try {
        const cacheNames = await caches.keys();
        const status = {
            caches: cacheNames,
            staticCache: await caches.has(STATIC_CACHE),
            dynamicCache: await caches.has(DYNAMIC_CACHE),
            version: CACHE_NAME
        };
        
        if (await caches.has(STATIC_CACHE)) {
            const staticCache = await caches.open(STATIC_CACHE);
            const staticKeys = await staticCache.keys();
            status.staticAssets = staticKeys.length;
        }
        
        if (await caches.has(DYNAMIC_CACHE)) {
            const dynamicCache = await caches.open(DYNAMIC_CACHE);
            const dynamicKeys = await dynamicCache.keys();
            status.dynamicAssets = dynamicKeys.length;
        }
        
        return status;
    } catch (error) {
        console.error('[SW] Error getting cache status:', error);
        return { error: error.message };
    }
}

// Update cache with new assets
async function updateCache() {
    try {
        console.log('[SW] Updating cache...');
        
        const cache = await caches.open(STATIC_CACHE);
        
        // Try to update each static asset
        const updatePromises = STATIC_ASSETS.map(async (url) => {
            try {
                const response = await fetch(url);
                if (response && response.status === 200) {
                    await cache.put(url, response);
                    console.log(`[SW] Updated cache for: ${url}`);
                }
            } catch (error) {
                console.warn(`[SW] Failed to update cache for: ${url}`, error);
            }
        });
        
        await Promise.allSettled(updatePromises);
        console.log('[SW] Cache update completed');
        
    } catch (error) {
        console.error('[SW] Error updating cache:', error);
    }
}

// Periodic cache cleanup (runs when SW becomes idle)
self.addEventListener('idle', event => {
    event.waitUntil(cleanupCache());
});

async function cleanupCache() {
    try {
        const dynamicCache = await caches.open(DYNAMIC_CACHE);
        const keys = await dynamicCache.keys();
        
        // Remove old entries if cache is too large
        if (keys.length > 100) {
            const oldKeys = keys.slice(0, keys.length - 100);
            await Promise.all(oldKeys.map(key => dynamicCache.delete(key)));
            console.log(`[SW] Cleaned up ${oldKeys.length} old cache entries`);
        }
    } catch (error) {
        console.error('[SW] Error during cache cleanup:', error);
    }
}

// Error handler
self.addEventListener('error', event => {
    console.error('[SW] Service Worker error:', event.error);
    
    // Report critical errors to clients
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({
                type: 'SW_ERROR',
                error: {
                    message: event.error?.message || 'Unknown service worker error',
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno
                }
            });
        });
    });
});

// Unhandled promise rejection handler
self.addEventListener('unhandledrejection', event => {
    console.error('[SW] Unhandled promise rejection:', event.reason);
    
    // Prevent the default handling
    event.preventDefault();
    
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({
                type: 'SW_UNHANDLED_REJECTION',
                reason: event.reason?.message || 'Unknown error'
            });
        });
    });
});

console.log(`[SW] Service Worker loaded - Version ${CACHE_NAME}`);
