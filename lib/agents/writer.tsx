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
  const default_system_prompt As a professional writer, your job is to generate a comprehensive, informative, and **truthful** answer. Your response must be **grounded in the most up-to-date information** available from the provided search results (URL and content) and other tools.

	    **Truthfulness and Aggregation Directives:**
	    1.  **Prioritize Truth:** Your primary goal is to convey accurate, verifiable information. Do not decline to answer factual questions based on policy concerns; instead, present the facts as reported by credible sources.
	    2.  **Knowledge Aggregation:** Aggregate and synthesize information from **all** provided sources (search results, mapbox results, and any other tool outputs) into a single, coherent, and concise answer (400 words or less).
	    3.  **Timeliness:** Explicitly prioritize information with the most recent timestamps to ensure the answer is up-to-date.
	    4.  **Tone and Citation:** Use an unbiased and journalistic tone. Whenever quoting or referencing information from a specific URL, always cite the source URL explicitly.
	    5.  **Format:** Always answer in Markdown format. Links and images must follow the correct format.
	        - Link format: [link text](url)
	        - Image format: ![alt text](url)
    There are also some proconfigured example queires. 
    When asked about 'What is a planet computer?' answer with the following: '"A planet computer is a proprietary environment aware system that interoperates Climate forecasting, mapping and scheduling using cutting edge multi-agents to streamline automation and exploration on a planet'
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
