import { query } from '../db/pool.js';

export const A = {
  TIP_SENT:          'TIP_SENT',
  PRODUCT_PURCHASED: 'PRODUCT_PURCHASED',
  FANCLUB_JOINED:    'FANCLUB_JOINED',
  CREATOR_VERIFIED:  'CREATOR_VERIFIED',
  CREATOR_FEATURED:  'CREATOR_FEATURED',
  MILESTONE_REACHED: 'MILESTONE_REACHED',
};

const MILESTONES = [1_000, 5_000, 10_000, 50_000, 100_000, 500_000, 1_000_000];

export async function postActivity({ actorId, actorUsername, actorAvatar, type, targetId, targetName, amountMt, metadata }) {
  try {
    await query(
      `INSERT INTO activity_feed
         (actor_id, actor_username, actor_avatar, activity_type, target_id, target_name, amount_mt, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [actorId || null, actorUsername || null, actorAvatar || null,
       type, targetId || null, targetName || null,
       amountMt || 0, JSON.stringify(metadata || {})]
    );
  } catch (e) {
    console.error('[activity] postActivity error:', e.message);
  }
}

export async function checkMilestone(creatorId) {
  try {
    const { rows: [wallet] }  = await query('SELECT total_earned FROM wallets WHERE user_id=$1', [creatorId]);
    if (!wallet) return;
    const { rows: [u] } = await query('SELECT username, avatar_url FROM users WHERE id=$1', [creatorId]);
    const totalEarned = Number(wallet.total_earned);

    for (const m of MILESTONES) {
      if (totalEarned < m) continue;
      const { rows: [exists] } = await query(
        `SELECT 1 FROM activity_feed WHERE actor_id=$1 AND activity_type='MILESTONE_REACHED' AND amount_mt=$2 LIMIT 1`,
        [creatorId, m]
      );
      if (!exists) {
        await postActivity({
          actorId: creatorId,
          actorUsername: u?.username,
          actorAvatar:   u?.avatar_url,
          type:      A.MILESTONE_REACHED,
          targetName: `${m.toLocaleString()} MT`,
          amountMt: m,
          metadata: { milestone: m },
        });
      }
    }
  } catch (e) {
    console.error('[activity] checkMilestone error:', e.message);
  }
}
