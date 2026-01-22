import { LanguageModel, streamObject } from 'ai'
import { relatedSchema } from '@/lib/schema/related'
import { getModel } from '../utils'
import { MapData } from '@/components/map/map-data-context'

export async function getSuggestions(
  query: string,
  mapData: MapData
) {
  const systemPrompt = `As a helpful assistant, your task is to generate a set of three query suggestions based on the user's partial input...`

  const result = await streamObject({
    model: (await getModel()) as LanguageModel,
    system: systemPrompt,
    messages: [{ role: 'user', content: query }],
    schema: relatedSchema
  })

  return result.toTextStreamResponse()
}
