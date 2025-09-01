import {
  StreamableValue,
  createAI,
  createStreamableUI,
  createStreamableValue,
  getAIState,
  getMutableAIState,
} from 'ai/rsc';
import { CoreMessage, ToolResultPart } from 'ai';
import { nanoid } from 'nanoid';
import { Spinner } from '@/components/ui/spinner';
import { Section } from '@/components/section';
import { FollowupPanel } from '@/components/followup-panel';
import { inquire, researcher, taskManager, querySuggestor } from '@/lib/agents';
// Removed import of useGeospatialToolMcp as it no longer exists and was incorrectly used here.
// The geospatialTool (if used by agents like researcher) now manages its own MCP client.
import { writer } from '@/lib/agents/writer';
import { saveChat, getSystemPrompt } from '@/lib/actions/chat'; // Added getSystemPrompt
import { Chat, AIMessage } from '@/lib/types';
import { UserMessage } from '@/components/user-message';
import { BotMessage } from '@/components/message';
import { SearchSection } from '@/components/search-section';
import SearchRelated from '@/components/search-related';
import { CopilotDisplay } from '@/components/copilot-display';
import RetrieveSection from '@/components/retrieve-section';
import { VideoSearchSection } from '@/components/video-search-section';
import { MapQueryHandler } from '@/components/map/map-query-handler'; // Add this import

// Define the type for related queries
type RelatedQueries = {
  items: { query: string }[];
};

// Removed mcp parameter from submit, as geospatialTool now handles its client.
async function submit(formData?: FormData, skip?: boolean) {
'use server';

  // TODO: Update agent function signatures in lib/agents/researcher.tsx and lib/agents/writer.tsx
  // to accept currentSystemPrompt as the first argument.

  const aiState = getMutableAIState<typeof AI>();
  const uiStream = createStreamableUI();
  const isGenerating = createStreamableValue(true);
  const isCollapsed = createStreamableValue(false);
  // Get the messages from the state, filter out the tool messages
  const messages: CoreMessage[] = [...(aiState.get().messages as any[])].filter(
    (message) =>
      message.role !== 'tool' &&
      message.type !== 'followup' &&
      message.type !== 'related' &&
      message.type !== 'end'
  );

  // groupeId is used to group the messages for collapse
  const groupeId = nanoid();

  const useSpecificAPI = process.env.USE_SPECIFIC_API_FOR_WRITER === 'true';
  const maxMessages = useSpecificAPI ? 5 : 10;
  // Limit the number of messages to the maximum
  messages.splice(0, Math.max(messages.length - maxMessages, 0));
  // Get the user input from the form data
  const userInput = skip
    ? `{"action": "skip"}`
    : (formData?.get('input') as string);

  const content = skip
    ? userInput
    : formData
    ? JSON.stringify(Object.fromEntries(formData))
    : null;
  const type = skip
    ? undefined
    : formData?.has('input')
    ? 'input'
    : formData?.has('related_query')
    ? 'input_related'
    : 'inquiry';

  // Add the user message to the state
  if (content) {
    aiState.update({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages,
        {
          id: nanoid(),
          role: 'user',
          content,
          type,
        },
      ],
    });
    messages.push({
      role: 'user',
      content,
    });
  }

  // TODO: Replace 'anonymous' with actual user ID from session/auth context
  const userId = 'anonymous';
  const currentSystemPrompt = (await getSystemPrompt(userId)) || ''; // Default to empty string if null

  async function processEvents() {
    let action: any = { object: { next: 'proceed' } };
    // If the user skips the task, we proceed to the search
    if (!skip) action = (await taskManager(messages)) ?? action;

    if (action.object.next === 'inquire') {
      // Generate inquiry
      const inquiry = await inquire(uiStream, messages);
      uiStream.done();
      isGenerating.done();
      isCollapsed.done(false);
      aiState.done({
        ...aiState.get(),
        messages: [
          ...aiState.get().messages,
          {
            id: nanoid(),
            role: 'assistant',
            content: `inquiry: ${inquiry?.question}`,
          },
        ],
      });
      return;
    }

    // Set the collapsed state to true
    isCollapsed.done(true);

    // Generate the answer
    let answer = '';
    let toolOutputs: ToolResultPart[] = [];
    let errorOccurred = false;
    const streamText = createStreamableValue<string>();
    uiStream.update(<Spinner />);

    // If useSpecificAPI is enabled, only function calls will be made
    // If not using a tool, this model generates the answer
    while (
      useSpecificAPI
        ? answer.length === 0
        : answer.length === 0 && !errorOccurred
    ) {
      // Search the web and generate the answer
      // Removed mcp argument from researcher call
      const { fullResponse, hasError, toolResponses } = await researcher(
        currentSystemPrompt,
        uiStream,
        streamText,
        messages,
        // mcp, // mcp instance is no longer passed down
        useSpecificAPI
      );
      answer = fullResponse;
      toolOutputs = toolResponses;
      errorOccurred = hasError;

      if (toolOutputs.length > 0) {
        toolOutputs.map((output) => {
          aiState.update({
            ...aiState.get(),
            messages: [
              ...aiState.get().messages,
              {
                id: groupeId,
                role: 'tool',
                content: JSON.stringify(output.result),
                name: output.toolName,
                type: 'tool',
              },
            ],
          });
        });
      }
    }

    // If useSpecificAPI is enabled, generate the answer using the specific model
    if (useSpecificAPI && answer.length === 0) {
      // Modify the messages to be used by the specific model
      const modifiedMessages = aiState.get().messages.map((msg) =>
        msg.role === 'tool'
          ? {
              ...msg,
              role: 'assistant',
              content: JSON.stringify(msg.content),
              type: 'tool',
            }
          : msg
      ) as CoreMessage[];
      const latestMessages = modifiedMessages.slice(maxMessages * -1);
      answer = await writer(currentSystemPrompt, uiStream, streamText, latestMessages);
    } else {
      streamText.done();
    }

    if (!errorOccurred) {
      // Generate related queries
      const relatedQueries = await querySuggestor(uiStream, messages);
      // Add follow-up panel
      uiStream.append(
        <Section title="Follow-up">
          <FollowupPanel />
        </Section>
      );

      // Add the answer, related queries, and follow-up panel to the state
      // Wait for 0.5 second before adding the answer to the state
      await new Promise((resolve) => setTimeout(resolve, 500));

      aiState.done({
        ...aiState.get(),
        messages: [
          ...aiState.get().messages,
          {
            id: groupeId,
            role: 'assistant',
            content: answer,
            type: 'response',
          },
          {
            id: groupeId,
            role: 'assistant',
            content: JSON.stringify(relatedQueries),
            type: 'related',
          },
          {
            id: groupeId,
            role: 'assistant',
            content: 'followup',
            type: 'followup',
          },
        ],
      });
    }

    isGenerating.done(false);
    uiStream.done();
  }

  processEvents();

  return {
    id: nanoid(),
    isGenerating: isGenerating.value,
    component: uiStream.value,
    isCollapsed: isCollapsed.value,
  };
}

