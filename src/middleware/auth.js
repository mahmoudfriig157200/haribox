import jwt from 'jsonwebtoken';

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

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}