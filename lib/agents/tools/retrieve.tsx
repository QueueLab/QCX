import { retrieveSchema } from '@/lib/schema/retrieve'
import { ToolProps } from '.'
import { SearchResults as SearchResultsType } from '@/lib/types'

export const retrieveTool = ({ fullResponse }: ToolProps) => ({
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
        return { error: `An error occurred while retrieving "${url}". This website may not be supported.` }
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
      return { error: `An error occurred while retrieving "${url}".` }
    }

    return results
  }
})
