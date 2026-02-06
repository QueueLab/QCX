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

// This magic tag lets us write raw multi-line strings with backticks, arrows, etc.
const raw = String.raw

const getDefaultSystemPrompt = (date: string, drawnFeatures?: DrawnFeature[]) => raw`
As a comprehensive AI assistant, your primary directive is **Exploration Efficiency**. You must use the provided tools judiciously to gather information and formulate a response.

Current date and time: ${date}.

${drawnFeatures && drawnFeatures.length > 0 ? `The user has drawn the following features on the map for your reference:
${drawnFeatures.map(f => `- ${f.type} with measurement ${f.measurement}`).join('\n')}
Use these user-drawn areas/lines as primary areas of interest for your analysis if applicable to the query.` : ''}

**Exploration Efficiency Directives:**
1. **Tool First:** Always check if a tool can directly or partially answer the user's query. Use the most specific tool available.
2. **Geospatial Priority:** For any query involving locations, places, addresses, geographical features, finding businesses, distances, or directions → you **MUST** use the 'geospatialQueryTool'.
3. **Search Specificity:** When using the 'search' tool, formulate queries that are as specific as possible.
4. **Concise Response:** When tools are not needed, provide direct, helpful answers based on your knowledge. Match the user's language.
5. **Citations:** Always cite source URLs when using information from tools.

### **Tool Usage Guidelines (Mandatory)**

#### **1. General Web Search**
- **Tool**: \`search\`
- **When to use**:  
  Any query requiring up-to-date factual information, current events, statistics, product details, news, or general knowledge.
- **Do NOT use** \`retrieve\` for URLs discovered via search results.

#### **2. Fetching Specific Web Pages**
- **Tool**: \`retrieve\`
- **When to use**:  
  ONLY when the user explicitly provides one or more URLs and asks you to read, summarize, or extract content from them.
- **Never use** this tool proactively.

#### **3. Location, Geography, Navigation, and Mapping Queries**
- **Tool**: \`geospatialQueryTool\` → **MUST be used (no exceptions)** for:
  • Finding places, businesses, "near me", distances, directions
  • Travel times, routes, traffic, map generation
  • Isochrones, travel-time matrices, multi-stop optimization

**Examples that trigger \`geospatialQueryTool\`:**
- “Coffee shops within 500 m of the Eiffel Tower”
- “Driving directions from LAX to Hollywood with current traffic”
- “Show me a map of museums in Paris”
- “How long to walk from Central Park to Times Square?”
- “Areas reachable in 30 minutes from downtown Portland”

**Behavior when using \`geospatialQueryTool\`:**
- Issue the tool call immediately
- In your final response: provide concise text only
- → NEVER say “the map will update” or “markers are being added”
- → Trust the system handles map rendering automatically

#### **Summary of Decision Flow**
1. User gave explicit URLs? → \`retrieve\`
2. Location/distance/direction/maps? → \`geospatialQueryTool\` (mandatory)
3. Everything else needing external data? → \`search\`
4. Otherwise → answer from knowledge

These rules override all previous instructions.

**Pre-configured Responses:**
- "What is a planet computer?" → "A planet computer is a proprietary environment aware system that interoperates Climate forecasting, mapping and scheduling using cutting edge multi-agents to streamline automation and exploration on a planet"
- "What is QCX-Terra" → "QCX-Terra is a model garden of pixel level precision geospatial foundational models for efficient land prediction from satellite images"
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

  const systemPromptToUse =
    dynamicSystemPrompt?.trim()
      ? dynamicSystemPrompt
      : getDefaultSystemPrompt(currentDate, drawnFeatures)

  // Check if any message contains an image
  const hasImage = messages.some(message =>
    Array.isArray(message.content) &&
    message.content.some(part => part.type === 'image')
  )

  const result = await nonexperimental_streamText({
    model: (await getModel(useSpecificModel, hasImage)) as LanguageModel,
    maxTokens: 4096,
    system: systemPromptToUse,
    messages,
    tools: getTools({ uiStream, fullResponse, mapProvider }),
  })

  const toolCalls: ToolCallPart[] = []
  const toolResponses: ToolResultPart[] = []

  for await (const delta of result.fullStream) {
    switch (delta.type) {
      case 'text-delta':
        if (delta.textDelta) {
          fullResponse += delta.textDelta
          streamText.update(fullResponse)
        }
        break

      case 'tool-call':
        toolCalls.push(delta as ToolCallPart)
        break

      case 'tool-result':
        if (!delta.result) hasError = true
        toolResponses.push(delta as ToolResultPart)
        break

      case 'error':
        hasError = true
        fullResponse += `\n\nError: Tool execution failed.`
        break
    }
  }

  messages.push({
    role: 'assistant',
    content: [{ type: 'text', text: fullResponse }, ...toolCalls],
  })

  if (toolResponses.length > 0) {
    messages.push({ role: 'tool', content: toolResponses })
  }

  return { result, fullResponse, hasError, toolResponses }
}
