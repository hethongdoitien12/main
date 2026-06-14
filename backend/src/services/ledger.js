import { query, getClient } from '../db/pool.js';
import { v4 as uuidv4 } from 'uuid';

// XU exchange rate config
const CONFIG = {
  VND_PER_XU: 1,           // 1 VNĐ = 1 XU
  DEPOSIT_FEE_PCT: 0,       // no deposit fee
  WITHDRAWAL_FEE_PCT: 0.10, // 10% rút ra
  TIP_PLATFORM_FEE_PCT: 0.05, // 5% platform fee on tips
  XU_FREE_EXPIRE_DAYS: 90,  // XU miễn phí expire sau 90 ngày
};

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
        description: `Nạp ${amountVnd.toLocaleString('vi-VN')}đ → ${amountXu.toLocaleString()} XU`,
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
    const feeXu = Math.floor(amountXu * CONFIG.WITHDRAWAL_FEE_PCT);
    const netXu = amountXu - feeXu;
    const amountVnd = Math.floor(netXu / CONFIG.VND_PER_XU);

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
        description: `Rút ${amountXu.toLocaleString()} XU → ${amountVnd.toLocaleString('vi-VN')}đ (phí: ${feeXu} XU)`,
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

  // ─── EARN (kiếm XU) ──────────────────────────────────────────────────
  async earnReward({ userId, amount, type, questId, description }) {
    return LedgerService.transact({
      userId, amount, type,
      idempotencyKey: `${type}:${userId}:${questId || uuidv4()}`,
      referenceId: questId, referenceType: questId ? 'quest' : null,
      description: description || `Nhận thưởng ${amount} XU`,
    });
  },

  // ─── SPEND (tiêu XU) ─────────────────────────────────────────────────
  async spend({ userId, amount, type, itemId, itemType, description }) {
    return LedgerService.transact({
      userId, amount: -amount, type,
      idempotencyKey: `${type}:${userId}:${itemId || uuidv4()}`,
      referenceId: itemId, referenceType: itemType,
      description: description || `Chi ${amount} XU`,
    });
  },

  // ─── TIP ──────────────────────────────────────────────────────────────
  async sendTip({ senderId, receiverId, amountXu, message, refType, refId }) {
    const platformFee = Math.floor(amountXu * CONFIG.TIP_PLATFORM_FEE_PCT);
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
        description: `Tip ${amountXu} XU`, metadata: { receiverId, platformFee }
      });

      // Credit receiver (minus platform fee)
      await LedgerService.transact({
        userId: receiverId, amount: receiverAmount, type: 'tip_received',
        idempotencyKey: `tip_received:${tip.id}`,
        referenceId: tip.id, referenceType: 'tip',
        description: `Nhận tip ${receiverAmount} XU`, metadata: { senderId, platformFee }
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

      // Award XU
      const entry = await LedgerService.transact({
        userId, amount: uq.reward_xu, type: 'earn_quest',
        idempotencyKey: `quest_claim:${userId}:${questId}`,
        referenceId: questId, referenceType: 'quest',
        description: `Hoàn thành quest: ${uq.title} (+${uq.reward_xu} XU)`
      });

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
