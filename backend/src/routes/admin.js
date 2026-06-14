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

export default router;
