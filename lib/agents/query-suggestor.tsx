import { createStreamableUI, createStreamableValue } from 'ai/rsc'
import { CoreMessage, LanguageModel, streamObject } from 'ai'
import { PartialRelated, relatedSchema } from '@/lib/schema/related'
import { Section } from '@/components/section'
import SearchRelated from '@/components/search-related'
import { getModel } from '../utils'

export async function querySuggestor(
  uiStream: ReturnType<typeof createStreamableUI>,
  messages: CoreMessage[]
) {
  const objectStream = createStreamableValue<PartialRelated>()
  uiStream.append(
    <Section title="Related" separator={true}>
      <SearchRelated relatedQueries={objectStream.value} />
    </Section>
  )

  let finalRelatedQueries: PartialRelated = {}
  const result = await streamObject({
    model: (await getModel()) as LanguageModel,
    system: `As a professional web researcher, your task is to generate a set of three queries that explore the subject matter more deeply, building upon the initial query and the information uncovered in its search results.

    For instance, if the original query was "Starship's third test flight key milestones", your output should follow this format:

    "{
      "items": [
        { "query": "Achievements in third flight" },
        { "query": "Flight outcome factors" },
        { "query": "Future Starship plans" }
      ]
    }"

    Aim to create short, concise queries (ideally under 5-7 words) that progressively delve into more specific aspects, implications, or adjacent topics related to the initial query. The goal is to anticipate the user's potential information needs and guide them towards a more comprehensive understanding of the subject matter.
    Please match the language of the response to the user's language.`,
    messages,
    schema: relatedSchema
  })

  for await (const obj of result.partialObjectStream) {
    if (obj && typeof obj === 'object' && 'items' in obj) {
      objectStream.update(obj as PartialRelated)
      finalRelatedQueries = obj as PartialRelated
    }
  }

  objectStream.done()

  return finalRelatedQueries
}
