// =============================================
// EARNNOVA BETA - Admin Panel Module
// =============================================

// Load admin data
async function loadAdminDashboard() {
    try {
        // Total users
        const usersSnapshot = await usersRef.get();
        document.getElementById('adminTotalUsers').textContent = usersSnapshot.size;
        
        let totalBalance = 0;
        usersSnapshot.forEach(doc => {
            const u = doc.data();
            totalBalance += u.balance || 0;
        });
        document.getElementById('adminTotalBalance').textContent = '$' + totalBalance.toFixed(2);
        
        // Pending withdrawals
        const wdSnapshot = await withdrawalsRef.where('status', '==', 'pending').get();
        document.getElementById('adminPendingWD').textContent = wdSnapshot.size;
        
        // Total ads
        const adsSnapshot = await adsRef.get();
        document.getElementById('adminTotalAds').textContent = adsSnapshot.size;
        
    } catch (error) {
        console.error('Admin dashboard error:', error);
    }
}

// Load admin users
async function loadAdminUsers() {
    try {
        const snapshot = await usersRef.orderBy('createdAt', 'desc').get();
        const tbody = document.getElementById('adminUsersBody');
        
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="color:var(--text-hint)">No users found</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        snapshot.forEach(doc => {
            const u = doc.data();
            const referralsQuery = await referralsRef.where('referrerId', '==', doc.id).get();
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${u.name || 'N/A'}</td>
                <td>${u.email || 'N/A'}</td>
                <td>$${(u.balance || 0).toFixed(2)}</td>
                <td>${referralsQuery.size}</td>
                <td><span class="badge badge-${u.isActive !== false ? 'success' : 'error'}">${u.isActive !== false ? 'Active' : 'Disabled'}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="toggleUserStatus('${doc.id}', ${u.isActive !== false})">${u.isActive !== false ? 'Disable' : 'Enable'}</button>
                </td>
            `;
        });
    } catch (error) {
        console.error('Admin users error:', error);
    }
}

// Toggle user status
async function toggleUserStatus(userId, isActive) {
    try {
        await usersRef.doc(userId).update({
            isActive: !isActive
        });
        showAlert('User status updated', 'success');
        loadAdminUsers();
    } catch (error) {
        showAlert('Error updating user: ' + error.message);
    }
}

// Load admin withdrawals
async function loadAdminWithdrawals() {
    try {
        const snapshot = await withdrawalsRef.orderBy('createdAt', 'desc').get();
        const tbody = document.getElementById('adminWDBody');
        
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="color:var(--text-hint)">No withdrawal requests</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        snapshot.forEach(doc => {
            const w = doc.data();
            const detailsStr = w.details ? Object.values(w.details).filter(v => v).join(', ') : '';
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${w.userName || w.userEmail || 'N/A'}</td>
                <td>${w.method || 'N/A'}</td>
                <td>$${(w.amount || 0).toFixed(2)}</td>
                <td style="font-size:0.8rem;max-width:150px;overflow:hidden;text-overflow:ellipsis;">${detailsStr}</td>
                <td>${formatDate(w.createdAt)}</td>
                <td><span class="badge badge-${w.status === 'pending' ? 'warning' : w.status === 'completed' ? 'success' : 'error'}">${w.status || 'pending'}</span></td>
                <td>
                    ${w.status === 'pending' ? `
                        <button class="btn btn-sm btn-success" onclick="approveWithdrawal('${doc.id}')">Approve</button>
                        <button class="btn btn-sm btn-danger" onclick="rejectWithdrawal('${doc.id}')">Reject</button>
                    ` : '-'}
                </td>
            `;
        });
    } catch (error) {
        console.error('Admin withdrawals error:', error);
    }
}

// Approve withdrawal
async function approveWithdrawal(wdId) {
    if (!confirm('Approve this withdrawal?')) return;
    try {
        await withdrawalsRef.doc(wdId).update({
            status: 'completed',
            approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
            approvedBy: currentUser.uid
        });
        showAlert('Withdrawal approved', 'success');
        loadAdminWithdrawals();
    } catch (error) {
        showAlert('Error: ' + error.message);
    }
}

