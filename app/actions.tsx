import {
  StreamableValue,
  createAI,
  createStreamableUI,
  createStreamableValue,
  getAIState,
  getMutableAIState
} from 'ai/rsc'
import { CoreMessage, ToolResultPart } from 'ai'
import { nanoid } from 'nanoid'
import type { FeatureCollection } from 'geojson'
import { Spinner } from '@/components/ui/spinner'
import { Section } from '@/components/section'
import { FollowupPanel } from '@/components/followup-panel'
import { inquire, researcher, taskManager, querySuggestor, resolutionSearch, type DrawnFeature } from '@/lib/agents'
// Removed import of useGeospatialToolMcp as it no longer exists and was incorrectly used here.
// The geospatialTool (if used by agents like researcher) now manages its own MCP client.
import { writer } from '@/lib/agents/writer'
import { saveChat, getSystemPrompt } from '@/lib/actions/chat' // Added getSystemPrompt
import { Chat, AIMessage } from '@/lib/types'
import { UserMessage } from '@/components/user-message'
import { BotMessage } from '@/components/message'
import { SearchSection } from '@/components/search-section'
import SearchRelated from '@/components/search-related'
import { GeoJsonLayer } from '@/components/map/geojson-layer'
import { CopilotDisplay } from '@/components/copilot-display'
import RetrieveSection from '@/components/retrieve-section'
import { VideoSearchSection } from '@/components/video-search-section'
import { MapQueryHandler } from '@/components/map/map-query-handler' // Add this import

// Define the type for related queries
type RelatedQueries = {
  items: { query: string }[]
}

