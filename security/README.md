# 🛡️ EARNNOVA Security Toolkit

Python-powered security automation suite for your Laravel application.

## 📦 Installation

```bash
# Install Python dependencies
pip install -r requirements.txt

# Or use the helper script
./run_audit.sh install
```

## 🔍 Security Audit

Comprehensive security scanner that checks:

| Module | Checks |
|--------|--------|
| **Laravel Config** | APP_KEY strength, APP_DEBUG, session driver, DB password, .env exposure |
| **Dependencies** | Composer & npm vulnerabilities, outdated packages |
| **HTTP Headers** | CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy |
| **TLS/SSL** | Certificate expiry, TLS version, cipher strength |
| **Log Analysis** | SQL injection attempts, XSS probes, CSRF mismatches, brute force |
| **Code Quality** | Raw SQL, `eval()`, `unserialize()`, command injection patterns |

```bash
# Full audit with HTML report
./run_audit.sh audit --url https://earnnova.com --report security_report.html

# Quick CI check (exit 1 on critical)
./run_audit.sh ci

# Check specific URL
python3 audit.py --path /var/www/earnnova --url https://earnnova.com --report audit.html
```

## 🎯 Fraud Detection

ML-powered analysis of user behavior to detect:

- **Same IP Multi-Account** — Account farming detection
- **Rapid Withdrawal** — Users withdrawing immediately after registration
- **Bonus Abuse** — Referral program fraud
- **Ad Automation** — Bot/script detection for ad watching

```bash
# Analyze a specific user
./run_audit.sh fraud analyze \
    --user-id usr_abc123 \
    --ads-per-hour 12 \
    --accounts-per-ip 5 \
    --hours-since-reg 2 \
    --referral-count 15 \
    --same-ip-referrals 4

# Run demo with sample data
./run_audit.sh fraud demo
```

## 🌐 Threat Intelligence

Real-time IP/domain reputation analysis:

```bash
# Check an IP address
./run_audit.sh threat check-ip 185.220.101.0

# Analyze Laravel access log for attacks
./run_audit.sh threat analyze-log /var/www/earnnova/storage/logs/laravel.log

# View threat intelligence stats
./run_audit.sh threat stats
```

## 🤖 CI/CD Integration

Add to your `.github/workflows/deploy.yml`:

```yaml
- name: Security Audit
  run: |
    pip install -r security/requirements.txt
    python3 security/audit.py --path . --ci --json security/ci_result.json
```

## 📊 Reports

The audit generates professional HTML reports with:
- Security score (0–100)
- Severity breakdown (critical → info)
- Detailed findings with remediation steps
- Color-coded severity indicators
- Dark theme matching EARNNOVA design system

## 🔗 Laravel Integration

The toolkit reads `.env` and `config/` files directly, so it requires no additional configuration — just run it from your Laravel project root.
