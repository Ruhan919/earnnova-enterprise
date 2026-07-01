// =============================================
// EARNNOVA BETA - Authentication Module
// =============================================

let currentUser = null;
let currentUserData = null;

// Check auth state
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        loadUserData(user.uid);
    } else {
        currentUser = null;
        currentUserData = null;
        showAuthPage('login');
    }
});

// Load user data from Firestore
async function loadUserData(uid) {
    try {
        const doc = await usersRef.doc(uid).get();
        if (doc.exists) {
            currentUserData = { id: uid, ...doc.data() };
            
            // Check if admin
            const configDoc = await systemConfigRef.get();
            if (configDoc.exists) {
                const adminUids = configDoc.data().adminUids || [];
                if (adminUids.includes(uid)) {
                    currentUserData.isAdmin = true;
                }
            }
            
            // Also check admin email
            if (currentUser.email === ADMIN_EMAIL) {
                currentUserData.isAdmin = true;
                // Auto-add to admin UIDs
                await systemConfigRef.set({
                    adminUids: firebase.firestore.FieldValue.arrayUnion(uid)
                }, { merge: true });
            }
            
            showApp(currentUserData);
        } else {
            // User doc doesn't exist yet - create it
            if (currentUser) {
                await createUserDocument(currentUser);
                await loadUserData(currentUser.uid);
            }
        }
    } catch (error) {
        console.error('Load user data error:', error);
        showAlert(error.message, 'error');
    }
}

// Create user document for Google Sign-In (first time)
async function createUserDocument(user) {
    try {
        const userData = {
            uid: user.uid,
            email: user.email,
            name: user.displayName || user.email.split('@')[0],
            photoURL: user.photoURL || '',
            phone: user.phoneNumber || '',
            balance: 0,
            totalEarned: 0,
            totalWithdrawn: 0,
            adsWatched: 0,
            referralCode: generateReferralCode(),
            referredBy: '',
            isActive: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await usersRef.doc(user.uid).set(userData);
        console.log('User document created for:', user.email);
    } catch (error) {
        console.error('Create user doc error:', error);
    }
}

// Generate referral code
function generateReferralCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// ===== AUTH UI =====

function showAuthPage(section = 'login') {
    document.getElementById('authPage').classList.add('active');
    document.getElementById('appPage').classList.remove('active');
    document.getElementById('splashScreen').classList.add('hide');
    
    document.getElementById('loginForm').style.display = section === 'login' ? 'block' : 'none';
    document.getElementById('registerForm').style.display = section === 'register' ? 'block' : 'none';
    document.getElementById('forgotForm').style.display = section === 'forgot' ? 'block' : 'none';
    document.getElementById('authDivider').style.display = section === 'forgot' ? 'none' : 'flex';
    document.getElementById('googleSignInBtn').style.display = section === 'forgot' ? 'none' : 'flex';
    document.getElementById('authToggle').style.display = section === 'forgot' ? 'none' : 'block';
    
    if (section === 'login') {
        document.getElementById('authSubtitle').textContent = 'Welcome Back!';
        document.getElementById('authToggleText').textContent = "Don't have an account?";
        document.getElementById('authToggleLink').textContent = 'Sign Up';
    } else if (section === 'register') {
        document.getElementById('authSubtitle').textContent = 'Create Your Account';
        document.getElementById('authToggleText').textContent = 'Already have an account?';
        document.getElementById('authToggleLink').textContent = 'Sign In';
    } else {
        document.getElementById('authSubtitle').textContent = 'Reset Password';
    }
}

function showAlert(message, type = 'error') {
    const alertBox = document.getElementById('alertBox');
    alertBox.textContent = message;
    alertBox.className = 'alert alert-' + type;
    setTimeout(() => {
        alertBox.style.display = 'none';
    }, 5000);
}

// ===== EVENT LISTENERS =====

// Login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const btn = document.getElementById('loginBtn');
    
    btn.disabled = true;
    btn.textContent = 'Signing in...';
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
        // Auth state listener will handle navigation
    } catch (error) {
        showAlert(getAuthErrorMessage(error));
        btn.disabled = false;
        btn.textContent = 'Sign In';
    }
});

