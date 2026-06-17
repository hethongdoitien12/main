# MT Economy

Hệ thống kinh tế ảo (Virtual Economy) nội bộ — quản lý tiền tệ **MT**, ví người dùng, quest, tip creator, rút tiền, và thống kê nền tảng.

> **Lưu ý tên tiền tệ:** Hiển thị = **MT**. Cột DB giữ tên cũ (`amount_xu`, `fee_xu`, v.v.) để tương thích — không đổi.

## Tech Stack
- **Backend:** Node.js + Express (port 3001)
- **Frontend:** React + Vite (port 5000)
- **Database:** PostgreSQL (Replit managed, via `DATABASE_URL`)
- **Auth:** JWT (`JWT_SECRET` secret)
- **Email:** Replit Mail (`replitmail`)

## Chạy dự án
```bash
bash start.sh
```
Script tự động: cài deps → migrate DB → seed nếu trống → chạy backend + frontend.

## Tài khoản test
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@xu.vn | password123 |
| Creator | nam@creator.vn | password123 |
| User | linh@user.vn | password123 |

---

## ⚠️ AGENT — ĐỌC KHI MỞ DỰ ÁN

**Bước đầu tiên bắt buộc:** Đọc file `tientrinhethong.md` trước khi làm bất cứ việc gì.

- Nếu có task `[ ]` trong file đó → tự động build theo mô tả, sau đó đổi thành `[x]` và ghi ngày.
- Nếu tất cả đã `[x]` → tiếp tục với yêu cầu của user bình thường.

---

## User preferences
- Ngôn ngữ giao tiếp: Tiếng Việt
- Vite binary: dùng `node node_modules/vite/bin/vite.js` (không dùng `vite` trực tiếp)
