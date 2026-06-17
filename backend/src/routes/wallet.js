import { Router } from 'express';
import { query, getClient } from '../db/pool.js';
import { authMiddleware } from '../middleware/auth.js';
import { LedgerService } from '../services/ledger.js';
import { createPayment as momoCreate, verifyIPN as momoVerify } from '../services/gateways/momo.js';
import { createPayment as zaloCreate, verifyIPN as zaloVerify } from '../services/gateways/zalopay.js';
import { notify } from '../services/notifier.js';
import { sendToUser, broadcast } from '../services/sse.js';

const router = Router();

// ─── helper: xử lý xác nhận deposit sau khi gateway thông báo ────────────────

async function processConfirmedDeposit(depositId, gatewayRef) {
  const { rows } = await query(
    `SELECT * FROM deposit_requests WHERE id = $1 AND status = 'pending'`,
    [depositId]
  );
  if (!rows.length) return { ok: false, reason: 'not_found_or_processed' };
  const deposit = rows[0];

  if (new Date() > new Date(deposit.expired_at || deposit.created_at)) {
    await query(`UPDATE deposit_requests SET status='expired' WHERE id=$1`, [deposit.id]);
    return { ok: false, reason: 'expired' };
  }

  try {
    const result = await LedgerService.deposit({
      userId: deposit.user_id,
      amountVnd: parseInt(deposit.amount_vnd || deposit.vnd_amount),
      paymentMethod: deposit.payment_method || deposit.payment_gateway,
      paymentRef: gatewayRef,
      metadata: { gatewayRef, depositId },
    });
    await query(`UPDATE deposit_requests SET status='completed', payment_ref=$1 WHERE id=$2`, [gatewayRef, deposit.id]);
    return { ok: true, entry: result.entry };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

// ─── GET /api/wallet/balance ─────────────────────────────────────────────────

router.get('/balance', authMiddleware, async (req, res) => {
  try {
    let wallet = await LedgerService.getWallet(req.user.id);
    if (!wallet) wallet = await LedgerService.createWallet(req.user.id);
    res.json({
      balance:         parseInt(wallet.balance || 0),
      balance_paid:    parseInt(wallet.balance_paid || wallet.balance || 0),
      balance_bonus:   parseInt(wallet.balance_bonus || 0),
      balance_total:   parseInt(wallet.balance || 0),
      total_deposited: parseInt(wallet.total_deposited || 0),
      total_spent:     parseInt(wallet.total_spent || 0),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi lấy số dư' });
  }
});

// ─── POST /api/wallet/deposit/create ────────────────────────────────────────

router.post('/deposit/create', authMiddleware, async (req, res) => {
  try {
    const { vnd_amount, amount_vnd, payment_gateway, payment_method } = req.body;
    const amount  = parseInt(vnd_amount || amount_vnd);
    const gateway = payment_gateway || payment_method;
    const validGateways = ['momo', 'zalopay', 'vnpay', 'bank_transfer'];

    if (!amount || amount < 10000) {
      return res.status(400).json({ error: 'Số tiền tối thiểu là 10,000 VNĐ' });
    }
    if (!validGateways.includes(gateway)) {
      return res.status(400).json({ error: 'Cổng thanh toán không hợp lệ: ' + gateway });
    }

    // Tạo deposit_request
    const { rows: [deposit] } = await query(
      `INSERT INTO deposit_requests (user_id, amount_vnd, amount_xu, payment_method, status)
       VALUES ($1, $2, $2, $3, 'pending') RETURNING *`,
      [req.user.id, amount, gateway]
    );

    // Gọi gateway
    let gatewayData = {};
    try {
      if (gateway === 'momo') {
        const r = await momoCreate(deposit.id, amount,
          `Nap ${amount.toLocaleString('vi-VN')} VND vao vi MT`);
        gatewayData = { pay_url: r.payUrl, deeplink: r.deeplink, qr_code_url: r.qrCodeUrl };

      } else if (gateway === 'zalopay') {
        const r = await zaloCreate(deposit.id, amount,
          `Nap ${amount.toLocaleString('vi-VN')} VND vao vi MT`);
        gatewayData = { pay_url: r.orderUrl, order_token: r.orderToken, app_trans_id: r.appTransId };

      } else {
        gatewayData = {
          pay_url: `https://pay.mock/${gateway}?ref=${deposit.id}&amount=${amount}`,
          note: 'Mock — chưa tích hợp thực tế',
        };
      }
    } catch (err) {
      console.error(`[${gateway}] createPayment error:`, err.message);
      gatewayData = { gateway_error: err.message };
    }

    res.status(201).json({
      deposit_id: deposit.id,
      amount_vnd: amount,
      payment_gateway: gateway,
      status: deposit.status,
      ...gatewayData,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi tạo yêu cầu nạp tiền' });
  }
});

// ─── POST /api/wallet/deposit/confirm (manual / test) ────────────────────────

router.post('/deposit/confirm', authMiddleware, async (req, res) => {
  try {
    const { deposit_id } = req.body;
    const { rows } = await query(
      `SELECT id FROM deposit_requests WHERE id=$1 AND user_id=$2`,
      [deposit_id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Không tìm thấy yêu cầu nạp tiền' });

    const result = await processConfirmedDeposit(deposit_id, `manual_${Date.now()}`);
    if (!result.ok) {
      return res.status(400).json({ error: {
        not_found_or_processed: 'Đã xử lý hoặc không tồn tại',
        expired: 'Yêu cầu đã hết hạn',
      }[result.reason] || result.reason });
    }
    const { rows: [dep] } = await query(`SELECT amount_vnd FROM deposit_requests WHERE id=$1`, [deposit_id]);
    await notify({
      userId: req.user.id,
      type: 'deposit_confirmed',
      title: '💰 Nạp tiền thành công',
      body: `+${parseInt(dep?.amount_vnd || 0).toLocaleString()} MT đã vào ví của bạn`,
    });
    res.json({ success: true, message: 'Nạp thành công!', entry: result.entry });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi xác nhận nạp tiền' });
  }
});

// ─── POST /api/wallet/momo/ipn ───────────────────────────────────────────────
// MoMo gọi server-to-server — không cần JWT

router.post('/momo/ipn', async (req, res) => {
  try {
    if (!momoVerify(req.body)) {
      console.warn('[MoMo IPN] Chữ ký không hợp lệ');
      return res.status(400).json({ resultCode: 1, message: 'invalid signature' });
    }

    const { orderId, resultCode, transId, amount, message } = req.body;

    if (resultCode !== 0) {
      await query(`UPDATE deposit_requests SET status='failed' WHERE id=$1`, [orderId]);
      console.log(`[MoMo IPN] Thất bại deposit=${orderId}: ${message}`);
      return res.json({ resultCode: 0, message: 'noted' });
    }

    const result = await processConfirmedDeposit(orderId, `momo_${transId}`);
    console.log(result.ok
      ? `[MoMo IPN] ✅ ${amount} VND deposit=${orderId}`
      : `[MoMo IPN] ⚠️ ${result.reason} deposit=${orderId}`
    );
    res.json({ resultCode: 0, message: 'success' });
  } catch (err) {
    console.error('[MoMo IPN]', err);
    res.status(500).json({ resultCode: 1, message: 'server error' });
  }
});

// ─── POST /api/wallet/zalopay/ipn ────────────────────────────────────────────

router.post('/zalopay/ipn', async (req, res) => {
  try {
    const { data, mac } = req.body;
    const { valid, payload } = zaloVerify(data, mac);

    if (!valid || !payload) {
      console.warn('[ZaloPay IPN] Chữ ký không hợp lệ');
      return res.json({ return_code: -1, return_message: 'invalid signature' });
    }

    let depositId;
    try { depositId = JSON.parse(payload.embed_data || '{}').deposit_id; } catch {}

    if (!depositId) {
      console.warn('[ZaloPay IPN] Thiếu deposit_id');
      return res.json({ return_code: -1, return_message: 'missing deposit_id' });
    }

    const result = await processConfirmedDeposit(depositId, `zalopay_${payload.zp_trans_id}`);
    console.log(result.ok
      ? `[ZaloPay IPN] ✅ ${payload.amount} VND deposit=${depositId}`
      : `[ZaloPay IPN] ⚠️ ${result.reason} deposit=${depositId}`
    );
    res.json({ return_code: 1, return_message: 'success' });
  } catch (err) {
    console.error('[ZaloPay IPN]', err);
    res.json({ return_code: 0, return_message: 'server error' });
  }
});

// ─── GET /api/wallet/expiry-info ─────────────────────────────────────────────
// Trả về danh sách lô MT khuyến mãi của user sắp hết hạn

router.get('/expiry-info', authMiddleware, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT id, source_type, amount_xu, remaining_xu, granted_at, expires_at,
             EXTRACT(DAY FROM (expires_at - NOW())) as days_left
      FROM xu_expiry_batches
      WHERE user_id = $1 AND status = 'active'
      ORDER BY expires_at ASC
      LIMIT 20
    `, [req.user.id]);

    const totalExpiring7d = rows
      .filter(r => parseFloat(r.days_left) <= 7)
      .reduce((s, r) => s + parseInt(r.remaining_xu), 0);

    res.json({ batches: rows, total_expiring_7d: totalExpiring7d });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/wallet/transactions ────────────────────────────────────────────

router.get('/transactions', authMiddleware, async (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit)  || 20, 50);
    const offset = parseInt(req.query.offset) || 0;
    const type   = req.query.type || null;
    const history = await LedgerService.getHistory(req.user.id, { limit, offset, type });
    res.json({ transactions: history, limit, offset });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi lấy lịch sử' });
  }
});

// ─── POST /api/wallet/tip ────────────────────────────────────────────────────

router.post('/tip', authMiddleware, async (req, res) => {
  try {
    const { receiver_id, amount_xu, message, ref_type, ref_id } = req.body;
    if (!receiver_id || !amount_xu || amount_xu < 1) {
      return res.status(400).json({ error: 'Thiếu receiver_id hoặc amount_xu' });
    }
    const result = await LedgerService.sendTip({
      senderId: req.user.id, receiverId: receiver_id,
      amountXu: parseInt(amount_xu), message,
      refType: ref_type, refId: ref_id,
    });
    await notify({
      userId: receiver_id,
      type: 'tip_received',
      title: '💝 Bạn nhận được tip!',
      body: `+${result.receiverAmount?.toLocaleString() || amount_xu} MT${message ? ` — "${message}"` : ''}`,
      metadata: { sender_id: req.user.id, amount: result.receiverAmount },
    });

    // SSE: cập nhật số dư realtime cho người nhận
    const receiverWallet = await LedgerService.getWallet(receiver_id);
    sendToUser(receiver_id, 'balance_update', { balance: parseInt(receiverWallet?.balance || 0) });
    sendToUser(receiver_id, 'tip_received', {
      amount: result.receiverAmount,
      senderName: req.user.username,
      message,
    });

    // SSE: broadcast gift feed cho tất cả user đang xem trang gifting
    broadcast('gift_feed', {
      senderName: req.user.username,
      amount: parseInt(amount_xu),
      receiverAmount: result.receiverAmount,
      message,
      time: new Date().toISOString(),
    });

    res.json({ success: true, tip: result.tip, receiver_amount: result.receiverAmount, platform_fee: result.platformFee });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// ─── POST /api/wallet/bonus (dev only) ───────────────────────────────────────

router.post('/bonus', authMiddleware, async (req, res) => {
  try {
    const { amount, description } = req.body;
    if (!amount || amount <= 0 || amount > 10000) {
      return res.status(400).json({ error: 'Số MT không hợp lệ (1–10,000)' });
    }
    const entry = await LedgerService.earnReward({
      userId: req.user.id, amount: parseInt(amount),
      type: 'earn_bonus',
      description: description || `+${amount} MT bonus (dev)`,
    });
    res.json({ success: true, xu_added: amount, entry });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi cộng MT bonus' });
  }
});

// ─── GET /api/wallet/leaderboard — bảng xếp hạng ────────────────────────────
router.get('/leaderboard', authMiddleware, async (req, res) => {
  try {
    const period = req.query.period || 'alltime'; // 'alltime' | 'month' | 'week'
    const limit  = Math.min(parseInt(req.query.limit) || 20, 50);

    let rows;

    if (period === 'alltime') {
      ({ rows } = await query(`
        SELECT u.id, u.username, u.role, u.avatar_url,
               w.total_earned AS xu_earned,
               w.balance      AS xu_balance,
               RANK() OVER (ORDER BY w.total_earned DESC) AS rank
        FROM wallets w
        JOIN users u ON u.id = w.user_id
        WHERE u.banned_at IS NULL
        ORDER BY w.total_earned DESC
        LIMIT $1
      `, [limit]));
    } else {
      const interval = period === 'week' ? '7 days' : '30 days';
      ({ rows } = await query(`
        SELECT u.id, u.username, u.role, u.avatar_url,
               COALESCE(SUM(le.amount) FILTER (WHERE le.amount > 0), 0)::bigint AS xu_earned,
               w.balance AS xu_balance,
               RANK() OVER (ORDER BY COALESCE(SUM(le.amount) FILTER (WHERE le.amount > 0), 0) DESC) AS rank
        FROM users u
        JOIN wallets w ON w.user_id = u.id
        LEFT JOIN ledger_entries le
          ON le.user_id = u.id
          AND le.created_at >= NOW() - INTERVAL '${interval}'
          AND le.amount > 0
        WHERE u.banned_at IS NULL
        GROUP BY u.id, u.username, u.role, u.avatar_url, w.balance
        ORDER BY xu_earned DESC
        LIMIT $1
      `, [limit]));
    }

    // Vị trí của người dùng hiện tại
    let myRank = null;
    if (period === 'alltime') {
      const { rows: [me] } = await query(`
        SELECT RANK() OVER (ORDER BY w.total_earned DESC) AS rank,
               w.total_earned AS xu_earned
        FROM wallets w
        JOIN users u ON u.id = w.user_id
        WHERE u.id = $1 AND u.banned_at IS NULL
      `, [req.user.id]);
      myRank = me || null;
    }

    res.json({ entries: rows, myRank, period });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── GET /api/wallet/search-creators ─────────────────────────────────────────
// Tìm creator/user theo username để gửi tip

router.get('/search-creators', authMiddleware, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q || q.length < 2) return res.json([]);
    const { rows } = await query(`
      SELECT u.id, u.username, u.avatar_url, u.role,
             COALESCE(w.total_earned, 0) AS total_earned
      FROM users u
      LEFT JOIN wallets w ON w.user_id = u.id
      WHERE (u.username ILIKE $1 OR u.email ILIKE $1)
        AND u.id != $2
        AND u.role IN ('creator', 'user')
      ORDER BY u.role = 'creator' DESC, u.username ASC
      LIMIT 10
    `, [`%${q}%`, req.user.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
