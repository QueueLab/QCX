
import { createStreamableValue } from 'ai/rsc'
import { searchSchema } from '@/lib/schema/search'
import { Card } from '@/components/ui/card'
import { ImageSearchSection } from '@/components/image-search-section'
import { ToolProps } from '.'

export const imageSearchTool = ({ uiStream, fullResponse }: ToolProps) => ({
  description: 'Search the web for images',
  parameters: searchSchema,
  execute: async ({
    query,
    max_results,
  }: {
    query: string
    max_results: number
  }) => {
    let hasError = false
    const streamResults = createStreamableValue<string>()
    uiStream.append(<ImageSearchSection result={streamResults.value} />)

    const filledQuery =
      query.length < 5 ? query + ' '.repeat(5 - query.length) : query
    let searchResult
    try {
      searchResult = await serperImageSearch(filledQuery, max_results)
    } catch (error) {
      console.error('Image search API error:', error)
      hasError = true
    }

    if (hasError) {
      fullResponse += `\nAn error occurred while searching for images of "${query}".`
      uiStream.update(
        <Card className="p-4 mt-2 text-sm">
          {`An error occurred while searching for images of "${query}".`}
        </Card>
      )
      return searchResult
    }

    streamResults.done(JSON.stringify(searchResult))

    return searchResult
  }
})

async function serperImageSearch(
  query: string,
  maxResults: number = 10,
): Promise<any> {
  const apiKey = process.env.SERPER_API_KEY
  const response = await fetch('https://google.serper.dev/images', {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey!,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      q: query,
      num: maxResults,
    })
  })

  if (!response.ok) {
    throw new Error(`Error: ${response.status}`)
  }

  const data = await response.json()
  return data
}
