import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { Transaction } from '../models/Transaction.js';
import { Withdrawal } from '../models/Withdrawal.js';
import { Reward } from '../models/Reward.js';
import { Settings } from '../models/Settings.js';

const router = express.Router();

router.use(requireAuth, requireAdmin);

// List users (basic pagination)
router.get('/users', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(100, parseInt(req.query.limit || '20', 10));
  const q = req.query.q?.trim();
  const filter = q ? { $or: [{ email: new RegExp(q, 'i') }, { name: new RegExp(q, 'i') }] } : {};
  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    User.countDocuments(filter)
  ]);
  res.json({ items, total, page, limit });
});

// Edit points or status (absolute set)
router.patch('/users/:id', async (req, res) => {
  const { points, status } = req.body;
  const update = {};
  if (typeof points === 'number') update.points = points;
  if (status) update.status = status;
  const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).lean();
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
});

// Admin: atomic add/subtract points (delta). Creates a transaction (earn for +, redeem for -)
router.post('/users/:id/points', async (req, res) => {
  const delta = Number(req.body?.delta || 0);
  const reason = (req.body?.reason || '').toString();
  if (!delta || !Number.isFinite(delta)) return res.status(400).json({ error: 'invalid-delta' });

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { $inc: { points: delta } },
    { new: true }
  );
  if (!user) return res.status(404).json({ error: 'Not found' });

  const type = delta > 0 ? 'earn' : 'redeem';
  await Transaction.create({
    userId: user._id,
    type,
    amount: Math.abs(Math.trunc(delta)),
    meta: { adminAction: true, reason }
  });

  res.json({ ok: true, user: { id: user._id, points: user.points } });
});

// Admin: zero a user's points (set to 0), record adjustment as redeem if positive balance was removed
router.post('/users/:id/zero', async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  const current = Number(user.points || 0);
  if (current !== 0) {
    const delta = -current;
    user.points = 0;
    await user.save();
    await Transaction.create({
      userId: user._id,
      type: delta > 0 ? 'earn' : 'redeem',
      amount: Math.abs(delta),
      meta: { adminAction: true, reason: 'zero-points' }
    });
  }
  res.json({ ok: true, user: { id: user._id, points: 0 } });
});

// Admin: ban user
router.post('/users/:id/ban', async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { status: 'banned' }, { new: true }).lean();
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true, user });
});

// Admin: unban user
router.post('/users/:id/unban', async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { status: 'active' }, { new: true }).lean();
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true, user });
});

// Withdrawals moderation (with optional status filter and limit)
router.get('/withdrawals', async (req, res) => {
  const status = (req.query.status || '').toString();
  const limit = Math.min(500, parseInt(req.query.limit || '200', 10));
  const filter = status && status !== 'all' ? { status } : {};
  const items = await Withdrawal.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
  res.json(items);
});

router.patch('/withdrawals/:id', async (req, res) => {
  const { status, adminNote } = req.body;
  const w = await Withdrawal.findByIdAndUpdate(req.params.id, { status, adminNote }, { new: true }).lean();
  if (!w) return res.status(404).json({ error: 'Not found' });
  res.json(w);
});

// Transactions log
router.get('/transactions', async (req, res) => {
  const items = await Transaction.find().sort({ createdAt: -1 }).limit(500).lean();
  res.json(items);
});

// Rewards catalog management
router.get('/rewards', async (req, res) => {
  const items = await Reward.find().sort({ createdAt: -1 }).lean();
  res.json(items);
});

router.post('/rewards', async (req, res) => {
  const { method, label, qty, pricePoints, enabled = true } = req.body;
  if (!method || !label || !qty || !pricePoints) return res.status(400).json({ error: 'invalid' });
  const item = await Reward.create({ method, label, qty, pricePoints, enabled });
  res.json(item);
});

router.patch('/rewards/:id', async (req, res) => {
  const { method, label, qty, pricePoints, enabled } = req.body;
  const update = {};
  if (method) update.method = method;
  if (label) update.label = label;
  if (typeof qty === 'number') update.qty = qty;
  if (typeof pricePoints === 'number') update.pricePoints = pricePoints;
  if (typeof enabled === 'boolean') update.enabled = enabled;
  const item = await Reward.findByIdAndUpdate(req.params.id, update, { new: true }).lean();
  if (!item) return res.status(404).json({ error: 'not-found' });
  res.json(item);
});

router.delete('/rewards/:id', async (req, res) => {
  await Reward.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// Pricing settings management
router.get('/settings', async (req, res) => {
  let s = await Settings.findOne();
  if (!s) { s = await Settings.create({}); }
  res.json(s);
});

router.patch('/settings', async (req, res) => {
  const allowed = ['freefire_per100_points', 'pubg_per60_points', 'vodafone_points_per_egp'];
  const update = {};
  for (const k of allowed) if (typeof req.body[k] === 'number') update[k] = req.body[k];
  update.updatedAt = new Date();
  let s = await Settings.findOne();
  if (!s) s = await Settings.create(update); else await Settings.updateOne({ _id: s._id }, { $set: update });
  const fresh = await Settings.findOne();
  res.json(fresh);
});

export default router;