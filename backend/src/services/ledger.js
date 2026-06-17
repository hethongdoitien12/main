import { query, getClient } from '../db/pool.js';
import { v4 as uuidv4 } from 'uuid';

// ─── Dynamic config (load từ DB, cache 5 phút) ────────────────────────────────
const DEFAULTS = {
  VND_PER_XU: 1,
  DEPOSIT_FEE_PCT: 0,
  WITHDRAWAL_FEE_PCT: 0.10,
  TIP_PLATFORM_FEE_PCT: 0.05,
  XU_FREE_EXPIRE_DAYS: 90,
  MIN_WITHDRAWAL_XU: 50000,
  KYC_THRESHOLD_XU: 1000000,
};

let _configCache = null;
let _configCacheAt = 0;
const CONFIG_TTL_MS = 5 * 60 * 1000;

export async function getConfig() {
  if (_configCache && Date.now() - _configCacheAt < CONFIG_TTL_MS) return _configCache;
  try {
    const { rows } = await query('SELECT key, value FROM platform_config');
    const cfg = { ...DEFAULTS };
    for (const { key, value } of rows) {
      if (key in cfg) cfg[key] = isNaN(value) ? value : Number(value);
    }
    _configCache = cfg;
    _configCacheAt = Date.now();
    return cfg;
  } catch {
    return DEFAULTS;
  }
}

export function clearConfigCache() {
  _configCache = null;
  _configCacheAt = 0;
}

// Legacy sync CONFIG (dùng cho code cũ không await)
const CONFIG = DEFAULTS;

