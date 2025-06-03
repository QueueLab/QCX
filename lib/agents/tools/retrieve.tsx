import { retrieveSchema } from '@/lib/schema/retrieve'
// import { ToolProps } from '.' // Removed
// import { Card } from '@/components/ui/card' // Removed
// import { SearchSkeleton } from '@/components/search-skeleton' // Removed
import { SearchResults as SearchResultsType } from '@/lib/types' // This type might still be useful
// import RetrieveSection from '@/components/retrieve-section' // Removed

export const retrieveTool = () => ({
  description: 'Retrieve content from a single webpage URL. Returns the title, content, and URL of the page.',
  parameters: retrieveSchema,
  execute: async ({ url }: { url: string }) => {
    let results: SearchResultsType | undefined // Using existing type for structure
    try {
      console.log(`Retrieving content from URL: ${url} using Jina AI`);
      const response = await fetch(`https://r.jina.ai/${url}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          // 'X-With-Generated-Alt': 'true' // This header might be specific to Jina's advanced features
        }
      })

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Jina API Error: ${response.status} ${response.statusText} - ${errorBody}`);
      }

      const json = await response.json();
      if (!json.data || (json.data.content && json.data.content.length === 0)) {
        console.warn(`No content found or empty content for URL: ${url}`, json);
        // It's better to return a specific message than to throw an error for empty content,
        // as the URL might be valid but have no scrapable content.
        return {
          error: `No content found or content is empty for URL: ${url}. The website may not be supported or has no main content.`,
          url: url
        };
      }

      // Simplify the result to focus on what the LLM needs.
      // The original SearchResultsType includes 'query' and 'images' which are not relevant here.
      const retrievedData = {
        title: json.data.title,
        content: json.data.content, // This can be very long. Consider truncating or summarizing if needed for LLM context.
        url: json.data.url // Or use the input 'url' to be sure
      };
      console.log(`Successfully retrieved content for URL: ${url}`);
      return retrievedData;

    } catch (error) {
      console.error(`Retrieve API error for URL "${url}":`, error);
      return { error: `Failed to retrieve content from URL "${url}".`, details: (error as Error).message, url: url };
    }
  }
})
