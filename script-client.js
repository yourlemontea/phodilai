// script-client.js
import { db, handleFirebaseError } from './firebase-config.js';
import { collection, addDoc, onSnapshot, query, orderBy, limit, where, Timestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { showNotification } from './notifications.js';
import { translations, currentLanguage, translatePage, setLanguage } from './translations.js';
import fcmService from './firebase-messaging.js';

// Enhanced menu items with categories and better descriptions
const menuItems = [
    { 
        id: 1, 
        name: 'Trà Đá', 
        price: 5000, 
        category: 'tea',
        description: 'Trà đá truyền thống, thơm mát, giải khát',
        image: 'https://scontent.fhan4-3.fna.fbcdn.net/v/t1.15752-9/528467272_1088978119425078_2155584391935203864_n.jpg?_nc_cat=100&ccb=1-7&_nc_sid=9f807c&_nc_eui2=AeE8KngH6lQGpCaJPqs1qYepMyAC2J3e4DwzIALYnd7gPPeFYU3bIXha77SWzRvR9Zfq4X6PVEnoZsAe68Y78RQN&_nc_ohc=N_OgxAkk42oQ7kNvwHbPqIm&_nc_oc=AdkPGcUanFFqRnhWJFp6pqjFCoEDTQ_8dCq1vs9e0Zgyr_HC5AWe6fJNyAUGi1a-5Bs&_nc_zt=23&_nc_ht=scontent.fhan4-3.fna&oh=03_Q7cD3AEfxzLheoCdwR9p7XPGTDnQsL1StTCc0EPXhXRainL3Zw&oe=68B7DD19',
        available: true,
        rating: 4.5,
        reviewCount: 128
    },
    { 
        id: 2, 
        name: 'Trà Chanh', 
        price: 10000, 
        category: 'tea',
        description: 'Trà chanh tươi mát, chua ngọt hài hòa',
        image: 'https://scontent.fhan3-4.fna.fbcdn.net/v/t1.15752-9/524128035_1024804109561671_3486439221231126237_n.jpg?_nc_cat=104&ccb=1-7&_nc_sid=9f807c&_nc_eui2=AeEsWJNZoX5r7qENR-KMNqdsNIB8BQQoF6Y0gHwFBCgXpqVLEQgxgePCbmz8JdUDjis4qtEDebiBnbd1YYVmFvE3&_nc_ohc=cMokeng3_tUQ7kNvwHE_pWV&_nc_oc=AdlAVBPMg7n91B96BPaKQXyT2mlOQdbPxeGny1hOhCT5TA5cesifRWsphXCeMhb-wuA&_nc_zt=23&_nc_ht=scontent.fhan3-4.fna&oh=03_Q7cD3AH43VyG13_bu1qcNSUKgNp8q1iFliv4AvTrgbbSybyG0g&oe=68B7C42A',
        available: true,
        rating: 4.7,
        reviewCount: 95
    },
    { 
        id: 3, 
        name: 'Trà Quất', 
        price: 10000, 
        category: 'tea',
        description: 'Trà quất thơm ngon, giàu vitamin C',
        image: 'https://scontent.fhan4-3.fna.fbcdn.net/v/t1.15752-9/524265289_1418211029233447_6094407288034019642_n.jpg?_nc_cat=100&ccb=1-7&_nc_sid=9f807c&_nc_eui2=AeExb7j7q8YyGeIkfkgfmd9s4z3kLt6cJCLjPeQu3pwkIrzCSNgfuNss8SYEUCeTsLzA3Ik0tpD_SVNUS6HKl1le&_nc_ohc=OmC_javE0qAQ7kNvwHmIKWQ&_nc_oc=AdmAaGLswnvmwz0t6JpnsRdoSEZHdW61zt-_mE2JyYpbcOj1cAlpYB3vcyDcb-3R8T8&_nc_zt=23&_nc_ht=scontent.fhan4-3.fna&oh=03_Q7cD3AEB_vKiItPQuCsSML7_tw9vFSyaatsmYTVGAr_-oIRx5A&oe=68B7C9BF',
        available: true,
        rating: 4.6,
        reviewCount: 87
    },
    { 
        id: 4, 
        name: 'Cafe Nâu', 
        price: 20000, 
        category: 'coffee',
        description: 'Cà phê sữa đậm đà, thơm ngon',
        image: 'https://scontent.fhan3-3.fna.fbcdn.net/v/t1.15752-9/524305030_749540351005311_5762236659003573076_n.jpg?_nc_cat=108&ccb=1-7&_nc_sid=9f807c&_nc_eui2=AeGP285HNvEwXz6Z66CXmN3AQxKAqcoQUfxDEoCpyhBR_KhOc-_Qg7WG2xvOyzsFxL7MeAtbugVVajGOjiN7Xogy&_nc_ohc=NMqUUx21bnwQ7kNvwGvnU8o&_nc_oc=Adl-SP8Im4GrzcFvVnmet3Kb2E0dsH0AGog2kzJx8G3Gd2rF4UNJwtEMnB00--C04ow&_nc_zt=23&_nc_ht=scontent.fhan3-3.fna&oh=03_Q7cD3AFT_L76I2T56JIljK34tpKzdldodEar6OlPS1AI-QSjGQ&oe=68B7E5A4',
        available: true,
        rating: 4.8,
        reviewCount: 156
    },
    { 
        id: 5, 
        name: 'Cafe Đen', 
        price: 20000, 
        category: 'coffee',
        description: 'Cà phê đen nguyên chất, đậm đà',
        image: 'https://scontent.fhan4-4.fna.fbcdn.net/v/t1.15752-9/524696028_756438240304371_4802309054759004427_n.jpg?_nc_cat=110&ccb=1-7&_nc_sid=9f807c&_nc_eui2=AeH9-1JumYAsKDP2yLHuyzTSkdmwVwrxN_GR2bBXCvE38aNiSvp-zqhmNG_JcNSZXg8zRjlPzANNmXuiHUBynmTQ&_nc_ohc=Orni7tR5jpIQ7kNvwHtnlvn&_nc_oc=Adn-Tf_xbSltep3JxHwiTb_9DqxvYLTWatbtglKe4xLxBJyG0fCTQqsUzHNK1iey6dU&_nc_zt=23&_nc_ht=scontent.fhan4-4.fna&oh=03_Q7cD3AE2StRUo0s4sncQjnNy0LWDW2uGvRcbpcxMVY4NddnmaA&oe=68B7C6E6',
        available: true,
        rating: 4.4,
        reviewCount: 89
    },
    { 
        id: 6, 
        name: 'Bạc Xỉu', 
        price: 25000, 
        category: 'coffee',
        description: 'Cà phê sữa ngọt ngào, êm dịu',
        image: 'https://scontent.fhan3-2.fna.fbcdn.net/v/t1.15752-9/525252571_1830106864204410_5423043039532890250_n.jpg?_nc_cat=107&ccb=1-7&_nc_sid=9f807c&_nc_eui2=AeHnjBkIBA_3UdRC1jDny04fCxvZVSxBV8ULG9lVLEFXxYRyzDZWE7nYDDHqvBdY8aGmijtG6aHVz04ZlvhmIYGZ&_nc_ohc=DDagvseztFsQ7kNvwHGiVup&_nc_oc=AdnD_DqkO6qaD5XGOftjim1CPB5UdElnNh4Tni8LaXaR1-KuFIBpbMB-sCxsntmLKCM&_nc_zt=23&_nc_ht=scontent.fhan3-2.fna&oh=03_Q7cD3AFc9vADx-fyXsnap2Oa-0_xdQZvcPJd80ZiOVpArO9pQyg&oe=68B7F5FB',
        available: true,
        rating: 4.9,
        reviewCount: 201
    },
    { 
        id: 7, 
        name: 'Cafe Muối', 
        price: 25000, 
        category: 'coffee',
        description: 'Cà phê muối độc đáo, vị mặn ngọt hài hòa',
        image: 'https://scontent.fhan4-3.fna.fbcdn.net/v/t1.15752-9/527701742_1652329582131347_4912877306807824192_n.jpg?_nc_cat=100&ccb=1-7&_nc_sid=9f807c&_nc_eui2=AeEi8I7vQX2E0wVVrwdZ3JsgrtWERo24LB2u1YRGjbgsHYLYJedcn6Obo6maELAgehhm59EP2Rkw1EwPg9rwrjqv&_nc_ohc=ZpukEEkKcwcQ7kNvwH99AgH&_nc_oc=Admq8nBZ6lLXCF2H8iVj8-zz42ArTq3YYskbgQ60LLIT1fQHK_IenQLoz6jiR1pzZnE&_nc_zt=23&_nc_ht=scontent.fhan4-3.fna&oh=03_Q7cD3AFWhNNMxj6VhWUwlS5J415p7hL7ElnDI0gmMb9gLOdLbA&oe=68B7D5FE',
        available: true,
        rating: 4.3,
        reviewCount: 67
    },
    { 
        id: 8, 
        name: 'Sữa Chua Lắc', 
        price: 25000, 
        category: 'smoothie',
        description: 'Sữa chua lắc mát lạnh, giàu dinh dưỡng',
        image: 'https://scontent.fhan4-1.fna.fbcdn.net/v/t1.15752-9/526441291_1269879847333066_3500046320414158270_n.jpg?_nc_cat=105&ccb=1-7&_nc_sid=9f807c&_nc_eui2=AeFyarHVjF3QnxKMb4YYwWz9F7FpOKRIH6oXsWk4pEgfqmFYv12w5gK5p9AIGLgx8QgkPg_-b0w_sdYrEQVdMw-B&_nc_ohc=5-B93Gxy0-EQ7kNvwGHfjj2&_nc_oc=Adm-4fOjPVX1QKYdRcV7_RCYCYSpIGbvEpQ_znV51k6PN9aFG_YBt2th064-0YPQAr4&_nc_zt=23&_nc_ht=scontent.fhan4-1.fna&oh=03_Q7cD3AFvXazCDxpd05IoGzWSMFeJVjzWMZNEweosl8D-vQeANQ&oe=68B7F3A9',
        available: true,
        rating: 4.5,
        reviewCount: 112
    },
    { 
        id: 9, 
        name: 'SC Lắc Dâu', 
        price: 30000, 
        category: 'smoothie',
        description: 'Sữa chua lắc dâu tây tươi ngon',
        image: 'https://scontent.fhan3-3.fna.fbcdn.net/v/t1.15752-9/526149395_2153801508467855_2307181939167630771_n.jpg?_nc_cat=108&ccb=1-7&_nc_sid=9f807c&_nc_eui2=AeE-gTrGzT9cmrciA4h22iJqcAlpSjQIa5dwCWlKNAhrl5WkzMAcZdJiDR-MA6CzY8oXXlNVuQwWK9ubGPGNf5o6&_nc_ohc=dv8zo7axIxYQ7kNvwEjrO1m&_nc_oc=AdllFenUYhdF6e_5nBlcMssAlFeCLokRcqu3IF4CQi8Sn1ndbPDiVlToLsYcEcY7O7w&_nc_zt=23&_nc_ht=scontent.fhan3-3.fna&oh=03_Q7cD3AGrPA15Ejy3ZArmQ3KQPugODcHDJ3vrwnSP3vnDwDBdjg&oe=68B7CC92',
        available: true,
        rating: 4.7,
        reviewCount: 98
    },
    { 
        id: 10, 
        name: 'SC Lắc Việt Quất', 
        price: 30000, 
        category: 'smoothie',
        description: 'Sữa chua lắc việt quất thơm ngon bổ dưỡng',
        image: 'https://scontent.fhan3-2.fna.fbcdn.net/v/t1.15752-9/525416436_1665455384143810_832299445849766471_n.jpg?_nc_cat=107&ccb=1-7&_nc_sid=9f807c&_nc_eui2=AeEiSK4_5ZzuCmS8D8bfflrlMe6RtTQ623Ux7pG1NDrbdRg9YANNAfrz_JSh_p2RL89NGl1VFIRA2XBeHCTvB-23&_nc_ohc=1cc_7dVXIMQQ7kNvwHwZmZ4&_nc_oc=AdlMVtlsESWWmCt3IY3GuOCZz-IhQs_DY3JniLzbhyhM0MFCgsogvMPP7rFy7GhPkpA&_nc_zt=23&_nc_ht=scontent.fhan3-2.fna&oh=03_Q7cD3AHDlBQ7uaCxAju3nDTXWt7fLFyFoDY1jAg-Dh5wTxndAw&oe=68B7C4B9',
        available: true,
        rating: 4.6,
        reviewCount: 76
    },
    { 
        id: 11, 
        name: 'Bim Bim', 
        price: 6000, 
        category: 'snacks',
        description: 'Snack giòn rụm, ăn vặt lý tưởng',
        image: 'https://scontent.fhan4-3.fna.fbcdn.net/v/t1.15752-9/524654314_1855264411999774_734793370755222912_n.jpg?_nc_cat=103&ccb=1-7&_nc_sid=9f807c&_nc_eui2=AeHycIby3yHpZwC1ev7S6XtT0515WdA5WfbTnXlZ0DlZ9mwbH-ZA4qGcmyT4UxtpZ6K8eIdVCcgmfq84MRvnub67&_nc_ohc=IzVMClZJ99cQ7kNvwFLeYLP&_nc_oc=Adnp6CU4pnefUdWqB18-0ViPPWKQaRcz9CEgoAmairJNAWFsW37-61Dsvlww6Icfwlc&_nc_zt=23&_nc_ht=scontent.fhan4-3.fna&oh=03_Q7cD3AE6Gm5_ECBuQQQmvni5sP9gr4o-2O2fVzKasuFUYLWijQ&oe=68B7CBCD',
        available: true,
        rating: 4.2,
        reviewCount: 54
    },
    { 
        id: 12, 
        name: 'Hướng Dương', 
        price: 10000, 
        category: 'snacks',
        description: 'Hạt hướng dương rang muối thơm béo',
        image: 'https://scontent.fhan4-3.fna.fbcdn.net/v/t1.15752-9/527231823_1330496755315334_823293477744792975_n.jpg?_nc_cat=100&ccb=1-7&_nc_sid=9f807c&_nc_eui2=AeGeTt6nz7F4x12G5Ojg1v0tSM3XShVapZBIzddKFVqlkAJHhNymSVRHbq0we9Z6QA3JFHB_aGCEwp8VH-D9wOc3&_nc_ohc=YAkstTobzxgQ7kNvwHhsam9&_nc_oc=Adl4aSopIwhLLiwzhoytB_HIG2cgMTMwnWkjo_Mas0cEghCnlbDrpT7Qy9VYGaWbsec&_nc_zt=23&_nc_ht=scontent.fhan4-3.fna&oh=03_Q7cD3AEKJy4RVDwl_cx_6oS4dVYI7ibXxF4ygd8-yGED2bRkww&oe=68B7EAD1',
        available: true,
        rating: 4.1,
        reviewCount: 43
    },
    { 
        id: 13, 
        name: 'Thăng Long Cứng', 
        price: 15000, 
        category: 'snacks',
        description: 'Bánh kẹo truyền thống Hà Nội',
        image: 'https://scontent.fhan3-2.fna.fbcdn.net/v/t1.15752-9/524655567_762633793162981_6459701164747945606_n.jpg?_nc_cat=107&ccb=1-7&_nc_sid=9f807c&_nc_eui2=AeEcNByng6NdTKccV05_kI8yqHKQorSebNCocpCitJ5s0O_yVn3xYuAoQY_dHuSVj4tig4t93xDF3_-uLqg8RUyy&_nc_ohc=2rAo6845W-EQ7kNvwHqDqk_&_nc_oc=AdlLigFFcdKwVsGV_VV6VubPOxTwkKdKE6uF0uCS0OrTdaINLWVjd_mDoYoiMtlLwak&_nc_zt=23&_nc_ht=scontent.fhan3-2.fna&oh=03_Q7cD3AFLdnqYJCKFb1PiRKB57Uot2VFQ7eZAvYEuYH_GJKSmdA&oe=68B7E56E',
        available: true,
        rating: 4.0,
        reviewCount: 32
    },
    { 
        id: 14, 
        name: 'Cay Cay', 
        price: 2000, 
        category: 'snacks',
        description: 'Kẹo cay cay ngọt ngọt, vị độc đáo',
        image: 'https://scontent.fhan4-3.fna.fbcdn.net/v/t1.15752-9/524132981_1489744015716698_6781836828722093721_n.jpg?_nc_cat=100&ccb=1-7&_nc_sid=9f807c&_nc_eui2=AeF7vfKvkHfK1bf6dVmf151lNQrvlhQa9YU1Cu-WFBr1hfTCrd46rbXFqT7TJ44VO8We8fk2gftcO3ZCV5jApdlP&_nc_ohc=H7CBZrURYxgQ7kNvwEtMQoh&_nc_oc=Adm0rrLEp8NWIkbZKOE_B4G3F5cdEYv7giZJR-DRWY7FSNP-tdDZCyOqY6mmYcL9NdU&_nc_zt=23&_nc_ht=scontent.fhan4-3.fna&oh=03_Q7cD3AHaJq_GK8osdhj1JDWGmJApcdJO3j7nQDzO4jDPpT5qlA&oe=68B7E877',
        available: true,
        rating: 3.9,
        reviewCount: 28
    }
];

// Customization options with enhanced pricing structure
const customizationOptions = {
    sugar: [
        { level: 100, name: '100%', price: 0 },
        { level: 70, name: '70%', price: 0 },
        { level: 50, name: '50%', price: 0 },
        { level: 30, name: '30%', price: 0 },
        { level: 0, name: 'Không đường', price: 0 }
    ],
    ice: [
        { level: 100, name: '100%', price: 0 },
        { level: 70, name: '70%', price: 0 },
        { level: 50, name: '50%', price: 0 },
        { level: 30, name: '30%', price: 0 },
        { level: 0, name: 'Không đá', price: 0 }
    ],
    toppings: [
        { name: 'Nha đam', price: 5000 },
        { name: 'Thạch dừa', price: 5000 },
        { name: 'Trân châu', price: 8000 },
        { name: 'Pudding', price: 8000 },
        { name: 'Kem cheese', price: 10000 }
    ]
};

// Application state
let cart = [];
let currentOrder = null;
let currentCustomizingItem = null;
let filteredMenuItems = [...menuItems];
let currentCategory = 'all';
let currentRating = 0;
let isOnline = navigator.onLine;

// DOM Elements
const elements = {
    // Header elements
    searchToggle: document.getElementById('searchToggle'),
    themeToggle: document.getElementById('themeToggle'),
    langToggle: document.getElementById('langToggle'),
    cartIcon: document.querySelector('.cart-icon'),
    cartCount: document.getElementById('cartCount'),
    
    // Search elements
    searchBar: document.getElementById('searchBar'),
    searchInput: document.getElementById('searchInput'),
    searchClose: document.getElementById('searchClose'),
    
    // Category elements
    categoryBtns: document.querySelectorAll('.category-btn'),
    
    // Menu elements
    menuGrid: document.getElementById('menu'),
    noResults: document.getElementById('noResults'),
    
    // Cart elements
    cartItems: document.getElementById('cart'),
    emptyCart: document.getElementById('emptyCart'),
    clearCartBtn: document.getElementById('clearCart'),
    subtotal: document.getElementById('subtotal'),
    totalPrice: document.getElementById('totalPrice'),
    
    // Discount elements
    discountCode: document.getElementById('discountCode'),
    applyDiscount: document.getElementById('applyDiscount'),
    discountInfo: document.getElementById('discountInfo'),
    discountAmount: document.getElementById('discountAmount'),
    discountValue: document.getElementById('discountValue'),
    
    // Order elements
    dineInBtn: document.getElementById('dineInBtn'),
    deliveryBtn: document.getElementById('deliveryBtn'),
    orderTracking: document.getElementById('orderTracking'),
    currentOrderStatus: document.getElementById('currentOrderStatus'),
    
    // Feedback elements
    feedbackStars: document.querySelectorAll('.stars i'),
    feedbackText: document.getElementById('feedbackText'),
    submitFeedback: document.getElementById('submitFeedback'),
    recentFeedback: document.getElementById('recentFeedback'),
    
    // Chat elements
    chatToggle: document.getElementById('chatToggle'),
    chatWindow: document.getElementById('chatWindow'),
    chatClose: document.getElementById('chatClose'),
    chatMessages: document.getElementById('chatMessages'),
    chatMessageInput: document.getElementById('chatMessageInput'),
    sendMessage: document.getElementById('sendMessage'),
    
    // Modal elements
    customizationModal: document.getElementById('customizationModal'),
    closeCustomizationModal: document.getElementById('closeCustomizationModal'),
    customizationItemName: document.getElementById('customizationItemName'),
    customizationItemImage: document.getElementById('customizationItemImage'),
    sugarOptions: document.getElementById('sugarOptions'),
    iceOptions: document.getElementById('iceOptions'),
    toppingOptions: document.getElementById('toppingOptions'),
    toppingGroup: document.getElementById('toppingGroup'),
    itemQuantity: document.getElementById('itemQuantity'),
    decreaseQty: document.getElementById('decreaseQty'),
    increaseQty: document.getElementById('increaseQty'),
    modalItemPrice: document.getElementById('modalItemPrice'),
    addToCartModalBtn: document.getElementById('addToCartModalBtn'),
    
    // Order modal elements
    orderModal: document.getElementById('orderModal'),
    closeOrderModal: document.getElementById('closeOrderModal'),
    orderModalTitle: document.getElementById('orderModalTitle'),
    orderOptions: document.getElementById('orderOptions'),
    submitOrderBtn: document.getElementById('submitOrderBtn'),
    
    // Loading screen
    loadingScreen: document.getElementById('loadingScreen')
};

// Discount codes
const discountCodes = {
    'WELCOME10': { type: 'percentage', value: 10, minOrder: 50000, description: 'Giảm 10% cho khách hàng mới' },
    'SAVE20K': { type: 'fixed', value: 20000, minOrder: 100000, description: 'Giảm 20.000đ cho đơn từ 100.000đ' },
    'STUDENT15': { type: 'percentage', value: 15, minOrder: 30000, description: 'Giảm 15% cho học sinh sinh viên' },
    'WEEKEND25': { type: 'fixed', value: 25000, minOrder: 150000, description: 'Giảm 25.000đ cuối tuần' }
};

let appliedDiscount = null;

// Initialize application
class DrinkOrderingApp {
    constructor() {
        this.initializeApp();
    }

    async initializeApp() {
        try {
            // Show loading screen
            this.showLoading(true);
            
            // Initialize core features
            await this.initializeCore();
            
            // Initialize Firebase listeners
            await this.initializeFirebaseListeners();
            
            // Initialize UI
            this.initializeUI();
            
            // Initialize event listeners
            this.initializeEventListeners();
            
            // Load saved data
            this.loadSavedData();
            
            // Hide loading screen
            setTimeout(() => {
                this.showLoading(false);
            }, 1500);
            
            console.log('✅ Application initialized successfully');
        } catch (error) {
            console.error('❌ Application initialization failed:', error);
            showNotification('Lỗi khởi tạo', 'Có lỗi xảy ra khi khởi tạo ứng dụng', 'error');
            this.showLoading(false);
        }
    }

    async initializeCore() {
        // Set initial theme
        this.initializeTheme();
        
        // Set initial language
        this.initializeLanguage();
        
        // Check online status
        this.initializeOnlineStatus();
        
        // Initialize PWA features
        this.initializePWA();
    }

    initializeTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeToggle(savedTheme);
    }

    initializeLanguage() {
        const savedLang = localStorage.getItem('language') || 'vi';
        setLanguage(savedLang);
        translatePage();
        this.updateLanguageToggle(savedLang);
    }

    initializeOnlineStatus() {
        window.addEventListener('online', () => {
            isOnline = true;
            showNotification('Đã kết nối', 'Kết nối internet đã được khôi phục', 'success');
        });

        window.addEventListener('offline', () => {
            isOnline = false;
            showNotification('Mất kết nối', 'Bạn đang ở chế độ offline', 'warning');
        });
    }

    initializePWA() {
        // Register service worker is handled in HTML
        
        // Handle app install prompt
        let deferredPrompt;
        
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            
            // Show install button/banner
            this.showInstallPrompt(deferredPrompt);
        });

        window.addEventListener('appinstalled', () => {
            showNotification('Cài đặt thành công', 'Ứng dụng đã được cài đặt', 'success');
            deferredPrompt = null;
        });
    }

    showInstallPrompt(prompt) {
        const installBanner = document.createElement('div');
        installBanner.className = 'install-banner';
        installBanner.innerHTML = `
            <div class="install-content">
                <i class="fas fa-download"></i>
                <span>Cài đặt ứng dụng để trải nghiệm tốt hơn</span>
                <button id="installBtn" class="install-btn">Cài đặt</button>
                <button id="dismissInstall" class="dismiss-btn">&times;</button>
            </div>
        `;
        
        document.body.appendChild(installBanner);
        
        document.getElementById('installBtn').addEventListener('click', async () => {
            prompt.prompt();
            const result = await prompt.userChoice;
            if (result.outcome === 'accepted') {
                console.log('User accepted the install prompt');
            }
            document.body.removeChild(installBanner);
        });
        
        document.getElementById('dismissInstall').addEventListener('click', () => {
            document.body.removeChild(installBanner);
        });
    }

    async initializeFirebaseListeners() {
        try {
            // Listen for order status updates
            const userOrders = query(
                collection(db, "orders"),
                where("customerInfo.phone", "==", localStorage.getItem('user_phone') || ''),
                orderBy("createdAt", "desc"),
                limit(10)
            );

            onSnapshot(userOrders, (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === "modified") {
                        const order = { id: change.doc.id, ...change.doc.data() };
                        this.handleOrderStatusUpdate(order);
                    }
                });
            });

            // Listen for promotions
            const promotions = query(
                collection(db, "promotions"),
                where("active", "==", true),
                orderBy("createdAt", "desc")
            );

            onSnapshot(promotions, (snapshot) => {
                this.updatePromotions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            });

            // Listen for feedback
            const feedback = query(
                collection(db, "feedback"),
                orderBy("createdAt", "desc"),
                limit(5)
            );

            onSnapshot(feedback, (snapshot) => {
                this.updateRecentFeedback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            });

        } catch (error) {
            console.error('Error setting up Firebase listeners:', error);
        }
    }

    initializeUI() {
        // Render menu
        this.renderMenu();
        
        // Render cart
        this.renderCart();
        
        // Update cart count
        this.updateCartCount();
        
        // Load promotions
        this.loadPromotions();
        
        // Load recent feedback
        this.loadRecentFeedback();
    }

    initializeEventListeners() {
        // Header events
        elements.searchToggle?.addEventListener('click', () => this.toggleSearch());
        elements.themeToggle?.addEventListener('click', () => this.toggleTheme());
        elements.langToggle?.addEventListener('click', () => this.toggleLanguage());
        elements.cartIcon?.addEventListener('click', () => this.scrollToCart());

        // Search events
        elements.searchClose?.addEventListener('click', () => this.toggleSearch());
        elements.searchInput?.addEventListener('input', (e) => this.handleSearch(e.target.value));

        // Category events
        elements.categoryBtns?.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleCategoryChange(e.target.dataset.category));
        });

        // Cart events
        elements.clearCartBtn?.addEventListener('click', () => this.clearCart());
        elements.dineInBtn?.addEventListener('click', () => this.showOrderModal('dine-in'));
        elements.deliveryBtn?.addEventListener('click', () => this.showOrderModal('delivery'));

        // Discount events
        elements.applyDiscount?.addEventListener('click', () => this.applyDiscountCode());
        elements.discountCode?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.applyDiscountCode();
        });

        // Feedback events
        elements.feedbackStars?.forEach((star, index) => {
            star.addEventListener('click', () => this.setRating(index + 1));
            star.addEventListener('mouseover', () => this.previewRating(index + 1));
        });
        elements.submitFeedback?.addEventListener('click', () => this.submitFeedback());

        // Chat events
        elements.chatToggle?.addEventListener('click', () => this.toggleChat());
        elements.chatClose?.addEventListener('click', () => this.toggleChat());
        elements.sendMessage?.addEventListener('click', () => this.sendChatMessage());
        elements.chatMessageInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendChatMessage();
        });

        // Modal events
        this.initializeModalEvents();

        // Keyboard shortcuts
        this.initializeKeyboardShortcuts();

        // Custom events
        this.initializeCustomEvents();
    }

    initializeModalEvents() {
        // Customization modal
        elements.closeCustomizationModal?.addEventListener('click', () => this.closeCustomizationModal());
        elements.addToCartModalBtn?.addEventListener('click', () => this.addToCartFromModal());
        elements.decreaseQty?.addEventListener('click', () => this.updateQuantity(-1));
        elements.increaseQty?.addEventListener('click', () => this.updateQuantity(1));
        elements.itemQuantity?.addEventListener('change', (e) => this.updateQuantity(0, parseInt(e.target.value)));

        // Order modal
        elements.closeOrderModal?.addEventListener('click', () => this.closeOrderModal());
        elements.submitOrderBtn?.addEventListener('click', () => this.submitOrder());

        // Close modals on backdrop click
        elements.customizationModal?.addEventListener('click', (e) => {
            if (e.target === elements.customizationModal) this.closeCustomizationModal();
        });
        elements.orderModal?.addEventListener('click', (e) => {
            if (e.target === elements.orderModal) this.closeOrderModal();
        });
    }

    initializeKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // ESC to close modals
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
            
            // Ctrl+K to open search
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                this.toggleSearch();
            }
            
            // Ctrl+D to toggle theme
            if (e.ctrlKey && e.key === 'd') {
                e.preventDefault();
                this.toggleTheme();
            }
        });
    }

    initializeCustomEvents() {
        // Listen for order updates from service worker
        navigator.serviceWorker?.addEventListener('message', (event) => {
            const { type, data } = event.data;
            
            switch (type) {
                case 'NAVIGATE':
                    this.handleNavigation(data.url, data.data);
                    break;
                case 'SYNC_OFFLINE_ORDERS':
                    this.syncOfflineOrders(data.orders);
                    break;
            }
        });

        // Listen for FCM events
        window.addEventListener('newOrder', (event) => {
            console.log('New order event received:', event.detail);
        });

        window.addEventListener('orderStatusUpdate', (event) => {
            this.handleOrderStatusUpdate(event.detail);
        });

        window.addEventListener('refreshPromotions', () => {
            this.loadPromotions();
        });
    }

    showLoading(show) {
        if (elements.loadingScreen) {
            if (show) {
                elements.loadingScreen.classList.remove('hidden');
            } else {
                elements.loadingScreen.classList.add('hidden');
            }
        }
    }

    // Theme management
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        this.updateThemeToggle(newTheme);
        
        showNotification(
            'Đã đổi chế độ',
            `Chế độ ${newTheme === 'dark' ? 'tối' : 'sáng'} đã được bật`,
            'info'
        );
    }

    updateThemeToggle(theme) {
        const icon = elements.themeToggle?.querySelector('i');
        if (icon) {
            icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }

    // Language management
    toggleLanguage() {
        const newLang = currentLanguage === 'vi' ? 'en' : 'vi';
        setLanguage(newLang);
        translatePage();
        this.updateLanguageToggle(newLang);
        
        showNotification(
            'Đã đổi ngôn ngữ',
            `Language changed to ${newLang === 'vi' ? 'Vietnamese' : 'English'}`,
            'info'
        );
    }

    updateLanguageToggle(lang) {
        const span = elements.langToggle?.querySelector('span');
        if (span) {
            span.textContent = lang.toUpperCase();
        }
    }

    // Search functionality
    toggleSearch() {
        const isActive = elements.searchBar?.classList.contains('active');
        
        if (isActive) {
            elements.searchBar.classList.remove('active');
            elements.searchInput.value = '';
            this.handleSearch('');
        } else {
            elements.searchBar?.classList.add('active');
            setTimeout(() => elements.searchInput?.focus(), 300);
        }
    }

    handleSearch(query) {
        const searchTerm = query.toLowerCase().trim();
        
        if (searchTerm === '') {
            filteredMenuItems = [...menuItems];
        } else {
            filteredMenuItems = menuItems.filter(item =>
                item.name.toLowerCase().includes(searchTerm) ||
                item.description.toLowerCase().includes(searchTerm) ||
                item.category.toLowerCase().includes(searchTerm)
            );
        }
        
        this.renderMenu();
    }

    // Category filtering
    handleCategoryChange(category) {
        currentCategory = category;
        
        // Update active category button
        elements.categoryBtns?.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === category);
        });
        
        // Filter menu items
        if (category === 'all') {
            filteredMenuItems = [...menuItems];
        } else {
            filteredMenuItems = menuItems.filter(item => item.category === category);
        }
        
        this.renderMenu();
    }

    // Menu rendering
    renderMenu() {
        if (!elements.menuGrid) return;
        
        elements.menuGrid.innerHTML = '';
        
        if (filteredMenuItems.length === 0) {
            elements.noResults?.style.setProperty('display', 'block');
            return;
        }
        
        elements.noResults?.style.setProperty('display', 'none');
        
        filteredMenuItems.forEach(item => {
            const itemElement = this.createMenuItemElement(item);
            elements.menuGrid.appendChild(itemElement);
        });
    }

    createMenuItemElement(item) {
        const div = document.createElement('div');
        div.className = 'menu-item';
        div.innerHTML = `
            <div class="menu-item-image">
                <img src="${item.image}" alt="${item.name}" loading="lazy">
                <div class="menu-item-overlay">
                    <div class="item-rating">
                        <i class="fas fa-star"></i>
                        <span>${item.rating}</span>
                        <span>(${item.reviewCount})</span>
                    </div>
                    ${!item.available ? '<div class="item-unavailable">Hết hàng</div>' : ''}
                </div>
            </div>
            <div class="menu-item-content">
                <h3>${item.name}</h3>
                <p class="menu-item-description">${item.description}</p>
                <div class="menu-item-price">${item.price.toLocaleString('vi-VN')} VNĐ</div>
                <button class="customize-btn" ${!item.available ? 'disabled' : ''}>
                    <i class="fas fa-plus"></i>
                    <span data-translate="add_to_cart">Thêm vào giỏ</span>
                </button>
            </div>
        `;
        
        if (item.available) {
            div.querySelector('.customize-btn').addEventListener('click', () => {
                this.showCustomizationModal(item);
            });
        }
        
        return div;
    }

    // Customization modal
    showCustomizationModal(item) {
        currentCustomizingItem = item;
        
        elements.customizationItemName.textContent = item.name;
        elements.customizationItemImage.src = item.image;
        elements.customizationItemImage.alt = item.name;
        
        // Reset quantity
        elements.itemQuantity.value = 1;
        
        // Render customization options
        this.renderCustomizationOptions();
        
        // Show/hide topping options based on item category
        const showToppings = ['tea', 'smoothie'].includes(item.category);
        elements.toppingGroup.style.display = showToppings ? 'block' : 'none';
        
        // Update price
        this.updateModalPrice();
        
        // Show modal
        elements.customizationModal?.classList.add('active');
    }

    renderCustomizationOptions() {
        // Render sugar options
        elements.sugarOptions.innerHTML = customizationOptions.sugar
            .map((option, index) => `
                <div class="option-item ${index === 0 ? 'selected' : ''}" data-value="${option.level}">
                    <input type="radio" name="sugar" value="${option.level}" ${index === 0 ? 'checked' : ''}>
                    <span>${option.name}</span>
                </div>
            `).join('');

        // Render ice options
        elements.iceOptions.innerHTML = customizationOptions.ice
            .map((option, index) => `
                <div class="option-item ${index === 0 ? 'selected' : ''}" data-value="${option.level}">
                    <input type="radio" name="ice" value="${option.level}" ${index === 0 ? 'checked' : ''}>
                    <span>${option.name}</span>
                </div>
            `).join('');

        // Render topping options
        elements.toppingOptions.innerHTML = customizationOptions.toppings
            .map(topping => `
                <div class="option-item" data-value="${topping.name}" data-price="${topping.price}">
                    <input type="checkbox" name="topping" value="${topping.name}">
                    <span>${topping.name} (+${topping.price.toLocaleString('vi-VN')} VNĐ)</span>
                </div>
            `).join('');

        // Add event listeners
        this.addOptionEventListeners();
    }

    addOptionEventListeners() {
        // Sugar and ice option listeners
        document.querySelectorAll('#sugarOptions .option-item, #iceOptions .option-item').forEach(item => {
            item.addEventListener('click', () => {
                const input = item.querySelector('input');
                input.checked = true;
                
                // Update visual selection
                item.parentElement.querySelectorAll('.option-item').forEach(opt => {
                    opt.classList.remove('selected');
                });
                item.classList.add('selected');
                
                this.updateModalPrice();
            });
        });

        // Topping option listeners
        document.querySelectorAll('#toppingOptions .option-item').forEach(item => {
            item.addEventListener('click', () => {
                const input = item.querySelector('input');
                input.checked = !input.checked;
                item.classList.toggle('selected', input.checked);
                
                this.updateModalPrice();
            });
        });
    }

    updateQuantity(change, value = null) {
        const currentQty = parseInt(elements.itemQuantity.value);
        let newQty;
        
        if (value !== null) {
            newQty = Math.max(1, value);
        } else {
            newQty = Math.max(1, currentQty + change);
        }
        
        elements.itemQuantity.value = newQty;
        this.updateModalPrice();
    }

    updateModalPrice() {
        if (!currentCustomizingItem) return;
        
        const quantity = parseInt(elements.itemQuantity.value);
        const selectedToppings = Array.from(document.querySelectorAll('#toppingOptions input:checked'));
        
        let totalPrice = currentCustomizingItem.price;
        selectedToppings.forEach(topping => {
            totalPrice += parseInt(topping.parentElement.dataset.price);
        });
        
        totalPrice *= quantity;
        
        elements.modalItemPrice.textContent = `${totalPrice.toLocaleString('vi-VN')} VNĐ`;
    }

    addToCartFromModal() {
        if (!currentCustomizingItem) return;
        
        const quantity = parseInt(elements.itemQuantity.value);
        const selectedSugar = document.querySelector('input[name="sugar"]:checked')?.value || '100';
        const selectedIce = document.querySelector('input[name="ice"]:checked')?.value || '100';
        const selectedToppings = Array.from(document.querySelectorAll('#toppingOptions input:checked'))
            .map(cb => ({
                name: cb.value,
                price: parseInt(cb.parentElement.dataset.price)
            }));

        const toppingPrice = selectedToppings.reduce((total, topping) => total + topping.price, 0);
        const itemPrice = currentCustomizingItem.price + toppingPrice;

        // Check if similar item exists in cart
        const existingItemIndex = cart.findIndex(item =>
            item.id === currentCustomizingItem.id &&
            item.sugar === selectedSugar &&
            item.ice === selectedIce &&
            JSON.stringify(item.toppings) === JSON.stringify(selectedToppings)
        );

        if (existingItemIndex !== -1) {
            cart[existingItemIndex].quantity += quantity;
        } else {
            cart.push({
                ...currentCustomizingItem,
                quantity,
                sugar: selectedSugar,
                ice: selectedIce,
                toppings: selectedToppings,
                price: itemPrice,
                customization: this.getCustomizationText(selectedSugar, selectedIce, selectedToppings)
            });
        }

        this.renderCart();
        this.updateCartCount();
        this.saveCartToStorage();
        this.closeCustomizationModal();
        
        showNotification(
            'Đã thêm vào giỏ',
            `${currentCustomizingItem.name} (x${quantity})`,
            'success'
        );

        // Animate cart icon
        this.animateCartIcon();
    }

    getCustomizationText(sugar, ice, toppings) {
        const parts = [];
        
        if (sugar !== '100') parts.push(`${sugar}% đường`);
        if (ice !== '100') parts.push(`${ice}% đá`);
        if (toppings.length > 0) {
            parts.push(`Topping: ${toppings.map(t => t.name).join(', ')}`);
        }
        
        return parts.join(', ');
    }

    animateCartIcon() {
        elements.cartIcon?.classList.add('bounce');
        setTimeout(() => {
            elements.cartIcon?.classList.remove('bounce');
        }, 600);
    }

    closeCustomizationModal() {
        elements.customizationModal?.classList.remove('active');
        currentCustomizingItem = null;
    }

    // Cart management
    renderCart() {
        if (!elements.cartItems) return;
        
        if (cart.length === 0) {
            elements.cartItems.innerHTML = `
                <div id="emptyCart" class="empty-cart">
                    <i class="fas fa-shopping-cart"></i>
                    <p data-translate="empty_cart">Giỏ hàng trống</p>
                </div>
            `;
            this.updateCartSummary();
            return;
        }
        
        elements.cartItems.innerHTML = cart.map((item, index) => `
            <div class="cart-item">
                <img src="${item.image}" alt="${item.name}">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    ${item.customization ? `<div class="cart-item-customization">${item.customization}</div>` : ''}
                    <div class="cart-item-price">${(item.price * item.quantity).toLocaleString('vi-VN')} VNĐ</div>
                </div>
                <div class="cart-item-controls">
                    <button class="quantity-btn" onclick="app.updateCartItemQuantity(${index}, -1)">-</button>
                    <span class="quantity-display">${item.quantity}</span>
                    <button class="quantity-btn" onclick="app.updateCartItemQuantity(${index}, 1)">+</button>
                    <button class="remove-btn" onclick="app.removeCartItem(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
        
        this.updateCartSummary();
    }

    updateCartItemQuantity(index, change) {
        if (cart[index]) {
            cart[index].quantity = Math.max(1, cart[index].quantity + change);
            this.renderCart();
            this.updateCartCount();
            this.saveCartToStorage();
        }
    }

    removeCartItem(index) {
        if (cart[index]) {
            const item = cart[index];
            cart.splice(index, 1);
            
            this.renderCart();
            this.updateCartCount();
            this.saveCartToStorage();
            
            showNotification(
                'Đã xóa khỏi giỏ',
                item.name,
                'info'
            );
        }
    }

    clearCart() {
        if (cart.length === 0) return;
        
        if (confirm('Bạn có chắc muốn xóa tất cả sản phẩm trong giỏ hàng?')) {
            cart = [];
            appliedDiscount = null;
            
            this.renderCart();
            this.updateCartCount();
            this.saveCartToStorage();
            
            showNotification('Đã xóa giỏ hàng', 'Tất cả sản phẩm đã được xóa', 'info');
        }
    }

    updateCartCount() {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        if (elements.cartCount) {
            elements.cartCount.textContent = totalItems;
            elements.cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
        }
    }

    updateCartSummary() {
        const subtotalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        let discountAmount = 0;
        
        if (appliedDiscount) {
            if (appliedDiscount.type === 'percentage') {
                discountAmount = Math.floor(subtotalAmount * appliedDiscount.value / 100);
            } else {
                discountAmount = appliedDiscount.value;
            }
        }
        
        const totalAmount = Math.max(0, subtotalAmount - discountAmount);
        
        if (elements.subtotal) {
            elements.subtotal.textContent = `${subtotalAmount.toLocaleString('vi-VN')} VNĐ`;
        }
        
        if (discountAmount > 0) {
            elements.discountAmount?.style.setProperty('display', 'flex');
            if (elements.discountValue) {
                elements.discountValue.textContent = `-${discountAmount.toLocaleString('vi-VN')} VNĐ`;
            }
        } else {
            elements.discountAmount?.style.setProperty('display', 'none');
        }
        
        if (elements.totalPrice) {
            elements.totalPrice.textContent = `${totalAmount.toLocaleString('vi-VN')} VNĐ`;
        }
        
        // Enable/disable order buttons
        const hasItems = cart.length > 0;
        if (elements.dineInBtn) elements.dineInBtn.disabled = !hasItems;
        if (elements.deliveryBtn) elements.deliveryBtn.disabled = !hasItems;
    }

    scrollToCart() {
        document.querySelector('.cart-section')?.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
    }

    // Discount management
    applyDiscountCode() {
        const code = elements.discountCode?.value.trim().toUpperCase();
        if (!code) return;
        
        const discount = discountCodes[code];
        if (!discount) {
            showNotification('Mã không hợp lệ', 'Mã giảm giá không tồn tại', 'error');
            return;
        }
        
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        if (subtotal < discount.minOrder) {
            showNotification(
                'Không đủ điều kiện',
                `Đơn hàng tối thiểu ${discount.minOrder.toLocaleString('vi-VN')} VNĐ`,
                'warning'
            );
            return;
        }
        
        appliedDiscount = discount;
        elements.discountCode.value = '';
        
        // Show discount info
        elements.discountInfo.style.display = 'block';
        elements.discountInfo.textContent = `✅ ${discount.description}`;
        
        this.updateCartSummary();
        
        showNotification(
            'Mã giảm giá áp dụng',
            discount.description,
            'success'
        );
    }

    // Order management
    showOrderModal(type) {
        if (cart.length === 0) {
            showNotification('Giỏ hàng trống', 'Vui lòng thêm sản phẩm vào giỏ hàng', 'warning');
            return;
        }
        
        elements.orderModalTitle.textContent = type === 'dine-in' ? 'Uống Tại Chỗ' : 'Đặt Giao Hàng';
        
        this.renderOrderForm(type);
        elements.orderModal?.classList.add('active');
    }

    renderOrderForm(type) {
        if (type === 'dine-in') {
            elements.orderOptions.innerHTML = `
                <div class="form-group">
                    <label data-translate="table_number">Số bàn</label>
                    <select id="tableNumber" required>
                        <option value="">Chọn số bàn</option>
                        ${Array.from({length: 20}, (_, i) => `<option value="${i + 1}">Bàn ${i + 1}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label data-translate="customer_name">Tên khách hàng</label>
                    <input type="text" id="customerName" placeholder="Nhập tên của bạn" required>
                </div>
                <div class="form-group">
                    <label data-translate="note">Ghi chú</label>
                    <textarea id="orderNote" placeholder="Ghi chú đặc biệt (không bắt buộc)"></textarea>
                </div>
            `;
        } else {
            elements.orderOptions.innerHTML = `
                <div class="form-group">
                    <label data-translate="customer_name">Tên khách hàng</label>
                    <input type="text" id="customerName" placeholder="Nhập tên của bạn" required>
                </div>
                <div class="form-group">
                    <label data-translate="phone">Số điện thoại</label>
                    <input type="tel" id="customerPhone" placeholder="Nhập số điện thoại" required>
                </div>
                <div class="form-group">
                    <label data-translate="address">Địa chỉ giao hàng</label>
                    <textarea id="customerAddress" placeholder="Nhập địa chỉ chi tiết" required></textarea>
                </div>
                <div class="form-group">
                    <label data-translate="note">Ghi chú</label>
                    <textarea id="orderNote" placeholder="Ghi chú đặc biệt (không bắt buộc)"></textarea>
                </div>
            `;
        }
        
        // Load saved customer info
        this.loadSavedCustomerInfo();
    }

    loadSavedCustomerInfo() {
        const savedInfo = JSON.parse(localStorage.getItem('customer_info') || '{}');
        
        Object.keys(savedInfo).forEach(key => {
            const element = document.getElementById(key);
            if (element) element.value = savedInfo[key];
        });
    }

    saveCustomerInfo() {
        const customerInfo = {};
        const fields = ['customerName', 'customerPhone', 'customerAddress', 'tableNumber'];
        
        fields.forEach(field => {
            const element = document.getElementById(field);
            if (element && element.value) {
                customerInfo[field] = element.value;
            }
        });
        
        localStorage.setItem('customer_info', JSON.stringify(customerInfo));
    }

    async submitOrder() {
        try {
            // Validate form
            const form = elements.orderOptions;
            const requiredFields = form.querySelectorAll('[required]');
            let isValid = true;
            
            requiredFields.forEach(field => {
                if (!field.value.trim()) {
                    field.classList.add('error');
                    isValid = false;
                } else {
                    field.classList.remove('error');
                }
            });
            
            if (!isValid) {
                showNotification('Lỗi nhập liệu', 'Vui lòng điền đầy đủ thông tin bắt buộc', 'error');
                return;
            }
            
            // Prepare order data
            const orderData = this.prepareOrderData();
            
            // Save customer info
            this.saveCustomerInfo();
            
            // Show loading
            elements.submitOrderBtn.disabled = true;
            elements.submitOrderBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
            
            // Submit order
            const docRef = await addDoc(collection(db, "orders"), orderData);
            
            // Success
            showNotification(
                'Đặt hàng thành công!',
                `Mã đơn hàng: ${docRef.id}`,
                'success'
            );
            
            // Store order ID for tracking
            localStorage.setItem('current_order_id', docRef.id);
            
            // Clear cart and close modal
            cart = [];
            appliedDiscount = null;
            this.renderCart();
            this.updateCartCount();
            this.saveCartToStorage();
            this.closeOrderModal();
            
            // Show order tracking
            this.showOrderTracking(docRef.id);
            
        } catch (error) {
            console.error('Error submitting order:', error);
            const friendlyError = handleFirebaseError(error, 'submitting order');
            showNotification('Lỗi đặt hàng', friendlyError, 'error');
        } finally {
            // Reset button
            elements.submitOrderBtn.disabled = false;
            elements.submitOrderBtn.innerHTML = '<span data-translate="submit_order">Gửi Đơn Hàng</span>';
        }
    }

    prepareOrderData() {
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        let discountAmount = 0;
        
        if (appliedDiscount) {
            if (appliedDiscount.type === 'percentage') {
                discountAmount = Math.floor(subtotal * appliedDiscount.value / 100);
            } else {
                discountAmount = appliedDiscount.value;
            }
        }
        
        const totalPrice = Math.max(0, subtotal - discountAmount);
        
        const customerName = document.getElementById('customerName')?.value || '';
        const customerPhone = document.getElementById('customerPhone')?.value || '';
        const customerAddress = document.getElementById('customerAddress')?.value || '';
        const tableNumber = document.getElementById('tableNumber')?.value || '';
        const orderNote = document.getElementById('orderNote')?.value || '';
        
        const orderType = tableNumber ? 'Uống tại chỗ' : 'Giao hàng';
        
        const orderData = {
            items: cart.map(item => ({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                sugar: item.sugar || '100',
                ice: item.ice || '100',
                toppings: item.toppings || [],
                customization: item.customization || ''
            })),
            customerInfo: {
                type: orderType,
                customerName,
                ...(customerPhone && { phone: customerPhone }),
                ...(customerAddress && { address: customerAddress }),
                ...(tableNumber && { tableNumber })
            },
            subtotal,
            discountAmount,
            totalPrice,
            note: orderNote,
            status: 'Đang chờ xử lý',
            isPaid: false,
            createdAt: Timestamp.now(),
            appliedDiscount: appliedDiscount ? {
                code: appliedDiscount.code,
                type: appliedDiscount.type,
                value: appliedDiscount.value,
                amount: discountAmount
            } : null
        };
        
        return orderData;
    }

    closeOrderModal() {
        elements.orderModal?.classList.remove('active');
    }

    // Order tracking
    showOrderTracking(orderId) {
        elements.orderTracking.style.display = 'block';
        this.updateOrderStatus(orderId, 'Đang chờ xử lý');
        
        // Scroll to tracking section
        elements.orderTracking.scrollIntoView({ behavior: 'smooth' });
    }

    updateOrderStatus(orderId, status) {
        const statusSteps = {
            'Đang chờ xử lý': { icon: 'clock', label: 'Đặt hàng', active: true },
            'Đang chuẩn bị': { icon: 'utensils', label: 'Chuẩn bị', active: true },
            'Đã hoàn thành': { icon: 'check', label: 'Hoàn thành', active: true },
            'Đã giao': { icon: 'truck', label: 'Đã giao', active: true }
        };
        
        const currentStepIndex = Object.keys(statusSteps).indexOf(status);
        
        elements.currentOrderStatus.innerHTML = Object.entries(statusSteps)
            .map(([stepStatus, stepInfo], index) => {
                const isActive = index <= currentStepIndex;
                const isCompleted = index < currentStepIndex;
                
                return `
                    <div class="status-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}">
                        <div class="status-icon">
                            <i class="fas fa-${stepInfo.icon}"></i>
                        </div>
                        <div class="status-label">${stepInfo.label}</div>
                    </div>
                `;
            }).join('');
    }

    handleOrderStatusUpdate(order) {
        // Update order tracking if it's the current order
        const currentOrderId = localStorage.getItem('current_order_id');
        if (order.id === currentOrderId) {
            this.updateOrderStatus(order.id, order.status);
            
            showNotification(
                'Cập nhật đơn hàng',
                `Đơn hàng #${order.id.substring(0, 8)} đã ${order.status}`,
                'info'
            );
        }
    }

    // Feedback system
    setRating(rating) {
        currentRating = rating;
        this.updateStarDisplay(rating);
    }

    previewRating(rating) {
        this.updateStarDisplay(rating);
    }

    updateStarDisplay(rating) {
        elements.feedbackStars?.forEach((star, index) => {
            star.classList.toggle('active', index < rating);
        });
    }

    async submitFeedback() {
        if (currentRating === 0) {
            showNotification('Thiếu đánh giá', 'Vui lòng chọn số sao đánh giá', 'warning');
            return;
        }
        
        const feedbackText = elements.feedbackText?.value.trim();
        if (!feedbackText) {
            showNotification('Thiếu nội dung', 'Vui lòng nhập nội dung phản hồi', 'warning');
            return;
        }
        
        try {
            const feedbackData = {
                rating: currentRating,
                text: feedbackText,
                customerName: localStorage.getItem('customerName') || 'Khách hàng',
                createdAt: Timestamp.now(),
                orderId: localStorage.getItem('current_order_id') || null
            };
            
            await addDoc(collection(db, "feedback"), feedbackData);
            
            showNotification(
                'Cảm ơn phản hồi!',
                'Đánh giá của bạn đã được gửi thành công',
                'success'
            );
            
            // Reset form
            currentRating = 0;
            elements.feedbackText.value = '';
            this.updateStarDisplay(0);
            
        } catch (error) {
            console.error('Error submitting feedback:', error);
            const friendlyError = handleFirebaseError(error, 'submitting feedback');
            showNotification('Lỗi gửi phản hồi', friendlyError, 'error');
        }
    }

    updateRecentFeedback(feedbacks) {
        if (!elements.recentFeedback) return;
        
        elements.recentFeedback.innerHTML = feedbacks.map(feedback => `
            <div class="feedback-item">
                <div class="feedback-header">
                    <div class="feedback-rating">
                        ${Array(5).fill().map((_, i) => `
                            <i class="fas fa-star ${i < feedback.rating ? 'active' : ''}"></i>
                        `).join('')}
                    </div>
                    <div class="feedback-date">${feedback.createdAt.toDate().toLocaleDateString('vi-VN')}</div>
                </div>
                <div class="feedback-text">${feedback.text}</div>
            </div>
        `).join('');
    }

    async loadRecentFeedback() {
        try {
            const feedbackQuery = query(
                collection(db, "feedback"),
                orderBy("createdAt", "desc"),
                limit(5)
            );
            
            const snapshot = await getDocs(feedbackQuery);
            const feedbacks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.updateRecentFeedback(feedbacks);
        } catch (error) {
            console.error('Error loading feedback:', error);
        }
    }

    // Chat system
    toggleChat() {
        const isActive = elements.chatWindow?.classList.contains('active');
        
        if (isActive) {
            elements.chatWindow.classList.remove('active');
        } else {
            elements.chatWindow?.classList.add('active');
            elements.chatToggle?.classList.remove('has-new-message');
        }
    }

    sendChatMessage() {
        const message = elements.chatMessageInput?.value.trim();
        if (!message) return;
        
        this.addChatMessage(message, 'user');
        elements.chatMessageInput.value = '';
        
        // Simulate bot response (in real app, this would be handled by server)
        setTimeout(() => {
            const responses = [
                'Cảm ơn bạn đã liên hệ! Chúng tôi sẽ hỗ trợ bạn ngay.',
                'Bạn có thể cho tôi biết thêm chi tiết về vấn đề không?',
                'Chúng tôi đã ghi nhận yêu cầu của bạn và sẽ phản hồi sớm.',
                'Bạn có cần hỗ trợ gì khác không?'
            ];
            const randomResponse = responses[Math.floor(Math.random() * responses.length)];
            this.addChatMessage(randomResponse, 'bot');
        }, 1000);
    }

    //addChatMessage(message, type) {
     //   const messageElement = document.createElement('div');
     //   messageElement.className = `chat-message ${type}`;
    //    messageElement.textContent = message;
        
    //    elements.chatMessages?.appendChild(messageElement);
    //    elements.chatMessages?.scrollTop = elements.chatMessages.scrollHeight;
    //}

    // Promotion management
    async loadPromotions() {
        try {
            const promotionsQuery = query(
                collection(db, "promotions"),
                where("active", "==", true),
                where("endDate", ">=", Timestamp.now()),
                orderBy("endDate"),
                limit(1)
            );
            
            const snapshot = await getDocs(promotionsQuery);
            if (!snapshot.empty) {
                const promotion = snapshot.docs[0].data();
                this.updateCurrentPromotion(promotion);
            }
        } catch (error) {
            console.error('Error loading promotions:', error);
        }
    }

    updatePromotions(promotions) {
        if (promotions.length > 0) {
            this.updateCurrentPromotion(promotions[0]);
        }
    }

    updateCurrentPromotion(promotion) {
        const promoElement = document.getElementById('currentPromotion');
        if (promoElement) {
            promoElement.textContent = promotion.description || promotion.name;
        }
    }

    // Utility methods
    saveCartToStorage() {
        localStorage.setItem('cart', JSON.stringify(cart));
        localStorage.setItem('applied_discount', JSON.stringify(appliedDiscount));
    }

    loadSavedData() {
        // Load cart
        const savedCart = localStorage.getItem('cart');
        if (savedCart) {
            cart = JSON.parse(savedCart);
            this.renderCart();
            this.updateCartCount();
        }
        
        // Load discount
        const savedDiscount = localStorage.getItem('applied_discount');
        if (savedDiscount) {
            appliedDiscount = JSON.parse(savedDiscount);
            if (appliedDiscount) {
                elements.discountInfo.style.display = 'block';
                elements.discountInfo.textContent = `✅ ${appliedDiscount.description}`;
            }
        }
    }

    closeAllModals() {
        elements.customizationModal?.classList.remove('active');
        elements.orderModal?.classList.remove('active');
    }

    handleNavigation(url, data) {
        // Handle navigation from service worker
        if (url.includes('#')) {
            const hash = url.split('#')[1];
            const element = document.getElementById(hash);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }

    async syncOfflineOrders(orders) {
        try {
            for (const order of orders) {
                await addDoc(collection(db, "orders"), order);
            }
            
            // Clear offline orders
            localStorage.removeItem('offline_orders');
            
            showNotification(
                'Đồng bộ thành công',
                `${orders.length} đơn hàng offline đã được đồng bộ`,
                'success'
            );
        } catch (error) {
            console.error('Error syncing offline orders:', error);
        }
    }
}

// Initialize app when DOM is loaded
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new DrinkOrderingApp();
    
    // Make app globally accessible for inline event handlers
    window.app = app;
});

// Export for other modules
export default DrinkOrderingApp;

