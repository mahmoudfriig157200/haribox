// Public rewards listing route for users: merges dynamic catalog with fallback defaults
import express from 'express';
import { Reward } from '../models/Reward.js';
import { Settings } from '../models/Settings.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const [settings, catalog] = await Promise.all([
    Settings.findOne().lean(),
    Reward.find({ enabled: true }).sort({ createdAt: -1 }).lean(),
  ]);

  res.json({ settings, catalog });
});

export default router;