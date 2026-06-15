---
name: XU Expiry design
description: Thiết kế hệ thống expire XU khuyến mãi — bảng xu_expiry_batches, cron job, loại XU nào expire
---

**Rule:** Chỉ XU từ `earn_quest` và `earn_referral` mới expire. XU từ `deposit` không bao giờ expire.

**Why:** Business rule của XU Economy — tiền thật nạp vào phải an toàn, chỉ XU bonus/khuyến mãi có thời hạn.

**How to apply:**
- Sau mỗi quest claim → insert vào `xu_expiry_batches` (source_type='quest', expires_at = +90 ngày)
- Sau referral reward → insert vào `xu_expiry_batches` (source_type='referral', expires_at = +90 ngày)
- Cron job `expirePromotionalXu()` chạy 01:00 GMT+7 hằng ngày, query batch active quá hạn, tạo ledger entry type='expire', notify user
- Admin có thể trigger thủ công: `POST /api/admin/run-expire`
- `GET /api/wallet/expiry-info` để user xem lô XU sắp hết hạn
