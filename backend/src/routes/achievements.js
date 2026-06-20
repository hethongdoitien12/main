import { Router } from 'express';
import { query } from '../db/pool.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// GET /api/achievements — tất cả achievements với trạng thái unlock của user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT a.*,
        ua.unlocked_at,
        CASE WHEN ua.id IS NOT NULL THEN true ELSE false END AS unlocked
      FROM achievements a
      LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = $1
      ORDER BY
        CASE WHEN ua.id IS NOT NULL THEN 0 ELSE 1 END,
        a.category, a.reward_mt DESC
    `, [req.user.id]);
    res.json({ achievements: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/achievements/my — chỉ achievements đã unlock
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT a.*, ua.unlocked_at
      FROM user_achievements ua
      JOIN achievements a ON a.id = ua.achievement_id
      WHERE ua.user_id = $1
      ORDER BY ua.unlocked_at DESC
    `, [req.user.id]);
    res.json({ achievements: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/achievements/user/:id — achievements công khai của 1 user (cho profile/creator profile)
router.get('/user/:id', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const { rows } = await query(`
      SELECT a.*, ua.unlocked_at
      FROM user_achievements ua
      JOIN achievements a ON a.id = ua.achievement_id
      WHERE ua.user_id = $1
      ORDER BY ua.unlocked_at DESC
      LIMIT $2
    `, [req.params.id, Math.min(parseInt(limit) || 10, 50)]);
    res.json({ achievements: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
