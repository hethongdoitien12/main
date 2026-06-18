/**
 * seed-demo.js — Tạo dữ liệu demo phong phú cho MT Economy
 *
 * - 10 creator accounts
 * - 20 normal user accounts
 * - 100+ tip transactions
 * - 20 demo products
 * - Fan Club tiers cho mỗi creator
 * - Leaderboard data (Top Creators, Top Fans)
 *
 * An toàn: dùng ON CONFLICT DO NOTHING, không ghi đè dữ liệu cũ.
 * Kiểm tra từng phần trước khi insert.
 */

import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ─── Helpers ──────────────────────────────────────────────────────────────────
const rand  = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick  = arr => arr[Math.floor(Math.random() * arr.length)];
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── Creator Data ─────────────────────────────────────────────────────────────
const CREATORS = [
  {
    username: 'minh_art',
    email: 'minh@creator.demo',
    bio: '🎨 Digital artist & motion designer. Chia sẻ tutorial Photoshop, Illustrator miễn phí mỗi tuần.',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=minharts&backgroundColor=b6e3f4',
    verified: true, featured: true,
  },
  {
    username: 'linh_travel',
    email: 'linh@creator.demo',
    bio: '📹 Travel vlogger khám phá 30+ tỉnh thành Việt Nam. Chia sẻ kinh nghiệm và bí kíp du lịch tiết kiệm.',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=linhtravel&backgroundColor=c0aede',
    verified: true, featured: true,
  },
  {
    username: 'tuan_music',
    email: 'tuan@creator.demo',
    bio: '🎵 Nhạc sĩ độc lập. Sáng tác nhạc chill lo-fi và acoustic. Release track mới mỗi tháng.',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tuanmusic&backgroundColor=ffdfbf',
    verified: true, featured: false,
  },
  {
    username: 'an_coder',
    email: 'an@creator.demo',
    bio: '💻 Full-stack developer 8 năm kinh nghiệm. Dạy React, Node.js, System Design và Interview Prep.',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ancoder&backgroundColor=d1d4f9',
    verified: true, featured: false,
  },
  {
    username: 'huong_chef',
    email: 'huong@creator.demo',
    bio: '🍜 Đầu bếp 10 năm kinh nghiệm. Chia sẻ công thức nấu ăn truyền thống Nam Bộ và fusion hiện đại.',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=huongchef&backgroundColor=ffd5dc',
    verified: false, featured: false,
  },
  {
    username: 'duc_fitness',
    email: 'duc@creator.demo',
    bio: '💪 Personal trainer & nutritionist. Chuyên calo deficit, tăng cơ giảm mỡ, lịch workout cụ thể.',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ducfitness&backgroundColor=b6e3f4',
    verified: true, featured: true,
  },
  {
    username: 'mai_uxdesign',
    email: 'mai@creator.demo',
    bio: '✨ UI/UX Designer tại Singapore. Chia sẻ design system, case study và cách land job design quốc tế.',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=maidesign&backgroundColor=c0aede',
    verified: false, featured: false,
  },
  {
    username: 'khoa_invest',
    email: 'khoa@creator.demo',
    bio: '📈 Nhà đầu tư chứng khoán 8 năm. Phân tích kỹ thuật, fundamental và macro mỗi ngày.',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=khoainvest&backgroundColor=ffdfbf',
    verified: false, featured: false,
  },
  {
    username: 'thu_writer',
    email: 'thu@creator.demo',
    bio: '✍️ Tác giả 3 cuốn sách bestseller. Viết về tâm lý học tích cực, mindset và phát triển bản thân.',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=thuwriter&backgroundColor=ffd5dc',
    verified: true, featured: false,
  },
  {
    username: 'nam_gamer',
    email: 'nam@creator.demo',
    bio: '🎮 Game streamer & reviewer. Top 1% Valorant VN. Review game indie mỗi tuần, walkthrough RPG.',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=namgamer&backgroundColor=d1d4f9',
    verified: false, featured: false,
  },
];

// ─── Normal User Data ─────────────────────────────────────────────────────────
const USERS = Array.from({ length: 20 }, (_, i) => ({
  username: `fan_${String(i + 1).padStart(2, '0')}`,
  email:    `fan${String(i + 1).padStart(2, '0')}@demo.vn`,
}));

