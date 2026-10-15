import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import loyaltyRoutes from './routes/loyalty.js';
import adminRoutes from './routes/admin.js';
import healthRoutes from './routes/health.js';
import { supabase, readLocalStore, writeLocalStore } from './services/supabaseClient.js';
import { ensureAdminProvisioned, checkProductionPersistencePrerequisites } from './services/adminAuthService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Narrow safe CORS allowlist for Vite frontend and production deployments
const ALLOWED_EXACT_ORIGINS = new Set([
  'https://dasarisdarbar.in',
  'https://www.dasarisdarbar.in',
  'https://dasarisdarbar.vercel.app',
  'https://dasaris-darbar-web.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
]);

if (process.env.FRONTEND_URL) {
  ALLOWED_EXACT_ORIGINS.add(process.env.FRONTEND_URL.replace(/\/$/, ''));
}

// Regex matching strictly this repository's Vercel preview deployments (verified owner slug rahulp1600)
const PROJECT_PREVIEW_REGEX = /^https:\/\/(dasaris-darbar-web|dasarisdarbar)(-[a-z0-9-]+)*-rahulp1600[a-z0-9-]*\.vercel\.app$/i;

function isOriginAllowed(origin) {
  if (!origin) return true; // Server-to-server or native requests without Origin header
  const cleanOrigin = origin.replace(/\/$/, '');
  if (ALLOWED_EXACT_ORIGINS.has(cleanOrigin)) return true;
  return PROJECT_PREVIEW_REGEX.test(cleanOrigin);
}

app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-user', 'x-csrf-token', 'x-admin-session']
}));

// Cookie parser for secure HttpOnly admin sessions
app.use(cookieParser());

// Body parsers with large limit for base64 bill images
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Mount API routes
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/health', healthRoutes);

// Public table reservation offers (Only active and within date window)
app.get('/api/reservation-offers', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const store = readLocalStore();
    const allOffers = store.reservation_offers || [];

    const validOffers = allOffers.filter(offer => {
      if (!offer.active) return false;
      if (offer.start_date && offer.start_date > today) return false;
      if (offer.end_date && offer.end_date < today) return false;
      return true;
    });

    return res.json({ success: true, data: validOffers });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error retrieving reservation offers: ' + err.message });
  }
});

// Public customer table reservation submission
app.post('/api/bookings', async (req, res) => {
  const { name, phone, party_size, booking_date, booking_time, notes } = req.body || {};

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Customer name is required.' });
  }
  if (!phone || !phone.trim()) {
    return res.status(400).json({ success: false, message: 'Contact phone number is required.' });
  }

  const numParty = Number(party_size) || 2;
  const todayStr = new Date().toISOString().split('T')[0];
  const bDate = booking_date || todayStr;
  let bTime = booking_time || '19:30:00';
  if (bTime.length === 5) bTime = `${bTime}:00`;

  let newBooking = {
    name: name.trim(),
    phone: phone.trim(),
    party_size: numParty,
    booking_date: bDate,
    booking_time: bTime,
    notes: (notes || '').trim(),
    status: 'pending'
  };

  let savedInSupabase = false;
  if (supabase) {
    try {
      const { data, error } = await supabase.from('bookings').insert([newBooking]).select();
      if (!error && data && data.length > 0) {
        newBooking = data[0];
        savedInSupabase = true;
      }
    } catch (e) {
      console.warn('Supabase booking creation fallback:', e.message);
    }
  }

  if (!savedInSupabase) {
    newBooking.id = newBooking.id || `b_${Date.now()}`;
    newBooking.created_at = new Date().toISOString();
  }

  const store = readLocalStore();
  if (!store.bookings) store.bookings = [];
  store.bookings.unshift(newBooking);
  writeLocalStore(store);

  return res.status(201).json({
    success: true,
    message: 'Table reservation request received successfully.',
    booking: newBooking,
    savedInSupabase
  });
});

// Public Menu items endpoint
app.get('/api/menu', async (req, res) => {
  try {
    let supabaseItems = [];
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('menu_items')
          .select('*')
          .order('sort_order', { ascending: true });
        if (!error && data && data.length > 0) {
          supabaseItems = data;
        }
      } catch (e) {
        console.warn('Supabase menu items read error:', e.message);
      }
    }

    const store = readLocalStore();
    const localOverrides = store.menu_items || [];

    return res.json({
      success: true,
      data: supabaseItems,
      localOverrides
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error retrieving menu items: ' + err.message });
  }
});

// Root greeting
app.get('/', (req, res) => {
  res.json({
    message: "Dasari Darbar — Veg & Non Veg Family Restaurant API",
    version: "1.0.0",
    endpoints: {
      health: "/api/health",
      loyaltyStatus: "/api/loyalty/status?customerId=...",
      loyaltyClaim: "POST /api/loyalty/claim",
      adminRedeem: "POST /api/admin/redeem",
      adminVerifiedBills: "/api/admin/verified-bills",
      adminClaims: "/api/admin/claims",
      adminRewards: "/api/admin/rewards",
      adminCoupons: "/api/admin/coupons",
      adminRedemptions: "/api/admin/redemptions",
      adminAuditLogs: "/api/admin/audit-logs"
    }
  });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    message: 'An unexpected server error occurred.',
    error: err.message
  });
});

app.listen(PORT, async () => {
  checkProductionPersistencePrerequisites();
  try {
    await ensureAdminProvisioned();
  } catch (err) {
    console.error('[FATAL SERVER STARTUP ERROR]:', err.message);
  }
  console.log(`================================================================`);
  console.log(`Dasari Darbar Express Backend running on http://127.0.0.1:${PORT}`);
  console.log(`Connected to Python OCR Microservice: ${process.env.PYTHON_OCR_URL || 'http://127.0.0.1:8000'}`);
  console.log(`Supabase URL: ${process.env.SUPABASE_URL || 'None'}`);
  console.log(`================================================================`);
});
