## 2025-05-23 - [Standardizing Icon Button Accessibility and Tooltips]
**Learning:** Icon-only buttons without labels or tooltips create "mystery meat navigation" and are inaccessible to screen readers. Standardizing on `Tooltip` for visual labels and `aria-label` for parity ensures a consistent and accessible UX across desktop and mobile.
**Action:** Always wrap new icon-only buttons in `Tooltip` (desktop) and ensure `aria-label` is present for all icon-only interactions.
