// import { createStreamableValue } from 'ai/rsc' // Removed
import Exa from 'exa-js'
import { searchSchema } from '@/lib/schema/search'
// import { Card } from '@/components/ui/card' // Removed, no direct UI
// import { SearchSection } from '@/components/search-section' // Removed, no direct UI
// import { ToolProps } from '.' // Removed

export const searchTool = () => ({
  description: 'Search the web for information. Returns a list of search results with snippets and links.',
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
    // Tavily API requires a minimum of 5 characters in the query
    const filledQuery =
      query.length < 5 ? query + ' '.repeat(5 - query.length) : query
    let searchResult
    // const searchAPI: 'tavily' | 'exa' = 'tavily'; // Defaulting to Tavily for now
    // Choose searchAPI based on environment or other logic if necessary
    const searchAPI = process.env.EXA_API_KEY ? 'exa' : 'tavily';

    try {
      if (searchAPI === 'tavily') {
        console.log(`Performing Tavily search for: "${filledQuery}"`);
        searchResult = await tavilySearch(filledQuery, max_results, search_depth);
      } else {
        console.log(`Performing Exa search for: "${query}"`);
        searchResult = await exaSearch(query, max_results);
      }
      // Ensure results are stringified for the LLM, as it expects text or structured serializable data.
      // The actual search result object from Tavily/Exa might be complex.
      // It's often better to process and simplify it here if needed,
      // or ensure the LLM can handle the raw structure.
      // For now, returning the direct result.
      // The MCP handler will stringify this if necessary or use it as is if the model supports it.
      return searchResult;
    } catch (error) {
      console.error(`${searchAPI} Search API error:`, error);
      // Return a structured error that the LLM can understand and relay.
      return { error: `Failed to perform search for "${query}".`, details: (error as Error).message };
    }
  }
})

async function tavilySearch(
  query: string,
  maxResults: number = 10,
  searchDepth: 'basic' | 'advanced' = 'basic'
): Promise<any> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new Error("TAVILY_API_KEY is not set.");
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: maxResults < 5 ? 5 : maxResults,
      search_depth: searchDepth,
      include_images: true,
      include_answers: true
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Tavily API Error: ${response.status} ${response.statusText} - ${errorBody}`);
  }

  const data = await response.json();
  return data;
}

async function exaSearch(query: string, maxResults: number = 10): Promise<any> {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) throw new Error("EXA_API_KEY is not set.");
  const exa = new Exa(apiKey);
  return exa.searchAndContents(query, {
    highlights: true,
    numResults: maxResults
  });
}
