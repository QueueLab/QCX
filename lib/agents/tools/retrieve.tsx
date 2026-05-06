import { retrieveSchema } from '@/lib/schema/retrieve'
import { SearchResults as SearchResultsType } from '@/lib/types'

export const retrieveTool = () => ({
  description: 'Retrieve content from the web',
  parameters: retrieveSchema,
  execute: async ({ url }: { url: string }) => {
    let results: SearchResultsType | undefined
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15_000)
    try {
      const response = await fetch(`https://r.jina.ai/${url}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'X-With-Generated-Alt': 'true'
        },
        signal: controller.signal
      })
      if (!response.ok) {
        return { error: `Retrieve failed for "${url}" (HTTP ${response.status}).` }
      }
      const json = await response.json()
      if (!json.data || json.data.length === 0) {
        return { error: `An error occurred while retrieving "${url}". This website may not be supported.` }
      }
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
    } catch (error) {
      console.error('Retrieve API error:', error)
      const message = error instanceof Error ? error.message : String(error)
      return { error: `Failed to retrieve "${url}": ${message}` }
    } finally {
      clearTimeout(timeout)
    }

    return results
  }
})
