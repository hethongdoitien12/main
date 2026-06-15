---
name: Vite binary permission
description: Cách khởi động Vite đúng trên Replit (permission denied với binary trực tiếp)
---

**Rule:** Luôn dùng `node node_modules/vite/bin/vite.js` thay vì `vite` hay `npx vite`.

**Why:** Trên Replit, binary `vite` trong `node_modules/.bin/` bị permission denied khi chạy từ script. Gọi trực tiếp qua `node` thì không bị vấn đề này.

**How to apply:** Trong `package.json` scripts và `start.sh`, đảm bảo dùng `node node_modules/vite/bin/vite.js`.
