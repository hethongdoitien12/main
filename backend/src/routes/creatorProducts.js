import { Router } from 'express';
import { query } from '../db/pool.js';
import { authMiddleware } from '../middleware/auth.js';
import { LedgerService } from '../services/ledger.js';
import { notify } from '../services/notifier.js';
import { postActivity, checkMilestone, A } from '../services/activity.js';
import { AchievementService } from '../services/achievement.js';

const router = Router();
const PLATFORM_FEE = 0.10;

// ── Creator: Tạo sản phẩm ─────────────────────────────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
  if (req.user.role !== 'creator' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ dành cho creator' });
  }
  try {
    const { title, description, type, price_mt, thumbnail_url, download_url } = req.body;
    const validTypes = ['ebook', 'template', 'preset', 'source_code', 'prompt_ai', 'other'];
    if (!title || !type || !price_mt) {
      return res.status(400).json({ error: 'Thiếu title, type hoặc price_mt' });
    }
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'type không hợp lệ. Chọn: ' + validTypes.join(', ') });
    }
    const { rows: [product] } = await query(`
      INSERT INTO creator_products (creator_id, title, description, type, price_mt, thumbnail_url, download_url)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *
    `, [req.user.id, title, description || null, type, parseInt(price_mt), thumbnail_url || null, download_url || null]);
    res.status(201).json({ product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Creator: Cập nhật sản phẩm ────────────────────────────────────────────────
router.patch('/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'creator' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ dành cho creator' });
  }
  try {
    const { title, description, price_mt, thumbnail_url, download_url, is_active } = req.body;
    const { rows: [product] } = await query(`
      UPDATE creator_products SET
        title         = COALESCE($1, title),
        description   = COALESCE($2, description),
        price_mt      = COALESCE($3, price_mt),
        thumbnail_url = COALESCE($4, thumbnail_url),
        download_url  = COALESCE($5, download_url),
        is_active     = COALESCE($6, is_active),
        updated_at    = NOW()
      WHERE id = $7 AND creator_id = $8
      RETURNING *
    `, [title || null, description || null, price_mt ? parseInt(price_mt) : null,
        thumbnail_url || null, download_url || null,
        is_active !== undefined ? is_active : null,
        req.params.id, req.user.id]);
    if (!product) return res.status(404).json({ error: 'Sản phẩm không tồn tại' });
    res.json({ product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Creator: Ẩn / xóa sản phẩm ───────────────────────────────────────────────
router.delete('/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'creator' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ dành cho creator' });
  }
  try {
    await query(`
      UPDATE creator_products SET is_active = false, updated_at = NOW()
      WHERE id = $1 AND creator_id = $2
    `, [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Creator: Danh sách sản phẩm của mình ─────────────────────────────────────
router.get('/mine', authMiddleware, async (req, res) => {
  if (req.user.role !== 'creator' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ dành cho creator' });
  }
  try {
    const { rows } = await query(`
      SELECT p.*,
             COUNT(o.id)::INT                                   AS order_count,
             COALESCE(SUM(o.amount_mt - o.platform_fee),0)::BIGINT AS revenue_mt
      FROM creator_products p
      LEFT JOIN creator_orders o ON o.product_id = p.id AND o.status = 'completed'
      WHERE p.creator_id = $1
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `, [req.user.id]);
    res.json({ products: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── User: Mua sản phẩm ────────────────────────────────────────────────────────
router.post('/:id/buy', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const { rows: [product] } = await query(`
      SELECT cp.*, u.username AS creator_name
      FROM creator_products cp
      JOIN users u ON u.id = cp.creator_id
      WHERE cp.id = $1 AND cp.is_active = true
    `, [id]);

    if (!product) return res.status(404).json({ error: 'Sản phẩm không tồn tại' });
    if (product.creator_id === req.user.id) {
      return res.status(400).json({ error: 'Không thể mua sản phẩm của chính mình' });
    }

    // Đã mua chưa?
    const { rows: [bought] } = await query(`
      SELECT id FROM creator_orders
      WHERE product_id = $1 AND buyer_id = $2 AND status = 'completed'
    `, [id, req.user.id]);
    if (bought) return res.status(400).json({ error: 'Bạn đã mua sản phẩm này rồi' });

    const platformFee = Math.floor(product.price_mt * PLATFORM_FEE);
    const creatorReceives = product.price_mt - platformFee;
    const txKey = `product_purchase:${req.user.id}:${id}`;

    // Deduct buyer
    await LedgerService.transact({
      userId: req.user.id,
      amount: -product.price_mt,
      type: 'product_purchase',
      idempotencyKey: txKey,
      description: `Mua: ${product.title}`,
      metadata: { productId: id, creatorId: product.creator_id },
    });

    // Credit creator
    await LedgerService.transact({
      userId: product.creator_id,
      amount: creatorReceives,
      type: 'product_sale',
      idempotencyKey: `product_sale:${req.user.id}:${id}`,
      description: `Bán: ${product.title} → ${req.user.username || req.user.id}`,
      metadata: { productId: id, buyerId: req.user.id },
    });

    // Ghi order
    const { rows: [order] } = await query(`
      INSERT INTO creator_orders (product_id, buyer_id, creator_id, amount_mt, platform_fee, status)
      VALUES ($1,$2,$3,$4,$5,'completed')
      RETURNING *
    `, [id, req.user.id, product.creator_id, product.price_mt, platformFee]);

    // Tăng sold_count
    await query(`
      UPDATE creator_products SET sold_count = sold_count + 1, updated_at = NOW() WHERE id = $1
    `, [id]);

    await notify({
      userId: product.creator_id,
      type: 'system',
      title: '🛍 Bán được sản phẩm!',
      body: `Có người mua "${product.title}" — +${creatorReceives.toLocaleString()} MT`,
      metadata: { productId: id, buyerId: req.user.id },
    });

    // Activity feed — fire and forget
    postActivity({
      actorId:       req.user.id,
      actorUsername: req.user.username,
      type:          A.PRODUCT_PURCHASED,
      targetId:      id,
      targetName:    product.title,
      amountMt:      product.price_mt,
      metadata:      { creatorId: product.creator_id, productType: product.type },
    }).catch(() => {});
    checkMilestone(product.creator_id).catch(() => {});
    AchievementService.checkUserAchievements(req.user.id, { action: 'buy_product' }).catch(() => {});
    AchievementService.checkCreatorAchievements(product.creator_id, { action: 'sell_product' }).catch(() => {});

    res.json({ success: true, order, download_url: product.download_url });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Public: Danh sách sản phẩm marketplace ───────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { search, creator_id, type, sort = 'newest' } = req.query;
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 24);
    const offset = (page - 1) * limit;

    const params = [];
    const conditions = ['cp.is_active = true'];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(cp.title ILIKE $${params.length} OR u.username ILIKE $${params.length})`);
    }
    if (creator_id) {
      params.push(creator_id);
      conditions.push(`cp.creator_id = $${params.length}`);
    }
    if (type) {
      params.push(type);
      conditions.push(`cp.type = $${params.length}`);
    }

    const orderMap = {
      newest:     'cp.created_at DESC',
      popular:    'cp.sold_count DESC, cp.created_at DESC',
      price_asc:  'cp.price_mt ASC',
      price_desc: 'cp.price_mt DESC',
    };
    const orderBy = orderMap[sort] || 'cp.created_at DESC';
    const where   = 'WHERE ' + conditions.join(' AND ');

    const buyerParam = params.length + 1;
    params.push(req.user.id, limit, offset);

    const { rows } = await query(`
      SELECT cp.id, cp.title, cp.description, cp.type, cp.price_mt,
             cp.thumbnail_url, cp.sold_count, cp.created_at,
             u.id          AS creator_id,
             u.username    AS creator_name,
             u.avatar_url  AS creator_avatar,
             (bo.id IS NOT NULL) AS already_bought
      FROM creator_products cp
      JOIN users u ON u.id = cp.creator_id
      LEFT JOIN creator_orders bo
        ON bo.product_id = cp.id AND bo.buyer_id = $${buyerParam} AND bo.status = 'completed'
      ${where}
      ORDER BY ${orderBy}
      LIMIT $${buyerParam + 1} OFFSET $${buyerParam + 2}
    `, params);

    const { rows: [{ cnt }] } = await query(`
      SELECT COUNT(*)::INT AS cnt
      FROM creator_products cp
      JOIN users u ON u.id = cp.creator_id
      WHERE cp.is_active = true
    `);

    res.json({ products: rows, total: cnt, page, limit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Public: Chi tiết sản phẩm ─────────────────────────────────────────────────
router.get('/:id/detail', authMiddleware, async (req, res) => {
  try {
    const { rows: [product] } = await query(`
      SELECT cp.*,
             u.id         AS creator_id,
             u.username   AS creator_name,
             u.avatar_url AS creator_avatar,
             u.bio        AS creator_bio,
             (bo.id IS NOT NULL) AS already_bought
      FROM creator_products cp
      JOIN users u ON u.id = cp.creator_id
      LEFT JOIN creator_orders bo
        ON bo.product_id = cp.id AND bo.buyer_id = $2 AND bo.status = 'completed'
      WHERE cp.id = $1 AND cp.is_active = true
    `, [req.params.id, req.user.id]);

    if (!product) return res.status(404).json({ error: 'Sản phẩm không tồn tại' });
    res.json({ product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── User: Lịch sử mua ─────────────────────────────────────────────────────────
router.get('/my-orders', authMiddleware, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT o.id, o.amount_mt, o.platform_fee, o.created_at,
             p.title, p.type, p.thumbnail_url, p.download_url,
             u.username AS creator_name, u.avatar_url AS creator_avatar
      FROM creator_orders o
      JOIN creator_products p ON p.id = o.product_id
      JOIN users u ON u.id = o.creator_id
      WHERE o.buyer_id = $1 AND o.status = 'completed'
      ORDER BY o.created_at DESC
    `, [req.user.id]);
    res.json({ orders: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
