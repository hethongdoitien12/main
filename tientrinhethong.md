# 🗺️ TIẾN TRÌNH HỆ THỐNG — MT Economy

---

## 🤖 HƯỚNG DẪN CHO AI AGENT

> **ĐỌC FILE NÀY ĐẦU TIÊN KHI MỞ PROJECT.**
>
> Sau khi đọc xong, hãy:
> 1. Kiểm tra bảng **THỨ TỰ BUILD** bên dưới
> 2. Tìm task đầu tiên còn `[ ]` (chưa build)
> 3. Build task đó hoàn chỉnh, test lại
> 4. Tick `[x]` vào task vừa xong trong file này
> 5. Cập nhật bảng **TỔNG QUAN** tương ứng
> 6. Lặp lại từ bước 2 — build tiếp task tiếp theo cho đến khi hết

**Quy tắc:**
- Không hỏi lại — cứ build theo thứ tự, task nào chưa `[x]` thì làm
- Sau mỗi task: restart workflow, chạy thử, xác nhận không lỗi rồi mới tick
- Nếu task phụ thuộc task trước chưa xong → build task trước trước
- Sandbox/test key đã có sẵn, không cần key thật

---

## 📋 TỔNG QUAN

| Hạng mục | Tiến độ |
|----------|---------|
| Backend Core | ✅ Xong |
| Frontend Core | ✅ Xong |
| Workflow / Dev Runner | ✅ Xong |
| Security Layer | ✅ Xong |
| Payment IPN Webhooks | ✅ Xong |
| Cronjob / Scheduler | ✅ Xong |
| Notification System | ✅ Xong |
| Referral System | ✅ Xong |
| Real-time SSE | ✅ Xong |
| Trang Profile | ✅ Xong |
| Creator Dashboard | ✅ Xong |
| Admin: Charts + CSV | ✅ Xong |
| Admin: Approve Deposit | ✅ Xong |
| KYC Placeholder | ✅ Xong |
| KYC nâng cấp (ảnh + modal Admin) | ✅ Xong |
| Replit Migration | ✅ Xong |
| **Creator Economy — Phase 1: /creators** | ✅ Xong |
| **Creator Economy — Phase 2: /creator/:id** | ✅ Xong |
| **Creator Economy — Phase 3: Fan Club** | ✅ Xong |
| **Fan Club nâng cấp: Auto-renew + Cancel + Subscriptions** | ✅ Xong |
| **Creator Economy — Phase 4: Creator Shop** | ✅ Xong |
| **Creator Economy — Phase 5: Top Fans** | ✅ Xong |
| **Creator Economy — Phase 6: Advanced Dashboard** | ✅ Xong |
| Deploy | 🔄 Sẵn sàng |

---

## 🏗️ CẤU TRÚC DỰ ÁN

```
xu-economy/
├── backend/                ← Node.js + Express API (port 3001)
│   ├── src/
│   │   ├── db/             ← migrate.js, seed.js, seed-if-empty.js, pool.js
│   │   ├── middleware/     ← auth.js (JWT verify)
│   │   ├── routes/         ← auth, wallet, quests, events, admin, creator, creators, fanclub, creatorProducts...
│   │   └── services/       ← ledger.js, cron.js, gateways/momo, gateways/zalopay, notifier.js
│   └── package.json
├── frontend/               ← React + Vite (port 5000)
│   ├── src/
│   │   ├── pages/          ← Dashboard, Wallet, Quests, History, Admin, Creators, CreatorProfile, CreatorDashboard...
│   │   ├── components/     ← Layout, sidebar nav
│   │   └── hooks/          ← useAuth, useSSE
│   └── vite.config.js      ← proxy /api → localhost:3001
├── start.sh                ← Script khởi động toàn bộ hệ thống
└── tientrinhethong.md      ← File này
```

---

## 🔢 THỨ TỰ BUILD — LÀM THEO THỨ TỰ NÀY

### ✅ TASK 1 — Real-time SSE (Live gift feed + Balance auto-refresh)
- [x] **Backend: SSE endpoint** `GET /api/stream`
- [x] **Backend: Gửi event SSE** khi `tip_received`
- [x] **Frontend: Live gift feed** trong `Gifting.jsx`
- [x] **Frontend: Balance auto-refresh** — lắng nghe SSE event `balance_update`

---

### ✅ TASK 2 — Trang Profile (`/profile`)
- [x] **Backend: `GET /api/user/profile`** + bio field
- [x] **Backend: `PATCH /api/user/profile`** — cập nhật username, avatar, bio
- [x] **Frontend: Page `Profile.jsx`** — form đổi username, avatar, bio
- [x] **Frontend: Thêm link `/profile`** vào sidebar

