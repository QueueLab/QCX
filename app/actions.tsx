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
import { researcher } from '@/lib/agents';
import { saveChat, getSystemPrompt } from '@/lib/actions/chat';
import { Chat, AIMessage } from '@/lib/types';
import { UserMessage } from '@/components/user-message';
import { BotMessage } from '@/components/message';
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ai-elements/reasoning';

async function submit(formData?: FormData) {
  'use server';

  const aiState = getMutableAIState<typeof AI>();
  const uiStream = createStreamableUI();
  const isGenerating = createStreamableValue(true);

  const messages: CoreMessage[] = [...(aiState.get().messages as any[])].filter(
    (message) =>
      message.role !== 'tool' &&
      message.type !== 'followup' &&
      message.type !== 'related' &&
      message.type !== 'end'
  );

  const userInput = (formData?.get('input') as string);

  if (userInput) {
    aiState.update({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages,
        {
          id: nanoid(),
          role: 'user',
          content: userInput,
        },
      ],
    });
    messages.push({
      role: 'user',
      content: userInput,
    });
  }

  const userId = 'anonymous';
  const currentSystemPrompt = (await getSystemPrompt(userId)) || '';

  async function processEvents() {
    const streamText = createStreamableValue<string>();
    uiStream.update(<Spinner />);

    const { fullResponse, hasError, toolResponses, reasoningContent } = await researcher(
      uiStream,
      streamText,
      messages,
      currentSystemPrompt,
    );

    if (reasoningContent) {
      aiState.update({
        ...aiState.get(),
        messages: [
          ...aiState.get().messages,
          {
            id: nanoid(),
            role: 'assistant',
            content: reasoningContent,
            type: 'reasoning',
          },
        ],
      });
    }

    if (toolResponses.length > 0) {
      toolResponses.map((output) => {
        aiState.update({
          ...aiState.get(),
          messages: [
            ...aiState.get().messages,
            {
              id: nanoid(),
              role: 'tool',
              content: JSON.stringify(output.result),
              name: output.toolName,
              type: 'tool',
            },
          ],
        });
      });
    }

    if (!hasError) {
      aiState.done({
        ...aiState.get(),
        messages: [
          ...aiState.get().messages,
          {
            id: nanoid(),
            role: 'assistant',
            content: fullResponse,
            type: 'response',
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
  };
}

export type AIState = {
  messages: AIMessage[];
  chatId: string;
};

export type UIState = {
  id: string;
  component: React.ReactNode;
  isGenerating?: StreamableValue<boolean>;
}[];

const initialAIState: AIState = {
  chatId: nanoid(),
  messages: [],
};

const initialUIState: UIState = [];

export const AI = createAI<AIState, UIState>({
  actions: {
    submit,
  },
  initialUIState,
  initialAIState,
  onGetUIState: async () => {
    'use server';
    const aiState = getAIState() as AIState;
    if (aiState) {
      const uiState = getUIStateFromAIState(aiState);
      return uiState;
    }
    return initialUIState;
  },
  onSetAIState: async ({ state }) => {
    'use server';
    const { chatId, messages } = state;
    const createdAt = new Date();
    const userId = 'anonymous';
    const path = `/search/${chatId}`;
    const title = messages.length > 0 ? (messages[0].content as string).substring(0, 100) : 'Untitled Chat';

    const chat: Chat = {
      id: chatId,
      createdAt,
      userId,
      path,
      title,
      messages,
    };
    await saveChat(chat, userId);
  },
});

export const getUIStateFromAIState = (aiState: AIState): UIState => {
  return aiState.messages.map((message, index) => {
    const { role, content, id, type, name } = message;

    switch (role) {
      case 'user':
        return {
          id,
          component: <UserMessage message={content} />,
        };
      case 'assistant':
        switch (type) {
          case 'response':
            const streamableContent = createStreamableValue();
            streamableContent.done(content);
            return {
              id,
              component: <BotMessage content={streamableContent.value} />,
            };
          case 'reasoning':
            return {
              id,
              component: (
                <Reasoning isStreaming={false} className="w-full">
                  <ReasoningTrigger />
                  <ReasoningContent>{content}</ReasoningContent>
                </Reasoning>
              ),
            };
          default:
            const streamableContentDefault = createStreamableValue();
            streamableContentDefault.done(content);
            return {
                id,
                component: <BotMessage content={streamableContentDefault.value} />,
            };
        }
      case 'tool':
        // Handle tool messages if any
        return {
            id,
            component: <div>Tool call: {name}</div>
        }
      default:
        return {
            id,
            component: <div>Unknown message type</div>
        }
    }
  });
};
