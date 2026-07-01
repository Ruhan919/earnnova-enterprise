// =============================================
// EARNNOVA — MULTI-PAGE PLATFORM v4.0
// =============================================
let currentUser = null, currentUserData = null;
const ADMIN_EMAIL = 'owner@nova.com';
let isAdminUser = false;

// ===== PROTECTION LAYERS =====
const PROTECTION_LAYERS = [
  'Firebase Auth','Human Verification','10-min Cooldown',
  '30/day Limit','Account Block','Device Fingerprint',
  'Bot Detection','Safe Mode Fallback'
];

// ===== FIRESTORE TIMEOUT =====
function fbTimeout(promise, ms) {
  return Promise.race([promise, new Promise((_,r)=>setTimeout(()=>r(new Error('TIMEOUT')),ms||5000))]);
}

// ===== LOCAL CACHE =====
function loc(key,def) { try{return parseFloat(localStorage.getItem('en_'+key)||String(def||0))}catch(e){return def||0} }
function locSet(key,val) { try{localStorage.setItem('en_'+key,String(val))}catch(e){} }
function locAdd(key,amt) { const v=loc(key,0)+amt; locSet(key,v); return v; }

// ===== AUTH (proper redirect handling) =====
// Per Firebase best practices:
// 1. AWAIT getRedirectResult() FIRST to handle redirect sign-in
// 2. Only if no redirect result, register onAuthStateChanged listener
// 3. No race conditions — sequential, clean flow

var _authReady = false; // becomes true after onAuthStateChanged fires

(async function() {
  try {
    var result = await auth.getRedirectResult();
    if (result && result.user) {
      // Redirect sign-in succeeded
      currentUser = result.user;
      try { await usersRef.doc(result.user.uid).update({lastLogin:firebase.firestore.FieldValue.serverTimestamp()}); } catch(e) {}
      loadUserData(result.user.uid);
      return; // Done — onAuthStateChanged not needed
    }
  } catch(err) {
    if (err.code && err.code !== 'auth/unauthorized-domain') {
      console.warn('Redirect result:', err.code, err.message);
    }
  }
  
  // No redirect result — listen for auth state changes (persisted session or fresh login)
  auth.onAuthStateChanged(async function(user) {
    _authReady = true;
    if (user) {
      currentUser = user;
      try { await usersRef.doc(user.uid).update({lastLogin:firebase.firestore.FieldValue.serverTimestamp()}); } catch(e) {}
      loadUserData(user.uid);
    } else {
      currentUser = null; currentUserData = null;
      document.getElementById('splash')?.classList.add('hide');
      showView('authPage');
    }
  });
})();

async function loadUserData(uid) {
  try {
    const doc = await fbTimeout(usersRef.doc(uid).get());
    if (doc.exists) { currentUserData = {id:uid,...doc.data()}; initApp(); }
    else { if (currentUser) await createUserDoc(currentUser); await loadUserData(currentUser.uid); }
  } catch(e) {
    currentUserData = {id:currentUser?.uid||'',name:currentUser?.displayName||currentUser?.email?.split('@')[0]||'User',email:currentUser?.email||'',balance:loc('bal'),totalEarned:loc('earned'),adsWatched:loc('watched')};
    initApp();
  }
}

async function createUserDoc(user) {
  var uname = 'User';
  if (user.displayName) uname = user.displayName;
  else if (user.email) uname = user.email.split('@')[0];
  await fbTimeout(usersRef.doc(user.uid).set({
    uid:user.uid, email:user.email||'', name:uname,
    balance:0, totalEarned:0, totalWithdrawn:0, adsWatched:0,
    todayAds:0, lastAdDate:'', isActive:true, isAdmin:false,
    planId:null, planExpiry:null, phone:'',
    referralCode:Math.random().toString(36).substring(2,10).toUpperCase(),
    createdAt:firebase.firestore.FieldValue.serverTimestamp()
  }));
}

// ===== VIEW =====
function showView(id) {
  // GUARD: If trying to show auth page but user is already signed in, show app instead
  if (id === 'authPage' && currentUser) {
    id = 'appPage';
  }
  document.querySelectorAll('.page-view').forEach(function(p) { p.classList.add('hidden'); });
  var el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}

// ===== NAVIGATION =====
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pg = document.getElementById('page-'+page);
  if (pg) pg.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(i => i.classList.toggle('active', i.dataset.page===page));
  // Load page content with error safety
  try {
    if (page==='home') { updateUI(); loadDashboard(); }
    else if (page==='earn') { updateUI(); loadEarnPage(); }
    else if (page==='withdraw') loadWithdraw();
    else if (page==='plans') loadPlans();
    else if (page==='referrals') loadReferrals();
    else if (page==='profile') loadProfile();
  } catch(e) { console.warn('Page load error:', e); }
}
document.querySelectorAll('.nav-item').forEach(i => i.addEventListener('click', () => navigate(i.dataset.page)));

