import { searchSchema } from '@/lib/schema/search'
import { ToolProps } from '.'

// Start Generation Here
export const videoSearchTool = ({ fullResponse }: ToolProps) => ({
  description: 'Search for videos from YouTube',
  parameters: searchSchema,
  execute: async ({ query }: { query: string }) => {
    let searchResult
    try {
      const response = await fetch('https://google.serper.dev/videos', {
        method: 'POST',
        headers: {
          'X-API-KEY': process.env.SERPER_API_KEY || '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ q: query })
      })
      if (!response.ok) {
        throw new Error('Network response was not ok')
      }
      searchResult = await response.json()
    } catch (error) {
      console.error('Video Search API error:', error)
      return { error: `An error occurred while searching for videos with "${query}".` }
    }

    return searchResult
  }
})
