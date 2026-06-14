import { query, getClient } from '../db/pool.js';
import { LedgerService } from './ledger.js';

/**
 * QuestTriggerService
 * Gọi hàm này từ bất kỳ hệ thống nào (game, nhạc, content...)
 * để tự động cập nhật tiến trình quest và thưởng XU cho user.
 *
 * Ví dụ:
 *   await QuestTrigger.fire(userId, 'play_game_minutes', 30)
 *   await QuestTrigger.fire(userId, 'listen_music', 1)
 *   await QuestTrigger.fire(userId, 'post_content', 1)
 */
export const QuestTrigger = {

  // Danh sách action → quest mapping
  ACTION_MAP: {
    'login':              ['one_time'],
    'play_game_minutes':  ['daily','weekly'],
    'listen_music':       ['daily','weekly'],
    'post_content':       ['weekly','one_time'],
    'refer_friend':       ['one_time'],
    'visit_world':        ['weekly'],
    'send_tip':           ['weekly'],
    'buy_ticket':         ['weekly','one_time'],
    'create_game':        ['one_time'],
    'stream_minutes':     ['daily','weekly'],
  },

  /**
   * Main entry point — gọi khi user thực hiện một action
   * @param {string} userId
   * @param {string} action  - vd: 'play_game_minutes', 'listen_music'
   * @param {number} count   - số lượng (phút, bài, lần...)
   * @returns {Array} rewards - danh sách quest vừa hoàn thành
   */
  async fire(userId, action, count = 1) {
    const completed = [];

    // Tìm tất cả quest active có action này
    const { rows: quests } = await query(`
      SELECT q.*, uq.id as uq_id, uq.current_count, uq.status as uq_status
      FROM quests q
      LEFT JOIN user_quests uq ON uq.quest_id = q.id AND uq.user_id = $1
      WHERE q.is_active = true
        AND q.requirement->>'action' = $2
        AND (q.expires_at IS NULL OR q.expires_at > NOW())
        AND (uq.status IS NULL OR uq.status = 'in_progress')
    `, [userId, action]);

    for (const quest of quests) {
      const reqCount = parseInt(quest.requirement?.count || 1);
      const curCount = parseInt(quest.current_count || 0);
      const newCount = Math.min(curCount + count, reqCount);
      const isNowComplete = newCount >= reqCount;

      // Upsert user_quest progress
      await query(`
        INSERT INTO user_quests (user_id, quest_id, current_count, status, completed_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id, quest_id) DO UPDATE SET
          current_count = EXCLUDED.current_count,
          status = EXCLUDED.status,
          completed_at = EXCLUDED.completed_at
      `, [
        userId, quest.id, newCount,
        isNowComplete ? 'completed' : 'in_progress',
        isNowComplete ? new Date() : null
      ]);

      if (isNowComplete) {
        completed.push({
          questId: quest.id,
          title: quest.title,
          rewardXu: quest.reward_xu,
          type: quest.type
        });
      }
    }

    return completed; // caller có thể notify user
  },

  /**
   * Auto-claim: tự động claim XU cho tất cả quest đã completed chưa claim
   * Dùng cho daily/weekly quest (tự động nhận, không cần user bấm)
   */
  async autoClaim(userId) {
    const { rows: readyQuests } = await query(`
      SELECT uq.*, q.reward_xu, q.title, q.type
      FROM user_quests uq
      JOIN quests q ON q.id = uq.quest_id
      WHERE uq.user_id = $1 AND uq.status = 'completed'
    `, [userId]);

    const claimed = [];
    for (const uq of readyQuests) {
      try {
        const result = await LedgerService.claimQuest(userId, uq.quest_id);
        claimed.push({ title: uq.title, rewardXu: uq.reward_xu });
      } catch {}
    }
    return claimed;
  },

  /**
   * Reset daily/weekly quests — chạy bằng cron job
   * daily: reset mỗi ngày 00:00
   * weekly: reset mỗi thứ 2 00:00
   */
  async resetPeriodic(type) {
    // Xóa progress của quest theo loại để user làm lại
    const { rowCount } = await query(`
      UPDATE user_quests uq
      SET current_count = 0, status = 'in_progress', completed_at = NULL, claimed_at = NULL
      FROM quests q
      WHERE uq.quest_id = q.id AND q.type = $1
        AND uq.status IN ('completed', 'claimed')
    `, [type]);
    console.log(`✅ Reset ${rowCount} ${type} quests`);
    return rowCount;
  },

  /**
   * Referral reward — thưởng cho người mời khi người được mời đăng ký
   */
  async handleReferral(referrerId, newUserId) {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Thưởng người mời
      const completed = await QuestTrigger.fire(referrerId, 'refer_friend', 1);

      // Thưởng người được mời (XU chào mừng)
      await LedgerService.earnReward({
        userId: newUserId,
        amount: 200,
        type: 'earn_referral',
        description: 'Nhận XU chào mừng từ lời mời bạn bè'
      });

      await client.query('COMMIT');
      return { referrerQuests: completed };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
};

export default QuestTrigger;
