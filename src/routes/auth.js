import express from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

const router = express.Router();

// Email/Password register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, referrerCode } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing email/password' });
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: 'Email already in use' });

    const user = new User({ email, name, referrerCode });
    await user.setPassword(password);
    await user.save();

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, email: user.email, name: user.name, points: user.points, myReferralCode: user.myReferralCode } });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Email/Password login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.validatePassword(password))) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, email: user.email, name: user.name, points: user.points, myReferralCode: user.myReferralCode } });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Bootstrap: make a user admin using a one-time secret (set ADMIN_SETUP_SECRET in .env)
router.post('/make-admin', async (req, res) => {
  try {
    const expected = (process.env.ADMIN_SETUP_SECRET || '').toString();
    const provided = (req.query.secret || req.body?.secret || '').toString();
    if (!expected || provided !== expected) return res.status(403).json({ error: 'forbidden' });

    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'email-required' });

    const user = await User.findOneAndUpdate({ email }, { role: 'admin' }, { new: true });
    if (!user) return res.status(404).json({ error: 'user-not-found' });

    return res.json({ ok: true, id: user._id, email: user.email, role: user.role });
  } catch (e) {
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;