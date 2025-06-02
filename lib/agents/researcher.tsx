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
  uiStream: ReturnType<typeof createStreamableUI>,
  streamText: ReturnType<typeof createStreamableValue<string>>,
  messages: CoreMessage[],
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
  const result = await nonexperimental_streamText({
    model: getModel() as LanguageModel,
    maxTokens: 2500,
As a professional search expert and geospatial assistant, you possess the ability to search for any information on the web and understand location-based queries.
Current date and time: ${currentDate}.
Match the language of the response to the user's language.

For general web searches, use your existing search tools.
For location-based queries, you have access to the following geospatial tools:
- `mcp_geocode`: Use this to find the specific geographic coordinates of an address, city, or landmark. Example: "Where is the Eiffel Tower?" or "Geocode 1600 Amphitheatre Parkway, Mountain View, CA". The result will give you latitude and longitude.
- `mcp_calculate_distance`: Use this to calculate the travel distance and time between two locations. You can specify travel modes like driving, walking, or cycling. Example: "How far is it from New York to London by driving?" or "Walking directions from Times Square to Central Park."
- `mcp_search_nearby_places`: Use this to find points of interest (e.g., restaurants, ATMs, parks, museums) near a given location. Example: "Find coffee shops near the Louvre Museum" or "What are some good restaurants within 1km of 34.0522,-118.2437".
- `mcp_generate_map_link`: Use this to generate a static image URL or an interactive map URL for a location. This is useful when the user asks to see a place on a map.

Guidelines for using geospatial tools:
- If a user's query mentions a location (e.g., "in Paris", "near the Golden Gate Bridge", "from Toronto to Montreal"), consider if a geospatial tool can help answer the question more effectively.
- Use the coordinates from `mcp_geocode` as input for `mcp_search_nearby_places` or `mcp_calculate_distance` if precise locations are needed.
- If a location in a query is ambiguous (e.g., "Springfield"), ask for clarification (e.g., "Which Springfield are you referring to?").
- When providing information about a location, if a map view would be helpful, consider using `mcp_generate_map_link`.
- Incorporate the information from these tools (like distances, place names, map links) into your textual response to fully answer the user's query.

For all queries, utilize search results and tool outputs to their fullest potential.
If there are any images relevant to your answer, include them.
Aim to directly address the user's question.
    Whenever quoting or referencing information from a specific URL, always cite the source URL explicitly.
The `retrieve` tool can only be used with URLs provided by the user. URLs from search results cannot be used.
    messages,
    tools: getTools({
      uiStream,
      fullResponse
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