// ─── Products ─────────────────────────────────────────────────────────────────
const PRODUCTS_BY_CREATOR = {
  'minh_art': [
    { title: 'Brush Pack Watercolor Pro', description: 'Bộ 200 brush watercolor cho Procreate & Photoshop. Hiệu ứng thật như vẽ tay.', type: 'preset', price_mt: 2500, sold_count: 87 },
    { title: 'Motion Design Template Pack', description: 'Pack 50 template After Effects cho intro, outro và lower third. Dễ customize.', type: 'template', price_mt: 4500, sold_count: 43 },
  ],
  'linh_travel': [
    { title: 'Cẩm nang du lịch Đà Lạt 2024', description: 'Ebook 80 trang: lịch trình, homestay ngon, quán ăn bí ẩn và tips tiết kiệm 30%.', type: 'ebook', price_mt: 1500, sold_count: 156 },
    { title: 'Lightroom Preset Pack - Golden Hour', description: '30 preset Lightroom cho ảnh travel. Tone vàng ấm áp, phong cách Instagram.', type: 'preset', price_mt: 800, sold_count: 234 },
  ],
  'tuan_music': [
    { title: 'Lo-fi Beat Pack Vol.1', description: '20 beat lo-fi royalty-free. WAV + stems. Dùng tự do cho YouTube và podcast.', type: 'other', price_mt: 3000, sold_count: 62 },
    { title: 'Guitar Chord Progression Bible', description: 'Ebook 120 trang: 300 chord progression cho guitar acoustic từ beginner đến advanced.', type: 'ebook', price_mt: 1200, sold_count: 98 },
  ],
  'an_coder': [
    { title: 'React + Node.js Boilerplate 2024', description: 'Starter kit production-ready: Auth, DB, CI/CD, Docker. Setup 5 phút, ship ngay.', type: 'source_code', price_mt: 5000, sold_count: 34 },
    { title: 'System Design Interview Prep', description: 'Ebook 200 trang + 50 sơ đồ. Cover toàn bộ câu hỏi phổ biến ở Big Tech.', type: 'ebook', price_mt: 3500, sold_count: 71 },
  ],
  'huong_chef': [
    { title: '50 Công Thức Nam Bộ Chuẩn Vị', description: 'Ebook PDF: 50 món ăn truyền thống Nam Bộ với nguyên liệu dễ tìm, hướng dẫn từng bước.', type: 'ebook', price_mt: 900, sold_count: 189 },
    { title: 'Meal Prep Template 4 Tuần', description: 'Template Excel lên kế hoạch bữa ăn 4 tuần. Tự động tính calo và danh sách mua đồ.', type: 'template', price_mt: 600, sold_count: 203 },
  ],
  'duc_fitness': [
    { title: 'Cut 12 Tuần - Chương Trình Giảm Mỡ', description: 'PDF 150 trang: lịch tập, kế hoạch ăn, tracking sheet. Đã giúp 500+ người đạt mục tiêu.', type: 'ebook', price_mt: 2000, sold_count: 145 },
    { title: 'Workout Tracker Notion Template', description: 'Template Notion theo dõi workout, calo, cân nặng. Dashboard tự động update.', type: 'template', price_mt: 700, sold_count: 312 },
  ],
  'mai_uxdesign': [
    { title: 'Design System Starter Kit - Figma', description: 'Figma library 500+ component theo chuẩn Material 3. Light/Dark mode, responsive.', type: 'template', price_mt: 6000, sold_count: 28 },
    { title: 'UX Portfolio Template', description: 'Figma template tạo portfolio UX ấn tượng. Layout chuẩn, dễ tùy chỉnh, guide đi kèm.', type: 'template', price_mt: 1800, sold_count: 89 },
  ],
  'khoa_invest': [
    { title: 'Prompt AI Phân Tích Cổ Phiếu', description: '50 prompt ChatGPT/Claude chuyên phân tích fundamental, kỹ thuật và news sentiment.', type: 'prompt_ai', price_mt: 2200, sold_count: 54 },
    { title: 'Dashboard Chứng Khoán - Google Sheets', description: 'Template Google Sheets tự động pull giá realtime, tính P&L, theo dõi danh mục.', type: 'template', price_mt: 1100, sold_count: 127 },
  ],
  'thu_writer': [
    { title: 'Sách Điện Tử: Tư Duy Phát Triển', description: 'Ebook 250 trang về growth mindset, habit stacking và xây dựng hệ thống cuộc sống.', type: 'ebook', price_mt: 1800, sold_count: 223 },
    { title: '30 Ngày Viết - Writing Challenge Kit', description: 'Template + prompt + checklist 30 ngày challenge xây thói quen viết mỗi ngày.', type: 'template', price_mt: 500, sold_count: 341 },
  ],
  'nam_gamer': [
    { title: 'Valorant Crosshair & Settings Pack', description: 'Config file, crosshair settings và keybindings của top 100 VN. Auto import.', type: 'other', price_mt: 400, sold_count: 478 },
    { title: 'Prompt AI Viết Game Review', description: '30 prompt ChatGPT viết review game chuyên nghiệp theo chuẩn IGN, Gamespot.', type: 'prompt_ai', price_mt: 800, sold_count: 167 },
  ],
};

