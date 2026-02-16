## 2025-05-14 - [Icon-only Button Accessibility]
**Learning:** Many icon-only buttons in the application were missing ARIA labels and titles, making them inaccessible to screen readers and providing no tooltips for sighted users. The logo functioning as a history toggle was particularly non-obvious.
**Action:** Always provide both `aria-label` and `title` for icon-only buttons. Ensure that branding elements used as interactive controls have clear descriptive labels.
