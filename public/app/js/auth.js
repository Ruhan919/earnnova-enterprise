// =============================================
// EARNNOVA BETA - Auth Module (Mobile)
// =============================================

// ===== DISPOSABLE EMAIL BLOCKLIST =====
const DISPOSABLE_DOMAINS = [
  'mailinator.com','guerrillamail.com','guerrillamail.org','guerrillamail.net',
  'tempmail.com','temp-mail.org','tempmail.net','10minutemail.com',
  '10minutemail.net','throwaway.email','throwawaymail.com','trashmail.com',
  'trashmail.net','yopmail.com','yopmail.fr','sharklasers.com',
  'spam4.me','grr.la','dontreg.com','getairmail.com','getonemail.com',
  'mailnator.com','mailexpire.com','mailforspam.com','maildrop.cc',
  'mailmetrash.com','mailzilla.com','mintemail.com','mohmal.com',
  'mytrashmail.com','nepwk.com','nowmymail.com','petitlien.fr',
  'rcpt.at','receiveee.com','schafmail.de','sneakemail.com',
  'sofort-mail.de','spambob.com','spambog.com','spamcowboy.com',
  'spamday.com','spamdecoy.net','spameater.com','spamfighter.de',
  'spamgourmet.com','spamhereplease.com','spamhole.com','spamify.com',
  'spaminator.de','spamkill.info','spaml.com','spamoff.xyz',
  'spamserver.de','spamspot.com','spamthis.co.uk','spamtrail.com',
  'spamwins.com','tempalias.com','tempemail.net','tempmail.win',
  'tempmail.xyz','thisisnotmyrealemail.com','tittbit.in','tmail.ws',
  'tmpeml.com','tmpjr.me','tmpmail.net','trash2009.com',
  'trash360.com','trashdevil.de','trashmail.org','trashymail.com',
  'tyldd.com','upliftnow.com','veryrealemail.com','wegwerfmail.de',
  'wegwerfmail.net','wegwerfmail.org','wh4f.org','whyspam.me',
  'willselfdestruct.com','winemaven.info','wronghead.com','wuzup.net',
  'xagloo.com','xemaps.com','xents.com','xmaily.com','xoxy.net',
  'yep.it','yogamaven.com','yopmail.fr','yopmail.net','ypmail.webarnak.fr.eu.org',
  'zehnminutenmail.de','zippymail.info','zoaxe.com','zoemail.org',
  'mail.gen.tr','graffiti.net','dodgeit.com','emailias.com','emailtemporario.com.br',
  'fakeinbox.com','fake-mail.net','fakemailgenerator.com','fatflap.com',
  'flash-mail.com','friendlymail.co.uk','funkymail.co.uk',
  'garliclife.com','get1mail.com','goemailgo.com','hitmail.com',
  'hotmial.com','hotpop.com','ihateyoualot.info','ilovemak.com',
  'imails.info','inboxbear.com','irish2me.com','kaitag.us',
  'klassmaster.net','klzlk.com','koszmail.pl','leeching.net',
  'letterboxes.org','linuxmail.so','litedrop.com','liveindia.com',
  'lolfreak.net','lovemeet.faith','lovesicks.com','mail-temp.com',
  'mail.aws910.com','mail.bccto.me','mail.chacuo.net','mail.dataless.ga',
  'mail.gen.tr','mail99.net','mailcatch.com','maileater.com',
  'maileme101.com','mailexpire.com','mailin8r.com','mailinbox.co',
  'mailing.one','mailismagic.com','mailmate.com','mailme.xyz',
  'mailnator.com','mailnull.com','mailpay.co.uk','mailpick.biz',
  'mailquack.com','mailrock.me','mailsac.com','mailseal.de',
  'mailshell.com','mailsiphon.com','mailtothis.com','mailwire.com',
  'mailzilla.org','mbx.cc','mega.zik.dj','meinspamschutz.de',
  'meltmail.com','messagebeamer.de','mierdamail.com','misterpinball.com',
  'moncourrier.fr.nf','monemail.fr.nf','monmail.fr.nf','mymailer.com.tr',
  'mymailoasis.com','mytrashmail.com','netkiff.de','netzidiot.de',
  'neverbox.com','nextstopvalhalla.com','nobugmail.com','nospam.ze.tc',
  'nospam4.work','nothingtoseehere.ca','nowmymail.com','o.muti.ro',
  'obxpestcontrol.com','oneoffmail.com','onewaymail.com','online.ms',
  'oopi.org','opayq.com','ourklips.com','outlawspam.com','p.inboxcowboy.com',
  'p33.org','pagamenti.tk','pancakemail.com','paplease.com','pcusers.otherinbox.com',
  'pepbot.com','pjjkp.com','plexolan.de','poczta.onmicrosoft.fr',
  'polbx.com','postonline.me','privacy.net','privy-mail.com',
  'privymail.de','promotional.net.tr','proxymail.eu','prtz.eu',
  'punkass.com','put7.info','putthisinyourspamdatabase.com',
  'quickinbox.com','quickmail.nl','rcpt.at','receiveee.com',
  'recode.me','recursor.net','regbypass.com','regspaces.tk',
  'rejectmail.com','remail.cf','rfc822.org','rmqkr.net','royal.net',
  'rtrtr.com','s0ny.net','safe-mail.net','safermail.info',
  'safersign.com','safeurl.eu.com','sale.craigslist.org',
  'sandelf.de','saynotospams.com','scafel.com','schrott-email.de',
  'secretemail.de','secure-mail.biz','selfdestructingmail.com',
  'sendfree.org','sendhere.org','sendspamhere.com','senseless-entertainment.com',
  'server.ms','services.vir.com','sharphat.com','shieldedmail.com',
  'shmeriously.com','shortmail.net','sibmail.com','sinnlos-mail.de',
  'siteposter.net','skeefmail.com','slaskpost.se','slopsbox.com',
  'slushmail.com','smtp33.com','sneakemail.com','snkmail.com',
  'social-mailer.tk','sofimail.com','sofort-mail.de','softpls.asia',
  'sogetthis.com','spam.2012-2016.ru','spam4.me','spamail.de',
  'spamarrest.com','spamavert.com','spambob.com','spambob.net',
  'spambob.org','spambog.com','spambog.de','spambog.net','spambog.ru',
  'spambox.info','spambox.me','spambox.org','spambox.us','spamcannon.com',
  'spamcannon.net','spamcero.com','spamcon.org','spamcorptastic.com',
  'spamcowboy.com','spamcowboy.net','spamcowboy.org','spamday.com',
  'spamdecoy.net','spameater.com','spameater.org','spamex.com',
  'spamfree24.com','spamfree24.de','spamfree24.eu','spamfree24.info',
  'spamfree24.net','spamfree24.org','spamgoes.in','spamherelots.com',
  'spamhereplease.com','spamhole.com','spamify.com','spaminator.de',
  'spamkill.info','spaml.com','spamlot.net','spammotel.com',
  'spamobox.com','spamoff.xyz','spamsalad.com','spamserver.de',
  'spamslicer.com','spamspot.com','spamstack.net','spamthis.co.uk',
  'spamthisplease.com','spamtrail.com','spamwins.com','spamwrld.com',
  'spamyour.live','speed.1s.fr','spoofmail.de','squizzy.com',
  'ssoia.com','startfu.com','steambot.net','stumpfwerk.de',
  'suburbanthug.com','suckmyd.com','sute.jp','svxr.org','taglead.com',
  'talkinator.com','tapchicuoihoi.com','teewars.org','teleosaurs.xyz',
  'temp.em','temp-mail.org','temp-mail.ru','tempail.com','tempemail.biz',
  'tempemail.co.za','tempemail.com','tempemail.net','tempinbox.co.uk',
  'tempmail.co','tempmail.de','tempmail.eu','tempmail.it','tempmail.net',
  'tempmail.pw','tempmail.space','tempmail.top','tempmail.xyz',
  'tempomail.fr','tempook.com','temporarily.de','temporarioemail.com.br',
  'temporaryemail.net','temporaryemail.us','temporaryforwarding.com',
  'temporaryinbox.com','thankyou2010.com','thc.st','thecloudindex.com',
  'thembones.com.au','thisisnotmyrealemail.com','thismail.net',
  'throwaway.email','throwaway.xyz','throwawayemail.com','thrownmx.com',
  'tilien.com','tittbit.in','tmail.ws','tmailinator.com','tmpeml.com',
  'tmpjr.me','tmpmail.net','toddsbighug.com','toiea.com','top101.de',
  'topranklist.de','tormail.net','trash2009.com','trash360.com',
  'trashcanmail.com','trashdevil.de','trashmail.at','trashmail.com',
  'trashmail.de','trashmail.ga','trashmail.gq','trashmail.me',
  'trashmail.net','trashmail.org','trashmail.ws','trashmailer.com',
  'trashmails.com','trashymail.com','trbvm.com','trbvn.com',
  'trialmail.de','tropicalbass.info','trzcv.com','turual.com',
  'twinmail.de','twkly.ml','two.aifasf.com','tyldd.com','uggsrock.com',
  'umail.net','undo.it','unforgettable.design','unmail.ru','upliftnow.com',
  'uwork4.us','valemail.net','vampstarr.net','vbmail.com','vevs.be',
  'vgamers.co.uk','vintaku.com','vipmail.name','vipmail.pw','vipmail.eu',
  'vixletdev.com','vjtim.host','voltaer.com','vpn.st','vsimcard.com',
  'vssms.com','vulpih.com','vusra.com','w.icfng.org','walala.org',
  'walkmail.net','walkmail.ru','web.discard-email.ga','web.icsk.de',
  'web2mailco.com','webcontact-euh.online','webemail.me','webemail.net',
  'webm4il.info','webm4il.in','weg-werf-mail.de','wegwerf-emails.de',
  'wegwerfmail.de','wegwerfmail.net','wegwerfmail.org','wh4f.org',
  'whatifanalytics.com','whopy.com','whyspam.me','widelandsface.com',
  'willhackforfood.biz','willselfdestruct.com','winemaven.info',
  'wins.com.br','wlistp.com','wmail.cf','wmail.club','wokcy.com',
  'work4u.one','workingadmin.com','wormseo.cn','wowmail.com',
  'wqado.ml','wudet.men','wupics.com','wuzup.net','xagloo.com',
  'xemaps.com','xents.com','xmaily.com','xoxy.net','xww.ro',
  'yannmail.win','yapped.net','yearstogetrid.com','yep.it',
  'yogamaven.com','yomail.info','yoo.ro','yopmail.com','yopmail.fr',
  'yopmail.gq','yopmail.net','yopmail.org','yopmail.xyz','ypmail.webarnak.fr.eu.org',
  'yroid.com','yuurok.com','zehnminutenmail.de','zetmail.com',
  'zippymail.info','zoaxe.com','zoemail.com','zoemail.net','zoemail.org'
];