export type AIState = {
  messages: AIMessage[];
  chatId: string;
  isSharePage?: boolean;
};

export type UIState = {
  id: string;
  component: React.ReactNode;
  isGenerating?: StreamableValue<boolean>;
  isCollapsed?: StreamableValue<boolean>;
}[];

const initialAIState: AIState = {
  chatId: nanoid(),
  messages: [],
};

const initialUIState: UIState = [];

// AI is a provider you wrap your application with so you can access AI and UI state in your components.
export const AI = createAI<AIState, UIState>({
  actions: {
    submit,
  },
  initialUIState,
  initialAIState,
  onGetUIState: async () => {
    'use server';

    // TODO: This needs to be adapted to use server-side auth if needed for initial UI state based on user.
    // For now, it only uses getAIState().
    const aiState = getAIState() as AIState;
    if (aiState) {
      const uiState = getUIStateFromAIState(aiState);
      return uiState;
    }
    return initialUIState;
  },
  onSetAIState: async ({ state, done }) => {
    'use server';

    // Check if there is any message of type 'response' in the state messages
    if (!state.messages.some((e) => e.type === 'response')) {
      return;
    }

    const { chatId, messages } = state;
    const createdAt = new Date();
    // const userId = 'anonymous'; // Replaced with actual user ID
    const path = `/search/${chatId}`;
    const title =
      messages.length > 0
        ? JSON.parse(messages[0].content)?.input?.substring(0, 100) ||
          'Untitled Chat' // Default title consistency
        : 'Untitled Chat';
    // Add an 'end' message at the end to determine if the history needs to be reloaded
    const updatedMessages: AIMessage[] = [
      ...messages,
      {
        id: nanoid(),
        role: 'assistant',
        content: `end`,
        type: 'end',
      },
    ];


    // Get the actual user ID using server-side auth
    const { getCurrentUserIdOnServer } = await import('@/lib/auth/get-current-user');
    const actualUserId = await getCurrentUserIdOnServer();

    if (!actualUserId) {
      console.error("onSetAIState: User not authenticated. Chat not saved.");
      // Optionally, clear the AI state or handle appropriately
      // For now, we just won't save if there's no user.
      // Or, if chats for anonymous users are allowed with a guest ID, that logic would go here.
      return;
    }

    const chat: Chat = { // Chat is OldChatType from @/lib/types
      id: chatId,
      createdAt,
      userId: actualUserId, // Use the authenticated user's ID
      path,
      title,
      messages: updatedMessages,
    };
    // await saveChat(chat, actualUserId); // Pass actualUserId to saveChat
  },
});

