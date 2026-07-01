// Firebase Configuration - EARNNOVA BETA Web
// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAoo2-X5ILICXR2mFAyUhqJYpvScChlsOc",
    authDomain: "earnnovabeta.firebaseapp.com",
    projectId: "earnnovabeta",
    storageBucket: "earnnovabeta.firebasestorage.app",
    messagingSenderId: "458557664673",
    appId: "1:458557664673:web:12bfc1789f0c5ebe43afe0",
    measurementId: "G-BNWP93VWD4",
    // Web Push VAPID key for FCM
    vapidKey: "BF6HQ1yqzgqWU5AvRx-nE6O1_9szh1UAOVrbja9Jiglcxg0UT5AMBYA-i2y9T9Kt1fFV98-xaEADDPAiLx_YCEw"
};

// For modular SDK (v9+), uncomment and use these imports at the top of your script:
/*
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence, collection, doc } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
*/

// Using compat SDK (v8) for direct script tag usage:
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Analytics (optional)
const analytics = firebase.analytics();

// Get FCM messaging instance
const messaging = firebase.messaging();

// Request notification permission and get FCM token
function requestFcmPermission() {
    if (!('Notification' in window)) return;
    
    Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
            console.log('Notification permission granted');
            messaging.getToken({ vapidKey: firebaseConfig.vapidKey }).then(token => {
                console.log('FCM Token:', token);
                // Store token in Firestore for sending notifications
                if (currentUser) {
                    usersRef.doc(currentUser.uid).update({
                        fcmToken: token
                    }).catch(err => console.warn('FCM token save error:', err));
                }
            }).catch(err => {
                console.warn('FCM token error:', err);
            });
        }
    }).catch(err => {
        console.warn('Notification permission error:', err);
    });
}

// Handle foreground messages
messaging.onMessage(payload => {
    console.log('Foreground message:', payload);
    const { title, body } = payload.notification || {};
    if (title) {
        // Show in-app notification
        showAlert(`${title}: ${body || ''}`, 'info');
        // Reload notifications list
        if (typeof loadNotifications === 'function') {
            loadNotifications();
        }
    }
});

// Enable Firestore offline persistence
db.enablePersistence()
    .then(() => console.log('Firestore persistence enabled'))
    .catch(err => console.warn('Firestore persistence error:', err));

// Google Auth Provider
const googleProvider = new firebase.auth.GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Constants
const ADMIN_EMAIL = 'rafetnoob731@gmail.com';

// Collection references
const usersRef = db.collection('users');
const transactionsRef = db.collection('transactions');
const referralsRef = db.collection('referrals');
const adsRef = db.collection('ads');
const notificationsRef = db.collection('notifications');
const withdrawalsRef = db.collection('withdrawals');
const systemConfigRef = db.collection('system').doc('config');

console.log('✓ EARNNOVA Firebase initialized (Web App)');
console.log('  Project:', firebaseConfig.projectId);
console.log('  App ID:', firebaseConfig.appId);
