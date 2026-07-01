-- =============================================
-- EARNNOVA BETA - Supabase Schema
-- Run this in Supabase SQL Editor
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================== USERS ====================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firebase_uid TEXT UNIQUE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL DEFAULT 'User',
  phone TEXT,
  photo_url TEXT,
  balance DECIMAL(12,2) DEFAULT 0,
  total_earned DECIMAL(12,2) DEFAULT 0,
  total_withdrawn DECIMAL(12,2) DEFAULT 0,
  ads_watched INTEGER DEFAULT 0,
  referral_code TEXT UNIQUE NOT NULL,
  referred_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  is_admin BOOLEAN DEFAULT false,
  fcm_token TEXT,
  settings JSONB DEFAULT '{"notifications": true, "theme": "light"}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== ADS ====================
CREATE TABLE IF NOT EXISTS ads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  reward DECIMAL(8,4) DEFAULT 0.05,
  duration INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== TRANSACTIONS ====================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  status TEXT DEFAULT 'completed',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== WITHDRAWALS ====================
CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  method TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  details JSONB,
  status TEXT DEFAULT 'pending',
  approved_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== REFERRALS ====================
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  referred_id UUID REFERENCES users(id) ON DELETE CASCADE,
  referred_name TEXT,
  bonus DECIMAL(8,2) DEFAULT 5.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== NOTIFICATIONS ====================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'general',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== AD WATCHES ====================
CREATE TABLE IF NOT EXISTS ad_watches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ad_id UUID REFERENCES ads(id) ON DELETE CASCADE,
  reward DECIMAL(8,4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== INDEXES ====================
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_ads_active ON ads(is_active);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);

-- ==================== ENABLE RLS ====================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_watches ENABLE ROW LEVEL SECURITY;

-- ==================== RLS POLICIES ====================

-- Users: read own, admins read all
CREATE POLICY "Users read own profile" ON users
  FOR SELECT USING (auth.uid() = id OR is_admin = true);

CREATE POLICY "Users update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Ads: public read, admin write
CREATE POLICY "Anyone can view active ads" ON ads
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins manage ads" ON ads
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
  );

-- Transactions: read own, admin read all
CREATE POLICY "Users read own transactions" ON transactions
  FOR SELECT USING (
    user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
  );

CREATE POLICY "System can create transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Withdrawals: read own, admin read all
CREATE POLICY "Users read own withdrawals" ON withdrawals
  FOR SELECT USING (
    user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
  );

CREATE POLICY "Users can create withdrawals" ON withdrawals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update withdrawals" ON withdrawals
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
  );

-- Referrals: public read
CREATE POLICY "Users can view referrals" ON referrals
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can create referrals" ON referrals
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Notifications: read own
CREATE POLICY "Users read own notifications" ON notifications
  FOR SELECT USING (
    user_id = auth.uid() OR user_id IS NULL
  );

-- Ad watches: read own
CREATE POLICY "Users read own ad watches" ON ad_watches
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create ad watches" ON ad_watches
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ==================== SEED DATA ====================

-- Insert sample ads
INSERT INTO ads (title, reward, duration, is_active) VALUES
  ('Premium Video Ad', 0.10, 10, true),
  ('Quick Cash Ad', 0.05, 5, true),
  ('Featured Promotion', 0.15, 15, true),
  ('Standard Banner', 0.03, 5, true),
  ('Bonus Video', 0.20, 20, true);

-- Insert default notifications
INSERT INTO notifications (title, message, type) VALUES
  ('Welcome to EARNNOVA!', 'Start earning by watching ads in the Earn tab.', 'general'),
  ('Refer & Earn', 'Share your referral link and earn $5 per referral!', 'promotion');
