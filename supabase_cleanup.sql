-- ============================================================================
-- DASARI DARBAR - SUPABASE ADVISOR CLEANUP
-- Clears:
-- 1. "RLS Enabled No Policy" on customers and visits
-- 2. "Multiple Permissive Policies" on menu_items
-- 3. "Unindexed foreign keys" on visits(customer_id)
-- ============================================================================

-- 1. Fix Multiple Permissive Policies on menu_items
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'menu_items' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.menu_items', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Public can view menu items"
  ON public.menu_items FOR SELECT
  USING (true);

-- 2. Fix "RLS Enabled No Policy" on customers
DO $$
DECLARE
  pol RECORD;
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

-- 3. Fix "RLS Enabled No Policy" on visits
DO $$
DECLARE
  pol RECORD;
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

-- 4. Fix "Unindexed foreign keys" on visits.customer_id
CREATE INDEX IF NOT EXISTS idx_visits_customer_id ON public.visits(customer_id);
