---
name: Phase 14 UX Components
description: Các component UX đã build trong Phase 14 — Toast, Skeleton, EmptyState, OnboardingBanner
---

## Toast System
- File: `frontend/src/context/ToastContext.jsx`
- Hook: `useToast()` → `{ addToast }` — gọi `addToast(type, message)`
- 4 types: `success | error | warn | info`
- Provider: đã wrap trong `App.jsx` qua `ToastProvider`
- **Quan trọng:** `Gifting.jsx` có `addToast` riêng (local state) — KHÔNG dùng `useToast()` từ context

## Skeleton Loading
- File: `frontend/src/components/Skeleton.jsx`
- Exports: `SkeletonBox`, `SkeletonText`, `SkeletonCard`, `SkeletonStat`, `SkeletonGrid`, `SkeletonRow`

## Empty State
- File: `frontend/src/components/EmptyState.jsx`
- Props: `icon`, `title`, `subtitle`, `action` (JSX)

## Onboarding Banner
- Trong `Dashboard.jsx` — component `OnboardingBanner`
- localStorage key: `onboard_dismissed` = `'1'` để ẩn
- Tự ẩn khi tất cả steps đã done
- Bước "Khám phá Creator" (step index 2) luôn `done: false` — không có cách auto-detect

## React.lazy
- Tất cả pages trong `App.jsx` dùng `React.lazy` + `Suspense`
- PageLoader: spinner component dùng khi suspense đang chờ
