## 2025-05-14 - [React Context & Provider Shadowing]
**Learning:** Redundant context providers can cause "shadowing" where children update an inner provider's state while the parent consumes an outer provider's stale state. This often leads to bugs and unnecessary re-renders. Additionally, unmemoized context values cause all consumers to re-render whenever the provider re-renders, even if the consumed state hasn't changed.

**Action:** Always memoize context value objects with `useMemo` and functions with `useCallback`. Audit the component tree to remove redundant providers, ensuring a single source of truth for each context while maintaining proper state isolation (e.g., keeping chat-specific data at the page/chat level rather than the root layout if session isolation is required).