// ===== INIT APP =====
function initApp() {
  try {
    // Check block
    try {
      const b = JSON.parse(localStorage.getItem('en_block')||'{}');
      if (b.until && Date.now() < b.until) {
        showView('blockPage');
        document.getElementById('blockReason').textContent = b.reason||'Policy violation';
        const ut = () => { const r = b.until-Date.now(); document.getElementById('blockTimer').textContent = Math.floor(r/86400000)+'d '+Math.floor((r%86400000)/3600000)+'h '+Math.floor((r%3600000)/60000)+'m'; };
        ut(); setInterval(() => { try{const bb=JSON.parse(localStorage.getItem('en_block')||'{}'); if(!bb.until||Date.now()>=bb.until){localStorage.removeItem('en_block');location.reload()} ut(); }catch(e){}},10000);
        return;
      }
    } catch(e) {}
    
    // Hide loading overlay (dashboard is about to render — no blank gap)
    var _loading = document.getElementById('authLoading');
    if (_loading) _loading.classList.add('hide');
    document.getElementById('splash').classList.add('hide');
    showView('appPage');
    checkIsAdmin(); updateUserID(); updateUI();
    navigate('home');
    initAds();
    // Clock
    const clk = () => { const d=new Date(); document.getElementById('statusTime').textContent=d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0'); };
    clk(); setInterval(clk,10000);
    if (!localStorage.getItem('en_welcomed')) { localStorage.setItem('en_welcomed','1'); setTimeout(()=>showNotif('💰 Welcome!','Watch ads, earn rewards','🎉'),2000); }
  } catch(e) {
    // If initApp fails, show a visible error — don't leave user on blank screen
    console.error('initApp error:', e);
    // Hide loading overlay if still showing
    var _loading = document.getElementById('authLoading');
    if (_loading) _loading.classList.add('hide');
    // Show error on splash (override inline display:none)
    var splash = document.getElementById('splash');
    if (splash) {
      splash.style.display = 'flex';
      splash.style.cssText = 'display:flex;align-items:center;justify-content:center;min-height:100vh;flex-direction:column;background:#0F172A;color:#FCA5A5;padding:24px;text-align:center';
      splash.innerHTML = '<h2 style="margin:0 0 8px;font-size:24px">⚠️ Init Error</h2><p style="margin:12px 0;font-size:14px;color:#94A3B8">' + (e.message || 'Unknown error') + '</p><button onclick="location.reload()" style="padding:12px 32px;border-radius:12px;background:#10B981;color:#fff;border:none;font-size:15px;cursor:pointer">↻ Reload</button>';
    }
  }
}

// ===== AD BLOCKER DETECTION =====
(function detectAdBlocker() {
  var test = document.createElement('div');
  test.innerHTML = '&nbsp;';
  test.className = 'adsbox';
  test.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px';
  document.body.appendChild(test);
  setTimeout(function() {
    if (test.offsetHeight === 0 || test.offsetParent === null) {
      var el = document.getElementById('adblockWarning');
      if (el) el.classList.add('show');
    }
    test.remove();
  }, 500);
})();

// ===== HOME SLIDER =====
let sliderIndex = 0;
let sliderInterval = null;
const SLIDES = [
  { title:'🎯 Earn Daily', desc:'Watch ads and earn up to $1 each', amount:'+$0.05–$1.00', bg:'linear-gradient(135deg,#0F2027,#203A43)' },
  { title:'📦 Batch Watch', desc:'Watch 3 ads in a row for bonus rewards', amount:'+$0.15–$3.00', bg:'linear-gradient(135deg,#1A1B2F,#16222A)' },
  { title:'👥 Refer & Earn', desc:'Get $0.50 for every friend who joins', amount:'+$0.50/referral', bg:'linear-gradient(135deg,#1E3C2C,#2A3A2C)' },
  { title:'🏆 Buy Plans', desc:'Boost your earnings with premium plans', amount:'Up to $10/day', bg:'linear-gradient(135deg,#2D1B3A,#1A1B2F)' }
];

function initSlider() {
  var track = document.getElementById('sliderTrack');
  var dots = document.getElementById('sliderDots');
  if (!track || !dots) return;
  track.innerHTML = SLIDES.map(function(s) {
    return '<div class="slider-slide" style="background:' + s.bg + '"><h3>' + s.title + '</h3><p>' + s.desc + '</p><div class="slider-amount">' + s.amount + '</div></div>';
  }).join('');
  dots.innerHTML = SLIDES.map(function(_, i) {
    return '<div class="slider-dot' + (i===0?' active':'') + '" onclick="goToSlide(' + i + ')"></div>';
  }).join('');
  sliderIndex = 0;
  startSliderAuto();
}

function goToSlide(i) {
  sliderIndex = i;
  var track = document.getElementById('sliderTrack');
  var dots = document.querySelectorAll('.slider-dot');
  if (track) track.style.transform = 'translateX(-' + (i*100) + '%)';
  dots.forEach(function(d, idx) { d.classList.toggle('active', idx===i); });
  startSliderAuto();
}

function startSliderAuto() {
  if (sliderInterval) clearInterval(sliderInterval);
  sliderInterval = setInterval(function() {
    var next = (sliderIndex + 1) % SLIDES.length;
    goToSlide(next);
  }, 5000);
}

// ===== AD SCRIPTS =====
function initAds() {
  function loadScript(src, attrs) {
    return new Promise(resolve => {
      const s = document.createElement('script'); s.src = src; s.async = false;
      if (attrs) Object.keys(attrs).forEach(k => s.setAttribute(k, attrs[k]));
      s.onload = resolve; s.onerror = resolve; document.body.appendChild(s);
    });
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js',{scope:'/'}).catch(()=>{});
  loadScript('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9307459733796967',{crossorigin:'anonymous'});
  loadScript('https://5gvci.com/nt/sdk.js?z=11170708',{'data-cfasync':'false'});
  setTimeout(async () => {
    async function loadInvoke(key,f,h,w,ex) { window.atOptions = {key,format:f,'height':h,'width':w,'params':{}}; await loadScript('//www.'+(ex?.domain||'highperformancecpm.com')+'/'+key+'/invoke.js'); }
    await loadInvoke('430ec9a9c3b2a1492b22ecb72e4ace01','iframe',90,728);
    await loadScript('https://pl29828442.effectivecpmnetwork.com/2e/83/ea/2e83eab240b4afc016ede828af8a897a.js');
    await loadScript('https://pl29828443.effectivecpmnetwork.com/ac40f76d59b8e8c281fb380b91c2bf21/invoke.js');
    await loadInvoke('679c41f5cd1133dfcfb8ddd3254605d4','iframe',300,160,{domain:'highperformanceformat.com'});
    await loadInvoke('11127fe81ff9922c5ece58925c849fd8','iframe',60,468,{domain:'highperformanceformat.com'});
    await loadScript('https://www.effectivecpmnetwork.com/zjzbzfk7?key=5be534a9c13e9ed7a663c6cc527b5b74');
    await loadScript('https://pl29828447.effectivecpmnetwork.com/fc/ac/01/fcac01bcf8a7bc1e80bbba3ba4a24fed.js');
    await loadScript('https://quge5.com/88/tag.min.js',{'data-zone':'251380','data-cfasync':'false'});
    document.getElementById('container-ac40f76d59b8e8c281fb380b91c2bf21')?.style.removeProperty('display');
  }, 1000);
}

// ===== ADMIN SYSTEM =====
function checkIsAdmin() {
  isAdminUser = currentUser?.email===ADMIN_EMAIL || currentUserData?.isAdmin===true;
  const t = document.getElementById('adminToggleBtn'); if (t) t.style.display = isAdminUser?'flex':'none';
  const b = document.getElementById('userTypeBadge'); if (b) { b.textContent = isAdminUser?'🛡️ ADMIN':'👤 USER'; b.className = isAdminUser?'badge-admin':'badge-user'; }
}
function updateUserID() {
  const el = document.getElementById('userIDDisplay');
  if (el && currentUser) { el.textContent = 'ID: '+currentUser.uid.substring(0,8); el.title = currentUser.uid; }
}
function toggleAdminPanel() {
  const p = document.getElementById('adminPanel'); if (!p) return;
  p.classList.toggle('hidden');
  if (!p.classList.contains('hidden')) { adminSearch(); if(typeof adminLoadStats==='function') adminLoadStats(); }
}
document.getElementById('adminToggleBtn')?.addEventListener('click', toggleAdminPanel);

async function adminSearch() {
  const q = document.getElementById('adminSearchInput')?.value.trim().toLowerCase();
  const r = document.getElementById('adminSearchResults'); if (!r) return;
  r.innerHTML = '<div class="admin-loading">🔍 Searching...</div>';
  try {
    let users = [];
    if (q && q.length>=6) { try { const d=await fbTimeout(usersRef.doc(q).get()); if (d.exists) users.push({id:q,...d.data()}); } catch(e){} }
    if (users.length===0) { const snap=await fbTimeout(usersRef.get()); snap.forEach(d=>{ const u=d.data(); const dq=q||''; if(!dq||(u.email||'').toLowerCase().includes(dq)||(u.name||'').toLowerCase().includes(dq)||d.id.includes(dq)) users.push({id:d.id,...u}); }); }
    if (users.length>20) users=users.slice(0,20);
    if (!users.length) { r.innerHTML='<div class="admin-empty">❌ No users found</div>'; return; }
    r.innerHTML = '<div class="admin-result-count">Found '+users.length+' user(s)</div>';
    users.forEach(u => {
      const blocked = u.isActive===false;
      const sid = u.id.substring(0,8);
      r.innerHTML += '<div class="admin-user-card'+(blocked?' blocked':'')+'">'
        +'<div class="admin-user-header">'
        +'<span class="admin-user-avatar">'+(u.name||'?')[0]+'</span>'
        +'<div class="admin-user-info"><strong>'+(u.name||'Unknown')+'</strong>'
        +'<span class="admin-user-email">'+(u.email||'')+'</span>'
        +'<span class="admin-user-id">ID: '+sid+'...</span></div>'
        +'<span class="admin-user-status '+(blocked?'status-blocked':'status-active')+'">'+(blocked?'🚫 BANNED':'✅ Active')+'</span></div>'
        +'<div class="admin-user-stats">'
        +'<span>💰 $'+(u.balance||0).toFixed(2)+'</span>'
        +'<span>📺 '+(u.adsWatched||0)+' ads</span>'
        +'<span>📋 '+(u.planId||'None')+'</span></div>'
        +'<div class="admin-user-actions">'
        +(blocked
          ?'<button class="btn btn-primary btn-xs" onclick="adminUnbanUser(\''+u.id+'\')">✅ Unban</button>'
          :'<button class="btn btn-xs" style="background:var(--red);color:white" onclick="adminBanUser(\''+u.id+'\',\''+(u.name||'').replace(/'/g,'')+'\')">🚫 Ban</button>')
        +'<button class="btn btn-outline btn-xs" onclick="adminSetPlan(\''+u.id+'\',\''+(u.name||'').replace(/'/g,'')+'\')">📋 Plan</button>'
        +'<button class="btn btn-outline btn-xs" onclick="adminAddBalance(\''+u.id+'\',\''+(u.name||'').replace(/'/g,'')+'\')">💰 Add</button>'
        +'</div></div>';
    });
  } catch(e) { r.innerHTML='<div class="admin-empty">⚠️ Error: '+e.message+'</div>'; }
}
async function adminBanUser(uid,name) {
  if (!confirm('Ban '+name+' for 7 days?')) return;
  try { await fbTimeout(usersRef.doc(uid).update({isActive:false})); await fbTimeout(db.collection('blocks').doc(uid).set({until:Date.now()+7*86400000,reason:'Banned by admin',bannedAt:firebase.firestore.FieldValue.serverTimestamp()})); showToast('✅ '+name+' banned'); adminSearch(); } catch(e) { showToast(e.message,'error'); }
}
async function adminUnbanUser(uid) {
  if (!confirm('Unban this user?')) return;
  try { await fbTimeout(usersRef.doc(uid).update({isActive:true})); await fbTimeout(db.collection('blocks').doc(uid).delete()); showToast('✅ Unbanned'); adminSearch(); } catch(e) { showToast(e.message,'error'); }
}
async function adminSetPlan(uid,name) {
  const plan = prompt('Plan for '+name+'? (starter/silver/gold/diamond or empty to remove):');
  if (plan===null) return;
  try { if (plan.trim()==='') { await fbTimeout(usersRef.doc(uid).update({planId:null,planExpiry:null})); showToast('✅ Plan removed'); } else { await fbTimeout(usersRef.doc(uid).update({planId:plan.trim().toLowerCase(),planExpiry:new Date(Date.now()+30*86400000)})); showToast('✅ Plan set'); } adminSearch(); } catch(e) { showToast(e.message,'error'); }
}
async function adminAddBalance(uid,name) {
  const amt = prompt('Add balance to '+name+'? ($):');
  if (amt===null||isNaN(parseFloat(amt))) return;
  try { await fbTimeout(usersRef.doc(uid).update({balance:firebase.firestore.FieldValue.increment(Math.abs(parseFloat(amt)))})); showToast('✅ $'+Math.abs(parseFloat(amt)).toFixed(2)+' added'); adminSearch(); } catch(e) { showToast(e.message,'error'); }
}

// ===== ADMIN PRICE CONTROL =====
async function loadAdPrices() {
  try {
    var snap = await fbTimeout(systemConfigRef.get());
    if (snap.exists) {
      var data = snap.data();
      if (data.adMinReward) document.getElementById('adminPriceMin').value = data.adMinReward;
      if (data.adMaxReward) document.getElementById('adminPriceMax').value = data.adMaxReward;
    }
  } catch(e) {}
}

async function saveAdPrices() {
  var min = parseFloat(document.getElementById('adminPriceMin').value);
  var max = parseFloat(document.getElementById('adminPriceMax').value);
  if (isNaN(min) || isNaN(max)) { showToast('Invalid values','error'); return; }
  if (min < 0.01) min = 0.01;
  if (max > 5) max = 5;
  try {
    await fbTimeout(systemConfigRef.set({ adMinReward: min, adMaxReward: max }, { merge: true }));
    showToast('✅ Prices saved: $' + min.toFixed(2) + ' – $' + max.toFixed(2));
    // Update fallback ads with new prices
    FALLBACK_ADS.forEach(function(a) {
      a.reward = +(min + Math.random() * (max - min)).toFixed(2);
    });
  } catch(e) { showToast('Error saving: ' + e.message, 'error'); }
}

// ===== ERROR SHAKE ANIMATION HELPER =====
function shakeElement(el) {
  if (!el) return;
  el.classList.remove('shake-error');
  void el.offsetWidth;
  el.classList.add('shake-error');
  setTimeout(function() { el.classList.remove('shake-error'); }, 600);
}

// ===== COOLDOWN =====
const COOLDOWN_MS = 600000;
function cdEnd() { try{return parseInt(localStorage.getItem('en_cd_end')||'0')}catch(e){return 0} }
function isCD() { return Date.now() < cdEnd(); }
function cdRem() { return Math.max(0, cdEnd()-Date.now()); }
function startCD() { localStorage.setItem('en_cd_end', String(Date.now()+COOLDOWN_MS)); }

// ===== DAILY LIMIT =====
const DAILY_LIMIT = 30;
function getDaily() {
  const t = new Date().toISOString().split('T')[0];
  if (currentUserData?.lastAdDate===t && currentUserData?.todayAds) return currentUserData.todayAds;
  if (currentUserData && currentUserData.lastAdDate!==t) { currentUserData.lastAdDate=t; currentUserData.todayAds=0; try{usersRef.doc(currentUser.uid).update({todayAds:0,lastAdDate:t})}catch(e){} }
  return 0;
}
function incDaily() {
  if (!currentUserData) return;
  const t = new Date().toISOString().split('T')[0];
  currentUserData.lastAdDate=t; currentUserData.todayAds=(currentUserData.todayAds||0)+1;
  try{usersRef.doc(currentUser.uid).update({todayAds:firebase.firestore.FieldValue.increment(1),lastAdDate:t})}catch(e){}
}
function isLimit() { return getDaily() >= DAILY_LIMIT; }
function remDaily() { return Math.max(0, DAILY_LIMIT-getDaily()); }

// ===== STREAK =====
function getStreak() {
  try { const s=JSON.parse(localStorage.getItem('en_streak')||'{}'); const t=new Date().toISOString().split('T')[0]; if(s.date===t) return s.count||0; const y=new Date(Date.now()-86400000).toISOString().split('T')[0]; if(s.date===y) return s.count||0; return 0; } catch(e){return 0}
}
function incStreak() { const t=new Date().toISOString().split('T')[0]; localStorage.setItem('en_streak',JSON.stringify({date:t,count:getStreak()+1})); }
function streakBonus() { const s=getStreak(); if(s>=30) return 0.50; if(s>=14) return 0.25; if(s>=7) return 0.10; if(s>=3) return 0.05; return 0; }

// ===== BATCH =====
let batchMode=false, batchCount=0, batchMax=1;
function startBatchWatch(count) {
  batchMode=true; batchCount=0;
  batchMax=Math.min(count||3, remDaily());
  if (batchMax<=0) { showToast('Daily limit!','error'); batchMode=false; return; }
  showToast('Batch: '+batchMax+' ads 📦','info');
  processNextBatch();
}
function processNextBatch() {
  if (!batchMode || batchCount>=batchMax) { if (batchMode) { batchMode=false; showToast('Batch complete 🎉','success'); } return; }
  batchCount++;
  const ad = FALLBACK_ADS[Math.floor(Math.random()*FALLBACK_ADS.length)];
  openAd(ad.id, ad.reward+streakBonus(), ad.title+' ('+batchCount+'/'+batchMax+')', ad.duration);
}

// ===== FALLBACK ADS =====
const FALLBACK_ADS = [
  {id:'fb_001',title:'Premium Wireless Earbuds',description:'Studio sound, 24hr battery.',cta:'Shop',category:'Audio',bgColor:'#1E293B',reward:0.10,duration:30},
  {id:'fb_002',title:'Daily Skincare Routine',description:'Natural, cruelty-free. 20% off.',cta:'Learn',category:'Beauty',bgColor:'#1E293B',reward:0.05,duration:15},
  {id:'fb_003',title:'Home Workout Gear',description:'Comfort meets performance.',cta:'Offer',category:'Fitness',bgColor:'#1E293B',reward:0.03,duration:10},
  {id:'fb_004',title:'Learn a New Skill',description:'Thousands of courses available.',cta:'Start',category:'Education',bgColor:'#1E293B',reward:0.15,duration:45},
  {id:'fb_005',title:'Eco-Friendly Bottle',description:'BPA-free, keeps cold 24h.',cta:'Shop',category:'Eco',bgColor:'#1E293B',reward:0.08,duration:20}
];
const FALLBACK_PLANS = [
  {id:'starter',name:'Starter',price:5,dailyEarnings:0.50,duration:30},
  {id:'silver',name:'Silver',price:15,dailyEarnings:2.00,duration:30},
  {id:'gold',name:'Gold',price:30,dailyEarnings:5.00,duration:30},
  {id:'diamond',name:'Diamond',price:60,dailyEarnings:12.00,duration:30}
];

// ===== AD MANAGER =====
class AdMgr {
  constructor() {
    this.state='idle'; this.timer=null; this.watchStart=0;
    this.minWatch=5000; this.reward=0.02; this.adId=null;
    this.vis=false; this.obs=null; this.fails=0; this.maxFails=3;
  }
  showErr() {
    this.fails++; this.state='failed';
    const c=document.getElementById('modalAdContent'),f=document.getElementById('modalAdFooter');
    if (!c||!f) return;
    if (this.fails>=2) {
      c.innerHTML='<div class="ad-error-wrap"><div class="ad-error-icon">😅</div><h3 class="ad-error-title">Ad not loading?</h3><p class="ad-error-body">You\'ll still earn the reward</p><div class="ad-error-attempt">Attempt '+this.fails+' of '+this.maxFails+'</div></div>';
      f.innerHTML='<div class="ad-error-actions"><button class="btn-claim" onclick="window._retryAd()" style="padding:10px 0">🔄 Try Again</button><button class="ad-error-skip" onclick="window._skipAd()" style="margin-top:6px">⏭ Skip</button></div>';
    } else {
      c.innerHTML='<div class="ad-error-wrap"><div class="ad-error-icon">☁️</div><h3 class="ad-error-title">Ad is taking a moment</h3><p class="ad-error-body">Don\'t worry, you\'ll still earn</p></div>';
      f.innerHTML='<div class="ad-error-actions"><button class="btn-claim" onclick="window._retryAd()" style="padding:10px 0">🔄 Try Again</button><button class="ad-error-skip" onclick="window._skipAd()">⏭ Skip</button></div>';
    }
  }
  async play(id,reward,title,dur) {
    this.adId=id||'ad_'+Date.now(); this.reward=reward||0.02; this.title=title||'Ad'; this.dur=dur||30;
    this.state='loading';
    const m=document.getElementById('adModal'); m.classList.add('show');
    this.renderLoad(); await this.sleep(500); this.adv(0); await this.sleep(300); this.adv(1);
    const ok=await this.tryNet(); if (!ok&&this.fails>0) { this.showErr(); return; }
    this.fails=0; this.state='playing'; this.renderPlay(); this.cd(); this.trackVis();
  }
  async tryNet() {
    try { const s=document.querySelectorAll('script[src*="highperformancecpm"],script[src*="effectivecpmnetwork"],script[src*="highperformanceformat"],script[src*="5gvci"]'); if (s.length>0) { await this.sleep(800); if (Array.from(s).some(x=>x.dataset.errored==='1')) return false; } await this.sleep(500); return true; } catch(e){return true}
  }
  async grant() {
    try { await fbTimeout(usersRef.doc(currentUser.uid).update({balance:firebase.firestore.FieldValue.increment(this.reward),totalEarned:firebase.firestore.FieldValue.increment(this.reward),adsWatched:firebase.firestore.FieldValue.increment(1)})); await fbTimeout(transactionsRef.add({userId:currentUser.uid,type:'Ad Reward',amount:this.reward,status:'completed',description:this.title,createdAt:firebase.firestore.FieldValue.serverTimestamp()})); } catch(e){}
    locAdd('bal',this.reward); locAdd('earned',this.reward); locAdd('watched',1);
    if (currentUserData) { currentUserData.balance=(currentUserData.balance||0)+this.reward; currentUserData.totalEarned=(currentUserData.totalEarned||0)+this.reward; currentUserData.adsWatched=(currentUserData.adsWatched||0)+1; }
    incDaily(); incStreak(); startCD();
    const sp=document.createElement('div'); sp.className='sparkle-burst'; document.body.appendChild(sp); setTimeout(()=>sp.remove(),800);
    showToast('+$'+this.reward.toFixed(2)+' earned! 🎉');
    if (batchMode&&batchCount<batchMax) { setTimeout(()=>processNextBatch(),1200); } else { updateUI(); }
  }
  renderLoad() {
    document.getElementById('modalAdContent').innerHTML='<div class="ad-player-box"><div class="ad-player-screen"><div class="ad-player-icon">📺</div><div class="ad-player-label">Initializing...</div></div><div class="ad-progress-steps" id="adSteps"><div class="ad-step active"></div><div class="ad-step"></div><div class="ad-step"></div></div><div class="ad-ring-wrap"><svg viewBox="0 0 100 100" width="80" height="80"><circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="6"/><circle cx="50" cy="50" r="42" fill="none" stroke="url(#ag)" stroke-width="6" stroke-dasharray="264" stroke-dashoffset="264" stroke-linecap="round" transform="rotate(-90,50,50)" id="adRing"/><defs><linearGradient id="ag" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#10B981"/><stop offset="1" stop-color="#059669"/></linearGradient></defs></svg><div class="ad-ring-text" id="adTimerDisplay">'+this.dur+'</div></div><div class="ad-reward-big">💰 +$'+this.reward.toFixed(2)+'</div></div>';
    document.getElementById('modalAdFooter').innerHTML='<div class="ad-modal-stats"><div class="ad-modal-stat"><span class="ams-label">Reward</span><span class="ams-value ams-reward" id="adRewardLabel">+$'+this.reward.toFixed(2)+'</span></div><div class="ad-modal-stat"><span class="ams-label">Time</span><span class="ams-value" id="timeLeft">0s</span></div></div><button id="adActionBtn" class="btn-claim" disabled>⏳ Loading...</button>';
  }
  adv(idx) {
    const s=document.querySelectorAll('.ad-step'),l=['Loading SDK...','Fetching ad...','Starting...'];
    if (s[idx]) { s[idx].classList.add('done'); s[idx].classList.remove('active'); }
    if (s[idx+1]) s[idx+1].classList.add('active');
    const lb=document.querySelector('.ad-player-label'); if (lb&&l[idx+1]) lb.textContent=l[idx+1];
  }
  renderPlay() {
    const s=document.querySelector('.ad-player-screen'); if (s) s.innerHTML='<div class="ad-player-icon">▶️</div><div class="ad-player-label">Ad Playing</div>';
    const b=document.getElementById('adActionBtn'); if (b) { b.disabled=false; b.textContent='⏳ Watching...'; }
  }
  cd() {
    let s=this.dur; const r=document.getElementById('adRing'),t=document.getElementById('adTimerDisplay'),tl=document.getElementById('timeLeft'),b=document.getElementById('adActionBtn'),c=264; this.watchStart=Date.now();
    if (this.timer) clearInterval(this.timer);
    this.timer=setInterval(()=>{s--; const p=s/this.dur; if(r) r.style.strokeDashoffset=c*(1-p); if(t) t.textContent=Math.max(s,0); if(tl) tl.textContent=Math.max(s,0)+'s'; if(s<=0){clearInterval(this.timer);this.state='completed';if(t)t.textContent='✅';if(b){b.disabled=false;b.textContent='✅ Claim $'+this.reward.toFixed(2);b.onclick=()=>this.claim();}if(tl)tl.textContent='Done!';}},1000);
  }
  trackVis() {
    this.obs=new IntersectionObserver(e=>{e.forEach(x=>{this.vis=x.isIntersecting&&x.intersectionRatio>=0.5})},{threshold:[0.5]});
    const el=document.querySelector('.ad-player-screen'); if (el) this.obs.observe(el);
  }
  async claim() {
    const b=document.getElementById('adActionBtn'); if (b) { b.disabled=true; b.textContent='⏳ Claiming...'; }
    if (Date.now()-this.watchStart<this.minWatch||(this.vis?1:.8)<0.5) { showToast('Ad too short','error'); if (b) b.disabled=false; return; }
    this.close(); await this.grant();
  }
  close() { document.getElementById('adModal').classList.remove('show'); if (this.timer) clearInterval(this.timer); if (this.obs) this.obs.disconnect(); this.state='idle'; }
  sleep(ms) { return new Promise(r=>setTimeout(r,ms)); }
}
const adm = new AdMgr();
window._retryAd=()=>{document.getElementById('adModal').classList.remove('show');setTimeout(()=>{const a=window._pendingAd;if(a)adm.play(a.id,a.reward,a.title,a.dur).catch(()=>{})},300)};
window._skipAd=()=>{adm.fails=0;adm.state='playing';adm.renderPlay();adm.cd();adm.trackVis()};

// ===== OPEN AD =====
function openAd(id,reward,title,dur) {
  if (isLimit()) { showToast('Daily limit ('+DAILY_LIMIT+') reached!','error'); return; }
  if (isCD()) { showToast('Wait for cooldown','error'); return; }
  window._pendingAd={id:id,reward:reward,title:title,dur:dur};
  showVerification();
}

// ===== OTP VERIFICATION (replaces math captcha) =====
var _otpCode = '';
var _otpTimer = null;
var _otpCountdown = 30;

function showVerification() {
  var m = document.getElementById('verifyModal'); if (!m) return;
  
  // Generate random 6-digit OTP code
  _otpCode = String(Math.floor(100000 + Math.random() * 900000));
  // For demo: OTP code shown in console (remove in production)
  console.log('📧 OTP code:', _otpCode);
  
  // Show email in the modal
  var emailEl = document.getElementById('otpEmail');
  if (emailEl) emailEl.textContent = currentUser?.email || 'your registered email';
  
  // Reset OTP inputs
  for (var i = 0; i < 6; i++) {
    var inp = document.getElementById('otp' + i);
    if (inp) { inp.value = ''; inp.className = 'otp-box'; }
  }
  
  // Reset error
  var errEl = document.getElementById('otpError');
  if (errEl) errEl.style.display = 'none';
  
  // Start countdown
  startOTPTimer();
  
  m.classList.add('show');
  var first = document.getElementById('otp0');
  if (first) setTimeout(function() { first.focus(); }, 100);
}

function startOTPTimer() {
  if (_otpTimer) clearInterval(_otpTimer);
  _otpCountdown = 30;
  var cd = document.getElementById('otpCountdown');
  var refBtn = document.getElementById('otpRefreshBtn');
  var timerText = document.getElementById('otpTimerText');
  if (refBtn) refBtn.style.display = 'none';
  if (timerText) timerText.style.display = 'inline';
  
  _otpTimer = setInterval(function() {
    _otpCountdown--;
    if (cd) cd.textContent = _otpCountdown;
    if (_otpCountdown <= 0) {
      clearInterval(_otpTimer);
      if (refBtn) refBtn.style.display = 'inline';
      if (timerText) timerText.style.display = 'none';
    }
  }, 1000);
}

function resendOTP() {
  showVerification(); // Re-open resets everything
}

// Auto-advance OTP inputs
function setupOTPInputs() {
  for (var i = 0; i < 6; i++) {
    (function(idx) {
      var inp = document.getElementById('otp' + idx);
      if (!inp) return;
      
      inp.addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9]/g, '').substring(0, 1);
        if (this.value) {
          this.className = 'otp-box filled glowing';
          // Auto-advance to next box
          if (idx < 5) {
            var next = document.getElementById('otp' + (idx + 1));
            if (next) next.focus();
          } else {
            // Last box filled, auto-submit
            document.getElementById('otpVerifyBtn')?.focus();
          }
        } else {
          this.className = 'otp-box';
        }
      });
      
      inp.addEventListener('keydown', function(e) {
        if (e.key === 'Backspace' && !this.value && idx > 0) {
          var prev = document.getElementById('otp' + (idx - 1));
          if (prev) { prev.focus(); prev.value = ''; prev.className = 'otp-box'; }
        }
        if (e.key === 'Enter') { submitOTP(); }
      });
      
      inp.addEventListener('focus', function() {
        this.select();
      });
    })(i);
  }
}

function submitOTP() {
  var code = '';
  for (var i = 0; i < 6; i++) {
    var inp = document.getElementById('otp' + i);
    if (inp) code += inp.value || '';
  }
  
  if (code.length < 6) {
    var errEl = document.getElementById('otpError');
    if (errEl) { errEl.textContent = '⚠️ Enter all 6 digits'; errEl.style.display = 'block'; }
    return;
  }
  
  if (code === _otpCode) {
    // Correct OTP!
    if (_otpTimer) clearInterval(_otpTimer);
    document.getElementById('verifyModal').classList.remove('show');
    var a = window._pendingAd;
    if (a) adm.play(a.id, a.reward, a.title, a.dur).catch(function() {});
  } else {
    var errEl = document.getElementById('otpError');
    if (errEl) { errEl.textContent = '❌ Invalid code. Try again.'; errEl.style.display = 'block'; }
    // Clear inputs
    for (var i = 0; i < 6; i++) {
      var inp = document.getElementById('otp' + i);
      if (inp) { inp.value = ''; inp.className = 'otp-box'; }
    }
    document.getElementById('otp0')?.focus();
  }
}

function closeVerification() {
  if (_otpTimer) clearInterval(_otpTimer);
  document.getElementById('verifyModal').classList.remove('show');
  window._pendingAd = null;
}

// Initialize OTP input listeners on DOM ready
setupOTPInputs();
function closeAdModal() { adm.close(); }
document.getElementById('adActionBtn')?.addEventListener('click',()=>{if(adm.state==='completed')adm.claim()});

// ===== UPDATE UI =====
function updateUI() {
  const d=currentUserData; if (!d) return;
  const bal=Math.max(d.balance||0,loc('bal'));
  const earned=Math.max(d.totalEarned||0,loc('earned'));
  // Balance
  const bel=document.getElementById('balanceDisplay'); if (bel) { const ov=bel.textContent; const nv='$'+bal.toFixed(2); bel.textContent=nv; if (ov!==nv) { bel.classList.remove('pulse'); void bel.offsetWidth; bel.classList.add('pulse'); setTimeout(()=>bel.classList.remove('pulse'),500); } }
  document.getElementById('wdBalance')&&(document.getElementById('wdBalance').textContent='$'+bal.toFixed(2));
  document.getElementById('statAds')&&(document.getElementById('statAds').textContent=d.adsWatched||0);
  document.getElementById('statEarned')&&(document.getElementById('statEarned').textContent='$'+earned.toFixed(2));
  document.getElementById('profName')&&(document.getElementById('profName').textContent=d.name||'User');
  document.getElementById('profEmail')&&(document.getElementById('profEmail').textContent=d.email||'');
  document.getElementById('profAvatar')&&(document.getElementById('profAvatar').textContent=(d.name||'U')[0].toUpperCase());
  document.getElementById('profEditName')&&(document.getElementById('profEditName').value=d.name||'');
  document.getElementById('profEditPhone')&&(document.getElementById('profEditPhone').value=d.phone||'');
  document.getElementById('profUID')&&(document.getElementById('profUID').textContent='ID: '+(currentUser?.uid?.substring(0,8)||'---'));
  const ref=document.getElementById('refLinkInput'); if (ref) ref.value=window.location.origin+'/?ref='+(d.referralCode||'');
  checkIsAdmin(); updateUserID();
}

// ===== HOME / DASHBOARD =====
async function loadDashboard() {
  updateUI(); if (!currentUser) return;
  initSlider();
  loadAdPrices();
  // Update daily
  const r=remDaily(); const dl=document.getElementById('dailyLimitDisplay'); if (dl) { dl.textContent=r+'/'+DAILY_LIMIT; dl.style.color=r<=5?'var(--amber)':r<=0?'var(--red)':'var(--emerald)'; }
  const pf=document.getElementById('dailyProgressFill'); if (pf) pf.style.width=((DAILY_LIMIT-r)/DAILY_LIMIT*100)+'%';
  // Streak
  const se=document.getElementById('streakCount'); if (se) { const sk=getStreak(); const b=streakBonus(); se.textContent=sk+' day'+(sk!==1?'s':'')+(b>0?' (+$'+b.toFixed(2)+')':''); se.style.color=sk>=7?'var(--amber)':sk>=3?'var(--emerald)':'var(--slate-300)'; }
  // Cooldown
  const cs=document.getElementById('cooldownSection');
  if (isCD()) { cs.classList.remove('hidden'); cdTimerUI(); } else { cs.classList.add('hidden'); }
  // Activity
  try {
    const snap=await fbTimeout(transactionsRef.where('userId','==',currentUser.uid).orderBy('createdAt','desc').limit(5).get());
    const list=document.getElementById('recentList');
    if (snap.empty) { list.innerHTML='<div class="home-empty">Start earning!<br><button class="btn btn-primary btn-sm mt-1" onclick="navigate(\'earn\')">Watch First Ad →</button></div>'; } else { list.innerHTML=''; snap.forEach(d=>{const t=d.data();const s=(t.amount||0)>=0?'+':'';list.innerHTML+='<div class="activity-item"><span>🎬</span><div class="ai-info"><strong>'+(t.type||'Transaction')+'</strong><small>'+fmtDate(t.createdAt)+'</small></div><span class="ai-amount" style="color:'+((t.amount||0)>=0?'var(--emerald)':'var(--red)')+'">'+s+'$'+Math.abs(t.amount||0).toFixed(2)+'</span></div>';}); }
    const refSnap=await fbTimeout(referralsRef.where('referrerId','==',currentUser.uid).get());
    document.getElementById('statRefs')&&(document.getElementById('statRefs').textContent=refSnap.size);
  } catch(e){}
}
let _cdInt=null;
function cdTimerUI() {
  if (_cdInt) clearInterval(_cdInt);
  const upd=()=>{if(!isCD()){document.getElementById('cooldownSection')?.classList.add('hidden');loadDashboard();return}const r=cdRem(); const m=Math.floor(r/60000),s=Math.floor((r%60000)/1000); const el=document.getElementById('cooldownTimer'); if(el) el.textContent=m+':'+(''+s).padStart(2,'0');};
  upd(); _cdInt=setInterval(upd,1000);
}

// ===== EARN PAGE =====
function loadEarnPage() {
  updateUI();
  const r=remDaily(); const el=document.getElementById('earnDailyLimit'); if (el) { el.textContent=r+'/'+DAILY_LIMIT; el.style.color=r<=5?'var(--amber)':r<=0?'var(--red)':'var(--emerald)'; }
  // Streak
  const se=document.getElementById('earnStreakCount'); if (se) { const sk=getStreak(); const b=streakBonus(); se.textContent=sk+' day'+(sk!==1?'s':'')+(b>0?' (+$'+b.toFixed(2)+')':''); se.style.color=sk>=7?'var(--amber)':sk>=3?'var(--emerald)':'var(--slate-300)'; }
  // Cooldown
  const ec=document.getElementById('earnCooldownSection');
  if (isCD()) { ec.classList.remove('hidden'); earnCDUI(); } else { ec.classList.add('hidden'); }
  // Limit
  const g=document.getElementById('adsGrid');
  if (isLimit()) { g.innerHTML='<div class="home-empty" style="padding:40px 0"><div style="font-size:40px;margin-bottom:10px">📊</div><p>Daily limit reached ('+DAILY_LIMIT+' ads)</p><p class="text-muted">Come back tomorrow!</p></div>'; return; }
  if (!isCD()) renderAds(FALLBACK_ADS);
  loadFbAds();
}
let _ecdInt=null;
function earnCDUI() {
  if (_ecdInt) clearInterval(_ecdInt);
  const upd=()=>{if(!isCD()){document.getElementById('earnCooldownSection')?.classList.add('hidden');loadEarnPage();return}const r=cdRem();const m=Math.floor(r/60000),s=Math.floor((r%60000)/1000);const el=document.getElementById('earnCooldownTimer');if(el)el.textContent=m+':'+(''+s).padStart(2,'0');};
  upd(); _ecdInt=setInterval(upd,1000);
}
function renderAds(ads) {
  var g=document.getElementById('adsGrid'); if (!g) return; g.innerHTML='';
  ads.forEach(function(a){
    var t=(a.title||'Ad').replace(/'/g,"\\'");
    var d=(a.description||(a.duration||30)+'s').replace(/'/g,"\\'");
    var r=(a.reward||0.02);
    var tag = a.category ? '<span class="ad-tag">'+a.category+'</span>' : '<span class="ad-tag">Earn</span>';
    g.innerHTML+='<div class="ad-tile" onclick="openAd(\''+a.id+'\','+r+',\''+t+'\','+(a.duration||30)+')" style="background:'+(a.bgColor||'linear-gradient(145deg,#1E293B,#0F172A)')+'">'
      +'<div class="ad-tile-body"><h4>'+t+'</h4>'
      +'<p>'+tag+' <span>'+d+'</span></p>'
      +'<div class="ad-tile-cta">'+(a.cta||'▶ Watch')+' · <strong>+$'+r.toFixed(2)+'</strong></div>'
      +'</div>'
      +'<div class="ad-tile-reward-area">'
      +'<div class="ad-tile-reward-number"><span class="dollar">$</span>'+r.toFixed(2)+'</div>'
      +'<div class="ad-tile-reward-label">Reward</div>'
      +'</div>'
      +'</div>';
  });
}
async function loadFbAds() { try { const s=await fbTimeout(adsRef.where('isActive','==',true).get()); const ads=[]; s.forEach(d=>ads.push({id:d.id,...d.data()})); if (ads.length>0) renderAds(ads); } catch(e){} }

// ===== WITHDRAW =====
const wdFields={bkash:[{label:'Number',name:'account'}],nagad:[{label:'Number',name:'account'}],binance:[{label:'ID/Email',name:'account'}],paypal:[{label:'Email',name:'account'}],wise:[{label:'Email',name:'account'}],bank:[{label:'Account Name',name:'name'},{label:'Account No',name:'number'},{label:'Bank',name:'bank'}],crypto:[{label:'Wallet',name:'wallet'},{label:'Currency',name:'currency'}]};
function loadWithdraw() {
  updateUI();
  document.querySelectorAll('.wd-method').forEach(m=>m.classList.remove('selected'));
  document.getElementById('wdFormCard')?.classList.add('hidden');
}
document.querySelectorAll('.wd-method')?.forEach(c=>c.addEventListener('click',function(){document.querySelectorAll('.wd-method').forEach(x=>x.classList.remove('selected'));this.classList.add('selected');showWdForm(this.dataset.method)}));
function showWdForm(m) {
  const c=document.getElementById('wdFormCard'); c.classList.remove('hidden');
  document.getElementById('wdFormTitle').textContent=m.charAt(0).toUpperCase()+m.slice(1);
  const f=document.getElementById('wdFields'); f.innerHTML='';
  (wdFields[m]||[{label:'Details',name:'details'}]).forEach(x=>f.innerHTML+='<div class="input-group"><input type="text" name="'+x.name+'" placeholder="'+x.label+'" required></div>');
}
document.getElementById('wdForm')?.addEventListener('submit',async e=>{e.preventDefault();const m=document.querySelector('.wd-method.selected');if(!m){showToast('Select method','error');return;}const a=parseFloat(document.getElementById('wdAmount')?.value);if(a<5){showToast('Min $5','error');return;}if(a>Math.max(currentUserData?.balance||0,loc('bal'))){showToast('Insufficient balance','error');return;}const fd=new FormData(e.target);const d={};fd.forEach((v,k)=>d[k]=v);try{await fbTimeout(withdrawalsRef.add({userId:currentUser.uid,userEmail:currentUser.email,userName:currentUserData?.name,method:m.dataset.method,amount:a,details:d,status:'pending',createdAt:firebase.firestore.FieldValue.serverTimestamp()}));await fbTimeout(usersRef.doc(currentUser.uid).update({balance:firebase.firestore.FieldValue.increment(-a),totalWithdrawn:firebase.firestore.FieldValue.increment(a)}));showToast('✅ Submitted');}catch(e){locAdd('bal',-a);showToast('✅ Submitted (offline)');}document.getElementById('wdFormCard').classList.add('hidden');if(currentUserData)currentUserData.balance=(currentUserData.balance||0)-a;updateUI();});

// ===== PLANS =====
async function loadPlans() {
  const c=document.getElementById('plansContainer'); if (!c) return;
  c.innerHTML='<div class="skeleton" style="height:120px"></div>';
  let plans=[]; try{const s=await fbTimeout(db.collection('plans').where('isActive','==',true).get());s.forEach(d=>plans.push({id:d.id,...d.data()}));}catch(e){}
  if (!plans.length) plans=FALLBACK_PLANS;
  const cp=currentUserData?.planId;
  c.innerHTML=plans.map(p=>'<div class="plan-card'+(cp===p.id?' plan-active':'')+'">'
    +'<div class="plan-badge">'+p.name+'</div>'
    +'<div class="plan-price">$'+p.price+'</div>'
    +'<div class="plan-earnings">Earn $'+(p.dailyEarnings||0).toFixed(2)+'/day</div>'
    +'<div class="plan-duration">'+(p.duration||30)+' days</div>'
    +(cp===p.id?'<span class="plan-owned">✅ Active</span>':'<button class="btn btn-primary btn-sm btn-block" onclick="buyPlan(\''+p.id+'\',\''+p.name+'\','+p.price+')">Buy $'+p.price+'</button>')
    +'</div>').join('');
}
async function buyPlan(id,name,price) {
  if (Math.max(currentUserData?.balance||0,loc('bal'))<price) { showToast('Insufficient balance','error'); return; }
  if (!confirm('Buy '+name+' for $'+price+'?')) return;
  try { await fbTimeout(usersRef.doc(currentUser.uid).update({balance:firebase.firestore.FieldValue.increment(-price),planId:id,planExpiry:new Date(Date.now()+30*86400000)})); showToast(name+' activated! 🚀'); } catch(e) { locAdd('bal',-price); showToast('Activated (offline)!'); }
  if (currentUserData) { currentUserData.balance=(currentUserData.balance||0)-price; currentUserData.planId=id; }
  updateUI(); loadPlans();
}

// ===== REFERRALS =====
async function loadReferrals() {
  updateUI();
  try {
    const s=currentUser?await fbTimeout(referralsRef.where('referrerId','==',currentUser.uid).get()):{size:0,forEach:()=>{}};
    document.getElementById('refCount').textContent=s.size;
    let b=0;
    document.querySelectorAll('#refMilestones .milestone').forEach(function(m){var n=parseInt(m.dataset.count);var ck=m.querySelector('.ms-check');if(s.size>=n){ck.textContent='✅';ck.classList.add('unlocked');if(n===1)b+=0.5;else if(n===5)b+=2.5;else if(n===10)b+=5;}});
    document.getElementById('refEarned').textContent='$'+b.toFixed(2);
    const body=document.getElementById('refListBody');
    if (s.size===0) body.innerHTML='<div class="home-empty">No referrals yet</div>';
    else { body.innerHTML=''; s.forEach(d=>{const r=d.data();body.innerHTML+='<div class="activity-item"><span>👥</span><div class="ai-info"><strong>'+(r.referredName||'User')+'</strong><small>'+fmtDate(r.createdAt)+'</small></div><span class="ai-amount" style="color:var(--emerald)">+$'+(r.bonus||0).toFixed(2)+'</span></div>';}); }
  } catch(e){}
}
document.getElementById('copyRefBtn')?.addEventListener('click',()=>{const i=document.getElementById('refLinkInput');if(i){i.select();document.execCommand('copy');showToast('Copied! 📋');}});

// ===== PROFILE =====
function loadProfile() { updateUI(); }
document.getElementById('profileForm')?.addEventListener('submit',async e=>{e.preventDefault();const n=document.getElementById('profEditName').value.trim(),p=document.getElementById('profEditPhone').value.trim();try{await fbTimeout(usersRef.doc(currentUser.uid).update({name:n,phone:p}));showToast('Updated ✅');}catch(e){showToast('Saved locally');}if(currentUserData){currentUserData.name=n;currentUserData.phone=p;}updateUI();});
document.getElementById('logoutBtn')?.addEventListener('click',async()=>{if(confirm('Sign out?'))await auth.signOut();});

// ===== SHARED =====
function fmtDate(ts) { if (!ts) return ''; const d=ts.toDate?ts.toDate():new Date(ts); const diff=Date.now()-d; if (diff<60000) return 'Just now'; if (diff<3600000) return Math.floor(diff/60000)+'m ago'; if (diff<86400000) return Math.floor(diff/3600000)+'h ago'; return d.toLocaleDateString('en-US',{month:'short',day:'numeric'}); }
function showToast(msg,type) { const c=document.getElementById('toast'); if (!c) return; const t=document.createElement('div'); t.className='toast toast-'+(type||'success'); t.textContent=msg; c.appendChild(t); setTimeout(()=>t.remove(),3000); }
function showNotif(t,m,i) { document.getElementById('notifIcon').textContent=i||'💰'; document.getElementById('notifTitle').textContent=t; document.getElementById('notifMsg').textContent=m; document.getElementById('notifModal').classList.add('show'); }
function closeNotif() { document.getElementById('notifModal').classList.remove('show'); }

// ===== 3D TOUCH TILT EFFECT =====
// Adds gyroscopic tilt on ad tiles, plan cards, and action buttons
(function init3DTouch() {
  const tiltElements = '.ad-tile, .plan-card, .home-action-btn, .wd-method, .admin-user-card, .prof-card, .ref-hero';
  
  document.addEventListener('touchmove', function(e) {
    const touches = e.touches;
    if (!touches || touches.length === 0) return;
    const touch = touches[0];
    
    // Find the element under the finger that supports tilt
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!el) return;
    
    const tiltEl = el.closest(tiltElements);
    if (!tiltEl) {
      // Reset all tilted elements
      document.querySelectorAll(tiltElements).forEach(el => {
        if (el.dataset.tilting) {
          el.style.transform = el.dataset.origTransform || '';
          el.style.transition = 'transform 0.5s cubic-bezier(0.23,1,0.32,1)';
          delete el.dataset.tilting;
          setTimeout(() => { if (el.style) el.style.transition = ''; }, 500);
        }
      });
      return;
    }
    
    if (tiltEl.dataset.noTilt) return;
    
    const rect = tiltEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Calculate tilt based on finger position relative to center
    const deltaX = (touch.clientX - centerX) / (rect.width / 2);
    const deltaY = (touch.clientY - centerY) / (rect.height / 2);
    
    // Clamp
    const rotateY = Math.max(-8, Math.min(8, deltaX * 6));
    const rotateX = Math.max(-8, Math.min(8, -deltaY * 6));
    
    if (!tiltEl.dataset.origTransform) {
      tiltEl.dataset.origTransform = tiltEl.style.transform || '';
    }
    
    tiltEl.dataset.tilting = '1';
    tiltEl.style.transition = 'transform 0.08s linear';
    tiltEl.style.transform = tiltEl.dataset.origTransform + 
      ' perspective(600px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg) scale3d(1.02,1.02,1.02)';
  }, { passive: true });
  
  // Reset tilt on touch end
  document.addEventListener('touchend', function() {
    document.querySelectorAll(tiltElements).forEach(el => {
      if (el.dataset.tilting) {
        el.style.transform = el.dataset.origTransform || '';
        el.style.transition = 'transform 0.5s cubic-bezier(0.23,1,0.32,1)';
        delete el.dataset.tilting;
        setTimeout(() => { if (el.style) el.style.transition = ''; }, 500);
      }
    });
  }, { passive: true });
  
  // Mouse support for desktop testing
  let mouseTiltEl = null;
  document.addEventListener('mousemove', function(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const tiltEl = el ? el.closest(tiltElements) : null;
    
    if (tiltEl && tiltEl !== mouseTiltEl) {
      // Reset old
      if (mouseTiltEl && mouseTiltEl.dataset.tilting) {
        mouseTiltEl.style.transform = mouseTiltEl.dataset.origTransform || '';
        mouseTiltEl.style.transition = 'transform 0.5s cubic-bezier(0.23,1,0.32,1)';
        delete mouseTiltEl.dataset.tilting;
      }
      mouseTiltEl = tiltEl;
    }
    
    if (!tiltEl || tiltEl.dataset.noTilt) {
      if (mouseTiltEl && mouseTiltEl.dataset.tilting) {
        mouseTiltEl.style.transform = mouseTiltEl.dataset.origTransform || '';
        mouseTiltEl.style.transition = 'transform 0.5s cubic-bezier(0.23,1,0.32,1)';
        delete mouseTiltEl.dataset.tilting;
      }
      mouseTiltEl = null;
      return;
    }
    
    const rect = tiltEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const deltaX = (e.clientX - centerX) / (rect.width / 2);
    const deltaY = (e.clientY - centerY) / (rect.height / 2);
    
    const rotateY = Math.max(-5, Math.min(5, deltaX * 4));
    const rotateX = Math.max(-5, Math.min(5, -deltaY * 4));
    
    if (!tiltEl.dataset.origTransform) {
      tiltEl.dataset.origTransform = tiltEl.style.transform || '';
    }
    
    tiltEl.dataset.tilting = '1';
    tiltEl.style.transition = 'transform 0.15s ease-out';
    tiltEl.style.transform = tiltEl.dataset.origTransform + 
      ' perspective(600px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg) scale3d(1.01,1.01,1.01)';
  });
  
  document.addEventListener('mouseleave', function() {
    if (mouseTiltEl && mouseTiltEl.dataset.tilting) {
      mouseTiltEl.style.transform = mouseTiltEl.dataset.origTransform || '';
      mouseTiltEl.style.transition = 'transform 0.5s cubic-bezier(0.23,1,0.32,1)';
      delete mouseTiltEl.dataset.tilting;
    }
    mouseTiltEl = null;
  });
})();

// ===== SAFETY =====
// Safety (3s): only fires if splash still visible AND auth hasn't resolved yet.
// The _authReady flag prevents this from firing BEFORE onAuthStateChanged has run.
// This avoids the loading-state bug where auth page flashes before session registers.
setTimeout(function(){
  if (!_authReady) return; // onAuthStateChanged hasn't fired yet — wait for it
  var s=document.getElementById('splash');
  if(!s || s.classList.contains('hide')) return;
  s.classList.add('hide');
  if(currentUser) {
    showView('appPage');
    if(!currentUserData && currentUser) {
      loadUserData(currentUser.uid);
    } else {
      navigate('home');
    }
  } else {
    showView('authPage');
  }
}, 3000);

// Hard failsafe (8s): force show auth page even if Firebase never initialized
setTimeout(function(){
  var s=document.getElementById('splash');
  if(!s || s.classList.contains('hide')) return;
  s.classList.add('hide');
  showView('authPage');
}, 8000);
