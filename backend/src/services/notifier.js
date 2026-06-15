import { query } from '../db/pool.js';

/**
 * Tạo notification cho user
 * @param {object} opts
 * @param {string} opts.userId
 * @param {'tip_received'|'withdrawal_approved'|'withdrawal_rejected'|'quest_completed'|'deposit_confirmed'|'system'} opts.type
 * @param {string} opts.title
 * @param {string} opts.body
 * @param {object} [opts.metadata]
 */
export async function notify({ userId, type, title, body, metadata = {} }) {
  try {
    await query(
      `INSERT INTO notifications (user_id, type, title, body, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, type, title, body, JSON.stringify(metadata)]
    );
  } catch (err) {
    console.error('[Notifier] Lỗi tạo notification:', err.message);
  }
}

export async function getUnreadCount(userId) {
  const { rows: [r] } = await query(
    `SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = false`,
    [userId]
  );
  return parseInt(r.count || 0);
}
