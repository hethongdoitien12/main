import { query } from '../db/pool.js';
import { notify } from './notifier.js';
import { postActivity } from './activity.js';
import { v4 as uuidv4 } from 'uuid';

async function unlockAchievement(userId, achievement, user) {
  try {
    const ikey = `achievement:${userId}:${achievement.code}`;
    const { rows: [existing] } = await query(
      `SELECT 1 FROM user_achievements WHERE user_id=$1 AND achievement_id=$2`,
      [userId, achievement.id]
    );
    if (existing) return null;

    await query(
      `INSERT INTO user_achievements (user_id, achievement_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [userId, achievement.id]
    );

    if (parseInt(achievement.reward_mt) > 0) {
      const ledgerKey = `earn_achievement:${userId}:${achievement.code}`;
      await query(`
        SELECT process_transaction(
          $1, $2, 'earn_achievement', $3, NULL, NULL,
          $4, NULL
        )
      `, [ledgerKey, userId, parseInt(achievement.reward_mt),
          `Thành tựu: ${achievement.title} (+${achievement.reward_mt} MT)`]);
    }

    await notify({
      userId,
      type: 'system',
      title: `🎉 Thành tựu mới: ${achievement.icon} ${achievement.title}`,
      body: `${achievement.description}. Phần thưởng: ${achievement.reward_mt} MT`,
      metadata: { achievement_code: achievement.code, reward_mt: achievement.reward_mt },
    });

    await postActivity({
      actorId: userId,
      actorUsername: user?.username,
      actorAvatar: user?.avatar_url,
      type: 'ACHIEVEMENT_UNLOCKED',
      targetName: achievement.title,
      amountMt: parseInt(achievement.reward_mt) || 0,
      metadata: { code: achievement.code, icon: achievement.icon, category: achievement.category },
    });

    return achievement;
  } catch (e) {
    console.error('[achievement] unlockAchievement error:', e.message);
    return null;
  }
}

async function getUser(userId) {
  const { rows: [u] } = await query('SELECT id, username, avatar_url, role FROM users WHERE id=$1', [userId]);
  return u;
}

async function getAchievement(code) {
  const { rows: [a] } = await query('SELECT * FROM achievements WHERE code=$1', [code]);
  return a;
}

export const AchievementService = {
  async checkUserAchievements(userId, context = {}) {
    try {
      const user = await getUser(userId);
      if (!user) return;
      const unlocked = [];

      if (context.action === 'login') {
        const a = await getAchievement('FIRST_LOGIN');
        if (a) {
          const r = await unlockAchievement(userId, a, user);
          if (r) unlocked.push(r);
        }
      }

      if (context.action === 'tip') {
        const { rows: [tipStats] } = await query(
          `SELECT COUNT(*)::int AS tip_count, COALESCE(SUM(amount_xu),0)::bigint AS tip_total
           FROM tips WHERE sender_id=$1`, [userId]
        );
        if (tipStats.tip_count >= 1) {
          const a = await getAchievement('FIRST_TIP');
          if (a) { const r = await unlockAchievement(userId, a, user); if (r) unlocked.push(r); }
        }
        if (tipStats.tip_total >= 5000) {
          const a = await getAchievement('BIG_SUPPORTER');
          if (a) { const r = await unlockAchievement(userId, a, user); if (r) unlocked.push(r); }
        }
      }

      if (context.action === 'join_fanclub') {
        const a = await getAchievement('SUPER_FAN');
        if (a) { const r = await unlockAchievement(userId, a, user); if (r) unlocked.push(r); }
      }

      if (context.action === 'buy_product') {
        const { rows: [buyStats] } = await query(
          `SELECT COUNT(*)::int AS buy_count FROM creator_orders WHERE buyer_id=$1 AND status='completed'`,
          [userId]
        );
        if (buyStats.buy_count >= 1) {
          const a = await getAchievement('SHOPPER');
          if (a) { const r = await unlockAchievement(userId, a, user); if (r) unlocked.push(r); }
        }
        if (buyStats.buy_count >= 10) {
          const a = await getAchievement('POWER_BUYER');
          if (a) { const r = await unlockAchievement(userId, a, user); if (r) unlocked.push(r); }
        }
      }

      return unlocked;
    } catch (e) {
      console.error('[achievement] checkUserAchievements error:', e.message);
    }
  },

  async checkCreatorAchievements(creatorId, context = {}) {
    try {
      const user = await getUser(creatorId);
      if (!user || user.role === 'user') return;
      const unlocked = [];

      const { rows: [wallet] } = await query(
        'SELECT COALESCE(total_earned,0)::bigint AS total_earned FROM wallets WHERE user_id=$1', [creatorId]
      );
      const totalEarned = parseInt(wallet?.total_earned || 0);

      if (totalEarned >= 1000) {
        const a = await getAchievement('FIRST_EARNING');
        if (a) { const r = await unlockAchievement(creatorId, a, user); if (r) unlocked.push(r); }
      }
      if (totalEarned >= 10000) {
        const a = await getAchievement('TOP_CREATOR');
        if (a) { const r = await unlockAchievement(creatorId, a, user); if (r) unlocked.push(r); }
      }

      const { rows: [tipStats] } = await query(
        `SELECT COUNT(*)::int AS tip_count FROM tips WHERE receiver_id=$1`, [creatorId]
      );
      if (tipStats.tip_count >= 100) {
        const a = await getAchievement('POPULAR_CREATOR');
        if (a) { const r = await unlockAchievement(creatorId, a, user); if (r) unlocked.push(r); }
      }

      if (context.action === 'sell_product') {
        const { rows: [saleStats] } = await query(
          `SELECT COUNT(*)::int AS sale_count FROM creator_orders co
           JOIN creator_products cp ON co.product_id=cp.id
           WHERE cp.creator_id=$1 AND co.status='completed'`, [creatorId]
        );
        if (saleStats.sale_count >= 1) {
          const a = await getAchievement('FIRST_SALE');
          if (a) { const r = await unlockAchievement(creatorId, a, user); if (r) unlocked.push(r); }
        }
        if (saleStats.sale_count >= 100) {
          const a = await getAchievement('BESTSELLER');
          if (a) { const r = await unlockAchievement(creatorId, a, user); if (r) unlocked.push(r); }
        }
      }

      if (context.action === 'fanclub_member') {
        const { rows: [memberStats] } = await query(
          `SELECT COUNT(*)::int AS member_count
           FROM fan_club_memberships fcm
           JOIN fan_club_tiers fct ON fcm.tier_id=fct.id
           WHERE fct.creator_id=$1 AND fcm.status='active'`, [creatorId]
        );
        if (memberStats.member_count >= 1) {
          const a = await getAchievement('FIRST_MEMBER');
          if (a) { const r = await unlockAchievement(creatorId, a, user); if (r) unlocked.push(r); }
        }
        if (memberStats.member_count >= 50) {
          const a = await getAchievement('FANCLUB_50');
          if (a) { const r = await unlockAchievement(creatorId, a, user); if (r) unlocked.push(r); }
        }
      }

      if (context.action === 'verified') {
        const a = await getAchievement('VERIFIED_CREATOR');
        if (a) { const r = await unlockAchievement(creatorId, a, user); if (r) unlocked.push(r); }
      }

      if (context.action === 'featured') {
        const a = await getAchievement('FEATURED_CREATOR');
        if (a) { const r = await unlockAchievement(creatorId, a, user); if (r) unlocked.push(r); }
      }

      return unlocked;
    } catch (e) {
      console.error('[achievement] checkCreatorAchievements error:', e.message);
    }
  },
};
