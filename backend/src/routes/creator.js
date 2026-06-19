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

    // Verification status
    const { rows: [verInfo] } = await query(`
      SELECT creator_verified, creator_featured, verification_note
      FROM users WHERE id = $1
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
      creatorVerified:    verInfo?.creator_verified || false,
      creatorFeatured:    verInfo?.creator_featured || false,
      verificationNote:   verInfo?.verification_note || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/creator/earnings?period=today|7d|30d|all ────────────────────────
router.get('/earnings', authMiddleware, async (req, res) => {
  if (req.user.role !== 'creator' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ dành cho creator' });
  }
  try {
    const uid    = req.user.id;
    const period = req.query.period || '30d';

    // Tính mốc thời gian
    const periodClause = (alias) => {
      if (period === 'today') return `AND DATE(${alias}.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') = CURRENT_DATE AT TIME ZONE 'Asia/Ho_Chi_Minh'`;
      if (period === '7d')    return `AND ${alias}.created_at >= NOW() - INTERVAL '7 days'`;
      if (period === '30d')   return `AND ${alias}.created_at >= NOW() - INTERVAL '30 days'`;
      return ''; // all
    };

    // ── 1. Revenue summary by source ───────────────────────────────────────
    const { rows: [tipSummary] } = await query(`
      SELECT
        COALESCE(SUM(amount_xu),     0)::BIGINT AS gross,
        COALESCE(SUM(platform_fee),  0)::BIGINT AS fee,
        COALESCE(SUM(amount_xu - platform_fee), 0)::BIGINT AS net,
        COUNT(*)::INT AS count
      FROM tips
      WHERE receiver_id = $1 ${periodClause('tips')}
    `, [uid]);

    const { rows: [fcSummary] } = await query(`
      SELECT
        COALESCE(SUM(amount_mt),    0)::BIGINT AS gross,
        COALESCE(SUM(platform_fee), 0)::BIGINT AS fee,
        COALESCE(SUM(amount_mt - platform_fee), 0)::BIGINT AS net,
        COUNT(*)::INT AS count
      FROM fan_club_payments
      WHERE creator_id = $1 ${periodClause('fan_club_payments')}
    `, [uid]);

    const { rows: [prodSummary] } = await query(`
      SELECT
        COALESCE(SUM(amount_mt),    0)::BIGINT AS gross,
        COALESCE(SUM(platform_fee), 0)::BIGINT AS fee,
        COALESCE(SUM(amount_mt - platform_fee), 0)::BIGINT AS net,
        COUNT(*)::INT AS count
      FROM creator_orders
      WHERE creator_id = $1 AND status = 'completed' ${periodClause('creator_orders')}
    `, [uid]);

    const totalGross = BigInt(tipSummary.gross)   + BigInt(fcSummary.gross)   + BigInt(prodSummary.gross);
    const totalFee   = BigInt(tipSummary.fee)     + BigInt(fcSummary.fee)     + BigInt(prodSummary.fee);
    const totalNet   = BigInt(tipSummary.net)     + BigInt(fcSummary.net)     + BigInt(prodSummary.net);

    const summary = {
      total:   { gross: String(totalGross), fee: String(totalFee), net: String(totalNet) },
      tips:    { ...tipSummary },
      fanclub: { ...fcSummary },
      products:{ ...prodSummary },
    };

    // ── 2. Transaction history (unified, last 60) ──────────────────────────
    const { rows: transactions } = await query(`
      SELECT source, gross, fee, net, created_at, from_user, ref_title
      FROM (
        SELECT
          'tip'             AS source,
          t.amount_xu       AS gross,
          t.platform_fee    AS fee,
          (t.amount_xu - t.platform_fee) AS net,
          t.created_at,
          u.username        AS from_user,
          t.message         AS ref_title
        FROM tips t
        JOIN users u ON u.id = t.sender_id
        WHERE t.receiver_id = $1 ${periodClause('t')}

        UNION ALL

        SELECT
          'fanclub'         AS source,
          fp.amount_mt      AS gross,
          fp.platform_fee   AS fee,
          (fp.amount_mt - fp.platform_fee) AS net,
          fp.created_at,
          u.username        AS from_user,
          ft.name           AS ref_title
        FROM fan_club_payments fp
        JOIN users u  ON u.id  = fp.user_id
        JOIN fan_club_tiers ft ON ft.id = fp.tier_id
        WHERE fp.creator_id = $1 ${periodClause('fp')}

        UNION ALL

        SELECT
          'product'         AS source,
          co.amount_mt      AS gross,
          co.platform_fee   AS fee,
          (co.amount_mt - co.platform_fee) AS net,
          co.created_at,
          u.username        AS from_user,
          cp.title          AS ref_title
        FROM creator_orders co
        JOIN users u           ON u.id  = co.buyer_id
        JOIN creator_products cp ON cp.id = co.product_id
        WHERE co.creator_id = $1 AND co.status = 'completed' ${periodClause('co')}
      ) t
      ORDER BY created_at DESC
      LIMIT 60
    `, [uid]);

    // ── 3. Top products (all-time orders + net revenue) ────────────────────
    const { rows: topProducts } = await query(`
      SELECT
        cp.id,
        cp.title,
        cp.type,
        cp.price_mt,
        COUNT(co.id)::INT                                         AS order_count,
        COALESCE(SUM(co.amount_mt),             0)::BIGINT        AS gross_revenue,
        COALESCE(SUM(co.platform_fee),          0)::BIGINT        AS total_fee,
        COALESCE(SUM(co.amount_mt - co.platform_fee), 0)::BIGINT  AS net_revenue
      FROM creator_products cp
      LEFT JOIN creator_orders co
        ON co.product_id = cp.id AND co.status = 'completed'
      WHERE cp.creator_id = $1
      GROUP BY cp.id, cp.title, cp.type, cp.price_mt
      ORDER BY order_count DESC, net_revenue DESC
      LIMIT 10
    `, [uid]);

    // ── 4. Top fans (by total spending, within period) ─────────────────────
    const { rows: topFans } = await query(`
      SELECT
        u.id, u.username, u.avatar_url,
        COALESCE(tip_sub.tip_gross,  0)::BIGINT AS tip_gross,
        COALESCE(fc_sub.fc_gross,    0)::BIGINT AS fc_gross,
        COALESCE(prod_sub.prod_gross,0)::BIGINT AS prod_gross,
        (COALESCE(tip_sub.tip_gross,  0)
         + COALESCE(fc_sub.fc_gross,    0)
         + COALESCE(prod_sub.prod_gross,0))::BIGINT AS total_gross
      FROM users u
      LEFT JOIN (
        SELECT sender_id, SUM(amount_xu)::BIGINT AS tip_gross
        FROM tips WHERE receiver_id = $1 ${periodClause('tips')}
        GROUP BY sender_id
      ) tip_sub ON tip_sub.sender_id = u.id
      LEFT JOIN (
        SELECT user_id, SUM(amount_mt)::BIGINT AS fc_gross
        FROM fan_club_payments WHERE creator_id = $1 ${periodClause('fan_club_payments')}
        GROUP BY user_id
      ) fc_sub ON fc_sub.user_id = u.id
      LEFT JOIN (
        SELECT buyer_id, SUM(amount_mt)::BIGINT AS prod_gross
        FROM creator_orders WHERE creator_id = $1 AND status='completed' ${periodClause('creator_orders')}
        GROUP BY buyer_id
      ) prod_sub ON prod_sub.buyer_id = u.id
      WHERE tip_sub.sender_id IS NOT NULL
         OR fc_sub.user_id    IS NOT NULL
         OR prod_sub.buyer_id IS NOT NULL
      ORDER BY total_gross DESC
      LIMIT 10
    `, [uid]);

    res.json({ period, summary, transactions, topProducts, topFans });

  } catch (err) {
    console.error('earnings error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;

