import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db/pool.js';
import { generateToken } from '../middleware/auth.js';
import { LedgerService } from '../services/ledger.js';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, role = 'user', referral_code } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email, password required' });
    }
    const hash = await bcrypt.hash(password, 10);

    // Tạo referral_code cho user mới (8 ký tự ngẫu nhiên)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let newCode = '';
    for (let i = 0; i < 8; i++) newCode += chars[Math.floor(Math.random() * chars.length)];

    const { rows: [user] } = await query(
      `INSERT INTO users (username, email, password_hash, role, referral_code)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, username, email, role, referral_code, created_at`,
      [username, email, hash, role, newCode]
    );

    // Tạo ví
    await LedgerService.createWallet(user.id);

    // Nếu có referral_code của người khác — sẽ xử lý qua POST /api/referral/use sau khi login
    // Trả code về để frontend tự gọi nếu cần
    const token = generateToken(user.id, user.role);
    res.status(201).json({ user, token, pending_referral: referral_code || null });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { rows: [user] } = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = generateToken(user.id, user.role);
    const { password_hash, ...safeUser } = user;
    res.json({ user: safeUser, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
