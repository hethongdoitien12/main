# 🪙 XU Economy — Hệ thống Virtual Economy & Token

Hệ thống ví XU nội bộ cho nền tảng: nạp tiền, kiếm XU, tiêu XU, rút ra VNĐ, tip creator.

---

## 📁 Cấu trúc thư mục

```
xu-economy/
├── backend/          ← Node.js + Express API
│   └── src/
│       ├── db/       ← migrate.js, seed.js, pool.js
│       ├── middleware/  ← auth.js (JWT)
│       ├── routes/   ← auth, wallet, quests
│       └── services/ ← ledger.js (core engine)
└── frontend/         ← React + Vite
    └── src/
        ├── pages/    ← Dashboard, Wallet, Quests, History
        ├── components/  ← Layout
        └── hooks/    ← useAuth
```

---

## ⚡ Cài đặt & Chạy

### Bước 1 — Cài Node.js
Tải tại https://nodejs.org (LTS, v18 trở lên)

### Bước 2 — Cài PostgreSQL
- Windows: https://www.postgresql.org/download/windows/
- Mac: `brew install postgresql@15`
- Linux: `sudo apt install postgresql`

Sau khi cài, tạo database:
```sql
createdb xu_economy
-- hoặc trong psql:
CREATE DATABASE xu_economy;
```

### Bước 3 — Cài dependencies

Mở terminal, vào thư mục dự án:

```bash
# Backend
cd xu-economy/backend
npm install

# Frontend
cd ../frontend
npm install
```

### Bước 4 — Cấu hình môi trường

```bash
cd xu-economy/backend
cp .env.example .env
```

Mở file `.env`, sửa các giá trị:
```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/xu_economy
JWT_SECRET=bat-ky-chuoi-nao-dai-khoang-32-ky-tu
```

### Bước 5 — Tạo bảng & dữ liệu mẫu

```bash
cd xu-economy/backend
npm run migrate   # tạo tất cả bảng trong DB
npm run seed      # tạo tài khoản test + quest mẫu
```

### Bước 6 — Chạy

Mở **2 terminal riêng**:

**Terminal 1 — Backend:**
```bash
cd xu-economy/backend
npm run dev
# → chạy tại http://localhost:3001
```

**Terminal 2 — Frontend:**
```bash
cd xu-economy/frontend
npm run dev
# → mở http://localhost:5173
```

---

## 🧪 Tài khoản test

| Email | Mật khẩu | Vai trò | Số dư |
|-------|----------|---------|-------|
| admin@xu.vn | password123 | Admin | 0 XU |
| nam@creator.vn | password123 | Creator | 10,000 XU |
| linh@user.vn | password123 | User | 10,000 XU |

---

## 🔌 API Endpoints

### Auth
```
POST /api/auth/register   { username, email, password }
POST /api/auth/login      { email, password }
```

### Wallet (cần Bearer token)
```
GET  /api/wallet                  — số dư ví
POST /api/wallet/deposit          — nạp tiền { amountVnd, paymentMethod }
POST /api/wallet/withdraw         — rút tiền { amountXu, bankName, bankAccount, accountName }
POST /api/wallet/spend            — tiêu XU  { amount, type, itemId, description }
POST /api/wallet/tip              — tip       { receiverId, amountXu, message }
GET  /api/wallet/history          — lịch sử  ?limit=20&offset=0&type=...
GET  /api/wallet/deposits         — lịch sử nạp
GET  /api/wallet/withdrawals      — lịch sử rút
GET  /api/wallet/platform-stats   — (admin) thống kê toàn nền tảng
```

### Quests (cần Bearer token)
```
GET  /api/quests              — danh sách quest + tiến trình user
POST /api/quests/:id/progress — cập nhật tiến trình { action, count }
POST /api/quests/:id/claim    — nhận thưởng
POST /api/quests              — (admin) tạo quest mới
```

---

## 💰 Mô hình kiếm tiền

| Nguồn | Tỷ lệ |
|-------|-------|
| Phí rút XU ra VNĐ | 10% |
| Phí tip creator | 5% |
| Float (tiền nạp chưa tiêu) | lãi ngân hàng |
| XU miễn phí expire sau 90 ngày | 100% |

---

## 🔗 Tích hợp vào hệ thống vé / thế giới ảo

Khi user mua vé hoặc item, gọi:
```javascript
POST /api/wallet/spend
{
  "amount": 5000,
  "type": "spend_ticket",
  "itemId": "<ticket_id>",
  "itemType": "ticket",
  "description": "Vé concert ABC"
}
```

Khi user kiếm được XU (hoàn thành game, tạo content):
```javascript
POST /api/quests/:questId/progress
{ "action": "play_game", "count": 1 }
```

---

## 🛡️ Lưu ý pháp lý (Việt Nam)

- **Giai đoạn 1 (hiện tại):** Chỉ dùng nội bộ, không cho phép rút ra — không cần giấy phép NHNN
- **Giai đoạn 2:** Khi mở tính năng rút tiền thật → tham khảo **Nghị định 52/2024/NĐ-CP** về dịch vụ trung gian thanh toán
- Không dùng thuật ngữ "token", "coin", "blockchain" để tránh liên quan đến quy định tài sản ảo

---

## 🚀 Deploy production

```bash
# Backend: Railway, Render, hoặc VPS
# Frontend: Vercel, Netlify
# DB: Supabase (PostgreSQL free tier) hoặc Railway

# Build frontend
cd frontend && npm run build
```
