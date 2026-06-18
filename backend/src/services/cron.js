/**
 * Cron Service — MT Economy
 * Jobs chạy định kỳ:
 * 1. expirePromotionalXu    — 01:00 sáng hằng ngày (GMT+7)
 * 2. cleanupPendingDeposits — mỗi 30 phút
 * 3. autoRenewMemberships   — mỗi giờ (kiểm tra membership sắp hết hạn trong 24h)
 */

import cron from 'node-cron';
import { query, getClient } from '../db/pool.js';
import { LedgerService } from './ledger.js';
import { notify } from './notifier.js';

// ─── Job 1: Expire MT khuyến mãi ─────────────────────────────────────────────

export async function expirePromotionalXu() {
  console.log('[Cron] 🕐 Bắt đầu kiểm tra MT hết hạn...');
  let expiredCount = 0;
  let affectedUsers = 0;

  try {
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
        const actualExpire = Math.min(totalExpire, parseInt(balance));
        if (actualExpire <= 0) {
          for (const b of userBatches) {
            await client.query(
              `UPDATE xu_expiry_batches SET status='expired', remaining_xu=0, expired_at=NOW() WHERE id=$1`,
              [b.id]
            );
          }
          await client.query('COMMIT');
          continue;
        }

        const idKey = `expire:${userId}:${new Date().toISOString().split('T')[0]}`;
        const { rows: [entry] } = await client.query(
          `SELECT * FROM update_wallet_balance($1,$2,$3,$4,$5,$6,$7,$8)`,
          [userId, -actualExpire, 'expire', idKey, null, 'xu_expiry', `Hết hạn ${actualExpire.toLocaleString()} MT khuyến mãi`, {}]
        );

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

// ─── Job 3: Auto-renew Fan Club memberships ───────────────────────────────────

export async function autoRenewMemberships() {
  console.log('[Cron] 🔄 Bắt đầu auto-renew memberships...');
  let renewed = 0;
  let failed = 0;

  try {
    // Lấy tất cả membership sắp hết hạn trong 24h, có auto_renew = true, và đang active
    const { rows: memberships } = await query(`
      SELECT fcm.id AS membership_id, fcm.user_id, fcm.creator_id, fcm.tier_id,
             fcm.expires_at,
             fct.price_mt, fct.name AS tier_name, fct.is_active AS tier_active,
             u.username AS user_name,
             cu.username AS creator_name
      FROM fan_club_memberships fcm
      JOIN fan_club_tiers fct ON fct.id = fcm.tier_id
      JOIN users u  ON u.id  = fcm.user_id
      JOIN users cu ON cu.id = fcm.creator_id
      WHERE fcm.status = 'active'
        AND fcm.auto_renew = true
        AND fcm.expires_at BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
    `);

    if (memberships.length === 0) {
      console.log('[Cron] ✅ Không có membership nào cần auto-renew');
      return { renewed: 0, failed: 0 };
    }

    console.log(`[Cron] Tìm thấy ${memberships.length} membership sắp hết hạn cần auto-renew`);

    for (const m of memberships) {
      // Nếu tier đã bị vô hiệu hóa → không gia hạn, tắt auto_renew
      if (!m.tier_active) {
        await query(
          `UPDATE fan_club_memberships SET auto_renew = false WHERE id = $1`,
          [m.membership_id]
        );
        await notify({
          userId: m.user_id,
          type: 'system',
          title: '❌ Không thể gia hạn Fan Club',
          body: `Tier "${m.tier_name}" của creator ${m.creator_name} đã bị tắt. Auto-renew đã bị hủy.`,
          metadata: { membershipId: m.membership_id },
        });
        failed++;
        continue;
      }

      const PLATFORM_FEE_RATE = 0.10;
      const platformFee = Math.floor(m.price_mt * PLATFORM_FEE_RATE);
      const creatorReceives = m.price_mt - platformFee;
      const newExpiry = new Date(new Date(m.expires_at).getTime() + 30 * 24 * 60 * 60 * 1000);
      const txKey = `membership_autorenew:${m.user_id}:${m.tier_id}:${Date.now()}`;

      try {
        // Trừ MT user
        await LedgerService.transact({
          userId: m.user_id,
          amount: -m.price_mt,
          type: 'membership_purchase',
          idempotencyKey: txKey,
          description: `[Auto-renew] Fan Club ${m.tier_name} — ${m.creator_name}`,
          metadata: { tierId: m.tier_id, creatorId: m.creator_id, autoRenew: true },
        });

        // Cộng MT creator
        await LedgerService.transact({
          userId: m.creator_id,
          amount: creatorReceives,
          type: 'membership_received',
          idempotencyKey: `membership_received:${txKey}`,
          description: `[Auto-renew] Fan Club ${m.tier_name} — ${m.user_name}`,
          metadata: { tierId: m.tier_id, userId: m.user_id, autoRenew: true },
        });

        // Gia hạn membership
        await query(`
          UPDATE fan_club_memberships
          SET expires_at = $1, status = 'active'
          WHERE id = $2
        `, [newExpiry, m.membership_id]);

        // Ghi vào membership_subscriptions
        await query(`
          INSERT INTO membership_subscriptions
            (membership_id, user_id, creator_id, tier_id, amount_mt, platform_fee,
             renewal_type, period_start, period_end, status)
          VALUES ($1,$2,$3,$4,$5,$6,'auto',$7,$8,'completed')
        `, [m.membership_id, m.user_id, m.creator_id, m.tier_id,
            m.price_mt, platformFee, m.expires_at, newExpiry]);

        // Ghi legacy fan_club_payments
        await query(`
          INSERT INTO fan_club_payments (membership_id, user_id, creator_id, tier_id, amount_mt, platform_fee)
          VALUES ($1,$2,$3,$4,$5,$6)
        `, [m.membership_id, m.user_id, m.creator_id, m.tier_id, m.price_mt, platformFee]);

        // Notify user
        await notify({
          userId: m.user_id,
          type: 'system',
          title: '✅ Fan Club đã được gia hạn',
          body: `Membership "${m.tier_name}" tại ${m.creator_name} đã tự động gia hạn đến ${newExpiry.toLocaleDateString('vi-VN')}. Đã trừ ${m.price_mt.toLocaleString()} MT.`,
          metadata: { membershipId: m.membership_id, newExpiry },
        });

        // Notify creator
        await notify({
          userId: m.creator_id,
          type: 'system',
          title: '🔄 Fan Club gia hạn',
          body: `${m.user_name} đã gia hạn Fan Club ${m.tier_name}`,
          metadata: { membershipId: m.membership_id },
        });

        renewed++;
        console.log(`[Cron] ✅ Auto-renewed: ${m.user_name} → ${m.tier_name} (${m.creator_name})`);
      } catch (err) {
        // Thiếu tiền hoặc lỗi khác → ghi log failed, tắt auto_renew
        failed++;
        console.error(`[Cron] ❌ Auto-renew thất bại (${m.user_name}): ${err.message}`);

        // Ghi failed vào membership_subscriptions
        await query(`
          INSERT INTO membership_subscriptions
            (membership_id, user_id, creator_id, tier_id, amount_mt, platform_fee,
             renewal_type, period_start, period_end, status, fail_reason)
          VALUES ($1,$2,$3,$4,$5,$6,'auto',$7,$8,'failed',$9)
        `, [m.membership_id, m.user_id, m.creator_id, m.tier_id,
            m.price_mt, platformFee, m.expires_at, newExpiry, err.message]);

        // Tắt auto_renew nếu thất bại (thường do thiếu MT)
        await query(
          `UPDATE fan_club_memberships SET auto_renew = false WHERE id = $1`,
          [m.membership_id]
        );

        await notify({
          userId: m.user_id,
          type: 'system',
          title: '❌ Gia hạn Fan Club thất bại',
          body: `Không thể tự động gia hạn Fan Club "${m.tier_name}". Lý do: ${err.message.includes('Insufficient') ? 'Số dư MT không đủ' : err.message}. Auto-renew đã bị tắt.`,
          metadata: { membershipId: m.membership_id },
        });
      }
    }

    console.log(`[Cron] ✅ Auto-renew xong — ${renewed} thành công / ${failed} thất bại`);
    return { renewed, failed };
  } catch (err) {
    console.error('[Cron] Lỗi autoRenewMemberships:', err.message);
    return { renewed: 0, failed: 0, error: err.message };
  }
}

// ─── Cũng expire membership quá hạn ──────────────────────────────────────────

export async function expireOldMemberships() {
  try {
    const { rowCount } = await query(`
      UPDATE fan_club_memberships
      SET status = 'expired'
      WHERE status = 'active'
        AND expires_at < NOW()
        AND auto_renew = false
    `);
    if (rowCount > 0) {
      console.log(`[Cron] ⏰ Đã expire ${rowCount} membership quá hạn`);
    }
    return { expired: rowCount };
  } catch (err) {
    console.error('[Cron] Lỗi expireOldMemberships:', err.message);
    return { expired: 0, error: err.message };
  }
}

// ─── Khởi động tất cả cron jobs ──────────────────────────────────────────────

export function startCronJobs() {
  // Job 1: Expire MT khuyến mãi — 01:00 sáng mỗi ngày
  cron.schedule('0 1 * * *', async () => {
    console.log('\n[Cron] ⏰ 01:00 — Chạy job expirePromotionalXu');
    await expirePromotionalXu();
  }, { timezone: 'Asia/Ho_Chi_Minh' });

  // Job 2: Dọn deposit pending — mỗi 30 phút
  cron.schedule('*/30 * * * *', async () => {
    console.log('[Cron] 🧹 Chạy job cleanupPendingDeposits');
    await cleanupPendingDeposits();
  });

  // Job 3: Auto-renew memberships — mỗi giờ
  cron.schedule('0 * * * *', async () => {
    console.log('[Cron] 🔄 Chạy job autoRenewMemberships');
    await autoRenewMemberships();
    await expireOldMemberships();
  });

  console.log('[Cron] ✅ Đã đăng ký 3 cron jobs:');
  console.log('       - expirePromotionalXu:    01:00 hằng ngày (GMT+7)');
  console.log('       - cleanupPendingDeposits: mỗi 30 phút');
  console.log('       - autoRenewMemberships:   mỗi giờ');
}
