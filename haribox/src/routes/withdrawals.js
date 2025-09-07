import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { Withdrawal } from '../models/Withdrawal.js';
import { User } from '../models/User.js';

const router = express.Router();

router.post('/', requireAuth, async (req, res) => {
  const { amount, rewardType, method, accountId, email, walletNumber, walletName } = req.body;
  if (!amount || amount <= 0 || !rewardType) return res.status(400).json({ error: 'invalid-request' });

  // Validate method-specific fields
  const m = method || rewardType; // fallback to rewardType for backward compatibility
  if (m === 'freefire' || m === 'pubg') {
    if (!accountId || !email) return res.status(400).json({ error: 'missing-game-info' });
  } else if (m === 'vodafone_cash') {
    if (!walletNumber || !walletName) return res.status(400).json({ error: 'missing-wallet-info' });
    if (!/^\d{11}$/.test(walletNumber)) return res.status(400).json({ error: 'invalid-wallet-number' });
  }

  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'not-found' });
  if (user.points < amount) return res.status(400).json({ error: 'insufficient-points' });

  user.points -= amount;
  await user.save();
  const w = await Withdrawal.create({
    userId: user._id,
    amount,
    rewardType,
    status: 'pending',
    method: m,
    accountId,
    email,
    walletNumber,
    walletName
  });
  res.json(w);
});

router.get('/', requireAuth, async (req, res) => {
  const items = await Withdrawal.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(100).lean();
  res.json(items);
});

export default router;