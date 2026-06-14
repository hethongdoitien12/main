import { Router } from 'express';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import { LedgerService } from '../services/ledger.js';
import { query } from '../db/pool.js';

const router = Router();
router.use(authMiddleware);

// GET /api/quests — list available quests with user progress
router.get('/', async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT q.*,
        uq.status as user_status,
        uq.current_count,
        uq.progress,
        uq.completed_at,
        uq.claimed_at
      FROM quests q
      LEFT JOIN user_quests uq ON uq.quest_id = q.id AND uq.user_id = $1
      WHERE q.is_active = true
        AND (q.expires_at IS NULL OR q.expires_at > NOW())
      ORDER BY q.type, q.reward_xu DESC
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/quests/:id/progress — update quest progress (called by other services)
router.post('/:id/progress', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, count = 1 } = req.body;

    // Get quest
    const { rows: [quest] } = await query(
      'SELECT * FROM quests WHERE id = $1 AND is_active = true',
      [id]
    );
    if (!quest) return res.status(404).json({ error: 'Quest not found' });

    // Upsert user_quest progress
    const { rows: [uq] } = await query(`
      INSERT INTO user_quests (user_id, quest_id, current_count, status)
      VALUES ($1, $2, $3, 'in_progress')
      ON CONFLICT (user_id, quest_id) DO UPDATE
        SET current_count = CASE
          WHEN user_quests.status IN ('completed','claimed') THEN user_quests.current_count
          ELSE LEAST(user_quests.current_count + $3, (user_quests.quest_id::text = $2::text)::int * 9999)
        END,
        status = CASE
          WHEN user_quests.current_count + $3 >= (SELECT (requirement->>'count')::int FROM quests WHERE id=$2)
               AND user_quests.status = 'in_progress'
          THEN 'completed'
          ELSE user_quests.status
        END,
        completed_at = CASE
          WHEN user_quests.current_count + $3 >= (SELECT (requirement->>'count')::int FROM quests WHERE id=$2)
               AND user_quests.status = 'in_progress'
          THEN NOW()
          ELSE user_quests.completed_at
        END
      RETURNING *
    `, [req.user.id, id, count]);

    res.json({ userQuest: uq, quest });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/quests/:id/claim — claim quest reward
router.post('/:id/claim', async (req, res) => {
  try {
    const result = await LedgerService.claimQuest(req.user.id, req.params.id);
    const wallet = await LedgerService.getWallet(req.user.id);
    res.json({ ...result, wallet });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ADMIN: POST /api/quests — create quest
router.post('/', adminOnly, async (req, res) => {
  try {
    const { title, description, type, category, rewardXu, requirement, expiresAt } = req.body;
    const { rows: [quest] } = await query(`
      INSERT INTO quests (title, description, type, category, reward_xu, requirement, expires_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
    `, [title, description, type, category, rewardXu, requirement, expiresAt]);
    res.status(201).json(quest);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADMIN: PATCH /api/quests/:id — update quest
router.patch('/:id', adminOnly, async (req, res) => {
  try {
    const { is_active, rewardXu, expiresAt } = req.body;
    const { rows: [quest] } = await query(`
      UPDATE quests SET
        is_active = COALESCE($2, is_active),
        reward_xu = COALESCE($3, reward_xu),
        expires_at = COALESCE($4, expires_at)
      WHERE id = $1 RETURNING *
    `, [req.params.id, is_active, rewardXu, expiresAt]);
    res.json(quest);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