function isDisposableEmail(email) {
  var domain = email.split('@')[1].toLowerCase();
  return DISPOSABLE_DOMAINS.includes(domain);
}

// ===== ALERT HELPERS =====
function showAlert(msg, type) {
  if (!type) type = 'error';
  var box = document.getElementById('alertBox');
  if (box) {
    box.textContent = msg;
    box.className = 'auth-glass-alert ' + type;
    box.style.display = 'block';
    if (type === 'error') {
      box.classList.add('shake-error');
      setTimeout(function() { box.classList.remove('shake-error'); }, 600);
    }
    setTimeout(function() { box.style.display = 'none'; }, 5000);
  }
}

function getAuthError(error) {
  const m = {
    'auth/user-not-found': 'No account with this email',
    'auth/wrong-password': 'Invalid password',
    'auth/email-already-in-use': 'This email is already registered',
    'auth/weak-password': 'Password must be 6+ characters',
    'auth/invalid-email': 'Please enter a valid email',
    'auth/too-many-requests': 'Too many attempts. Try again later',
    'auth/network-request-failed': 'Network error. Check your connection',
    'auth/popup-closed-by-user': 'Sign-in cancelled'
  };
  return m[error.code] || error.message || 'An error occurred';
}

// ===== LOGIN =====
document.getElementById('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const btn = document.getElementById('loginBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Signing in...';
  try {
    await auth.signInWithEmailAndPassword(email, password);
  } catch(err) {
    showAlert(getAuthError(err));
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
});

