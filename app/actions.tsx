import {
  StreamableValue,
  createAI,
  createStreamableUI,
  createStreamableValue,
  getAIState,
  getMutableAIState
} from 'ai/rsc'
import { CoreMessage, ToolResultPart, TextPart, ImagePart } from 'ai'
import { nanoid } from '@/lib/utils'
import type { FeatureCollection } from 'geojson'
import { Spinner } from '@/components/ui/spinner'
import { Section } from '@/components/section'
import { FollowupPanel } from '@/components/followup-panel'

import { taskManager } from '@/lib/agents/task-manager'
import { inquire } from '@/lib/agents/inquire'
import { querySuggestor } from '@/lib/agents/query-suggestor'
import { researcher } from '@/lib/agents/researcher'

import { resolutionSearch, type DrawnFeature } from '@/lib/agents/resolution-search'
import { writer } from '@/lib/agents/writer'
import { getCurrentUserIdOnServer } from "@/lib/auth/get-current-user"
import { saveChat, getSystemPrompt, generateReportContext } from '@/lib/actions/chat'
import { Chat, AIMessage } from '@/lib/types'
import { UserMessage } from '@/components/user-message'
import { BotMessage } from '@/components/message'
import { SearchSection } from '@/components/search-section'
import SearchRelated from '@/components/search-related'
import { GeoJsonLayer } from '@/components/map/geojson-layer'
import { ResolutionCarousel } from '@/components/resolution-carousel'
import { ResolutionImage } from '@/components/resolution-image'
import { CopilotDisplay } from '@/components/copilot-display'
import RetrieveSection from '@/components/retrieve-section'
import { VideoSearchSection } from '@/components/video-search-section'
import { MapQueryHandler } from '@/components/map/map-query-handler'

// Define the type for related queries
type RelatedQueries = {
  items: { query: string }[]
}

