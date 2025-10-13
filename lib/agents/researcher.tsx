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
  searchMode?: string
) {
  let fullResponse = ''
  let hasError = false
  const answerSection = (
    <Section title="response">
      <BotMessage content={streamText.value} />
    </Section>
  )

  const currentDate = new Date().toLocaleString()

  let systemPrompt = `Current date and time: ${currentDate}. Match the language of your response to the user's language. Always aim to directly address the user's question. If using information from a tool (like web search), cite the source URL.`;

  const standardPrompt = `As a comprehensive AI assistant, you can search the web, retrieve information from URLs, and understand geospatial queries to assist the user and display information on a map. When tools are not needed, provide direct, helpful answers based on your knowledge.

  Tool Usage Guide:
  - For general web searches: Use the 'search' tool.
  - For retrieving content from specific URLs: Use the 'retrieve' tool.
  - For any questions involving locations, places, or directions: You MUST use the 'geospatialQueryTool'.`;

  const geospatialPrompt = `You are a specialized Geospatial AI assistant. Your primary function is to understand and respond to geospatial queries. You MUST prioritize using the 'geospatialQueryTool' for any questions involving locations, places, addresses, geographical features, businesses, points of interest, distances, or directions. Only use other tools if geospatial queries are not applicable.`;

  const webSearchPrompt = `You are a specialized Web Search AI assistant. Your primary function is to search the web and retrieve information from URLs to answer user questions. You MUST prioritize using the 'search' and 'retrieve' tools. Only use other tools if web searches are not applicable.`;

  switch (searchMode) {
    case 'Geospatial':
      systemPrompt = `${geospatialPrompt}\n${systemPrompt}`;
      break;
    case 'Web Search':
      systemPrompt = `${webSearchPrompt}\n${systemPrompt}`;
      break;
    default:
      systemPrompt = `${standardPrompt}\n${systemPrompt}`;
      break;
  }

  const allTools = getTools({ uiStream, fullResponse });
  let availableTools: any = allTools;

  if (searchMode === 'Geospatial') {
    availableTools = { geospatialQueryTool: allTools.geospatialQueryTool };
  } else if (searchMode === 'Web Search') {
    availableTools = { search: allTools.search, retrieve: allTools.retrieve };
  }

  const result = await nonexperimental_streamText({
    model: getModel() as LanguageModel,
    maxTokens: 2500,
    system: systemPrompt,
    messages,
    tools: availableTools
  })

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