// ===== REGISTER =====
document.getElementById('registerForm').addEventListener('submit', async e => {
  e.preventDefault();
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const ref = document.getElementById('regReferral').value.trim();
  const btn = document.getElementById('registerBtn');
  
  if (password.length < 6) { showAlert('Password must be 6+ characters'); return; }
  
  // Block disposable emails
  if (isDisposableEmail(email)) {
    showAlert('Temporary emails are not allowed. Please use a permanent email address.');
    return;
  }
  
  btn.disabled = true;
  btn.textContent = '⏳ Creating...';
  
  try {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    const user = cred.user;
    await user.updateProfile({ displayName: name });
    
    const userData = {
      uid: user.uid, email, name, photo: '', phone: '',
      balance: 0, totalEarned: 0, totalWithdrawn: 0,
      adsWatched: 0, todayAds: 0, lastAdDate: '',
      referralCode: Math.random().toString(36).substring(2,10).toUpperCase(), referredBy: '',
      streak: 0, lastActive: '',
      isActive: true, isAdmin: email === ADMIN_EMAIL,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastLogin: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Process referral
    if (ref) {
      try {
        const refSnap = await usersRef.where('referralCode', '==', ref.toUpperCase()).get();
        if (!refSnap.empty) {
          const referrer = refSnap.docs[0];
          userData.referredBy = referrer.id;
          await usersRef.doc(referrer.id).update({
            balance: firebase.firestore.FieldValue.increment(0.50),
            totalEarned: firebase.firestore.FieldValue.increment(0.50)
          });
          await referralsRef.add({
            referrerId: referrer.id, referredId: user.uid,
            referredName: name, bonus: 0.50,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        }
      } catch(er) {}
    }
    
    await usersRef.doc(user.uid).set(userData);
    showAlert('Account created! 🎉 Redirecting...', 'success');
  } catch(err) {
    showAlert(getAuthError(err));
    btn.disabled = false;
    btn.textContent = 'Create Account';
  }
});

// ===== GOOGLE SIGN-IN (hidden — kept for future use) =====
function googleSignIn() {
  var provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  auth.signInWithRedirect(provider).catch(function(err) {
    var msg = getAuthError(err);
    if (err.code === 'auth/unauthorized-domain') {
      msg = 'Domain not authorized. Add ' + window.location.hostname + ' to Firebase Console.';
    } else if (err.code === 'auth/operation-not-allowed') {
      msg = 'Google Sign-In not enabled in Firebase Console.';
    }
    showAlert(msg);
  });
}

// ===== FORGOT PASSWORD =====
document.getElementById('forgotForm').addEventListener('submit', async e => {
  e.preventDefault();
  const email = document.getElementById('forgotEmail').value.trim();
  const btn = document.getElementById('forgotBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Sending...';
  try {
    await auth.sendPasswordResetEmail(email);
    showAlert('Reset link sent! Check your inbox.', 'success');
  } catch(err) {
    showAlert(getAuthError(err));
  }
  btn.textContent = 'Send Reset Link';
  btn.disabled = false;
});

// ===== AUTH FORM TOGGLE =====
function showAuthForm(form) {
  const lf = document.getElementById('loginForm');
  const rf = document.getElementById('registerForm');
  const ff = document.getElementById('forgotForm');
  lf.classList.toggle('hidden', form !== 'login');
  rf.classList.toggle('hidden', form !== 'register');
  ff.classList.toggle('hidden', form !== 'forgot');
  const tagline = document.querySelector('.auth-glass-subtitle');
  if (form === 'login') tagline.textContent = 'Sign in & start earning';
  else if (form === 'register') tagline.textContent = 'Join and start earning';
  else tagline.textContent = 'Reset your password';
}

document.getElementById('toggleLink').addEventListener('click', e => {
  e.preventDefault();
  const login = !document.getElementById('loginForm').classList.contains('hidden');
  showAuthForm(login ? 'register' : 'login');
  document.getElementById('toggleText').textContent = login ? 'Already have an account?' : "Don't have an account?";
  document.getElementById('toggleLink').textContent = login ? 'Sign In' : 'Sign Up';
});

document.getElementById('forgotLink').addEventListener('click', e => {
  e.preventDefault();
  showAuthForm('forgot');
});

document.getElementById('backToLogin').addEventListener('click', e => {
  e.preventDefault();
  showAuthForm('login');
});