// Register
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const referral = document.getElementById('regReferral').value.trim();
    const btn = document.getElementById('registerBtn');
    
    if (!name) { showAlert('Please enter your name'); return; }
    if (password.length < 6) { showAlert('Password must be at least 6 characters'); return; }
    
    btn.disabled = true;
    btn.textContent = 'Creating account...';
    
    try {
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        const user = cred.user;
        
        // Update profile
        await user.updateProfile({ displayName: name });
        
        // Create user document
        const userData = {
            uid: user.uid,
            email: email,
            name: name,
            photoURL: '',
            phone: '',
            balance: 0,
            totalEarned: 0,
            totalWithdrawn: 0,
            adsWatched: 0,
            referralCode: generateReferralCode(),
            referredBy: '',
            isActive: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Process referral if provided
        if (referral) {
            const refSnapshot = await usersRef.where('referralCode', '==', referral.toUpperCase()).get();
            if (!refSnapshot.empty) {
                userData.referredBy = refSnapshot.docs[0].id;
                // Add referral bonus
                const referrerData = refSnapshot.docs[0].data();
                await usersRef.doc(refSnapshot.docs[0].id).update({
                    balance: firebase.firestore.FieldValue.increment(5),
                    totalEarned: firebase.firestore.FieldValue.increment(5)
                });
                // Create referral record
                await referralsRef.add({
                    referrerId: refSnapshot.docs[0].id,
                    referredId: user.uid,
                    referredName: name,
                    bonus: 5,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        }
        
        await usersRef.doc(user.uid).set(userData);
        
    } catch (error) {
        showAlert(getAuthErrorMessage(error));
        btn.disabled = false;
        btn.textContent = 'Create Account';
    }
});

// Google Sign-In
document.getElementById('googleSignInBtn').addEventListener('click', async () => {
    const btn = document.getElementById('googleSignInBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Connecting...';
    
    try {
        await auth.signInWithPopup(googleProvider);
    } catch (error) {
        showAlert(getAuthErrorMessage(error));
        btn.disabled = false;
        btn.innerHTML = 'Continue with Google';
    }
});

// Forgot Password
document.getElementById('forgotForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('forgotEmail').value.trim();
    const btn = document.getElementById('forgotBtn');
    
    btn.disabled = true;
    btn.textContent = 'Sending...';
    
    try {
        await auth.sendPasswordResetEmail(email);
        showAlert('Password reset link sent to ' + email + '. Check your inbox!', 'success');
        btn.textContent = 'Send Reset Link';
        btn.disabled = false;
    } catch (error) {
        showAlert(getAuthErrorMessage(error));
        btn.textContent = 'Send Reset Link';
        btn.disabled = false;
    }
});

// Auth toggle links
document.getElementById('authToggleLink').addEventListener('click', (e) => {
    e.preventDefault();
    const isLogin = document.getElementById('loginForm').style.display !== 'none';
    showAuthPage(isLogin ? 'register' : 'login');
});

document.getElementById('forgotLink').addEventListener('click', (e) => {
    e.preventDefault();
    showAuthPage('forgot');
});

document.getElementById('backToLogin').addEventListener('click', (e) => {
    e.preventDefault();
    showAuthPage('login');
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
    if (confirm('Are you sure you want to sign out?')) {
        await auth.signOut();
    }
});

// ===== HELPERS =====
function getAuthErrorMessage(error) {
    const messages = {
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Invalid password. Please try again.',
        'auth/email-already-in-use': 'An account with this email already exists.',
        'auth/weak-password': 'Password should be at least 6 characters.',
        'auth/invalid-email': 'Invalid email address.',
        'auth/user-disabled': 'This account has been disabled.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
        'auth/network-request-failed': 'Network error. Check your connection.',
        'auth/popup-closed-by-user': 'Sign-in cancelled.',
        'auth/account-exists-with-different-credential': 'An account already exists with a different sign-in method.'
    };
    return messages[error.code] || error.message || 'An error occurred. Please try again.';
}
