'use server'

import { createStreamableUI, createStreamableValue } from 'ai/rsc'
import { CoreMessage, LanguageModel, streamObject } from 'ai'
import { PartialRelated, relatedSchema } from '@/lib/schema/related'
import { getModel } from '../utils/ai-model'
import { MapData } from '@/components/map/map-data-context'

export async function getSuggestions(
  query: string,
  mapData: MapData
) {
  const objectStream = createStreamableValue<PartialRelated>()

  const systemPrompt = `As a helpful assistant, your task is to generate a set of three query suggestions based on the user's partial input. The user is currently interacting with a map, and the following data represents the current map view: ${JSON.stringify(mapData)}. Use this location context to provide relevant suggestions.

  For instance, if the user's partial query is "best coffee near" and the map context is centered on San Francisco, your output should follow this format:

  "{
    "items": [
      { "query": "best coffee near downtown San Francisco" },
      { "query": "top-rated independent coffee shops in SF" },
      { "query": "coffee shops with outdoor seating in San Francisco" }
    ]
  }"

  Generate three queries that anticipate the user's needs, offering logical next steps for their search. The suggestions should be concise and directly related to the partial query and map context.`

  ;(async () => {
    const result = await streamObject({
      model: (await getModel()) as LanguageModel,
      system: systemPrompt,
      messages: [{ role: 'user', content: query }],
      schema: relatedSchema
    })

    for await (const obj of result.partialObjectStream) {
      if (obj && typeof obj === 'object' && 'items' in obj) {
        objectStream.update(obj as PartialRelated)
      }
    }
    objectStream.done()
  })()

  return objectStream.value
}
