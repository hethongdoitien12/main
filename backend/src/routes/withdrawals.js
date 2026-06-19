import { Router } from 'express';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import { query } from '../db/pool.js';
import { LedgerService } from '../services/ledger.js';
import { notify } from '../services/notifier.js';
import { sendWithdrawalApproved, sendWithdrawalRejected } from '../services/mailer.js';

const router = Router();
router.use(authMiddleware);

const MIN_MT = 1000;

// POST /api/withdrawals — creator tạo yêu cầu rút tiền
router.post('/', async (req, res) => {
  try {
    if (req.user.role !== 'creator' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Chỉ creator mới có thể rút tiền' });
    }

    const { amount_mt, note } = req.body;
    const amount = parseInt(amount_mt);

    if (!amount || isNaN(amount) || amount < MIN_MT) {
      return res.status(400).json({ error: `Số MT tối thiểu để rút là ${MIN_MT.toLocaleString('vi-VN')} MT` });
    }

    // Kiểm tra số dư
    const { rows: [wallet] } = await query('SELECT balance FROM wallets WHERE user_id=$1', [req.user.id]);
    if (!wallet || Number(wallet.balance) < amount) {
      return res.status(400).json({ error: 'Số dư không đủ' });
    }

    // Trừ MT ngay khi tạo yêu cầu
    await LedgerService.transact({
      userId: req.user.id,
      amount: -amount,
      type: 'withdrawal',
      idempotencyKey: `withdrawal:${req.user.id}:${Date.now()}`,
      description: `Yêu cầu rút ${amount.toLocaleString()} MT`,
    });

    const { rows: [wr] } = await query(`
      INSERT INTO withdrawal_requests
        (user_id, amount_xu, amount_vnd, fee_xu, notes, status)
      VALUES ($1, $2, $2, 0, $3, 'pending')
      RETURNING *
    `, [req.user.id, amount, note || null]);

    res.status(201).json({
      withdrawal: wr,
      message: `Đã gửi yêu cầu rút ${amount.toLocaleString()} MT. Admin sẽ xử lý sớm.`,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/withdrawals/mine — creator xem lịch sử yêu cầu rút của mình
router.get('/mine', async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT id, amount_xu, notes, status, bank_transfer_ref, created_at, processed_at
      FROM withdrawal_requests
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/withdrawals/queue — ADMIN: xem queue theo status
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

// POST /api/withdrawals/:id/approve — ADMIN: duyệt yêu cầu (pending → approved)
router.post('/:id/approve', adminOnly, async (req, res) => {
  try {
    const { notes } = req.body;
    const { rows: [wr] } = await query(
      `SELECT wr.*, u.email, u.username FROM withdrawal_requests wr
       JOIN users u ON u.id = wr.user_id WHERE wr.id = $1`,
      [req.params.id]
    );
    if (!wr) return res.status(404).json({ error: 'Không tìm thấy yêu cầu' });
    if (wr.status !== 'pending') return res.status(400).json({ error: 'Yêu cầu không ở trạng thái pending' });

    const { rows: [updated] } = await query(`
      UPDATE withdrawal_requests
      SET status = 'approved', processed_at = NOW(), notes = $2
      WHERE id = $1 RETURNING *
    `, [req.params.id, notes || 'Đã duyệt']);

    await notify({
      userId: wr.user_id,
      type: 'withdrawal_approved',
      title: '✅ Yêu cầu rút tiền được duyệt',
      body: `Yêu cầu rút ${Number(wr.amount_xu).toLocaleString()} MT đã được duyệt. Admin sẽ chuyển tiền cho bạn sớm.`,
      metadata: { withdrawal_id: req.params.id, amount_mt: wr.amount_xu },
    });

    res.json({ withdrawal: updated, message: `Đã duyệt yêu cầu của ${wr.username}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/withdrawals/:id/reject — ADMIN: từ chối & hoàn MT (pending → rejected)
router.post('/:id/reject', adminOnly, async (req, res) => {
  try {
    const { rows: [wr] } = await query(
      `SELECT wr.*, u.email, u.username FROM withdrawal_requests wr
       JOIN users u ON u.id = wr.user_id WHERE wr.id = $1`,
      [req.params.id]
    );
    if (!wr) return res.status(404).json({ error: 'Không tìm thấy' });
    if (wr.status !== 'pending') return res.status(400).json({ error: 'Chỉ từ chối được yêu cầu ở trạng thái pending' });

    await LedgerService.transact({
      userId: wr.user_id,
      amount: Number(wr.amount_xu),
      type: 'refund',
      idempotencyKey: `refund_withdrawal:${wr.id}`,
      referenceId: wr.id,
      referenceType: 'withdrawal_request',
      description: `Hoàn MT do từ chối rút: ${req.body.reason || 'Không đủ điều kiện'}`,
    });

    await query(`
      UPDATE withdrawal_requests
      SET status = 'rejected', notes = $2, processed_at = NOW()
      WHERE id = $1
    `, [req.params.id, req.body.reason || 'Từ chối']);

    await notify({
      userId: wr.user_id,
      type: 'withdrawal_rejected',
      title: '❌ Yêu cầu rút tiền bị từ chối',
      body: `${Number(wr.amount_xu).toLocaleString()} MT đã được hoàn về ví. Lý do: ${req.body.reason || 'Không đủ điều kiện'}`,
      metadata: { withdrawal_id: req.params.id, amount_xu: wr.amount_xu },
    });

    sendWithdrawalRejected({
      email: wr.email,
      username: wr.username,
      amountXu: wr.amount_xu,
      reason: req.body.reason || 'Không đủ điều kiện',
    }).catch(() => {});

    res.json({ message: `Đã từ chối và hoàn ${Number(wr.amount_xu).toLocaleString()} MT về ví` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/withdrawals/:id/paid — ADMIN: đánh dấu đã chuyển tiền (approved → paid)
router.post('/:id/paid', adminOnly, async (req, res) => {
  try {
    const { bank_transfer_ref, notes } = req.body;
    const { rows: [wr] } = await query(
      `SELECT wr.*, u.email, u.username FROM withdrawal_requests wr
       JOIN users u ON u.id = wr.user_id WHERE wr.id = $1`,
      [req.params.id]
    );
    if (!wr) return res.status(404).json({ error: 'Không tìm thấy' });
    if (wr.status !== 'approved') return res.status(400).json({ error: 'Chỉ đánh dấu paid được yêu cầu ở trạng thái approved' });

    const { rows: [updated] } = await query(`
      UPDATE withdrawal_requests
      SET status = 'paid', bank_transfer_ref = $2, notes = $3, processed_at = NOW()
      WHERE id = $1 RETURNING *
    `, [req.params.id, bank_transfer_ref || null, notes || 'Đã chuyển tiền']);

    await notify({
      userId: wr.user_id,
      type: 'withdrawal_paid',
      title: '💸 Tiền đã được chuyển',
      body: `${Number(wr.amount_xu).toLocaleString()} MT đã được chuyển khoản thành công${bank_transfer_ref ? `. Mã GD: ${bank_transfer_ref}` : ''}.`,
      metadata: { withdrawal_id: req.params.id, bank_transfer_ref },
    });

    sendWithdrawalApproved({
      email: wr.email,
      username: wr.username,
      amountVnd: wr.amount_vnd,
      bankTransferRef: bank_transfer_ref,
    }).catch(() => {});

    res.json({ withdrawal: updated, message: `Đã đánh dấu paid cho ${wr.username}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/withdrawals/stats — ADMIN: thống kê rút tiền
router.get('/stats', adminOnly, async (req, res) => {
  try {
    const { rows: [stats] } = await query(`
      SELECT
        COUNT(*) FILTER (WHERE status='pending')::INT  AS pending_count,
        COALESCE(SUM(amount_xu) FILTER (WHERE status='pending'),  0)::BIGINT AS pending_mt,
        COUNT(*) FILTER (WHERE status='approved')::INT AS approved_count,
        COALESCE(SUM(amount_xu) FILTER (WHERE status='approved'), 0)::BIGINT AS approved_mt,
        COUNT(*) FILTER (WHERE status='paid')::INT     AS paid_count,
        COALESCE(SUM(amount_xu) FILTER (WHERE status='paid'),     0)::BIGINT AS paid_mt,
        COUNT(*) FILTER (WHERE status='rejected')::INT AS rejected_count
      FROM withdrawal_requests
    `);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
