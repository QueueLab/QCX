## 2025-05-15 - [Consistency in Icon-Only Button Feedback]
**Learning:** Sighted users rely on visual tooltips (like the native `title` attribute or custom `Tooltip` components) to understand icon-only buttons. Removing these without providing a replacement degrades the UX. Accessibility improvements (`aria-label`) should complement, not replace, visual labels.
**Action:** Always ensure icon-only buttons have either a `title` attribute or are wrapped in a `Tooltip` component for visual feedback, in addition to `aria-label` for screen readers.

## 2025-05-15 - [Portal-based Component Injection]
**Learning:** When using portals to inject buttons (e.g., `HeaderSearchButton`), the target container must exist in the DOM for the button to appear. If the target container is moved or replaced, the portal ID must be maintained or updated.
**Action:** When refactoring layouts that host portal targets, verify that the target IDs (like `mobile-header-search-portal`) are preserved or correctly re-implemented.
