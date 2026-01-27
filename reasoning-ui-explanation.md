## Reasoning UI Explanation

The reasoning UI is a powerful feature that provides real-time insight into the AI's thinking process. It is built on top of the Vercel AI SDK's streaming capabilities, and it can be easily repurposed to display any kind of streaming data.

### How it Works

The reasoning UI is generated through a series of steps:

1.  **Streamable Values:** When a user submits a query, the `submit` function in `app/actions.tsx` creates two `StreamableValue` objects: `reasoningStream` and `actionsStream`. These objects are essentially real-time data streams that can be updated from the server.

2.  **UI Stream Update:** The `submit` function then immediately updates the `uiStream` with the `ReasoningDisplay` component. This component is passed the `reasoningStream` and `actionsStream` as props, and it uses the `useStreamableValue` hook to listen for updates to these streams.

3.  **Agent Logic:** The `researcher` agent in `lib/agents/researcher.tsx` is responsible for processing the AI's output. As the agent receives reasoning tokens and tool calls from the AI, it updates the `reasoningStream` and `actionsStream` with the new data.

4.  **Real-time Rendering:** The `ReasoningDisplay` component automatically re-renders whenever the `reasoningStream` or `actionsStream` are updated, which creates the real-time streaming effect.

### Repurposing the Reasoning UI

The reasoning UI can be easily repurposed to display any kind of streaming data. To do this, you would need to:

1.  **Create a new `StreamableValue`:** In the `submit` function, create a new `StreamableValue` for your data.

2.  **Update the `uiStream`:** Update the `uiStream` with a new component that is passed your new `StreamableValue` as a prop.

3.  **Update the agent logic:** In the `researcher` agent, update your new `StreamableValue` with your data.

By following this pattern, you can create any number of real-time streaming components in your application.
