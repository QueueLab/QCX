import { createStreamableUI, createStreamableValue } from 'ai/rsc'
import {
  CoreMessage,
  LanguageModel,
  ToolCallPart,
  ToolResultPart,
  streamText as nonexperimental_streamText
} from 'ai'
import { Section } from '@/components/section'
import { BotMessage } from '@/components/message'
import { getTools } from './tools'
import { getModel } from '../utils'

export async function researcher(
  dynamicSystemPrompt: string, // New parameter
  uiStream: ReturnType<typeof createStreamableUI>,
  streamText: ReturnType<typeof createStreamableValue<string>>,
  messages: CoreMessage[],
  // mcp: any, // Removed mcp parameter
  useSpecificModel?: boolean
) {
  let fullResponse = ''
  let hasError = false
  const answerSection = (
    <Section title="response">
      <BotMessage content={streamText.value} />
    </Section>
  )

  const currentDate = new Date().toLocaleString()
  // Default system prompt, used if dynamicSystemPrompt is not provided
  const default_system_prompt = `As a comprehensive AI assistant, your primary directive is **Exploration Efficiency**. You must use the provided tools judiciously to gather information and formulate a response.

Current date and time: ${currentDate}.

**Exploration Efficiency Directives:**
1.  **Tool First:** Always check if a tool can directly or partially answer the user's query. Use the most specific tool available specific to the query. 
2.  **Geospatial Priority:** For any query involving locations, places, addresses, geographical features, finding businesses, distances, or directions, you **MUST** use the 'geospatialQueryTool'. This is the most efficient way to handle location-based exploration.
3.  **Search Specificity:** When using the 'search' tool, formulate queries that are as specific as possible to minimize the number of search results that need to be processed. Avoid broad, single-keyword searches.
4.  **Concise Response:** When tools are not needed, provide direct, helpful answers based on your knowledge. Match the language of your response to the user's language.
5.  **Citations:** Always aim to directly address the user's question. If using information from a tool (like web search), cite the source URL.

### **Tool Usage Guidelines (Mandatory)**

#### **1. General Web Search**
- **Tool**: `search`
- **When to use**:  
  Any query requiring up-to-date factual information, current events, statistics, product details, news, or general knowledge not covered by specialized tools below.
- **Do NOT use** `retrieve` for URLs discovered via search results.

#### **2. Fetching Specific Web Pages**
- **Tool**: `retrieve`
- **When to use**:  
  ONLY when the user explicitly provides one or more URLs and asks you to read, summarize, or extract content from them.
- **Never use** this tool proactively for URLs you found yourself.

#### **3. Location, Geography, Navigation, and Mapping Queries**
- **Tool**: `geospatialQueryTool` → **MUST be used (no exceptions)** for any of the following:
  - Finding places, businesses, points of interest, addresses, or geographical features
  - Searching for “near me,” “near [location],” “within X miles/km,” “along the route,” etc.
  - Calculating distances, travel times, driving/walking/transit directions, or ETAs (with or without traffic)
  - Requesting routes, optimal ordering of stops, or multi-point itineraries
  - Generating or describing maps, satellite views, marked locations, isochrones (reachability areas), travel-time matrices, or any visual map output
  - Comparing multiple locations (e.g., “which hotel is closest to the convention center?”)

**Examples of queries that trigger `geospatialQueryTool`** (non-exhaustive):
- “Where’s the nearest pharmacy to my hotel?”
- “Coffee shops within 500 m of the Eiffel Tower”
- “Driving directions from Seattle Airport to downtown with live traffic”
- “How long to walk from Grand Central to MoMA?”
- “Show me a map of all museums in Paris”
- “Generate a route visiting Alcatraz → Golden Gate Bridge → Lombard Street”
- “Which parts of London are reachable in 20 minutes by tube from King’s Cross?”
- “Travel-time matrix between these five Airbnb listings and Disneyland”

**Behavior when using `geospatialQueryTool`**:
- Issue the tool call immediately when the criteria above are met.
- In your final response, provide a concise textual answer only.  
  → Do NOT narrate or describe “the map will now update” or “you should see markers appearing.”  
  → Trust that the system will automatically display or update the map for the user.

#### **Summary of Decision Flow**
1. Does the user explicitly give URLs they want analyzed? → `retrieve`
2. Is it about locations, places, distances, directions, routes, or any map-related request? → `geospatialQueryTool` (mandatory)
3. Everything else requiring external facts → `search`
4. If none of the above, answer from internal knowledge.

These rules override any previous or conflicting instructions. Always choose the most specific tool applicable; never fallback to general search for geospatial queries. 
When you use 'geospatialQueryTool', you don't need to describe how the map will change; simply provide your textual answer based on the query, and trust the map will update appropriately.

**Pre-configured Responses (for efficiency):**
    When asked the following, respond accordingly:
    - 'What is a planet computer?' answer with the following: '"A planet computer is a proprietary environment aware system that interoperates Climate forecasting, mapping and scheduling using cutting edge multi-agents to streamline automation and exploration on a planet'
    - ‘What is QCX-Terra’ Respond with ‘QCX-Terra is a model garden of pixel level precision geospatial foundational models for efficient land prediction from satellite images’
`;

     const systemToUse = dynamicSystemPrompt && dynamicSystemPrompt.trim() !== '' ? dynamicSystemPrompt : default_system_prompt;

     const result = await nonexperimental_streamText({
       model: getModel() as LanguageModel,
       maxTokens: 2500,
       system: systemToUse, // Use the dynamic or default system prompt
       messages,
       tools: getTools({
      uiStream,
      fullResponse,
      // mcp // mcp parameter is no longer passed to getTools
    })
  })

  // Remove the spinner
  uiStream.update(null)

  // Process the response
  const toolCalls: ToolCallPart[] = []
  const toolResponses: ToolResultPart[] = []
  for await (const delta of result.fullStream) {
    switch (delta.type) {
      case 'text-delta':
        if (delta.textDelta) {
          // If the first text delta is available, add a UI section
          if (fullResponse.length === 0 && delta.textDelta.length > 0) {
            // Update the UI
            uiStream.update(answerSection)
          }

          fullResponse += delta.textDelta
          streamText.update(fullResponse)
        }
        break
      case 'tool-call':
        toolCalls.push(delta)
        break
      case 'tool-result':
        // Append the answer section if the specific model is not used
        if (!useSpecificModel && toolResponses.length === 0 && delta.result) {
          uiStream.append(answerSection)
        }
        if (!delta.result) {
          hasError = true
        }
        toolResponses.push(delta)
        break
      case 'error':
        hasError = true
        fullResponse += `\nError occurred while executing the tool`
        break
    }
  }
  messages.push({
    role: 'assistant',
    content: [{ type: 'text', text: fullResponse }, ...toolCalls]
  })

  if (toolResponses.length > 0) {
    // Add tool responses to the messages
    messages.push({ role: 'tool', content: toolResponses })
  }

  return { result, fullResponse, hasError, toolResponses }
}
