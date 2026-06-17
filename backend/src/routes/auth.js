import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db/pool.js';
import { generateToken } from '../middleware/auth.js';
import { LedgerService } from '../services/ledger.js';
import { sendOtpEmail } from '../services/email.js';

const router = Router();

function genOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// POST /api/auth/send-otp
router.post('/send-otp', async (req, res) => {
  try {
    const { email, username } = req.body;
    if (!email || !username) return res.status(400).json({ error: 'email và username bắt buộc' });

    // Kiểm tra email/username đã tồn tại chưa
    const { rows: existing } = await query(
      'SELECT id FROM users WHERE email=$1 OR username=$2',
      [email, username]
    );
    if (existing.length > 0) return res.status(409).json({ error: 'Email hoặc username đã được sử dụng' });

    // Xóa OTP cũ chưa dùng của email này
    await query('DELETE FROM email_otps WHERE email=$1', [email]);

    const otp = genOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 phút

    await query(
      'INSERT INTO email_otps (email, otp_code, expires_at) VALUES ($1,$2,$3)',
      [email, otp, expiresAt]
    );

    const result = await sendOtpEmail(email, otp, username);

    // Dev mode: trả OTP về để test khi chưa cấu hình email
    if (result.dev) {
      return res.json({ sent: true, dev: true, otp });
    }

    res.json({ sent: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, otp_code, role = 'user', referral_code } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email, password bắt buộc' });
    }
    if (!otp_code) {
      return res.status(400).json({ error: 'Cần xác nhận OTP trước khi đăng ký' });
    }

    // Xác minh OTP
    const { rows: [otpRow] } = await query(
      `SELECT * FROM email_otps
       WHERE email=$1 AND otp_code=$2 AND used=false AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [email, otp_code]
    );
    if (!otpRow) {
      return res.status(400).json({ error: 'Mã OTP không đúng hoặc đã hết hạn' });
    }

    // Đánh dấu OTP đã dùng
    await query('UPDATE email_otps SET used=true WHERE id=$1', [otpRow.id]);

    const hash = await bcrypt.hash(password, 10);

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let newCode = '';
    for (let i = 0; i < 8; i++) newCode += chars[Math.floor(Math.random() * chars.length)];

    const { rows: [user] } = await query(
      `INSERT INTO users (username, email, password_hash, role, referral_code)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, username, email, role, referral_code, created_at`,
      [username, email, hash, role, newCode]
    );

    await LedgerService.createWallet(user.id);

    const token = generateToken(user.id, user.role);
    res.status(201).json({ user, token, pending_referral: referral_code || null });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Username hoặc email đã tồn tại' });
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
    if (!user) return res.status(401).json({ error: 'Sai email hoặc mật khẩu' });
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Sai email hoặc mật khẩu' });
    const token = generateToken(user.id, user.role);
    const { password_hash, ...safeUser } = user;
    res.json({ user: safeUser, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
