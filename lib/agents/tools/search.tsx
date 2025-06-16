import { createStreamableValue } from 'ai/rsc'
import Exa from 'exa-js'
import { searchSchema } from '@/lib/schema/search'
import { Card } from '@/components/ui/card'
import { SearchSection } from '@/components/search-section'
import { ToolProps, UserLocation } from '.' // UserLocation might not be directly used here but ToolProps is updated

export const searchTool = ({ uiStream, fullResponse, currentUserLocation }: ToolProps) => ({
  description: 'Search the web for information',
  parameters: searchSchema,
  execute: async ({
    query,
    max_results,
    search_depth
  }: {
    query: string
    max_results: number
    search_depth: 'basic' | 'advanced'
  }) => {
    let hasError = false
    // Append the search section
    const streamResults = createStreamableValue<string>()
    uiStream.append(<SearchSection result={streamResults.value} />)

    let augmentedQuery = query;
    // Augment with location if available and seems relevant
    // For searchTool, we'll assume if location is available, it's relevant to append,
    // unless the query already seems location specific (e.g. "weather in London").
    // A more sophisticated check could be added here (e.g. LLM indicating location relevance).
    // For now, a simple append if place_name exists.
    if (currentUserLocation?.place_name && !/\b(?:in|near|at|around)\b\s+\w+/i.test(augmentedQuery)) {
      // Heuristic: if query doesn't already contain "in/near/at/around [word]", append location.
      augmentedQuery = `${augmentedQuery} in ${currentUserLocation.place_name}`;
    }

    // Tavily API requires a minimum of 5 characters in the query
    const filledQuery =
      augmentedQuery.length < 5 ? augmentedQuery + ' '.repeat(5 - augmentedQuery.length) : augmentedQuery;

    let searchResult;
    const searchAPI: 'tavily' | 'exa' = 'tavily'; // Assuming 'tavily' is the one using the timestamp.
                                               // exaSearch would also need similar modification if used.
    try {
      searchResult =
        searchAPI === 'tavily'
          ? await tavilySearch(filledQuery, max_results, search_depth) // tavilySearch handles timestamp
          : await exaSearch(augmentedQuery); // exaSearch would need its own timestamp logic if desired
    } catch (error) {
      console.error('Search API error:', error)
      hasError = true
    }

    if (hasError) {
      fullResponse += `\nAn error occurred while searching for "${augmentedQuery}.`
      uiStream.update(
        <Card className="p-4 mt-2 text-sm">
          {`An error occurred while searching for "${augmentedQuery}".`}
        </Card>
      )
      return searchResult
    }

    streamResults.done(JSON.stringify(searchResult))

    return searchResult
  }
})

export async function tavilySearch(
  query: string,
  maxResults: number = 10,
  searchDepth: 'basic' | 'advanced' = 'basic'
): Promise<any> {
  const apiKey = process.env.TAVILY_API_KEY

  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  const currentTimeString = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

  // Query already includes location if currentUserLocation was available in searchTool's execute.
  // Now, just append the current time.
  const finalQueryWithTime = `${query} current time: ${currentTimeString}`;

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      api_key: apiKey,
      query: finalQueryWithTime,
      max_results: maxResults < 5 ? 5 : maxResults,
      search_depth: searchDepth,
      include_images: true,
      include_answers: true
    })
  })

  if (!response.ok) {
    throw new Error(`Error: ${response.status}`)
  }

  const data = await response.json()
  return data
}

async function exaSearch(query: string, maxResults: number = 10): Promise<any> {
  const apiKey = process.env.EXA_API_KEY
  const exa = new Exa(apiKey)
  return exa.searchAndContents(query, {
    highlights: true,
    numResults: maxResults
  })
}
