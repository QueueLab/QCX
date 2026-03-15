
## 2026-02-20 - [Accessible Header Actions]
**Learning:** Icon-only buttons in the navigation header lack clear visual and screen-reader context. While ARIA labels solve accessibility, they don't provide visual guidance for sighted users on hover.
**Action:** Always pair ARIA labels with Tooltips for icon-only navigation elements. Ensure a global TooltipProvider is available in the root layout to support these components.