// Reject withdrawal
async function rejectWithdrawal(wdId) {
    if (!confirm('Reject this withdrawal?')) return;
    try {
        const wd = await withdrawalsRef.doc(wdId).get();
        const wdData = wd.data();
        
        // Refund balance
        await usersRef.doc(wdData.userId).update({
            balance: firebase.firestore.FieldValue.increment(wdData.amount)
        });
        
        await withdrawalsRef.doc(wdId).update({
            status: 'rejected',
            rejectedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showAlert('Withdrawal rejected, balance refunded', 'info');
        loadAdminWithdrawals();
    } catch (error) {
        showAlert('Error: ' + error.message);
    }
}

// Load admin ads
async function loadAdminAds() {
    try {
        const snapshot = await adsRef.orderBy('createdAt', 'desc').get();
        const tbody = document.getElementById('adminAdsBody');
        
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="color:var(--text-hint)">No ads yet</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        snapshot.forEach(doc => {
            const ad = doc.data();
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${ad.title || 'N/A'}</td>
                <td>$${(ad.reward || 0).toFixed(2)}</td>
                <td>${ad.duration || 5}s</td>
                <td><span class="badge badge-${ad.isActive !== false ? 'success' : 'default'}">${ad.isActive !== false ? 'Active' : 'Inactive'}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="toggleAdStatus('${doc.id}', ${ad.isActive !== false})">${ad.isActive !== false ? 'Deactivate' : 'Activate'}</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteAd('${doc.id}')">🗑</button>
                </td>
            `;
        });
    } catch (error) {
        console.error('Admin ads error:', error);
    }
}

// Toggle ad status
async function toggleAdStatus(adId, isActive) {
    try {
        await adsRef.doc(adId).update({ isActive: !isActive });
        showAlert('Ad status updated', 'success');
        loadAdminAds();
    } catch (error) {
        showAlert('Error: ' + error.message);
    }
}

// Delete ad
async function deleteAd(adId) {
    if (!confirm('Delete this ad permanently?')) return;
    try {
        await adsRef.doc(adId).delete();
        showAlert('Ad deleted', 'success');
        loadAdminAds();
    } catch (error) {
        showAlert('Error: ' + error.message);
    }
}

// Add ad dialog
document.getElementById('addAdBtn').addEventListener('click', () => {
    const title = prompt('Ad Title:');
    if (!title) return;
    const reward = parseFloat(prompt('Reward (USD):', '0.05'));
    if (!reward) return;
    const duration = parseInt(prompt('Duration (seconds):', '5'));
    if (!duration) return;
    
    adsRef.add({
        title: title,
        reward: reward,
        duration: duration,
        isActive: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        showAlert('Ad created!', 'success');
        loadAdminAds();
    }).catch(error => {
        showAlert('Error: ' + error.message);
    });
});

// Send notification to all users
document.getElementById('adminNotifyForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('notifTitle').value.trim();
    const message = document.getElementById('notifMessage').value.trim();
    const type = document.getElementById('notifType').value;
    
    try {
        await notificationsRef.add({
            title: title,
            message: message,
            type: type,
            targetUserId: 'all',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showAlert('Notification sent to all users!', 'success');
        document.getElementById('notifTitle').value = '';
        document.getElementById('notifMessage').value = '';
    } catch (error) {
        showAlert('Error: ' + error.message);
    }
});

// Load reports
async function loadAdminReports() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const allTxn = await transactionsRef.get();
        let todayEarnings = 0;
        let weekEarnings = 0;
        let newUsersToday = 0;
        
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        allTxn.forEach(doc => {
            const t = doc.data();
            const txnDate = t.createdAt ? t.createdAt.toDate() : new Date();
            
            if (t.amount > 0) {
                if (txnDate >= today) todayEarnings += t.amount;
                if (txnDate >= weekAgo) weekEarnings += t.amount;
            }
        });
        
        // Count new users today
        const users = await usersRef.get();
        users.forEach(doc => {
            const u = doc.data();
            const joinDate = u.createdAt ? u.createdAt.toDate() : new Date();
            if (joinDate >= today) newUsersToday++;
        });
        
        document.getElementById('reportTodayEarnings').textContent = '$' + todayEarnings.toFixed(2);
        document.getElementById('reportWeekEarnings').textContent = '$' + weekEarnings.toFixed(2);
        document.getElementById('reportNewUsers').textContent = newUsersToday;
        
        // Load recent activity (transactions)
        const recentTxn = await transactionsRef.orderBy('createdAt', 'desc').limit(10).get();
        const tbody = document.getElementById('reportBody');
        tbody.innerHTML = '';
        
        recentTxn.forEach(doc => {
            const t = doc.data();
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${t.type || 'Transaction'}</td>
                <td>${t.userId ? t.userId.substring(0,8)+'...' : 'N/A'}</td>
                <td>${formatDate(t.createdAt)}</td>
            `;
        });
        
    } catch (error) {
        console.error('Reports error:', error);
    }
}