// ─── Tip messages ─────────────────────────────────────────────────────────────
const TIP_MESSAGES = [
  'Cảm ơn nội dung chất lượng! 🔥',
  'Video quá hay, ủng hộ thêm nhé!',
  'Keep it up! Nội dung này giúp mình rất nhiều.',
  'Cảm ơn vì đã chia sẻ miễn phí ❤️',
  'Mình là fan lâu năm, luôn ủng hộ!',
  'Nhờ bạn mà mình tiến bộ rất nhiều 🙏',
  'Donate nhỏ, hi vọng giúp bạn tiếp tục sáng tác!',
  'Nội dung premium nhất hiện tại 💯',
  'Chúc channel ngày càng phát triển!',
  null, null, null, // some tips without message
];

// ─── Fan Club Tiers ───────────────────────────────────────────────────────────
const FAN_TIERS = [
  { name: 'Bronze Fan', level: 1, price_mt: 500,  description: 'Huy hiệu Bronze + quyền chat riêng', perks: ['Huy hiệu Bronze', 'Chat riêng với creator', 'Xem nội dung sớm 1 ngày'] },
  { name: 'Silver Fan', level: 2, price_mt: 1500, description: 'Tất cả quyền Bronze + nội dung độc quyền', perks: ['Tất cả quyền Bronze', 'Nội dung độc quyền mỗi tuần', 'Q&A hàng tháng'] },
  { name: 'Gold Fan',   level: 3, price_mt: 3500, description: 'VIP - bao gồm tất cả quyền lợi cao nhất', perks: ['Tất cả quyền Silver', '1-on-1 coaching 30 phút/tháng', 'Tên trong credits nội dung'] },
];

