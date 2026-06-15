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

export default router;