// Removed mcp parameter from submit, as geospatialTool now handles its client.
async function submit(formData?: FormData, skip?: boolean) {
  'use server'

  const aiState = getMutableAIState<typeof AI>()
  const uiStream = createStreamableUI()
  const isGenerating = createStreamableValue(true)
  const isCollapsed = createStreamableValue(false)

  const action = formData?.get('action') as string;
  if (action === 'resolution_search') {
    const file = formData?.get('file') as File;
    const timezone = (formData?.get('timezone') as string) || 'UTC';
    const drawnFeaturesString = formData?.get('drawnFeatures') as string;
    let drawnFeatures: DrawnFeature[] = [];
    try {
      drawnFeatures = drawnFeaturesString ? JSON.parse(drawnFeaturesString) : [];
    } catch (e) {
      console.error('Failed to parse drawnFeatures:', e);
    }

    if (!file) {
      throw new Error('No file provided for resolution search.');
    }

    const buffer = await file.arrayBuffer();
    const dataUrl = `data:${file.type};base64,${Buffer.from(buffer).toString('base64')}`;

    // Get the current messages, excluding tool-related ones.
    const messages: CoreMessage[] = (aiState.get().messages as AIMessage[]).filter(
      message =>
        message.role !== 'tool' &&
        message.type !== 'followup' &&
        message.type !== 'related' &&
        message.type !== 'end' &&
        message.type !== 'resolution_search_result'
    ) as unknown as CoreMessage[];

    // The user's prompt for this action is static.
    const userInput = 'Analyze this map view.';

    // Construct the multimodal content for the user message.
    const content: CoreMessage['content'] = [
      { type: 'text', text: userInput },
      { type: 'image', image: dataUrl, mimeType: file.type }
    ];

    // Add the new user message to the AI state.
    aiState.update({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages,
        { id: nanoid(), role: 'user', content, type: 'input' }
      ]
    });
    messages.push({ role: 'user', content });

    // Create a streamable value for the summary.
    const summaryStream = createStreamableValue<string>('');

    async function processResolutionSearch() {
      try {
        // Call the simplified agent, which now returns a stream.
        const streamResult = await resolutionSearch(messages, timezone, drawnFeatures);

        let fullSummary = '';
        for await (const partialObject of streamResult.partialObjectStream) {
          if (partialObject.summary) {
            fullSummary = partialObject.summary;
            summaryStream.update(fullSummary);
          }
        }

        const analysisResult = await streamResult.object;

        // Mark the summary stream as done with the result.
        summaryStream.done(analysisResult.summary || 'Analysis complete.');

        // Append the GeoJSON layer to the UI stream so it appears on the map immediately.
        if (analysisResult.geoJson) {
          uiStream.append(
            <GeoJsonLayer id={nanoid()} data={analysisResult.geoJson as FeatureCollection} />
          );
        }

        messages.push({ role: 'assistant', content: analysisResult.summary || 'Analysis complete.' });

        const sanitizedMessages: CoreMessage[] = messages.map(m => {
          if (Array.isArray(m.content)) {
            return {
              ...m,
              content: m.content.filter(part => part.type !== 'image')
            } as CoreMessage
          }
          return m
        })

        const relatedQueries = await querySuggestor(uiStream, sanitizedMessages);
        uiStream.append(
          <Section title="Follow-up">
            <FollowupPanel />
          </Section>
        );

        await new Promise(resolve => setTimeout(resolve, 500));

        const groupeId = nanoid();

        aiState.done({
          ...aiState.get(),
          messages: [
            ...aiState.get().messages,
            {
              id: groupeId,
              role: 'assistant',
              content: analysisResult.summary || 'Analysis complete.',
              type: 'response'
            },
            {
              id: groupeId,
              role: 'assistant',
              content: JSON.stringify(analysisResult),
              type: 'resolution_search_result'
            },
            {
              id: groupeId,
              role: 'assistant',
              content: JSON.stringify(relatedQueries),
              type: 'related'
            },
            {
              id: groupeId,
              role: 'assistant',
              content: 'followup',
              type: 'followup'
            }
          ]
        });
      } catch (error) {
        console.error('Error in resolution search:', error);
        summaryStream.error(error);
      } finally {
        isGenerating.done(false);
        uiStream.done();
      }
    }

    // Start the background process without awaiting it to allow the UI to
    // stream the response section and summary immediately while the
    // analysis runs in the background.
    processResolutionSearch();

    // Immediately update the UI stream with the BotMessage component.
    uiStream.update(
      <Section title="response">
        <BotMessage content={summaryStream.value} />
      </Section>
    );

    return {
      id: nanoid(),
      isGenerating: isGenerating.value,
      component: uiStream.value,
      isCollapsed: isCollapsed.value
    };
  }

  const messages: CoreMessage[] = (aiState.get().messages as AIMessage[]).filter(
    message =>
      message.role !== 'tool' &&
      message.type !== 'followup' &&
      message.type !== 'related' &&
      message.type !== 'end' &&
      message.type !== 'resolution_search_result'
  ) as unknown as CoreMessage[];

  const groupeId = nanoid()
  const useSpecificAPI = process.env.USE_SPECIFIC_API_FOR_WRITER === 'true'
  const maxMessages = useSpecificAPI ? 5 : 10
  messages.splice(0, Math.max(messages.length - maxMessages, 0))

  const userInput = skip
    ? `{"action": "skip"}`
    : ((formData?.get('related_query') as string) ||
      (formData?.get('input') as string))

  if (userInput.toLowerCase().trim() === 'what is a planet computer?' || userInput.toLowerCase().trim() === 'what is qcx-terra?') {
    const definition = userInput.toLowerCase().trim() === 'what is a planet computer?'
      ? `A planet computer is a proprietary environment aware system that interoperates weather forecasting, mapping and scheduling using cutting edge multi-agents to streamline automation and exploration on a planet. Available for our Pro and Enterprise customers. [QCX Pricing](https://www.queue.cx/#pricing)`

      : `QCX-Terra is a model garden of pixel level precision geospatial foundational models for efficient land feature predictions from satellite imagery. Available for our Pro and Enterprise customers. [QCX Pricing] (https://www.queue.cx/#pricing)`;

    const content = JSON.stringify(Object.fromEntries(formData!));
    const type = 'input';

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

    const definitionStream = createStreamableValue('');
    definitionStream.done(definition);

    const answerSection = (
      <Section title="response">
        <BotMessage content={definitionStream.value} />
      </Section>
    );

    uiStream.append(answerSection);

    const groupeId = nanoid();
    const relatedQueries = { items: [] };

    aiState.done({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages,
        {
          id: groupeId,
          role: 'assistant',
          content: definition,
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

    isGenerating.done(false);
    uiStream.done();

    return {
      id: nanoid(),
      isGenerating: isGenerating.value,
      component: uiStream.value,
      isCollapsed: isCollapsed.value,
    };
  }

  const systemPrompt = await getSystemPrompt()

  const result = await researcher(uiStream, messages, userInput, systemPrompt)

  const fullMessages = [
    ...aiState.get().messages,
    {
      id: groupeId,
      role: 'user',
      content: userInput,
      type: 'input'
    }
  ]

  // Update the AI state with the new user message.
  aiState.update({
    ...aiState.get(),
    messages: fullMessages
  })

  const streamText = createStreamableValue<string>('')

  async function processWriter() {
    try {
      const writerResult = await writer(uiStream, streamText, fullMessages)

      aiState.done({
        ...aiState.get(),
        messages: [
          ...aiState.get().messages,
          {
            id: groupeId,
            role: 'assistant',
            content: writerResult.content,
            type: 'response'
          },
          {
            id: groupeId,
            role: 'assistant',
            content: 'followup',
            type: 'followup'
          }
        ]
      })
    } catch (error) {
      console.error('Error in writer process:', error)
      streamText.error(error)
    } finally {
      isGenerating.done(false)
      uiStream.done()
    }
  }

  processWriter()

  return {
    id: nanoid(),
    isGenerating: isGenerating.value,
    component: uiStream.value,
    isCollapsed: isCollapsed.value
  }
}

export type Message = {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  id: string
  type: 'input' | 'response' | 'related' | 'followup' | 'end' | 'resolution_search_result'
}

export type AIState = {
  chatId: string
  messages: Message[]
}

export type UIState = {
  id: string
  component: React.ReactNode
  isGenerating?: StreamableValue<boolean>
  isCollapsed?: StreamableValue<boolean>
}[]

export const AI = createAI<AIState, UIState>({
  actions: {
    submit
  },
  initialUIState: [],
  initialAIState: { chatId: nanoid(), messages: [] },
  onSetAIState: async ({ state, done }) => {
    'use server'
    if (done) {
      const { chatId, messages } = state
      const createdAt = new Date()
      const userId = 'anonymous'
      const path = `/chat/${chatId}`
      const title =
        messages.length > 0
          ? messages[0].content.substring(0, 100)
          : 'Untitled Chat'

      const chat: Chat = {
        id: chatId,
        title,
        userId,
        createdAt,
        messages,
        path
      }

      await saveChat(chat)
    }
  }
})
