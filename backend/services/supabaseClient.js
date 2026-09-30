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

export const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Local fallback store path
const dataDir = path.join(__dirname, '..', 'data');
const storePath = path.join(dataDir, 'db.json');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const DEFAULT_STORE = {
  verified_bills: [],
  loyalty_claims: [],
  loyalty_progress: {},
  loyalty_offers: [
    {
      id: 'offer_15_pct',
      title: '15% OFF',
      discount_type: 'percentage_discount',
      value: '15%',
      discount_percent: 15,
      max_discount: 400,
      description: '15% instant discount on your family dining bill (Max ₹400).',
      active: true,
      expiry_days: 30
    },
    {
      id: 'offer_10_pct',
      title: '10% OFF',
      discount_type: 'percentage_discount',
      value: '10%',
      discount_percent: 10,
      max_discount: 300,
      description: '10% instant discount on your dining bill (Max ₹300).',
      active: true,
      expiry_days: 30
    },
    {
      id: 'offer_free_dessert',
      title: 'FREE DESSERT',
      discount_type: 'free_item',
      value: 'Dessert',
      discount_percent: null,
      max_discount: null,
      description: 'Complimentary Double Ka Meetha or Apricot Delight with meal.',
      active: true,
      expiry_days: 30
    },
    {
      id: 'offer_free_cooldrink',
      title: 'FREE COOL DRINK',
      discount_type: 'free_item',
      value: 'Cool Drink',
      discount_percent: null,
      max_discount: null,
      description: 'Complimentary chilled Goli Soda or beverage.',
      active: true,
      expiry_days: 30
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
    return JSON.parse(raw);
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