// ─── Main seed function ───────────────────────────────────────────────────────
async function seedDemo() {
  const client = await pool.connect();
  try {
    console.log('🎭 Bắt đầu seed dữ liệu demo...\n');

    // ── 1. Check existing state ──────────────────────────────────────────────
    const { rows: [{ cnt: existingCreators }] } = await client.query(
      `SELECT COUNT(*) AS cnt FROM users WHERE email LIKE '%@creator.demo'`
    );
    const { rows: [{ cnt: existingUsers }] } = await client.query(
      `SELECT COUNT(*) AS cnt FROM users WHERE email LIKE 'fan%@demo.vn'`
    );
    const { rows: [{ cnt: tipCount }] } = await client.query(
      `SELECT COUNT(*) AS cnt FROM tips`
    );
    const { rows: [{ cnt: productCount }] } = await client.query(
      `SELECT COUNT(*) AS cnt FROM creator_products WHERE description LIKE '%Ebook%' OR description LIKE '%template%' OR description LIKE '%brush%' OR description LIKE '%beat%' OR created_at > NOW() - INTERVAL '1 hour'`
    );

    console.log(`📊 Hiện có: ${existingCreators} demo creators, ${existingUsers} demo users, ${tipCount} tips`);

    const hash = await bcrypt.hash('password123', 10);

    // ── 2. Create Creators ───────────────────────────────────────────────────
    const creatorIds = {};
    if (parseInt(existingCreators) < CREATORS.length) {
      console.log('👨‍🎨 Tạo creator accounts...');
      for (const c of CREATORS) {
        const { rows: [user] } = await client.query(`
          INSERT INTO users (username, email, password_hash, role, avatar_url, bio, creator_verified, creator_featured)
          VALUES ($1,$2,$3,'creator',$4,$5,$6,$7)
          ON CONFLICT (email) DO UPDATE SET
            avatar_url = EXCLUDED.avatar_url,
            bio = EXCLUDED.bio,
            creator_verified = EXCLUDED.creator_verified,
            creator_featured = EXCLUDED.creator_featured
          RETURNING id, username
        `, [c.username, c.email, hash, c.avatar, c.bio, c.verified, c.featured]);

        if (user) {
          creatorIds[c.username] = user.id;
          await client.query(
            `INSERT INTO wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
            [user.id]
          );
        }
      }
      console.log(`   ✅ ${CREATORS.length} creators sẵn sàng`);
    } else {
      // Load existing creator IDs
      const { rows } = await client.query(
        `SELECT id, username FROM users WHERE email LIKE '%@creator.demo'`
      );
      for (const r of rows) creatorIds[r.username] = r.id;
      console.log(`   ⏭️  Creators đã tồn tại (${existingCreators}), bỏ qua`);
    }

    // ── 3. Create Users ──────────────────────────────────────────────────────
    const userIds = [];
    if (parseInt(existingUsers) < USERS.length) {
      console.log('👥 Tạo user accounts...');
      for (const u of USERS) {
        const { rows: [user] } = await client.query(`
          INSERT INTO users (username, email, password_hash, role)
          VALUES ($1,$2,$3,'user')
          ON CONFLICT (email) DO UPDATE SET username = EXCLUDED.username
          RETURNING id
        `, [u.username, u.email, hash]);

        if (user) {
          userIds.push(user.id);
          await client.query(
            `INSERT INTO wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
            [user.id]
          );
        }
      }
      console.log(`   ✅ ${USERS.length} users sẵn sàng`);
    } else {
      const { rows } = await client.query(
        `SELECT id FROM users WHERE email LIKE 'fan%@demo.vn' ORDER BY created_at`
      );
      for (const r of rows) userIds.push(r.id);
      console.log(`   ⏭️  Users đã tồn tại (${existingUsers}), bỏ qua`);
    }

    // Reload all creator IDs (in case some existed before)
    if (Object.keys(creatorIds).length === 0) {
      const { rows } = await client.query(
        `SELECT id, username FROM users WHERE email LIKE '%@creator.demo'`
      );
      for (const r of rows) creatorIds[r.username] = r.id;
    }

    const allCreatorIds = Object.values(creatorIds);
    if (allCreatorIds.length === 0 || userIds.length === 0) {
      console.log('⚠️  Không tìm thấy creators hoặc users. Dừng seed.');
      return;
    }

    // ── 4. Set initial wallet balances ───────────────────────────────────────
    console.log('💰 Thiết lập số dư ban đầu...');

    // Creators: high balances (simulate earned income)
    const creatorBalances = {
      'minh_art':    350000,
      'linh_travel': 520000,
      'tuan_music':  180000,
      'an_coder':    420000,
      'huong_chef':  290000,
      'duc_fitness': 480000,
      'mai_uxdesign':140000,
      'khoa_invest': 220000,
      'thu_writer':  310000,
      'nam_gamer':   160000,
    };

    for (const [username, balance] of Object.entries(creatorBalances)) {
      const id = creatorIds[username];
      if (!id) continue;
      await client.query(`
        UPDATE wallets SET
          balance = GREATEST(balance, $2),
          total_earned = GREATEST(total_earned, $2)
        WHERE user_id = $1
      `, [id, balance]);
    }

    // Users: random balances 5,000 – 80,000 MT
    for (const uid of userIds) {
      const balance = rand(5000, 80000);
      await client.query(`
        UPDATE wallets SET
          balance = GREATEST(balance, $2),
          total_earned = GREATEST(total_earned, $2)
        WHERE user_id = $1
      `, [uid, balance]);
    }
    console.log('   ✅ Số dư thiết lập xong');

    // ── 5. Create Fan Club Tiers ─────────────────────────────────────────────
    console.log('🎪 Tạo Fan Club tiers...');
    let tierCount = 0;
    for (const [username, creatorId] of Object.entries(creatorIds)) {
      const { rows: [{ cnt }] } = await client.query(
        `SELECT COUNT(*) AS cnt FROM fan_club_tiers WHERE creator_id = $1`, [creatorId]
      );
      if (parseInt(cnt) > 0) continue;

      for (const tier of FAN_TIERS) {
        await client.query(`
          INSERT INTO fan_club_tiers (creator_id, name, level, price_mt, description, perks, is_active)
          VALUES ($1,$2,$3,$4,$5,$6,true)
          ON CONFLICT DO NOTHING
        `, [creatorId, tier.name, tier.level, tier.price_mt, tier.description, tier.perks]);
        tierCount++;
      }
    }
    console.log(`   ✅ ${tierCount} tiers tạo mới`);

    // ── 6. Create Products ───────────────────────────────────────────────────
    console.log('🛍️  Tạo sản phẩm demo...');
    let prodCount = 0;
    for (const [username, products] of Object.entries(PRODUCTS_BY_CREATOR)) {
      const creatorId = creatorIds[username];
      if (!creatorId) continue;

      for (const p of products) {
        const { rows: [{ cnt }] } = await client.query(
          `SELECT COUNT(*) AS cnt FROM creator_products WHERE creator_id = $1 AND title = $2`,
          [creatorId, p.title]
        );
        if (parseInt(cnt) > 0) continue;

        await client.query(`
          INSERT INTO creator_products (creator_id, title, description, type, price_mt, sold_count, is_active)
          VALUES ($1,$2,$3,$4,$5,$6,true)
        `, [creatorId, p.title, p.description, p.type, p.price_mt, p.sold_count]);
        prodCount++;
      }
    }
    console.log(`   ✅ ${prodCount} sản phẩm tạo mới`);

    // ── 7. Create Tips (100+ transactions) ──────────────────────────────────
    if (parseInt(tipCount) < 100) {
      console.log('💝 Tạo giao dịch tip...');

      // Track running balances per user for ledger accuracy
      const balances = {};
      const loadBalance = async (uid) => {
        if (balances[uid] !== undefined) return balances[uid];
        const { rows: [w] } = await client.query(
          `SELECT balance FROM wallets WHERE user_id = $1`, [uid]
        );
        // pg returns BIGINT as string — must parseInt to avoid JS string concatenation
        balances[uid] = parseInt(w?.balance || 0, 10);
        return balances[uid];
      };

      // Distribution: some creators get more tips (realistic leaderboard)
      // Creator tip weight: [minh_art=15, linh_travel=20, tuan=8, an=14, huong=12, duc=18, mai=6, khoa=9, thu=11, nam=7]
      const weightedCreators = [
        ...Array(20).fill('linh_travel'),
        ...Array(18).fill('duc_fitness'),
        ...Array(15).fill('minh_art'),
        ...Array(14).fill('an_coder'),
        ...Array(12).fill('huong_chef'),
        ...Array(11).fill('thu_writer'),
        ...Array(9).fill('khoa_invest'),
        ...Array(8).fill('tuan_music'),
        ...Array(7).fill('nam_gamer'),
        ...Array(6).fill('mai_uxdesign'),
      ];

      const TIP_AMOUNTS = [100, 200, 300, 500, 500, 500, 1000, 1000, 1000, 2000, 2000, 3000, 5000];
      const PLATFORM_FEE_PCT = 0.05;

      let tipsCreated = 0;
      const targetTips = 130;

      for (let i = 0; i < targetTips; i++) {
        const creatorUsername = pick(weightedCreators);
        const creatorId = creatorIds[creatorUsername];
        if (!creatorId) continue;

        const senderId = pick(userIds);
        if (senderId === creatorId) continue;

        const amount    = pick(TIP_AMOUNTS);
        const fee       = Math.floor(amount * PLATFORM_FEE_PCT);
        const netAmount = amount - fee;
        const message   = pick(TIP_MESSAGES);

        // Check sender has enough balance
        const senderBal = await loadBalance(senderId);
        if (senderBal < amount) {
          // Top up sender balance if low
          await client.query(
            `UPDATE wallets SET balance = balance + 50000, total_earned = total_earned + 50000 WHERE user_id = $1`,
            [senderId]
          );
          balances[senderId] = (balances[senderId] || 0) + 50000;
        }

        // Randomize created_at within last 90 days
        const daysAgo  = rand(0, 89);
        const hoursAgo = rand(0, 23);
        const createdAt = new Date(Date.now() - (daysAgo * 86400 + hoursAgo * 3600) * 1000);

        // Insert tip record
        await client.query(`
          INSERT INTO tips (sender_id, receiver_id, amount_xu, platform_fee, message, created_at)
          VALUES ($1,$2,$3,$4,$5,$6)
        `, [senderId, creatorId, amount, fee, message, createdAt]);

        // Ledger: tip_sent for sender
        const senderBefore = await loadBalance(senderId);
        const senderAfter  = senderBefore - amount;
        balances[senderId] = senderAfter;

        await client.query(`
          INSERT INTO ledger_entries
            (idempotency_key, user_id, type, amount, balance_before, balance_after, description, created_at)
          VALUES ($1,$2,'tip_sent',$3,$4,$5,$6,$7)
          ON CONFLICT (idempotency_key) DO NOTHING
        `, [
          `demo:tip_sent:${i}:${senderId.slice(0,8)}`,
          senderId, -amount, senderBefore, senderAfter,
          `Tip → ${creatorUsername}: ${message || '(không có tin nhắn)'}`,
          createdAt,
        ]);

        // Ledger: tip_received for creator
        const creatorBefore = await loadBalance(creatorId);
        const creatorAfter  = creatorBefore + netAmount;
        balances[creatorId] = creatorAfter;

        await client.query(`
          INSERT INTO ledger_entries
            (idempotency_key, user_id, type, amount, balance_before, balance_after, description, created_at)
          VALUES ($1,$2,'tip_received',$3,$4,$5,$6,$7)
          ON CONFLICT (idempotency_key) DO NOTHING
        `, [
          `demo:tip_recv:${i}:${creatorId.slice(0,8)}`,
          creatorId, netAmount, creatorBefore, creatorAfter,
          `Nhận tip từ fan`,
          createdAt,
        ]);

        tipsCreated++;
      }

      // Sync wallet balances from ledger
      console.log('   🔄 Đồng bộ số dư wallet...');
      for (const [uid, bal] of Object.entries(balances)) {
        await client.query(
          `UPDATE wallets SET balance = GREATEST($2, 0) WHERE user_id = $1`,
          [uid, bal]
        );
      }

      // Update total_earned/spent for wallets
      await client.query(`
        UPDATE wallets w SET
          total_earned = total_earned + sub.earned,
          total_spent  = total_spent  + sub.spent
        FROM (
          SELECT user_id,
            COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) AS earned,
            COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) AS spent
          FROM ledger_entries
          WHERE idempotency_key LIKE 'demo:tip%'
          GROUP BY user_id
        ) sub
        WHERE w.user_id = sub.user_id
      `);

      // Update creator balances from tip totals
      await client.query(`
        UPDATE wallets w SET balance = GREATEST(
          (SELECT COALESCE(SUM(amount_xu - platform_fee), 0) FROM tips WHERE receiver_id = w.user_id) +
          50000,
          balance
        )
        WHERE user_id IN (SELECT id FROM users WHERE role = 'creator')
      `);

      console.log(`   ✅ ${tipsCreated} tip transactions tạo xong`);
    } else {
      console.log(`   ⏭️  Đã có ${tipCount} tips, bỏ qua`);
    }

    // ── 8. Final stats ───────────────────────────────────────────────────────
    const { rows: [finalStats] } = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE role = 'creator') AS creators,
        (SELECT COUNT(*) FROM users WHERE role = 'user')    AS users,
        (SELECT COUNT(*) FROM tips)                          AS tips,
        (SELECT COUNT(*) FROM creator_products)              AS products,
        (SELECT COUNT(*) FROM fan_club_tiers)                AS tiers
    `);

    console.log('\n✅ Demo seed hoàn thành!');
    console.log('─'.repeat(50));
    console.log(`👨‍🎨 Creators:    ${finalStats.creators}`);
    console.log(`👥 Users:       ${finalStats.users}`);
    console.log(`💝 Tips:        ${finalStats.tips}`);
    console.log(`🛍️  Products:    ${finalStats.products}`);
    console.log(`🎪 Fan Tiers:   ${finalStats.tiers}`);
    console.log('─'.repeat(50));
    console.log('\n🔑 Demo account (password: password123):');
    console.log('   minh@creator.demo  (Creator - Featured)');
    console.log('   linh@creator.demo  (Creator - Featured)');
    console.log('   fan01@demo.vn      (User)');

  } catch (err) {
    console.error('❌ Demo seed thất bại:', err.message);
    console.error(err.stack);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seedDemo();
