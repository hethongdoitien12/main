import 'dotenv/config';
import express from 'express';
import cors from 'cors';
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

app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json());

app.use('/api/auth',        authRoutes);
app.use('/api/wallet',      walletRoutes);
app.use('/api/events',      eventRoutes);
app.use('/api/quests',      questRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/referral',     referralRoutes);

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
