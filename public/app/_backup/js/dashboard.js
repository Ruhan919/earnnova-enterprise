// =============================================
// EARNNOVA BETA - User Dashboard Module
// =============================================

// Load dashboard data
async function loadDashboard() {
    if (!currentUserData) return;
    const d = currentUserData;
    
    // Update user info
    document.getElementById('sidebarUserName').textContent = d.name || 'User';
    document.getElementById('sidebarUserEmail').textContent = d.email || '';
    document.getElementById('dashUserName').textContent = d.name || 'User';
    document.getElementById('userAvatar').textContent = (d.name || 'U')[0].toUpperCase();
    document.getElementById('profileAvatar').textContent = (d.name || 'U')[0].toUpperCase();
    document.getElementById('profileName').textContent = d.name || 'User';
    document.getElementById('profileEmail').textContent = d.email || '';
    document.getElementById('profileEditName').value = d.name || '';
    document.getElementById('profileEditPhone').value = d.phone || '';
    
    // Stats
    document.getElementById('dashBalance').textContent = '$' + (d.balance || 0).toFixed(2);
    document.getElementById('dashAdsWatched').textContent = d.adsWatched || 0;
    document.getElementById('dashReferrals').textContent = d.referrals || 0;
    document.getElementById('dashEarned').textContent = '$' + (d.totalEarned || 0).toFixed(2);
    
    // Withdraw page
    document.getElementById('wdBalance').textContent = '$' + (d.balance || 0).toFixed(2);
    document.getElementById('wdTotalWithdrawn').textContent = '$' + (d.totalWithdrawn || 0).toFixed(2);
    
    // Referral link
    const refLink = `${window.location.origin}/?ref=${d.referralCode || ''}`;
    document.getElementById('refLink').value = refLink;
    
    // Admin check
    if (d.isAdmin && d.email === ADMIN_EMAIL) {
        document.getElementById('adminNav').style.display = 'block';
    } else {
        document.getElementById('adminNav').style.display = 'none';
    }
    
    // Load async data
    loadRecentTransactions();
    loadReferrals();
    loadNotifications();
    loadAds();
    loadHistory();
}

// Load recent transactions
async function loadRecentTransactions() {
    try {
        const snapshot = await transactionsRef
            .where('userId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();
        
        const tbody = document.getElementById('recentTxnBody');
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center" style="color:var(--text-hint)">No transactions yet</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        snapshot.forEach(doc => {
            const t = doc.data();
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${t.type || 'N/A'}</td>
                <td style="color:${t.amount > 0 ? 'var(--success)' : 'var(--error)'}">${t.amount > 0 ? '+' : ''}$${(t.amount || 0).toFixed(2)}</td>
                <td>${formatDate(t.createdAt)}</td>
                <td><span class="badge badge-success">${t.status || 'completed'}</span></td>
            `;
        });
    } catch (error) {
        console.error('Load transactions error:', error);
    }
}

// Load history
async function loadHistory() {
    try {
        const snapshot = await transactionsRef
            .where('userId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .get();
        
        const tbody = document.getElementById('historyBody');
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center" style="color:var(--text-hint)">No transactions</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        snapshot.forEach(doc => {
            const t = doc.data();
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${t.type || 'N/A'}</td>
                <td style="color:${t.amount > 0 ? 'var(--success)' : 'var(--error)'}">${t.amount > 0 ? '+' : ''}$${(t.amount || 0).toFixed(2)}</td>
                <td>${formatDate(t.createdAt)}</td>
                <td><span class="badge badge-${t.status === 'completed' ? 'success' : 'warning'}">${t.status || 'pending'}</span></td>
            `;
        });
    } catch (error) {
        console.error('Load history error:', error);
    }
}

