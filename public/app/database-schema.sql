# EARNNOVA — Complete Database Architecture

## Source
Comprehensive database design prompt from user (June 2026). Covers ad tracking, user earnings, real-time logging.

## FOREIGN KEY FIX
All REFERENCES now use ON DELETE CASCADE or ON DELETE SET NULL to prevent
"FOREIGN KEY constraint failed" errors. Ensures data integrity without blocking inserts.

---

## 1. USERS TABLE

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  device_id TEXT,
  country TEXT,
  referral_code TEXT UNIQUE,
  referred_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ad_block_status BOOLEAN DEFAULT false,
  total_earnings DECIMAL(12,2) DEFAULT 0,
  wallet_balance DECIMAL(12,2) DEFAULT 0,
  is_premium BOOLEAN DEFAULT false,
  premium_tier TEXT DEFAULT 'free' CHECK (premium_tier IN ('free','pro','premium','elite')),
  premium_expiry TIMESTAMPTZ,
  is_moderator BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 2. AD REQUESTS TABLE (Every Ad Call)

```sql
CREATE TABLE ad_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT,
  session_id TEXT,
  ad_network TEXT CHECK (ad_network IN ('monetag','admob','applovin','unity','other')),
  ad_type TEXT CHECK (ad_type IN ('banner','interstitial','rewarded','native','popunder','push')),
  ad_unit_id TEXT,
  placement_name TEXT,
  request_timestamp TIMESTAMPTZ DEFAULT NOW(),
  request_ip TEXT,
  user_agent TEXT,
  os_version TEXT,
  app_version TEXT,
  browser TEXT,
  is_test_mode BOOLEAN DEFAULT false,
  status TEXT CHECK (status IN ('requested','loaded','shown','failed','expired','skipped')),
  error_code TEXT,
  error_message TEXT,
  response_time_ms INTEGER,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 3. AD IMPRESSIONS (Successful Views)

```sql
CREATE TABLE ad_impressions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ad_request_id UUID REFERENCES ad_requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ad_network TEXT,
  ad_type TEXT,
  earnings_amount DECIMAL(10,4),
  earnings_currency TEXT DEFAULT 'USD',
  impression_timestamp TIMESTAMPTZ DEFAULT NOW(),
  view_duration_seconds INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  is_viewable BOOLEAN DEFAULT true,
  referrer_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 4. AD ERRORS (Failure Logs)

```sql
CREATE TABLE ad_errors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ad_request_id UUID REFERENCES ad_requests(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT,
  ad_network TEXT,
  error_code TEXT,
  error_category TEXT CHECK (error_category IN ('network','fill','timeout','placement','policy','other')),
  error_description TEXT,
  stack_trace TEXT,
  network_type TEXT CHECK (network_type IN ('wifi','4g','5g','ethernet','unknown')),
  signal_strength INTEGER DEFAULT 0,
  battery_level INTEGER DEFAULT 0,
  is_background BOOLEAN DEFAULT false,
  is_vpn_active BOOLEAN DEFAULT false,
  is_adblock_detected BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 5. USER EARNINGS

```sql
CREATE TABLE user_earnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ad_impression_id UUID REFERENCES ad_impressions(id) ON DELETE SET NULL,
  amount DECIMAL(10,4),
  currency TEXT DEFAULT 'USD',
  source TEXT CHECK (source IN ('ad_watch','referral_bonus','mission_reward','daily_bonus','spin_win')),
  description TEXT,
  is_credited BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 6. AD CONFIG (Dynamic Settings)

```sql
CREATE TABLE ad_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ad_network TEXT,
  ad_type TEXT,
  placement_id TEXT,
  placement_name TEXT,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  fallback_network TEXT,
  fallback_placement_id TEXT,
  frequency_cap INTEGER DEFAULT 0,
  daily_limit INTEGER DEFAULT 0,
  min_earnings_per_ad DECIMAL(10,4),
  max_earnings_per_ad DECIMAL(10,4),
  country_restrictions JSONB,
  device_restrictions JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 7. SESSIONS (User Activity)

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT,
  session_token TEXT UNIQUE,
  ip_address TEXT,
  user_agent TEXT,
  start_time TIMESTAMPTZ DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  total_ad_requests INTEGER DEFAULT 0,
  total_ad_impressions INTEGER DEFAULT 0,
  total_ad_errors INTEGER DEFAULT 0,
  total_earnings DECIMAL(10,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 8. DIAGNOSTIC LOGS

```sql
CREATE TABLE diagnostic_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  log_type TEXT CHECK (log_type IN ('info','warning','error','debug','fatal')),
  component TEXT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  device_id TEXT,
  session_id TEXT,
  log_message TEXT,
  log_data JSONB,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 9. REFERRALS

