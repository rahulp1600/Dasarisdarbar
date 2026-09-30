-- ============================================================================
-- DASARI DARBAR - COMPREHENSIVE LOYALTY & OCR SYSTEM SCHEMA MIGRATION
-- Safe & idempotent: run this directly in Supabase Dashboard -> SQL Editor
-- ============================================================================

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  role TEXT DEFAULT 'customer' CHECK (role IN ('customer', 'staff', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'customer';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================================================
-- 2. VERIFIED BILLS TABLE (Central source of truth for verified bills)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.verified_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT NOT NULL,
  bill_number TEXT NOT NULL,
  bill_date DATE NOT NULL,
  bill_amount NUMERIC(10, 2) NOT NULL,
  restaurant_name TEXT NOT NULL DEFAULT 'Dasari Darbar',
  ocr_raw_text TEXT,
  ocr_confidence NUMERIC(3, 2),
  bill_image_reference TEXT,
  bill_fingerprint TEXT UNIQUE NOT NULL,
  verification_status TEXT DEFAULT 'verified' CHECK (verification_status IN ('verified', 'flagged', 'rejected')),
  verification_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.verified_bills ADD COLUMN IF NOT EXISTS customer_id TEXT;
ALTER TABLE public.verified_bills ADD COLUMN IF NOT EXISTS bill_number TEXT;
ALTER TABLE public.verified_bills ADD COLUMN IF NOT EXISTS bill_date DATE;
ALTER TABLE public.verified_bills ADD COLUMN IF NOT EXISTS bill_amount NUMERIC(10, 2);
ALTER TABLE public.verified_bills ADD COLUMN IF NOT EXISTS restaurant_name TEXT DEFAULT 'Dasari Darbar';
ALTER TABLE public.verified_bills ADD COLUMN IF NOT EXISTS ocr_raw_text TEXT;
ALTER TABLE public.verified_bills ADD COLUMN IF NOT EXISTS ocr_confidence NUMERIC(3, 2);
ALTER TABLE public.verified_bills ADD COLUMN IF NOT EXISTS bill_image_reference TEXT;
ALTER TABLE public.verified_bills ADD COLUMN IF NOT EXISTS bill_fingerprint TEXT;
ALTER TABLE public.verified_bills ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'verified';
ALTER TABLE public.verified_bills ADD COLUMN IF NOT EXISTS verification_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_verified_bills_num_date ON public.verified_bills(bill_number, bill_date);
CREATE INDEX IF NOT EXISTS idx_verified_bills_created ON public.verified_bills(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_verified_bills_customer ON public.verified_bills(customer_id);

-- ============================================================================
-- 3. LOYALTY PROGRESS TABLE (Tracks qualifying streak 0 to 5)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.loyalty_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT UNIQUE NOT NULL,
  qualifying_visits_count INT DEFAULT 0 CHECK (qualifying_visits_count >= 0 AND qualifying_visits_count <= 5),
  total_visits_lifetime INT DEFAULT 0,
  last_visit_date DATE,
  milestone_unlocked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.loyalty_progress ADD COLUMN IF NOT EXISTS customer_id TEXT;
ALTER TABLE public.loyalty_progress ADD COLUMN IF NOT EXISTS qualifying_visits_count INT DEFAULT 0;
ALTER TABLE public.loyalty_progress ADD COLUMN IF NOT EXISTS total_visits_lifetime INT DEFAULT 0;
ALTER TABLE public.loyalty_progress ADD COLUMN IF NOT EXISTS last_visit_date DATE;
ALTER TABLE public.loyalty_progress ADD COLUMN IF NOT EXISTS milestone_unlocked BOOLEAN DEFAULT false;
ALTER TABLE public.loyalty_progress ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_loyalty_progress_cust ON public.loyalty_progress(customer_id);

-- ============================================================================
-- 4. LOYALTY CLAIMS TABLE (Audit of all scan attempts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.loyalty_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT NOT NULL,
  bill_number TEXT,
  bill_date DATE,
  bill_amount NUMERIC(10, 2),
  restaurant_name TEXT,
  bill_fingerprint TEXT,
  status TEXT NOT NULL CHECK (status IN ('approved', 'rejected', 'pending_review')),
  status_reason TEXT,
  reward_category TEXT CHECK (reward_category IN ('VISIT_REWARD', 'BIG_BILL_REWARD', 'NONE')),
  reward_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.loyalty_claims ADD COLUMN IF NOT EXISTS customer_id TEXT;
ALTER TABLE public.loyalty_claims ADD COLUMN IF NOT EXISTS bill_number TEXT;
ALTER TABLE public.loyalty_claims ADD COLUMN IF NOT EXISTS bill_date DATE;
ALTER TABLE public.loyalty_claims ADD COLUMN IF NOT EXISTS bill_amount NUMERIC(10, 2);
ALTER TABLE public.loyalty_claims ADD COLUMN IF NOT EXISTS restaurant_name TEXT;
ALTER TABLE public.loyalty_claims ADD COLUMN IF NOT EXISTS bill_fingerprint TEXT;
ALTER TABLE public.loyalty_claims ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE public.loyalty_claims ADD COLUMN IF NOT EXISTS status_reason TEXT;
ALTER TABLE public.loyalty_claims ADD COLUMN IF NOT EXISTS reward_category TEXT;
ALTER TABLE public.loyalty_claims ADD COLUMN IF NOT EXISTS reward_id TEXT;

CREATE INDEX IF NOT EXISTS idx_loyalty_claims_cust ON public.loyalty_claims(customer_id, created_at DESC);

-- ============================================================================
-- 5. LOYALTY OFFERS POOL
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.loyalty_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  track TEXT,
  discount_type TEXT NOT NULL,
  value TEXT NOT NULL,
  discount_percent NUMERIC(5, 2),
  max_discount NUMERIC(10, 2),
  description TEXT,
  active BOOLEAN DEFAULT true,
  expiry_days INT DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Upgrade existing table if it already exists from prior schema
ALTER TABLE public.loyalty_offers ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5, 2);
ALTER TABLE public.loyalty_offers ADD COLUMN IF NOT EXISTS max_discount NUMERIC(10, 2);
ALTER TABLE public.loyalty_offers ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.loyalty_offers ADD COLUMN IF NOT EXISTS expiry_days INT DEFAULT 30;
ALTER TABLE public.loyalty_offers ADD COLUMN IF NOT EXISTS track TEXT;
ALTER TABLE public.loyalty_offers ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE public.loyalty_offers DROP CONSTRAINT IF EXISTS loyalty_offers_track_check;

-- Seed default reward pool
INSERT INTO public.loyalty_offers (title, discount_type, value, discount_percent, max_discount, description, active, expiry_days)
SELECT '15% OFF', 'percentage_discount', '15%', 15, 400, '15% instant discount on your family dining bill (Max ₹400).', true, 30
WHERE NOT EXISTS (SELECT 1 FROM public.loyalty_offers WHERE title = '15% OFF');

INSERT INTO public.loyalty_offers (title, discount_type, value, discount_percent, max_discount, description, active, expiry_days)
SELECT '10% OFF', 'percentage_discount', '10%', 10, 300, '10% instant discount on your dining bill (Max ₹300).', true, 30
WHERE NOT EXISTS (SELECT 1 FROM public.loyalty_offers WHERE title = '10% OFF');

INSERT INTO public.loyalty_offers (title, discount_type, value, discount_percent, max_discount, description, active, expiry_days)
SELECT 'FREE DESSERT', 'free_item', 'Dessert', NULL, NULL, 'Complimentary Double Ka Meetha or Apricot Delight with meal.', true, 30
WHERE NOT EXISTS (SELECT 1 FROM public.loyalty_offers WHERE title = 'FREE DESSERT');

INSERT INTO public.loyalty_offers (title, discount_type, value, discount_percent, max_discount, description, active, expiry_days)
SELECT 'FREE COOL DRINK', 'free_item', 'Cool Drink', NULL, NULL, 'Complimentary chilled Goli Soda or beverage.', true, 30
WHERE NOT EXISTS (SELECT 1 FROM public.loyalty_offers WHERE title = 'FREE COOL DRINK');

-- ============================================================================
-- 6. CUSTOMER REWARDS TABLE (Milestone rewards unlocked on 5th visit)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.customer_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT NOT NULL,
  reward_type TEXT NOT NULL,
  reward_name TEXT NOT NULL,
  reward_code TEXT UNIQUE NOT NULL,
  source_bill_id UUID,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'redeemed', 'expired', 'cancelled')),
  discount_percent NUMERIC(5, 2),
  max_discount NUMERIC(10, 2),
  description TEXT,
  issued_date TIMESTAMPTZ DEFAULT NOW(),
  expiry_date TIMESTAMPTZ,
  redeemed_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.customer_rewards ADD COLUMN IF NOT EXISTS customer_id TEXT;
ALTER TABLE public.customer_rewards ADD COLUMN IF NOT EXISTS reward_type TEXT;
ALTER TABLE public.customer_rewards ADD COLUMN IF NOT EXISTS reward_name TEXT;
ALTER TABLE public.customer_rewards ADD COLUMN IF NOT EXISTS reward_code TEXT;
ALTER TABLE public.customer_rewards ADD COLUMN IF NOT EXISTS source_bill_id UUID;
ALTER TABLE public.customer_rewards ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'available';
ALTER TABLE public.customer_rewards ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5, 2);
ALTER TABLE public.customer_rewards ADD COLUMN IF NOT EXISTS max_discount NUMERIC(10, 2);
ALTER TABLE public.customer_rewards ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.customer_rewards ADD COLUMN IF NOT EXISTS issued_date TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.customer_rewards ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMPTZ;
ALTER TABLE public.customer_rewards ADD COLUMN IF NOT EXISTS redeemed_date TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_customer_rewards_cust ON public.customer_rewards(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_customer_rewards_code ON public.customer_rewards(reward_code);

-- ============================================================================
-- 7. BIG BILL COUPONS TABLE (Coupons generated for bills >= ₹2000)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.big_bill_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT NOT NULL,
  source_bill_id UUID,
  coupon_code TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'redeemed', 'expired', 'cancelled')),
  discount_percent NUMERIC(5, 2) DEFAULT 10.0,
  max_discount NUMERIC(10, 2) DEFAULT 300.0,
  description TEXT DEFAULT '10% instant discount on your next visit (Max ₹300)',
  issued_date TIMESTAMPTZ DEFAULT NOW(),
  expiry_date TIMESTAMPTZ,
  redeemed_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.big_bill_coupons ADD COLUMN IF NOT EXISTS customer_id TEXT;
