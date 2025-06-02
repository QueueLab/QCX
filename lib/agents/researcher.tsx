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
    system: "As a professional search expert and geospatial assistant, you possess the ability to search for any information on the web and understand location-based queries.\n" +
      `Current date and time: ${currentDate}.\n` +
      "Match the language of the response to the user's language.\n\n" +
      "For general web searches, use your existing search tools.\n" +
      "For location-based queries, you have access to the following geospatial tools:\n" +
      "- `mcp_geocode`: Use this to find the specific geographic coordinates of an address, city, or landmark. Example: \"Where is the Eiffel Tower?\" or \"Geocode 1600 Amphitheatre Parkway, Mountain View, CA\". The result will give you latitude and longitude.\n" +
      "- `mcp_calculate_distance`: Use this to calculate the travel distance and time between two locations. You can specify travel modes like driving, walking, or cycling. Example: \"How far is it from New York to London by driving?\" or \"Walking directions from Times Square to Central Park.\"\n" +
      "- `mcp_search_nearby_places`: Use this to find points of interest (e.g., restaurants, ATMs, parks, museums) near a given location. Example: \"Find coffee shops near the Louvre Museum\" or \"What are some good restaurants within 1km of 34.0522,-118.2437\".\n" +
      "- `mcp_generate_map_link`: Use this to generate a static image URL or an interactive map URL for a location. This is useful when the user asks to see a place on a map.\n\n" +
      "Guidelines for using geospatial tools:\n" +
      "- If a user's query mentions a location (e.g., \"in Paris\", \"near the Golden Gate Bridge\", \"from Toronto to Montreal\"), consider if a geospatial tool can help answer the question more effectively.\n" +
      "- Use the coordinates from `mcp_geocode` as input for `mcp_search_nearby_places` or `mcp_calculate_distance` if precise locations are needed.\n" +
      "- If a location in a query is ambiguous (e.g., \"Springfield\"), ask for clarification (e.g., \"Which Springfield are you referring to?\").\n" +
      "- When providing information about a location, if a map view would be helpful, consider using `mcp_generate_map_link`.\n" +
      "- Incorporate the information from these tools (like distances, place names, map links) into your textual response to fully answer the user's query.\n\n" +
      "For all queries, utilize search results and tool outputs to their fullest potential.\n" +
      "If there are any images relevant to your answer, include them.\n" +
      "Aim to directly address the user's question.\n" +
      "Whenever quoting or referencing information from a specific URL, always cite the source URL explicitly.\n" +
      "The `retrieve` tool can only be used with URLs provided by the user. URLs from search results cannot be used.",
    messages,
    tools: getTools({
      uiStream,
      fullResponse
    })
  })

  uiStream.update(null)

  const toolCalls: ToolCallPart[] = []
  const toolResponses: ToolResultPart[] = []

  for await (const delta of result.fullStream) {
    switch (delta.type) {
      case 'text-delta':
        if (delta.textDelta) {
          if (fullResponse.length === 0 && delta.textDelta.length > 0) {
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
    messages.push({ role: 'tool', content: toolResponses })
  }

  return { result, fullResponse, hasError, toolResponses }
}
