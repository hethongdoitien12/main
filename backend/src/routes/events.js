import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { QuestTrigger } from '../services/questTrigger.js';
import { LedgerService } from '../services/ledger.js';

const router = Router();
router.use(authMiddleware);

/**
 * POST /api/events/trigger
 * Hệ thống khác gọi vào đây để trigger quest + thưởng MT
 *
 * Body: { action, count, metadata }
 * Actions hợp lệ:
 *   play_game_minutes | listen_music | post_content
 *   refer_friend | visit_world | send_tip | buy_ticket
 *   create_game | stream_minutes | login
 */
router.post('/trigger', async (req, res) => {
  try {
    const { action, count = 1, metadata = {} } = req.body;

    const VALID_ACTIONS = [
      'play_game_minutes', 'listen_music', 'post_content',
      'refer_friend', 'visit_world', 'send_tip', 'buy_ticket',
      'create_game', 'stream_minutes', 'login'
    ];

    if (!VALID_ACTIONS.includes(action)) {
      return res.status(400).json({ error: `Action không hợp lệ. Các action hợp lệ: ${VALID_ACTIONS.join(', ')}` });
    }

    // Trigger quest progress
    const completedQuests = await QuestTrigger.fire(req.user.id, action, count);

    // Auto-claim nếu có quest vừa hoàn thành
    const claimed = [];
    for (const q of completedQuests) {
      try {
        const result = await LedgerService.claimQuest(req.user.id, q.questId);
        claimed.push({ ...q, claimed: true, rewardXu: result.rewardXu });
      } catch {}
    }

    // Lấy số dư mới
    const wallet = await LedgerService.getWallet(req.user.id);

    res.json({
      action,
      count,
      completedQuests: claimed,
      hasRewards: claimed.length > 0,
      totalRewardXu: claimed.reduce((s, q) => s + Number(q.rewardXu), 0),
      newBalance: wallet?.balance || 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/events/referral
 * Gọi khi user đăng ký qua link referral
 * Body: { referrerId }
 */
router.post('/referral', async (req, res) => {
  try {
    const { referrerId } = req.body;
    if (!referrerId) return res.status(400).json({ error: 'referrerId required' });
    if (referrerId === req.user.id) return res.status(400).json({ error: 'Không thể tự mời bản thân' });

    const result = await QuestTrigger.handleReferral(referrerId, req.user.id);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/events/actions
 * Trả về danh sách action hợp lệ và mô tả
 */
router.get('/actions', (req, res) => {
  res.json([
    { action: 'login',              label: 'Đăng nhập',           unit: 'lần' },
    { action: 'play_game_minutes',  label: 'Chơi game',            unit: 'phút' },
    { action: 'listen_music',       label: 'Nghe nhạc',            unit: 'bài' },
    { action: 'post_content',       label: 'Đăng bài',             unit: 'bài' },
    { action: 'refer_friend',       label: 'Mời bạn bè',           unit: 'người' },
    { action: 'visit_world',        label: 'Ghé thế giới ảo',      unit: 'lần' },
    { action: 'send_tip',           label: 'Gửi tip',              unit: 'lần' },
    { action: 'buy_ticket',         label: 'Mua vé',               unit: 'vé' },
    { action: 'create_game',        label: 'Tạo game',             unit: 'game' },
    { action: 'stream_minutes',     label: 'Livestream',           unit: 'phút' },
  ]);
});

export default router;
