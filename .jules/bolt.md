# Bolt's Journal - Critical Performance Learnings

## 2025-05-21 - React Context and Render Optimizations

**Learning:** Redundant context provider nesting (shadowing) is a common pattern in this codebase that causes both performance overhead and stale state bugs. Specifically, `MapDataProvider` was being provided at both the page level and the leaf component level, leading to disconnected states between the chat logic and the map visualization.

**Action:** Always verify if a context provider is already present in the parent layout or page before adding it to a component. Memoize context values using `useMemo` to prevent unnecessary re-renders of the entire consumer tree. Use derived variables instead of `useEffect` + `useState` for UI logic that depends on existing props or state.
