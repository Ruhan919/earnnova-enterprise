// =============================================
// EARNNOVA BETA - Admin Panel
// =============================================

// Admin tab switching
document.querySelectorAll('.admin-tab').forEach(tab => {
  tab.addEventListener('click', function() {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    this.classList.add('active');
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    const section = document.getElementById('adminSection' + 
      this.dataset.atab.charAt(0).toUpperCase() + this.dataset.atab.slice(1));
    if (section) section.classList.add('active');
    
    switch(this.dataset.atab) {
      case 'users': adminLoadUsers(); break;
      case 'plans': adminLoadPlans(); break;
      case 'withdrawals': adminLoadWithdrawals(); break;
    }
  });
});

// ===== LOAD ADMIN STATS =====
async function adminLoadStats() {
  try {
    const u = await fbTimeout(usersRef.get());
    const w = await fbTimeout(withdrawalsRef.where('status','==','pending').get());
    document.getElementById('adminUsers').textContent = u.size;
    document.getElementById('adminWD').textContent = w.size;
    let bal = 0;
    u.forEach(d => bal += d.data().balance||0);
    document.getElementById('adminBalance').textContent = '$' + bal.toFixed(2);
  } catch(e) { console.warn('Admin stats fallback'); }
}

// ===== USERS =====
async function adminLoadUsers() {
  try {
    const snap = await fbTimeout(usersRef.orderBy('createdAt','desc').get());
    const list = document.getElementById('adminUsersList');
    if (snap.empty) { list.innerHTML = '<div class="activity-empty"><p>No users</p></div>'; return; }
    list.innerHTML = '';
    snap.forEach(doc => {
      const u = doc.data();
      const status = u.isActive !== false ? '✅' : '❌';
      list.innerHTML += `
        <div class="activity-item">
          <span class="ai-icon">👤</span>
          <div class="ai-info"><strong>${u.name||'?'}</strong><small>${u.email||''} • $${(u.balance||0).toFixed(2)} • ${u.adsWatched||0} ads</small></div>
          <button class="btn btn-xs ${u.isActive!==false?'btn-outline':'btn-primary'}" onclick="adminToggleUser('${doc.id}', ${u.isActive!==false})">${status}</button>
        </div>`;
    });
  } catch(e) { document.getElementById('adminUsersList').innerHTML = '<div class="activity-empty"><p>Error loading users</p></div>'; }
}

async function adminToggleUser(uid, isActive) {
  try {
    await fbTimeout(usersRef.doc(uid).update({ isActive: !isActive }));
    showToast('User updated');
    adminLoadUsers();
  } catch(e) { showToast('Error','error'); }
}

// ===== PLANS =====
async function adminLoadPlans() {
  try {
    const snap = await fbTimeout(db.collection('plans').orderBy('price','asc').get());
    const list = document.getElementById('adminPlansList');
    if (snap.empty) { list.innerHTML = '<div class="activity-empty"><p>No plans. Create one!</p></div>'; return; }
    list.innerHTML = '';
    snap.forEach(doc => {
      const p = doc.data();
      list.innerHTML += `
        <div class="activity-item">
          <span class="ai-icon">📋</span>
          <div class="ai-info"><strong>${p.name||'Plan'}</strong><small>$${p.price||0} • $${(p.dailyEarnings||0).toFixed(2)}/day • ${p.duration||30}d</small></div>
          <button class="btn btn-xs btn-outline" style="color:var(--error)" onclick="adminDeletePlan('${doc.id}')">🗑</button>
        </div>`;
    });
  } catch(e) { document.getElementById('adminPlansList').innerHTML = '<div class="activity-empty"><p>Error</p></div>'; }
}

function adminAddPlan() {
  const name = prompt('Plan name:');
  if (!name) return;
  const price = parseFloat(prompt('Price ($):','10'));
  const daily = parseFloat(prompt('Daily earnings ($):','1'));
  const dur = parseInt(prompt('Duration (days):','30'));
  const features = prompt('Features (optional):','');
  
  db.collection('plans').add({
    name, price: price||10, dailyEarnings: daily||1,
    duration: dur||30, features: features||'', isActive: true,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => { showToast('Plan created ✅'); adminLoadPlans(); })
    .catch(e => showToast('Error: '+e.message,'error'));
}

async function adminDeletePlan(id) {
  if (!confirm('Delete this plan?')) return;
  try {
    await fbTimeout(db.collection('plans').doc(id).delete());
    showToast('Plan deleted');
    adminLoadPlans();
  } catch(e) { showToast('Error','error'); }
}

// ===== WITHDRAWALS =====
async function adminLoadWithdrawals() {
  try {
    const snap = await fbTimeout(withdrawalsRef.orderBy('createdAt','desc').get());
    const list = document.getElementById('adminWDList');
    if (snap.empty) { list.innerHTML = '<div class="activity-empty"><p>No withdrawals</p></div>'; return; }
    list.innerHTML = '';
    snap.forEach(doc => {
      const w = doc.data();
      const sc = w.status === 'pending' ? 'var(--orange)' : w.status === 'completed' ? 'var(--green)' : 'var(--error)';
      list.innerHTML += `
        <div class="activity-item">
          <span class="ai-icon">💳</span>
          <div class="ai-info"><strong>${w.userName||w.userEmail||'?'}</strong><small>${w.method||''} • $${(w.amount||0).toFixed(2)} • <span style="color:${sc}">${w.status||'pending'}</span></small></div>
          ${w.status === 'pending' ? `<button class="btn btn-xs" style="background:var(--green);color:white" onclick="adminApproveWD('${doc.id}')">✓</button><button class="btn btn-xs" style="background:var(--error);color:white;margin-left:4px" onclick="adminRejectWD('${doc.id}')">✕</button>` : ''}
        </div>`;
    });
  } catch(e) { document.getElementById('adminWDList').innerHTML = '<div class="activity-empty"><p>Error</p></div>'; }
}

async function adminApproveWD(id) {
  if (!confirm('Approve?')) return;
  try { await fbTimeout(withdrawalsRef.doc(id).update({ status:'completed' })); showToast('Approved ✅'); adminLoadWithdrawals(); }
  catch(e) { showToast('Error','error'); }
}

async function adminRejectWD(id) {
  if (!confirm('Reject + refund?')) return;
  try {
    const doc = await fbTimeout(withdrawalsRef.doc(id).get());
    const w = doc.data();
    await fbTimeout(usersRef.doc(w.userId).update({ balance: firebase.firestore.FieldValue.increment(w.amount) }));
    await fbTimeout(withdrawalsRef.doc(id).update({ status:'rejected' }));
    showToast('Rejected + refunded');
    adminLoadWithdrawals();
  } catch(e) { showToast('Error','error'); }
}

// ===== SEND NOTIFICATION =====
async function adminSendNotif() {
  const title = document.getElementById('adminNotifTitle').value.trim();
  const msg = document.getElementById('adminNotifMsg').value.trim();
  if (!title || !msg) { showToast('Fill all fields','error'); return; }
  try {
    await fbTimeout(notificationsRef.add({
      title, message: msg, type: 'general', userId: 'all',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }));
    showToast('Sent! 📬');
    document.getElementById('adminNotifTitle').value = '';
    document.getElementById('adminNotifMsg').value = '';
  } catch(e) { showToast('Error','error'); }
}

// Auto-load admin data when admin page opens
document.addEventListener('page-change', e => {
  if (e.detail === 'admin') adminLoadStats();
});
