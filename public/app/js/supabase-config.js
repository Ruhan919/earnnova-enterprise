// =============================================
// EARNNOVA BETA - Firebase + Supabase Config
// =============================================

// ===== MOCK OBJECTS (used when Firebase fails) =====
var ADMIN_EMAIL = 'owner@nova.com';
var emptySnap = { exists:false, data:function(){return null}, size:0, empty:true, forEach:function(){}, docs:[] };
var emptyDoc = { get:function(){return Promise.resolve(emptySnap)}, set:function(){return Promise.resolve()}, update:function(){return Promise.resolve()}, delete:function(){return Promise.resolve()} };
var emptyCol = { doc:function(){return emptyDoc}, where:function(){return emptyCol}, orderBy:function(){return emptyCol}, limit:function(){return emptyCol}, get:function(){return Promise.resolve(emptySnap)}, add:function(){return Promise.resolve({id:'mock'})} };
var mockAuth = { onAuthStateChanged:function(cb){ /* never calls back — timeout handles it */ return function(){}; }, signInWithEmailAndPassword:function(){return Promise.reject({code:'auth/unavailable',message:'Firebase offline'})}, createUserWithEmailAndPassword:function(){return Promise.reject({code:'auth/unavailable',message:'Firebase offline'})}, signOut:function(){return Promise.resolve()}, sendPasswordResetEmail:function(){return Promise.reject({code:'auth/unavailable',message:'Firebase offline'})}, signInWithRedirect:function(){return Promise.reject({code:'auth/unavailable',message:'Firebase offline'})}, getRedirectResult:function(){return Promise.resolve(null)} };
var mockDb = { collection:function(){return emptyCol} };

// ===== STATIC FALLBACK VALUES =====
var auth = mockAuth;
var db = mockDb;
var usersRef = emptyCol;
var transactionsRef = emptyCol;
var referralsRef = emptyCol;
var adsRef = emptyCol;
var notificationsRef = emptyCol;
var withdrawalsRef = emptyCol;
var systemConfigRef = emptyDoc;
var supabase = null;
var useSupabase = false;

// ===== TRY TO INITIALIZE FIREBASE =====
if (typeof firebase !== 'undefined') {
  try {
    var firebaseConfig = {
      apiKey: "AIzaSyAoo2-X5ILICXR2mFAyUhqJYpvScChlsOc",
      authDomain: "earnnovabeta.firebaseapp.com",
      projectId: "earnnovabeta",
      storageBucket: "earnnovabeta.firebasestorage.app",
      messagingSenderId: "458557664673",
      appId: "1:458557664673:web:12bfc1789f0c5ebe43afe0",
      measurementId: "G-BNWP93VWD4"
    };

    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    
    // Override mock globals with REAL Firebase instances
    auth = firebase.auth();
    db = firebase.firestore();
    usersRef = db.collection('users');
    transactionsRef = db.collection('transactions');
    referralsRef = db.collection('referrals');
    adsRef = db.collection('ads');
    notificationsRef = db.collection('notifications');
    withdrawalsRef = db.collection('withdrawals');
    systemConfigRef = db.collection('system').doc('config');
    
  } catch(e) {
    console.error('Firebase init failed — using offline mode:', e.message);
    // Mock globals already set above — page shows auth forms (login won't work)
  }
} else {
  console.error('Firebase SDK not loaded — using offline mode');
  // Mock globals already set above
}
