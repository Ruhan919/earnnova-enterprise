// =============================================
// EARNNOVA BETA - Main App Module
// =============================================

// Hide splash after loading
setTimeout(() => {
    document.getElementById('splashScreen').classList.add('hide');
    if (!auth.currentUser) {
        showAuthPage('login');
    }
}, 2000);

// Show the app shell
function showApp(userData) {
    document.getElementById('splashScreen').classList.add('hide');
    document.getElementById('authPage').classList.remove('active');
    document.getElementById('appPage').classList.add('active');
    
    // Load user data into UI
    loadDashboard();
    
    // Load admin data if applicable
    if (userData.isAdmin) {
        loadAdminDashboard();
    }
    
    // Request FCM notification permission (after short delay)
    setTimeout(() => {
        if (typeof requestFcmPermission === 'function') {
            requestFcmPermission();
        }
    }, 3000);
    
    // Navigate to default page
    navigateTo('dashboard');
}

// ===== ROUTING =====
function navigateTo(page) {
    // Hide all pages
    document.querySelectorAll('.page-content').forEach(p => p.style.display = 'none');
    
    // Show target page
    const target = document.getElementById('page-' + page);
    if (target) {
        target.style.display = 'block';
    }
    
    // Update sidebar active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) {
            item.classList.add('active');
        }
    });
    
    // Load page-specific data
    switch(page) {
        case 'dashboard':
            loadRecentTransactions();
            break;
        case 'earn':
            loadAds();
            break;
        case 'history':
            loadHistory();
            break;
        case 'referrals':
            loadReferrals();
            break;
        case 'notifications':
            loadNotifications();
            break;
        // Admin pages
        case 'admin-dashboard':
            if (currentUserData && currentUserData.isAdmin) loadAdminDashboard();
            break;
        case 'admin-users':
            if (currentUserData && currentUserData.isAdmin) loadAdminUsers();
            break;
        case 'admin-withdrawals':
            if (currentUserData && currentUserData.isAdmin) loadAdminWithdrawals();
            break;
        case 'admin-ads':
            if (currentUserData && currentUserData.isAdmin) loadAdminAds();
            break;
        case 'admin-reports':
            if (currentUserData && currentUserData.isAdmin) loadAdminReports();
            break;
    }
}

// Sidebar navigation
document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', () => {
        const page = item.dataset.page;
        // Check admin access
        if (page.startsWith('admin-') && (!currentUserData || !currentUserData.isAdmin)) {
            showAlert('Admin access required', 'error');
            return;
        }
        navigateTo(page);
        // Close mobile sidebar
        document.getElementById('sidebar').classList.remove('open');
    });
});

// Mobile toggle
document.getElementById('mobileToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
});

// ===== SERVICE WORKER REGISTRATION (PWA) =====
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js')
            .then(reg => console.log('SW registered:', reg.scope))
            .catch(err => console.log('SW registration failed:', err));
    });
}

// ===== CHECK FOR REFERRAL CODE IN URL =====
(function checkReferral() {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');
    if (refCode) {
        document.getElementById('regReferral').value = refCode;
        showAuthPage('register');
    }
})();

// ===== GLOBAL ERROR HANDLER =====
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error || e.message);
    // Try to log to Firebase
    try {
        db.collection('web_errors').add({
            message: e.message || 'Unknown error',
            url: window.location.href,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            userAgent: navigator.userAgent
        }).catch(() => {});
    } catch (_) {}
    return false;
});

// ===== PWA INSTALL PROMPT =====
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    // Show install banner (optional)
    console.log('PWA install available');
});

// Console branding
console.log(`
███████╗ █████╗ ██████╗ ███╗   ██╗███╗   ██╗ ██████╗ ██╗   ██╗ █████╗ 
██╔════╝██╔══██╗██╔══██╗████╗  ██║████╗  ██║██╔═══██╗██║   ██║██╔══██╗
█████╗  ███████║██████╔╝██╔██╗ ██║██╔██╗ ██║██║   ██║██║   ██║███████║
██╔══╝  ██╔══██║██╔══██╗██║╚██╗██║██║╚██╗██║██║   ██║╚██╗ ██╔╝██╔══██║
███████╗██║  ██║██║  ██║██║ ╚████║██║ ╚████║╚██████╔╝ ╚████╔╝ ██║  ██║
╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═══╝ ╚═════╝   ╚═══╝  ╚═╝  ╚═╝
                                                                         
██╗  ██╗██████╗ ███████╗████████╗ █████╗ 
██║  ██║██╔══██╗██╔════╝╚══██╔══╝██╔══██╗
███████║██████╔╝█████╗     ██║   ███████║
██╔══██║██╔══██╗██╔══╝     ██║   ██╔══██║
██║  ██║██████╔╝███████╗   ██║   ██║  ██║
╚═╝  ╚═╝╚═════╝ ╚══════╝   ╚═╝   ╚═╝  ╚═╝
                                            
EARN. GROW. THRIVE. - v1.0.0 BETA
=============================================`);