---

### ✅ TASK 3 — Creator Dashboard (`/creator`)
- [x] **Backend: `GET /api/creator/stats`** — tổng xu nhận, top 10 người tip, tip theo ngày (7 ngày), revenue 30 ngày, hôm nay, fan club count, product sales
- [x] **Frontend: Page `CreatorDashboard.jsx`** nâng cao — 4 stat card, biểu đồ, fan club setup, product CRUD, rút tiền
- [x] **Frontend: Thêm link `/creator`** vào sidebar (chỉ hiện với creator)

---

### ✅ TASK 4 — Admin: Biểu đồ + Export CSV
- [x] **Backend: `GET /api/admin/chart-data`**
- [x] **Frontend: Chart trong `Admin.jsx`**
- [x] **Backend: `GET /api/admin/export/transactions`**
- [x] **Backend: `GET /api/admin/export/users`**
- [x] **Frontend: Nút Export CSV** trong Admin

---

### ✅ TASK 5 — Admin: Approve Deposit Thủ Công
- [x] **Backend: `POST /api/admin/deposits/:id/approve`**
- [x] **Backend: `POST /api/admin/deposits/:id/reject`**
- [x] **Frontend: Tab "Nạp chờ duyệt"** trong `Admin.jsx`

---

### ✅ TASK 6 — KYC Placeholder
- [x] Thêm cột `kyc_status` vào bảng `users`
- [x] Chặn rút nếu amount > 1M và chưa KYC
- [x] `POST /api/user/kyc/submit`
- [x] `POST /api/admin/kyc/:userId/approve`
- [x] Banner KYC trong trang Wallet

---

### ✅ TASK 7 — Deploy
- [x] **Frontend build test**
- [x] **Backend production config**
- [x] **Replit Migration**
- [ ] **Deploy trên Replit** — nhấn **Publish** trong Replit UI → app lên `.replit.app`
- [ ] **Kiểm tra IPN webhook URL** — sau khi deploy, cập nhật `BACKEND_URL` trong Secrets thành URL production

---

### ✅ TASK 8 — Creator Economy Phase 1: /creators (2025-06-18)
- [x] **Backend: `GET /api/creators`** — danh sách creator (sort by tips, search)
- [x] **Frontend: Page `Creators.jsx`** — grid cards, search, avatar, stats, nút Tặng quà
- [x] **Layout: Thêm link `/creators`** vào sidebar section "Khám phá"

---

### ✅ TASK 9 — Creator Economy Phase 2+5: /creator/:id (2025-06-18)
- [x] **Backend: `GET /api/creators/:id`** — creator info, top fans, recent gifts, fan club tiers, products
- [x] **Frontend: Page `CreatorProfile.jsx`** — hero card, tabs (Tổng quan / Fan Club / Sản phẩm / Top Fans)
- [x] **Top Fans leaderboard** trong tab "Top Fans"
- [x] **Recent gifts** trong tab "Tổng quan"
- [x] **Nút "Tặng quà ngay"** liên kết tới /gifting với pre-selected creator

---

### ✅ TASK 10 — Creator Economy Phase 3: Fan Club (2025-06-18)
- [x] **DB: Bảng `fan_club_tiers`, `fan_club_memberships`, `fan_club_payments`**
- [x] **Backend: `POST /api/fanclub/tiers`** — creator tạo/cập nhật tier (Bronze/Silver/Gold)
- [x] **Backend: `GET /api/fanclub/my-tiers`** — creator xem tiers của mình
- [x] **Backend: `GET /api/fanclub/members`** — danh sách members (kèm auto_renew, renewal_count)
- [x] **Backend: `POST /api/fanclub/join/:tierId`** — user tham gia Fan Club (deduct MT, credit creator 90%)
- [x] **Backend: `GET /api/fanclub/my-memberships`** — user xem membership
- [x] **Backend: `GET /api/fanclub/admin/revenue`** — admin xem doanh thu
- [x] **Frontend: Fan Club tab** trong CreatorProfile — hiển thị tiers, nút tham gia
- [x] **Frontend: Fan Club setup** trong CreatorDashboard — CRUD tiers

---

