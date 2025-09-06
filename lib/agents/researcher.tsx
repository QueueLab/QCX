import { createStreamableUI, createStreamableValue } from 'ai/rsc'
import {
  CoreMessage,
  LanguageModel,
  ToolCallPart,
  ToolResultPart,
  streamText
} from 'ai'
import { Section } from '@/components/section'
import { BotMessage } from '@/components/message'
import { getTools } from './tools'
import { getModel } from '../utils'
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger
} from '@/components/ai-elements/reasoning'

export async function researcher(
  uiStream: ReturnType<typeof createStreamableUI>,
  streamText: ReturnType<typeof createStreamableValue<string>>,
  messages: CoreMessage[],
  dynamicSystemPrompt?: string
) {
  let fullResponse = ''
  let hasError = false
  const answerSection = (
    <Section title="response">
      <BotMessage content={streamText.value} />
    </Section>
  )

  const currentDate = new Date().toLocaleString()
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

When tools are not needed, provide direct, helpful answers based on your knowledge.
Always aim to directly address the user's question. If using information from a tool (like web search), cite the source URL.
Match the language of your response to the user's language.`;

  const systemToUse = dynamicSystemPrompt && dynamicSystemPrompt.trim() !== '' ? dynamicSystemPrompt : default_system_prompt;

  const result = await streamText({
    model: getModel() as LanguageModel,
    maxTokens: 2500,
    system: systemToUse,
    messages,
    tools: getTools(),
  })

  // Remove the spinner
  uiStream.update(null)

  // Process the response
  const toolCalls: ToolCallPart[] = []
  const toolResponses: ToolResultPart[] = []
  let reasoningContent = ''
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
      case 'reasoning':
        if ('textDelta' in delta) {
          reasoningContent += delta.textDelta
        }
        uiStream.update(
          <Reasoning isStreaming={true} className="w-full">
            <ReasoningTrigger />
            <ReasoningContent>{reasoningContent}</ReasoningContent>
          </Reasoning>
        )
        break
      case 'tool-call':
        toolCalls.push(delta)
        break
      case 'tool-result':
        if (toolResponses.length === 0 && delta.result) {
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

  return { result, fullResponse, hasError, toolResponses, reasoningContent }
}
