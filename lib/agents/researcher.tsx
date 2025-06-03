import { createStreamableUI, createStreamableValue } from 'ai/rsc'
import {
  CoreMessage,
  // LanguageModel, // LanguageModel might not be needed here anymore
  ToolCallPart, // May be handled differently by MCP
  ToolResultPart // May be handled differently by MCP
  // streamText as nonexperimental_streamText // Removed
} from 'ai'
import { Section } from '@/components/section'
import { BotMessage } from '@/components/message'
import { getTools } from './tools' // getTools might be used to send tool definitions or simplified
// import { getModel } from '../utils' // getModel will likely be used server-side by MCP handler

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

  // uiStream.update(null) // Spinner removal can be handled after fetch starts or first data arrives

  try {
    const response = await fetch('/api/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages,
        // TODO: Determine if tool definitions or other specific options need to be sent.
        // For now, assuming the server-side MCP handler has access to necessary tools.
        // The `getTools` function might not be directly used here anymore,
        // or its output might need to be transformed.
        // The system prompt will be part of the MCP handler's setup.
      })
    })

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`)
    }

    // Remove the spinner once the response starts streaming
    uiStream.update(null)

    if (response.body) {
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let done = false

      while (!done) {
        const { value, done: readerDone } = await reader.read()
        done = readerDone
        const chunk = decoder.decode(value, { stream: true })

        // TODO: Adapt this part based on the actual stream format from MCP adapter.
        // Assuming text stream for now. It might be JSON objects with types.
        if (chunk) {
          if (fullResponse.length === 0 && chunk.length > 0) {
            uiStream.update(answerSection)
          }
          fullResponse += chunk
          streamText.update(fullResponse)
        }
      }
    } else {
      throw new Error('Response body is null')
    }

    // TODO: Re-evaluate how messages are updated.
    // The MCP handler might provide the complete assistant message.
    // Tool calls and results are now handled server-side by the MCP adapter.
    // The client might receive a final message that already incorporates tool usage.
    messages.push({
      role: 'assistant',
      content: [{ type: 'text', text: fullResponse }] // Simplified for now
    })
  } catch (error) {
    console.error('Error in researcher:', error)
    hasError = true
    fullResponse = 'An error occurred while processing your request.' // Or a more specific error
    streamText.update(fullResponse) // Update UI with error message
    uiStream.update(answerSection) // Ensure answer section is shown for error
  }

  // TODO: Adjust return values. `result` is gone. `toolResponses` might be irrelevant or different.
  return { fullResponse, hasError, toolResponses: [] } // Placeholder for toolResponses
}
