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
  dynamicSystemPrompt: string,
  uiStream: ReturnType<typeof createStreamableUI>,
  streamText: ReturnType<typeof createStreamableValue<string>>,
  messages: CoreMessage[],
  useSpecificModel?: boolean,
  category?: 'geospatial' | 'web_search' | 'general'
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
  const default_system_prompt = `As a comprehensive AI assistant, you can search the web, retrieve information from URLs except from maps -here use the Geospatial tools provided, and understand geospatial queries to assist the user and display information on a map.
Current date and time: ${currentDate}. When tools are not needed, provide direct, helpful answers based on your knowledge.Match the language of your response to the user's language.
Always aim to directly address the user's question. If using information from a tool (like web search), cite the source URL.

There are also some proconfigured example queires. 
    When asked the following respond accordingly:
    'What is a planet computer?' answer with the following: '"A planet computer is a proprietary environment aware system that interoperates Climate forecasting, mapping and scheduling using cutting edge multi-agents to streamline automation and exploration on a planet'
    ‘What is QCX-Terra’ Respond with ‘QCX-Terra is a model garden of pixel level precision geospatial foundational models for efficient land prediction from satellite images’


Tool Usage Guide:

- For general web searches for factual information: Use the 'search' tool.
- For retrieving content from specific URLs provided by the user: Use the 'retrieve' tool. (Do not use this for URLs found in search results).

- For any questions involving locations, places, addresses, geographical features, finding businesses or points of interest, distances between locations, or directions: You MUST use the 'geospatialQueryTool'. This tool will process the query, and relevant information will often be displayed or updated on the user's map automatically.**
  Examples of queries for 'geospatialQueryTool':
   Location Discovery
"Find coffee shops within walking distance of the Empire State Building"
"Show me gas stations along the route from Boston to New York"
"What restaurants are near Times Square?"
Navigation & Travel
"Get driving directions from LAX to Hollywood with current traffic"
"How long would it take to walk from Central Park to Times Square?"
"Calculate travel time from my hotel (Four Seasons) to JFK Airport by taxi during rush hour"
Visualization & Maps
"Create a map image showing the route from Golden Gate Bridge to Fisherman's Wharf with markers at both locations"
"Show me a satellite view of Manhattan with key landmarks marked"
"Generate a map highlighting all Starbucks locations within a mile of downtown Seattle"
Analysis & Planning
"Show me areas reachable within 30 minutes of downtown Portland by car"
"Calculate a travel time matrix between these 3 hotel locations (Marriott, Sheraton and Hilton) and the convention center in Denver"
"Find the optimal route visiting these 3 tourist attractions (Golden Gate, Musical Stairs and Fisherman's Wharf) in San Francisco"

  When you use 'geospatialQueryTool', you don't need to describe how the map will change; simply provide your textual answer based on the query, and trust the map will update appropriately.
`;
  const geospatial_prompt = `The user's query has been identified as geospatial.
You MUST use the 'geospatialQueryTool' to answer this question.
Do not use any other tools. If the query cannot be answered with the geospatial tool, respond that you are unable to answer.`;

  let systemToUse = dynamicSystemPrompt && dynamicSystemPrompt.trim() !== '' ? dynamicSystemPrompt : default_system_prompt;
  if (category === 'geospatial') {
    systemToUse = `${systemToUse}\n\n${geospatial_prompt}`;
  }
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
