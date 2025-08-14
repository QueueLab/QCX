import { createStreamableUI, createStreamableValue } from 'ai/rsc'
import { CoreMessage, LanguageModel, streamText as nonexperimental_streamText } from 'ai'
import { Section } from '@/components/section'
import { BotMessage } from '@/components/message'
import { getModel } from '../utils'

export async function writer(
  dynamicSystemPrompt: string, // New parameter
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

  // Default system prompt, used if dynamicSystemPrompt is not provided
  const default_system_prompt = `As a professional writer, your primary goal is to provide a comprehensive and informative answer to the user's question, based exclusively on the provided search results (URL and content).

Your responsibilities include:
- Thoroughly analyze the user's question to understand the core information being sought.
- Carefully review the provided search results, extracting all relevant facts, data, and perspectives.
- Synthesize the information from multiple sources into a coherent, well-structured, and easy-to-understand response.
- Maintain an unbiased and journalistic tone throughout your writing.
- Ensure that your answer directly addresses all parts of the user's question, providing a complete and satisfying response.
- Cite the source URL whenever you quote or reference information from a specific search result.
- Match the language of your response to the user's language.

Your final output should be a detailed and well-supported textual answer that fully resolves the user's query. If the search results include images that are highly relevant and add significant value to the textual response, you may include them. However, the text is the most important part of the response.
Please use Markdown format for your response.
- Link format: [link text](url)
- Image format: ![alt text](url)
`;

  const systemToUse = dynamicSystemPrompt && dynamicSystemPrompt.trim() !== '' ? dynamicSystemPrompt : default_system_prompt;

  const result = await nonexperimental_streamText({
    model: getModel() as LanguageModel,
    maxTokens: 2500,
    system: systemToUse, // Use the dynamic or default system prompt
    messages
  })

  for await (const text of result.textStream) {
    if (text) {
      fullResponse += text
      streamText.update(fullResponse)
    }
  }

  streamText.done()

  return fullResponse
}
