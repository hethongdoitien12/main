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

// GET /api/public/creators/:id — profile creator công khai, không cần auth
router.get('/creators/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { rows: [creator] } = await query(`
      SELECT
        u.id, u.username, u.avatar_url, u.bio, u.role, u.created_at,
        u.creator_verified, u.creator_featured,
        COALESCE(SUM(t.amount_xu), 0)::BIGINT AS total_tips_received,
        COUNT(t.id)::INT                       AS total_tip_count,
        COUNT(DISTINCT t.sender_id)::INT        AS supporter_count
      FROM users u
      LEFT JOIN tips t ON t.receiver_id = u.id
      WHERE u.id = $1 AND u.banned_at IS NULL AND u.role IN ('creator','admin')
      GROUP BY u.id, u.username, u.avatar_url, u.bio, u.role, u.created_at,
               u.creator_verified, u.creator_featured
    `, [id]);

    if (!creator) return res.status(404).json({ error: 'Creator không tồn tại' });

    const { rows: topFans } = await query(`
      SELECT u.id, u.username, u.avatar_url,
             SUM(t.amount_xu)::BIGINT AS total_tipped,
             COUNT(*)::INT            AS tip_count
      FROM tips t
      JOIN users u ON u.id = t.sender_id
      WHERE t.receiver_id = $1
      GROUP BY u.id, u.username, u.avatar_url
      ORDER BY total_tipped DESC
      LIMIT 10
    `, [id]);

    const { rows: recentGifts } = await query(`
      SELECT t.amount_xu, t.message, t.created_at,
             u.username AS sender_name, u.avatar_url AS sender_avatar
      FROM tips t
      JOIN users u ON u.id = t.sender_id
      WHERE t.receiver_id = $1
      ORDER BY t.created_at DESC
      LIMIT 10
    `, [id]);

    const { rows: fanClubTiers } = await query(`
      SELECT fct.id, fct.name, fct.level, fct.price_mt, fct.description, fct.perks,
             COUNT(fcm.id)::INT AS member_count
      FROM fan_club_tiers fct
      LEFT JOIN fan_club_memberships fcm ON fcm.tier_id = fct.id AND fcm.status = 'active'
      WHERE fct.creator_id = $1 AND fct.is_active = true
      GROUP BY fct.id, fct.name, fct.level, fct.price_mt, fct.description, fct.perks
      ORDER BY fct.level ASC
    `, [id]);

    const { rows: products } = await query(`
      SELECT id, title, description, type, price_mt, thumbnail_url, sold_count, created_at
      FROM creator_products
      WHERE creator_id = $1 AND is_active = true
      ORDER BY created_at DESC
      LIMIT 20
    `, [id]);

    res.json({ creator, topFans, recentGifts, fanClubTiers, products });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
