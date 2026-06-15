---
name: HMR useAuth warning
description: Lỗi transient "useAuth export incompatible" xuất hiện khi hot-reload nhiều file cùng lúc
---

**Rule:** Bỏ qua lỗi HMR "useAuth export is incompatible" — đây là transient, tự resolve sau khi page reload.

**Why:** Vite Fast Refresh yêu cầu file chỉ export components. `useAuth.jsx` export cả hook lẫn Provider, gây cảnh báo khi HMR invalidate nhiều module cùng lúc. App vẫn chạy đúng sau khi browser reconnect.

**How to apply:** Không cần sửa. Nếu user báo màn hình trắng sau khi edit nhiều file, chỉ cần F5 là xong.
