import { Router } from 'express';
import { query } from '../db/pool.js';
import { authMiddleware } from '../middleware/auth.js';
import { LedgerService } from '../services/ledger.js';
import { notify } from '../services/notifier.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const PLATFORM_FEE = 0.10;

// ── Creator: Tạo / cập nhật tier ─────────────────────────────────────────────
router.post('/tiers', authMiddleware, async (req, res) => {
  if (req.user.role !== 'creator' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ dành cho creator' });
  }
  try {
    const { name, level, price_mt, description, perks } = req.body;
    if (!name || !level || !price_mt) {
      return res.status(400).json({ error: 'Thiếu name, level hoặc price_mt' });
    }
    if (![1, 2, 3].includes(Number(level))) {
      return res.status(400).json({ error: 'level phải là 1, 2 hoặc 3' });
    }
    const { rows: [tier] } = await query(`
      INSERT INTO fan_club_tiers (creator_id, name, level, price_mt, description, perks)
      VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (creator_id, level) DO UPDATE SET
        name        = EXCLUDED.name,
        price_mt    = EXCLUDED.price_mt,
        description = EXCLUDED.description,
        perks       = EXCLUDED.perks,
        is_active   = true
      RETURNING *
    `, [req.user.id, name, Number(level), parseInt(price_mt), description || null, perks || []]);
    res.json({ tier });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Creator: Lấy tiers của mình ───────────────────────────────────────────────
router.get('/my-tiers', authMiddleware, async (req, res) => {
  if (req.user.role !== 'creator' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ dành cho creator' });
  }
  try {
    const { rows } = await query(`
      SELECT fct.*, COUNT(fcm.id)::INT AS member_count
      FROM fan_club_tiers fct
      LEFT JOIN fan_club_memberships fcm ON fcm.tier_id = fct.id AND fcm.status = 'active'
      WHERE fct.creator_id = $1
      GROUP BY fct.id
      ORDER BY fct.level ASC
    `, [req.user.id]);
    res.json({ tiers: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Creator: Xóa tier ─────────────────────────────────────────────────────────
router.delete('/tiers/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'creator' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ dành cho creator' });
  }
  try {
    await query(`
      UPDATE fan_club_tiers SET is_active = false WHERE id = $1 AND creator_id = $2
    `, [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Creator: Danh sách members ────────────────────────────────────────────────
router.get('/members', authMiddleware, async (req, res) => {
  if (req.user.role !== 'creator' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ dành cho creator' });
  }
  try {
    const { rows } = await query(`
      SELECT fcm.id, fcm.status, fcm.expires_at, fcm.started_at,
             u.id AS user_id, u.username, u.avatar_url,
             fct.name AS tier_name, fct.level, fct.price_mt
      FROM fan_club_memberships fcm
      JOIN users u   ON u.id   = fcm.user_id
      JOIN fan_club_tiers fct ON fct.id = fcm.tier_id
      WHERE fcm.creator_id = $1
      ORDER BY fcm.started_at DESC
    `, [req.user.id]);
    res.json({ members: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── User: Tham gia Fan Club ───────────────────────────────────────────────────
router.post('/join/:tierId', authMiddleware, async (req, res) => {
  try {
    const { tierId } = req.params;

    const { rows: [tier] } = await query(`
      SELECT fct.*, u.username AS creator_name
      FROM fan_club_tiers fct
      JOIN users u ON u.id = fct.creator_id
      WHERE fct.id = $1 AND fct.is_active = true
    `, [tierId]);

    if (!tier) return res.status(404).json({ error: 'Tier không tồn tại' });
    if (tier.creator_id === req.user.id) {
      return res.status(400).json({ error: 'Không thể tham gia Fan Club của chính mình' });
    }

    const platformFee = Math.floor(tier.price_mt * PLATFORM_FEE);
    const creatorReceives = tier.price_mt - platformFee;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const txKey = `membership_purchase:${req.user.id}:${tierId}:${Date.now()}`;

    // Deduct from user
    await LedgerService.transact({
      userId: req.user.id,
      amount: -tier.price_mt,
      type: 'membership_purchase',
      idempotencyKey: txKey,
      description: `Fan Club ${tier.name} — ${tier.creator_name}`,
      metadata: { tierId, creatorId: tier.creator_id },
    });

    // Credit creator
    await LedgerService.transact({
      userId: tier.creator_id,
      amount: creatorReceives,
      type: 'membership_received',
      idempotencyKey: `membership_received:${txKey}`,
      description: `Fan Club ${tier.name} — ${req.user.username || req.user.id}`,
      metadata: { tierId, userId: req.user.id },
    });

    // Upsert membership
    const { rows: [membership] } = await query(`
      INSERT INTO fan_club_memberships (user_id, creator_id, tier_id, expires_at)
      VALUES ($1,$2,$3,$4)
      ON CONFLICT (user_id, creator_id) DO UPDATE SET
        tier_id    = EXCLUDED.tier_id,
        status     = 'active',
        expires_at = EXCLUDED.expires_at,
        started_at = NOW()
      RETURNING *
    `, [req.user.id, tier.creator_id, tierId, expiresAt]);

    // Record payment
    await query(`
      INSERT INTO fan_club_payments (membership_id, user_id, creator_id, tier_id, amount_mt, platform_fee)
      VALUES ($1,$2,$3,$4,$5,$6)
    `, [membership.id, req.user.id, tier.creator_id, tierId, tier.price_mt, platformFee]);

    await notify({
      userId: tier.creator_id,
      type: 'system',
      title: '🎉 Fan Club mới!',
      body: `Có thành viên mới tham gia Fan Club ${tier.name} của bạn`,
      metadata: { userId: req.user.id, tierId },
    });

    res.json({ success: true, membership, tier_name: tier.name, expires_at: expiresAt });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── User: Lấy memberships của mình ───────────────────────────────────────────
router.get('/my-memberships', authMiddleware, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT fcm.id, fcm.status, fcm.expires_at, fcm.started_at,
             u.id AS creator_id, u.username AS creator_name, u.avatar_url AS creator_avatar,
             fct.name AS tier_name, fct.level, fct.price_mt
      FROM fan_club_memberships fcm
      JOIN users u   ON u.id   = fcm.creator_id
      JOIN fan_club_tiers fct ON fct.id = fcm.tier_id
      WHERE fcm.user_id = $1
      ORDER BY fcm.started_at DESC
    `, [req.user.id]);
    res.json({ memberships: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: xem doanh thu Fan Club ─────────────────────────────────────────────
router.get('/admin/revenue', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  try {
    const { rows: daily } = await query(`
      SELECT DATE(fcp.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') AS date,
             SUM(fcp.platform_fee)::BIGINT AS platform_revenue,
             COUNT(*)::INT AS payment_count
      FROM fan_club_payments fcp
      WHERE fcp.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(fcp.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')
      ORDER BY date ASC
    `);
    const { rows: [totals] } = await query(`
      SELECT COALESCE(SUM(platform_fee),0)::BIGINT AS total_revenue,
             COUNT(*)::INT AS total_payments
      FROM fan_club_payments
    `);
    res.json({ dailyRevenue: daily, totals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