### ✅ TASK 13 — Fan Club nâng cấp: Auto-renew + Cancel + Subscriptions (2026-06-18)
- [x] **DB: Cột `auto_renew`** thêm vào `fan_club_memberships`
- [x] **DB: Bảng `membership_subscriptions`** — log mỗi lần gia hạn (manual/auto, period_start/end, status, fail_reason)
- [x] **Backend: `POST /api/fanclub/join/:tierId`** — nhận param `auto_renew`, ghi vào `membership_subscriptions`
- [x] **Backend: `PATCH /api/fanclub/memberships/:id/auto-renew`** — bật/tắt auto-renew
- [x] **Backend: `POST /api/fanclub/memberships/:id/cancel`** — hủy membership (giữ quyền lợi đến hết hạn)
- [x] **Backend: `GET /api/fanclub/memberships/:id/history`** — lịch sử gia hạn
- [x] **Backend: Cron job `autoRenewMemberships`** — chạy mỗi giờ, gia hạn các membership sắp hết hạn trong 24h
- [x] **Backend: Cron job `expireOldMemberships`** — expire membership không auto-renew đã quá hạn
- [x] **Frontend: Modal tham gia** trong CreatorProfile — checkbox auto-renew, hiển thị số dư, kiểm tra đủ tiền
- [x] **Frontend: Page `MyMemberships.jsx`** (`/memberships`) — quản lý tất cả memberships: bật/tắt auto-renew, hủy, xem hết hạn
- [x] **Frontend: Sidebar** — thêm "Fan Club" link (`/memberships`) vào section "Tôi"
- [x] **Frontend: CreatorDashboard members tab** — hiển thị cột auto-renew, số lần gia hạn, cảnh báo sắp hết hạn
- [x] **Revenue: Platform 10%, Creator 90%** — áp dụng cả lần gia hạn auto

---

### ✅ TASK 11 — Creator Economy Phase 4: Creator Shop (2025-06-18)
- [x] **DB: Bảng `creator_products`, `creator_orders`**
- [x] **Backend: `POST /api/creator-products`** — creator tạo sản phẩm
- [x] **Backend: `PATCH /api/creator-products/:id`** — creator cập nhật
- [x] **Backend: `DELETE /api/creator-products/:id`** — creator ẩn sản phẩm
- [x] **Backend: `GET /api/creator-products/mine`** — danh sách sản phẩm creator
- [x] **Backend: `POST /api/creator-products/:id/buy`** — user mua (deduct MT, credit creator 90%)
- [x] **Backend: `GET /api/creator-products/my-orders`** — lịch sử mua của user
- [x] **Frontend: Products tab** trong CreatorProfile — grid sản phẩm, nút mua
- [x] **Frontend: Products tab** trong CreatorDashboard — CRUD sản phẩm

---

### ✅ TASK 14 — Creator Shop: Marketplace + Product Detail + Admin (2026-06-18)
- [x] **Backend: `GET /api/creator-products`** — public marketplace list (search, filter type/creator, sort newest/popular/price, already_bought flag, pagination)
- [x] **Backend: `GET /api/creator-products/:id/detail`** — chi tiết sản phẩm (creator info, already_bought, download_url)
- [x] **Backend: `GET /api/admin/products`** — admin danh sách tất cả sản phẩm (filter active/inactive, search, order_count, gross_mt)
- [x] **Backend: `PATCH /api/admin/products/:id/toggle`** — admin ẩn/khôi phục sản phẩm vi phạm
- [x] **Backend: `DELETE /api/admin/products/:id`** — admin xóa vĩnh viễn (vi phạm nặng)
- [x] **Frontend: Page `Marketplace.jsx`** (`/marketplace`) — grid sản phẩm, search, filter loại, sort, stat row, pagination, badge "Đã mua"
- [x] **Frontend: Page `ProductDetail.jsx`** (`/marketplace/:id`) — ảnh/placeholder, mô tả, nút mua với confirm modal, download link sau mua
- [x] **Frontend: Admin tab "🛒 Sản phẩm"** — stat grid 4 ô, bảng tất cả sản phẩm, ẩn/khôi phục, xóa vĩnh viễn với confirm dialog
- [x] **Frontend: Sidebar** — thêm "Marketplace 🛒" vào section "Khám phá"
- [x] **Revenue: Platform 10%, Creator 90%** — verify qua admin stats

---

### ✅ TASK 12 — Creator Economy Phase 6: Advanced Dashboard (2025-06-18)
- [x] **Backend stats mở rộng:** revenue30, todayRevenue, fanClubCount, productSalesTotal, dailyEarnings30
- [x] **Frontend:** 8 stat cards (total, today, 30 ngày, số dư, fan club, product, tips, conversion rate)
- [x] **Frontend: Chart 30 ngày** (bar chart)
- [x] **Frontend: Tabs:** Tổng quan / Doanh thu / Fan Club / Sản phẩm / Rút tiền

---

## 📦 ĐÃ BUILD XONG (tham khảo)

