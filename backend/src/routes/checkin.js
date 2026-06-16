import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { LedgerService } from '../services/ledger.js';
import { query, getClient } from '../db/pool.js';
import { notify } from '../services/notifier.js';

const router = Router();
router.use(authMiddleware);

// Phần thưởng theo ngày streak
function streakReward(day) {
  if (day >= 30) return 500;
  if (day >= 14) return 350;
  if (day >= 7)  return 250;
  if (day >= 3)  return 100;
  if (day >= 2)  return 75;
  return 50;
}

// Tiêu đề milestone
function milestoneLabel(day) {
  if (day === 7)  return '🏆 Streak 7 ngày!';
  if (day === 14) return '🔥 Streak 2 tuần!';
  if (day === 30) return '👑 Streak 1 tháng!';
  return null;
}

// GET /api/checkin/status — trạng thái hôm nay + streak
router.get('/status', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // Đã check-in hôm nay chưa?
    const { rows: [todayRow] } = await query(
      `SELECT * FROM daily_checkins WHERE user_id=$1 AND checked_in_date=$2`,
      [req.user.id, today]
    );

    // Streak hiện tại (lấy từ ngày gần nhất)
    const { rows: [lastRow] } = await query(
      `SELECT * FROM daily_checkins WHERE user_id=$1 ORDER BY checked_in_date DESC LIMIT 1`,
      [req.user.id]
    );

    // Tính streak hiện tại
    let currentStreak = 0;
    if (lastRow) {
      const lastDate   = new Date(lastRow.checked_in_date);
      const todayDate  = new Date(today);
      const diffDays   = Math.round((todayDate - lastDate) / 86400000);
      if (diffDays === 0) currentStreak = lastRow.streak_day;           // hôm nay rồi
      else if (diffDays === 1) currentStreak = lastRow.streak_day;      // hôm qua, streak còn sống
      else currentStreak = 0;                                            // mất streak
    }

    // Ngày tiếp theo nếu check-in hôm nay
    const nextDay    = todayRow ? currentStreak : currentStreak + 1;
    const nextReward = streakReward(nextDay);

    // 7 ngày gần nhất để hiện calendar
    const { rows: recent } = await query(
      `SELECT checked_in_date::text, streak_day, xu_earned
       FROM daily_checkins WHERE user_id=$1 ORDER BY checked_in_date DESC LIMIT 30`,
      [req.user.id]
    );

    res.json({
      checked_in_today: !!todayRow,
      current_streak:   currentStreak,
      today_row:        todayRow || null,
      next_reward:      nextReward,
      next_day:         nextDay,
      recent,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/checkin — thực hiện check-in
router.post('/', async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const today = new Date().toISOString().slice(0, 10);

    // Idempotency — chỉ 1 lần/ngày
    const { rows: [existing] } = await client.query(
      `SELECT id FROM daily_checkins WHERE user_id=$1 AND checked_in_date=$2`,
      [req.user.id, today]
    );
    if (existing) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Bạn đã điểm danh hôm nay rồi!' });
    }

    // Tính streak
    const { rows: [lastRow] } = await client.query(
      `SELECT streak_day, checked_in_date FROM daily_checkins
       WHERE user_id=$1 ORDER BY checked_in_date DESC LIMIT 1`,
      [req.user.id]
    );

    let streakDay = 1;
    if (lastRow) {
      const lastDate  = new Date(lastRow.checked_in_date);
      const todayDate = new Date(today);
      const diffDays  = Math.round((todayDate - lastDate) / 86400000);
      streakDay = diffDays === 1 ? lastRow.streak_day + 1 : 1;
    }

    const xu = streakReward(streakDay);

    // Ghi check-in
    const { rows: [checkin] } = await client.query(
      `INSERT INTO daily_checkins (user_id, checked_in_date, streak_day, xu_earned)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.user.id, today, streakDay, xu]
    );

    // Ghi ledger qua LedgerService (dùng update_wallet_balance)
    await client.query(
      `SELECT * FROM update_wallet_balance($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        req.user.id, xu, 'earn_checkin',
        `checkin:${req.user.id}:${today}`,
        null, 'checkin',
        `Điểm danh ngày ${streakDay}${streakDay > 1 ? ` (streak ${streakDay})` : ''}`,
        { streakDay },
      ]
    );

    await client.query('COMMIT');

    // Notification cho milestone
    const label = milestoneLabel(streakDay);
    if (label) {
      await notify({
        userId: req.user.id,
        type: 'system',
        title: label,
        body: `+${xu.toLocaleString()} XU thưởng streak ${streakDay} ngày liên tiếp!`,
      });
    }

    res.json({ ok: true, checkin, xu_earned: xu, streak_day: streakDay });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

export default router;
