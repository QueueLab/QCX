import { retrieveSchema } from '@/lib/schema/retrieve'
import { SearchResults as SearchResultsType } from '@/lib/types'

export const retrieveTool = () => ({
  description: 'Retrieve content from the web',
  parameters: retrieveSchema,
  execute: async ({ url }: { url: string }) => {
    let results: SearchResultsType | undefined
    try {
      const response = await fetch(`https://r.jina.ai/${url}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'X-With-Generated-Alt': 'true'
        }
      })
      const json = await response.json()
      if (!json.data || json.data.length === 0) {
        results = { error: 'An error occurred while retrieving the content.' } as any
      } else {
        results = {
          results: [
            {
              title: json.data.title,
              content: json.data.content,
              url: json.data.url
            }
          ],
          query: '',
          images: []
        }
      }
    } catch (error) {
      console.error('Retrieve API error:', error)
      results = { error: 'An error occurred while retrieving the content.' } as any
    }

    return results
  }
})
