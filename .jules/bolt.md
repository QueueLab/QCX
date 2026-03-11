## 2026-02-18 - [React Performance: Context Memoization & Derived Variables]
**Learning:** React Context providers that pass object literals as values cause all consumers to re-render whenever the provider re-renders, even if the data hasn't changed. Similarly, using `useState` + `useEffect` for simple UI logic (like `showEmptyScreen`) introduces an extra render cycle and unnecessary state management overhead.
**Action:** Always memoize Context provider values using `useMemo` and prefer derived variables over `useState` for simple data transformations from existing state/props.
