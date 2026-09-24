// lib/agents/researcher.tsx
import { createStreamableUI, createStreamableValue } from 'ai/rsc'
import {
  CoreMessage,
  LanguageModel,
  ToolCallPart,
  ToolResultPart,
  streamText as nonexperimental_streamText,
} from 'ai'
import { Section } from '@/components/section'
import { BotMessage } from '@/components/message'
import { getTools } from './tools'
import { getModel } from '../utils'
import { MapProvider } from '@/lib/store/settings'
import { DrawnFeature } from './resolution-search'
import { getSelectedModel } from '@/lib/actions/users'
import { AI_REQUEST_TIMEOUT_MS, createDeadlineSignal } from '@/lib/utils/with-timeout'

// This magic tag lets us write raw multi-line strings with backticks, arrows, etc.
const raw = String.raw

const getDefaultSystemPrompt = (date: string, drawnFeatures?: DrawnFeature[], selectedModel?: string | null) => raw`
As a comprehensive AI assistant, your primary directive is **Exploration Efficiency**. You must use the provided tools judiciously to gather information and formulate a response.

**Product Context:**
- Within this application, "the computer" and "planet computer" refer to **QCX-Terra**.
- Questions like "How do I use the computer?" should be treated as requests for onboarding or usage guidance for QCX-Terra.

Current date and time: ${date}.

${drawnFeatures && drawnFeatures.length > 0 ? `The user has drawn the following features on the map for your reference:
${drawnFeatures.map(f => `- ${f.type} with measurement ${f.measurement}`).join('\n')}
Use these user-drawn areas/lines as primary areas of interest for your analysis if applicable to the query.` : ''}

**Exploration Efficiency Directives:**
1. **Tool First:** Always check if a tool can directly or partially answer the user's query. Use the most specific tool available.
2. **Geospatial Priority:** For any query involving locations, places, addresses, geographical features, finding businesses, distances, or directions → you **MUST** use the 'geospatialQueryTool'.
${selectedModel === 'SkyFi' ? `3. **SkyFi Priority:** The user has selected **SkyFi** as their active planetary tool. For any query asking to query latest images, search past captures, check their SkyFi account or budget, or select Areas of Interest (AOIs) for SkyFi, you **MUST** use the 'skyfiQueryTool' instead of or in addition to general searches.` : `3. **Search Specificity:** When using the 'search' tool, formulate queries that are as specific as possible.`}
4. **Concise Response & Synthesis:** After using tools (such as \`search\` or \`retrieve\`), you **MUST** always produce a concise final text answer synthesizing the retrieved details, and cite source URLs. When tools are not needed, provide direct, helpful answers based on your knowledge. Match the user's language.
5. **Citations:** Always cite source URLs when using information from tools.

### **Tool Usage Guidelines (Mandatory)**

#### **1. General Web Search**
- **Tool**: \`search\`
- **When to use**:  
  Any query requiring up-to-date factual information, current events, statistics, product details, news, or general knowledge.
- **Do NOT use** \`retrieve\` for URLs discovered via search results.
- **Behavior after search**: Always follow up tool results with a concise final text synthesis answering the user's query directly and citing source URLs.

#### **2. Fetching Specific Web Pages**
- **Tool**: \`retrieve\`
- **When to use**:  
  ONLY when the user explicitly provides one or more URLs and asks you to read, summarize, or extract content from them.
- **Never use** this tool proactively.

${selectedModel === 'SkyFi' ? `#### **3. SkyFi Satellite Imagery and AOI**
- **Tool**: \`skyfiQueryTool\`
- **When to use**:
  • Any request to check SkyFi account status or budget (use 'whoami')
  • Any request to geocode or set/select an Area of Interest (AOI) on SkyFi (use 'geocode')
  • Any request to search satellite archive catalog or query latest/latss images (use 'search')
  • Any request to validate, price, or place an order (use 'validate_order' / 'place_order')
  • Any request to list previous satellite image orders (use 'list_orders')` : `#### **3. Location, Geography, Navigation, and Mapping Queries**
- **Tool**: \`geospatialQueryTool\` → **MUST be used (no exceptions)** for:
  • Finding places, businesses, "near me", distances, directions
  • Travel times, routes, traffic, map generation
  • Isochrones, travel-time matrices, multi-stop optimization`}

