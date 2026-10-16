-- ============================================================================
-- DASARI DARBAR - FULLY ADMIN-CONTROLLED LOYALTY TRACKS (TRACK 1 & TRACK 2)
-- Safe, Idempotent, Rerunnable Migration for Supabase SQL Editor
-- ============================================================================

-- 1. Ensure columns exist on public.loyalty_offers
ALTER TABLE IF EXISTS public.loyalty_offers ADD COLUMN IF NOT EXISTS track TEXT DEFAULT 'track1';
ALTER TABLE IF EXISTS public.loyalty_offers ADD COLUMN IF NOT EXISTS allocation_percentage NUMERIC(5, 2) DEFAULT NULL;
ALTER TABLE IF EXISTS public.loyalty_offers ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- 2. Ensure columns exist on public.big_bill_coupons for dynamic reward types (free items, etc.)
ALTER TABLE IF EXISTS public.big_bill_coupons ADD COLUMN IF NOT EXISTS reward_type TEXT DEFAULT 'percentage_discount';
ALTER TABLE IF EXISTS public.big_bill_coupons ADD COLUMN IF NOT EXISTS reward_name TEXT;
ALTER TABLE IF EXISTS public.big_bill_coupons ADD COLUMN IF NOT EXISTS source_offer_id TEXT;

-- 3. Ensure columns exist on public.customer_rewards for offer tracking
ALTER TABLE IF EXISTS public.customer_rewards ADD COLUMN IF NOT EXISTS original_offer_id TEXT;

-- 4. Assign track and allocation percentages to existing Track 1 offers if not already configured
UPDATE public.loyalty_offers
SET track = 'track1',
    allocation_percentage = COALESCE(allocation_percentage, 25.0),
    is_deleted = COALESCE(is_deleted, false)
WHERE track IS NULL OR track = 'track1';

-- 5. Seed default Track 2 (Big Bill) offer if none exists
INSERT INTO public.loyalty_offers (
  title, 
  track, 
  discount_type, 
  value, 
  discount_percent, 
  max_discount, 
  description, 
  active, 
  expiry_days, 
  allocation_percentage, 
  is_deleted
)
SELECT 
  '10% Big Bill Discount', 
  'track2', 
  'percentage_discount', 
  '10%', 
  10.0, 
  300.0, 
  '10% instant discount on your next family dining visit (Max ₹300). Show original physical bill at counter when redeeming.', 
  true, 
  30, 
  100.0, 
  false
WHERE NOT EXISTS (
  SELECT 1 FROM public.loyalty_offers WHERE track = 'track2' AND (is_deleted IS NULL OR is_deleted = false)
);

-- 6. Indexes for optimal track-filtered queries
CREATE INDEX IF NOT EXISTS idx_loyalty_offers_track_active 
  ON public.loyalty_offers(track, active) 
  WHERE (is_deleted = false);
