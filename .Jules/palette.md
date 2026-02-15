## 2025-05-14 - [Accessibility Audit & Fix for Icon Buttons]
**Learning:** Icon-only buttons without aria-labels are common accessibility gaps in this project. Adding them consistently across Core UI (Header, ChatPanel, MobileIconsBar) significantly improves the experience for screen reader users without visual clutter.
**Action:** Always check icon-only buttons for aria-label or title attributes when modifying UI.

## 2025-05-14 - [Loading Feedback for Submissions]
**Learning:** Reusing existing state (like isSubmitting) to provide visual feedback (Spinner) is preferred over creating redundant states. It keeps the architecture clean and prevents synchronization issues.
**Action:** Look for existing submission/loading states in parent components before introducing new ones in child components.
