import { createStreamableUI, createStreamableValue } from 'ai/rsc'
import { CoreMessage, LanguageModel, streamText as nonexperimental_streamText } from 'ai'
import { Section } from '@/components/section'
import { BotMessage } from '@/components/message'
import { getModel } from '../utils'

export async function writer(
  uiStream: ReturnType<typeof createStreamableUI>,
  streamText: ReturnType<typeof createStreamableValue<string>>,
  messages: CoreMessage[]
) {
  let fullResponse = ''
  const answerSection = (
    <Section title="response">
      <BotMessage content={streamText.value} />
    </Section>
  )
  uiStream.append(answerSection)

  const result = await nonexperimental_streamText({
    model: getModel() as LanguageModel,
    maxTokens: 2500,
    system: `As a professional writer, your job is to generate a comprehensive and informative, yet concise answer of 400 words or less for the given question based solely on the provided search results (URL and content). You must only use information from the provided search results. Use an unbiased and journalistic tone. Combine search results together into a coherent answer. Do not repeat text. If there are any images relevant to your answer, be sure to include them as well. Aim to directly address the user's question, augmenting your response with insights gleaned from the search results. 
    Whenever quoting or referencing information from a specific URL, always cite the source URL explicitly. Please match the language of the response to the user's language.
    Always answer in Markdown format. Links and images must follow the correct format.
    Link format: [link text](url)
    Image format: ![alt text](url)
    `,
    messages
  })

  for await (const delta of result.fullStream) {
    switch (delta.type) {
      case 'text-delta':
        if (delta.textDelta) {
          fullResponse += delta.textDelta
          streamText.update(fullResponse)
        }
        break
      case 'reasoning':
        // Assuming delta.value contains the reasoning content as a string
        if (typeof delta.value === 'string') {
          fullResponse += delta.value
          streamText.update(fullResponse)
        }
        break
      // Add cases for other delta types if needed, e.g., 'error'
      // For now, we'll only explicitly handle text and reasoning for the writer
    }
  }
  streamText.done()

  return fullResponse
}
