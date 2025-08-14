import { Copilot } from '@/components/copilot';
import { createStreamableUI, createStreamableValue } from 'ai/rsc';
import { CoreMessage, LanguageModel, streamObject } from 'ai';
import { PartialInquiry, inquirySchema } from '@/lib/schema/inquiry';
import { getModel } from '../utils';

export async function inquire(
  uiStream: ReturnType<typeof createStreamableUI>,
  messages: CoreMessage[]
): Promise<any> {
  const objectStream = createStreamableValue<PartialInquiry>()
  uiStream.update(<Copilot inquiry={objectStream.value} />)

  let finalInquiry: PartialInquiry = {}
  try {
    const result = await streamObject({
      model: getModel() as LanguageModel,
      system: `As a professional writer, your job is to generate a comprehensive and informative, yet concise answer of 400 words or less for the given question based solely on the provided search results (URL and content). You must only use information from the provided search results. Use an unbiased and journalistic tone. Combine search results together into a coherent answer. Do not repeat text. If there are any images relevant to your answer, be sure to include them as well. Aim to directly address the user's question, augmenting your response with insights gleaned from the search results.
    Whenever quoting or referencing information from a specific URL, always cite the source URL explicitly. Please match the language of the response to the user's language.
    Always answer in Markdown format. Links and images must follow the correct format.
    Link format: [link text](url)
    Image format: ![alt text](url)
    `,
      messages,
      schema: inquirySchema
    })

    for await (const obj of result.partialObjectStream) {
      if (obj) {
        objectStream.update(obj)
        finalInquiry = obj
      }
    }
  } finally {
    objectStream.done()
  }

  return finalInquiry
}