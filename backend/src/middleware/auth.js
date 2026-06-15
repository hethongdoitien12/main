import jwt from 'jsonwebtoken';
import { query } from '../db/pool.js';

const JWT_SECRET = process.env.JWT_SECRET || 'xu-economy-secret-change-in-production';

export const generateToken = (userId, role) =>
  jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '7d' });

export const authMiddleware = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    const rawToken = auth?.startsWith('Bearer ') ? auth.slice(7) : req.query.token;
    if (!rawToken) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = rawToken;
    const decoded = jwt.verify(token, JWT_SECRET);
    const { rows: [user] } = await query(
      'SELECT id, username, email, role FROM users WHERE id = $1',
      [decoded.userId]
    );
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  next();
};