ALTER TABLE public.big_bill_coupons ADD COLUMN IF NOT EXISTS source_bill_id UUID;
ALTER TABLE public.big_bill_coupons ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE public.big_bill_coupons ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'available';
ALTER TABLE public.big_bill_coupons ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5, 2) DEFAULT 10.0;
ALTER TABLE public.big_bill_coupons ADD COLUMN IF NOT EXISTS max_discount NUMERIC(10, 2) DEFAULT 300.0;
ALTER TABLE public.big_bill_coupons ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.big_bill_coupons ADD COLUMN IF NOT EXISTS issued_date TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.big_bill_coupons ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMPTZ;
ALTER TABLE public.big_bill_coupons ADD COLUMN IF NOT EXISTS redeemed_date TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_big_bill_coupons_cust ON public.big_bill_coupons(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_big_bill_coupons_code ON public.big_bill_coupons(coupon_code);

-- ============================================================================
-- 8. REDEMPTIONS TABLE (Staff redemption records)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT,
  reward_id TEXT,
  reward_type TEXT,
  voucher_code TEXT,
  staff_identifier TEXT DEFAULT 'Staff Counter',
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  staff_verified BOOLEAN DEFAULT true
);

-- Upgrade existing redemptions table if present
ALTER TABLE public.redemptions DROP CONSTRAINT IF EXISTS redemptions_customer_id_fkey;
ALTER TABLE public.redemptions DROP CONSTRAINT IF EXISTS redemptions_offer_id_fkey;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'redemptions' AND column_name = 'customer_id') THEN
    ALTER TABLE public.redemptions ALTER COLUMN customer_id TYPE TEXT USING customer_id::TEXT;
    ALTER TABLE public.redemptions ALTER COLUMN customer_id DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'redemptions' AND column_name = 'offer_id') THEN
    ALTER TABLE public.redemptions ALTER COLUMN offer_id DROP NOT NULL;
  END IF;
