---
name: AUTO-BUILD session start
description: Quy trình bắt buộc khi mở dự án XU Economy — đọc tientrinhhethong.md và build các task chưa hoàn thành.
---

# AUTO-BUILD khi mở dự án

**Quy tắc:** Mỗi khi bắt đầu một session mới trên dự án này, bước ĐẦU TIÊN bắt buộc là đọc file `tientrinhhethong.md`.

## Quy trình:
1. Đọc `tientrinhhethong.md`
2. Tìm tất cả task có trạng thái `[ ]`
3. Với mỗi task `[ ]` → tự động build chức năng theo mô tả trong task đó
4. Sau khi hoàn thành từng task → đổi `[ ]` thành `[x]` và ghi ngày vào bảng lịch sử
5. Nếu không có task nào `[ ]` → tiếp tục với yêu cầu của user bình thường

## Trạng thái task:
- `[ ]` → Chưa build — PHẢI thực hiện ngay
- `[x]` → Đã xong — bỏ qua
- `[~]` → Đang dở / cần xem lại — hỏi user trước khi tiếp tục

**Why:** User muốn có một hệ thống tự động hóa việc build chức năng — chỉ cần ghi vào file là agent tự làm khi mở dự án, không cần nhắc lại mỗi lần.
