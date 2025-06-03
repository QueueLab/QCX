import { createStreamableUI, createStreamableValue } from 'ai/rsc'
import { CoreMessage } from 'ai' // Removed LanguageModel and nonexperimental_streamText
import { Section } from '@/components/section'
import { BotMessage } from '@/components/message'
// import { getModel } from '../utils' // Removed, model selection is server-side

export async function writer(
  uiStream: ReturnType<typeof createStreamableUI>,
  streamText: ReturnType<typeof createStreamableValue<string>>,
  messages: CoreMessage[]
) {
  let fullResponse = ''
  let hasError = false // Added for error handling
  const answerSection = (
    <Section title="response">
      <BotMessage content={streamText.value} />
    </Section>
  )
  // Consider moving uiStream.append(answerSection) to after first chunk, like in researcher.tsx

  try {
    const response = await fetch('/api/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages,
        // The system prompt for 'writer' is now configured server-side in the MCP handler
        // No need to send it from here.
        // Also, no tools are used by the writer agent.
      })
    })

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }

    if (response.body) {
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let done = false

      // Spinner/answer section display logic like in researcher.tsx
      // uiStream.update(null); // If there was a spinner

      let firstChunkReceived = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read()
        done = readerDone
        const chunk = decoder.decode(value, { stream: true })

        if (chunk) {
          if (!firstChunkReceived) {
            firstChunkReceived = true;
            uiStream.append(answerSection); // Show section on first data
          }
          fullResponse += chunk
          streamText.update(fullResponse)
        }
      }
    } else {
      throw new Error('Response body is null')
    }
    streamText.done()
  } catch (error) {
    console.error('Error in writer agent:', error)
    hasError = true
    // Ensure answerSection is displayed to show the error
    if (fullResponse.length === 0) { // If no content yet, append section
        uiStream.append(answerSection);
    }
    fullResponse = (error as Error).message || 'An error occurred while generating the response.'
    streamText.update(fullResponse)
    streamText.done() // Mark stream as done even on error
  }
  // The writer is expected to return the full response string.
  // If an error occurred, fullResponse will contain the error message.
  return fullResponse
}