END $$;

ALTER TABLE public.redemptions ADD COLUMN IF NOT EXISTS reward_id TEXT;
ALTER TABLE public.redemptions ADD COLUMN IF NOT EXISTS reward_type TEXT;
ALTER TABLE public.redemptions ADD COLUMN IF NOT EXISTS voucher_code TEXT;
ALTER TABLE public.redemptions ADD COLUMN IF NOT EXISTS staff_identifier TEXT DEFAULT 'Staff Counter';
ALTER TABLE public.redemptions ADD COLUMN IF NOT EXISTS redeemed_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.redemptions ADD COLUMN IF NOT EXISTS staff_verified BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_redemptions_code ON public.redemptions(voucher_code);
CREATE INDEX IF NOT EXISTS idx_redemptions_time ON public.redemptions(redeemed_at DESC);

-- ============================================================================
-- 9. ADMIN AUDIT LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  target_record_type TEXT,
  target_record_id TEXT,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admin_audit_logs ADD COLUMN IF NOT EXISTS action_type TEXT;
ALTER TABLE public.admin_audit_logs ADD COLUMN IF NOT EXISTS actor_id TEXT;
ALTER TABLE public.admin_audit_logs ADD COLUMN IF NOT EXISTS target_record_type TEXT;
ALTER TABLE public.admin_audit_logs ADD COLUMN IF NOT EXISTS target_record_id TEXT;
ALTER TABLE public.admin_audit_logs ADD COLUMN IF NOT EXISTS details JSONB;
ALTER TABLE public.admin_audit_logs ADD COLUMN IF NOT EXISTS ip_address TEXT;

CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON public.admin_audit_logs(action_type, created_at DESC);

-- ============================================================================
-- 10. DAILY SEQUENCE CONFIGS TABLE (Admin-configured daily starting bill number)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.daily_sequence_configs (
  business_date DATE PRIMARY KEY,
  first_bill_number INT NOT NULL,
  configured_by TEXT DEFAULT 'Admin',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.daily_sequence_configs ADD COLUMN IF NOT EXISTS first_bill_number INT;
ALTER TABLE public.daily_sequence_configs ADD COLUMN IF NOT EXISTS configured_by TEXT DEFAULT 'Admin';
ALTER TABLE public.daily_sequence_configs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.daily_sequence_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read daily_sequence_configs" ON public.daily_sequence_configs;
CREATE POLICY "Allow read daily_sequence_configs"
  ON public.daily_sequence_configs FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow write daily_sequence_configs" ON public.daily_sequence_configs;
CREATE POLICY "Allow write daily_sequence_configs"
  ON public.daily_sequence_configs FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verified_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dine_in_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.visits ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verified_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.big_bill_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow public read of active offers
DROP POLICY IF EXISTS "Public can view active loyalty offers" ON public.loyalty_offers;
CREATE POLICY "Public can view active loyalty offers"
  ON public.loyalty_offers FOR SELECT
  USING (active = true);

-- Deduplicate and set single clean policy on menu_items
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'menu_items' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.menu_items', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Public can view menu items"
  ON public.menu_items FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public can view dine-in offers" ON public.dine_in_offers;
CREATE POLICY "Public can view dine-in offers"
  ON public.dine_in_offers FOR SELECT
  USING (active = true);

DROP POLICY IF EXISTS "Public can create bookings" ON public.bookings;
CREATE POLICY "Public can create bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (name IS NOT NULL AND phone IS NOT NULL);

DROP POLICY IF EXISTS "Public can view bookings" ON public.bookings;
CREATE POLICY "Public can view bookings"
  ON public.bookings FOR SELECT
  USING (phone IS NOT NULL);

-- Customers table policies
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'customers' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.customers', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Allow read customers"
  ON public.customers FOR SELECT
  USING (true);

CREATE POLICY "Allow insert customers"
  ON public.customers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow update customers"
  ON public.customers FOR UPDATE
  USING (true);

-- Visits table policies & foreign key index
CREATE INDEX IF NOT EXISTS idx_visits_customer_id ON public.visits(customer_id);

DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'visits' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.visits', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Allow read visits"
  ON public.visits FOR SELECT
  USING (true);

CREATE POLICY "Allow insert visits"
  ON public.visits FOR INSERT
  WITH CHECK (true);

-- Profiles policies
DROP POLICY IF EXISTS "Allow all on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow update profiles" ON public.profiles;

CREATE POLICY "Allow read profiles"
  ON public.profiles FOR SELECT
  USING (id IS NOT NULL);

CREATE POLICY "Allow insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (full_name IS NOT NULL);

CREATE POLICY "Allow update profiles"
  ON public.profiles FOR UPDATE
  USING (id IS NOT NULL);

-- Verified bills policies
DROP POLICY IF EXISTS "Allow all for authenticated users on verified_bills" ON public.verified_bills;
DROP POLICY IF EXISTS "Allow read verified_bills" ON public.verified_bills;
DROP POLICY IF EXISTS "Allow insert verified_bills" ON public.verified_bills;
DROP POLICY IF EXISTS "Allow update verified_bills" ON public.verified_bills;

CREATE POLICY "Allow read verified_bills"
  ON public.verified_bills FOR SELECT
  USING (customer_id IS NOT NULL);

CREATE POLICY "Allow insert verified_bills"
  ON public.verified_bills FOR INSERT
  WITH CHECK (customer_id IS NOT NULL AND bill_number IS NOT NULL);

CREATE POLICY "Allow update verified_bills"
  ON public.verified_bills FOR UPDATE
  USING (customer_id IS NOT NULL);

-- Loyalty progress policies
DROP POLICY IF EXISTS "Allow all on loyalty_progress" ON public.loyalty_progress;
DROP POLICY IF EXISTS "Allow read loyalty_progress" ON public.loyalty_progress;
DROP POLICY IF EXISTS "Allow insert loyalty_progress" ON public.loyalty_progress;
DROP POLICY IF EXISTS "Allow update loyalty_progress" ON public.loyalty_progress;

CREATE POLICY "Allow read loyalty_progress"
  ON public.loyalty_progress FOR SELECT
  USING (customer_id IS NOT NULL);

CREATE POLICY "Allow insert loyalty_progress"
  ON public.loyalty_progress FOR INSERT
  WITH CHECK (customer_id IS NOT NULL);

CREATE POLICY "Allow update loyalty_progress"
  ON public.loyalty_progress FOR UPDATE
  USING (customer_id IS NOT NULL);

-- Loyalty claims policies
DROP POLICY IF EXISTS "Allow all on loyalty_claims" ON public.loyalty_claims;
DROP POLICY IF EXISTS "Allow read loyalty_claims" ON public.loyalty_claims;
DROP POLICY IF EXISTS "Allow insert loyalty_claims" ON public.loyalty_claims;

CREATE POLICY "Allow read loyalty_claims"
  ON public.loyalty_claims FOR SELECT
  USING (customer_id IS NOT NULL);

CREATE POLICY "Allow insert loyalty_claims"
  ON public.loyalty_claims FOR INSERT
  WITH CHECK (customer_id IS NOT NULL);

-- Customer rewards policies
DROP POLICY IF EXISTS "Allow all on customer_rewards" ON public.customer_rewards;
DROP POLICY IF EXISTS "Allow read customer_rewards" ON public.customer_rewards;
DROP POLICY IF EXISTS "Allow insert customer_rewards" ON public.customer_rewards;
DROP POLICY IF EXISTS "Allow update customer_rewards" ON public.customer_rewards;

CREATE POLICY "Allow read customer_rewards"
  ON public.customer_rewards FOR SELECT
  USING (reward_code IS NOT NULL);

CREATE POLICY "Allow insert customer_rewards"
  ON public.customer_rewards FOR INSERT
  WITH CHECK (customer_id IS NOT NULL AND reward_code IS NOT NULL);

CREATE POLICY "Allow update customer_rewards"
  ON public.customer_rewards FOR UPDATE
  USING (reward_code IS NOT NULL);

-- Big bill coupons policies
DROP POLICY IF EXISTS "Allow all on big_bill_coupons" ON public.big_bill_coupons;
DROP POLICY IF EXISTS "Allow read big_bill_coupons" ON public.big_bill_coupons;
DROP POLICY IF EXISTS "Allow insert big_bill_coupons" ON public.big_bill_coupons;
DROP POLICY IF EXISTS "Allow update big_bill_coupons" ON public.big_bill_coupons;

CREATE POLICY "Allow read big_bill_coupons"
  ON public.big_bill_coupons FOR SELECT
  USING (coupon_code IS NOT NULL);

CREATE POLICY "Allow insert big_bill_coupons"
  ON public.big_bill_coupons FOR INSERT
  WITH CHECK (customer_id IS NOT NULL AND coupon_code IS NOT NULL);

CREATE POLICY "Allow update big_bill_coupons"
  ON public.big_bill_coupons FOR UPDATE
  USING (coupon_code IS NOT NULL);

-- Redemptions policies
DROP POLICY IF EXISTS "Allow all on redemptions" ON public.redemptions;
DROP POLICY IF EXISTS "Allow read redemptions" ON public.redemptions;
DROP POLICY IF EXISTS "Allow insert redemptions" ON public.redemptions;

CREATE POLICY "Allow read redemptions"
  ON public.redemptions FOR SELECT
  USING (voucher_code IS NOT NULL);

CREATE POLICY "Allow insert redemptions"
  ON public.redemptions FOR INSERT
  WITH CHECK (voucher_code IS NOT NULL);

-- Admin audit logs policies
DROP POLICY IF EXISTS "Allow all on admin_audit_logs" ON public.admin_audit_logs;
DROP POLICY IF EXISTS "Allow read admin_audit_logs" ON public.admin_audit_logs;
DROP POLICY IF EXISTS "Allow insert admin_audit_logs" ON public.admin_audit_logs;

CREATE POLICY "Allow read admin_audit_logs"
  ON public.admin_audit_logs FOR SELECT
  USING (action_type IS NOT NULL);

CREATE POLICY "Allow insert admin_audit_logs"
  ON public.admin_audit_logs FOR INSERT
  WITH CHECK (action_type IS NOT NULL);

