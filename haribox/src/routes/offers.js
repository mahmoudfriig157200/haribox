import express from 'express';
import axios from 'axios';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Fetch offers from OGAds API (lockerpreview.com/api/v2)
router.get('/', requireAuth, async (req, res) => {
  try {
    const apiKey = process.env.OGADS_API_KEY; // Bearer token
    const url = process.env.OGADS_API_URL || 'https://lockerpreview.com/api/v2';
    if (!apiKey) return res.status(500).json({ error: 'OGADS_API_KEY missing' });

    // Required by API: derive sensible values in dev
    let ip = (req.query.ip || (req.headers['x-forwarded-for']?.split(',')[0]) || req.socket.remoteAddress || '').toString();
    const userAgentRaw = (req.query.user_agent || req.headers['user-agent'] || '').toString();
    const userAgent = userAgentRaw || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36';

    // If running locally, req.socket.remoteAddress might be ::1 or 127.0.0.1 which OGAds may reject
    if (!ip || ip === '::1' || ip === '127.0.0.1') {
      ip = '8.8.8.8'; // fallback public IP for development only
    }

    if (!ip || !userAgent) return res.status(400).json({ error: 'ip and user_agent are required' });

    // Optional params from query
    const ctype = req.query.ctype ?? 3; // sensible default: 3
    const max = req.query.max ?? 20;
    const min = req.query.min;
    const aff_sub4 = (req.query.aff_sub4 || req.query.subid || req.user?.id || '').toString();
    const aff_sub5 = (req.query.aff_sub5 || '').toString();

    const params = { ip, user_agent: userAgent, ctype, max };
    if (min !== undefined) params.min = min;
    if (aff_sub4) params.aff_sub4 = aff_sub4; // pass user id in sub4
    if (aff_sub5) params.aff_sub5 = aff_sub5;

    // Note: some OGAds endpoints require full path like /api/v2 and return { offers: [...] }
    const resp = await axios.get(url, { headers: { Authorization: `Bearer ${apiKey}` }, params });

    // Normalize response to { offers: [...] } for frontend
    const body = resp.data;
    const offers = Array.isArray(body) ? body : (body.offers || body.items || body.data || []);
    res.json({ offers });
  } catch (e) {
    const status = e.response?.status || 500;
    res.status(status).json({ error: 'OGAds API error', detail: e.response?.data || e.message });
  }
});

export default router;