#### **4. Searching Uploaded Documents and Attachments**
- **Tool**: \`documentRetrieve\`
- **When to use**:
  Any query where the user is asking about the content of uploaded documents, files, attachments, or proprietary text resources that they have uploaded to their chat session.

#### **5. Location Embeddings & Satellite Similarity Search**
- **Tool**: \`locationEmbeddingsQuery\`
- **When to use**:
  Use for natural-language satellite/aerial imagery description search (e.g. searching for heavy machinery, timber/forest clearance, construction sites, agricultural irrigation patterns, or land-use embeddings) or spatial vector search near coordinates or place regions.
- **Rules**:
  • Pass \`query\` (imagery description string) and optional \`location\` (place name string, e.g. "Oregon", "Phoenix, Arizona") OR explicit \`latitude\` and \`longitude\` arguments.
  • If the user provides a place name without coordinates, pass \`location\` to \`locationEmbeddingsQuery\` so it can geocode the area boundary via Mapbox.
  • Do NOT use for ordinary place search, business lookup, POIs, directions, coffee shops, or routing (those MUST use \`geospatialQueryTool\`).
  • **Output Formatting Rule**: NEVER return raw LGND API JSON payloads directly in your chat response text. Always parse and present the search results as structured human-readable text (summarizing Chip IDs, collection name, datetime, centroid coordinates, and match scores).
  • **Semantic Continuation & Follow-up Questions**: When users ask domain follow-up questions about the imagery (such as estimating timber output, biomass, or land change), explain the analytical methodology clearly (e.g., assessing forest cover density, species, area, growth rates, and specialized remote sensing software/expertise). Clarify that thumbnail previews lack full spectral/spatial resolution for direct automated biomass quantification, so high-resolution satellite imagery or full raster data is required for precise calculations.

**Examples that trigger \`locationEmbeddingsQuery\`:**
- “Find heavy machinery used to fell timber near forests that have not previously been cleared in Oregon”
- “Find satellite imagery showing construction sites around Phoenix, Arizona”
- “Search for recently cleared forest areas in Oregon from 2024-01-01 through 2024-12-31”
- “Find imagery of agricultural fields with visible irrigation patterns near Sacramento, California, and return top 20 matches”
- “Find clear-cut forest imagery near 43.8041, -120.5542”

**Examples that MUST NOT use \`locationEmbeddingsQuery\` (use \`geospatialQueryTool\` instead):**
- “Find coffee shops within 500 meters of the Eiffel Tower”
- “Give me driving directions from LAX to Hollywood”
- “What is the nearest museum to Central Park?”

${selectedModel === 'SkyFi' ? `**Behavior when using \`skyfiQueryTool\`:**
- Issue the tool call immediately.
- Clearly present the search results, imagery options, or order prices returned by SkyFi in your final response.
- Always ask for the user's explicit approval before placing any paid/billable orders.` : `**Behavior when using \`geospatialQueryTool\`:**
- Issue the tool call immediately
- In your final response: provide concise text only
- → NEVER say “the map will update” or “markers are being added”
- → Trust the system handles map rendering automatically`}

#### **Summary of Decision Flow**
1. User gave explicit URLs? → \`retrieve\`
2. Query relates to uploaded documents, attachments, or custom user knowledge files? → \`documentRetrieve\` (mandatory)
3. Satellite/aerial imagery similarity, land-use embeddings, or natural-language spatial vector search? → \`locationEmbeddingsQuery\`
${selectedModel === 'SkyFi' ? `4. SkyFi account, satellite imagery search, geocoding AOI, or ordering? → \`skyfiQueryTool\` (mandatory)` : `4. Location/distance/direction/maps/POIs? → \`geospatialQueryTool\` (mandatory)`}
5. Everything else needing external data? → \`search\`
6. Otherwise → answer from knowledge

These rules override all previous instructions.

**Pre-configured Responses:**
- "What is a planet computer?" → "A planet computer is a proprietary environment aware system that interoperates Climate forecasting, mapping and scheduling using cutting edge multi-agents to streamline automation and exploration on a planet"
- "What is QCX-Terra" → "QCX-Terra is a model garden of pixel level precision geospatial foundational models for efficient land prediction from satellite images"
- "How do I use the computer?" → "To use QCX-Terra, start by searching for a location or asking a geospatial question. You can also draw features on the map to focus your analysis. QCX-Terra uses multi-agent automation to streamline exploration and provide precise environmental insights."
`

