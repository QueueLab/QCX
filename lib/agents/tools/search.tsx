import { createStreamableValue } from 'ai/rsc'
import Exa from 'exa-js'
import { tavily } from '@tavily/core'
import { searchSchema } from '@/lib/schema/search'
import { Card } from '@/components/ui/card'
import { SearchSection } from '@/components/search-section'
import { ToolProps } from '.'

export const searchTool = ({ uiStream, fullResponse }: ToolProps) => ({
  description: 'Search the web for information',
  parameters: searchSchema,
  execute: async ({
    query,
    max_results,
    search_depth,
    include_answer,
    topic,
    time_range,
    include_images,
    include_image_descriptions,
    include_raw_content
  }: {
    query: string
    max_results: number
    search_depth: 'basic' | 'advanced'
    include_answer: boolean
    topic?: 'general' | 'news' | 'finance'
    time_range?: 'y' | 'year' | 'd' | 'day' | 'month' | 'week' | 'm' | 'w'
    include_images: boolean
    include_image_descriptions: boolean
    include_raw_content: boolean
  }) => {
    let hasError = false
    // Append the search section
    const streamResults = createStreamableValue<string>()
    uiStream.append(<SearchSection result={streamResults.value} />)

    // Tavily API requires a minimum of 5 characters in the query
    const filledQuery =
      query.length < 5 ? query + ' '.repeat(5 - query.length) : query
    let searchResult
    const searchAPI: 'tavily' | 'exa' = 'tavily'
    try {
      searchResult =
        searchAPI === 'tavily'
          ? await tavilySearch(
              filledQuery,
              max_results,
              search_depth,
              include_answer,
              topic,
              time_range,
              include_images,
              include_image_descriptions,
              include_raw_content
            )
          : await exaSearch(query)
    } catch (error) {
      console.error('Search API error:', error)
      hasError = true
    }

    if (hasError) {
      fullResponse += `\nAn error occurred while searching for "${query}.`
      uiStream.update(
        <Card className="p-4 mt-2 text-sm">
          {`An error occurred while searching for "${query}".`}
        </Card>
      )
      return searchResult
    }

    streamResults.done(JSON.stringify(searchResult))

    return searchResult
  }
})

async function tavilySearch(
  query: string,
  max_results: number = 10,
  search_depth: 'basic' | 'advanced' = 'basic',
  include_answer: boolean = true,
  topic?: 'general' | 'news' | 'finance',
  time_range?: 'y' | 'year' | 'd' | 'day' | 'month' | 'week' | 'm' | 'w',
  include_images: boolean = false,
  include_image_descriptions: boolean = false,
  include_raw_content: boolean = false
): Promise<any> {
  const client = tavily({ apiKey: process.env.TAVILY_API_KEY })
  const response = await client.search(query, {
    maxResults: max_results < 5 ? 5 : max_results,
    searchDepth: search_depth,
    includeAnswer: include_answer,
    topic,
    timeRange: time_range,
    includeImages: include_images,
    includeImageDescriptions: include_image_descriptions,
    includeRawContent: include_raw_content ? 'text' : undefined
  })

  return response
}

async function exaSearch(query: string, maxResults: number = 10): Promise<any> {
  const apiKey = process.env.EXA_API_KEY
  const exa = new Exa(apiKey)
  return exa.searchAndContents(query, {
    highlights: true,
    numResults: maxResults
  })
}
