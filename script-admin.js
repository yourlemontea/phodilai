// script-admin.js
import { db, handleFirebaseError } from './firebase-config.js';
import { 
    collection, 
    onSnapshot, 
    doc, 
    updateDoc, 
    addDoc, 
    deleteDoc,
    query, 
    orderBy, 
    where, 
    limit,
    getDocs,
    Timestamp,
    writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { showNotification } from './notifications.js';
import { initializeAnalytics } from './analytics.js';
import fcmService from './firebase-messaging.js';

class AdminPanel {
    constructor() {
        this.orders = [];
        this.menuItems = [];
        this.promotions = [];
        this.feedback = [];
        this.categories = ['tea', 'coffee', 'smoothie', 'snacks'];
        this.currentSection = 'dashboard';
        this.analytics = null;
        
        this.initializeApp();
    }

    async initializeApp() {
        try {
            console.log('🚀 Initializing Admin Panel...');
            
            // Initialize theme
            this.initializeTheme();
            
            // Initialize navigation
            this.initializeNavigation();
            
            // Initialize event listeners
            this.initializeEventListeners();
            
            // Initialize Firebase listeners
            this.initializeFirebaseListeners();
            
            // Initialize analytics
            this.analytics = await initializeAnalytics();
            
            // Load initial data
            await this.loadInitialData();
            
            // Update dashboard
            this.updateDashboard();
            
            console.log('✅ Admin Panel initialized successfully');
            showNotification('Hệ thống sẵn sàng', 'Bảng điều khiển admin đã được tải', 'success');
            
        } catch (error) {
            console.error('❌ Admin Panel initialization failed:', error);
            showNotification('Lỗi khởi tạo', 'Có lỗi xảy ra khi khởi tạo hệ thống', 'error');
        }
    }

    initializeTheme() {
        const savedTheme = localStorage.getItem('admin_theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeToggle(savedTheme);
    }

    initializeNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('href').substring(1);
                this.switchSection(section);
            });
        });
    }

    switchSection(sectionName) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`a[href="#${sectionName}"]`)?.parentElement.classList.add('active');

        // Update content
        document.querySelectorAll('.admin-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(sectionName)?.classList.add('active');

        this.currentSection = sectionName;
        
        // Load section-specific data
        this.loadSectionData(sectionName);
    }

    async loadSectionData(section) {
        switch (section) {
            case 'dashboard':
                this.updateDashboard();
                break;
            case 'orders':
                this.renderOrders();
                break;
            case 'menu':
                this.renderMenuManagement();
                break;
            case 'analytics':
                this.renderAnalytics();
                break;
            case 'promotions':
                this.renderPromotions();
                break;
            case 'feedback':
                this.renderFeedback();
                break;
            case 'chat':
                this.renderChat();
                break;
            case 'settings':
                this.renderSettings();
                break;
        }
    }

    initializeEventListeners() {
        // Theme toggle
        document.getElementById('adminThemeToggle')?.addEventListener('click', () => {
            this.toggleTheme();
        });

        // Refresh data
        document.getElementById('refreshData')?.addEventListener('click', () => {
            this.refreshAllData();
        });

        // Export data
        document.getElementById('exportData')?.addEventListener('click', () => {
            this.exportData();
        });

        // Dashboard period filter
        document.getElementById('dashboardPeriod')?.addEventListener('change', (e) => {
            this.updateDashboard(e.target.value);
        });

        // Order tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchOrderTab(e.target.dataset.status);
            });
        });

        // Menu management
        document.getElementById('addMenuItem')?.addEventListener('click', () => {
            this.showMenuItemModal();
        });

        // Category management
        document.getElementById('addCategory')?.addEventListener('click', () => {
            this.addCategory();
        });

        // Promotion management
        document.getElementById('addPromotion')?.addEventListener('click', () => {
            this.showPromotionModal();
        });

        // Analytics controls
        document.getElementById('analyticsType')?.addEventListener('change', () => {
            this.updateAnalyticsChart();
        });
        document.getElementById('analyticsDate')?.addEventListener('change', () => {
            this.updateAnalyticsChart();
        });

        // Settings
        document.getElementById('saveSettings')?.addEventListener('click', () => {
            this.saveSettings();
        });
        document.getElementById('backupData')?.addEventListener('click', () => {
            this.backupData();
        });
        document.getElementById('restoreData')?.addEventListener('click', () => {
            this.showRestoreDialog();
        });

        // Modal events
        this.initializeModalEvents();

        // Print functionality
        document.getElementById('printOrders')?.addEventListener('click', () => {
            this.printOrders();
        });

        // Export reports
        document.getElementById('exportReport')?.addEventListener('click', () => {
            this.exportReport();
        });
    }

    initializeModalEvents() {
        // Menu item modal
        document.getElementById('closeMenuItemModal')?.addEventListener('click', () => {
            this.closeMenuItemModal();
        });
        document.getElementById('saveMenuItem')?.addEventListener('click', () => {
            this.saveMenuItem();
        });

        // Promotion modal
        document.getElementById('closePromotionModal')?.addEventListener('click', () => {
            this.closePromotionModal();
        });
        document.getElementById('savePromotion')?.addEventListener('click', () => {
            this.savePromotion();
        });

        // Close modals on backdrop click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeAllModals();
                }
            });
        });
    }

    async initializeFirebaseListeners() {
        try {
            // Listen to orders
            const ordersQuery = query(collection(db, "orders"), orderBy("createdAt", "desc"));
            onSnapshot(ordersQuery, (snapshot) => {
                this.orders = [];
                snapshot.forEach((doc) => {
                    this.orders.push({ id: doc.id, ...doc.data() });
                });
                this.renderOrders();
                this.updateDashboard();
                this.updateOrderCounts();
            });

            // Listen to feedback
            const feedbackQuery = query(collection(db, "feedback"), orderBy("createdAt", "desc"));
            onSnapshot(feedbackQuery, (snapshot) => {
                this.feedback = [];
                snapshot.forEach((doc) => {
                    this.feedback.push({ id: doc.id, ...doc.data() });
                });
                this.renderFeedback();
            });

            // Listen to promotions
            const promotionsQuery = query(collection(db, "promotions"), orderBy("createdAt", "desc"));
            onSnapshot(promotionsQuery, (snapshot) => {
                this.promotions = [];
                snapshot.forEach((doc) => {
                    this.promotions.push({ id: doc.id, ...doc.data() });
                });
                this.renderPromotions();
            });

        } catch (error) {
            console.error('Error setting up Firebase listeners:', error);
            showNotification('Lỗi kết nối', 'Không thể kết nối đến cơ sở dữ liệu', 'error');
        }
    }

    async loadInitialData() {
        try {
            // Load menu items if they don't exist in Firestore
            const menuSnapshot = await getDocs(collection(db, "menu"));
            if (menuSnapshot.empty) {
                await this.initializeDefaultMenu();
            } else {
                this.menuItems = [];
                menuSnapshot.forEach((doc) => {
                    this.menuItems.push({ id: doc.id, ...doc.data() });
                });
            }
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }

    async initializeDefaultMenu() {
        const defaultItems = [
            { name: 'Trà Đá', price: 5000, category: 'tea', description: 'Trà đá truyền thống, thơm mát, giải khát', available: true },
            { name: 'Trà Chanh', price: 10000, category: 'tea', description: 'Trà chanh tươi mát, chua ngọt hài hòa', available: true },
            { name: 'Cafe Nâu', price: 20000, category: 'coffee', description: 'Cà phê sữa đậm đà, thơm ngon', available: true },
            { name: 'Cafe Đen', price: 20000, category: 'coffee', description: 'Cà phê đen nguyên chất, đậm đà', available: true }
        ];

        const batch = writeBatch(db);
        defaultItems.forEach(item => {
            const docRef = doc(collection(db, "menu"));
            batch.set(docRef, { ...item, createdAt: Timestamp.now() });
        });

        await batch.commit();
        console.log('✅ Default menu items initialized');
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('admin_theme', newTheme);
        this.updateThemeToggle(newTheme);
        
        showNotification(
            'Đã đổi chế độ',
            `Chế độ ${newTheme === 'dark' ? 'tối' : 'sáng'} đã được bật`,
            'info'
        );
    }

    updateThemeToggle(theme) {
        const icon = document.querySelector('#adminThemeToggle i');
        if (icon) {
            icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }

    async refreshAllData() {
        try {
            showNotification('Đang tải lại...', 'Đang cập nhật dữ liệu mới nhất', 'info');
            
            // Refresh current section
            await this.loadSectionData(this.currentSection);
            
            showNotification('Đã cập nhật', 'Dữ liệu đã được làm mới', 'success');
        } catch (error) {
            console.error('Error refreshing data:', error);
            showNotification('Lỗi làm mới', 'Không thể cập nhật dữ liệu', 'error');
        }
    }

    // Dashboard Management
    updateDashboard(period = 'today') {
        this.updateStats(period);
        this.updateCharts(period);
    }

    updateStats(period) {
        const now = new Date();
        let startDate;

        switch (period) {
            case 'today':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        }

        const filteredOrders = this.orders.filter(order => {
            const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
            return orderDate >= startDate;
        });

        const totalOrders = filteredOrders.length;
        const totalRevenue = filteredOrders
            .filter(order => order.isPaid)
            .reduce((sum, order) => sum + (order.totalPrice || 0), 0);
        const pendingOrders = filteredOrders.filter(order => 
            order.status === 'Đang chờ xử lý' || order.status === 'Đang chuẩn bị'
        ).length;
        
        const avgRating = this.feedback.length > 0 
            ? (this.feedback.reduce((sum, f) => sum + f.rating, 0) / this.feedback.length).toFixed(1)
            : 0;

        // Update DOM
        this.updateStatElement('totalOrders', totalOrders);
        this.updateStatElement('totalRevenue', `${totalRevenue.toLocaleString('vi-VN')} VNĐ`);
        this.updateStatElement('pendingOrders', pendingOrders);
        this.updateStatElement('avgRating', avgRating);
    }

    updateStatElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            // Add counting animation
            if (typeof value === 'number' || (typeof value === 'string' && !value.includes('VNĐ'))) {
                this.animateCounter(element, value);
            } else {
                element.textContent = value;
            }
        }
    }

    animateCounter(element, targetValue) {
        const startValue = 0;
        const duration = 1000;
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const currentValue = Math.floor(startValue + (targetValue - startValue) * progress);
            
            element.textContent = currentValue;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    async updateCharts(period) {
        if (this.analytics) {
            await this.analytics.updateDashboardCharts(this.orders, period);
        }
    }

    // Order Management
    renderOrders() {
        if (this.currentSection !== 'orders') return;

        this.updateOrderCounts();
        this.renderOrdersByStatus();
    }

    updateOrderCounts() {
        const counts = {
            pending: this.orders.filter(o => o.status === 'Đang chờ xử lý').length,
            preparing: this.orders.filter(o => o.status === 'Đang chuẩn bị').length,
            completed: this.orders.filter(o => o.status === 'Đã hoàn thành').length,
            archived: this.orders.filter(o => o.status === 'Đã lưu trữ').length
        };

        Object.entries(counts).forEach(([status, count]) => {
            const element = document.getElementById(`${status}Count`);
            if (element) element.textContent = count;
        });
    }

    renderOrdersByStatus() {
        const statusMap = {
            'pending': 'Đang chờ xử lý',
            'preparing': 'Đang chuẩn bị', 
            'completed': 'Đã hoàn thành',
            'archived': 'Đã lưu trữ'
        };

        Object.entries(statusMap).forEach(([key, status]) => {
            const container = document.getElementById(`${key}OrdersList`);
            if (!container) return;

            const orders = this.orders.filter(order => order.status === status);
            container.innerHTML = orders.map(order => this.createOrderCard(order)).join('');
        });
    }

    createOrderCard(order) {
        const createdTime = order.createdAt?.toDate ? 
            order.createdAt.toDate().toLocaleString('vi-VN') : 
            new Date(order.createdAt).toLocaleString('vi-VN');

        const customerInfo = this.formatCustomerInfo(order.customerInfo);
        const items = order.items.map(item => 
            `<li>${item.name} x${item.quantity}${item.customization ? ` (${item.customization})` : ''}</li>`
        ).join('');

        const nextStatus = this.getNextStatus(order.status);
        const actionButtons = this.createActionButtons(order, nextStatus);

        return `
            <div class="order-card" data-order-id="${order.id}">
                <div class="order-header">
                    <div class="order-id">#${order.id.substring(0, 8)}</div>
                    <div class="order-time">${createdTime}</div>
                </div>
                
                <div class="order-details">
                    <div class="order-customer">
                        ${customerInfo}
                    </div>
                    
                    <div class="order-items">
                        <h4>Món đặt:</h4>
                        <ul>${items}</ul>
                    </div>
                    
                    <div class="order-total">
                        Tổng tiền: ${order.totalPrice.toLocaleString('vi-VN')} VNĐ
                        ${order.isPaid ? '<span class="paid-status">✓ Đã thanh toán</span>' : '<span class="unpaid-status">⚠ Chưa thanh toán</span>'}
                    </div>
                    
                    ${order.note ? `<div class="order-note"><strong>Ghi chú:</strong> ${order.note}</div>` : ''}
                </div>
                
                <div class="order-actions">
                    ${actionButtons}
                </div>
            </div>
        `;
    }

    formatCustomerInfo(customerInfo) {
        if (!customerInfo) return 'Không có thông tin khách hàng';

        if (customerInfo.type === 'Uống tại chỗ') {
            return `
                <strong>Loại:</strong> Uống tại chỗ<br>
                <strong>Bàn:</strong> ${customerInfo.tableNumber}<br>
                <strong>Khách:</strong> ${customerInfo.customerName || 'Không rõ'}
            `;
        } else {
            return `
                <strong>Loại:</strong> Giao hàng<br>
                <strong>Khách:</strong> ${customerInfo.customerName}<br>
                <strong>SĐT:</strong> ${customerInfo.phone}<br>
                <strong>Địa chỉ:</strong> ${customerInfo.address}
            `;
        }
    }

    getNextStatus(currentStatus) {
        const statusFlow = {
            'Đang chờ xử lý': 'Đang chuẩn bị',
            'Đang chuẩn bị': 'Đã hoàn thành',
            'Đã hoàn thành': 'Đã lưu trữ',
            'Đã lưu trữ': null
        };
        return statusFlow[currentStatus];
    }

    createActionButtons(order, nextStatus) {
        let buttons = '';

        if (nextStatus) {
            buttons += `<button class="order-btn success" onclick="adminPanel.updateOrderStatus('${order.id}', '${nextStatus}')">
                ${this.getStatusButtonText(nextStatus)}
            </button>`;
        }

        if (!order.isPaid && (order.status === 'Đã hoàn thành' || order.customerInfo?.type === 'Uống tại chỗ')) {
            buttons += `<button class="order-btn warning" onclick="adminPanel.markOrderPaid('${order.id}')">
                Đánh dấu đã thanh toán
            </button>`;
        }

        if (order.status !== 'Đã lưu trữ') {
            buttons += `<button class="order-btn danger" onclick="adminPanel.cancelOrder('${order.id}')">
                Hủy đơn
            </button>`;
        }

        buttons += `<button class="order-btn" onclick="adminPanel.printOrder('${order.id}')">
            <i class="fas fa-print"></i> In
        </button>`;

        return buttons;
    }

    getStatusButtonText(status) {
        const buttonTexts = {
            'Đang chuẩn bị': '👨‍🍳 Bắt đầu làm',
            'Đã hoàn thành': '✅ Hoàn thành',
            'Đã lưu trữ': '📦 Lưu trữ'
        };
        return buttonTexts[status] || status;
    }

    async updateOrderStatus(orderId, newStatus) {
        try {
            await updateDoc(doc(db, "orders", orderId), {
                status: newStatus,
                updatedAt: Timestamp.now()
            });

            showNotification('Cập nhật thành công', `Đơn hàng đã chuyển sang ${newStatus}`, 'success');
            
            // Send notification to customer (in real app, this would be server-side)
            this.notifyCustomer(orderId, newStatus);
            
        } catch (error) {
            console.error('Error updating order status:', error);
            const friendlyError = handleFirebaseError(error, 'updating order status');
            showNotification('Lỗi cập nhật', friendlyError, 'error');
        }
    }

    async markOrderPaid(orderId) {
        try {
            await updateDoc(doc(db, "orders", orderId), {
                isPaid: true,
                paidAt: Timestamp.now()
            });

            showNotification('Đã cập nhật', 'Đơn hàng đã được đánh dấu đã thanh toán', 'success');
            
        } catch (error) {
            console.error('Error marking order as paid:', error);
            const friendlyError = handleFirebaseError(error, 'updating payment status');
            showNotification('Lỗi cập nhật', friendlyError, 'error');
        }
    }

    async cancelOrder(orderId) {
        if (!confirm('Bạn có chắc muốn hủy đơn hàng này?')) return;

        try {
            await updateDoc(doc(db, "orders", orderId), {
                status: 'Đã hủy',
                cancelledAt: Timestamp.now()
            });

            showNotification('Đã hủy đơn', 'Đơn hàng đã được hủy', 'info');
            
        } catch (error) {
            console.error('Error cancelling order:', error);
            const friendlyError = handleFirebaseError(error, 'cancelling order');
            showNotification('Lỗi hủy đơn', friendlyError, 'error');
        }
    }

    notifyCustomer(orderId, status) {
        // In a real application, this would send a push notification
        // For now, we'll just log it
        console.log(`📱 Notifying customer about order ${orderId}: ${status}`);
        
        // You could implement FCM notification here if you have customer tokens
        if (fcmService) {
            fcmService.sendTestNotification();
        }
    }

    switchOrderTab(status) {
        // Update active tab
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-status="${status}"]`)?.classList.add('active');

        // Show corresponding order list
        document.querySelectorAll('.orders-list').forEach(list => {
            list.classList.remove('active');
        });
        document.getElementById(`${status}OrdersList`)?.classList.add('active');
    }

    printOrder(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(this.generateOrderReceipt(order));
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    }

    generateOrderReceipt(order) {
        const createdTime = order.createdAt?.toDate ? 
            order.createdAt.toDate().toLocaleString('vi-VN') : 
            new Date(order.createdAt).toLocaleString('vi-VN');

        const items = order.items.map(item => `
            <tr>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>${(item.price * item.quantity).toLocaleString('vi-VN')} VNĐ</td>
            </tr>
        `).join('');

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Hóa đơn #${order.id.substring(0, 8)}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .order-info { margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
                    .total { font-weight: bold; font-size: 1.2em; }
                    @media print { body { margin: 0; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>PHỐ ĐI LẠI LÝ NHÂN</h1>
                    <h2>HÓA ĐƠN #${order.id.substring(0, 8)}</h2>
                </div>
                
                <div class="order-info">
                    <p><strong>Thời gian:</strong> ${createdTime}</p>
                    <p><strong>Khách hàng:</strong> ${order.customerInfo?.customerName || 'Không rõ'}</p>
                    ${order.customerInfo?.type === 'Uống tại chỗ' ? 
                        `<p><strong>Bàn số:</strong> ${order.customerInfo.tableNumber}</p>` :
                        `<p><strong>Địa chỉ:</strong> ${order.customerInfo?.address || 'N/A'}</p>`
                    }
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>Món</th>
                            <th>SL</th>
                            <th>Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items}
                    </tbody>
                </table>
                
                <div class="total" style="margin-top: 20px; text-align: right;">
                    <p>Tổng cộng: ${order.totalPrice.toLocaleString('vi-VN')} VNĐ</p>
                </div>
                
                <div style="margin-top: 30px; text-align: center;">
                    <p>Cảm ơn quý khách!</p>
                </div>
            </body>
            </html>
        `;
    }

    printOrders() {
        const activeTab = document.querySelector('.tab-btn.active')?.dataset.status || 'pending';
        const statusMap = {
            'pending': 'Đang chờ xử lý',
            'preparing': 'Đang chuẩn bị',
            'completed': 'Đã hoàn thành',
            'archived': 'Đã lưu trữ'
        };
        
        const orders = this.orders.filter(order => order.status === statusMap[activeTab]);
        
        if (orders.length === 0) {
            showNotification('Không có đơn hàng', 'Không có đơn hàng nào để in', 'warning');
            return;
        }
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(this.generateOrdersReport(orders, statusMap[activeTab]));
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    }

    generateOrdersReport(orders, status) {
        const orderRows = orders.map(order => {
            const createdTime = order.createdAt?.toDate ? 
                order.createdAt.toDate().toLocaleString('vi-VN') : 
                new Date(order.createdAt).toLocaleString('vi-VN');
            
            return `
                <tr>
                    <td>#${order.id.substring(0, 8)}</td>
                    <td>${createdTime}</td>
                    <td>${order.customerInfo?.customerName || 'N/A'}</td>
                    <td>${order.totalPrice.toLocaleString('vi-VN')} VNĐ</td>
                    <td>${order.isPaid ? 'Đã thanh toán' : 'Chưa thanh toán'}</td>
                </tr>
            `;
        }).join('');

        const total = orders.reduce((sum, order) => sum + order.totalPrice, 0);

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Báo cáo đơn hàng - ${status}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { padding: 8px; text-align: left; border: 1px solid #ddd; }
                    th { background-color: #f5f5f5; }
                    .summary { margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>PHỐ ĐI LẠI LÝ NHÂN</h1>
                    <h2>BÁO CÁO ĐỠN HÀNG - ${status.toUpperCase()}</h2>
                    <p>Ngày in: ${new Date().toLocaleString('vi-VN')}</p>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>Mã ĐH</th>
                            <th>Thời gian</th>
                            <th>Khách hàng</th>
                            <th>Tổng tiền</th>
                            <th>Thanh toán</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${orderRows}
                    </tbody>
                </table>
                
                <div class="summary">
                    <p><strong>Tổng số đơn hàng:</strong> ${orders.length}</p>
                    <p><strong>Tổng doanh thu:</strong> ${total.toLocaleString('vi-VN')} VNĐ</p>
                </div>
            </body>
            </html>
        `;
    }

    // Menu Management
    renderMenuManagement() {
        this.renderCategories();
        this.renderMenuItems();
    }

    renderCategories() {
        const container = document.getElementById('categoriesList');
        if (!container) return;

        container.innerHTML = this.categories.map(category => `
            <div class="category-item">
                <span>${this.getCategoryDisplayName(category)}</span>
                <button class="delete-category-btn" onclick="adminPanel.deleteCategory('${category}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');

        // Update category filter
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.innerHTML = `
                <option value="all">Tất cả danh mục</option>
                ${this.categories.map(cat => 
                    `<option value="${cat}">${this.getCategoryDisplayName(cat)}</option>`
                ).join('')}
            `;
        }
    }

    getCategoryDisplayName(category) {
        const names = {
            'tea': 'Trà',
            'coffee': 'Cà phê',
            'smoothie': 'Sinh tố',
            'snacks': 'Đồ ăn nhẹ'
        };
        return names[category] || category;
    }

    addCategory() {
        const input = document.getElementById('newCategoryName');
        const categoryName = input.value.trim();
        
        if (!categoryName) {
            showNotification('Tên danh mục trống', 'Vui lòng nhập tên danh mục', 'warning');
            return;
        }

        if (this.categories.includes(categoryName.toLowerCase())) {
            showNotification('Danh mục đã tồn tại', 'Danh mục này đã có trong hệ thống', 'warning');
            return;
        }

        this.categories.push(categoryName.toLowerCase());
        input.value = '';
        this.renderCategories();
        
        showNotification('Thêm thành công', `Danh mục "${categoryName}" đã được thêm`, 'success');
    }

    deleteCategory(category) {
        if (!confirm(`Bạn có chắc muốn xóa danh mục "${this.getCategoryDisplayName(category)}"?`)) return;

        this.categories = this.categories.filter(cat => cat !== category);
        this.renderCategories();
        
        showNotification('Xóa thành công', `Danh mục "${this.getCategoryDisplayName(category)}" đã được xóa`, 'info');
    }

    renderMenuItems() {
        const container = document.getElementById('menuItemsList');
        if (!container) return;

        const categoryFilter = document.getElementById('categoryFilter')?.value || 'all';
        const searchTerm = document.getElementById('menuSearch')?.value.toLowerCase() || '';

        let filteredItems = this.menuItems;
        
        if (categoryFilter !== 'all') {
            filteredItems = filteredItems.filter(item => item.category === categoryFilter);
        }
        
        if (searchTerm) {
            filteredItems = filteredItems.filter(item => 
                item.name.toLowerCase().includes(searchTerm) ||
                item.description?.toLowerCase().includes(searchTerm)
            );
        }

        container.innerHTML = filteredItems.map(item => `
            <div class="menu-item-card">
                <div class="item-image">
                    <img src="${item.image || '/placeholder.jpg'}" alt="${item.name}" loading="lazy">
                    <div class="item-status ${item.available ? 'available' : 'unavailable'}">
                        ${item.available ? 'Có sẵn' : 'Hết hàng'}
                    </div>
                </div>
                <div class="item-info">
                    <h4>${item.name}</h4>
                    <p class="item-description">${item.description || ''}</p>
                    <div class="item-price">${item.price.toLocaleString('vi-VN')} VNĐ</div>
                    <div class="item-category">${this.getCategoryDisplayName(item.category)}</div>
                </div>
                <div class="item-actions">
                    <button class="edit-btn" onclick="adminPanel.editMenuItem('${item.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="toggle-availability-btn" onclick="adminPanel.toggleItemAvailability('${item.id}')">
                        <i class="fas fa-${item.available ? 'eye-slash' : 'eye'}"></i>
                    </button>
                    <button class="delete-btn" onclick="adminPanel.deleteMenuItem('${item.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    showMenuItemModal(itemId = null) {
        const modal = document.getElementById('menuItemModal');
        const title = document.getElementById('menuItemModalTitle');
        
        if (itemId) {
            // Edit mode
            const item = this.menuItems.find(i => i.id === itemId);
            if (!item) return;

            title.textContent = 'Chỉnh sửa món';
            this.fillMenuItemForm(item);
        } else {
            // Add mode
            title.textContent = 'Thêm món mới';
            this.resetMenuItemForm();
        }

        // Populate categories in modal
        const categorySelect = document.getElementById('itemCategory');
        if (categorySelect) {
            categorySelect.innerHTML = this.categories.map(cat => 
                `<option value="${cat}">${this.getCategoryDisplayName(cat)}</option>`
            ).join('');
        }

        modal.classList.add('active');
        modal.dataset.itemId = itemId || '';
    }

    fillMenuItemForm(item) {
        document.getElementById('itemName').value = item.name || '';
        document.getElementById('itemCategory').value = item.category || '';
        document.getElementById('itemPrice').value = item.price || 0;
        document.getElementById('itemDescription').value = item.description || '';
        document.getElementById('itemImage').value = item.image || '';
        document.getElementById('itemAvailable').checked = item.available !== false;
    }

    resetMenuItemForm() {
        document.getElementById('itemName').value = '';
        document.getElementById('itemCategory').value = this.categories[0] || '';
        document.getElementById('itemPrice').value = '';
        document.getElementById('itemDescription').value = '';
        document.getElementById('itemImage').value = '';
        document.getElementById('itemAvailable').checked = true;
    }

    async saveMenuItem() {
        try {
            const modal = document.getElementById('menuItemModal');
            const itemId = modal.dataset.itemId;
            
            const itemData = {
                name: document.getElementById('itemName').value.trim(),
                category: document.getElementById('itemCategory').value,
                price: parseInt(document.getElementById('itemPrice').value),
                description: document.getElementById('itemDescription').value.trim(),
                image: document.getElementById('itemImage').value.trim(),
                available: document.getElementById('itemAvailable').checked,
                updatedAt: Timestamp.now()
            };

            // Validate
            if (!itemData.name || !itemData.category || !itemData.price) {
                showNotification('Thiếu thông tin', 'Vui lòng điền đầy đủ thông tin bắt buộc', 'warning');
                return;
            }

            if (itemId) {
                // Update existing item
                await updateDoc(doc(db, "menu", itemId), itemData);
                showNotification('Cập nhật thành công', `Món "${itemData.name}" đã được cập nhật`, 'success');
            } else {
                // Add new item
                itemData.createdAt = Timestamp.now();
                await addDoc(collection(db, "menu"), itemData);
                showNotification('Thêm thành công', `Món "${itemData.name}" đã được thêm vào menu`, 'success');
            }

            this.closeMenuItemModal();
            this.loadInitialData(); // Refresh menu items
            
        } catch (error) {
            console.error('Error saving menu item:', error);
            const friendlyError = handleFirebaseError(error, 'saving menu item');
            showNotification('Lỗi lưu dữ liệu', friendlyError, 'error');
        }
    }

    editMenuItem(itemId) {
        this.showMenuItemModal(itemId);
    }

    async toggleItemAvailability(itemId) {
        try {
            const item = this.menuItems.find(i => i.id === itemId);
            if (!item) return;

            await updateDoc(doc(db, "menu", itemId), {
                available: !item.available,
                updatedAt: Timestamp.now()
            });

            const status = !item.available ? 'có sẵn' : 'hết hàng';
            showNotification('Cập nhật thành công', `Món "${item.name}" đã được đánh dấu ${status}`, 'info');
            
        } catch (error) {
            console.error('Error toggling item availability:', error);
            const friendlyError = handleFirebaseError(error, 'updating availability');
            showNotification('Lỗi cập nhật', friendlyError, 'error');
        }
    }

    async deleteMenuItem(itemId) {
        const item = this.menuItems.find(i => i.id === itemId);
        if (!item) return;

        if (!confirm(`Bạn có chắc muốn xóa món "${item.name}"?`)) return;

        try {
            await deleteDoc(doc(db, "menu", itemId));
            showNotification('Xóa thành công', `Món "${item.name}" đã được xóa khỏi menu`, 'info');
            
        } catch (error) {
            console.error('Error deleting menu item:', error);
            const friendlyError = handleFirebaseError(error, 'deleting menu item');
            showNotification('Lỗi xóa dữ liệu', friendlyError, 'error');
        }
    }

    closeMenuItemModal() {
        document.getElementById('menuItemModal')?.classList.remove('active');
    }

    // Promotion Management
    renderPromotions() {
        const container = document.getElementById('promotionsList');
        if (!container) return;

        container.innerHTML = this.promotions.map(promo => {
            const startDate = promo.startDate?.toDate ? promo.startDate.toDate() : new Date(promo.startDate);
            const endDate = promo.endDate?.toDate ? promo.endDate.toDate() : new Date(promo.endDate);
            const now = new Date();
            const isActive = promo.active && startDate <= now && endDate >= now;
            const isExpired = endDate < now;

            return `
                <div class="promotion-card ${isActive ? 'active' : ''} ${isExpired ? 'expired' : ''}">
                    <div class="promotion-header">
                        <h4>${promo.name}</h4>
                        <div class="promotion-status">
                            ${isExpired ? '⏰ Đã hết hạn' : isActive ? '✅ Đang hoạt động' : '⏸️ Không hoạt động'}
                        </div>
                    </div>
                    <div class="promotion-details">
                        <p><strong>Mã:</strong> ${promo.code}</p>
                        <p><strong>Loại:</strong> ${promo.type === 'percentage' ? 'Phần trăm' : 'Số tiền cố định'}</p>
                        <p><strong>Giá trị:</strong> ${promo.type === 'percentage' ? promo.value + '%' : promo.value.toLocaleString('vi-VN') + ' VNĐ'}</p>
                        <p><strong>Đơn tối thiểu:</strong> ${promo.minOrder.toLocaleString('vi-VN')} VNĐ</p>
                        <p><strong>Thời gian:</strong> ${startDate.toLocaleDateString('vi-VN')} - ${endDate.toLocaleDateString('vi-VN')}</p>
                    </div>
                    <div class="promotion-actions">
                        <button class="edit-btn" onclick="adminPanel.editPromotion('${promo.id}')">
                            <i class="fas fa-edit"></i> Sửa
                        </button>
                        <button class="toggle-btn" onclick="adminPanel.togglePromotion('${promo.id}')">
                            <i class="fas fa-${promo.active ? 'pause' : 'play'}"></i> ${promo.active ? 'Tạm dừng' : 'Kích hoạt'}
                        </button>
                        <button class="delete-btn" onclick="adminPanel.deletePromotion('${promo.id}')">
                            <i class="fas fa-trash"></i> Xóa
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    showPromotionModal(promoId = null) {
        const modal = document.getElementById('promotionModal');
        const title = document.getElementById('promotionModalTitle');
        
        if (promoId) {
            // Edit mode
            const promo = this.promotions.find(p => p.id === promoId);
            if (!promo) return;

            title.textContent = 'Chỉnh sửa khuyến mãi';
            this.fillPromotionForm(promo);
        } else {
            // Add mode
            title.textContent = 'Tạo khuyến mãi mới';
            this.resetPromotionForm();
        }

        modal.classList.add('active');
        modal.dataset.promoId = promoId || '';
    }

    fillPromotionForm(promo) {
        document.getElementById('promoName').value = promo.name || '';
        document.getElementById('promoCode').value = promo.code || '';
        document.getElementById('promoType').value = promo.type || 'percentage';
        document.getElementById('promoValue').value = promo.value || 0;
        document.getElementById('promoMinOrder').value = promo.minOrder || 0;
        
        if (promo.startDate) {
            const startDate = promo.startDate.toDate ? promo.startDate.toDate() : new Date(promo.startDate);
            document.getElementById('promoStartDate').value = this.formatDateTimeLocal(startDate);
        }
        
        if (promo.endDate) {
            const endDate = promo.endDate.toDate ? promo.endDate.toDate() : new Date(promo.endDate);
            document.getElementById('promoEndDate').value = this.formatDateTimeLocal(endDate);
        }
    }

    resetPromotionForm() {
        document.getElementById('promoName').value = '';
        document.getElementById('promoCode').value = '';
        document.getElementById('promoType').value = 'percentage';
        document.getElementById('promoValue').value = '';
        document.getElementById('promoMinOrder').value = '0';
        
        // Set default dates (today and next week)
        const now = new Date();
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        document.getElementById('promoStartDate').value = this.formatDateTimeLocal(now);
        document.getElementById('promoEndDate').value = this.formatDateTimeLocal(nextWeek);
    }

    formatDateTimeLocal(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    async savePromotion() {
        try {
            const modal = document.getElementById('promotionModal');
            const promoId = modal.dataset.promoId;
            
            const promoData = {
                name: document.getElementById('promoName').value.trim(),
                code: document.getElementById('promoCode').value.trim().toUpperCase(),
                type: document.getElementById('promoType').value,
                value: parseFloat(document.getElementById('promoValue').value),
                minOrder: parseInt(document.getElementById('promoMinOrder').value),
                startDate: Timestamp.fromDate(new Date(document.getElementById('promoStartDate').value)),
                endDate: Timestamp.fromDate(new Date(document.getElementById('promoEndDate').value)),
                active: true,
                updatedAt: Timestamp.now()
            };

            // Validate
            if (!promoData.name || !promoData.code || !promoData.value) {
                showNotification('Thiếu thông tin', 'Vui lòng điền đầy đủ thông tin bắt buộc', 'warning');
                return;
            }

            if (promoData.startDate.toDate() >= promoData.endDate.toDate()) {
                showNotification('Thời gian không hợp lệ', 'Ngày kết thúc phải sau ngày bắt đầu', 'warning');
                return;
            }

            if (promoId) {
                // Update existing promotion
                await updateDoc(doc(db, "promotions", promoId), promoData);
                showNotification('Cập nhật thành công', `Khuyến mãi "${promoData.name}" đã được cập nhật`, 'success');
            } else {
                // Add new promotion
                promoData.createdAt = Timestamp.now();
                await addDoc(collection(db, "promotions"), promoData);
                showNotification('Tạo thành công', `Khuyến mãi "${promoData.name}" đã được tạo`, 'success');
            }

            this.closePromotionModal();
            
        } catch (error) {
            console.error('Error saving promotion:', error);
            const friendlyError = handleFirebaseError(error, 'saving promotion');
            showNotification('Lỗi lưu dữ liệu', friendlyError, 'error');
        }
    }

    editPromotion(promoId) {
        this.showPromotionModal(promoId);
    }

    async togglePromotion(promoId) {
        try {
            const promo = this.promotions.find(p => p.id === promoId);
            if (!promo) return;

            await updateDoc(doc(db, "promotions", promoId), {
                active: !promo.active,
                updatedAt: Timestamp.now()
            });

            const status = !promo.active ? 'đã kích hoạt' : 'đã tạm dừng';
            showNotification('Cập nhật thành công', `Khuyến mãi "${promo.name}" ${status}`, 'info');
            
        } catch (error) {
            console.error('Error toggling promotion:', error);
            const friendlyError = handleFirebaseError(error, 'updating promotion');
            showNotification('Lỗi cập nhật', friendlyError, 'error');
        }
    }

    async deletePromotion(promoId) {
        const promo = this.promotions.find(p => p.id === promoId);
        if (!promo) return;

        if (!confirm(`Bạn có chắc muốn xóa khuyến mãi "${promo.name}"?`)) return;

        try {
            await deleteDoc(doc(db, "promotions", promoId));
            showNotification('Xóa thành công', `Khuyến mãi "${promo.name}" đã được xóa`, 'info');
            
        } catch (error) {
            console.error('Error deleting promotion:', error);
            const friendlyError = handleFirebaseError(error, 'deleting promotion');
            showNotification('Lỗi xóa dữ liệu', friendlyError, 'error');
        }
    }

    closePromotionModal() {
        document.getElementById('promotionModal')?.classList.remove('active');
    }

    // Feedback Management
    renderFeedback() {
        const container = document.getElementById('feedbackList');
        if (!container) return;

        const ratingFilter = document.getElementById('ratingFilter')?.value || 'all';
        let filteredFeedback = this.feedback;

        if (ratingFilter !== 'all') {
            filteredFeedback = this.feedback.filter(f => f.rating === parseInt(ratingFilter));
        }

        container.innerHTML = filteredFeedback.map(feedback => {
            const createdTime = feedback.createdAt?.toDate ? 
                feedback.createdAt.toDate().toLocaleString('vi-VN') : 
                new Date(feedback.createdAt).toLocaleString('vi-VN');

            return `
                <div class="feedback-card">
                    <div class="feedback-header">
                        <div class="feedback-rating">
                            ${Array(5).fill().map((_, i) => 
                                `<i class="fas fa-star ${i < feedback.rating ? 'active' : ''}"></i>`
                            ).join('')}
                            <span class="rating-text">${feedback.rating}/5</span>
                        </div>
                        <div class="feedback-time">${createdTime}</div>
                    </div>
                    <div class="feedback-content">
                        <p class="feedback-text">${feedback.text}</p>
                        <div class="feedback-customer">
                            <strong>Khách hàng:</strong> ${feedback.customerName || 'Ẩn danh'}
                        </div>
                        ${feedback.orderId ? `
                            <div class="feedback-order">
                                <strong>Đơn hàng:</strong> #${feedback.orderId.substring(0, 8)}
                            </div>
                        ` : ''}
                    </div>
                    <div class="feedback-actions">
                        <button class="reply-btn" onclick="adminPanel.replyToFeedback('${feedback.id}')">
                            <i class="fas fa-reply"></i> Phản hồi
                        </button>
                        <button class="delete-feedback-btn" onclick="adminPanel.deleteFeedback('${feedback.id}')">
                            <i class="fas fa-trash"></i> Xóa
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        if (filteredFeedback.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-star"></i>
                    <p>Chưa có phản hồi nào</p>
                </div>
            `;
        }
    }

    replyToFeedback(feedbackId) {
        // In a real app, this would open a modal to compose a reply
        const feedback = this.feedback.find(f => f.id === feedbackId);
        if (!feedback) return;

        const reply = prompt(`Phản hồi cho đánh giá ${feedback.rating} sao:\n"${feedback.text}"\n\nNhập phản hồi của bạn:`);
        if (reply && reply.trim()) {
            // In a real app, you would save this reply to database
            showNotification('Phản hồi đã gửi', 'Phản hồi của bạn đã được ghi nhận', 'success');
            console.log('Reply to feedback:', { feedbackId, reply });
        }
    }

    async deleteFeedback(feedbackId) {
        const feedback = this.feedback.find(f => f.id === feedbackId);
        if (!feedback) return;

        if (!confirm('Bạn có chắc muốn xóa phản hồi này?')) return;

        try {
            await deleteDoc(doc(db, "feedback", feedbackId));
            showNotification('Xóa thành công', 'Phản hồi đã được xóa', 'info');
            
        } catch (error) {
            console.error('Error deleting feedback:', error);
            const friendlyError = handleFirebaseError(error, 'deleting feedback');
            showNotification('Lỗi xóa dữ liệu', friendlyError, 'error');
        }
    }

    // Analytics Management
    async renderAnalytics() {
        if (!this.analytics) return;

        await this.analytics.renderAnalytics(this.orders, this.feedback);
        this.updateAnalyticsSummary();
    }

    async updateAnalyticsChart() {
        if (!this.analytics) return;

        const type = document.getElementById('analyticsType')?.value || 'revenue';
        const days = parseInt(document.getElementById('analyticsDate')?.value || '30');

        await this.analytics.updateChart(this.orders, type, days);
        this.updateAnalyticsSummary();
    }

    updateAnalyticsSummary() {
        const days = parseInt(document.getElementById('analyticsDate')?.value || '30');
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        
        const recentOrders = this.orders.filter(order => {
            const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
            return orderDate >= startDate;
        });

        const totalRevenue = recentOrders
            .filter(order => order.isPaid)
            .reduce((sum, order) => sum + order.totalPrice, 0);
        
        const totalOrders = recentOrders.length;
        const newCustomers = new Set(recentOrders.map(o => o.customerInfo?.phone || o.customerInfo?.customerName)).size;
        
        const avgRating = this.feedback.length > 0 
            ? (this.feedback.reduce((sum, f) => sum + f.rating, 0) / this.feedback.length)
            : 0;
        const satisfaction = Math.round((avgRating / 5) * 100);

        // Update summary cards
        document.getElementById('summaryRevenue').textContent = `${totalRevenue.toLocaleString('vi-VN')} VNĐ`;
        document.getElementById('summaryOrders').textContent = totalOrders;
        document.getElementById('summaryNewCustomers').textContent = newCustomers;
        document.getElementById('summarySatisfaction').textContent = `${satisfaction}%`;
    }

    // Chat Management
    renderChat() {
        // Simple chat implementation - in a real app this would connect to a chat service
        const container = document.getElementById('chatConversations');
        if (!container) return;

        // Mock chat conversations
        const conversations = [
            { id: '1', customer: 'Nguyễn Văn A', lastMessage: 'Đơn hàng của tôi đến chưa?', time: new Date() },
            { id: '2', customer: 'Trần Thị B', lastMessage: 'Tôi muốn đổi địa chỉ giao hàng', time: new Date(Date.now() - 30 * 60 * 1000) }
        ];

        container.innerHTML = conversations.map(conv => `
            <div class="conversation-item" onclick="adminPanel.selectConversation('${conv.id}')">
                <div class="conversation-header">
                    <strong>${conv.customer}</strong>
                    <span class="conversation-time">${conv.time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div class="conversation-preview">${conv.lastMessage}</div>
            </div>
        `).join('');
    }

    selectConversation(conversationId) {
        const chatArea = document.getElementById('selectedChat');
        if (!chatArea) return;

        // Mock conversation messages
        chatArea.innerHTML = `
            <div class="chat-header">
                <h4>Cuộc trò chuyện với Nguyễn Văn A</h4>
            </div>
            <div class="chat-messages-container">
                <div class="chat-message customer">
                    <div class="message-content">Xin chào, đơn hàng của tôi đến chưa ạ?</div>
                    <div class="message-time">14:30</div>
                </div>
                <div class="chat-message admin">
                    <div class="message-content">Xin chào! Đơn hàng của bạn đang được chuẩn bị và sẽ giao trong 30 phút tới.</div>
                    <div class="message-time">14:32</div>
                </div>
            </div>
            <div class="chat-input-area">
                <input type="text" placeholder="Nhập tin nhắn..." id="adminChatInput">
                <button onclick="adminPanel.sendAdminMessage()">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
        `;
    }

    sendAdminMessage() {
        const input = document.getElementById('adminChatInput');
        const message = input.value.trim();
        
        if (!message) return;

        // Mock sending message
        const messagesContainer = document.querySelector('.chat-messages-container');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message admin';
        messageDiv.innerHTML = `
            <div class="message-content">${message}</div>
            <div class="message-time">${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
        `;
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        input.value = '';
        
        showNotification('Tin nhắn đã gửi', 'Tin nhắn của bạn đã được gửi đến khách hàng', 'success');
    }

    // Settings Management
    renderSettings() {
        this.loadSettings();
    }

    loadSettings() {
        const settings = JSON.parse(localStorage.getItem('admin_settings') || '{}');
        
        // Load general settings
        document.getElementById('storeName').value = settings.storeName || 'PHỐ ĐI LẠI LÝ NHÂN';
        document.getElementById('storePhone').value = settings.storePhone || '';
        document.getElementById('storeAddress').value = settings.storeAddress || '';
        
        // Load notification settings
        document.getElementById('enableNotifications').checked = settings.enableNotifications !== false;
        document.getElementById('enableEmailNotifications').checked = settings.enableEmailNotifications === true;
    }

    saveSettings() {
        const settings = {
            storeName: document.getElementById('storeName').value,
            storePhone: document.getElementById('storePhone').value,
            storeAddress: document.getElementById('storeAddress').value,
            enableNotifications: document.getElementById('enableNotifications').checked,
            enableEmailNotifications: document.getElementById('enableEmailNotifications').checked,
            updatedAt: new Date().toISOString()
        };

        localStorage.setItem('admin_settings', JSON.stringify(settings));
        showNotification('Cài đặt đã lưu', 'Các cài đặt hệ thống đã được cập nhật', 'success');
    }

    // Data Management
    async backupData() {
        try {
            showNotification('Đang backup...', 'Đang tạo bản sao lưu dữ liệu', 'info');

            const backup = {
                timestamp: new Date().toISOString(),
                orders: this.orders,
                menuItems: this.menuItems,
                promotions: this.promotions,
                feedback: this.feedback,
                settings: JSON.parse(localStorage.getItem('admin_settings') || '{}')
            };

            const dataStr = JSON.stringify(backup, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `pho-di-lai-backup-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            URL.revokeObjectURL(url);
            
            showNotification('Backup thành công', 'Dữ liệu đã được tải xuống', 'success');
            
        } catch (error) {
            console.error('Error creating backup:', error);
            showNotification('Lỗi backup', 'Không thể tạo bản sao lưu', 'error');
        }
    }

    showRestoreDialog() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => this.restoreData(e.target.files[0]);
        input.click();
    }

    async restoreData(file) {
        if (!file) return;

        if (!confirm('Bạn có chắc muốn khôi phục dữ liệu? Dữ liệu hiện tại sẽ bị ghi đè.')) return;

        try {
            const text = await file.text();
            const backup = JSON.parse(text);
            
            // Validate backup structure
            if (!backup.timestamp || !backup.orders) {
                throw new Error('File backup không hợp lệ');
            }

            showNotification('Đang khôi phục...', 'Đang khôi phục dữ liệu từ backup', 'info');

            // In a real app, you would restore to Firestore
            // For now, just update local storage
            if (backup.settings) {
                localStorage.setItem('admin_settings', JSON.stringify(backup.settings));
            }

            showNotification('Khôi phục thành công', `Đã khôi phục dữ liệu từ ${backup.timestamp}`, 'success');
            
            // Refresh the page to load restored data
            setTimeout(() => {
                window.location.reload();
            }, 2000);
            
        } catch (error) {
            console.error('Error restoring backup:', error);
            showNotification('Lỗi khôi phục', 'Không thể khôi phục dữ liệu từ file này', 'error');
        }
    }

    exportData() {
        const format = prompt('Chọn định dạng xuất:\n1. JSON\n2. CSV\n\nNhập số (1 hoặc 2):', '1');
        
        if (format === '1') {
            this.exportJSON();
        } else if (format === '2') {
            this.exportCSV();
        }
    }

    exportJSON() {
        const data = {
            exportDate: new Date().toISOString(),
            orders: this.orders,
            summary: {
                totalOrders: this.orders.length,
                totalRevenue: this.orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0),
                totalFeedback: this.feedback.length,
                averageRating: this.feedback.length > 0 ? 
                    this.feedback.reduce((sum, f) => sum + f.rating, 0) / this.feedback.length : 0
            }
        };

        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `pho-di-lai-data-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        showNotification('Xuất thành công', 'Dữ liệu đã được xuất dưới dạng JSON', 'success');
    }

    exportCSV() {
        const headers = ['Mã ĐH', 'Thời gian', 'Khách hàng', 'Loại', 'Tổng tiền', 'Trạng thái', 'Thanh toán'];
        const rows = this.orders.map(order => {
            const createdTime = order.createdAt?.toDate ? 
                order.createdAt.toDate().toLocaleString('vi-VN') : 
                new Date(order.createdAt).toLocaleString('vi-VN');
            
            return [
                `#${order.id.substring(0, 8)}`,
                createdTime,
                order.customerInfo?.customerName || 'N/A',
                order.customerInfo?.type || 'N/A',
                order.totalPrice,
                order.status,
                order.isPaid ? 'Đã thanh toán' : 'Chưa thanh toán'
            ];
        });

        const csvContent = [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');

        const dataBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `pho-di-lai-orders-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        
        URL.revokeObjectURL(url);
        showNotification('Xuất thành công', 'Dữ liệu đã được xuất dưới dạng CSV', 'success');
    }

    exportReport() {
        const type = document.getElementById('analyticsType')?.value || 'revenue';
        const days = parseInt(document.getElementById('analyticsDate')?.value || '30');
        
        // Generate Excel-like report
        this.generateExcelReport(type, days);
    }

    generateExcelReport(type, days) {
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const filteredOrders = this.orders.filter(order => {
            const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
            return orderDate >= startDate;
        });

        let reportData = {};
        let fileName = '';
        
        switch (type) {
            case 'revenue':
                reportData = this.generateRevenueReport(filteredOrders);
                fileName = `bao-cao-doanh-thu-${days}ngay.json`;
                break;
            case 'orders':
                reportData = this.generateOrdersReport(filteredOrders);
                fileName = `bao-cao-don-hang-${days}ngay.json`;
                break;
            case 'products':
                reportData = this.generateProductsReport(filteredOrders);
                fileName = `bao-cao-san-pham-${days}ngay.json`;
                break;
            case 'customers':
                reportData = this.generateCustomersReport(filteredOrders);
                fileName = `bao-cao-khach-hang-${days}ngay.json`;
                break;
        }

        const dataStr = JSON.stringify(reportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        
        URL.revokeObjectURL(url);
        showNotification('Xuất báo cáo thành công', 'Báo cáo đã được tải xuống', 'success');
    }

    generateRevenueReport(orders) {
        const dailyRevenue = {};
        orders.forEach(order => {
            if (!order.isPaid) return;
            
            const date = (order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt))
                .toLocaleDateString('vi-VN');
            
            if (!dailyRevenue[date]) {
                dailyRevenue[date] = { date, revenue: 0, orders: 0 };
            }
            
            dailyRevenue[date].revenue += order.totalPrice;
            dailyRevenue[date].orders += 1;
        });

        return {
            title: 'Báo cáo Doanh thu',
            period: `${Object.keys(dailyRevenue).length} ngày`,
            totalRevenue: Object.values(dailyRevenue).reduce((sum, day) => sum + day.revenue, 0),
            totalOrders: Object.values(dailyRevenue).reduce((sum, day) => sum + day.orders, 0),
            dailyData: Object.values(dailyRevenue).sort((a, b) => new Date(a.date) - new Date(b.date))
        };
    }

    generateOrdersReport(orders) {
        const statusCounts = {};
        orders.forEach(order => {
            statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
        });

        return {
            title: 'Báo cáo Đơn hàng',
            totalOrders: orders.length,
            statusBreakdown: statusCounts,
            averageOrderValue: orders.reduce((sum, o) => sum + o.totalPrice, 0) / orders.length,
            orders: orders.map(order => ({
                id: order.id,
                createdAt: order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString('vi-VN') : new Date(order.createdAt).toLocaleString('vi-VN'),
                customer: order.customerInfo?.customerName,
                total: order.totalPrice,
                status: order.status,
                isPaid: order.isPaid
            }))
        };
    }

    generateProductsReport(orders) {
        const productSales = {};
        
        orders.forEach(order => {
            order.items.forEach(item => {
                if (!productSales[item.name]) {
                    productSales[item.name] = { name: item.name, quantity: 0, revenue: 0 };
                }
                productSales[item.name].quantity += item.quantity;
                productSales[item.name].revenue += item.price * item.quantity;
            });
        });

        const sortedProducts = Object.values(productSales)
            .sort((a, b) => b.quantity - a.quantity);

        return {
            title: 'Báo cáo Sản phẩm',
            totalProducts: Object.keys(productSales).length,
            bestSeller: sortedProducts[0] || null,
            productSales: sortedProducts
        };
    }

    generateCustomersReport(orders) {
        const customers = {};
        
        orders.forEach(order => {
            const customerId = order.customerInfo?.phone || order.customerInfo?.customerName || 'anonymous';
            
            if (!customers[customerId]) {
                customers[customerId] = {
                    name: order.customerInfo?.customerName || 'Khách hàng',
                    phone: order.customerInfo?.phone || 'N/A',
                    orders: 0,
                    totalSpent: 0,
                    firstOrder: order.createdAt,
                    lastOrder: order.createdAt
                };
            }
            
            customers[customerId].orders += 1;
            customers[customerId].totalSpent += order.totalPrice;
            
            const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
            const firstOrder = customers[customerId].firstOrder?.toDate ? customers[customerId].firstOrder.toDate() : new Date(customers[customerId].firstOrder);
            const lastOrder = customers[customerId].lastOrder?.toDate ? customers[customerId].lastOrder.toDate() : new Date(customers[customerId].lastOrder);
            
            if (orderDate < firstOrder) customers[customerId].firstOrder = order.createdAt;
            if (orderDate > lastOrder) customers[customerId].lastOrder = order.createdAt;
        });

        const sortedCustomers = Object.values(customers)
            .sort((a, b) => b.totalSpent - a.totalSpent);

        return {
            title: 'Báo cáo Khách hàng',
            totalCustomers: Object.keys(customers).length,
            topCustomer: sortedCustomers[0] || null,
            repeatCustomers: sortedCustomers.filter(c => c.orders > 1).length,
            customers: sortedCustomers
        };
    }

    // Utility methods
    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }
}

// Initialize admin panel when DOM is loaded
let adminPanel;
document.addEventListener('DOMContentLoaded', () => {
    adminPanel = new AdminPanel();
    
    // Make globally accessible for inline event handlers
    window.adminPanel = adminPanel;
});

// Export for other modules
export default AdminPanel;
