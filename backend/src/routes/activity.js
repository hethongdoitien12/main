import { Router } from 'express';
import { query } from '../db/pool.js';

const router = Router();

// GET /api/activity?limit=20&page=1&activity_type=TIP_SENT&actor_id=uuid
router.get('/', async (req, res) => {
  try {
    const limit   = Math.min(parseInt(req.query.limit) || 20, 100);
    const page    = Math.max(1, parseInt(req.query.page) || 1);
    const offset  = (page - 1) * limit;
    const type    = req.query.activity_type || null;
    const actorId = req.query.actor_id      || null;

    const filterParams = [];
    const conds = [];
    if (type)    { filterParams.push(type);    conds.push(`activity_type = $${filterParams.length}`); }
    if (actorId) { filterParams.push(actorId); conds.push(`actor_id = $${filterParams.length}`); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

    const dataParams = [...filterParams, limit, offset];
    const { rows } = await query(`
      SELECT id, actor_id, actor_username, actor_avatar,
             activity_type, target_id, target_name,
             amount_mt, metadata, created_at
      FROM activity_feed
      ${where}
      ORDER BY created_at DESC
      LIMIT $${filterParams.length + 1} OFFSET $${filterParams.length + 2}
    `, dataParams);

    const { rows: [{ total }] } = await query(
      `SELECT COUNT(*)::INT AS total FROM activity_feed ${where}`,
      filterParams
    );

    res.json({ activities: rows, total, page, limit, has_more: offset + rows.length < total });
  } catch (err) {
    console.error('activity route error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
