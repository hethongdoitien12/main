import { Router } from 'express';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import { query } from '../db/pool.js';

const router = Router();
router.use(authMiddleware, adminOnly);

// GET /api/admin/deposits — toàn bộ deposit requests kèm username
router.get('/deposits', async (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit)  || 100, 500);
    const offset = parseInt(req.query.offset) || 0;
    const status = req.query.status;

    let q = `
      SELECT dr.*, u.username, u.email
      FROM deposit_requests dr
      JOIN users u ON u.id = dr.user_id
    `;
    const params = [];
    if (status) { params.push(status); q += ` WHERE dr.status = $${params.length}`; }
    q += ` ORDER BY dr.created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`;
    params.push(limit, offset);

    const { rows } = await query(q, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/transactions — tất cả ledger entries kèm username
router.get('/transactions', async (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit)  || 50, 200);
    const offset = parseInt(req.query.offset) || 0;
    const type   = req.query.type;

    let q = `
      SELECT le.*, u.username
      FROM ledger_entries le
      JOIN users u ON u.id = le.user_id
    `;
    const params = [];
    if (type) { params.push(type); q += ` WHERE le.type = $${params.length}`; }
    q += ` ORDER BY le.created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`;
    params.push(limit, offset);

    const { rows } = await query(q, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/expiry-batches — xem tất cả lô XU sắp/đã hết hạn
router.get('/expiry-batches', async (req, res) => {
  try {
    const { status = 'active', limit = 100 } = req.query;
    const { rows } = await query(`
      SELECT xb.*, u.username, u.email
      FROM xu_expiry_batches xb
      JOIN users u ON u.id = xb.user_id
      WHERE ($1 = 'all' OR xb.status = $1)
      ORDER BY xb.expires_at ASC
      LIMIT $2
    `, [status, Math.min(parseInt(limit), 500)]);
    const { rows: [summary] } = await query(`
      SELECT
        COUNT(*) FILTER (WHERE status='active') as active_count,
        COALESCE(SUM(remaining_xu) FILTER (WHERE status='active'), 0) as total_active_xu,
        COUNT(*) FILTER (WHERE status='active' AND expires_at <= NOW() + INTERVAL '7 days') as expiring_soon,
        COALESCE(SUM(remaining_xu) FILTER (WHERE status='active' AND expires_at <= NOW() + INTERVAL '7 days'), 0) as expiring_soon_xu
      FROM xu_expiry_batches
    `);
    res.json({ batches: rows, summary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/run-expire — kích hoạt job expire thủ công
router.post('/run-expire', async (req, res) => {
  try {
    const { expirePromotionalXu } = await import('../services/cron.js');
    const result = await expirePromotionalXu();
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/run-cleanup — kích hoạt dọn deposit thủ công
router.post('/run-cleanup', async (req, res) => {
  try {
    const { cleanupPendingDeposits } = await import('../services/cron.js');
    const result = await cleanupPendingDeposits();
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
