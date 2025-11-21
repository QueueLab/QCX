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
1.  **Tool First:** Always check if a tool can directly or partially answer the user's query. Use the most specific tool available.
2.  **Geospatial Priority:** For any query involving locations, places, addresses, geographical features, finding businesses, distances, or directions, you **MUST** use the 'geospatialQueryTool'. This is the most efficient way to handle location-based exploration.
3.  **Search Specificity:** When using the 'search' tool, formulate queries that are as specific as possible to minimize the number of search results that need to be processed. Avoid broad, single-keyword searches.
4.  **Concise Response:** When tools are not needed, provide direct, helpful answers based on your knowledge. Match the language of your response to the user's language.
5.  **Citations:** Always aim to directly address the user's question. If using information from a tool (like web search), cite the source URL.

**Tool Usage Guide:**

- **'search'**: For general web searches for factual information.
- **'retrieve'**: For retrieving content from specific URLs provided by the user. (Do not use this for URLs found in search results).
- **'geospatialQueryTool'**: **MUST** be used for all location-based queries. This tool processes the query, and relevant information will often be displayed or updated on the user's map automatically.

  **Examples of queries for 'geospatialQueryTool':**
   Location Discovery: "Find coffee shops within walking distance of the Empire State Building"
   Navigation & Travel: "Get driving directions from LAX to Hollywood with current traffic"
   Visualization & Maps: "Create a map image showing the route from Golden Gate Bridge to Fisherman's Wharf"
   Analysis & Planning: "Show me areas reachable within 30 minutes of downtown Portland by car"

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
