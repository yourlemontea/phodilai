// analytics.js - Advanced analytics and reporting system
import { db } from './firebase-config.js';
import { collection, query, where, orderBy, getDocs, Timestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Chart.js will be loaded from CDN
let Chart = null;

// Analytics configuration
const CHART_COLORS = {
    primary: '#667eea',
    secondary: '#764ba2',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
    gradient: ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe']
};

// Initialize analytics system
export async function initializeAnalytics() {
    try {
        // Load Chart.js if not already loaded
        if (!window.Chart) {
            await loadChartJS();
        }
        Chart = window.Chart;
        
        // Configure Chart.js defaults
        configureChartDefaults();
        
        console.log('✅ Analytics system initialized');
        return true;
    } catch (error) {
        console.error('❌ Failed to initialize analytics:', error);
        return false;
    }
}

// Load Chart.js library
function loadChartJS() {
    return new Promise((resolve, reject) => {
        if (window.Chart) {
            resolve(window.Chart);
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.2.1/dist/chart.umd.js';
        script.onload = () => resolve(window.Chart);
        script.onerror = () => reject(new Error('Failed to load Chart.js'));
        document.head.appendChild(script);
    });
}

// Configure Chart.js defaults
function configureChartDefaults() {
    Chart.defaults.font.family = "'Inter', 'Nunito', sans-serif";
    Chart.defaults.color = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary');
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.padding = 20;
    Chart.defaults.responsive = true;
    Chart.defaults.maintainAspectRatio = false;
    
    // Custom theme based on current theme
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    Chart.defaults.backgroundColor = isDark ? '#374151' : '#f8fafc';
    Chart.defaults.borderColor = isDark ? '#4b5563' : '#e2e8f0';
}

// Main analytics class
export class AnalyticsManager {
    constructor() {
        this.charts = new Map();
        this.data = {
            orders: [],
            revenue: [],
            products: [],
            customers: []
        };
        this.dateRange = 30; // days
    }

    // Render analytics dashboard
    async renderAnalytics(orders, feedback) {
        try {
            await this.loadData(orders, feedback);
            await this.renderDashboardCharts();
            this.updateSummaryCards();
            return true;
        } catch (error) {
            console.error('Error rendering analytics:', error);
            return false;
        }
    }

    // Load and process data
    async loadData(orders, feedback) {
        this.data.orders = orders || [];
        this.data.feedback = feedback || [];
        
        // Process revenue data
        this.data.revenue = this.processRevenueData(this.data.orders);
        
        // Process product data
        this.data.products = this.processProductData(this.data.orders);
        
        // Process customer data
        this.data.customers = this.processCustomerData(this.data.orders);
    }

    // Process revenue data
    processRevenueData(orders) {
        const revenueByDate = new Map();
        const now = new Date();
        
        // Initialize date range
        for (let i = this.dateRange - 1; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const dateKey = date.toISOString().split('T')[0];
            revenueByDate.set(dateKey, {
                date: dateKey,
                revenue: 0,
                orders: 0,
                averageOrder: 0
            });
        }
        
        // Process orders
        orders.forEach(order => {
            if (!order.isPaid) return;
            
            const orderDate = order.createdAt?.toDate ? 
                order.createdAt.toDate() : 
                new Date(order.createdAt);
            const dateKey = orderDate.toISOString().split('T')[0];
            
            if (revenueByDate.has(dateKey)) {
                const dayData = revenueByDate.get(dateKey);
                dayData.revenue += order.totalPrice || 0;
                dayData.orders += 1;
                dayData.averageOrder = dayData.orders > 0 ? dayData.revenue / dayData.orders : 0;
            }
        });
        
        return Array.from(revenueByDate.values());
    }

    // Process product data
    processProductData(orders) {
        const productStats = new Map();
        
        orders.forEach(order => {
            order.items?.forEach(item => {
                const key = item.name;
                
                if (!productStats.has(key)) {
                    productStats.set(key, {
                        name: item.name,
                        quantity: 0,
                        revenue: 0,
                        orders: 0
                    });
                }
                
                const stats = productStats.get(key);
                stats.quantity += item.quantity || 0;
                stats.revenue += (item.price || 0) * (item.quantity || 0);
                stats.orders += 1;
            });
        });
        
        return Array.from(productStats.values())
            .sort((a, b) => b.quantity - a.quantity);
    }

    // Process customer data
    processCustomerData(orders) {
        const customerStats = new Map();
        
        orders.forEach(order => {
            const customerId = order.customerInfo?.phone || 
                             order.customerInfo?.customerName || 
                             'anonymous';
            
            if (!customerStats.has(customerId)) {
                customerStats.set(customerId, {
                    id: customerId,
                    name: order.customerInfo?.customerName || 'Unknown',
                    phone: order.customerInfo?.phone || '',
                    orders: 0,
                    totalSpent: 0,
                    averageOrder: 0,
                    firstOrder: order.createdAt,
                    lastOrder: order.createdAt
                });
            }
            
            const stats = customerStats.get(customerId);
            stats.orders += 1;
            stats.totalSpent += order.totalPrice || 0;
            stats.averageOrder = stats.totalSpent / stats.orders;
            
            const orderDate = order.createdAt?.toDate ? 
                order.createdAt.toDate() : 
                new Date(order.createdAt);
            const firstOrder = stats.firstOrder?.toDate ? 
                stats.firstOrder.toDate() : 
                new Date(stats.firstOrder);
            const lastOrder = stats.lastOrder?.toDate ? 
                stats.lastOrder.toDate() : 
                new Date(stats.lastOrder);
            
            if (orderDate < firstOrder) stats.firstOrder = order.createdAt;
            if (orderDate > lastOrder) stats.lastOrder = order.createdAt;
        });
        
        return Array.from(customerStats.values())
            .sort((a, b) => b.totalSpent - a.totalSpent);
    }

    // Render dashboard charts
    async renderDashboardCharts() {
        await Promise.all([
            this.renderRevenueChart(),
            this.renderProductChart(),
            this.renderOrderStatusChart(),
            this.renderCustomerChart()
        ]);
    }

    // Render revenue chart
    async renderRevenueChart() {
        const canvas = document.getElementById('revenueChart');
        if (!canvas) return;
        
        // Destroy existing chart
        if (this.charts.has('revenue')) {
            this.charts.get('revenue').destroy();
        }
        
        const ctx = canvas.getContext('2d');
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.data.revenue.map(d => this.formatDate(d.date)),
                datasets: [
                    {
                        label: 'Doanh thu (VNĐ)',
                        data: this.data.revenue.map(d => d.revenue),
                        borderColor: CHART_COLORS.primary,
                        backgroundColor: `${CHART_COLORS.primary}20`,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    },
                    {
                        label: 'Số đơn hàng',
                        data: this.data.revenue.map(d => d.orders),
                        borderColor: CHART_COLORS.secondary,
                        backgroundColor: `${CHART_COLORS.secondary}20`,
                        fill: false,
                        tension: 0.4,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Doanh thu theo ngày'
                    },
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label || '';
                                const value = context.parsed.y;
                                
                                if (label.includes('Doanh thu')) {
                                    return `${label}: ${value.toLocaleString('vi-VN')} VNĐ`;
                                }
                                return `${label}: ${value}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Ngày'
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Doanh thu (VNĐ)'
                        },
                        ticks: {
                            callback: function(value) {
                                return value.toLocaleString('vi-VN');
                            }
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Số đơn hàng'
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                }
            }
        });
        
        this.charts.set('revenue', chart);
    }

    // Render product chart
    async renderProductChart() {
        const canvas = document.getElementById('popularItemsChart');
        if (!canvas) return;
        
        // Destroy existing chart
        if (this.charts.has('products')) {
            this.charts.get('products').destroy();
        }
        
        const topProducts = this.data.products.slice(0, 10);
        
        const ctx = canvas.getContext('2d');
        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: topProducts.map(p => p.name),
                datasets: [{
                    data: topProducts.map(p => p.quantity),
                    backgroundColor: CHART_COLORS.gradient,
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Sản phẩm bán chạy'
                    },
                    legend: {
                        position: 'right',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
        
        this.charts.set('products', chart);
    }

    // Render order status chart
    async renderOrderStatusChart() {
        const canvas = document.getElementById('orderStatusChart');
        if (!canvas) return;
        
        // Count orders by status
        const statusCounts = this.data.orders.reduce((acc, order) => {
            const status = order.status || 'Unknown';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});
        
        // Destroy existing chart
        if (this.charts.has('orderStatus')) {
            this.charts.get('orderStatus').destroy();
        }
        
        const ctx = canvas.getContext('2d');
        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(statusCounts),
                datasets: [{
                    label: 'Số đơn hàng',
                    data: Object.values(statusCounts),
                    backgroundColor: CHART_COLORS.gradient,
                    borderWidth: 1,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Trạng thái đơn hàng'
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
        
        this.charts.set('orderStatus', chart);
    }

    // Render customer analytics chart
    async renderCustomerChart() {
        const canvas = document.getElementById('customerChart');
        if (!canvas) return;
        
        // Customer distribution by order count
        const customerDistribution = this.data.customers.reduce((acc, customer) => {
            let category;
            if (customer.orders === 1) category = 'Khách mới';
            else if (customer.orders <= 3) category = 'Khách thường';
            else if (customer.orders <= 10) category = 'Khách quen';
            else category = 'Khách VIP';
            
            acc[category] = (acc[category] || 0) + 1;
            return acc;
        }, {});
        
        // Destroy existing chart
        if (this.charts.has('customer')) {
            this.charts.get('customer').destroy();
        }
        
        const ctx = canvas.getContext('2d');
        const chart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.keys(customerDistribution),
                datasets: [{
                    data: Object.values(customerDistribution),
                    backgroundColor: [
                        CHART_COLORS.info,
                        CHART_COLORS.warning,
                        CHART_COLORS.success,
                        CHART_COLORS.primary
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Phân loại khách hàng'
                    },
                    legend: {
                        position: 'bottom',
                    }
                }
            }
        });
        
        this.charts.set('customer', chart);
    }

    // Update charts for admin dashboard
    async updateDashboardCharts(orders, period = 'today') {
        this.data.orders = orders;
        this.dateRange = this.getPeriodDays(period);
        
        // Reprocess data
        this.data.revenue = this.processRevenueData(orders);
        this.data.products = this.processProductData(orders);
        this.data.customers = this.processCustomerData(orders);
        
        // Update charts
        await this.renderDashboardCharts();
    }

    // Update specific chart
    async updateChart(orders, type, days) {
        this.data.orders = orders;
        this.dateRange = days;
        
        switch (type) {
            case 'revenue':
                this.data.revenue = this.processRevenueData(orders);
                await this.renderRevenueChart();
                break;
            case 'orders':
                await this.renderOrderStatusChart();
                break;
            case 'products':
                this.data.products = this.processProductData(orders);
                await this.renderProductChart();
                break;
            case 'customers':
                this.data.customers = this.processCustomerData(orders);
                await this.renderCustomerChart();
                break;
        }
    }

    // Update summary cards
    updateSummaryCards() {
        const totalRevenue = this.data.revenue.reduce((sum, day) => sum + day.revenue, 0);
        const totalOrders = this.data.orders.length;
        const newCustomers = this.data.customers.filter(c => c.orders === 1).length;
        const avgRating = this.data.feedback.length > 0 ? 
            this.data.feedback.reduce((sum, f) => sum + f.rating, 0) / this.data.feedback.length : 0;
        
        this.updateElement('summaryRevenue', `${totalRevenue.toLocaleString('vi-VN')} VNĐ`);
        this.updateElement('summaryOrders', totalOrders);
        this.updateElement('summaryNewCustomers', newCustomers);
        this.updateElement('summarySatisfaction', `${Math.round((avgRating / 5) * 100)}%`);
    }

    // Generate comprehensive report
    generateReport(orders, type = 'revenue', days = 30) {
        this.data.orders = orders;
        this.dateRange = days;
        
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const filteredOrders = orders.filter(order => {
            const orderDate = order.createdAt?.toDate ? 
                order.createdAt.toDate() : 
                new Date(order.createdAt);
            return orderDate >= startDate;
        });
        
        switch (type) {
            case 'revenue':
                return this.generateRevenueReport(filteredOrders);
            case 'orders':
                return this.generateOrdersReport(filteredOrders);
            case 'products':
                return this.generateProductsReport(filteredOrders);
            case 'customers':
                return this.generateCustomersReport(filteredOrders);
            default:
                return this.generateComprehensiveReport(filteredOrders);
        }
    }

    // Generate revenue report
    generateRevenueReport(orders) {
        const revenueData = this.processRevenueData(orders);
        const totalRevenue = revenueData.reduce((sum, day) => sum + day.revenue, 0);
        const totalOrders = revenueData.reduce((sum, day) => sum + day.orders, 0);
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        const bestDay = revenueData.reduce((max, day) => day.revenue > max.revenue ? day : max, revenueData[0] || {});
        
        return {
            type: 'revenue',
            period: `${this.dateRange} ngày qua`,
            summary: {
                totalRevenue,
                totalOrders,
                averageOrderValue,
                bestDay: bestDay.date,
                bestDayRevenue: bestDay.revenue
            },
            dailyData: revenueData,
            charts: {
                revenue: revenueData.map(d => ({ x: d.date, y: d.revenue })),
                orders: revenueData.map(d => ({ x: d.date, y: d.orders }))
            }
        };
    }

    // Generate products report
    generateProductsReport(orders) {
        const productsData = this.processProductData(orders);
        const totalItems = productsData.reduce((sum, product) => sum + product.quantity, 0);
        const topProduct = productsData[0] || {};
        
        return {
            type: 'products',
            period: `${this.dateRange} ngày qua`,
            summary: {
                totalProducts: productsData.length,
                totalItemsSold: totalItems,
                topProduct: topProduct.name,
                topProductQuantity: topProduct.quantity
            },
            products: productsData,
            charts: {
                distribution: productsData.slice(0, 10).map(p => ({ label: p.name, value: p.quantity }))
            }
        };
    }

    // Utility functions
    getPeriodDays(period) {
        switch (period) {
            case 'today': return 1;
            case 'week': return 7;
            case 'month': return 30;
            case 'year': return 365;
            default: return 30;
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', { 
            month: 'short', 
            day: 'numeric' 
        });
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    // Export data as CSV
    exportCSV(data, filename) {
        const headers = Object.keys(data[0] || {});
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);
    }

    // Export chart as image
    exportChartImage(chartName, filename) {
        const chart = this.charts.get(chartName);
        if (!chart) return;
        
        const link = document.createElement('a');
        link.href = chart.toBase64Image();
        link.download = filename;
        link.click();
    }

    // Destroy all charts
    destroyCharts() {
        this.charts.forEach(chart => chart.destroy());
        this.charts.clear();
    }
}

// Create global analytics instance
const analyticsManager = new AnalyticsManager();

// Export functions
export async function renderAnalytics(orders, feedback) {
    return await analyticsManager.renderAnalytics(orders, feedback);
}

export async function updateDashboardCharts(orders, period) {
    return await analyticsManager.updateDashboardCharts(orders, period);
}

export async function updateChart(orders, type, days) {
    return await analyticsManager.updateChart(orders, type, days);
}

export function generateReport(orders, type, days) {
    return analyticsManager.generateReport(orders, type, days);
}

export function exportCSV(data, filename) {
    return analyticsManager.exportCSV(data, filename);
}

export function exportChartImage(chartName, filename) {
    return analyticsManager.exportChartImage(chartName, filename);
}

export default analyticsManager;
