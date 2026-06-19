/**
 * seed-demo.js — Dữ liệu demo thực tế cho MT Economy
 * Chạy: npm run seed-demo
 *
 * An toàn: idempotent — kiểm tra email @demo.mt trước khi insert,
 * không bao giờ ghi đè tài khoản thật.
 */

import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/xu_economy' });

const rand  = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick  = (arr)      => arr[Math.floor(Math.random() * arr.length)];
const randDate = (maxDays = 30) =>
  new Date(Date.now() - rand(0, maxDays * 24 * 3600 * 1000));
const avatar = (seed) =>
  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;

async function seedDemo() {
  const client = await pool.connect();
  try {
    // ── Idempotency check ─────────────────────────────────────────────────
    const { rows: [ex] } = await client.query(
      "SELECT COUNT(*) AS c FROM users WHERE email LIKE '%@demo.mt'"
    );
    if (parseInt(ex.c) > 0) {
      console.log(`⏭️  Demo data đã tồn tại (${ex.c} users @demo.mt). Bỏ qua.`);
      await pool.end();
      return;
    }

    await client.query('BEGIN');
    const hash = await bcrypt.hash('password123', 10);

    // balances map — theo dõi số dư running để tính balance_before/after
    const balances = new Map();

    // ─────────────────────────────────────────────────────────────────────
    // 1. CREATORS — 10 tài khoản demo
    // ─────────────────────────────────────────────────────────────────────
    const creatorData = [
      { username: 'creator_linh',  email: 'linh@demo.mt',  initBalance: 185_000, verified: true,  featured: true,
        bio: 'Content creator chuyên lifestyle & beauty. Chia sẻ mẹo trang điểm, skincare thuần Việt. 50K+ followers.' },
      { username: 'creator_huy',   email: 'huy@demo.mt',   initBalance: 142_000, verified: true,  featured: false,
        bio: 'Full-stack developer 6 năm kinh nghiệm. Chia sẻ tutorial React, Node.js và DevOps miễn phí mỗi tuần.' },
      { username: 'creator_khoa',  email: 'khoa@demo.mt',  initBalance: 320_000, verified: true,  featured: true,
        bio: 'YouTuber tài chính cá nhân & đầu tư. Đã giúp 100K+ bạn trẻ đạt tự do tài chính từ từng đồng lương.' },
      { username: 'creator_mai',   email: 'mai@demo.mt',   initBalance:  98_000, verified: true,  featured: false,
        bio: 'Nhiếp ảnh gia tự do 8 năm. Chuyên ảnh sản phẩm & ảnh cưới. Chia sẻ preset Lightroom free hàng tuần.' },
      { username: 'creator_anh',   email: 'anh@demo.mt',   initBalance:  75_000, verified: false, featured: false,
        bio: 'Giáo viên IELTS 8.0. Chia sẻ tài liệu, flashcard và lộ trình học tiếng Anh hiệu quả cho người đi làm.' },
      { username: 'creator_trang', email: 'trang@demo.mt', initBalance: 115_000, verified: true,  featured: false,
        bio: 'UX/UI Designer 4 năm tại startup. Bán template Figma, design system & hướng dẫn thiết kế sản phẩm số.' },
      { username: 'creator_duc',   email: 'duc@demo.mt',   initBalance:  58_000, verified: false, featured: false,
        bio: 'Indie game developer. Tạo tool, plugin & hướng dẫn Unity/Godot cho beginner từ zero đến có game đầu tay.' },
      { username: 'creator_hong',  email: 'hong@demo.mt',  initBalance:  42_000, verified: false, featured: false,
        bio: 'Blogger ẩm thực & du lịch. Chia sẻ công thức nấu ăn và review trải dài 30+ tỉnh thành Việt Nam.' },
      { username: 'creator_minh',  email: 'minh@demo.mt',  initBalance: 174_000, verified: true,  featured: false,
        bio: 'Chuyên gia marketing digital 10 năm. Tư vấn chiến lược content, SEO & quảng cáo Google/Meta cho doanh nghiệp.' },
      { username: 'creator_tuyen', email: 'tuyen@demo.mt', initBalance:  81_000, verified: false, featured: false,
        bio: 'Nhạc sĩ & music producer độc lập. Chia sẻ beat, sample pack và hướng dẫn sản xuất âm nhạc digital từ A–Z.' },
    ];

    const demoCreators = [];
    for (const c of creatorData) {
      const { rows: [u] } = await client.query(`
        INSERT INTO users (username, email, password_hash, role, avatar_url, bio, creator_verified, creator_featured)
        VALUES ($1,$2,$3,'creator',$4,$5,$6,$7) RETURNING id
      `, [c.username, c.email, hash, avatar(c.username), c.bio, c.verified, c.featured]);

      await client.query(
        'INSERT INTO wallets (user_id, balance, total_earned) VALUES ($1,$2,$2)',
        [u.id, c.initBalance]
      );
      balances.set(u.id, c.initBalance);
      demoCreators.push({ id: u.id, username: c.username });
    }

    // Đưa creator_nam thật vào pool (không sửa balance)
    const { rows: [realNam] } = await client.query(
      "SELECT id FROM users WHERE email='nam@creator.vn'"
    );
    const allCreators = [...demoCreators];
    if (realNam) {
      const { rows: [w] } = await client.query(
        'SELECT balance FROM wallets WHERE user_id=$1', [realNam.id]
      );
      balances.set(realNam.id, parseInt(w?.balance ?? 0));
      allCreators.push({ id: realNam.id, username: 'creator_nam' });
    }

    console.log(`✅ Tạo ${demoCreators.length} creator demo`);

    // ─────────────────────────────────────────────────────────────────────
    // 2. USERS — 20 tài khoản demo
    // ─────────────────────────────────────────────────────────────────────
    const demoUsers = [];
    for (let i = 1; i <= 20; i++) {
      const idx      = String(i).padStart(2, '0');
      const username = `user_demo_${idx}`;
      const email    = `user${idx}@demo.mt`;
      const initBal  = rand(500, 50_000);

      const { rows: [u] } = await client.query(`
        INSERT INTO users (username, email, password_hash, role, avatar_url)
        VALUES ($1,$2,$3,'user',$4) RETURNING id
      `, [username, email, hash, avatar(username)]);

      await client.query(
        'INSERT INTO wallets (user_id, balance, total_earned, total_spent) VALUES ($1,$2,$2,0)',
        [u.id, initBal]
      );
      balances.set(u.id, initBal);
      demoUsers.push(u.id);
    }

    // Đưa user_linh thật vào pool (không sửa balance)
    const { rows: [realLinh] } = await client.query(
      "SELECT id FROM users WHERE email='linh@user.vn'"
    );
    const allUsers = [...demoUsers];
    if (realLinh) {
      const { rows: [w] } = await client.query(
        'SELECT balance FROM wallets WHERE user_id=$1', [realLinh.id]
      );
      balances.set(realLinh.id, parseInt(w?.balance ?? 0));
      allUsers.push(realLinh.id);
    }

    console.log(`✅ Tạo ${demoUsers.length} user demo`);

    // ─────────────────────────────────────────────────────────────────────
    // 3. FAN CLUB TIERS — mỗi creator 3 tier
    // ─────────────────────────────────────────────────────────────────────
    // level là SMALLINT: 1=Bronze, 2=Silver, 3=Gold (constraint UNIQUE creator_id,level)
    const tierDefs = [
      { name: 'Bronze', level: 1, price: 200,
        description: 'Trở thành fan cơ bản — ủng hộ creator mỗi tháng',
        perks: ['Huy hiệu Bronze', 'Truy cập nội dung độc quyền'] },
      { name: 'Silver', level: 2, price: 500,
        description: 'Fan cấp bạc — nhiều đặc quyền hơn',
        perks: ['Huy hiệu Silver', 'Discord VIP channel', 'Behind-the-scenes content'] },
      { name: 'Gold', level: 3, price: 1000,
        description: 'Top fan — đặc quyền cao cấp nhất',
        perks: ['Huy hiệu Gold ✨', 'Video call 1-1 hàng tháng', 'Tất cả nội dung độc quyền', 'Shoutout trang cá nhân'] },
    ];

    const tierMap = {}; // creatorId -> { 1: uuid, 2: uuid, 3: uuid }

    for (const creator of allCreators) {
      const { rows: [cnt] } = await client.query(
        'SELECT COUNT(*) AS c FROM fan_club_tiers WHERE creator_id=$1', [creator.id]
      );
      tierMap[creator.id] = {};

      if (parseInt(cnt.c) >= 3) {
        // Load existing tiers
        const { rows: existing } = await client.query(
          'SELECT id, level FROM fan_club_tiers WHERE creator_id=$1', [creator.id]
        );
        for (const t of existing) tierMap[creator.id][t.level] = t.id;
        continue;
      }

      for (const t of tierDefs) {
        const { rows: [tier] } = await client.query(`
          INSERT INTO fan_club_tiers (creator_id, name, level, price_mt, description, perks)
          VALUES ($1,$2,$3,$4,$5,$6)
          ON CONFLICT (creator_id, level)
          DO UPDATE SET name=EXCLUDED.name
          RETURNING id
        `, [creator.id, t.name, t.level, t.price, t.description, t.perks]);
        tierMap[creator.id][t.level] = tier.id;
      }
    }

    console.log('✅ Tạo fan club tiers');

    // ─────────────────────────────────────────────────────────────────────
    // 4. TIPS — 100 giao dịch trong 30 ngày qua
    // ─────────────────────────────────────────────────────────────────────
    const TIP_FEE_PCT = 0.05;
    const tipAmounts  = [50, 100, 200, 500, 1_000, 2_000, 5_000];
    const tipMsgs     = [
      'Cảm ơn content hay quá! 🔥', 'Ủng hộ creator yêu thích ❤️',
      'Video hôm nay rất hữu ích!',  'Tiếp tục làm content hay nha!',
      'Fan của anh/chị từ ngày đầu!', null, null, null,
    ];

    // Top-up demo users để đủ tiền tip
    for (const uid of demoUsers) {
      await client.query(
        'UPDATE wallets SET balance=balance+80000, total_earned=total_earned+80000 WHERE user_id=$1',
        [uid]
      );
      balances.set(uid, (balances.get(uid) ?? 0) + 80_000);
    }

    // Build & sort events theo ngày để balance_before/after đúng thứ tự
    const tipEvents = Array.from({ length: 100 }, () => ({
      senderId: pick(demoUsers),
      creator:  pick(allCreators),
      amount:   pick(tipAmounts),
      date:     randDate(30),
      msg:      pick(tipMsgs),
    })).sort((a, b) => a.date - b.date);

    let tipsCreated = 0;
    for (const ev of tipEvents) {
      const { senderId, creator, amount, date, msg } = ev;
      const fee      = Math.floor(amount * TIP_FEE_PCT);
      const receives = amount - fee;
      const sbal     = balances.get(senderId) ?? 0;
      const cbal     = balances.get(creator.id) ?? 0;
      if (sbal < amount) continue;

      const { rows: [tipRow] } = await client.query(`
        INSERT INTO tips (sender_id, receiver_id, amount_xu, platform_fee, message, created_at)
        VALUES ($1,$2,$3,$4,$5,$6) RETURNING id
      `, [senderId, creator.id, amount, fee, msg, date]);

      await client.query(`
        INSERT INTO ledger_entries
          (idempotency_key, user_id, type, amount, balance_before, balance_after, description, created_at)
        VALUES ($1,$2,'tip_sent',$3,$4,$5,$6,$7)
        ON CONFLICT (idempotency_key) DO NOTHING
      `, [`demo:tip_sent:${tipRow.id}`, senderId, -amount, sbal, sbal - amount,
          `Tip creator ${creator.username}`, date]);
      balances.set(senderId, sbal - amount);

      await client.query(`
        INSERT INTO ledger_entries
          (idempotency_key, user_id, type, amount, balance_before, balance_after, description, created_at)
        VALUES ($1,$2,'tip_received',$3,$4,$5,$6,$7)
        ON CONFLICT (idempotency_key) DO NOTHING
      `, [`demo:tip_recv:${tipRow.id}`, creator.id, receives, cbal, cbal + receives,
          `Nhận tip từ fan`, date]);
      balances.set(creator.id, cbal + receives);

      tipsCreated++;
    }

    console.log(`✅ Tạo ${tipsCreated} tips`);

    // ─────────────────────────────────────────────────────────────────────
    // 5. FAN CLUB MEMBERSHIPS — ~50 đăng ký
    // ─────────────────────────────────────────────────────────────────────
    const FANCLUB_FEE_PCT  = 0.10;
    const tierPriceByLevel = { 1: 200, 2: 500, 3: 1_000 };
    const usedMemPairs     = new Set();
    let   membershipsCreated = 0;

    // Top-up thêm
    for (const uid of demoUsers) {
      await client.query('UPDATE wallets SET balance=balance+30000 WHERE user_id=$1', [uid]);
      balances.set(uid, (balances.get(uid) ?? 0) + 30_000);
    }

    for (let attempt = 0; attempt < 150 && membershipsCreated < 50; attempt++) {
      const userId  = pick(demoUsers);
      const creator = pick(allCreators);
      const level   = pick([1, 2, 3]);
      const pairKey = `${userId}:${creator.id}`;
      if (usedMemPairs.has(pairKey) || !tierMap[creator.id]?.[level]) continue;

      const price           = tierPriceByLevel[level];
      const ubal            = balances.get(userId) ?? 0;
      if (ubal < price) continue;
      const creatorReceives = Math.floor(price * (1 - FANCLUB_FEE_PCT));
      const fee             = price - creatorReceives;
      const cbal            = balances.get(creator.id) ?? 0;
      const startDate       = randDate(25);
      const expireDate      = new Date(startDate.getTime() + 30 * 24 * 3600 * 1000);
      const status          = expireDate > new Date() ? 'active' : 'expired';
      const tierId          = tierMap[creator.id][level];
      const tierName        = ['', 'Bronze', 'Silver', 'Gold'][level];

      usedMemPairs.add(pairKey);

      const { rows: [mem] } = await client.query(`
        INSERT INTO fan_club_memberships
          (user_id, creator_id, tier_id, status, started_at, expires_at, auto_renew)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT (user_id, creator_id) DO NOTHING
        RETURNING id
      `, [userId, creator.id, tierId, status, startDate, expireDate, Math.random() > 0.4]);
      if (!mem) continue;

      await client.query(`
        INSERT INTO fan_club_payments
          (membership_id, user_id, creator_id, tier_id, amount_mt, platform_fee, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
      `, [mem.id, userId, creator.id, tierId, price, fee, startDate]);

      // Ledger
      await client.query(`
        INSERT INTO ledger_entries
          (idempotency_key, user_id, type, amount, balance_before, balance_after, description, created_at)
        VALUES ($1,$2,'membership_purchase',$3,$4,$5,$6,$7)
        ON CONFLICT (idempotency_key) DO NOTHING
      `, [`demo:mem_buy:${mem.id}`, userId, -price, ubal, ubal - price,
          `Fan Club ${tierName} – ${creator.username}`, startDate]);
      balances.set(userId, ubal - price);

      await client.query(`
        INSERT INTO ledger_entries
          (idempotency_key, user_id, type, amount, balance_before, balance_after, description, created_at)
        VALUES ($1,$2,'membership_received',$3,$4,$5,$6,$7)
        ON CONFLICT (idempotency_key) DO NOTHING
      `, [`demo:mem_recv:${mem.id}`, creator.id, creatorReceives, cbal, cbal + creatorReceives,
          `Fan Club ${tierName} payment`, startDate]);
      balances.set(creator.id, cbal + creatorReceives);

      membershipsCreated++;
    }

    console.log(`✅ Tạo ${membershipsCreated} fan club memberships`);

    // ─────────────────────────────────────────────────────────────────────
    // 6. PRODUCTS — 20 sản phẩm (5 ebook + 4 template + 4 source_code + 4 prompt_ai + 3 preset)
    // ─────────────────────────────────────────────────────────────────────
    const productCatalog = [
      // ── Ebooks ──────────────────────────────────────────────────────────
      { title: 'ChatGPT Prompt Engineering Tiếng Việt', type: 'ebook', price: 500,
        desc: '60 trang, 200+ prompt mẫu theo ngành nghề: marketing, lập trình, học tập, kinh doanh. Kèm bài tập thực hành.',
        sold: rand(35, 120), dl: 'https://files.demo.mt/chatgpt-prompt-viet.pdf' },
      { title: 'Tự Học Python Trong 30 Ngày', type: 'ebook', price: 800,
        desc: '200 trang học Python từ zero. Bài tập từng chương, 5 project thực tế, quiz cuối bài, chứng chỉ hoàn thành.',
        sold: rand(20,  80), dl: 'https://files.demo.mt/python-30days.pdf' },
      { title: 'Marketing 0 Đồng Cho Startup Việt', type: 'ebook', price: 300,
        desc: 'Chiến lược marketing ngân sách tối thiểu. Case study từ 7 startup Việt thành công, template kế hoạch marketing.',
        sold: rand(50, 180), dl: 'https://files.demo.mt/marketing-startup.pdf' },
      { title: 'Bí Quyết Chụp Ảnh iPhone Như Pro', type: 'ebook', price: 400,
        desc: 'Kỹ thuật composition, ánh sáng, màu sắc, chỉnh sửa ảnh trên điện thoại. Phù hợp mọi iPhone từ 11 trở lên.',
        sold: rand(25,  90), dl: 'https://files.demo.mt/iphone-photo.pdf' },
      { title: 'Đầu Tư Chứng Khoán Từ Số 0', type: 'ebook', price: 650,
        desc: 'Lộ trình đầu tư cho người mới: mở tài khoản, chọn cổ phiếu, quản lý rủi ro. Kèm spreadsheet theo dõi danh mục.',
        sold: rand(15,  60), dl: 'https://files.demo.mt/stock-investment.pdf' },
      // ── Templates ───────────────────────────────────────────────────────
      { title: 'React Admin Dashboard Template Pro', type: 'template', price: 2500,
        desc: 'React 18 + Tailwind CSS. Dark/light mode, 25+ components, biểu đồ Recharts, bảng dữ liệu. Responsive toàn thiết bị.',
        sold: rand(8,  40), dl: 'https://files.demo.mt/react-admin-pro.zip' },
      { title: 'Figma Landing Page Kit 2025', type: 'template', price: 1500,
        desc: '18 section templates, 80+ components tái sử dụng, auto layout, variables cho dark/light mode. Thích hợp SaaS & startup.',
        sold: rand(12, 55), dl: 'https://files.demo.mt/figma-landing-kit.zip' },
      { title: 'Next.js SaaS Boilerplate Full Stack', type: 'template', price: 3500,
        desc: 'Next.js 14: Auth (NextAuth), Stripe payments, PostgreSQL, email, dashboard, CI/CD GitHub Actions. Tiết kiệm 150+ giờ setup.',
        sold: rand(5,  25), dl: 'https://files.demo.mt/nextjs-saas-starter.zip' },
      { title: 'Notion Workspace Freelancer & Creator', type: 'template', price: 600,
        desc: 'Workspace Notion: dự án, client CRM, tài chính cá nhân, content calendar, habit tracker. 1-click duplicate.',
        sold: rand(30, 120), dl: 'https://files.demo.mt/notion-freelancer.zip' },
      // ── Source Code ─────────────────────────────────────────────────────
      { title: 'Discord Bot Đa Năng — Node.js + TypeScript', type: 'source_code', price: 5000,
        desc: '40+ lệnh: music stream, moderation, mini game RPG, kinh tế ảo, welcome system. MIT License. Hướng dẫn deploy Railway.',
        sold: rand(6,  30), dl: 'https://files.demo.mt/discord-bot-ts.zip' },
      { title: 'AI Chatbot Tư Vấn — Python + FastAPI', type: 'source_code', price: 4500,
        desc: 'GPT-4 Turbo, multi-turn conversation, lưu lịch sử, stream response, export PDF. UI React đẹp. Deploy-ready Docker.',
        sold: rand(4,  20), dl: 'https://files.demo.mt/ai-chatbot-python.zip' },
      { title: 'E-Commerce REST API — Express + PostgreSQL', type: 'source_code', price: 6000,
        desc: 'Production-ready: JWT, RBAC, products CRUD, cart, orders, Stripe, email notifications. Jest tests 85%+ coverage.',
        sold: rand(3,  15), dl: 'https://files.demo.mt/ecommerce-api.zip' },
      { title: 'Telegram Bot Quản Lý Cộng Đồng', type: 'source_code', price: 2000,
        desc: 'Anti-spam thông minh, welcome message, thống kê thành viên, mini game, hệ thống điểm thưởng. Python 3.11.',
        sold: rand(10, 50), dl: 'https://files.demo.mt/telegram-community-bot.zip' },
      // ── Prompt AI ───────────────────────────────────────────────────────
      { title: 'Midjourney Prompt Pack — Aesthetic Việt Nam', type: 'prompt_ai', price: 300,
        desc: '200 prompt MJ v6 phong cách aesthetic VN: người, phong cảnh, ẩm thực, kiến trúc. Kèm hướng dẫn chỉnh style & seed.',
        sold: rand(40, 200), dl: 'https://files.demo.mt/midjourney-vn-prompts.txt' },
      { title: '500 Prompt Viết Content Social Media', type: 'prompt_ai', price: 200,
        desc: '500 prompt AI cho Facebook, Instagram, TikTok. Chia 20 ngành hàng: F&B, thời trang, giáo dục, làm đẹp...',
        sold: rand(60, 250), dl: 'https://files.demo.mt/social-content-prompts.txt' },
      { title: 'Prompt Pack SEO & Copywriting Pro', type: 'prompt_ai', price: 400,
        desc: '300 prompt tối ưu SEO: meta tags, blog, product description, FAQ. Tested với Claude 3.5 & GPT-4o.',
        sold: rand(20,  90), dl: 'https://files.demo.mt/seo-copywriting-prompts.txt' },
      { title: 'AI Business Analyst — Bộ Công Cụ Phân Tích', type: 'prompt_ai', price: 600,
        desc: '150 prompt phân tích kinh doanh: SWOT, Porter 5 Forces, market sizing, OKR, pitch deck. Kèm template Google Sheet.',
        sold: rand(10,  45), dl: 'https://files.demo.mt/business-analyst-prompts.txt' },
      // ── Presets ─────────────────────────────────────────────────────────
      { title: 'Lightroom Preset Pack — Moody Film Look', type: 'preset', price: 700,
        desc: '50 preset phong cách film moody: tông trầm vintage, màu xanh lá, amber warm. Hỗ trợ Desktop CC & Mobile.',
        sold: rand(15,  70), dl: 'https://files.demo.mt/moody-film-presets.zip' },
      { title: 'VSCO Filter Pack — Korean Pastel Style', type: 'preset', price: 350,
        desc: '35 filter VSCO phong cách Hàn Quốc pastel. Tông trắng tinh, hồng phấn, lavender. Selfie, flat lay, lifestyle.',
        sold: rand(25, 110), dl: 'https://files.demo.mt/korean-vsco-pack.zip' },
      { title: 'DaVinci Resolve LUT Pack — Cinematic Video', type: 'preset', price: 900,
        desc: '25 LUT cinematic cho DaVinci. Grade phim Hollywood, travel vlog, wedding film. Kèm project file mẫu + hướng dẫn.',
        sold: rand(8,   35), dl: 'https://files.demo.mt/davinci-lut-cinematic.zip' },
    ];

    const demoProducts = [];
    for (let i = 0; i < productCatalog.length; i++) {
      const p       = productCatalog[i];
      const creator = allCreators[i % allCreators.length];

      const { rows: [prod] } = await client.query(`
        INSERT INTO creator_products
          (creator_id, title, description, type, price_mt, download_url, sold_count, is_active)
        VALUES ($1,$2,$3,$4,$5,$6,$7,true) RETURNING id
      `, [creator.id, p.title, p.desc, p.type, p.price, p.dl, p.sold]);

      demoProducts.push({ id: prod.id, creatorId: creator.id, price: p.price, title: p.title });
    }

    console.log(`✅ Tạo ${demoProducts.length} sản phẩm demo`);

    // ─────────────────────────────────────────────────────────────────────
    // 7. ORDERS — 50 lượt mua
    // ─────────────────────────────────────────────────────────────────────
    const PRODUCT_FEE_PCT = 0.10;
    const usedOrderPairs  = new Set();

    // Đánh dấu orders thật của realLinh đã có
    if (realLinh) {
      const { rows: existOrders } = await client.query(
        'SELECT product_id FROM creator_orders WHERE buyer_id=$1', [realLinh.id]
      );
      for (const o of existOrders) usedOrderPairs.add(`${realLinh.id}:${o.product_id}`);
    }

    // Top-up cho đủ tiền mua
    for (const uid of demoUsers) {
      await client.query('UPDATE wallets SET balance=balance+50000 WHERE user_id=$1', [uid]);
      balances.set(uid, (balances.get(uid) ?? 0) + 50_000);
    }

    let ordersCreated = 0;
    const orderPool = Array.from({ length: 250 }, () => ({
      userId:  pick(demoUsers),
      product: pick(demoProducts),
      date:    randDate(30),
    })).sort((a, b) => a.date - b.date);

    for (const o of orderPool) {
      if (ordersCreated >= 50) break;
      const { userId, product, date } = o;
      const pairKey = `${userId}:${product.id}`;
      if (usedOrderPairs.has(pairKey)) continue;
      const ubal = balances.get(userId) ?? 0;
      if (ubal < product.price) continue;

      const fee             = Math.floor(product.price * PRODUCT_FEE_PCT);
      const creatorReceives = product.price - fee;
      const cbal            = balances.get(product.creatorId) ?? 0;

      usedOrderPairs.add(pairKey);

      await client.query(`
        INSERT INTO creator_orders
          (product_id, buyer_id, creator_id, amount_mt, platform_fee, status, created_at)
        VALUES ($1,$2,$3,$4,$5,'completed',$6)
        ON CONFLICT (product_id, buyer_id) DO NOTHING
      `, [product.id, userId, product.creatorId, product.price, fee, date]);

      await client.query(`
        INSERT INTO ledger_entries
          (idempotency_key, user_id, type, amount, balance_before, balance_after, description, created_at)
        VALUES ($1,$2,'product_purchase',$3,$4,$5,$6,$7)
        ON CONFLICT (idempotency_key) DO NOTHING
      `, [`demo:prod_buy:${userId}:${product.id}`, userId,
          -product.price, ubal, ubal - product.price,
          `Mua: ${product.title}`, date]);
      balances.set(userId, ubal - product.price);

      await client.query(`
        INSERT INTO ledger_entries
          (idempotency_key, user_id, type, amount, balance_before, balance_after, description, created_at)
        VALUES ($1,$2,'product_sale',$3,$4,$5,$6,$7)
        ON CONFLICT (idempotency_key) DO NOTHING
      `, [`demo:prod_sale:${userId}:${product.id}`, product.creatorId,
          creatorReceives, cbal, cbal + creatorReceives,
          `Bán: ${product.title}`, date]);
      balances.set(product.creatorId, cbal + creatorReceives);

      ordersCreated++;
    }

    console.log(`✅ Tạo ${ordersCreated} đơn mua hàng`);

    // ─────────────────────────────────────────────────────────────────────
    // 8. SYNC WALLET BALANCES
    // ─────────────────────────────────────────────────────────────────────
    for (const [userId, bal] of balances.entries()) {
      await client.query(
        'UPDATE wallets SET balance=$2 WHERE user_id=$1',
        [userId, Math.max(0, bal)]
      );
    }

    // total_earned cho creators
    for (const creator of allCreators) {
      await client.query(`
        UPDATE wallets SET total_earned = COALESCE((
          SELECT SUM(amount) FROM ledger_entries WHERE user_id=$1 AND amount > 0
        ), 0) WHERE user_id=$1
      `, [creator.id]);
    }

    // total_spent cho users
    for (const uid of demoUsers) {
      await client.query(`
        UPDATE wallets SET total_spent = COALESCE((
          SELECT SUM(ABS(amount)) FROM ledger_entries WHERE user_id=$1 AND amount < 0
        ), 0) WHERE user_id=$1
      `, [uid]);
    }

    // ─────────────────────────────────────────────────────────────────────
    // 9. NOTIFICATIONS — mỗi user/creator 3–6 thông báo mẫu
    // ─────────────────────────────────────────────────────────────────────
    const notifPool = [
      { title: '🎁 Bạn vừa nhận được tip mới!',          body: 'Có người vừa tặng bạn MT. Cảm ơn fan của bạn rất nhiều!' },
      { title: '👑 Thành viên Fan Club mới',              body: 'Một người dùng vừa tham gia Fan Club của bạn. Hãy chào mừng họ!' },
      { title: '🛒 Sản phẩm của bạn được mua',           body: 'Ai đó vừa mua sản phẩm của bạn. Kiểm tra doanh thu ngay!' },
      { title: '✅ Hoàn thành nhiệm vụ hôm nay',         body: 'Bạn đã hoàn thành nhiệm vụ và nhận 100 MT thưởng.' },
      { title: '🔥 Streak 7 ngày check-in liên tiếp!',   body: 'Tuyệt vời! Bạn nhận thêm 200 MT bonus. Giữ vững streak nhé!' },
      { title: '💰 MT khuyến mãi sắp hết hạn',           body: 'Bạn có MT khuyến mãi sắp hết hạn sau 7 ngày. Hãy dùng trước khi quá hạn!' },
      { title: '🎉 Chào mừng đến MT Economy!',           body: 'Tài khoản sẵn sàng rồi! Khám phá creator và bắt đầu hành trình của bạn.' },
      { title: '⭐ Creator được xác minh',               body: 'Chúc mừng! Tài khoản creator của bạn đã được ban quản trị xác minh.' },
      { title: '💎 Fan Club gia hạn thành công',         body: 'Membership của bạn vừa được gia hạn tự động thêm 30 ngày.' },
      { title: '📦 Creator yêu thích có sản phẩm mới',  body: 'Creator bạn theo dõi vừa ra mắt sản phẩm mới trên Marketplace!' },
    ];

    let notifCreated = 0;
    for (const uid of [...demoUsers, ...demoCreators.map(c => c.id)]) {
      const count = rand(3, 6);
      for (let i = 0; i < count; i++) {
        const n = pick(notifPool);
        await client.query(`
          INSERT INTO notifications (user_id, type, title, body, read, created_at)
          VALUES ($1,'system',$2,$3,$4,$5)
        `, [uid, n.title, n.body, Math.random() > 0.45, randDate(14)]);
        notifCreated++;
      }
    }

    console.log(`✅ Tạo ${notifCreated} notifications`);

    // ─────────────────────────────────────────────────────────────────────
    // COMMIT
    // ─────────────────────────────────────────────────────────────────────
    await client.query('COMMIT');

    // Summary report
    const { rows: [s] } = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE role='creator') AS creators,
        (SELECT COUNT(*) FROM users WHERE role='user')    AS users,
        (SELECT COUNT(*) FROM tips)                       AS tips,
        (SELECT COUNT(*) FROM creator_products WHERE is_active)  AS products,
        (SELECT COUNT(*) FROM creator_orders WHERE status='completed') AS orders,
        (SELECT COUNT(*) FROM fan_club_tiers)             AS tiers,
        (SELECT COUNT(*) FROM fan_club_memberships)       AS memberships,
        (SELECT COUNT(*) FROM notifications)              AS notifications,
        (SELECT COUNT(*) FROM ledger_entries)             AS ledger
    `);

    // ── Activity feed demo ─────────────────────────────────────────────────────
    // Check if activity_feed table exists
    const { rows: [tbl] } = await client.query(`
      SELECT to_regclass('public.activity_feed') AS tbl
    `);
    if (tbl.tbl) {
      // Get real users from DB
      const { rows: allUsers } = await client.query(`SELECT id, username, avatar_url FROM users LIMIT 40`);
      const { rows: allCreators } = await client.query(`SELECT id, username FROM users WHERE role='creator' LIMIT 20`);
      const { rows: allProducts } = await client.query(`SELECT id, title, price_mt FROM creator_products LIMIT 20`);

      if (allUsers.length && allCreators.length) {
        const actTypes = ['TIP_SENT','PRODUCT_PURCHASED','FANCLUB_JOINED','CREATOR_VERIFIED','CREATOR_FEATURED','MILESTONE_REACHED'];
        const milestones = ['1,000','5,000','10,000','50,000','100,000'];
        const activityRows = [];

        for (let i = 0; i < 120; i++) {
          const actor = pick(allUsers);
          const creator = pick(allCreators);
          const type = pick(actTypes);
          let targetId = creator.id, targetName = creator.username, amountMt = 0, metadata = {};
          switch (type) {
            case 'TIP_SENT':
              amountMt = pick([500,1000,2000,5000,10000]);
              targetName = creator.username;
              metadata = { message: pick(['Cảm ơn bạn!', 'Great content!', 'Keep it up!', null]) };
              break;
            case 'PRODUCT_PURCHASED':
              if (allProducts.length) {
                const prod = pick(allProducts);
                targetId = prod.id;
                targetName = prod.title;
                amountMt = prod.price_mt || pick([2000,5000,9900,19900]);
              } else {
                targetName = 'Ebook thiết kế 2024';
                amountMt = 9900;
              }
              break;
            case 'FANCLUB_JOINED':
              amountMt = pick([3000,5000,10000]);
              targetName = `${creator.username} Bronze`;
              metadata = { tierName: 'Bronze', creatorName: creator.username };
              break;
            case 'CREATOR_VERIFIED':
              amountMt = 0;
              targetName = actor.username;
              targetId = actor.id;
              break;
            case 'CREATOR_FEATURED':
              amountMt = 0;
              targetName = actor.username;
              targetId = actor.id;
              break;
            case 'MILESTONE_REACHED':
              amountMt = parseInt(pick(milestones).replace(',',''));
              targetName = pick(milestones);
              targetId = creator.id;
              break;
          }
          activityRows.push({
            actor_id: actor.id,
            actor_username: actor.username,
            actor_avatar: actor.avatar_url,
            activity_type: type,
            target_id: targetId,
            target_name: targetName,
            amount_mt: amountMt,
            metadata,
            created_at: randDate(60),
          });
        }

        for (const row of activityRows) {
          await client.query(`
            INSERT INTO activity_feed (actor_id, actor_username, actor_avatar, activity_type, target_id, target_name, amount_mt, metadata, created_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
          `, [row.actor_id, row.actor_username, row.actor_avatar, row.activity_type, row.target_id, row.target_name, row.amount_mt, JSON.stringify(row.metadata), row.created_at]);
        }
        console.log(`  📡 Activity feed: ${activityRows.length} entries`);
      }
    }

    console.log('\n🎉 SEED DEMO HOÀN TẤT!');
    console.log('──────────────────────────────────');
    console.log('  👥 Creators:        ', s.creators);
    console.log('  🧑 Users:           ', s.users);
    console.log('  🎁 Tips:            ', s.tips);
    console.log('  📦 Products:        ', s.products);
    console.log('  🛒 Orders:          ', s.orders);
    console.log('  🏅 Fan Club Tiers:  ', s.tiers);
    console.log('  👑 Memberships:     ', s.memberships);
    console.log('  🔔 Notifications:   ', s.notifications);
    console.log('  📒 Ledger entries:  ', s.ledger);
    console.log('──────────────────────────────────');
    console.log('\n✅ Test với: linh@demo.mt / password123');
    console.log('   Hoặc bất kỳ: creator_*.email@demo.mt / password123');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed demo thất bại:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedDemo();
