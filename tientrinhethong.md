# 🗺️ TIẾN TRÌNH HỆ THỐNG — XU Economy

> **Mở file này đầu tiên mỗi khi vào project.**
> Tick `[x]` khi hoàn thành. Chưa cần API key thật — dùng sandbox/test key.

---

## 📋 TỔNG QUAN

| Hạng mục | Tiến độ |
|----------|---------|
| Backend Core | ✅ Xong |
| Frontend Core | ✅ Xong |
| Workflow / Dev Runner | ❌ Chưa |
| Real-time (WebSocket) | ❌ Chưa |
| Payment IPN Webhooks | ❌ Chưa |
| Cronjob / Scheduler | ❌ Chưa |
| Notification System | ❌ Chưa |
| Referral System | ❌ Chưa |
| Security Layer | ❌ Chưa |
| Deploy | ❌ Chưa |

---

## ✅ ĐÃ BUILD XONG

### 🔧 Backend (`backend/`)
- [x] Express server (`src/index.js`) — port 3001, CORS, error handler
- [x] PostgreSQL pool (`src/db/pool.js`)
- [x] DB schema migrate (`src/db/migrate.js`) — users, wallets, ledger, quests, deposits, withdrawals
- [x] Seed data (`src/db/seed.js`) — 3 tài khoản test (admin / creator / user)
- [x] JWT auth middleware (`src/middleware/auth.js`) — `authMiddleware` + `adminOnly`
- [x] Route: Auth (`src/routes/auth.js`) — register, login
- [x] Route: Wallet (`src/routes/wallet.js`) — balance, deposit/create, spend, tip, history, deposits, withdrawals, platform-stats
- [x] Route: Quests (`src/routes/quests.js`) — list, progress, claim, admin-create
- [x] Route: Events (`src/routes/events.js`) — trigger system (10 loại action)
- [x] Route: Withdrawals (`src/routes/withdrawals.js`) — mine, queue, approve/reject
- [x] Route: Admin (`src/routes/admin.js`) — stats, user list, adjust balance
- [x] Service: Ledger (`src/services/ledger.js`) — double-entry bookkeeping, idempotency key
- [x] Service: QuestTrigger (`src/services/questTrigger.js`) — tự động award XU khi đủ điều kiện
- [x] Gateway: MoMo (`src/services/gateways/momo.js`) — sandbox test keys có sẵn
- [x] Gateway: ZaloPay (`src/services/gateways/zalopay.js`) — sandbox test keys có sẵn
- [x] File `.env` cơ bản đã tồn tại trong `backend/`

### 🎨 Frontend (`frontend/`)
- [x] React + Vite setup (`vite.config.js`) — proxy `/api` → `localhost:3001`
- [x] App routing (`src/App.jsx`) — React Router v6, PrivateRoute
- [x] API client (`src/api.js`) — fetch wrapper với Bearer token
- [x] Hook: `useAuth` (`src/hooks/useAuth.jsx`) — context, login, logout, persist token
- [x] Layout: `Layout.jsx` — sidebar nav
- [x] Page: `Login.jsx` — đăng nhập
- [x] Page: `Register.jsx` — đăng ký
- [x] Page: `Dashboard.jsx` — tổng quan số dư, quick actions
- [x] Page: `Wallet.jsx` — nạp/rút/tiêu XU, lịch sử
- [x] Page: `Quests.jsx` — danh sách quest, tiến trình, claim thưởng
- [x] Page: `History.jsx` — lịch sử giao dịch toàn bộ
- [x] Page: `Admin.jsx` — quản lý users, withdrawals, platform stats
- [x] Page: `Gifting.jsx` — gửi gift XU cho creator (preset amounts)

---

## ❌ CÒN THIẾU — CẦN BUILD

### 🚀 ƯU TIÊN CAO — Cần để chạy được

- [x] **Workflow config** — Cấu hình Replit chạy cả backend (port 3001) + frontend (port 5000) cùng lúc khi mở project
- [ ] **`.env.example`** — Tạo file mẫu liệt kê đủ biến: `DATABASE_URL`, `JWT_SECRET`, `MOMO_*`, `ZALOPAY_*`, `BACKEND_URL`, `FRONTEND_URL`
- [x] **MoMo IPN Webhook** (`POST /api/wallet/momo/ipn`) — Xử lý callback từ MoMo, xác thực chữ ký HMAC, tự động cộng XU
- [x] **ZaloPay IPN Webhook** (`POST /api/wallet/zalopay/ipn`) — Tương tự, xác thực KEY2, cộng XU
- [x] **Frontend: Flow nạp tiền đầy đủ** — Chọn gateway → tạo đơn → redirect pay_url → trang `/payment/result` → confirm thủ công (dev)

### 🔔 Notification System

- [x] **Backend: Bảng notifications** — Schema `(id, user_id, type, title, body, read, metadata, created_at)` + 2 index
- [x] **Backend: API notifications** — GET list, PATCH read-one, PATCH read-all, DELETE
- [x] **Backend: Tự tạo notification** khi: deposit confirmed, tip received, withdrawal approved/rejected
- [x] **Frontend: Bell icon** trong Layout — badge đỏ hiện unread count, poll mỗi 30 giây
- [x] **Frontend: Notification dropdown** — danh sách, click mark read, xoá từng cái, nút "Đọc tất cả"

### ⚡ Real-time (WebSocket / SSE)

