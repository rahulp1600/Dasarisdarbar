# Supabase Setup Guide - Dasari's Darbar

Follow these steps to connect your Dasari's Darbar web application to your live Supabase database & authentication.

---

## 1. Create Supabase Database Tables

Go to your **Supabase Dashboard** -> **SQL Editor**, paste the script below, and click **Run**:

```sql
-- 1. Menu Items Table
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC,
  tag TEXT,
  is_veg BOOLEAN DEFAULT false,
  is_available BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Customers Table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_uid TEXT UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Visits Table (Track 1 & Track 2)
CREATE TABLE IF NOT EXISTS visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  customer_name TEXT,
  phone TEXT,
  bill_number TEXT UNIQUE NOT NULL,
  bill_amount NUMERIC NOT NULL,
  track TEXT CHECK (track IN ('under_2000', 'over_2000')),
  verified BOOLEAN DEFAULT false,
  visit_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Loyalty Offers Table
CREATE TABLE IF NOT EXISTS loyalty_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  track TEXT CHECK (track IN ('track1', 'track2')),
  discount_type TEXT NOT NULL,
  value TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Redemptions Table
CREATE TABLE IF NOT EXISTS redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  offer_id UUID REFERENCES loyalty_offers(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  staff_verified BOOLEAN DEFAULT false
);

-- 6. Dine-In Offers Table
CREATE TABLE IF NOT EXISTS dine_in_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  valid_from DATE,
  valid_to DATE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Table Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  party_size INT NOT NULL,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initial Menu Seed
INSERT INTO menu_items (category, name, description, price, tag, is_veg, is_available, sort_order) VALUES
('soups', 'Veg Corn Soup', 'Sweet corn kernel soup with subtle herbs.', 110, NULL, true, true, 1),
('soups', 'Chicken Corn Soup', 'Rich chicken broth with shredded chicken and sweet corn.', 140, 'popular', false, true, 2),
('starters', 'Basket Chicken', 'Crispy, generous, shareable signature fried chicken basket.', 351, 'must_try', false, true, 3),
('mandi', 'Tandoori Chicken Mandi', 'Authentic Yemeni mandi rice served with smoky tandoori chicken.', 450, 'bestseller', false, true, 4),
('pulavs', 'Raju Gari Kodi Pulav', 'Traditional Godavari style spicy chicken pulao with pure ghee.', 360, 'popular', false, true, 5),
('desserts', 'Apricot Delight', 'Classic Hyderabadi dessert made with dried apricots and cream.', 180, NULL, true, true, 6);
```

---

## 2. Configure Environment Variables

Create a `.env` file in `c:\Client\` with your credentials from **Supabase Dashboard** -> **Project Settings** -> **API**:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-anon-key
```

---

## 3. Enable Authentication

1. Go to **Authentication** -> **Providers** in Supabase.
2. Enable **Email** (used for Owner Admin login).
3. Enable **Google** (used for customer loyalty Google sign-in).
