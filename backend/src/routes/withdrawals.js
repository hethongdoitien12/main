import { Router } from 'express';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import { query } from '../db/pool.js';
import { LedgerService } from '../services/ledger.js';

const router = Router();
router.use(authMiddleware);

// POST /api/withdrawals — tạo yêu cầu rút tiền
router.post('/', async (req, res) => {
  try {
    const { amount_xu, bank_name, bank_account, account_name } = req.body;
    if (!amount_xu || amount_xu < 50000) {
      return res.status(400).json({ error: 'Số XU tối thiểu để rút là 50,000' });
    }
    if (!bank_name || !bank_account || !account_name) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin ngân hàng' });
    }

    const FEE_RATE   = 0.1;
    const fee_xu     = Math.floor(amount_xu * FEE_RATE);
    const net_xu     = amount_xu - fee_xu;
    const amount_vnd = net_xu;

    await LedgerService.transact({
      userId: req.user.id,
      amount: -amount_xu,
      type: 'withdrawal',
      idempotencyKey: `withdrawal:${req.user.id}:${Date.now()}`,
      description: `Rút ${amount_xu.toLocaleString()} XU → ${amount_vnd.toLocaleString()} VNĐ`,
    });

    const { rows: [wr] } = await query(`
      INSERT INTO withdrawal_requests
        (user_id, amount_xu, fee_xu, amount_vnd, bank_name, bank_account, account_name, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
      RETURNING *
    `, [req.user.id, amount_xu, fee_xu, amount_vnd, bank_name, bank_account, account_name]);

    res.status(201).json({
      withdrawal: wr,
      amount_vnd,
      fee_xu,
      message: `Đã gửi yêu cầu rút. Bạn sẽ nhận ${amount_vnd.toLocaleString()} VNĐ sau khi admin duyệt.`
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/withdrawals/mine — creator xem yêu cầu rút của mình
router.get('/mine', async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT * FROM withdrawal_requests
      WHERE user_id = $1
      ORDER BY created_at DESC LIMIT 50
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/withdrawals/queue — ADMIN: xem toàn bộ queue chờ duyệt
router.get('/queue', adminOnly, async (req, res) => {
  try {
    const { status = 'pending' } = req.query;
    const { rows } = await query(`
      SELECT wr.*, u.username, u.email, u.role
      FROM withdrawal_requests wr
      JOIN users u ON u.id = wr.user_id
      WHERE wr.status = $1
      ORDER BY wr.created_at ASC
    `, [status]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/withdrawals/:id/approve — ADMIN: duyệt & chuyển tiền
router.post('/:id/approve', adminOnly, async (req, res) => {
  try {
    const { rows: [wr] } = await query(
      'SELECT * FROM withdrawal_requests WHERE id = $1',
      [req.params.id]
    );
    if (!wr) return res.status(404).json({ error: 'Không tìm thấy yêu cầu' });
    if (wr.status !== 'pending') return res.status(400).json({ error: 'Yêu cầu không ở trạng thái pending' });

    const { rows: [updated] } = await query(`
      UPDATE withdrawal_requests
      SET status = 'completed', processed_at = NOW(), notes = $2
      WHERE id = $1 RETURNING *
    `, [req.params.id, req.body.notes || 'Đã duyệt và chuyển tiền']);

    res.json({ withdrawal: updated, message: `Đã duyệt ${wr.amount_vnd.toLocaleString()}đ cho user` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/withdrawals/:id/reject — ADMIN: từ chối & hoàn XU
router.post('/:id/reject', adminOnly, async (req, res) => {
  try {
    const { rows: [wr] } = await query(
      'SELECT * FROM withdrawal_requests WHERE id = $1',
      [req.params.id]
    );
    if (!wr) return res.status(404).json({ error: 'Không tìm thấy' });
    if (wr.status !== 'pending') return res.status(400).json({ error: 'Yêu cầu không ở trạng thái pending' });

    // Hoàn XU về ví (bao gồm cả phí đã trừ)
    await LedgerService.transact({
      userId: wr.user_id,
      amount: wr.amount_xu,
      type: 'refund',
      idempotencyKey: `refund_withdrawal:${wr.id}`,
      referenceId: wr.id,
      referenceType: 'withdrawal_request',
      description: `Hoàn XU do từ chối rút: ${req.body.reason || 'Không đủ điều kiện'}`
    });

    await query(`
      UPDATE withdrawal_requests
      SET status = 'failed', notes = $2, processed_at = NOW()
      WHERE id = $1
    `, [req.params.id, req.body.reason || 'Từ chối']);

    res.json({ message: `Đã từ chối và hoàn ${wr.amount_xu.toLocaleString()} XU về ví` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/withdrawals/stats — ADMIN: thống kê rút tiền
router.get('/stats', adminOnly, async (req, res) => {
  try {
    const { rows: [stats] } = await query(`
      SELECT
        COUNT(*) FILTER (WHERE status='pending') as pending_count,
        COALESCE(SUM(amount_vnd) FILTER (WHERE status='pending'), 0) as pending_vnd,
        COUNT(*) FILTER (WHERE status='completed') as completed_count,
        COALESCE(SUM(amount_vnd) FILTER (WHERE status='completed'), 0) as completed_vnd,
        COALESCE(SUM(fee_xu) FILTER (WHERE status='completed'), 0) as total_fee_xu
      FROM withdrawal_requests
    `);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
