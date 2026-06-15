import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { query } from '../db/pool.js';

const router = Router();
router.use(authMiddleware);

// GET /api/notifications — lấy danh sách thông báo (20 cái mới nhất)
router.get('/', async (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit) || 20, 50);
    const { rows } = await query(
      `SELECT * FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [req.user.id, limit]
    );
    const { rows: [cnt] } = await query(
      `SELECT COUNT(*) as unread FROM notifications WHERE user_id = $1 AND read = false`,
      [req.user.id]
    );
    res.json({ notifications: rows, unread_count: parseInt(cnt.unread || 0) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/notifications/:id/read — đánh dấu đã đọc
router.patch('/:id/read', async (req, res) => {
  try {
    await query(
      `UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/notifications/read-all — đánh dấu tất cả đã đọc
router.patch('/read-all', async (req, res) => {
  try {
    const { rowCount } = await query(
      `UPDATE notifications SET read = true WHERE user_id = $1 AND read = false`,
      [req.user.id]
    );
    res.json({ success: true, updated: rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/notifications/:id — xoá 1 thông báo
router.delete('/:id', async (req, res) => {
  try {
    await query(
      `DELETE FROM notifications WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