export async function researcher(
  dynamicSystemPrompt: string,
  uiStream: ReturnType<typeof createStreamableUI>,
  streamText: ReturnType<typeof createStreamableValue<string>>,
  messages: CoreMessage[],
  mapProvider: MapProvider,
  useSpecificModel?: boolean,
  drawnFeatures?: DrawnFeature[]
) {
  let fullResponse = ''
  let hasError = false

  const answerSection = (
    <Section title="response">
      <BotMessage content={streamText.value} />
    </Section>
  )

  const currentDate = new Date().toLocaleString()
  const selectedModel = await getSelectedModel();

  const systemPromptToUse =
    dynamicSystemPrompt?.trim()
      ? dynamicSystemPrompt
      : getDefaultSystemPrompt(currentDate, drawnFeatures, selectedModel)

  // Check if any message contains an image
  const hasImage = messages.some(message =>
    Array.isArray(message.content) &&
    message.content.some(part => part.type === 'image')
  )

  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')
  console.log('Researcher - Image pipeline trace:', {
    hasImage,
    totalMessages: messages.length,
    messagesWithImages: messages.filter(
      m =>
        Array.isArray(m.content) && m.content.some(p => p.type === 'image')
    ).length,
    lastUserMessageContentStructure: lastUserMessage
      ? {
          type: typeof lastUserMessage.content,
          isArray: Array.isArray(lastUserMessage.content),
          parts: Array.isArray(lastUserMessage.content)
            ? lastUserMessage.content.map(p => ({
                type: p.type,
                hasImage: p.type === 'image'
              }))
            : 'string'
        }
      : 'none'
  })

  const result = await nonexperimental_streamText({
    model: (await getModel(hasImage)) as LanguageModel,
    maxTokens: 2500,
    temperature: 0,
    // Allow multi-step tool calling (tool round + synthesis step with headroom for chained tool calls)
    maxSteps: 5,
    abortSignal: createDeadlineSignal(AI_REQUEST_TIMEOUT_MS),
    system: systemPromptToUse,
    messages,
    tools: getTools({ uiStream, fullResponse, mapProvider, selectedModel, drawnFeatures }),
  })

  uiStream.update(null) // remove spinner

  const toolCalls: ToolCallPart[] = []
  const toolResponses: ToolResultPart[] = []
  let hasAppendedAnswerSection = false

  for await (const delta of result.fullStream) {
    switch (delta.type) {
      case 'text-delta':
        if (delta.textDelta) {
          if (!hasAppendedAnswerSection) {
            uiStream.append(answerSection)
            hasAppendedAnswerSection = true
          }
          fullResponse += delta.textDelta
          streamText.update(fullResponse)
        }
        break

      case 'tool-call':
        toolCalls.push(delta)
        break

      case 'tool-result':
        if (!delta.result) hasError = true
        toolResponses.push(delta)
        break

      case 'error':
        hasError = true
        fullResponse += `\n\nError: Model response generation failed.`
        break
    }
  }

  if (toolResponses.length > 0 && !hasError && fullResponse.trim().length === 0) {
    fullResponse = 'Information gathered from search results.'
    if (!hasAppendedAnswerSection) {
      uiStream.append(answerSection)
      hasAppendedAnswerSection = true
    }
    streamText.update(fullResponse)
  }

  streamText.done(fullResponse)

  messages.push({
    role: 'assistant',
    content: [{ type: 'text', text: fullResponse }, ...toolCalls],
  })

  if (toolResponses.length > 0) {
    messages.push({ role: 'tool', content: toolResponses })
  }

  return { result, fullResponse, hasError, toolResponses }
}
