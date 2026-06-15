import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pool from './db/pool.js';
import authRoutes from './routes/auth.js';
import walletRoutes from './routes/wallet.js';
import eventRoutes from './routes/events.js';
import questRoutes from './routes/quests.js';
import withdrawalRoutes from './routes/withdrawals.js';
import adminRoutes from './routes/admin.js';
import notificationRoutes from './routes/notifications.js';
import { startCronJobs } from './services/cron.js';
import referralRoutes from './routes/referral.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json());

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Quá nhiều lần thử, vui lòng thử lại sau 1 phút.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Quá nhiều yêu cầu, vui lòng thử lại sau.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth',        authLimiter, authRoutes);
app.use('/api/wallet',      generalLimiter, walletRoutes);
app.use('/api/events',      generalLimiter, eventRoutes);
app.use('/api/quests',      generalLimiter, questRoutes);
app.use('/api/withdrawals', generalLimiter, withdrawalRoutes);
app.use('/api/admin',       generalLimiter, adminRoutes);
app.use('/api/notifications', generalLimiter, notificationRoutes);
app.use('/api/referral',    generalLimiter, referralRoutes);

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', time: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

app.use((req, res) => res.status(404).json({ error: `Route ${req.method} ${req.path} không tồn tại` }));
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Lỗi server nội bộ' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 Server chạy tại port ${PORT}`);
  console.log(`📊 Health: http://localhost:${PORT}/health`);
  console.log(`💰 Wallet: /api/wallet/balance | /api/wallet/deposit/create`);
  console.log(`🎫 Events: /api/events`);
  console.log(`🏆 Quests: /api/quests\n`);
  startCronJobs();
});

export default app;