<details>
<summary>Xem chi tiết các thứ đã hoàn thành</summary>

### Backend
- Express server, CORS, error handler — port 3001
- PostgreSQL pool + migrate + seed (3 tài khoản test)
- JWT auth middleware (`authMiddleware` + `adminOnly`)
- Route Auth: register, login
- Route Wallet: balance, deposit/create, spend, tip, history, platform-stats
- Route Quests: list, progress, claim, admin-create
- Route Events: trigger 10 loại action
- Route Withdrawals: mine, queue, approve/reject
- Route Admin: stats, user list, adjust balance, chart-data, export CSV, fan club revenue
- Route Notifications: list, read, delete
- Route Referral: my-code, use, stats
- Route Stream: SSE endpoint
- Route User: profile get/update (username, avatar, bio), KYC submit
- Route Creator: stats dashboard nâng cao (revenue30, todayRevenue, fanClubCount, productSalesTotal)
- Route Creators: GET /api/creators (list), GET /api/creators/:id (profile)
- Route Fan Club: tiers CRUD, join, my-memberships, members, admin revenue
- Route Creator Products: CRUD, buy, my-orders
- Route Checkin: daily check-in
- Service Ledger: double-entry, idempotency key
- Service QuestTrigger: auto-award MT
- Gateway MoMo + ZaloPay (sandbox)
- MoMo IPN + ZaloPay IPN Webhooks
- Cronjob: MT expiry + cleanup pending
- Security: helmet + rate limit

### Frontend
- React + Vite, proxy `/api` → port 3001
- React Router v6, PrivateRoute
- Hook `useAuth` — context, login, logout, persist, refreshWallet
- Hook `useSSE` — real-time events
- Layout + sidebar nav (sections: Tổng quan / Khám phá / Tôi / Creator / Admin)
- Pages: Login, Register, Dashboard, Wallet, Quests, History, Admin, Gifting, Referral, PaymentResult, Profile, CreatorDashboard, Leaderboard, TopCreators, Checkin, Shop
- **NEW Pages:** Creators (/creators), CreatorProfile (/creator/:id)
- **Creators page:** grid cards, search, avatar, stats (MT nhận, lượt tip, fans), nút tặng quà
- **CreatorProfile page:** hero card, 4 tabs (Tổng quan / Fan Club / Sản phẩm / Top Fans), join fan club, buy products, recent gifts
- **CreatorDashboard (enhanced):** 8 stat cards, 5 tabs, chart 30 ngày, fan club setup, product CRUD

### Database (new tables)
- `fan_club_tiers` — creator defines Bronze/Silver/Gold tiers
- `fan_club_memberships` — user subscriptions (30 ngày)
- `fan_club_payments` — payment history
- `creator_products` — digital products (ebook, template, preset, source_code, prompt_ai, other)
- `creator_orders` — purchase records
- `users.bio` column — creator bio text

### Replit
- Workflow tự chạy khi mở project (`bash start.sh`)
- Tất cả secrets trong Replit Secrets
- DB dùng Replit PostgreSQL (tự quản lý)
- DB đã migrate + seed xong

</details>

---

## 🔑 ENV VARS (Replit Secrets)

| Biến | Trạng thái | Ghi chú |
|------|-----------|---------|
| DATABASE_URL | ✅ Replit tự quản lý | PostgreSQL Replit |
| PGHOST | ✅ Replit tự quản lý | |
| PGPORT | ✅ Replit tự quản lý | |
| PGUSER | ✅ Replit tự quản lý | |
| PGPASSWORD | ✅ Replit tự quản lý | |
| PGDATABASE | ✅ Replit tự quản lý | |
| JWT_SECRET | ✅ Đã set | Secret — bảo mật session |
| MOMO_ACCESS_KEY | ✅ F8BBA842ECF85 | Sandbox |
| MOMO_SECRET_KEY | ✅ Đã set | Sandbox |
| ZALOPAY_KEY1 | ✅ Đã set | Sandbox |
| ZALOPAY_KEY2 | ✅ Đã set | Sandbox |
| PORT | ✅ 3001 | Env var shared |
| FRONTEND_URL | ✅ http://localhost:5000 | Env var shared |
| MOMO_PARTNER_CODE | ✅ MOMO_TEST | Env var shared |
| MOMO_ENDPOINT | ✅ https://test-payment.momo.vn | Env var shared |
| ZALOPAY_APP_ID | ✅ 2553 | Env var shared |
| ZALOPAY_ENDPOINT | ✅ https://sb-openapi.zalopay.vn | Env var shared |

---

## 🧪 Tài khoản test