// Load referrals
async function loadReferrals() {
    try {
        const snapshot = await referralsRef
            .where('referrerId', '==', currentUser.uid)
            .get();
        
        const tbody = document.getElementById('refBody');
        document.getElementById('refCount').textContent = snapshot.size;
        
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center" style="color:var(--text-hint)">No referrals yet</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        let totalBonus = 0;
        snapshot.forEach(doc => {
            const r = doc.data();
            totalBonus += r.bonus || 0;
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${r.referredName || 'User'}</td>
                <td>${formatDate(r.createdAt)}</td>
                <td>+$${(r.bonus || 0).toFixed(2)}</td>
            `;
        });
        document.getElementById('refBonus').textContent = '$' + totalBonus.toFixed(2);
    } catch (error) {
        console.error('Load referrals error:', error);
    }
}

// Load notifications
async function loadNotifications() {
    try {
        const snapshot = await notificationsRef
            .where('targetUserId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get();
        
        const container = document.getElementById('notificationsList');
        if (snapshot.empty) {
            // Also load global notifications
            const globalSnapshot = await notificationsRef
                .where('targetUserId', '==', 'all')
                .orderBy('createdAt', 'desc')
                .limit(20)
                .get();
            
            if (globalSnapshot.empty) {
                container.innerHTML = '<div class="empty-state"><div class="empty-icon">🔔</div><h3>No notifications</h3><p>You\'re all caught up!</p></div>';
                return;
            }
            
            container.innerHTML = '';
            globalSnapshot.forEach(doc => {
                const n = doc.data();
                container.innerHTML += `
                    <div class="card" style="cursor:pointer;padding:16px;">
                        <div class="flex-between">
                            <strong>${n.title || 'Notification'}</strong>
                            <span style="font-size:0.75rem;color:var(--text-hint)">${formatDate(n.createdAt)}</span>
                        </div>
                        <p style="font-size:0.9rem;color:var(--text-secondary);margin-top:4px;">${n.message || ''}</p>
                    </div>
                `;
            });
            return;
        }
        
        container.innerHTML = '';
        snapshot.forEach(doc => {
            const n = doc.data();
            container.innerHTML += `
                <div class="card" style="cursor:pointer;padding:16px;">
                    <div class="flex-between">
                        <strong>${n.title || 'Notification'}</strong>
                        <span style="font-size:0.75rem;color:var(--text-hint)">${formatDate(n.createdAt)}</span>
                    </div>
                    <p style="font-size:0.9rem;color:var(--text-secondary);margin-top:4px;">${n.message || ''}</p>
                </div>
            `;
        });
    } catch (error) {
        console.error('Load notifications error:', error);
    }
}

// Load ads
async function loadAds() {
    try {
        const snapshot = await adsRef
            .where('isActive', '==', true)
            .get();
        
        document.getElementById('availAds').textContent = snapshot.size;
        document.getElementById('completedToday').textContent = currentUserData.adsWatched || 0;
        
        const container = document.getElementById('adsList');
        if (snapshot.empty) {
            container.innerHTML = '<div class="empty-state"><div class="empty-icon">📺</div><h3>No ads available</h3><p>Check back later for new earning opportunities.</p></div>';
            return;
        }
        
        container.innerHTML = '<div class="methods-grid">';
        snapshot.forEach(doc => {
            const ad = doc.data();
            container.innerHTML += `
                <div class="method-card" onclick="startWatchingAd('${doc.id}', '${ad.reward || 0.01}')">
                    <div class="method-icon">📺</div>
                    <h4>${ad.title || 'Watch Ad'}</h4>
                    <p>Reward: $${(ad.reward || 0).toFixed(2)} | ${ad.duration || 5}s</p>
                </div>
            `;
        });
        container.innerHTML += '</div>';
    } catch (error) {
        console.error('Load ads error:', error);
    }
}

// Watch ad with rewarded network ad integration
let adTimer = null;
function startWatchingAd(adId, reward) {
    const modal = document.getElementById('adModal');
    modal.classList.add('show');
    document.getElementById('adModalTitle').textContent = 'Watch Ad';
    document.getElementById('adRewardText').textContent = `Watch to earn $${parseFloat(reward).toFixed(2)}`;
    document.getElementById('adCountdown').textContent = '▶️';
    
    const btn = document.getElementById('watchAdBtn');
    btn.disabled = true;
    btn.textContent = '📺 Loading ad...';
    
    // First show the rewarded ad from the network
    if (window.earnnovaAds && typeof earnnovaAds.showRewarded === 'function') {
        earnnovaAds.showRewarded().then((watched) => {
            if (watched) {
                // User watched the ad completely - show countdown
                document.getElementById('adCountdown').textContent = '5';
                btn.textContent = '⏳ Verifying...';
                
                let countdown = 5;
                adTimer = setInterval(() => {
                    countdown--;
                    document.getElementById('adCountdown').textContent = countdown;
                    if (countdown <= 0) {
                        clearInterval(adTimer);
                        btn.disabled = false;
                        btn.textContent = '✅ Claim Reward';
                        btn.onclick = () => claimAdReward(adId, parseFloat(reward));
                    }
                }, 1000);
            } else {
                // User closed or ad failed
                document.getElementById('adCountdown').textContent = '✕';
                btn.textContent = '❌ Ad not completed';
                btn.disabled = false;
                btn.onclick = () => closeAdModal();
                setTimeout(() => closeAdModal(), 3000);
            }
        }).catch(() => {
            // Fallback: simple countdown without network ad
            document.getElementById('adCountdown').textContent = '5';
            btn.textContent = '⏳ Watching...';
            
            let countdown = 5;
            adTimer = setInterval(() => {
                countdown--;
                document.getElementById('adCountdown').textContent = countdown;
                if (countdown <= 0) {
                    clearInterval(adTimer);
                    btn.disabled = false;
                    btn.textContent = '✅ Claim Reward';
                    btn.onclick = () => claimAdReward(adId, parseFloat(reward));
                }
            }, 1000);
        });
    } else {
        // Fallback if ad network not loaded
        document.getElementById('adCountdown').textContent = '5';
        btn.textContent = '⏳ Watching...';
        
        let countdown = 5;
        adTimer = setInterval(() => {
            countdown--;
            document.getElementById('adCountdown').textContent = countdown;
            if (countdown <= 0) {
                clearInterval(adTimer);
                btn.disabled = false;
                btn.textContent = '✅ Claim Reward';
                btn.onclick = () => claimAdReward(adId, parseFloat(reward));
            }
        }, 1000);
    }
}

async function claimAdReward(adId, reward) {
    const btn = document.getElementById('watchAdBtn');
    btn.disabled = true;
    btn.textContent = '⏳ Claiming...';
    
    try {
        // Update user balance
        await usersRef.doc(currentUser.uid).update({
            balance: firebase.firestore.FieldValue.increment(reward),
            totalEarned: firebase.firestore.FieldValue.increment(reward),
            adsWatched: firebase.firestore.FieldValue.increment(1)
        });
        
        // Create transaction
        await transactionsRef.add({
            userId: currentUser.uid,
            type: 'Ad Reward',
            amount: reward,
            status: 'completed',
            description: 'Ad watching reward',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showAlert('You earned $' + reward.toFixed(2) + '!', 'success');
        closeAdModal();
        
        // Reload user data
        await loadUserData(currentUser.uid);
    } catch (error) {
        console.error('Claim reward error:', error);
        showAlert('Error claiming reward. Please try again.');
        btn.disabled = false;
        btn.textContent = '✅ Claim Reward';
    }
}

function closeAdModal() {
    document.getElementById('adModal').classList.remove('show');
    if (adTimer) clearInterval(adTimer);
}

// ===== WITHDRAWAL =====
document.querySelectorAll('.method-card[data-method]').forEach(card => {
    card.addEventListener('click', function() {
        document.querySelectorAll('.method-card').forEach(c => c.classList.remove('selected'));
        this.classList.add('selected');
        showWithdrawalForm(this.dataset.method);
    });
});

function showWithdrawalForm(method) {
    const formCard = document.getElementById('wdFormCard');
    formCard.style.display = 'block';
    document.getElementById('wdFormTitle').textContent = `Withdraw via ${method.charAt(0).toUpperCase() + method.slice(1)}`;
    
    const fields = document.getElementById('wdFields');
    fields.innerHTML = '';
    
    const fieldConfigs = {
        bkash: [{ label: 'bKash Number', placeholder: '01XXXXXXXXX', name: 'accountNumber' }],
        nagad: [{ label: 'Nagad Number', placeholder: '01XXXXXXXXX', name: 'accountNumber' }],
        binance: [
            { label: 'Binance ID / Email', placeholder: 'your@email.com', name: 'accountId' },
            { label: 'Network (BEP20/ERC20/TRC20)', placeholder: 'BEP20', name: 'network' }
        ],
        paypal: [{ label: 'PayPal Email', placeholder: 'your@paypal.com', name: 'accountEmail' }],
        wise: [{ label: 'Wise Email', placeholder: 'your@wise.com', name: 'accountEmail' }],
        bank: [
            { label: 'Account Holder Name', placeholder: 'Full name', name: 'accountName' },
            { label: 'Account Number', placeholder: 'Account number', name: 'accountNumber' },
            { label: 'Bank Name', placeholder: 'Bank name', name: 'bankName' },
            { label: 'Routing Number', placeholder: 'Routing number', name: 'routingNumber' }
        ],
        crypto: [
            { label: 'Wallet Address', placeholder: 'Your crypto wallet address', name: 'walletAddress' },
            { label: 'Currency (BTC/ETH/USDT)', placeholder: 'USDT', name: 'currency' },
            { label: 'Network', placeholder: 'ERC20/TRC20/BEP20', name: 'network' }
        ]
    };
    
    const configs = fieldConfigs[method] || [{ label: 'Account Details', placeholder: 'Enter details', name: 'details' }];
    
    configs.forEach(cfg => {
        const div = document.createElement('div');
        div.className = 'form-group';
        div.innerHTML = `<label>${cfg.label}</label><input type="text" name="${cfg.name}" placeholder="${cfg.placeholder}" required>`;
        fields.appendChild(div);
    });
}

document.getElementById('wdForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const selectedMethod = document.querySelector('.method-card.selected');
    if (!selectedMethod) { showAlert('Please select a withdrawal method'); return; }
    
    const method = selectedMethod.dataset.method;
    const amount = parseFloat(document.getElementById('wdAmount').value);
    const balance = currentUserData.balance || 0;
    
    if (amount < 5) { showAlert('Minimum withdrawal is $5.00'); return; }
    if (amount > 5000) { showAlert('Maximum withdrawal is $5000.00'); return; }
    if (amount > balance) { showAlert('Insufficient balance'); return; }
    
    const formData = new FormData(document.getElementById('wdForm'));
    const details = {};
    formData.forEach((value, key) => { details[key] = value; });
    
    try {
        // Create withdrawal request
        await withdrawalsRef.add({
            userId: currentUser.uid,
            userEmail: currentUser.email,
            userName: currentUserData.name,
            method: method,
            amount: amount,
            details: details,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Deduct from balance
        await usersRef.doc(currentUser.uid).update({
            balance: firebase.firestore.FieldValue.increment(-amount),
            totalWithdrawn: firebase.firestore.FieldValue.increment(amount)
        });
        
        // Create transaction
        await transactionsRef.add({
            userId: currentUser.uid,
            type: 'Withdrawal Request',
            amount: -amount,
            status: 'pending',
            description: `Withdrawal via ${method}`,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showAlert('Withdrawal request submitted successfully!', 'success');
        document.getElementById('wdFormCard').style.display = 'none';
        document.getElementById('wdAmount').value = '';
        document.querySelectorAll('.method-card').forEach(c => c.classList.remove('selected'));
        
        // Reload
        await loadUserData(currentUser.uid);
    } catch (error) {
        console.error('Withdrawal error:', error);
        showAlert('Error submitting withdrawal: ' + error.message);
    }
});

// Copy referral link
document.getElementById('copyRefLink').addEventListener('click', () => {
    const link = document.getElementById('refLink');
    link.select();
    document.execCommand('copy');
    showAlert('Referral link copied!', 'success');
});

// Profile update
document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('profileEditName').value.trim();
    const phone = document.getElementById('profileEditPhone').value.trim();
    
    try {
        await usersRef.doc(currentUser.uid).update({
            name: name,
            phone: phone
        });
        showAlert('Profile updated successfully!', 'success');
        await loadUserData(currentUser.uid);
    } catch (error) {
        showAlert('Error updating profile: ' + error.message);
    }
});

// Change password
document.getElementById('changePasswordBtn').addEventListener('click', () => {
    const form = document.getElementById('changePasswordForm');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
});

document.getElementById('savePwdBtn').addEventListener('click', async () => {
    const currentPwd = document.getElementById('currentPwd').value;
    const newPwd = document.getElementById('newPwd').value;
    
    if (!currentPwd || !newPwd) { showAlert('Please fill in both fields'); return; }
    if (newPwd.length < 6) { showAlert('New password must be at least 6 characters'); return; }
    
    try {
        const credential = firebase.auth.EmailAuthProvider.credential(currentUser.email, currentPwd);
        await currentUser.reauthenticateWithCredential(credential);
        await currentUser.updatePassword(newPwd);
        showAlert('Password changed successfully!', 'success');
        document.getElementById('changePasswordForm').style.display = 'none';
        document.getElementById('currentPwd').value = '';
        document.getElementById('newPwd').value = '';
    } catch (error) {
        showAlert(getAuthErrorMessage(error));
    }
});

// ===== HELPERS =====
function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
