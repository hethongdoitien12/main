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

// ─── GET /api/wallet/creators — tìm kiếm creator ────────────────────────────
router.get('/creators', authMiddleware, async (req, res) => {
  try {
    const search = (req.query.search || '').trim();
    const limit  = Math.min(parseInt(req.query.limit) || 20, 50);

    const { rows } = await query(`
      SELECT u.id, u.username, u.avatar_url, u.role,
             COALESCE(w.total_earned, 0)::bigint AS total_earned
      FROM users u
      LEFT JOIN wallets w ON w.user_id = u.id
      WHERE u.banned_at IS NULL
        AND u.role IN ('creator', 'admin')
        AND ($1 = '' OR u.username ILIKE '%' || $1 || '%')
      ORDER BY w.total_earned DESC NULLS LAST
      LIMIT $2
    `, [search, limit]);

    res.json({ creators: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi tìm creator' });
  }
});

// ─── GET /api/wallet/top-creators — top creator theo tips nhận được ───────────
router.get('/top-creators', authMiddleware, async (req, res) => {
  try {
    const search = (req.query.search || '').trim();
    const limit  = Math.min(parseInt(req.query.limit) || 30, 100);
    const offset = parseInt(req.query.offset) || 0;

    const { rows } = await query(`
      SELECT
        u.id, u.username, u.avatar_url, u.role,
        COALESCE(SUM(t.amount_xu), 0)::bigint         AS total_tips_received,
        COUNT(t.id)::int                               AS tip_count,
        COUNT(DISTINCT t.sender_id)::int               AS supporter_count,
        COALESCE(w.balance, 0)::bigint                 AS balance,
        RANK() OVER (ORDER BY COALESCE(SUM(t.amount_xu),0) DESC) AS rank
      FROM users u
      LEFT JOIN wallets w ON w.user_id = u.id
      LEFT JOIN tips t    ON t.receiver_id = u.id
      WHERE u.banned_at IS NULL
        AND u.role IN ('creator', 'admin')
        AND ($1 = '' OR u.username ILIKE '%' || $1 || '%')
      GROUP BY u.id, u.username, u.avatar_url, u.role, w.balance
      ORDER BY total_tips_received DESC
      LIMIT $2 OFFSET $3
    `, [search, limit, offset]);

    res.json({ creators: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi tải top creators' });
  }
});

// ─── GET /api/wallet/recent-gifts — lịch sử gift gần đây ─────────────────────
router.get('/recent-gifts', authMiddleware, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 15, 30);
    const { rows } = await query(`
      SELECT t.amount_xu AS amount, t.message, t.created_at AS time,
             s.username AS sender_name, r.username AS receiver_name
      FROM tips t
      JOIN users s ON s.id = t.sender_id
      JOIN users r ON r.id = t.receiver_id
      ORDER BY t.created_at DESC
      LIMIT $1
    `, [limit]);
    res.json({ gifts: rows.reverse() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi lấy gift feed' });
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

// ─── GET /api/wallet/deposits ────────────────────────────────────────────────
// Lịch sử nạp tiền của user

router.get('/deposits', authMiddleware, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const { rows } = await query(`
      SELECT id, amount_vnd, amount_xu, payment_method, status, payment_ref, created_at, updated_at
      FROM deposit_requests
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [req.user.id, limit]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── POST /api/wallet/transfer ───────────────────────────────────────────────
// Chuyển MT trực tiếp cho user khác (0% phí)

router.post('/transfer', authMiddleware, async (req, res) => {
  const client = await getClient();
  try {
    const { receiver_id, amount_xu, note } = req.body;
    if (!receiver_id || !amount_xu || amount_xu < 1) {
      return res.status(400).json({ error: 'Thiếu receiver_id hoặc amount_xu' });
    }
    if (receiver_id === req.user.id) {
      return res.status(400).json({ error: 'Không thể chuyển MT cho chính mình' });
    }
    const amt = parseInt(amount_xu);
    if (amt < 1) return res.status(400).json({ error: 'Số MT phải lớn hơn 0' });

    const { rows: [receiver] } = await query(
      `SELECT id, username FROM users WHERE id = $1 AND banned_at IS NULL`, [receiver_id]
    );
    if (!receiver) return res.status(404).json({ error: 'Người nhận không tồn tại' });

    const { rows: [senderWallet] } = await query(
      `SELECT balance FROM wallets WHERE user_id = $1`, [req.user.id]
    );
    if (!senderWallet || parseInt(senderWallet.balance) < amt) {
      return res.status(400).json({ error: 'Số dư không đủ' });
    }

    const ts = Date.now();
    await client.query('BEGIN');

    // Trừ người gửi
    await client.query(`SELECT * FROM update_wallet_balance($1,$2,$3,$4,$5,$6,$7,$8)`, [
      req.user.id, -amt, 'transfer_sent',
      `transfer:${req.user.id}:${receiver_id}:${ts}`,
      null, 'transfer',
      `Chuyển ${amt.toLocaleString()} MT cho ${receiver.username}${note ? ` — ${note}` : ''}`,
      JSON.stringify({ receiver_id, receiver_username: receiver.username, note }),
    ]);

    // Cộng người nhận
    await client.query(`SELECT * FROM update_wallet_balance($1,$2,$3,$4,$5,$6,$7,$8)`, [
      receiver_id, amt, 'transfer_received',
      `transfer_recv:${req.user.id}:${receiver_id}:${ts}`,
      null, 'transfer',
      `Nhận ${amt.toLocaleString()} MT từ ${req.user.username || req.user.id}${note ? ` — ${note}` : ''}`,
      JSON.stringify({ sender_id: req.user.id, note }),
    ]);

    await client.query('COMMIT');

    await notify({
      userId: receiver_id,
      type: 'transfer_received',
      title: '💸 Bạn nhận được MT!',
      body: `+${amt.toLocaleString()} MT từ ${req.user.username || 'người dùng'}${note ? ` — "${note}"` : ''}`,
      metadata: { sender_id: req.user.id, amount: amt },
    });

    // SSE realtime
    const receiverWallet = await LedgerService.getWallet(receiver_id);
    sendToUser(receiver_id, 'balance_update', { balance: parseInt(receiverWallet?.balance || 0) });

    res.json({ ok: true, receiver_username: receiver.username, amount_xu: amt });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ─── GET /api/wallet/chart ────────────────────────────────────────────────────
// Dữ liệu biểu đồ 7 ngày gần nhất (thu/chi theo ngày)

router.get('/chart', authMiddleware, async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 7, 30);
    const { rows } = await query(`
      SELECT
        (created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS day,
        COALESCE(SUM(amount) FILTER (WHERE amount > 0), 0)::bigint   AS earned,
        ABS(COALESCE(SUM(amount) FILTER (WHERE amount < 0 AND type != 'withdrawal'), 0))::bigint AS spent
      FROM ledger_entries
      WHERE user_id = $1
        AND created_at >= NOW() - ($2 || ' days')::interval
      GROUP BY 1
      ORDER BY 1 ASC
    `, [req.user.id, days]);

    // Điền các ngày không có giao dịch với 0
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const found = rows.find(r => r.day?.toString().slice(0, 10) === dateStr);
      result.push({ day: dateStr, earned: parseInt(found?.earned || 0), spent: parseInt(found?.spent || 0) });
    }
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── GET /api/wallet/export-csv ──────────────────────────────────────────────
// Xuất lịch sử giao dịch dạng CSV (hỗ trợ token query param)

router.get('/export-csv', authMiddleware, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 500, 1000);
    const { rows } = await query(`
      SELECT type, amount, balance_before, balance_after, description, created_at
      FROM ledger_entries
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [req.user.id, limit]);

    const headers = ['Loại', 'Số MT', 'Số dư trước', 'Số dư sau', 'Mô tả', 'Thời gian'];
    const csvRows = rows.map(r => [
      r.type,
      r.amount,
      r.balance_before,
      r.balance_after,
      `"${(r.description || '').replace(/"/g, '""')}"`,
      new Date(r.created_at).toLocaleString('vi-VN'),
    ].join(','));

    const csv = [headers.join(','), ...csvRows].join('\n');
    const filename = `mt-transactions-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv); // BOM for Excel
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── POST /api/wallet/redeem ─────────────────────────────────────────────────
// Nhập mã quà tặng để nhận MT

router.post('/redeem', authMiddleware, async (req, res) => {
  const client = await getClient();
  try {
    const { code } = req.body;
    if (!code?.trim()) return res.status(400).json({ error: 'Vui lòng nhập mã quà tặng' });

    await client.query('BEGIN');

    // Lock row
    const { rows: [gc] } = await client.query(
      `SELECT * FROM gift_codes WHERE UPPER(code) = UPPER($1) FOR UPDATE`, [code.trim()]
    );
    if (!gc) return res.status(404).json({ error: 'Mã không tồn tại hoặc đã hết hiệu lực' });
    if (gc.expires_at && new Date() > new Date(gc.expires_at)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Mã đã hết hạn sử dụng' });
    }
    if (gc.uses >= gc.max_uses) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Mã đã được dùng hết lượt' });
    }

    // Kiểm tra user đã dùng chưa
    const { rows: [alreadyUsed] } = await client.query(
      `SELECT id FROM gift_code_redemptions WHERE code_id=$1 AND user_id=$2`, [gc.id, req.user.id]
    );
    if (alreadyUsed) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Bạn đã sử dụng mã này rồi' });
    }

    // Tăng lượt dùng
    await client.query(`UPDATE gift_codes SET uses = uses + 1 WHERE id = $1`, [gc.id]);

    // Ghi redemption
    await client.query(
      `INSERT INTO gift_code_redemptions (code_id, user_id) VALUES ($1, $2)`, [gc.id, req.user.id]
    );

    // Cộng MT
    await client.query(`SELECT * FROM update_wallet_balance($1,$2,$3,$4,$5,$6,$7,$8)`, [
      req.user.id, gc.amount_xu, 'gift_redeem',
      `gift:${gc.id}:${req.user.id}`,
      gc.id, 'gift_code',
      `Nhận quà từ mã ${gc.code.toUpperCase()}${gc.note ? ` — ${gc.note}` : ''}`,
      JSON.stringify({ code: gc.code, note: gc.note }),
    ]);

    await client.query('COMMIT');
    res.json({ ok: true, amount_xu: gc.amount_xu, code: gc.code.toUpperCase(), note: gc.note });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
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
