/**
 * Cron Service — MT Economy
 * Hai job chạy định kỳ:
 * 1. expirePromotionalXu  — chạy lúc 1:00 sáng hằng ngày
 * 2. cleanupPendingDeposits — chạy mỗi 30 phút
 */

import cron from 'node-cron';
import { query, getClient } from '../db/pool.js';
import { notify } from './notifier.js';

// ─── Job 1: Expire MT khuyến mãi ─────────────────────────────────────────────

export async function expirePromotionalXu() {
  console.log('[Cron] 🕐 Bắt đầu kiểm tra MT hết hạn...');
  let expiredCount = 0;
  let affectedUsers = 0;

  try {
    // Tìm tất cả batch đang active đã quá hạn
    const { rows: batches } = await query(`
      SELECT xb.*, w.balance as current_balance
      FROM xu_expiry_batches xb
      JOIN wallets w ON w.user_id = xb.user_id
      WHERE xb.status = 'active'
        AND xb.expires_at <= NOW()
        AND xb.remaining_xu > 0
      ORDER BY xb.expires_at ASC
      LIMIT 200
    `);

    if (batches.length === 0) {
      console.log('[Cron] ✅ Không có MT nào hết hạn hôm nay');
      return { expiredCount: 0, affectedUsers: 0 };
    }

    console.log(`[Cron] Tìm thấy ${batches.length} lô MT hết hạn`);

    // Gộp theo user để notify 1 lần duy nhất
    const byUser = {};
    for (const b of batches) {
      if (!byUser[b.user_id]) byUser[b.user_id] = { batches: [], totalExpire: 0, balance: b.current_balance };
      byUser[b.user_id].batches.push(b);
      byUser[b.user_id].totalExpire += parseInt(b.remaining_xu);
    }

    for (const [userId, { batches: userBatches, totalExpire, balance }] of Object.entries(byUser)) {
      const client = await getClient();
      try {
        await client.query('BEGIN');

        // Không cho balance âm — chỉ expire tới mức balance hiện tại
        const actualExpire = Math.min(totalExpire, parseInt(balance));
        if (actualExpire <= 0) {
          // Đánh dấu expired nhưng không trừ gì
          for (const b of userBatches) {
            await client.query(
              `UPDATE xu_expiry_batches SET status='expired', remaining_xu=0, expired_at=NOW() WHERE id=$1`,
              [b.id]
            );
          }
          await client.query('COMMIT');
          continue;
        }

        // Tạo ledger entry kiểu 'expire'
        const idKey = `expire:${userId}:${new Date().toISOString().split('T')[0]}`;
        const { rows: [entry] } = await client.query(
          `SELECT * FROM update_wallet_balance($1,$2,$3,$4,$5,$6,$7,$8)`,
          [userId, -actualExpire, 'expire', idKey, null, 'xu_expiry', `Hết hạn ${actualExpire.toLocaleString()} MT khuyến mãi`, {}]
        );

        // Cập nhật trạng thái các batch
        let left = actualExpire;
        for (const b of userBatches) {
          const deduct = Math.min(left, parseInt(b.remaining_xu));
          const newRemaining = parseInt(b.remaining_xu) - deduct;
          await client.query(
            `UPDATE xu_expiry_batches
             SET remaining_xu=$2, status=$3, expired_at=NOW(), expire_entry_id=$4
             WHERE id=$1`,
            [b.id, newRemaining, newRemaining === 0 ? 'expired' : 'expired', entry?.id]
          );
          left -= deduct;
          if (left <= 0) break;
        }

        await client.query('COMMIT');

        // Notify user
        await notify({
          userId,
          type: 'system',
          title: '⏰ MT khuyến mãi đã hết hạn',
          body: `${actualExpire.toLocaleString()} MT khuyến mãi đã hết hạn và bị thu hồi. MT từ nạp tiền không bị ảnh hưởng.`,
          metadata: { expired_amount: actualExpire, batches_count: userBatches.length },
        });

        expiredCount += actualExpire;
        affectedUsers++;
        console.log(`[Cron] 📉 User ${userId}: -${actualExpire} MT hết hạn`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[Cron] Lỗi expire user ${userId}:`, err.message);
      } finally {
        client.release();
      }
    }

    console.log(`[Cron] ✅ Xong expire MT — ${expiredCount} MT / ${affectedUsers} user bị ảnh hưởng`);
    return { expiredCount, affectedUsers };
  } catch (err) {
    console.error('[Cron] Lỗi expirePromotionalXu:', err.message);
    return { expiredCount: 0, affectedUsers: 0, error: err.message };
  }
}

// ─── Job 2: Dọn deposit pending quá hạn ──────────────────────────────────────

export async function cleanupPendingDeposits() {
  try {
    const { rowCount } = await query(`
      UPDATE deposit_requests
      SET status = 'failed', updated_at = NOW()
      WHERE status = 'pending'
        AND created_at < NOW() - INTERVAL '30 minutes'
    `);
    if (rowCount > 0) {
      console.log(`[Cron] 🧹 Đã hủy ${rowCount} deposit pending quá 30 phút`);
    }
    return { cleaned: rowCount };
  } catch (err) {
    console.error('[Cron] Lỗi cleanupPendingDeposits:', err.message);
    return { cleaned: 0, error: err.message };
  }
}

// ─── Khởi động tất cả cron jobs ──────────────────────────────────────────────

export function startCronJobs() {
  // Expire MT: chạy lúc 01:00 sáng mỗi ngày
  cron.schedule('0 1 * * *', async () => {
    console.log('\n[Cron] ⏰ 01:00 — Chạy job expirePromotionalXu');
    await expirePromotionalXu();
  }, { timezone: 'Asia/Ho_Chi_Minh' });

  // Dọn deposit: chạy mỗi 30 phút
  cron.schedule('*/30 * * * *', async () => {
    console.log('[Cron] 🧹 Chạy job cleanupPendingDeposits');
    await cleanupPendingDeposits();
  });

  console.log('[Cron] ✅ Đã đăng ký 2 cron jobs:');
  console.log('       - expirePromotionalXu: 01:00 hằng ngày (GMT+7)');
  console.log('       - cleanupPendingDeposits: mỗi 30 phút');
}