| Email | Mật khẩu | Role | Số dư ban đầu |
|-------|----------|------|---------------|
| admin@xu.vn | password123 | Admin | 0 MT |
| nam@creator.vn | password123 | Creator | 10,000 MT |
| linh@user.vn | password123 | User | 10,000 MT |

---

## 🔌 API Endpoints

### Auth
```
POST /api/auth/register   { username, email, password }
POST /api/auth/login      { email, password }
```

### Wallet (cần Bearer token)
```
GET  /api/wallet/balance          — số dư ví
POST /api/wallet/deposit/create   — nạp tiền
POST /api/wallet/spend            — tiêu MT
POST /api/wallet/tip              — tip creator
GET  /api/wallet/history          — lịch sử
GET  /api/wallet/platform-stats   — (admin) thống kê
```

### Creators (public, cần Bearer token)
```
GET /api/creators               — danh sách creator (search, sort by tips)
GET /api/creators/:id           — profile creator (topFans, recentGifts, fanClubTiers, products)
```

### Fan Club (cần Bearer token)
```
POST   /api/fanclub/tiers           — (creator) tạo/cập nhật tier
GET    /api/fanclub/my-tiers        — (creator) tiers của mình
DELETE /api/fanclub/tiers/:id       — (creator) xóa tier
GET    /api/fanclub/members         — (creator) danh sách members
POST   /api/fanclub/join/:tierId    — (user) tham gia Fan Club
GET    /api/fanclub/my-memberships  — (user) memberships của mình
GET    /api/fanclub/admin/revenue   — (admin) doanh thu Fan Club
```

### Creator Products (cần Bearer token)
```
POST   /api/creator-products         — (creator) tạo sản phẩm
PATCH  /api/creator-products/:id     — (creator) cập nhật
DELETE /api/creator-products/:id     — (creator) ẩn sản phẩm
GET    /api/creator-products/mine    — (creator) sản phẩm của mình
POST   /api/creator-products/:id/buy — (user) mua sản phẩm
GET    /api/creator-products/my-orders — (user) lịch sử mua
```

### Creator Dashboard (cần creator/admin token)
```
GET /api/creator/stats   — dashboard nâng cao (revenue30, todayRevenue, fanClubCount, productSalesTotal, dailyEarnings30)
```

### Admin (cần admin token)
```
GET  /api/admin/stats
GET  /api/admin/users
POST /api/admin/users/:id/adjust
GET  /api/admin/chart-data
GET  /api/admin/export/transactions
GET  /api/admin/export/users
POST /api/admin/deposits/:id/approve
POST /api/admin/deposits/:id/reject
POST /api/admin/kyc/:userId/approve
GET  /api/fanclub/admin/revenue
```

### User (cần Bearer token)
```
GET   /api/user/profile       — thông tin profile (bao gồm bio)
PATCH /api/user/profile       — cập nhật username, avatar, bio
POST  /api/user/kyc/submit    — nộp thông tin KYC
```

### Khác
```
GET /api/stream          — SSE real-time stream
GET /api/checkin/status  — trạng thái check-in hôm nay
POST /api/checkin        — check-in hàng ngày
GET  /api/notifications  — thông báo
GET  /api/referral/my-code — mã giới thiệu
GET  /api/shop/items       — shop items
```

---

## 💰 Mô hình kiếm tiền

| Nguồn | Tỷ lệ |
|-------|-------|
| Phí rút MT ra VNĐ | 10% |
| Phí tip creator | 5% |
| Phí Fan Club | 10% |
| Phí Creator Products | 10% |
| Float (tiền nạp chưa tiêu) | lãi ngân hàng |
| MT miễn phí expire sau 90 ngày | 100% |

---

## 🛡️ Lưu ý pháp lý (Việt Nam)

- **Giai đoạn 1 (hiện tại):** Chỉ dùng nội bộ, không cho phép rút ra — không cần giấy phép NHNN
- **Giai đoạn 2:** Khi mở tính năng rút tiền thật → tham khảo **Nghị định 52/2024/NĐ-CP** về dịch vụ trung gian thanh toán
- Không dùng thuật ngữ "token", "coin", "blockchain" để tránh liên quan đến quy định tài sản ảo

---

## 🚀 Deploy lên Replit

1. Nhấn **Publish** trong Replit UI
2. App sẽ lên `.replit.app` domain
3. Sau khi deploy, vào **Secrets** → cập nhật `BACKEND_URL` thành URL production (dùng cho MoMo/ZaloPay IPN callback)
4. Cập nhật `FRONTEND_URL` thành URL production nếu cần CORS chính xác
