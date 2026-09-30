import express from 'express';
import { supabase } from '../services/supabaseClient.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();
const PYTHON_OCR_URL = process.env.PYTHON_OCR_URL || 'http://127.0.0.1:8000';

router.get('/', async (req, res) => {
  let pythonOcrStatus = 'offline';
  try {
    const pyRes = await fetch(`${PYTHON_OCR_URL}/health`, { signal: AbortSignal.timeout(2500) });
    if (pyRes.ok) {
      const data = await pyRes.json();
      pythonOcrStatus = data.status || 'ok';
    }
  } catch (e) {
    pythonOcrStatus = `offline (${e.message})`;
  }

  let supabaseStatus = 'disconnected';
  if (supabase) {
    try {
      const { error } = await supabase.from('customers').select('count', { count: 'exact', head: true });
      supabaseStatus = error ? `connected (table warning: ${error.message})` : 'connected';
    } catch (e) {
      supabaseStatus = `error (${e.message})`;
    }
  }

  return res.json({
    status: 'healthy',
    service: 'Dasari Darbar Node.js Backend',
    timestamp: new Date().toISOString(),
    integrations: {
      pythonOcr: pythonOcrStatus,
      supabase: supabaseStatus
    }
  });
});

export default router;