```sql
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  referral_code_used TEXT,
  status TEXT CHECK (status IN ('pending','active','completed','expired')),
  bonus_earned DECIMAL(10,4) DEFAULT 0,
  bonus_paid BOOLEAN DEFAULT false,
  referred_at TIMESTAMPTZ DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 10. MISSIONS

```sql
CREATE TABLE missions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  description TEXT,
  mission_type TEXT CHECK (mission_type IN ('watch_ads','refer_friend','daily_login','spend_time','share_social')),
  requirement_value INTEGER,
  reward_amount DECIMAL(10,4),
  reward_type TEXT CHECK (reward_type IN ('cash','bonus','premium_days','badge')),
  frequency TEXT CHECK (frequency IN ('daily','weekly','monthly','one_time')),
  is_active BOOLEAN DEFAULT true,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_mission_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  mission_id UUID REFERENCES missions(id) ON DELETE CASCADE,
  progress_value INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  reward_claimed BOOLEAN DEFAULT false,
  claimed_at TIMESTAMPTZ,
  reset_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 11. WITHDRAWALS

```sql
CREATE TABLE withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10,4),
  currency TEXT DEFAULT 'USD',
  payment_method TEXT CHECK (payment_method IN ('bkash','nagad','paypal','crypto','bank_transfer')),
  payment_address TEXT,
  status TEXT CHECK (status IN ('pending','processing','completed','failed','cancelled')),
  transaction_id TEXT,
  processing_fee DECIMAL(10,4) DEFAULT 0,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 12. WALLET TRANSACTIONS (Real-Time)

```sql
CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  transaction_type TEXT CHECK (transaction_type IN ('credit','debit','hold','refund')),
  amount DECIMAL(10,4),
  previous_balance DECIMAL(10,4),
  new_balance DECIMAL(10,4),
  source TEXT,
  source_id UUID,
  is_reversed BOOLEAN DEFAULT false,
  reversed_at TIMESTAMPTZ,
  reversal_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 13. NOTIFICATIONS (Delivery Log)

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  notification_type TEXT CHECK (notification_type IN ('earning','mission','referral','system','ad_ready')),
  title TEXT,
  body TEXT,
  data JSONB,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  is_sent BOOLEAN DEFAULT false,
  is_delivered BOOLEAN DEFAULT false,
  is_read BOOLEAN DEFAULT false,
  is_clicked BOOLEAN DEFAULT false,
  delivery_channel TEXT CHECK (delivery_channel IN ('push','in_app','email','sms')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Indexes

```sql
CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE UNIQUE INDEX idx_users_device_id ON users(device_id);
CREATE UNIQUE INDEX idx_users_referral_code ON users(referral_code);
CREATE INDEX idx_ad_requests_user_id ON ad_requests(user_id);
CREATE INDEX idx_ad_requests_status ON ad_requests(status);
CREATE INDEX idx_ad_requests_created_at ON ad_requests(created_at);
CREATE INDEX idx_ad_impressions_user_id ON ad_impressions(user_id);
CREATE INDEX idx_ad_impressions_created_at ON ad_impressions(created_at);
CREATE INDEX idx_ad_errors_user_id ON ad_errors(user_id);
CREATE INDEX idx_ad_errors_error_code ON ad_errors(error_code);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE UNIQUE INDEX idx_sessions_token ON sessions(session_token);
CREATE INDEX idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX idx_withdrawals_status ON withdrawals(status);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
```

---

## Real-Time Trigger (PostgreSQL LISTEN/NOTIFY)

```sql
CREATE OR REPLACE FUNCTION notify_earnings_update()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('earnings_update', row_to_json(NEW)::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_earnings_update
AFTER INSERT ON user_earnings
FOR EACH ROW EXECUTE FUNCTION notify_earnings_update();
```

---

## Key Queries

### Error rate per network
```sql
SELECT 
  ad_network,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) * 100.0 / COUNT(*) as error_rate,
  COUNT(*) as total_requests
FROM ad_requests
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY ad_network;
```

### Live active users
```sql
SELECT COUNT(DISTINCT user_id) 
FROM sessions 
WHERE is_active = true 
AND last_ping_time > NOW() - INTERVAL '5 minutes';
```

### Daily earnings
```sql
SELECT SUM(amount) as today_earnings
FROM user_earnings
WHERE created_at::date = CURRENT_DATE;
```
