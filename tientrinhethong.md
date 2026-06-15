# 🗺️ TIẾN TRÌNH HỆ THỐNG — XU Economy

> **Mở file này đầu tiên mỗi khi vào project.**
> Tick `[x]` khi hoàn thành. Chưa cần API key thật — dùng sandbox/test key.

---

## 📋 TỔNG QUAN

| Hạng mục | Tiến độ |
|----------|---------|
| Backend Core | ✅ Xong |
| Frontend Core | ✅ Xong |
| Workflow / Dev Runner | ✅ Xong |
| Real-time (WebSocket) | ❌ Chưa |
| Payment IPN Webhooks | ✅ Xong |
| Cronjob / Scheduler | ✅ Xong |
| Notification System | ✅ Xong |
| Referral System | ✅ Xong |
| Security Layer | ✅ Xong |
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
- [x] File `.env.example` — tạo xong, liệt kê đủ biến

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

### 🚀 Đã hoàn thiện trong Replit Migration
- [x] **Workflow config** — Replit chạy cả backend (port 3001) + frontend (port 5000) cùng lúc
- [x] **`.env.example`** — Tạo file mẫu liệt kê đủ biến
- [x] **MoMo IPN Webhook** (`POST /api/wallet/momo/ipn`) — xác thực HMAC, tự động cộng XU
- [x] **ZaloPay IPN Webhook** (`POST /api/wallet/zalopay/ipn`) — xác thực KEY2, cộng XU
- [x] **Frontend: Flow nạp tiền đầy đủ** — Chọn gateway → tạo đơn → redirect pay_url → `/payment/result`
- [x] **Notification System** — Backend API + Frontend bell icon + dropdown
- [x] **Cronjob** — XU expiry 01:00 hằng ngày + cleanup pending deposits mỗi 30 phút
- [x] **Referral System** — code tự động, thưởng XU, trang `/referral`
- [x] **Security Layer** — `helmet` (HTTP headers) + rate limiting (auth: 5/phút, API: 100/phút)
- [x] **DB migrate + seed** — Chạy xong, 3 tài khoản test sẵn sàng
- [x] **Secrets** — JWT_SECRET, MOMO_SECRET_KEY, ZALOPAY_KEY1/KEY2 lưu trong Replit Secrets
- [x] **`type: "module"`** — Thêm vào `backend/package.json`, xóa warning ES module

---

## ❌ CÒN THIẾU — CẦN BUILD

### ⚡ Real-time (WebSocket / SSE)

- [ ] **Backend: SSE endpoint** (`GET /api/stream`) — Server-Sent Events cho live gift feed
- [ ] **Frontend: Live gift feed** trong `Gifting.jsx` — hiển thị gift realtime khi streamer đang live
- [ ] **Frontend: Balance auto-refresh** — cập nhật số dư khi nhận tip/gift mà không cần F5

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
- [ ] **Deploy trên Replit** — Nhấn "Publish" trong Replit để deploy lên `.replit.app`

---

## 🔑 ENV VARS ĐÃ CÀI (Replit Secrets)

| Biến | Trạng thái |
|------|-----------|
| DATABASE_URL | ✅ Replit tự quản lý |
| JWT_SECRET | ✅ Đã set trong Secrets |
| MOMO_SECRET_KEY | ✅ Đã set (sandbox) |
| ZALOPAY_KEY1 | ✅ Đã set (sandbox) |
| ZALOPAY_KEY2 | ✅ Đã set (sandbox) |
| PORT | ✅ 3001 |
| FRONTEND_URL | ✅ http://localhost:5000 |
| MOMO_PARTNER_CODE | ✅ MOMO_TEST |
| MOMO_ACCESS_KEY | ✅ F8BBA842ECF85 |
| MOMO_ENDPOINT | ✅ sandbox |
| ZALOPAY_APP_ID | ✅ 2553 |
| ZALOPAY_ENDPOINT | ✅ sandbox |

---

## 🏃 CHẠY PROJECT (dev)

Replit tự động chạy cả hai service khi mở project. Lần đầu cần migrate + seed (đã xong).

**Tài khoản test:**
| Email | Mật khẩu | Role |
|-------|----------|------|
| admin@xu.vn | password123 | Admin |
| nam@creator.vn | password123 | Creator |
| linh@user.vn | password123 | User |

---

## 📅 GỢI Ý THỨ TỰ BUILD TIẾP

1. ⚡ SSE real-time feed → live gift / balance auto-refresh
2. 👤 Trang Profile → đổi username, avatar
3. 👑 Creator Dashboard → revenue, top tippers
4. 📊 Admin charts → biểu đồ doanh thu
5. 📤 Export CSV → xuất dữ liệu
6. 🚢 Deploy → Publish trên Replit
