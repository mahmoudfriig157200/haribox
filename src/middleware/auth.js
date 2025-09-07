import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  // Allow token via query param for easier browser testing: /route?token=JWT
  const queryToken = typeof req.query.token === 'string' ? req.query.token : null;
  const headerToken = header.startsWith('Bearer ') ? header.slice(7) : null;
  const token = queryToken || headerToken;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export async function requireAdmin(req, res, next) {
  try {
    if (!req.user || !req.user.id) return res.status(403).json({ error: 'Forbidden' });
    // Always check the current role from DB to avoid stale JWT role
    const u = await User.findById(req.user.id).select('role').lean();
    if (!u || u.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    return next();
  } catch (e) {
    return res.status(500).json({ error: 'Server error' });
  }
}