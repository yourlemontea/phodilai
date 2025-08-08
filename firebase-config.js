// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, connectFirestoreEmulator } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCgJYCKOeHmh57ro5vQ4JWJX-szldH-UeA",
    authDomain: "pdlvt-9aae7.firebaseapp.com",
    projectId: "pdlvt-9aae7",
    storageBucket: "pdlvt-9aae7.firebasestorage.app",
    messagingSenderId: "373888053638",
    appId: "1:373888053638:web:e50174ab1ab789bfe53c07",
    measurementId: "G-25P00B0M3Q"
};

// VAPID key for FCM
const vapidKey = "BJXPaiZL-lYNsbU_u59EnHXFq4o6eb2QvaNpNGVzY9NxhUNhLJmMFN46iuXPJNyFIfWOroXYblJ4HiClDoUA6ic";

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Messaging
let messaging = null;
try {
    if ('serviceWorker' in navigator && 'Notification' in window) {
        messaging = getMessaging(app);
    }
} catch (error) {
    console.warn('Firebase Messaging not supported:', error);
}

export { messaging, vapidKey };

// Utility functions for error handling and logging
export const handleFirebaseError = (error, context = '') => {
    console.error(`Firebase Error ${context}:`, error);
    
    // User-friendly error messages
    const errorMessages = {
        'permission-denied': 'Bạn không có quyền thực hiện thao tác này.',
        'unavailable': 'Dịch vụ tạm thời không khả dụng. Vui lòng thử lại.',
        'network-request-failed': 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet.',
        'quota-exceeded': 'Đã vượt quá giới hạn sử dụng. Vui lòng thử lại sau.',
        'internal': 'Lỗi hệ thống nội bộ. Vui lòng thử lại sau.',
        'invalid-argument': 'Dữ liệu không hợp lệ.',
        'not-found': 'Không tìm thấy dữ liệu yêu cầu.',
        'already-exists': 'Dữ liệu đã tồn tại.',
        'cancelled': 'Thao tác đã bị hủy.',
        'deadline-exceeded': 'Thao tác mất quá nhiều thời gian. Vui lòng thử lại.',
        'resource-exhausted': 'Tài nguyên đã cạn kiệt. Vui lòng thử lại sau.',
        'failed-precondition': 'Điều kiện thực hiện không đáp ứng.',
        'aborted': 'Thao tác đã bị hủy bỏ.',
        'out-of-range': 'Giá trị nằm ngoài phạm vi cho phép.',
        'unimplemented': 'Tính năng chưa được triển khai.',
        'data-loss': 'Mất dữ liệu. Vui lòng liên hệ hỗ trợ.'
    };
    
    return errorMessages[error.code] || 'Đã có lỗi xảy ra. Vui lòng thử lại.';
};

// Firebase connection status
export const checkFirebaseConnection = async () => {
    try {
        const testRef = doc(db, 'test', 'connection');
        await getDoc(testRef);
        return true;
    } catch (error) {
        console.error('Firebase connection test failed:', error);
        return false;
    }
};

// Initialize Firebase with error handling
export const initializeFirebaseServices = async () => {
    try {
        // Test Firebase connection
        const isConnected = await checkFirebaseConnection();
        if (!isConnected) {
            throw new Error('Cannot connect to Firebase');
        }
        
        console.log('✅ Firebase services initialized successfully');
        return true;
    } catch (error) {
        console.error('❌ Firebase initialization failed:', error);
        return false;
    }
};

// Export app for other modules that might need it
export { app };
