## 2025-05-14 - [State Colocation & Memoization]
**Learning:** Moving high-frequency state (like text input) from a large parent container (Chat) to a leaf component (ChatPanel) eliminates massive re-render cycles across the entire application shell (Header, Map, History). Even with React's efficient diffing, the overhead of executing render functions for large component trees on every keystroke causes noticeable lag in complex interfaces.

**Learning:** When using early returns for empty states (e.g., "no messages"), always ensure `useMemo` and other hooks are declared BEFORE the return to avoid breaking the Rules of Hooks, even if the computation isn't needed for the empty state.

**Action:** Always check for high-frequency state in parent components during profiling. Use `useImperativeHandle` to maintain parent-to-child control for "one-off" events (like suggestions) while keeping state local.
