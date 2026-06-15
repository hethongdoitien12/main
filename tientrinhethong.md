# 🗺️ TIẾN TRÌNH HỆ THỐNG — XU Economy

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
| Deploy | 🔄 Sẵn sàng |

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
- [x] **Frontend: Chart trong `Admin.jsx`** — dùng `recharts` (`npm install recharts`), 2 chart: doanh thu VND + user mới
- [x] **Backend: `GET /api/admin/export/transactions`** — xuất CSV ledger entries (filter by date range)
- [x] **Backend: `GET /api/admin/export/users`** — xuất CSV danh sách users
- [x] **Frontend: Nút Export CSV** trong Admin — download file thẳng từ API

---

### ✅ TASK 5 — Admin: Approve Deposit Thủ Công
- [x] **Backend: `POST /api/admin/deposits/:id/approve`** — admin confirm deposit ngân hàng thủ công, cộng XU vào ví
- [x] **Backend: `POST /api/admin/deposits/:id/reject`** — từ chối, cập nhật status
- [x] **Frontend: Tab "Nạp chờ duyệt"** trong `Admin.jsx` — danh sách deposit pending, nút Approve/Reject từng cái

---

### ✅ TASK 6 — KYC Placeholder
- [x] **Backend: Thêm cột `kyc_status`** vào bảng `users` — `'none' | 'pending' | 'verified'`, default `'none'`
- [x] **Backend: Chặn rút** nếu `amount_xu > 1_000_000` và `kyc_status !== 'verified'` — trả lỗi rõ ràng
- [x] **Backend: `POST /api/user/kyc/submit`** — user nộp thông tin (tên, CCCD mock), set `kyc_status = 'pending'`
- [x] **Backend: `POST /api/admin/kyc/:userId/approve`** — admin duyệt KYC, set `kyc_status = 'verified'`
- [x] **Frontend: Banner KYC** trong trang Wallet khi số dư > 800,000 XU — nhắc user xác minh trước khi rút lớn

---

### ✅ TASK 7 — Deploy
- [x] **Frontend build test** — chạy `npm run build` trong `frontend/`, fix lỗi nếu có
- [x] **Backend production config** — khi `NODE_ENV=production`: tắt stack trace trong error handler, bật `trust proxy`
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
- Route Admin: stats, user list, adjust balance
- Route Notifications: list, read, delete
- Route Referral: my-code, use, stats
- Service Ledger: double-entry, idempotency key
- Service QuestTrigger: auto-award XU
- Gateway MoMo + ZaloPay (sandbox)
- MoMo IPN Webhook (`POST /api/wallet/momo/ipn`)
- ZaloPay IPN Webhook (`POST /api/wallet/zalopay/ipn`)
- Cronjob: XU expiry 01:00 GMT+7 + cleanup pending mỗi 30 phút
- Security: `helmet` + rate limit (auth 5/phút, API 100/phút)

### Frontend
- React + Vite, proxy `/api` → port 3001
- React Router v6, PrivateRoute
- API client với Bearer token
- Hook `useAuth` — context, login, logout, persist
- Layout + sidebar nav
- Pages: Login, Register, Dashboard, Wallet, Quests, History, Admin, Gifting, Referral, PaymentResult

### Replit
- Workflow tự chạy khi mở project
- Tất cả secrets trong Replit Secrets (không có trong code)
- DB đã migrate + seed xong

</details>

---

## 🔑 ENV VARS (Replit Secrets)

| Biến | Trạng thái |
|------|-----------|
| DATABASE_URL | ✅ Replit tự quản lý |
| JWT_SECRET | ✅ Đã set |
| MOMO_SECRET_KEY | ✅ Sandbox |
| ZALOPAY_KEY1 | ✅ Sandbox |
| ZALOPAY_KEY2 | ✅ Sandbox |
| PORT | ✅ 3001 |
| FRONTEND_URL | ✅ http://localhost:5000 |
| MOMO_PARTNER_CODE | ✅ MOMO_TEST |
| MOMO_ACCESS_KEY | ✅ F8BBA842ECF85 |
| MOMO_ENDPOINT | ✅ https://test-payment.momo.vn |
| ZALOPAY_APP_ID | ✅ 2553 |
| ZALOPAY_ENDPOINT | ✅ https://sb-openapi.zalopay.vn |

---

## 🧪 Tài khoản test

| Email | Mật khẩu | Role |
|-------|----------|------|
| admin@xu.vn | password123 | Admin |
| nam@creator.vn | password123 | Creator |
| linh@user.vn | password123 | User |
