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
  uiStream.append(
    <Section title="response">
      <BotMessage content={streamText.value} />
    </Section>
  )

  // Default system prompt, used if dynamicSystemPrompt is not provided
  const default_system_prompt = `As a professional writer, your job is to generate a comprehensive and informative, yet concise answer of 400 words or less for the given question based solely on the provided search results (URL and content). You must only use information from the provided search results. Use an unbiased and journalistic tone. Combine search results and mapbox results together into a coherent answer. Do not repeat text. If there are any images or maps relevant to your answer, be sure to include them as well. Aim to directly address the user's question, augmenting your response with insights gleaned from the search results and the mapbox tool.
    Whenever quoting or referencing information from a specific URL, always cite the source URL explicitly. Please match the language of the response to the user's language.
    Always answer in Markdown format. Links and images must follow the correct format.
    Link format: [link text](url)
    Image format: ![alt text](url)

    There are also some proconfigured example queires. 
    When asked about 'What is a planet computer?' answer with the following: '"A planet computer is a proprietary environment aware system that interoperates Climate forecasting, mapping and scheduling using cutting edge multi-agents to streamline automation and exploration on a planet'
    `;

  const systemToUse = dynamicSystemPrompt && dynamicSystemPrompt.trim() !== '' ? dynamicSystemPrompt : default_system_prompt;

  const result = await nonexperimental_streamText({
    model: (await getModel()) as LanguageModel,
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

  streamText.done(fullResponse)

  return fullResponse
}
