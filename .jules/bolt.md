# Bolt Journal - Performance Learnings

## 2025-05-14 - React State Synchronization Optimization
**Learning:** Using `useState` + `useEffect` to synchronize state derived from props (e.g., `showEmptyScreen` from `messages.length`) causes unnecessary extra render cycles.
**Action:** Always prefer derived variables (`const showEmptyScreen = messages.length === 0`) for simple UI logic to ensure immediate updates and cleaner code.

## 2025-05-14 - Chat UI Re-render Prevention
**Learning:** In a chat application, the main message list (`ChatMessages`) often re-renders whenever the user types in the input field because they share a parent component (`Chat`). This is especially expensive if the message list performs computations like grouping.
**Action:** Wrap high-frequency UI components like `ChatMessages` in `React.memo` and use `useMemo` for any O(n) data transformations (like message grouping) to keep the UI responsive during user interaction.
