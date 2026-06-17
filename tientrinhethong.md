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
| Replit Migration | ✅ Xong |
| Deploy | 🔄 Sẵn sàng |

---

## 🏗️ CẤU TRÚC DỰ ÁN

```
xu-economy/
├── backend/                ← Node.js + Express API (port 3001)
│   ├── src/
│   │   ├── db/             ← migrate.js, seed.js, seed-if-empty.js, pool.js
│   │   ├── middleware/     ← auth.js (JWT verify)
│   │   ├── routes/         ← auth, wallet, quests, events, admin, creator...
│   │   └── services/       ← ledger.js, cron.js, gateways/momo, gateways/zalopay
│   └── package.json
├── frontend/               ← React + Vite (port 5000)
│   ├── src/
│   │   ├── pages/          ← Dashboard, Wallet, Quests, History, Admin...
│   │   ├── components/     ← Layout, sidebar nav
│   │   └── hooks/          ← useAuth, useSSE
│   └── vite.config.js      ← proxy /api → localhost:3001
├── start.sh                ← Script khởi động toàn bộ hệ thống
└── tientrinhethong.md      ← File này
```

---

## 🔢 THỨ TỰ BUILD — LÀM THEO THỨ TỰ NÀY

### ✅ TASK 1 — Real-time SSE (Live gift feed + Balance auto-refresh)
- [x] **Backend: SSE endpoint** `GET /api/stream` — giữ kết nối, push event khi có tip/gift mới
- [x] **Backend: Gửi event SSE** khi `tip_received` — notif qua SSE thay vì chỉ polling
- [x] **Frontend: Live gift feed** trong `Gifting.jsx` — connect SSE, hiển thị gift cuộn realtime
- [x] **Frontend: Balance auto-refresh** — lắng nghe SSE event `balance_update`, cập nhật số dư không cần F5

> ⚠️ Chú ý: Replit proxy không hỗ trợ tốt SSE long-lived connection — dùng `EventSource` với `retry` tự động, set header `X-Accel-Buffering: no` ở backend.

---

### ✅ TASK 2 — Trang Profile (`/profile`)
- [x] **Backend: `GET /api/user/profile`** — trả về username, email, avatar_url, role, created_at, referral stats
- [x] **Backend: `PATCH /api/user/profile`** — cập nhật username, avatar_url (validate unique username)
- [x] **Frontend: Page `Profile.jsx`** — form đổi username, ô nhập avatar URL, hiển thị stats cá nhân (tổng xu đã kiếm, đã tiêu, ngày tham gia)
- [x] **Frontend: Thêm link `/profile`** vào sidebar `Layout.jsx`

---

### ✅ TASK 3 — Creator Dashboard (`/creator`)
- [x] **Backend: `GET /api/creator/stats`** — tổng xu nhận, top 10 người tip, tip theo ngày (7 ngày gần nhất), withdrawal history
- [x] **Frontend: Page `CreatorDashboard.jsx`** — chỉ hiển thị nếu `role === 'creator'`, bảng top tippers, biểu đồ thu nhập 7 ngày, nút rút tiền nhanh
- [x] **Frontend: Thêm link `/creator`** vào sidebar (chỉ hiện với creator)

---

### ✅ TASK 4 — Admin: Biểu đồ + Export CSV
- [x] **Backend: `GET /api/admin/chart-data`** — doanh thu theo ngày 30 ngày gần nhất, số user mới theo ngày
- [x] **Frontend: Chart trong `Admin.jsx`** — dùng `recharts`, 2 chart: doanh thu VND + user mới
- [x] **Backend: `GET /api/admin/export/transactions`** — xuất CSV ledger entries (filter by date range)
- [x] **Backend: `GET /api/admin/export/users`** — xuất CSV danh sách users
- [x] **Frontend: Nút Export CSV** trong Admin — download file thẳng từ API

---

### ✅ TASK 5 — Admin: Approve Deposit Thủ Công
- [x] **Backend: `POST /api/admin/deposits/:id/approve`** — admin confirm deposit ngân hàng thủ công, cộng MT vào ví
- [x] **Backend: `POST /api/admin/deposits/:id/reject`** — từ chối, cập nhật status
- [x] **Frontend: Tab "Nạp chờ duyệt"** trong `Admin.jsx` — danh sách deposit pending, nút Approve/Reject từng cái

---

### ✅ TASK 6 — KYC Placeholder
- [x] **Backend: Thêm cột `kyc_status`** vào bảng `users` — `'none' | 'pending' | 'verified'`, default `'none'`
- [x] **Backend: Chặn rút** nếu `amount_xu > 1_000_000` và `kyc_status !== 'verified'` — trả lỗi rõ ràng
- [x] **Backend: `POST /api/user/kyc/submit`** — user nộp thông tin (tên, CCCD mock), set `kyc_status = 'pending'`
- [x] **Backend: `POST /api/admin/kyc/:userId/approve`** — admin duyệt KYC, set `kyc_status = 'verified'`
- [x] **Frontend: Banner KYC** trong trang Wallet khi số dư > 800,000 MT — nhắc user xác minh trước khi rút lớn

