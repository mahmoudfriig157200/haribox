import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import meRoutes from './routes/me.js';
import adminRoutes from './routes/admin.js';
import postbacksRoutes from './routes/postbacks.js';
import referralsRoutes from './routes/referrals.js';
import withdrawalsRoutes from './routes/withdrawals.js';
import offersRoutes from './routes/offers.js';
import rewardsRoutes from './routes/rewards.js';

const app = express();

// Security & utils
// app.set('trust proxy', 1); // Uncomment in production if behind a single proxy (e.g., Nginx/Heroku)
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || true, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));
app.use(rateLimit({ windowMs: 60 * 1000, max: 200 }));

// DB
connectDB(process.env.MONGO_URI).then(() => console.log('MongoDB connected')).catch((e) => {
  console.error('MongoDB connection error', e.message);
  process.exit(1);
});

// Routes
app.get('/', (req, res) => res.json({ ok: true }));
app.use('/auth', authRoutes);
app.use('/me', meRoutes);
app.use('/admin', adminRoutes);
app.use('/postbacks', postbacksRoutes);
app.use('/referrals', referralsRoutes);
app.use('/withdrawals', withdrawalsRoutes);
app.use('/offers', offersRoutes);
app.use('/rewards', rewardsRoutes);

// Error fallback
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API listening on :${PORT}`);
});