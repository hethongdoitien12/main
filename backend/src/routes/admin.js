import { Router } from 'express';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import { query } from '../db/pool.js';

const router = Router();
router.use(authMiddleware, adminOnly);

// GET /api/admin/deposits — toàn bộ deposit requests kèm username
router.get('/deposits', async (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit)  || 100, 500);
    const offset = parseInt(req.query.offset) || 0;
    const status = req.query.status;

    let q = `
      SELECT dr.*, u.username, u.email
      FROM deposit_requests dr
      JOIN users u ON u.id = dr.user_id
    `;
    const params = [];
    if (status) { params.push(status); q += ` WHERE dr.status = $${params.length}`; }
    q += ` ORDER BY dr.created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`;
    params.push(limit, offset);

    const { rows } = await query(q, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/transactions — tất cả ledger entries kèm username
router.get('/transactions', async (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit)  || 50, 200);
    const offset = parseInt(req.query.offset) || 0;
    const type   = req.query.type;

    let q = `
      SELECT le.*, u.username
      FROM ledger_entries le
      JOIN users u ON u.id = le.user_id
    `;
    const params = [];
    if (type) { params.push(type); q += ` WHERE le.type = $${params.length}`; }
    q += ` ORDER BY le.created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`;
    params.push(limit, offset);

    const { rows } = await query(q, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/expiry-batches — xem tất cả lô XU sắp/đã hết hạn
router.get('/expiry-batches', async (req, res) => {
  try {
    const { status = 'active', limit = 100 } = req.query;
    const { rows } = await query(`
      SELECT xb.*, u.username, u.email
      FROM xu_expiry_batches xb
      JOIN users u ON u.id = xb.user_id
      WHERE ($1 = 'all' OR xb.status = $1)
      ORDER BY xb.expires_at ASC
      LIMIT $2
    `, [status, Math.min(parseInt(limit), 500)]);
    const { rows: [summary] } = await query(`
      SELECT
        COUNT(*) FILTER (WHERE status='active') as active_count,
        COALESCE(SUM(remaining_xu) FILTER (WHERE status='active'), 0) as total_active_xu,
        COUNT(*) FILTER (WHERE status='active' AND expires_at <= NOW() + INTERVAL '7 days') as expiring_soon,
        COALESCE(SUM(remaining_xu) FILTER (WHERE status='active' AND expires_at <= NOW() + INTERVAL '7 days'), 0) as expiring_soon_xu
      FROM xu_expiry_batches
    `);
    res.json({ batches: rows, summary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/run-expire — kích hoạt job expire thủ công
router.post('/run-expire', async (req, res) => {
  try {
    const { expirePromotionalXu } = await import('../services/cron.js');
    const result = await expirePromotionalXu();
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/run-cleanup — kích hoạt dọn deposit thủ công
router.post('/run-cleanup', async (req, res) => {
  try {
    const { cleanupPendingDeposits } = await import('../services/cron.js');
    const result = await cleanupPendingDeposits();
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/deposits/:id/approve — admin xác nhận deposit ngân hàng thủ công
router.post('/deposits/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const { rows } = await query(
      `SELECT * FROM deposit_requests WHERE id = $1 AND status = 'pending'`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Không tìm thấy hoặc đã xử lý' });

    const deposit = rows[0];
    const { LedgerService } = await import('../services/ledger.js');
    const result = await LedgerService.deposit({
      userId: deposit.user_id,
      amountVnd: parseInt(deposit.amount_vnd || deposit.vnd_amount),
      paymentMethod: deposit.payment_method || deposit.payment_gateway || 'bank_transfer',
      paymentRef: `admin_approve_${id}_${Date.now()}`,
      metadata: { approvedBy: req.user.id, notes, depositId: id },
    });

    await query(
      `UPDATE deposit_requests SET status='completed', payment_ref=$1, updated_at=NOW() WHERE id=$2`,
      [`admin_approve_${id}`, id]
    );

    const { sendToUser } = await import('../services/sse.js');
    sendToUser(deposit.user_id, 'balance_update', { balance: result.entry?.balance_after });

    const { notify } = await import('../services/notifier.js');
    await notify(deposit.user_id, 'deposit_confirmed',
      `✅ Admin đã duyệt nạp ${parseInt(deposit.amount_vnd||0).toLocaleString('vi-VN')}đ. XU đã vào ví!`,
      { depositId: id }
    );

    res.json({ ok: true, entry: result.entry });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/deposits/:id/reject — từ chối deposit
router.post('/deposits/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const { rows } = await query(
      `SELECT * FROM deposit_requests WHERE id = $1 AND status = 'pending'`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Không tìm thấy hoặc đã xử lý' });

    await query(
      `UPDATE deposit_requests SET status='failed', updated_at=NOW() WHERE id=$1`,
      [id]
    );

    const { notify } = await import('../services/notifier.js');
    await notify(rows[0].user_id, 'deposit_rejected',
      `❌ Yêu cầu nạp tiền bị từ chối${reason ? ': ' + reason : ''}. Liên hệ hỗ trợ nếu có thắc mắc.`,
      { depositId: id, reason }
    );

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/chart-data — doanh thu + user mới theo ngày (30 ngày)
router.get('/chart-data', async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 30, 90);

    const { rows: revenue } = await query(`
      SELECT
        DATE(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') AS date,
        COALESCE(SUM(amount_vnd)::BIGINT, 0)             AS vnd_deposited,
        COUNT(*)::INT                                     AS deposit_count
      FROM deposit_requests
      WHERE status = 'completed'
        AND created_at >= NOW() - ($1 || ' days')::INTERVAL
      GROUP BY DATE(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')
      ORDER BY date ASC
    `, [days]);

    const { rows: newUsers } = await query(`
      SELECT
        DATE(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') AS date,
        COUNT(*)::INT AS count
      FROM users
      WHERE created_at >= NOW() - ($1 || ' days')::INTERVAL
      GROUP BY DATE(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')
      ORDER BY date ASC
    `, [days]);

    res.json({ revenue, newUsers, days });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/export/transactions — xuất CSV ledger entries (token via query param for download)
router.get('/export/transactions', async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 30, 365);
    const { rows } = await query(`
      SELECT le.created_at, u.username, u.email, le.type, le.amount,
             le.balance_before, le.balance_after, le.description, le.status
      FROM ledger_entries le
      JOIN users u ON u.id = le.user_id
      WHERE le.created_at >= NOW() - ($1 || ' days')::INTERVAL
      ORDER BY le.created_at DESC
      LIMIT 10000
    `, [days]);

    const headers = ['Thời gian','Username','Email','Loại','Số XU','Số dư trước','Số dư sau','Mô tả','Trạng thái'];
    const csvRows = rows.map(r => [
      new Date(r.created_at).toLocaleString('vi-VN'),
      r.username, r.email, r.type, r.amount,
      r.balance_before, r.balance_after,
      (r.description || '').replace(/,/g, ';'),
      r.status,
    ].join(','));

    const csv = [headers.join(','), ...csvRows].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="transactions_${days}days.csv"`);
    res.send('\uFEFF' + csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/export/users — xuất CSV danh sách users
router.get('/export/users', async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT u.username, u.email, u.role, u.created_at,
             w.balance, w.total_earned, w.total_spent, w.total_withdrawn,
             u.referral_code
      FROM users u
      LEFT JOIN wallets w ON w.user_id = u.id
      ORDER BY u.created_at DESC
    `);

    const headers = ['Username','Email','Role','Ngày tạo','Số dư XU','Đã kiếm','Đã tiêu','Đã rút','Mã giới thiệu'];
    const csvRows = rows.map(r => [
      r.username, r.email, r.role,
      new Date(r.created_at).toLocaleString('vi-VN'),
      r.balance || 0, r.total_earned || 0, r.total_spent || 0, r.total_withdrawn || 0,
      r.referral_code || '',
    ].join(','));

    const csv = [headers.join(','), ...csvRows].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
    res.send('\uFEFF' + csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/kyc/pending — danh sách user chờ KYC duyệt
router.get('/kyc/pending', async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT id, username, email, kyc_status, kyc_full_name, kyc_id_number,
             kyc_submitted_at, role, created_at
      FROM users
      WHERE kyc_status = 'pending'
      ORDER BY kyc_submitted_at ASC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/kyc/:userId/approve — duyệt KYC
router.post('/kyc/:userId/approve', async (req, res) => {
  try {
    const { userId } = req.params;
    const { rows: [user] } = await query(
      `UPDATE users SET kyc_status='verified', kyc_verified_at=NOW(), updated_at=NOW()
       WHERE id=$1 AND kyc_status='pending'
       RETURNING username, email, kyc_status`,
      [userId]
    );
    if (!user) return res.status(404).json({ error: 'Không tìm thấy hoặc đã xử lý' });

    const { notify } = await import('../services/notifier.js');
    await notify(userId, 'kyc_approved',
      '✅ KYC đã được duyệt! Bạn có thể rút số tiền lớn không giới hạn.',
      {}
    );

    res.json({ ok: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/kyc/:userId/reject — từ chối KYC
router.post('/kyc/:userId/reject', async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    const { rows: [user] } = await query(
      `UPDATE users SET kyc_status='none', kyc_submitted_at=NULL, kyc_full_name=NULL,
       kyc_id_number=NULL, updated_at=NOW()
       WHERE id=$1 AND kyc_status='pending'
       RETURNING username, email`,
      [userId]
    );
    if (!user) return res.status(404).json({ error: 'Không tìm thấy hoặc đã xử lý' });

    const { notify } = await import('../services/notifier.js');
    await notify(userId, 'kyc_rejected',
      `❌ KYC bị từ chối${reason ? ': ' + reason : ''}. Vui lòng nộp lại với thông tin chính xác.`,
      { reason }
    );

    res.json({ ok: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/stats — tổng hợp nhanh cho dashboard
router.get('/stats', async (req, res) => {
  try {
    const { rows: [s] } = await query(`
      SELECT
        (SELECT COUNT(*) FROM users)::INT              AS total_users,
        (SELECT COUNT(*) FROM users WHERE role='creator')::INT AS total_creators,
        (SELECT COALESCE(SUM(balance),0) FROM wallets)::BIGINT AS total_xu_circulating,
        (SELECT COUNT(*) FROM deposit_requests WHERE status='completed')::INT AS total_deposits,
        (SELECT COALESCE(SUM(amount_vnd),0) FROM deposit_requests WHERE status='completed')::BIGINT AS total_deposited_vnd,
        (SELECT COUNT(*) FROM withdrawal_requests WHERE status='pending')::INT AS pending_withdrawals,
        (SELECT COUNT(*) FROM ledger_entries)::INT     AS transaction_count,
        (SELECT COALESCE(SUM(amount_xu),0) FROM deposit_requests WHERE status='completed')::BIGINT AS total_deposited
    `);
    res.json(s);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/users — danh sách users + số dư ví (hỗ trợ search + pagination)
router.get('/users', async (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit)  || 50, 200);
    const offset = parseInt(req.query.offset) || 0;
    const search = req.query.search?.trim() || '';

    const params = [];
    let where = '';
    if (search) {
      params.push(`%${search}%`);
      where = `WHERE u.username ILIKE $1 OR u.email ILIKE $1`;
    }

    const { rows } = await query(`
      SELECT u.id, u.username, u.email, u.role, u.created_at,
             u.banned_at, u.ban_reason,
             w.balance, w.total_earned, w.total_spent, w.total_withdrawn
      FROM users u
      LEFT JOIN wallets w ON w.user_id = u.id
      ${where}
      ORDER BY u.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, limit, offset]);

    const { rows: [{ total }] } = await query(`
      SELECT COUNT(*)::int AS total FROM users u ${where}
    `, params);

    res.json({ users: rows, total, limit, offset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/users/:id/role — đổi role
router.patch('/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const VALID = ['user', 'creator', 'admin'];
    if (!VALID.includes(role)) return res.status(400).json({ error: 'Role không hợp lệ' });
    if (id === req.user.id) return res.status(400).json({ error: 'Không thể đổi role của chính mình' });

    const { rows: [u] } = await query(
      `UPDATE users SET role=$1, updated_at=NOW() WHERE id=$2 RETURNING id, username, email, role`,
      [role, id]
    );
    if (!u) return res.status(404).json({ error: 'Không tìm thấy user' });
    res.json({ ok: true, user: u });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/users/:id/ban — ban user
router.post('/users/:id/ban', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    if (id === req.user.id) return res.status(400).json({ error: 'Không thể ban chính mình' });

    const { rows: [u] } = await query(
      `UPDATE users SET banned_at=NOW(), ban_reason=$1, updated_at=NOW()
       WHERE id=$2 AND banned_at IS NULL
       RETURNING id, username, email, banned_at`,
      [reason || null, id]
    );
    if (!u) return res.status(404).json({ error: 'Không tìm thấy hoặc đã bị ban' });
    res.json({ ok: true, user: u });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/users/:id/unban — gỡ ban
router.post('/users/:id/unban', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows: [u] } = await query(
      `UPDATE users SET banned_at=NULL, ban_reason=NULL, updated_at=NOW()
       WHERE id=$1 AND banned_at IS NOT NULL
       RETURNING id, username, email`,
      [id]
    );
    if (!u) return res.status(404).json({ error: 'Không tìm thấy hoặc chưa bị ban' });
    res.json({ ok: true, user: u });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/adjust-history — 20 lần admin_adjust gần nhất
router.get('/adjust-history', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const { rows } = await query(`
      SELECT le.id, le.amount, le.balance_before, le.balance_after,
             le.description, le.metadata, le.created_at,
             u.username, u.email,
             adm.username AS admin_username
      FROM ledger_entries le
      JOIN users u ON u.id = le.user_id
      LEFT JOIN users adm ON adm.id = (le.metadata->>'adjustedBy')::uuid
      WHERE le.type = 'admin_adjust'
      ORDER BY le.created_at DESC
      LIMIT $1
    `, [limit]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/adjust-xu — cộng/trừ XU thủ công qua ledger
router.post('/adjust-xu', async (req, res) => {
  try {
    const { userId, amount, note } = req.body;
    if (!userId) return res.status(400).json({ error: 'Thiếu userId' });
    const parsed = parseInt(amount);
    if (!parsed || parsed === 0) return res.status(400).json({ error: 'Số XU không hợp lệ (khác 0)' });

    const { LedgerService } = await import('../services/ledger.js');
    const entry = await LedgerService.transact({
      userId,
      amount: parsed,
      type: 'admin_adjust',
      description: note ? `[Admin] ${note}` : `[Admin] Điều chỉnh thủ công ${parsed > 0 ? '+' : ''}${parsed} XU`,
      metadata: { adjustedBy: req.user.id, note: note || '' },
    });

    res.json({ ok: true, entry });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Quest management ────────────────────────────────────────────────────────

// GET /api/admin/quests — all quests with completion stats
router.get('/quests', async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT q.*,
        COUNT(uq.id)::int                                             AS total_participants,
        COUNT(uq.id) FILTER (WHERE uq.status IN ('completed','claimed'))::int AS total_completed,
        COUNT(uq.id) FILTER (WHERE uq.status = 'claimed')::int        AS total_claimed
      FROM quests q
      LEFT JOIN user_quests uq ON uq.quest_id = q.id
      GROUP BY q.id
      ORDER BY q.created_at DESC
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/admin/quests — tạo quest mới
router.post('/quests', async (req, res) => {
  try {
    const { title, description, type, category, reward_xu, requirement, expires_at } = req.body;
    if (!title || !type || !reward_xu || !requirement)
      return res.status(400).json({ error: 'Thiếu title / type / reward_xu / requirement' });
    const VALID_TYPES = ['daily','weekly','one_time','event'];
    if (!VALID_TYPES.includes(type))
      return res.status(400).json({ error: 'type không hợp lệ' });
    const { rows: [q] } = await query(`
      INSERT INTO quests (title, description, type, category, reward_xu, requirement, expires_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
    `, [title, description||null, type, category||null, reward_xu, requirement, expires_at||null]);
    res.status(201).json(q);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/admin/quests/:id — sửa quest
router.patch('/quests/:id', async (req, res) => {
  try {
    const { title, description, type, category, reward_xu, requirement, expires_at, is_active } = req.body;
    const { rows: [q] } = await query(`
      UPDATE quests SET
        title       = COALESCE($2, title),
        description = COALESCE($3, description),
        type        = COALESCE($4, type),
        category    = COALESCE($5, category),
        reward_xu   = COALESCE($6, reward_xu),
        requirement = COALESCE($7, requirement),
        expires_at  = CASE WHEN $8::text IS NOT NULL THEN $8::timestamptz ELSE expires_at END,
        is_active   = COALESCE($9, is_active)
      WHERE id = $1 RETURNING *
    `, [req.params.id, title||null, description||null, type||null, category||null,
        reward_xu||null, requirement||null, expires_at||null, is_active??null]);
    if (!q) return res.status(404).json({ error: 'Không tìm thấy quest' });
    res.json(q);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/admin/quests/:id/toggle — bật/tắt quest
router.patch('/quests/:id/toggle', async (req, res) => {
  try {
    const { rows: [q] } = await query(
      `UPDATE quests SET is_active = NOT is_active WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (!q) return res.status(404).json({ error: 'Không tìm thấy quest' });
    res.json(q);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/admin/quests/:id — xóa quest (chỉ khi chưa có user tham gia)
router.delete('/quests/:id', async (req, res) => {
  try {
    const { rows: [{ cnt }] } = await query(
      `SELECT COUNT(*)::int AS cnt FROM user_quests WHERE quest_id = $1`, [req.params.id]
    );
    if (cnt > 0) return res.status(400).json({ error: `Không thể xóa — đã có ${cnt} user tham gia. Tắt quest thay vì xóa.` });
    await query(`DELETE FROM quests WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Notification broadcast ───────────────────────────────────────────────────

// GET /api/admin/notifications/preview — đếm số user theo target
router.get('/notifications/preview', async (req, res) => {
  try {
    const { target } = req.query; // 'all' | 'user' | 'creator' | 'admin'
    let where = `WHERE banned_at IS NULL`;
    if (target && target !== 'all') where += ` AND role = '${target}'`;
    const { rows: [{ cnt }] } = await query(`SELECT COUNT(*)::int AS cnt FROM users ${where}`);
    res.json({ count: cnt });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/admin/notifications/broadcast — gửi thông báo hàng loạt
router.post('/notifications/broadcast', async (req, res) => {
  try {
    const { title, body, type = 'system', target = 'all' } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'Thiếu tiêu đề' });

    const VALID_TYPES  = ['system','promo','warning','info'];
    const VALID_TARGET = ['all','user','creator','admin'];
    if (!VALID_TYPES.includes(type))   return res.status(400).json({ error: 'type không hợp lệ' });
    if (!VALID_TARGET.includes(target)) return res.status(400).json({ error: 'target không hợp lệ' });

    // Lấy danh sách user_id theo target
    let where = `WHERE banned_at IS NULL`;
    const params = [];
    if (target !== 'all') { params.push(target); where += ` AND role = $1`; }
    const { rows: users } = await query(`SELECT id FROM users ${where}`, params);

    if (users.length === 0) return res.status(400).json({ error: 'Không có user nào phù hợp' });

    // Batch insert notifications (metadata uses DB default '{}')
    const placeholders = users.map((_, i) => `($${i*4+1},$${i*4+2},$${i*4+3},$${i*4+4})`).join(',');
    const vals = users.flatMap(u => [u.id, type, title.trim(), body?.trim() || null]);
    await query(
      `INSERT INTO notifications (user_id, type, title, body)
       VALUES ${placeholders}`,
      vals
    );

    // Lưu bản ghi broadcast vào bảng riêng
    await query(
      `INSERT INTO broadcast_logs (admin_id, title, body, type, target, recipient_count)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [req.user.id, title.trim(), body?.trim()||null, type, target, users.length]
    );

    res.json({ ok: true, sent: users.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/admin/notifications/broadcasts — lịch sử broadcast
router.get('/notifications/broadcasts', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit)||20, 100);
    const { rows } = await query(`
      SELECT bl.*, u.username AS admin_username
      FROM broadcast_logs bl
      JOIN users u ON u.id = bl.admin_id
      ORDER BY bl.created_at DESC
      LIMIT $1
    `, [limit]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/admin/reset-seed — xóa dữ liệu test và seed lại (chỉ xóa test accounts)
router.post('/reset-seed', async (req, res) => {
  const TEST_EMAILS = ['admin@xu.vn', 'nam@creator.vn', 'linh@user.vn'];
  const client = await (await import('../db/pool.js')).getClient();
  try {
    await client.query('BEGIN');

    // Xóa test users (CASCADE sẽ tự xóa wallets, ledger_entries, notifications, v.v.)
    const { rows: deleted } = await client.query(
      `DELETE FROM users WHERE email = ANY($1) RETURNING email`,
      [TEST_EMAILS]
    );

    // Xóa toàn bộ quests và tiến trình quest
    await client.query('DELETE FROM user_quests');
    await client.query('DELETE FROM quests');

    await client.query('COMMIT');

    // Re-seed
    const bcrypt = (await import('bcryptjs')).default;
    const { v4: uuidv4 } = await import('uuid');
    const hash = await bcrypt.hash('password123', 10);

    const users = [
      ['admin_xu',    'admin@xu.vn',      hash, 'admin'],
      ['creator_nam', 'nam@creator.vn',   hash, 'creator'],
      ['user_linh',   'linh@user.vn',     hash, 'user'],
    ];

    await client.query('BEGIN');
    for (const [username, email, password_hash, role] of users) {
      const { rows: [user] } = await client.query(`
        INSERT INTO users (username, email, password_hash, role)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (email) DO NOTHING
        RETURNING id
      `, [username, email, password_hash, role]);

      if (user) {
        await client.query(
          'INSERT INTO wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING',
          [user.id]
        );
        if (role !== 'admin') {
          await client.query(
            `UPDATE wallets SET balance = 10000, total_earned = 10000 WHERE user_id = $1`,
            [user.id]
          );
        }
      }
    }

    const quests = [
      { title:'Chào mừng bạn mới!',    description:'Đăng nhập lần đầu tiên',           type:'one_time', category:'social',   rewardXu:500,  requirement:{action:'login',count:1} },
      { title:'Chiến binh âm nhạc',    description:'Nghe 10 bản nhạc trong ngày',       type:'daily',    category:'music',    rewardXu:100,  requirement:{action:'listen_music',count:10} },
      { title:'Game thủ cần mẫn',      description:'Chơi game 30 phút hôm nay',         type:'daily',    category:'game',     rewardXu:150,  requirement:{action:'play_game_minutes',count:30} },
      { title:'Creator nội dung',      description:'Đăng 1 bài lên thế giới ảo',        type:'weekly',   category:'content',  rewardXu:300,  requirement:{action:'post_content',count:1} },
      { title:'Đại sứ thương hiệu',    description:'Mời 3 bạn bè đăng ký',              type:'one_time', category:'referral', rewardXu:1500, requirement:{action:'refer_friend',count:3} },
      { title:'Nhà thám hiểm',         description:'Ghé thăm 5 thế giới ảo khác nhau',  type:'weekly',   category:'game',     rewardXu:200,  requirement:{action:'visit_world',count:5} },
      { title:'Siêu fan',              description:'Tip cho 3 creator khác nhau',        type:'weekly',   category:'social',   rewardXu:250,  requirement:{action:'send_tip',count:3} },
    ];

    for (const q of quests) {
      await client.query(`
        INSERT INTO quests (title, description, type, category, reward_xu, requirement)
        VALUES ($1,$2,$3,$4,$5,$6)
      `, [q.title, q.description, q.type, q.category, q.rewardXu, JSON.stringify(q.requirement)]);
    }

    await client.query('COMMIT');

    res.json({
      ok: true,
      deleted: deleted.map(r => r.email),
      seeded: { users: users.map(u => u[1]), quests: quests.length },
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('reset-seed error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

export default router;