- [ ] **Backend: SSE endpoint** (`GET /api/stream`) — Server-Sent Events cho live gift feed
- [ ] **Frontend: Live gift feed** trong `Gifting.jsx` — hiển thị gift realtime khi streamer đang live
- [ ] **Frontend: Balance auto-refresh** — cập nhật số dư khi nhận tip/gift mà không cần F5

### ⏰ Cronjob / Scheduler

- [x] **XU expiry job** — `node-cron` chạy 01:00 hằng ngày (GMT+7); bảng `xu_expiry_batches` theo dõi từng lô; tạo `ledger_entry` type `expire`; notify user; admin có thể trigger thủ công qua `POST /api/admin/run-expire`
- [x] **Stale deposit cleanup** — Cron mỗi 30 phút; hủy deposit `pending` quá 30 phút; admin trigger thủ công qua `POST /api/admin/run-cleanup`
- [x] **Backend: Expiry info API** — `GET /api/wallet/expiry-info` trả về lô XU sắp hết hạn cho user
- [x] **Admin: Expiry dashboard** — `GET /api/admin/expiry-batches` + summary (active_count, expiring_soon, XU sắp mất)

### 🔗 Referral System

- [ ] **Backend: Cột `referral_code`** trong bảng `users` — random 8 ký tự unique
- [ ] **Backend: Cột `referred_by`** trong bảng `users` — FK tới user đã giới thiệu
- [ ] **Backend: API** — `GET /api/referral/my-code`, `POST /api/referral/use` (nhập code khi đăng ký)
- [ ] **Backend: Tự thưởng XU** khi referral hợp lệ (trigger `earn_referral` cho cả 2 bên)
- [ ] **Frontend: Tab Referral** trong Wallet hoặc trang riêng — hiển thị code, copy link, thống kê

### 🛡️ Security Layer

- [ ] **Rate limiting** — `npm install express-rate-limit`, giới hạn: login 5 lần/phút, API chung 100 req/phút
- [ ] **Helmet** — `npm install helmet`, bảo vệ HTTP headers
- [ ] **Input validation** — `npm install zod` hoặc `express-validator`, validate body trước khi xử lý DB
- [ ] **Frontend: Error Boundary** — Bắt React crash, hiển thị UI fallback thay vì màn hình trắng

### 👤 User Features còn thiếu

- [ ] **Trang Profile** (`/profile`) — đổi username, avatar, xem stats cá nhân
- [ ] **Creator Dashboard** — trang riêng cho creator xem revenue, top tippers, withdrawal history
- [ ] **KYC placeholder** — khi rút > 1,000,000 XU yêu cầu xác minh CCCD (có thể mock ở giai đoạn này)

### 📊 Admin nâng cao

- [ ] **Export CSV** — Admin xuất danh sách giao dịch / users ra file CSV
- [ ] **Admin: Approve deposit thủ công** — Khi user chuyển khoản ngân hàng, admin confirm và cộng XU
- [ ] **Biểu đồ** — Thêm chart (doanh thu theo ngày, số user mới) vào trang Admin

### 🚢 Deploy

- [ ] **Frontend build test** — Chạy `npm run build` trong `frontend/`, đảm bảo không lỗi
- [ ] **Backend production config** — Kiểm tra `NODE_ENV=production`, tắt logs debug
- [ ] **Database production** — Chọn host: Supabase (free) hoặc Railway PostgreSQL
- [ ] **Deploy backend** — Railway / Render (connect repo, set env vars)
- [ ] **Deploy frontend** — Vercel / Netlify (build command: `npm run build`, output: `dist`)
- [ ] **Đặt `BACKEND_URL`** trong env production — để MoMo/ZaloPay IPN gọi đúng server

---

## 🔑 ENV VARS CẦN CÓ (chưa cần key thật)

```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/xu_economy

# Auth
JWT_SECRET=any-random-32-char-string-here

# Server
PORT=3001
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3001   # ← production: URL thật của server

# MoMo Sandbox (test keys — không cần key thật)
MOMO_PARTNER_CODE=MOMO_TEST
MOMO_ACCESS_KEY=F8BBA842ECF85
MOMO_SECRET_KEY=K951B6PE1waDMi640xX08PD3vg6EkVlz
MOMO_ENDPOINT=https://test-payment.momo.vn

# ZaloPay Sandbox (test keys — không cần key thật)
ZALOPAY_APP_ID=2553
ZALOPAY_KEY1=PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL
ZALOPAY_KEY2=kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz
ZALOPAY_ENDPOINT=https://sb-openapi.zalopay.vn
```

> ⚠️ File `.env` đã có trong `backend/` — kiểm tra và cập nhật `DATABASE_URL` + `JWT_SECRET`

---

## 🏃 CHẠY PROJECT (dev)

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev

# Lần đầu: migrate + seed DB
cd backend && npm run migrate && npm run seed
```

**Tài khoản test:**
| Email | Mật khẩu | Role |
|-------|----------|------|
| admin@xu.vn | password123 | Admin |
| nam@creator.vn | password123 | Creator |
| linh@user.vn | password123 | User |

---

## 📅 GỢI Ý THỨ TỰ BUILD TIẾP

1. ⚡ Workflow config → chạy được ngay trong Replit
2. 🔗 MoMo + ZaloPay IPN webhooks → deposit flow hoàn chỉnh
3. 🔔 Notification system → UX tốt hơn
4. ⏰ Cronjob XU expiry → đúng business logic
5. 🔗 Referral system → growth feature
6. 🛡️ Security layer → trước khi public
7. 🚢 Deploy → lên production