async function submit(formData?: FormData, skip?: boolean) {
  'use server'
  const userId = await getCurrentUserIdOnServer();
  const aiState = getMutableAIState<typeof AI>()

  if (userId && aiState.get().userId !== userId) {
    aiState.update({
      ...aiState.get(),
      userId
    })
  }

  const uiStream = createStreamableUI()
  const isGenerating = createStreamableValue(true)
  const isCollapsed = createStreamableValue(false)

  const action = formData?.get('action') as string;
  const drawnFeaturesString = formData?.get('drawnFeatures') as string;
  let drawnFeatures: DrawnFeature[] = [];

  try {
    drawnFeatures = drawnFeaturesString ? JSON.parse(drawnFeaturesString) : [];
  } catch (e) {
    console.error('Failed to parse drawnFeatures:', e);
  }

  // PERSISTENCE: Always append drawing_context for durable feature history
  if (drawnFeatures.length > 0) {
    aiState.update({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages,
        {
          id: nanoid(),
          role: 'data',
          content: JSON.stringify(drawnFeatures),
          type: 'drawing_context'
        }
      ]
    });
  }

  // PERSISTENCE: build merged drawing set from all historical drawing_context messages
  const mergedDrawnFeatures = [...drawnFeatures];
  const historicalDrawingContexts = aiState.get().messages.filter(m => m.type === 'drawing_context');
  historicalDrawingContexts.forEach(m => {
    try {
      const historicalFeatures = JSON.parse(m.content as string) as DrawnFeature[];
      historicalFeatures.forEach(hf => {
        if (!mergedDrawnFeatures.some(f => f.id === hf.id)) {
          mergedDrawnFeatures.push(hf);
        }
      });
    } catch (e) {
      console.error('Failed to parse historical drawing context:', e);
    }
  });

  if (action === 'generate_report_context') {
    const messagesString = formData?.get('messages');
    if (typeof messagesString !== 'string') {
      return { title: 'QCX Intelligence Analysis', summary: 'Automated executive summary is currently unavailable.' };
    }
    try {
      const messages = JSON.parse(messagesString) as AIMessage[];
      return await generateReportContext(messages);
    } catch (e) {
      console.error('Failed to parse messages for report context:', e);
      return { title: 'QCX Intelligence Analysis', summary: 'Automated executive summary is currently unavailable.' };
    }
  }

  if (action === 'resolution_search') {
    // ... (resolution search logic remains unchanged - it's already solid)
    const file_mapbox = formData?.get('file_mapbox') as File;
    const file_google = formData?.get('file_google') as File;
    const file = (formData?.get('file') as File) || file_mapbox || file_google;
    const timezone = (formData?.get('timezone') as string) || 'UTC';
    const lat = formData?.get('latitude') ? parseFloat(formData.get('latitude') as string) : undefined;
    const lng = formData?.get('longitude') ? parseFloat(formData.get('longitude') as string) : undefined;
    const location = (lat !== undefined && lng !== undefined) ? { lat, lng } : undefined;

    if (!file) throw new Error('No file provided for resolution search.');

    const mapboxBuffer = file_mapbox ? await file_mapbox.arrayBuffer() : null;
    const mapboxDataUrl = mapboxBuffer ? `data:${file_mapbox.type};base64,${Buffer.from(mapboxBuffer).toString('base64')}` : null;
    const googleBuffer = file_google ? await file_google.arrayBuffer() : null;
    const googleDataUrl = googleBuffer ? `data:${file_google.type};base64,${Buffer.from(googleBuffer).toString('base64')}` : null;
    const buffer = await file.arrayBuffer();
    const dataUrl = `data:${file.type};base64,${Buffer.from(buffer).toString('base64')}`;

    const messages: CoreMessage[] = [...(aiState.get().messages as any[])].filter(
      (message: any) =>
        message.role !== 'tool' &&
        message.type !== 'followup' &&
        message.type !== 'related' &&
        message.type !== 'end' &&
        message.type !== 'drawing_context' &&
        message.type !== 'resolution_search_result'
    );

    const userInput = 'Analyze this map view.';
    const content: CoreMessage['content'] = [
      { type: 'text', text: userInput },
      { type: 'image', image: dataUrl, mimeType: file.type }
    ];

    aiState.update({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages,
        { id: nanoid(), role: 'user', content, type: 'input' }
      ]
    });
    messages.push({ role: 'user', content });

    const summaryStream = createStreamableValue<string>('Analyzing map view...');
    const groupeId = nanoid();

    async function processResolutionSearch() {
      try {
        const streamResult = await resolutionSearch(messages, timezone, mergedDrawnFeatures, location);
        let fullSummary = '';
        for await (const partialObject of streamResult.partialObjectStream) {
          if (partialObject.summary) {
            fullSummary = partialObject.summary;
            summaryStream.update(fullSummary);
          }
        }
        const analysisResult = await streamResult.object;
        summaryStream.done(analysisResult.summary || 'Analysis complete.');

        let geoJson: FeatureCollection | null = null;
        if (analysisResult.geoJson && analysisResult.geoJson.features) {
          geoJson = {
            type: 'FeatureCollection',
            features: analysisResult.geoJson.features.map(f => ({
              type: 'Feature',
              geometry: { type: f.geometryType as any, coordinates: f.coordinates as any },
              properties: { name: f.name, description: f.description }
            }))
          };
        }

        if (geoJson) {
          uiStream.append(<GeoJsonLayer id={groupeId} data={geoJson} />);
        }

        messages.push({ role: 'assistant', content: analysisResult.summary || 'Analysis complete.' });

        const sanitizedMessages = messages.map((m: any) => {
          if (Array.isArray(m.content)) {
            return { ...m, content: m.content.filter((part: any) => part.type !== 'image') } as CoreMessage;
          }
          return m;
        });

        const currentMessages = aiState.get().messages;
        const sanitizedHistory = currentMessages.map((m: any) => {
          if (m.role === "user" && Array.isArray(m.content)) {
            return {
              ...m,
              content: m.content.map((part: any) =>
                part.type === "image" ? { ...part, image: "IMAGE_PROCESSED" } : part
              )
            };
          }
          return m;
        });

        const relatedQueries = await querySuggestor(uiStream, sanitizedMessages);

        uiStream.append(
          <Section title="Follow-up">
            <FollowupPanel />
          </Section>
        );

        await new Promise(resolve => setTimeout(resolve, 500));

        aiState.done({
          ...aiState.get(),
          messages: [
            ...sanitizedHistory,
            { id: groupeId, role: 'assistant', content: analysisResult.summary || 'Analysis complete.', type: 'response' },
            { id: groupeId, role: 'assistant', content: JSON.stringify({ ...analysisResult, geoJson, image: dataUrl, mapboxImage: mapboxDataUrl, googleImage: googleDataUrl }), type: 'resolution_search_result' },
            { id: groupeId, role: 'assistant', content: JSON.stringify(relatedQueries), type: 'related' },
            { id: groupeId, role: 'assistant', content: 'followup', type: 'followup' }
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

    processResolutionSearch();

    uiStream.update(
      <Section title="response">
        <ResolutionCarousel
          mapboxImage={mapboxDataUrl || undefined}
          googleImage={googleDataUrl || undefined}
          initialImage={dataUrl}
        />
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

  const file = !skip ? (formData?.get('file') as File) : undefined;
  const userInput = skip
    ? `{"action": "skip"}`
    : ((formData?.get('related_query') as string) || (formData?.get('input') as string));

  // Special hardcoded responses
  if (userInput && (userInput.toLowerCase().trim() === 'what is a planet computer?' || userInput.toLowerCase().trim() === 'what is qcx-terra?')) {
    // ... (special case handling remains unchanged)
    const definition = userInput.toLowerCase().trim() === 'what is a planet computer?'
      ? `A planet computer is a proprietary environment aware system that interoperates weather forecasting, mapping and scheduling using cutting edge multi-agents to streamline automation and exploration on a planet. Available for our Pro and Enterprise customers. [QCX Pricing](https://www.queue.cx/#pricing)`
      : `QCX-Terra is a model garden of pixel level precision geospatial foundational models for efficient land feature predictions from satellite imagery. Available for our Pro and Enterprise customers. [QCX Pricing](https://www.queue.cx/#pricing)`;

    const groupeId = nanoid();
    const summaryStream = createStreamableValue<string>(definition);
    summaryStream.done(definition);

    uiStream.update(<Section title="response"><BotMessage content={summaryStream.value} /></Section>);
    isGenerating.done(false);
    uiStream.done();

    aiState.done({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages,
        { id: groupeId, role: 'assistant', content: definition, type: 'response' }
      ]
    });

    return { id: nanoid(), isGenerating: isGenerating.value, component: uiStream.value, isCollapsed: isCollapsed.value };
  }

  if (!userInput && !file) {
    isGenerating.done(false);
    return { id: nanoid(), isGenerating: isGenerating.value, component: null, isCollapsed: isCollapsed.value };
  }

  // Advanced message filtering (main branch)
  let filteredImagesCount = 0;
  let retainedImagesCount = 0;

  const messages: CoreMessage[] = [...(aiState.get().messages as any[])]
    .filter((message: any) =>
      message.role !== 'tool' &&
      message.type !== 'followup' &&
      message.type !== 'related' &&
      message.type !== 'end' &&
      message.type !== 'drawing_context' &&
      message.type !== 'resolution_search_result'
    )
    .map((m: any) => {
      if (Array.isArray(m.content)) {
        const filteredContent = m.content.filter((part: any) => {
          if (part.type === 'image') {
            const isValid = typeof part.image === 'string' && part.image.startsWith('data:');
            if (isValid) retainedImagesCount++;
            else filteredImagesCount++;
            return isValid;
          }
          return true;
        });
        return { ...m, content: filteredContent } as any;
      }
      return m;
    });

  console.log('Historical messages image filter:', { filteredImagesCount, retainedImagesCount, totalMessages: messages.length });

  const groupeId = nanoid();
  const useSpecificAPI = process.env.USE_SPECIFIC_API_FOR_WRITER === 'true';
  const maxMessages = useSpecificAPI ? 5 : 10;
  messages.splice(0, Math.max(messages.length - maxMessages, 0));

  const currentSystemPrompt = userId ? (await getSystemPrompt(userId)) ?? '' : '';
  const mapProvider = (formData?.get('mapProvider') as 'mapbox' | 'google') || 'mapbox';

  // Add user message
  if (file) {
    const buffer = await file.arrayBuffer();
    const content: CoreMessage['content'] = [
      { type: 'text', text: userInput },
      { type: 'image', image: buffer, mimeType: file.type }
    ];
    messages.push({ role: 'user', content });
  } else {
    messages.push({ role: 'user', content: userInput });
  }

  aiState.update({
    ...aiState.get(),
    messages: [
      ...aiState.get().messages,
      {
        id: nanoid(),
        role: 'user',
        content: JSON.stringify(Object.fromEntries(formData!)),
        type: 'input'
      }
    ]
  });

  const streamText = createStreamableValue<string>('');
  let errorOccurred = false;

  async function processEvents() {
    try {
      const taskManagerResult = !skip ? await taskManager(messages) : null;
      if (taskManagerResult) {
        // You can act on taskManagerResult.object.next here if needed
      }

      const modifiedMessages = messages.map(msg =>
        msg.role === 'tool'
          ? { ...msg, role: 'assistant', content: JSON.stringify(msg.content), type: 'tool' }
          : msg
      ) as CoreMessage[];

      const latestMessages = modifiedMessages.slice(maxMessages * -1);

      const { fullResponse } = await researcher(
        currentSystemPrompt,
        uiStream,
        streamText,
        latestMessages,
        mapProvider,
        useSpecificAPI,
        mergedDrawnFeatures
      );

      if (!errorOccurred) {
        const relatedQueries = await querySuggestor(uiStream, messages);

        uiStream.append(
          <Section title="Follow-up">
            <FollowupPanel />
          </Section>
        );

        await new Promise(resolve => setTimeout(resolve, 500));

        aiState.done({
          ...aiState.get(),
          messages: [
            ...aiState.get().messages,
            { id: groupeId, role: 'assistant', content: fullResponse, type: 'response' },
            { id: groupeId, role: 'assistant', content: JSON.stringify(relatedQueries), type: 'related' },
            { id: groupeId, role: 'assistant', content: 'followup', type: 'followup' }
          ]
        });
      }
    } catch (error) {
      console.error('Error in processEvents:', error);
      errorOccurred = true;
      streamText.error(error);
    } finally {
      isGenerating.done(false);
      uiStream.done();
    }
  }

  processEvents();

  return {
    id: nanoid(),
    isGenerating: isGenerating.value,
    component: uiStream.value,
    isCollapsed: isCollapsed.value
  };
}

// Rest of the file (clearChat, AI config, getUIStateFromAIState) remains unchanged
// ... (no conflicts in the lower part)

export { submit, clearChat, AI, getUIStateFromAIState };