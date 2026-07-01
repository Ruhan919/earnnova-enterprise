# 🌐 EARNNOVA BETA - Full Website

Complete web-based earning platform with Firebase backend.

## 📁 Files

```
EARNNOVA_WEB/
├── index.html          # Main SPA (all pages)
├── manifest.json       # PWA manifest (install as app)
├── service-worker.js   # PWA service worker (offline support)
├── css/
│   └── style.css       # Complete Material Design styling
├── js/
│   ├── firebase-config.js  # Firebase configuration
│   ├── auth.js             # Authentication (Email/Password + Google)
│   ├── dashboard.js        # User dashboard functions
│   ├── admin.js            # Admin panel functions
│   └── app.js              # Main app routing + initialization
└── assets/
    ├── logo.svg            # Blue gradient logo
    ├── logo-splash.svg     # White splash logo
    └── icon-*.png          # PWA icons (72x72 to 512x512)
```

## 🚀 How to Run

### Option 1: Python Server
```bash
cd /storage/emulated/0/pi/EARNNOVA_WEB
python3 -m http.server 8080
# Open: http://localhost:8080
```

### Option 2: Firebase Hosting
```bash
cd /storage/emulated/0/pi/EARNNOVA_WEB
npx firebase-tools init hosting
npx firebase-tools deploy --only hosting
```

### Option 3: Any Static Host
Upload the `EARNNOVA_WEB/` folder to any web server (Netlify, Vercel, GitHub Pages, etc.)

## 🔥 Features
- **Email/Password Auth** + **Google Sign-In**
- **Dashboard** with stats (balance, ads watched, referrals, total earned)
- **Earn Page** - Watch ads to earn money
- **Withdrawals** - bKash, Nagad, Binance, PayPal, Wise, Bank, Crypto
- **Referral System** - Share link, earn $5 per referral
- **Transaction History** - View all earnings/withdrawals
- **Notifications** - Real-time alerts
- **Admin Panel** - Manage users, withdrawals, ads, send notifications
- **PWA Support** - Install as app on your phone
- **Offline Support** - Service worker caches content

---

# 📱 Convert Website to Android App

## Method 1: PWA (Progressive Web App) - Easiest

The website already has PWA support. On Chrome:
1. Open the website
2. Tap menu → "Add to Home Screen"
3. It installs as a standalone app

## Method 2: Bubblewrap (TWA - Trusted Web Activity)

```bash
npm install -g @pwabuilder/cli
pwabuilder create -p android
```
This creates a real Android APK using WebView.

## Method 3: WebView Wrapper (Manual APK)

Create a minimal Android app with:
```xml
<!-- AndroidManifest.xml -->
<activity android:name=".MainActivity">
    <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
    </intent-filter>
</activity>
```

```java
// MainActivity.java
public class MainActivity extends AppCompatActivity {
    private WebView webView;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        webView = new WebView(this);
        setContentView(webView);
        
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        
        // Load your website
        webView.loadUrl("https://your-site.com");
    }
}
```

## Method 4: PWA2APK (Online Tool)
Upload your website URL to: https://appmaker.xyz/pwa-to-apk

## Method 5: Capacitor/PhoneGap
```bash
npm install @capacitor/core @capacitor/android
npx cap init
npx cap add android
npx cap copy
```
Then open in Android Studio and build.

---

## 🔑 Admin Access
- Email: rafetnoob731@gmail.com (auto-grants admin)
- Other admins can be added in Firestore: `system/config.adminUids`