export const LedgerService = {
  // Get wallet balance
  async getWallet(userId) {
    const { rows } = await query(
      'SELECT * FROM wallets WHERE user_id = $1',
      [userId]
    );
    return rows[0] || null;
  },

  // Create wallet for new user
  async createWallet(userId) {
    const { rows } = await query(
      'INSERT INTO wallets (user_id) VALUES ($1) RETURNING *',
      [userId]
    );
    return rows[0];
  },

  // Core: atomic debit/credit via stored procedure
  async transact({ userId, amount, type, idempotencyKey, referenceId, referenceType, description, metadata }) {
    const key = idempotencyKey || `${type}:${userId}:${uuidv4()}`;
    const { rows } = await query(
      `SELECT * FROM update_wallet_balance($1,$2,$3,$4,$5,$6,$7,$8)`,
      [userId, amount, type, key, referenceId || null, referenceType || null, description || null, metadata || {}]
    );
    return rows[0];
  },

  // ─── DEPOSIT (nạp tiền) ───────────────────────────────────────────────
  async deposit({ userId, amountVnd, paymentMethod, paymentRef, metadata }) {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const amountXu = Math.floor(amountVnd * CONFIG.VND_PER_XU);

      // Create deposit request
      const { rows: [deposit] } = await client.query(
        `INSERT INTO deposit_requests (user_id, amount_vnd, amount_xu, payment_method, payment_ref, status, metadata)
         VALUES ($1,$2,$3,$4,$5,'completed',$6) RETURNING *`,
        [userId, amountVnd, amountXu, paymentMethod, paymentRef, metadata || {}]
      );

      // Credit wallet
      const entry = await LedgerService.transact({
        userId, amount: amountXu, type: 'deposit',
        idempotencyKey: `deposit:${deposit.id}`,
        referenceId: deposit.id, referenceType: 'deposit_request',
        description: `Nạp ${amountVnd.toLocaleString('vi-VN')}đ → ${amountXu.toLocaleString()} MT`,
        metadata: { amountVnd, paymentMethod }
      });

      await client.query('COMMIT');
      return { deposit, entry };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  // ─── WITHDRAWAL (rút tiền) ────────────────────────────────────────────
  async withdraw({ userId, amountXu, bankName, bankAccount, accountName }) {
    const cfg = await getConfig();
    const feeXu = Math.floor(amountXu * cfg.WITHDRAWAL_FEE_PCT);
    const netXu = amountXu - feeXu;
    const amountVnd = Math.floor(netXu / cfg.VND_PER_XU);

    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Create withdrawal request (pending)
      const { rows: [withdrawal] } = await client.query(
        `INSERT INTO withdrawal_requests (user_id, amount_xu, amount_vnd, fee_xu, bank_name, bank_account, account_name)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [userId, amountXu, amountVnd, feeXu, bankName, bankAccount, accountName]
      );

      // Debit wallet immediately (lock funds)
      await LedgerService.transact({
        userId, amount: -amountXu, type: 'withdrawal',
        idempotencyKey: `withdrawal:${withdrawal.id}`,
        referenceId: withdrawal.id, referenceType: 'withdrawal_request',
        description: `Rút ${amountXu.toLocaleString()} MT → ${amountVnd.toLocaleString('vi-VN')}đ (phí: ${feeXu} MT)`,
        metadata: { feeXu, amountVnd, bankName }
      });

      await client.query('COMMIT');
      return { withdrawal, feeXu, amountVnd };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  // ─── EARN (kiếm MT) ──────────────────────────────────────────────────
  async earnReward({ userId, amount, type, questId, description }) {
    return LedgerService.transact({
      userId, amount, type,
      idempotencyKey: `${type}:${userId}:${questId || uuidv4()}`,
      referenceId: questId, referenceType: questId ? 'quest' : null,
      description: description || `Nhận thưởng ${amount} MT`,
    });
  },

  // ─── SPEND (tiêu MT) ─────────────────────────────────────────────────
  async spend({ userId, amount, type, itemId, itemType, description }) {
    return LedgerService.transact({
      userId, amount: -amount, type,
      idempotencyKey: `${type}:${userId}:${itemId || uuidv4()}`,
      referenceId: itemId, referenceType: itemType,
      description: description || `Chi ${amount} MT`,
    });
  },

  // ─── TIP ──────────────────────────────────────────────────────────────
  async sendTip({ senderId, receiverId, amountXu, message, refType, refId }) {
    const cfg = await getConfig();
    const platformFee = Math.floor(amountXu * cfg.TIP_PLATFORM_FEE_PCT);
    const receiverAmount = amountXu - platformFee;
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const { rows: [tip] } = await client.query(
        `INSERT INTO tips (sender_id, receiver_id, amount_xu, platform_fee, message, reference_type, reference_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [senderId, receiverId, amountXu, platformFee, message, refType, refId]
      );

      // Debit sender
      await LedgerService.transact({
        userId: senderId, amount: -amountXu, type: 'tip_sent',
        idempotencyKey: `tip_sent:${tip.id}`,
        referenceId: tip.id, referenceType: 'tip',
        description: `Tip ${amountXu} MT`, metadata: { receiverId, platformFee }
      });

      // Credit receiver (minus platform fee)
      await LedgerService.transact({
        userId: receiverId, amount: receiverAmount, type: 'tip_received',
        idempotencyKey: `tip_received:${tip.id}`,
        referenceId: tip.id, referenceType: 'tip',
        description: `Nhận tip ${receiverAmount} MT`, metadata: { senderId, platformFee }
      });

      await client.query('COMMIT');
      return { tip, receiverAmount, platformFee };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  // ─── HISTORY ─────────────────────────────────────────────────────────
  async getHistory(userId, { limit = 20, offset = 0, type } = {}) {
    let q = `SELECT * FROM ledger_entries WHERE user_id = $1`;
    const params = [userId];
    if (type) { params.push(type); q += ` AND type = $${params.length}`; }
    q += ` ORDER BY created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`;
    params.push(limit, offset);
    const { rows } = await query(q, params);
    return rows;
  },

  // ─── CLAIM QUEST ──────────────────────────────────────────────────────
  async claimQuest(userId, questId) {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Check quest status
      const { rows: [uq] } = await client.query(
        `SELECT uq.*, q.reward_xu, q.title FROM user_quests uq
         JOIN quests q ON q.id = uq.quest_id
         WHERE uq.user_id=$1 AND uq.quest_id=$2 AND uq.status='completed'`,
        [userId, questId]
      );
      if (!uq) throw new Error('Quest không tồn tại hoặc chưa hoàn thành');

      // Mark as claimed
      await client.query(
        `UPDATE user_quests SET status='claimed', claimed_at=NOW() WHERE user_id=$1 AND quest_id=$2`,
        [userId, questId]
      );

      // Award MT
      const entry = await LedgerService.transact({
        userId, amount: uq.reward_xu, type: 'earn_quest',
        idempotencyKey: `quest_claim:${userId}:${questId}`,
        referenceId: questId, referenceType: 'quest',
        description: `Hoàn thành quest: ${uq.title} (+${uq.reward_xu} MT)`
      });

      // Ghi vào expiry batch — MT quest expire sau 90 ngày
      await client.query(
        `INSERT INTO xu_expiry_batches
           (user_id, source_entry_id, source_type, amount_xu, remaining_xu, expires_at)
         VALUES ($1, $2, 'quest', $3, $3, NOW() + INTERVAL '90 days')
         ON CONFLICT DO NOTHING`,
        [userId, entry?.id, uq.reward_xu]
      );

      await client.query('COMMIT');
      return { entry, rewardXu: uq.reward_xu };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  // ─── PLATFORM STATS ───────────────────────────────────────────────────
  async getPlatformStats() {
    const { rows: [stats] } = await query(`
      SELECT
        COUNT(DISTINCT u.id) as total_users,
        COALESCE(SUM(w.balance),0) as total_xu_circulating,
        COALESCE(SUM(CASE WHEN l.type='deposit' THEN l.amount ELSE 0 END),0) as total_deposited,
        COALESCE(SUM(CASE WHEN l.amount < 0 AND l.type NOT IN ('withdrawal','tip_sent') THEN ABS(l.amount) ELSE 0 END),0) as total_spent,
        COUNT(l.id) as transaction_count
      FROM users u
      LEFT JOIN wallets w ON w.user_id = u.id
      LEFT JOIN ledger_entries l ON l.user_id = u.id
    `);
    return stats;
  }
};

export default LedgerService;
