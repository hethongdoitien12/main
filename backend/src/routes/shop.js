import { Router } from 'express';
import { query, getClient } from '../db/pool.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import { LedgerService } from '../services/ledger.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// ── GET /api/shop/items — danh sách vật phẩm đang bán ─────────────────────────
router.get('/items', authMiddleware, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, name, description, category, icon, price_mt,
              stock, sold_count, is_active, is_limited, created_at
       FROM shop_items
       WHERE is_active = true
       ORDER BY category, price_mt ASC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/shop/my-items — vật phẩm user đã mua ─────────────────────────────
router.get('/my-items', authMiddleware, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT sp.id, sp.created_at, sp.amount_mt,
              si.name, si.description, si.category, si.icon
       FROM shop_purchases sp
       JOIN shop_items si ON si.id = sp.item_id
       WHERE sp.user_id = $1
       ORDER BY sp.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/shop/buy/:id — mua vật phẩm ─────────────────────────────────────
router.post('/buy/:id', authMiddleware, async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Lock & fetch item
    const { rows: [item] } = await client.query(
      `SELECT * FROM shop_items WHERE id = $1 AND is_active = true FOR UPDATE`,
      [req.params.id]
    );
    if (!item) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Vật phẩm không tồn tại hoặc đã ngừng bán' });
    }

    // Check stock
    if (item.stock !== null && item.stock <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Vật phẩm đã hết hàng' });
    }

    // Deduct MT via ledger
    let entry;
    try {
      entry = await LedgerService.spend({
        userId: req.user.id,
        amount: item.price_mt,
        type: 'spend_item',
        itemId: item.id,
        itemType: 'shop_item',
        description: `Mua ${item.icon} ${item.name} (-${item.price_mt.toLocaleString()} MT)`,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Số dư MT không đủ' });
    }

    // Record purchase
    const { rows: [purchase] } = await client.query(
      `INSERT INTO shop_purchases (user_id, item_id, amount_mt, ledger_entry_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, item.id, item.price_mt, entry?.id]
    );

    // Update sold_count & stock
    await client.query(
      `UPDATE shop_items
       SET sold_count = sold_count + 1,
           stock = CASE WHEN stock IS NOT NULL THEN stock - 1 ELSE NULL END
       WHERE id = $1`,
      [item.id]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `✅ Mua thành công ${item.icon} ${item.name}!`,
      purchase,
      item: { ...item, stock: item.stock !== null ? item.stock - 1 : null },
      balance_after: entry?.balance_after,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ── ADMIN: GET /api/shop/admin/items — tất cả items kể cả inactive ─────────────
router.get('/admin/items', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT * FROM shop_items ORDER BY category, price_mt ASC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ADMIN: POST /api/shop/admin/items — tạo item mới ──────────────────────────
router.post('/admin/items', authMiddleware, adminOnly, async (req, res) => {
  const { name, description, category, icon, price_mt, stock, is_limited } = req.body;
  if (!name || !category || !price_mt) {
    return res.status(400).json({ error: 'Thiếu thông tin bắt buộc (name, category, price_mt)' });
  }
  try {
    const { rows: [item] } = await query(
      `INSERT INTO shop_items (name, description, category, icon, price_mt, stock, is_limited)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [name, description || null, category, icon || '🎁', parseInt(price_mt), stock ? parseInt(stock) : null, !!is_limited]
    );
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ADMIN: PATCH /api/shop/admin/items/:id — cập nhật item ────────────────────
router.patch('/admin/items/:id', authMiddleware, adminOnly, async (req, res) => {
  const { is_active, price_mt, stock, name, description, icon } = req.body;
  try {
    const fields = [];
    const vals = [];
    let i = 1;
    if (name !== undefined)        { fields.push(`name=$${i++}`);        vals.push(name); }
    if (description !== undefined) { fields.push(`description=$${i++}`); vals.push(description); }
    if (icon !== undefined)        { fields.push(`icon=$${i++}`);        vals.push(icon); }
    if (price_mt !== undefined)    { fields.push(`price_mt=$${i++}`);    vals.push(parseInt(price_mt)); }
    if (stock !== undefined)       { fields.push(`stock=$${i++}`);       vals.push(stock === null ? null : parseInt(stock)); }
    if (is_active !== undefined)   { fields.push(`is_active=$${i++}`);   vals.push(!!is_active); }
    if (!fields.length) return res.status(400).json({ error: 'Không có gì cần cập nhật' });
    vals.push(req.params.id);
    const { rows: [item] } = await query(
      `UPDATE shop_items SET ${fields.join(',')} WHERE id=$${i} RETURNING *`,
      vals
    );
    if (!item) return res.status(404).json({ error: 'Item không tồn tại' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ADMIN: GET /api/shop/admin/purchases — lịch sử mua toàn hệ thống ──────────
router.get('/admin/purchases', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT sp.id, sp.created_at, sp.amount_mt,
              si.name as item_name, si.icon as item_icon, si.category,
              u.username, u.email
       FROM shop_purchases sp
       JOIN shop_items si ON si.id = sp.item_id
       JOIN users u ON u.id = sp.user_id
       ORDER BY sp.created_at DESC
       LIMIT 200`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
