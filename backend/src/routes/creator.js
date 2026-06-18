import { Router } from 'express';
import { query } from '../db/pool.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// GET /api/creator/stats — Creator dashboard nâng cao
router.get('/stats', authMiddleware, async (req, res) => {
  if (req.user.role !== 'creator' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ dành cho creator' });
  }
  try {
    const userId = req.user.id;

    // Tổng mt nhận từ tips (all-time)
    const { rows: [totals] } = await query(`
      SELECT
        COALESCE(SUM(FLOOR(t.amount_xu * 0.95))::BIGINT, 0) AS total_received_xu,
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

    // Thu nhập theo ngày (30 ngày — cho chart)
    const { rows: dailyEarnings30 } = await query(`
      SELECT
        DATE(t.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') AS date,
        SUM(FLOOR(t.amount_xu * 0.95))::BIGINT AS total_earned,
        COUNT(*)::INT AS tip_count
      FROM tips t
      WHERE t.receiver_id = $1
        AND t.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(t.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')
      ORDER BY date ASC
    `, [userId]);

    // Doanh thu 30 ngày (tips)
    const { rows: [rev30] } = await query(`
      SELECT COALESCE(SUM(FLOOR(t.amount_xu * 0.95))::BIGINT, 0) AS revenue_30
      FROM tips t
      WHERE t.receiver_id = $1
        AND t.created_at >= NOW() - INTERVAL '30 days'
    `, [userId]);

    // Doanh thu hôm nay (tips)
    const { rows: [revToday] } = await query(`
      SELECT COALESCE(SUM(FLOOR(t.amount_xu * 0.95))::BIGINT, 0) AS revenue_today
      FROM tips t
      WHERE t.receiver_id = $1
        AND DATE(t.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') = CURRENT_DATE AT TIME ZONE 'Asia/Ho_Chi_Minh'
    `, [userId]);

    // Fan Club active members count
    const { rows: [fanClubRow] } = await query(`
      SELECT COUNT(*)::INT AS fan_club_count
      FROM fan_club_memberships
      WHERE creator_id = $1 AND status = 'active' AND expires_at > NOW()
    `, [userId]);

    // Doanh thu sản phẩm (tổng)
    const { rows: [productRow] } = await query(`
      SELECT COALESCE(SUM(amount_mt - platform_fee), 0)::BIGINT AS product_sales_total
      FROM creator_orders
      WHERE creator_id = $1 AND status = 'completed'
    `, [userId]);

    // Withdrawal history
    const { rows: withdrawals } = await query(`
      SELECT id, amount_xu, amount_vnd, fee_xu, status, created_at, processed_at
      FROM withdrawal_requests
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `, [userId]);

    res.json({
      totals,
      topTippers,
      dailyEarnings,
      dailyEarnings30,
      withdrawals,
      revenue30:          rev30.revenue_30,
      todayRevenue:       revToday.revenue_today,
      fanClubCount:       fanClubRow.fan_club_count,
      productSalesTotal:  productRow.product_sales_total,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
