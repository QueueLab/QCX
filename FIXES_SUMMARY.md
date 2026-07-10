# UI Fixes Summary

## Issue 1: Profile icon not usable on mobile
**Root cause:** In `profile-toggle.tsx` line 68-74, when `isMobile` is true, the ProfileToggle renders a disabled Button.
**Fix:** Remove the `disabled` attribute so the profile icon is clickable on mobile. The existing ProfileToggle already renders properly in the mobile-icons-bar.

## Issue 2: Example prompts overflow past the screen on mobile
**Root cause:** In `empty-screen.tsx`, the prompt buttons don't have `whitespace-normal` or `overflow-wrap: break-word`, so long text extends past the screen edge on mobile.
**Fix:** Add `whitespace-normal text-left break-words max-w-full` to the EmptyScreen buttons and ensure the container has proper overflow handling.

## Issue 3: History icon missing from desktop layout
**Root cause:** In `history-container.tsx`, the class `sm:hidden` hides the history icon on all screens above 640px (tablet and desktop).
**Fix:** Remove `sm:hidden` so the history icon is visible on all screen sizes including desktop.

## Issue 4: Tablet layout example prompts positioned too low
**Root cause:** In `chat.tsx` desktop layout, the chat section has `pt-16 md:pt-20` padding top which pushes content too far down on tablet (md breakpoint at 768px). Also the sidebar uses `hidden md:flex` in header which only shows at md, and the desktop layout uses `flex justify-start` which may not be optimal for tablet.
**Fix:** Adjust the padding and spacing in the desktop/tablet layout. The chat panel container has excessive padding. Also need to check if the prompt area positioning in the empty screen needs adjustment for tablet.

## Issue 5: Icons not equally spread across the screen
**Root cause:** In `globals.css`, the `.mobile-icons-bar-content` uses `justify-content: space-between` for tablet (768px+) but the `gap: 0` removes spacing between items. The icons are not evenly distributed.
**Fix:** Use `justify-content: space-evenly` instead of `space-between` for tablet, and add a small gap for better visual spacing.
