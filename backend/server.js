import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import loyaltyRoutes from './routes/loyalty.js';
import adminRoutes from './routes/admin.js';
import healthRoutes from './routes/health.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Enable CORS for Vite frontend
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsers with large limit for base64 bill images
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Mount API routes
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/health', healthRoutes);

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

app.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(`Dasari Darbar Express Backend running on http://127.0.0.1:${PORT}`);
  console.log(`Connected to Python OCR Microservice: ${process.env.PYTHON_OCR_URL || 'http://127.0.0.1:8000'}`);
  console.log(`Supabase URL: ${process.env.SUPABASE_URL || 'None'}`);
  console.log(`================================================================`);
});
