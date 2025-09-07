import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { Transaction } from '../models/Transaction.js';

const router = express.Router();

// Grant signup bonus to referrer on first earn or first login, simple approach
router.post('/signup-bonus', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.referrerCode) return res.json({ granted: false });
    if (user._signupBonusGranted) return res.json({ granted: false });

    const ref = await User.findOne({ myReferralCode: user.referrerCode });
    if (!ref) return res.json({ granted: false });

    const bonus = Number(process.env.REFERRAL_SIGNUP_BONUS || 0);
    if (bonus <= 0) return res.json({ granted: false });

    ref.points += bonus;
    await ref.save();
    user._signupBonusGranted = true;
    await user.save();

    res.json({ granted: true, bonus });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Referral stats: number invited and total referral points earned
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) return res.status(404).json({ error: 'Not found' });

    const referredCount = await User.countDocuments({ referrerCode: user.myReferralCode });

    const agg = await Transaction.aggregate([
      { $match: { userId: user._id, type: 'referral' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const referralPoints = agg?.[0]?.total || 0;

    res.json({ myReferralCode: user.myReferralCode, referredCount, referralPoints });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Latest 5 referred users
router.get('/latest', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) return res.status(404).json({ error: 'Not found' });

    const items = await User.find({ referrerCode: user.myReferralCode })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('email name points createdAt')
      .lean();

    // Mask email slightly for privacy
    const masked = items.map(u => {
      const [name, domain] = (u.email || '').split('@');
      const m = name ? (name.slice(0, 2) + '***') : 'user';
      return { id: u._id, email: domain ? `${m}@${domain}` : (u.email || ''), name: u.name || null, points: u.points || 0, createdAt: u.createdAt };
    });

    res.json({ items: masked });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;