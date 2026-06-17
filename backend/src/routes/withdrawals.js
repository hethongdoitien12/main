import { Router } from 'express';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import { query } from '../db/pool.js';
import { LedgerService, getConfig } from '../services/ledger.js';
import { notify } from '../services/notifier.js';
import { sendWithdrawalApproved, sendWithdrawalRejected } from '../services/mailer.js';

const router = Router();
router.use(authMiddleware);

// POST /api/withdrawals — tạo yêu cầu rút tiền
router.post('/', async (req, res) => {
  try {
    const { amount_xu, bank_name, bank_account, account_name } = req.body;
    const cfg = await getConfig();

    if (!amount_xu || amount_xu < cfg.MIN_WITHDRAWAL_XU) {
      return res.status(400).json({ error: `Số XU tối thiểu để rút là ${Number(cfg.MIN_WITHDRAWAL_XU).toLocaleString('vi-VN')}` });
    }
    if (!bank_name || !bank_account || !account_name) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin ngân hàng' });
    }

    if (amount_xu > cfg.KYC_THRESHOLD_XU) {
      const { rows: [u] } = await query('SELECT kyc_status FROM users WHERE id=$1', [req.user.id]);
      if (u?.kyc_status !== 'verified') {
        return res.status(403).json({
          error: `Rút trên ${Number(cfg.KYC_THRESHOLD_XU).toLocaleString('vi-VN')} XU yêu cầu xác minh KYC.`,
          kyc_required: true,
        });
      }
    }

    const fee_xu     = Math.floor(amount_xu * cfg.WITHDRAWAL_FEE_PCT);
    const net_xu     = amount_xu - fee_xu;
    const amount_vnd = Math.floor(net_xu / cfg.VND_PER_XU);

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
      fee_pct: cfg.WITHDRAWAL_FEE_PCT,
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
    const { notes, bank_transfer_ref } = req.body;
    const { rows: [wr] } = await query(
      `SELECT wr.*, u.email, u.username FROM withdrawal_requests wr
       JOIN users u ON u.id = wr.user_id WHERE wr.id = $1`,
      [req.params.id]
    );
    if (!wr) return res.status(404).json({ error: 'Không tìm thấy yêu cầu' });
    if (wr.status !== 'pending') return res.status(400).json({ error: 'Yêu cầu không ở trạng thái pending' });

    const { rows: [updated] } = await query(`
      UPDATE withdrawal_requests
      SET status = 'completed', processed_at = NOW(), notes = $2, bank_transfer_ref = $3
      WHERE id = $1 RETURNING *
    `, [req.params.id, notes || 'Đã chuyển khoản', bank_transfer_ref || null]);

    await notify({
      userId: wr.user_id,
      type: 'withdrawal_approved',
      title: '✅ Yêu cầu rút tiền được duyệt',
      body: `${parseInt(wr.amount_vnd).toLocaleString('vi-VN')} VNĐ sẽ được chuyển vào tài khoản của bạn${bank_transfer_ref ? `. Mã GD: ${bank_transfer_ref}` : ''}`,
      metadata: { withdrawal_id: req.params.id, amount_vnd: wr.amount_vnd, bank_transfer_ref },
    });

    sendWithdrawalApproved({
      email: wr.email,
      username: wr.username,
      amountVnd: wr.amount_vnd,
      bankTransferRef: bank_transfer_ref,
    }).catch(() => {});

    res.json({
      withdrawal: updated,
      message: `Đã duyệt ${parseInt(wr.amount_vnd).toLocaleString('vi-VN')}đ cho ${wr.username}`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/withdrawals/:id/reject — ADMIN: từ chối & hoàn XU
router.post('/:id/reject', adminOnly, async (req, res) => {
  try {
    const { rows: [wr] } = await query(
      `SELECT wr.*, u.email, u.username FROM withdrawal_requests wr
       JOIN users u ON u.id = wr.user_id WHERE wr.id = $1`,
      [req.params.id]
    );
    if (!wr) return res.status(404).json({ error: 'Không tìm thấy' });
    if (wr.status !== 'pending') return res.status(400).json({ error: 'Yêu cầu không ở trạng thái pending' });

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

    await notify({
      userId: wr.user_id,
      type: 'withdrawal_rejected',
      title: '❌ Yêu cầu rút tiền bị từ chối',
      body: `${parseInt(wr.amount_xu).toLocaleString('vi-VN')} XU đã được hoàn về ví. Lý do: ${req.body.reason || 'Không đủ điều kiện'}`,
      metadata: { withdrawal_id: req.params.id, amount_xu: wr.amount_xu },
    });

    sendWithdrawalRejected({
      email: wr.email,
      username: wr.username,
      amountXu: wr.amount_xu,
      reason: req.body.reason || 'Không đủ điều kiện',
    }).catch(() => {});

    res.json({ message: `Đã từ chối và hoàn ${parseInt(wr.amount_xu).toLocaleString('vi-VN')} XU về ví` });
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
