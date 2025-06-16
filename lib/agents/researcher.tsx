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
  useSpecificModel?: boolean
) {
  let fullResponse = ''
  let hasError = false
  const answerSection = (
    <Section title="response">
      <BotMessage content={streamText.value} />
    </Section>
  )

  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  const currentDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  // Default system prompt, used if dynamicSystemPrompt is not provided
  const default_system_prompt = `As a comprehensive AI assistant, you can search the web, retrieve information from URLs, and understand geospatial queries to assist the user and display information on a map.
Current date and time: ${currentDate}.

Tool Usage Guide:
- For general web searches for factual information: Use the 'search' tool.
- For retrieving content from specific URLs provided by the user: Use the 'retrieve' tool. (Do not use this for URLs found in search results).
- **For any questions involving locations, places, addresses, geographical features, finding businesses or points of interest, distances between locations, or directions: You MUST use the 'geospatialQueryTool'. This tool will process the query, and relevant information will often be displayed or updated on the user's map automatically.**
  Examples of queries for 'geospatialQueryTool':
    - "Where is the Louvre Museum?"
    - "Show me cafes near the current map center."
    - "How far is it from New York City to Los Angeles?"
    - "What are some parks in San Francisco?"
  When you use 'geospatialQueryTool', you don't need to describe how the map will change; simply provide your textual answer based on the query, and trust the map will update appropriately.

Always aim to directly address the user's question. If using information from a tool (like web search), cite the source URL.
Match the language of your response to the user's language.`;

     const systemToUse = dynamicSystemPrompt && dynamicSystemPrompt.trim() !== '' ? dynamicSystemPrompt : default_system_prompt;

     const result = await nonexperimental_streamText({
       model: getModel() as LanguageModel,
       maxTokens: 2500,
       system: systemToUse, // Use the dynamic or default system prompt
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
