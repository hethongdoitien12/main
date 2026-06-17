import { Router } from 'express';
import { query } from '../db/pool.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// GET /api/creator/stats
router.get('/stats', authMiddleware, async (req, res) => {
  if (req.user.role !== 'creator' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ dành cho creator' });
  }
  try {
    const userId = req.user.id;

    // Tổng mt nhận từ tips
    const { rows: [totals] } = await query(`
      SELECT
        COALESCE(SUM(t.amount_xu * 0.95)::BIGINT, 0) AS total_received_xu,
        COUNT(*)::INT AS total_tips
      FROM tips t
      WHERE t.receiver_id = $1
    `, [userId]);

    // Top 10 người tip nhiều nhất
    const { rows: topTippers } = await query(`
      SELECT u.username, u.avatar_url,
             SUM(t.amount_xu)::BIGINT AS total_xu,
             COUNT(*)::INT AS tip_count
      FROM tips t
      JOIN users u ON u.id = t.sender_id
      WHERE t.receiver_id = $1
      GROUP BY u.id, u.username, u.avatar_url
      ORDER BY total_xu DESC
      LIMIT 10
    `, [userId]);

    // Thu nhập theo ngày (7 ngày gần nhất)
    const { rows: dailyEarnings } = await query(`
      SELECT
        DATE(t.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') AS date,
        SUM(FLOOR(t.amount_xu * 0.95))::BIGINT AS xu_earned,
        COUNT(*)::INT AS tip_count
      FROM tips t
      WHERE t.receiver_id = $1
        AND t.created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(t.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')
      ORDER BY date ASC
    `, [userId]);

    // Withdrawal history
    const { rows: withdrawals } = await query(`
      SELECT id, amount_xu, amount_vnd, fee_xu, status, created_at, processed_at
      FROM withdrawal_requests
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `, [userId]);

    res.json({ totals, topTippers, dailyEarnings, withdrawals });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
