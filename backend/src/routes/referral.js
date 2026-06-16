import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { query, getClient } from '../db/pool.js';
import { notify } from '../services/notifier.js';

const router = Router();
router.use(authMiddleware);

// Config phần thưởng
const REWARD_REFERRER = 200;  // người mời nhận 200 XU
const REWARD_INVITEE  = 500;  // người được mời nhận 500 XU

// ─── helper: tạo code ngẫu nhiên 8 ký tự ────────────────────────────────────

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function ensureCode(userId) {
  const { rows: [u] } = await query('SELECT referral_code FROM users WHERE id=$1', [userId]);
  if (u.referral_code) return u.referral_code;
  let code, tries = 0;
  while (tries < 10) {
    code = genCode();
    const { rowCount } = await query(
      'UPDATE users SET referral_code=$1 WHERE id=$2 AND referral_code IS NULL',
      [code, userId]
    );
    if (rowCount > 0) return code;
    tries++;
  }
  throw new Error('Không thể tạo mã giới thiệu');
}

// ─── GET /api/referral/my-code ───────────────────────────────────────────────

router.get('/my-code', async (req, res) => {
  try {
    const code = await ensureCode(req.user.id);

    // Thống kê: số người đã dùng code + tổng XU đã nhận
    const { rows: [stats] } = await query(`
      SELECT
        COUNT(u.id)::int                       AS total_referred,
        COALESCE(SUM(le.amount), 0)::bigint    AS total_xu_earned
      FROM users u
      LEFT JOIN ledger_entries le
        ON le.user_id = $1 AND le.type = 'earn_referral'
      WHERE u.referred_by = $1
    `, [req.user.id]);

    // Danh sách người đã dùng code — kèm chi tiết
    const { rows: referrals } = await query(`
      SELECT
        u.username, u.role, u.created_at,
        u.banned_at IS NOT NULL                     AS is_banned,
        COALESCE(w.total_earned, 0)::bigint          AS invitee_total_earned,
        COALESCE(w.balance, 0)::bigint               AS invitee_balance,
        (
          SELECT COALESCE(SUM(le.amount), 0)::bigint
          FROM ledger_entries le
          WHERE le.user_id = $1
            AND le.type = 'earn_referral'
            AND le.metadata->>'invitee' IS NOT NULL
            AND (le.idempotency_key LIKE 'referral_referrer:' || u.id::text || ':%'
              OR le.description LIKE '%' || u.username || '%')
        )                                            AS xu_from_this_referral
      FROM users u
      LEFT JOIN wallets w ON w.user_id = u.id
      WHERE u.referred_by = $1
      ORDER BY u.created_at DESC
      LIMIT 50
    `, [req.user.id]);

    // XU từng referral = REWARD_REFERRER (cố định), fallback nếu query phức tạp
    const referralsWithXu = referrals.map(r => ({
      ...r,
      xu_from_this_referral: Number(r.xu_from_this_referral) || REWARD_REFERRER,
    }));

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5000';
    res.json({
      code,
      invite_link: `${baseUrl}/register?ref=${code}`,
      reward_referrer: REWARD_REFERRER,
      reward_invitee:  REWARD_INVITEE,
      stats,
      referrals: referralsWithXu,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/referral/use ──────────────────────────────────────────────────
// User dùng code của người khác — chỉ dùng được 1 lần, không tự dùng code mình

router.post('/use', async (req, res) => {
  const { code } = req.body;
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Thiếu mã giới thiệu' });
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Kiểm tra user hiện tại
    const { rows: [me] } = await client.query(
      'SELECT referred_by, referral_reward_claimed FROM users WHERE id=$1 FOR UPDATE',
      [req.user.id]
    );
    if (me.referred_by || me.referral_reward_claimed) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Bạn đã sử dụng mã giới thiệu rồi' });
    }

    // Tìm người sở hữu code
    const { rows: [referrer] } = await client.query(
      'SELECT id, username FROM users WHERE referral_code = $1',
      [code.toUpperCase().trim()]
    );
    if (!referrer) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Mã giới thiệu không tồn tại' });
    }
    if (referrer.id === req.user.id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Không thể dùng mã của chính mình' });
    }

    // Ghi referred_by
    await client.query(
      'UPDATE users SET referred_by=$1, referral_reward_claimed=true WHERE id=$2',
      [referrer.id, req.user.id]
    );

    // Thưởng người được mời (REWARD_INVITEE XU)
    await client.query(
      `SELECT * FROM update_wallet_balance($1,$2,$3,$4,$5,$6,$7,$8)`,
      [req.user.id, REWARD_INVITEE, 'earn_referral',
       `referral_invitee:${req.user.id}:${referrer.id}`,
       null, 'referral', `Thưởng giới thiệu: được ${referrer.username} mời`, {}]
    );
    // Thêm vào expiry batch (90 ngày)
    await client.query(`
      INSERT INTO xu_expiry_batches
        (user_id, source_type, amount_xu, remaining_xu, expires_at)
      VALUES ($1, 'referral', $2, $2, NOW() + INTERVAL '90 days')
    `, [req.user.id, REWARD_INVITEE]);

    // Thưởng người mời (REWARD_REFERRER XU)
    await client.query(
      `SELECT * FROM update_wallet_balance($1,$2,$3,$4,$5,$6,$7,$8)`,
      [referrer.id, REWARD_REFERRER, 'earn_referral',
       `referral_referrer:${req.user.id}:${referrer.id}`,
       null, 'referral', `Thưởng giới thiệu: ${req.user.username} đã dùng mã của bạn`, {}]
    );
    await client.query(`
      INSERT INTO xu_expiry_batches
        (user_id, source_type, amount_xu, remaining_xu, expires_at)
      VALUES ($1, 'referral', $2, $2, NOW() + INTERVAL '90 days')
    `, [referrer.id, REWARD_REFERRER]);

    await client.query('COMMIT');

    // Notify cả hai
    await notify({
      userId: req.user.id,
      type: 'system',
      title: '🎉 Mã giới thiệu đã được áp dụng!',
      body: `+${REWARD_INVITEE.toLocaleString()} XU đã vào ví. Cảm ơn bạn đã tham gia qua lời mời của ${referrer.username}!`,
    });
    await notify({
      userId: referrer.id,
      type: 'system',
      title: '🤝 Bạn có người được giới thiệu mới!',
      body: `${req.user.username} vừa dùng mã của bạn. +${REWARD_REFERRER.toLocaleString()} XU đã vào ví!`,
      metadata: { invitee: req.user.username },
    });

    res.json({
      success: true,
      reward_xu: REWARD_INVITEE,
      referrer: referrer.username,
      message: `Nhận thành công! +${REWARD_INVITEE.toLocaleString()} XU đã vào ví của bạn.`,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Referral]', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

export default router;