export const getUIStateFromAIState = (aiState: AIState): UIState => {
  const chatId = aiState.chatId;
  const isSharePage = aiState.isSharePage;
  return aiState.messages
    .map((message, index) => {
      const { role, content, id, type, name } = message;

      if (
        !type ||
        type === 'end' ||
        (isSharePage && type === 'related') ||
        (isSharePage && type === 'followup')
      )
        return null;

      switch (role) {
        case 'user':
          switch (type) {
            case 'input':
            case 'input_related':
              const json = JSON.parse(content);
              const value = type === 'input' ? json.input : json.related_query;
              return {
                id,
                component: (
                  <UserMessage
                    message={value}
                    chatId={chatId}
                    showShare={index === 0 && !isSharePage}
                  />
                ),
              };
            case 'inquiry':
              return {
                id,
                component: <CopilotDisplay content={content} />,
              };
          }
          break;
        case 'assistant':
          const answer = createStreamableValue();
          answer.done(content);
          switch (type) {
            case 'response':
              return {
                id,
                component: (
                  <Section title="response">
                    <BotMessage content={answer.value} />
                  </Section>
                ),
              };
            case 'related':
              const relatedQueries = createStreamableValue<RelatedQueries>();
              relatedQueries.done(JSON.parse(content));
              return {
                id,
                component: (
                  <Section title="Related" separator={true}>
                    <SearchRelated relatedQueries={relatedQueries.value} />
                  </Section>
                ),
              };
            case 'followup':
              return {
                id,
                component: (
                  <Section title="Follow-up" className="pb-8">
                    <FollowupPanel />
                  </Section>
                ),
              };
          }
          break;
        case 'tool':
          try {
            const toolOutput = JSON.parse(content);
            const isCollapsed = createStreamableValue();
            isCollapsed.done(true); // Or false, depending on if we want this visible

            // Check if this is our map query trigger
            if (toolOutput.type === "MAP_QUERY_TRIGGER" && name === "geospatialQueryTool") {
              // The MapQueryHandler now expects the entire toolOutput object
              return {
                id, // message id
                component: <MapQueryHandler toolOutput={toolOutput} />, 
                isCollapsed: false, // Allow handler to be active
              };
            }

            if (toolOutput.type === 'DRAWING') {
              return {
                id,
                component: null, // Replace with a new DrawingHandler component if needed
              };
            }

            // Existing tool handling
            const searchResults = createStreamableValue();
            searchResults.done(JSON.stringify(toolOutput));
            switch (name) {
              case 'search':
                return {
                  id,
                  component: <SearchSection result={searchResults.value} />,
                  isCollapsed: isCollapsed.value,
                };
              case 'retrieve':
                return {
                  id,
                  component: <RetrieveSection data={toolOutput} />,
                  isCollapsed: isCollapsed.value,
                };
              case 'videoSearch':
                return {
                  id,
                  component: (
                    <VideoSearchSection result={searchResults.value} />
                  ),
                  isCollapsed: isCollapsed.value,
                };
              // Add a default case for other tools if any, or if the specific tool is not found
              default:
                console.warn(`Unhandled tool result in getUIStateFromAIState: ${name}`);
                return { id, component: null }; // Or some generic tool display
            }
          } catch (error) {
            console.error("Error parsing tool content in getUIStateFromAIState:", error);
            return {
              id,
              component: null, // Or an error display component
            };
          }
          break;
        default:
          return {
            id,
            component: null, // Or some generic tool display
          };
      }
    })
    .filter((message) => message !== null) as UIState;
};
