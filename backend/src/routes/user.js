import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db/pool.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// GET /api/user/profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const { rows: [user] } = await query(
      `SELECT u.id, u.username, u.email, u.avatar_url, u.role, u.referral_code, u.created_at,
              w.balance, w.total_earned, w.total_spent, w.total_withdrawn,
              (SELECT COUNT(*) FROM users WHERE referred_by = u.id) AS referral_count
       FROM users u
       LEFT JOIN wallets w ON w.user_id = u.id
       WHERE u.id = $1`,
      [req.user.id]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/user/profile
router.patch('/profile', authMiddleware, async (req, res) => {
  try {
    const { username, avatar_url } = req.body;
    const updates = [];
    const values = [];
    let idx = 1;

    if (username !== undefined) {
      if (!username || username.length < 3 || username.length > 50) {
        return res.status(400).json({ error: 'Username phải từ 3–50 ký tự' });
      }
      updates.push(`username = $${idx++}`);
      values.push(username.trim());
    }
    if (avatar_url !== undefined) {
      updates.push(`avatar_url = $${idx++}`);
      values.push(avatar_url || null);
    }
    if (!updates.length) return res.status(400).json({ error: 'Không có gì để cập nhật' });

    updates.push(`updated_at = NOW()`);
    values.push(req.user.id);

    const { rows: [updated] } = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}
       RETURNING id, username, email, avatar_url, role, referral_code, created_at`,
      values
    );
    res.json(updated);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Username đã tồn tại' });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/user/kyc — xem trạng thái KYC
router.get('/kyc', authMiddleware, async (req, res) => {
  try {
    const { rows: [user] } = await query(
      `SELECT kyc_status, kyc_full_name, kyc_id_number, kyc_submitted_at, kyc_verified_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    res.json(user || { kyc_status: 'none' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/user/kyc/submit — nộp thông tin KYC
router.post('/kyc/submit', authMiddleware, async (req, res) => {
  try {
    const { full_name, id_number } = req.body;
    if (!full_name?.trim() || !id_number?.trim()) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ họ tên và số CCCD/CMND' });
    }
    if (!/^\d{9,12}$/.test(id_number.trim())) {
      return res.status(400).json({ error: 'Số CCCD/CMND không hợp lệ (9-12 chữ số)' });
    }

    const { rows: [current] } = await query(`SELECT kyc_status FROM users WHERE id = $1`, [req.user.id]);
    if (current?.kyc_status === 'verified') {
      return res.status(400).json({ error: 'Tài khoản đã được xác minh KYC' });
    }
    if (current?.kyc_status === 'pending') {
      return res.status(400).json({ error: 'Yêu cầu KYC đang chờ xem xét' });
    }

    const { rows: [updated] } = await query(
      `UPDATE users SET kyc_status='pending', kyc_full_name=$1, kyc_id_number=$2,
       kyc_submitted_at=NOW(), updated_at=NOW()
       WHERE id=$3
       RETURNING kyc_status, kyc_full_name, kyc_submitted_at`,
      [full_name.trim(), id_number.trim(), req.user.id]
    );

    const { notify } = await import('../services/notifier.js');
    await notify(req.user.id, 'kyc_submitted',
      '📋 Hồ sơ KYC đã nộp. Admin sẽ xem xét trong 1-2 ngày làm việc.',
      {}
    );

    res.json({ ok: true, kyc: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
