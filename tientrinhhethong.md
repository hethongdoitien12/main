# 🚀 AUTO-BUILD TIẾN TRÌNH HỆ THỐNG

> **AGENT INSTRUCTION:** Mỗi khi mở dự án, đọc file này TRƯỚC TIÊN.  
> Với mỗi task có trạng thái `[ ]` → tự động build chức năng đó theo mô tả.  
> Sau khi hoàn thành → đổi thành `[x]` và ghi ngày hoàn thành.

---

## 📋 HƯỚNG DẪN SỬ DỤNG

### Thêm chức năng mới cần build:
```
- [ ] TÊN_CHỨC_NĂNG — Mô tả chi tiết những gì cần làm
```

### Trạng thái:
- `[ ]` → Chưa build — agent sẽ tự động thực hiện
- `[x]` → Đã hoàn thành
- `[~]` → Đang làm dở / cần xem lại

---

## ✅ DANH SÁCH CHỨC NĂNG

<!-- Thêm các chức năng cần auto-build vào đây -->
<!-- Ví dụ:
- [ ] THÊM TÍNH NĂNG X — Mô tả chi tiết yêu cầu, file nào cần sửa, logic như thế nào
- [ ] SỬA LỖI Y — Mô tả bug, nguyên nhân nghi ngờ, cách fix mong muốn
-->


---

## 📝 LỊCH SỬ HOÀN THÀNH

| Ngày | Chức năng | Ghi chú |
|------|-----------|---------|
| 17/06/2026 | File được tạo lần đầu | — |
| 17/06/2026 | Cổng thanh toán thật (MoMo/ZaloPay) | BACKEND_URL → Replit domain; gateway đọc từ env secrets |
| 17/06/2026 | UI cấu hình phí Admin | Bảng `platform_config`; tab ⚙️ Cấu hình trong Admin; API GET/PUT /api/admin/config |
| 17/06/2026 | Hoàn thiện flow rút tiền | Mã giao dịch ngân hàng khi duyệt; email thông báo qua `mailer.js`; `bank_transfer_ref` lưu DB |
| 17/06/2026 | Đổi tên tiền tệ XU → MT | sed word-boundary replace toàn bộ codebase; DB column giữ nguyên; display text + labels đều hiển thị "MT" |
| 17/06/2026 | Cửa hàng MT (Shop) | Bảng `shop_items` + `shop_purchases`; 8 vật phẩm mặc định (badge/frame/boost/ticket/exclusive); mua bằng MT qua ledger `spend_item`; trang `/shop` với filter category + tab "Đã mua"; API admin quản lý items |