---

### ✅ TASK 7 — Deploy
- [x] **Frontend build test** — chạy `npm run build` trong `frontend/`, fix lỗi nếu có
- [x] **Backend production config** — khi `NODE_ENV=production`: tắt stack trace trong error handler, bật `trust proxy`
- [x] **Replit Migration** — secrets chuyển vào Replit Secrets, DB dùng Replit PostgreSQL, `.env` không còn cần thiết
- [ ] **Deploy trên Replit** — nhấn **Publish** trong Replit UI → app lên `.replit.app`
- [ ] **Kiểm tra IPN webhook URL** — sau khi deploy, cập nhật `BACKEND_URL` trong Secrets thành URL production

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
- Route Admin: stats, user list, adjust balance, chart-data, export CSV
- Route Notifications: list, read, delete
- Route Referral: my-code, use, stats
- Route Stream: SSE endpoint
- Route User: profile get/update, KYC submit
- Route Creator: stats dashboard
- Route Checkin: daily check-in
- Service Ledger: double-entry, idempotency key
- Service QuestTrigger: auto-award MT
- Gateway MoMo + ZaloPay (sandbox)
- MoMo IPN Webhook (`POST /api/wallet/momo/ipn`)
- ZaloPay IPN Webhook (`POST /api/wallet/zalopay/ipn`)
- Cronjob: MT expiry 01:00 GMT+7 + cleanup pending mỗi 30 phút
- Security: `helmet` + rate limit (auth 5/phút, API 100/phút)

### Frontend
- React + Vite, proxy `/api` → port 3001
- React Router v6, PrivateRoute
- API client với Bearer token
- Hook `useAuth` — context, login, logout, persist
- Hook `useSSE` — real-time events
- Layout + sidebar nav
- Pages: Login, Register, Dashboard, Wallet, Quests, History, Admin, Gifting, Referral, PaymentResult, Profile, CreatorDashboard

### Replit
- Workflow tự chạy khi mở project (`bash start.sh`)
- Tất cả secrets trong Replit Secrets (không có trong code)
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
POST /api/wallet/deposit/create   — nạp tiền { amountVnd, paymentMethod }
POST /api/wallet/spend            — tiêu MT  { amount, type, itemId, description }
POST /api/wallet/tip              — tip       { receiverId, amountXu, message }
GET  /api/wallet/history          — lịch sử  ?limit=20&offset=0&type=...
GET  /api/wallet/platform-stats   — (admin) thống kê toàn nền tảng
POST /api/wallet/momo/ipn         — MoMo IPN webhook
POST /api/wallet/zalopay/ipn      — ZaloPay IPN webhook
```

### Quests (cần Bearer token)
```
GET  /api/quests              — danh sách quest + tiến trình user
POST /api/quests/:id/progress — cập nhật tiến trình { action, count }
POST /api/quests/:id/claim    — nhận thưởng
POST /api/quests              — (admin) tạo quest mới
```

### Admin (cần admin token)
```
GET  /api/admin/stats                     — tổng quan hệ thống
GET  /api/admin/users                     — danh sách users
POST /api/admin/users/:id/adjust          — điều chỉnh số dư
GET  /api/admin/chart-data                — dữ liệu chart 30 ngày
GET  /api/admin/export/transactions       — xuất CSV giao dịch
GET  /api/admin/export/users              — xuất CSV users
POST /api/admin/deposits/:id/approve      — duyệt nạp thủ công
POST /api/admin/deposits/:id/reject       — từ chối nạp
POST /api/admin/kyc/:userId/approve       — duyệt KYC
```

### User (cần Bearer token)
```
GET   /api/user/profile       — thông tin profile
PATCH /api/user/profile       — cập nhật username, avatar
POST  /api/user/kyc/submit    — nộp thông tin KYC
```

### Creator (cần creator/admin token)
```
GET /api/creator/stats   — dashboard creator: top tippers, biểu đồ 7 ngày
```

### Khác
```
GET /api/stream          — SSE real-time stream
GET /api/events          — danh sách events
GET /api/checkin/today   — trạng thái check-in hôm nay
POST /api/checkin        — check-in hàng ngày
GET  /api/notifications  — thông báo
GET  /api/referral/my-code — mã giới thiệu
```

---

## 💰 Mô hình kiếm tiền

| Nguồn | Tỷ lệ |
|-------|-------|
| Phí rút MT ra VNĐ | 10% |
| Phí tip creator | 5% |
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
