import { Router } from 'express';
import { query } from '../db/pool.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// GET /api/creators — danh sách creator công khai, sort by tips received
router.get('/', authMiddleware, async (req, res) => {
  try {
    const search = (req.query.search || '').trim();
    const limit  = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;

    const filterVerified = req.query.verified === 'true';
    const filterFeatured = req.query.featured === 'true';

    const { rows } = await query(`
      SELECT
        u.id, u.username, u.avatar_url, u.bio, u.role,
        u.creator_verified, u.creator_featured,
        COALESCE(SUM(t.amount_xu), 0)::BIGINT          AS total_tips_received,
        COUNT(t.id)::INT                                AS total_tip_count,
        COUNT(DISTINCT t.sender_id)::INT                AS supporter_count,
        RANK() OVER (ORDER BY COALESCE(SUM(t.amount_xu),0) DESC) AS rank
      FROM users u
      LEFT JOIN tips t ON t.receiver_id = u.id
      WHERE u.banned_at IS NULL
        AND u.role IN ('creator','admin')
        AND ($1 = '' OR u.username ILIKE '%' || $1 || '%')
        AND ($4 = false OR u.creator_verified = true)
        AND ($5 = false OR u.creator_featured = true)
      GROUP BY u.id, u.username, u.avatar_url, u.bio, u.role,
               u.creator_verified, u.creator_featured
      ORDER BY u.creator_featured DESC, u.creator_verified DESC, total_tips_received DESC
      LIMIT $2 OFFSET $3
    `, [search, limit, offset, filterVerified, filterFeatured]);

    res.json({ creators: rows, limit, offset });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi tải danh sách creator' });
  }
});

// GET /api/creators/:id — profile creator công khai
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Creator info
    const { rows: [creator] } = await query(`
      SELECT
        u.id, u.username, u.avatar_url, u.bio, u.role, u.created_at,
        u.creator_verified, u.creator_featured, u.verification_note,
        COALESCE(SUM(t.amount_xu), 0)::BIGINT AS total_tips_received,
        COUNT(t.id)::INT                       AS total_tip_count,
        COUNT(DISTINCT t.sender_id)::INT        AS supporter_count
      FROM users u
      LEFT JOIN tips t ON t.receiver_id = u.id
      WHERE u.id = $1 AND u.banned_at IS NULL AND u.role IN ('creator','admin')
      GROUP BY u.id, u.username, u.avatar_url, u.bio, u.role, u.created_at,
               u.creator_verified, u.creator_featured, u.verification_note
    `, [id]);

    if (!creator) return res.status(404).json({ error: 'Creator không tồn tại' });

    // Top 10 fans
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

    // Recent 10 gifts
    const { rows: recentGifts } = await query(`
      SELECT t.amount_xu, t.message, t.created_at,
             u.username AS sender_name, u.avatar_url AS sender_avatar
      FROM tips t
      JOIN users u ON u.id = t.sender_id
      WHERE t.receiver_id = $1
      ORDER BY t.created_at DESC
      LIMIT 10
    `, [id]);

    // Fan Club tiers
    const { rows: fanClubTiers } = await query(`
      SELECT fct.id, fct.name, fct.level, fct.price_mt, fct.description, fct.perks,
             COUNT(fcm.id)::INT AS member_count
      FROM fan_club_tiers fct
      LEFT JOIN fan_club_memberships fcm ON fcm.tier_id = fct.id AND fcm.status = 'active'
      WHERE fct.creator_id = $1 AND fct.is_active = true
      GROUP BY fct.id, fct.name, fct.level, fct.price_mt, fct.description, fct.perks
      ORDER BY fct.level ASC
    `, [id]);

    // User's current membership with this creator (if logged in)
    let myMembership = null;
    if (req.user) {
      const { rows: [mem] } = await query(`
        SELECT fcm.id, fcm.status, fcm.expires_at, fct.name AS tier_name, fct.level
        FROM fan_club_memberships fcm
        JOIN fan_club_tiers fct ON fct.id = fcm.tier_id
        WHERE fcm.user_id = $1 AND fcm.creator_id = $2
      `, [req.user.id, id]);
      myMembership = mem || null;
    }

    // Active products
    const { rows: products } = await query(`
      SELECT id, title, description, type, price_mt, thumbnail_url, sold_count, created_at
      FROM creator_products
      WHERE creator_id = $1 AND is_active = true
      ORDER BY created_at DESC
      LIMIT 20
    `, [id]);

    res.json({ creator, topFans, recentGifts, fanClubTiers, myMembership, products });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
