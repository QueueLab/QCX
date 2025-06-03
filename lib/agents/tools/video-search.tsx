// import { createStreamableValue } from 'ai/rsc' // Removed
import { searchSchema } from '@/lib/schema/search' // Assuming searchSchema is generic enough for video search query
// import { Card } from '@/components/ui/card' // Removed
// import { ToolProps } from '.' // Removed
// import { VideoSearchSection } from '@/components/video-search-section' // Removed

export const videoSearchTool = () => ({
  description: 'Search for videos on the web (e.g., YouTube). Returns a list of video search results.',
  parameters: searchSchema, // Using the same searchSchema as web search for the query parameter
  execute: async ({ query }: { query: string }) => {
    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey) {
      console.error('SERPER_API_KEY is not set. Video search tool cannot operate.');
      return { error: 'SERPER_API_KEY is not configured.' };
    }

    try {
      console.log(`Performing video search for: "${query}" using Serper API`);
      const response = await fetch('https://google.serper.dev/videos', {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ q: query })
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Serper API Error for video search: ${response.status} ${response.statusText} - ${errorBody}`);
      }
      const searchResult = await response.json();
      console.log(`Successfully fetched video search results for: "${query}"`);
      return searchResult; // Return the direct JSON result from Serper
    } catch (error) {
      console.error(`Video Search API error for query "${query}":`, error);
      return { error: `Failed to perform video search for "${query}".`, details: (error as Error).message };
    }
  }
})
