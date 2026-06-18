import { Router } from 'express';
import { query } from '../db/pool.js';

const router = Router();

// GET /api/public/stats — thống kê nền tảng, không cần auth
router.get('/stats', async (req, res) => {
  try {
    const { rows: [stats] } = await query(`
      SELECT
        (SELECT COUNT(*)::INT FROM users WHERE banned_at IS NULL)                         AS total_users,
        (SELECT COUNT(*)::INT FROM users WHERE role IN ('creator','admin') AND banned_at IS NULL) AS total_creators,
        (SELECT COUNT(*)::INT FROM tips)                                                   AS total_tips,
        (SELECT COUNT(*)::INT FROM ledger_entries)                                         AS total_transactions
    `);
    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi tải thống kê' });
  }
});

// GET /api/public/creators — top/featured creators, không cần auth
router.get('/creators', async (req, res) => {
  try {
    const featured = req.query.featured === 'true';
    const limit = Math.min(parseInt(req.query.limit) || 8, 20);

    const { rows } = await query(`
      SELECT
        u.id, u.username, u.avatar_url, u.bio,
        u.creator_verified, u.creator_featured,
        COALESCE(SUM(t.amount_xu), 0)::BIGINT AS total_tips_received,
        COUNT(DISTINCT t.sender_id)::INT        AS supporter_count
      FROM users u
      LEFT JOIN tips t ON t.receiver_id = u.id
      WHERE u.banned_at IS NULL
        AND u.role IN ('creator','admin')
        AND ($1 = false OR u.creator_featured = true)
      GROUP BY u.id, u.username, u.avatar_url, u.bio, u.creator_verified, u.creator_featured
      ORDER BY u.creator_featured DESC, u.creator_verified DESC, total_tips_received DESC
      LIMIT $2
    `, [featured, limit]);

    res.json({ creators: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi tải danh sách creator' });
  }
});

// GET /api/public/products — sản phẩm nổi bật, không cần auth
router.get('/products', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 6, 20);

    const { rows } = await query(`
      SELECT cp.id, cp.title, cp.description, cp.type, cp.price_mt,
             cp.thumbnail_url, cp.sold_count, cp.created_at,
             u.id AS creator_id, u.username AS creator_name, u.avatar_url AS creator_avatar
      FROM creator_products cp
      JOIN users u ON u.id = cp.creator_id
      WHERE cp.is_active = true
      ORDER BY cp.sold_count DESC, cp.created_at DESC
      LIMIT $1
    `, [limit]);

    res.json({ products: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi tải sản phẩm' });
  }
});

export default router;
