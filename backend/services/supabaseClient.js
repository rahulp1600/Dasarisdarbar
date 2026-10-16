import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from backend/.env and root .env
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const rawServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
export const isServiceRoleConfigured = Boolean(
  rawServiceRoleKey &&
  !rawServiceRoleKey.startsWith('sb_publishable_') &&
  rawServiceRoleKey.length > 20
);

if (process.env.NODE_ENV === 'production' && !isServiceRoleConfigured) {
  console.warn('[SECURITY NOTICE] SUPABASE_SERVICE_ROLE_KEY is missing or configured with an unprivileged publishable key. Privileged database operations will fail securely.');
}

export const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
  : null;

// Local fallback store path
const dataDir = path.join(__dirname, '..', 'data');
const storePath = path.join(dataDir, 'db.json');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const DEFAULT_STORE = {
  verified_bills: [],
  loyalty_claims: [],
  loyalty_progress: {},
  loyalty_offers: [
    {
      id: 'offer_15_pct',
      title: '15% OFF',
      track: 'track1',
      discount_type: 'percentage_discount',
      value: '15%',
      discount_percent: 15,
      max_discount: 400,
      description: '15% instant discount on your family dining bill (Max ₹400).',
      active: true,
      expiry_days: 30,
      allocation_percentage: 25.0,
      is_deleted: false
    },
    {
      id: 'offer_10_pct',
      title: '10% OFF',
      track: 'track1',
      discount_type: 'percentage_discount',
      value: '10%',
      discount_percent: 10,
      max_discount: 300,
      description: '10% instant discount on your dining bill (Max ₹300).',
      active: true,
      expiry_days: 30,
      allocation_percentage: 25.0,
      is_deleted: false
    },
    {
      id: 'offer_free_dessert',
      title: 'FREE DESSERT',
      track: 'track1',
      discount_type: 'free_item',
      value: 'Dessert',
      discount_percent: null,
      max_discount: null,
      description: 'Complimentary Double Ka Meetha or Apricot Delight with meal.',
      active: true,
      expiry_days: 30,
      allocation_percentage: 25.0,
      is_deleted: false
    },
    {
      id: 'offer_free_cooldrink',
      title: 'FREE COOL DRINK',
      track: 'track1',
      discount_type: 'free_item',
      value: 'Cool Drink',
      discount_percent: null,
      max_discount: null,
      description: 'Complimentary chilled Goli Soda or beverage.',
      active: true,
      expiry_days: 30,
      allocation_percentage: 25.0,
      is_deleted: false
    },
    {
      id: 'offer_bb_10',
      title: '10% Big Bill Discount',
      track: 'track2',
      discount_type: 'percentage_discount',
      value: '10%',
      discount_percent: 10,
      max_discount: 300,
      description: '10% instant discount on your next family dining visit (Max ₹300). Show original physical bill at counter when redeeming.',
      active: true,
      expiry_days: 30,
      allocation_percentage: 100.0,
      is_deleted: false
    }
  ],
  reservation_offers: [
    {
      id: 'roffer_welcome',
      title: 'Family Feast Dine-In Special',
      description: 'Special 10% promotional dining benefit on your reserved table for parties of 4 or more.',
      discount_percentage: 10,
      start_date: '2026-10-01',
      end_date: '2026-12-31',
      active: true,
      created_at: '2026-10-01T00:00:00.000Z'
    }
  ],
  customer_rewards: [],
  big_bill_coupons: [],
  redemptions: [],
  admin_audit_logs: [],
  daily_sequence_configs: {}
};

export function readLocalStore() {
  try {
    if (!fs.existsSync(storePath)) {
      fs.writeFileSync(storePath, JSON.stringify(DEFAULT_STORE, null, 2), 'utf-8');
      return JSON.parse(JSON.stringify(DEFAULT_STORE));
    }
    const raw = fs.readFileSync(storePath, 'utf-8');
    const store = JSON.parse(raw);
    if (!store.loyalty_offers || !Array.isArray(store.loyalty_offers) || store.loyalty_offers.length === 0) {
      store.loyalty_offers = JSON.parse(JSON.stringify(DEFAULT_STORE.loyalty_offers));
    } else {
      // Ensure all offers have track and is_deleted
      store.loyalty_offers = store.loyalty_offers.map(o => ({
        ...o,
        track: o.track || 'track1',
        is_deleted: Boolean(o.is_deleted || false)
      }));
      // If no Track 2 offer exists, seed the default Track 2 offer
      const hasTrack2 = store.loyalty_offers.some(o => o.track === 'track2' && !o.is_deleted);
      if (!hasTrack2) {
        store.loyalty_offers.push({
          id: 'offer_bb_10',
          title: '10% Big Bill Discount',
          track: 'track2',
          discount_type: 'percentage_discount',
          value: '10%',
          discount_percent: 10,
          max_discount: 300,
          description: '10% instant discount on your next family dining visit (Max ₹300). Show original physical bill at counter when redeeming.',
          active: true,
          expiry_days: 30,
          allocation_percentage: 100.0,
          is_deleted: false
        });
      }
    }
    if (!store.reservation_offers) {
      store.reservation_offers = JSON.parse(JSON.stringify(DEFAULT_STORE.reservation_offers));
    }
    if (!store.bookings) {
      store.bookings = [];
    }
    if (!store.menu_items) {
      store.menu_items = [];
    }
    return store;
  } catch (err) {
    console.error('Error reading local fallback store:', err);
    return JSON.parse(JSON.stringify(DEFAULT_STORE));
  }
}

export function writeLocalStore(data) {
  try {
    fs.writeFileSync(storePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing local fallback store:', err);
  }
}
