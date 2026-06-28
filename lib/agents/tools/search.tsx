import { createStreamableUI, createStreamableValue } from 'ai/rsc'
import { searchSchema } from '@/lib/schema/search'
import { ToolProps } from './index'
import { Section } from '@/components/section'
import { SearchSection } from '@/components/search-section'
import { tavily } from '@tavily/core'
import { recordUsageEvent } from '@/lib/actions/usage'

interface SearchToolProps extends ToolProps {
  userId?: string
  chatId?: string
}

export const searchTool = ({
  uiStream,
  fullResponse,
  userId,
  chatId
}: SearchToolProps) => ({
  description: 'Search for up-to-date factual information on the web.',
  parameters: searchSchema,
  execute: async ({
    query,
    max_results,
    search_depth,
    include_domains,
    exclude_domains
  }: {
    query: string
    max_results?: number
    search_depth?: 'basic' | 'advanced'
    include_domains?: string[]
    exclude_domains?: string[]
  }) => {
    const hasError = fullResponse.includes('Error: Tool execution failed.')
    if (hasError) return null

    const resultStream = createStreamableValue<string>()
    uiStream.append(
      <Section title="Search">
        <SearchSection result={resultStream.value} />
      </Section>
    )

    try {
      const client = tavily({ apiKey: process.env.TAVILY_API_KEY })
      const response = await client.search(query, {
        maxResults: max_results || 5,
        searchDepth: search_depth || 'basic',
        includeDomains: include_domains,
        excludeDomains: exclude_domains,
        includeAnswer: true
      })

      resultStream.done(JSON.stringify(response))

      if (userId) {
        recordUsageEvent({
          userId,
          chatId,
          kind: 'tool',
          source: 'search'
        }).catch(console.error)
      }

      return response
    } catch (error) {
      console.error('Search tool error:', error)
      resultStream.error(error)
      return {
        error: 'Failed to search'
      }
    }
  }
})
