import { createStreamableUI } from 'ai/rsc'
import { videoSearchSchema } from '@/lib/schema/video-search'
import { ToolProps } from './index'
import { Section } from '@/components/section'
import { VideoSearchSection } from '@/components/video-search-section'
import { recordUsageEvent } from '@/lib/actions/usage'

interface VideoSearchToolProps extends ToolProps {
  userId?: string
  chatId?: string
}

export const videoSearchTool = ({
  uiStream,
  fullResponse,
  userId,
  chatId
}: VideoSearchToolProps) => ({
  description: 'Search for videos related to a query.',
  parameters: videoSearchSchema,
  execute: async ({ query }: { query: string }) => {
    const hasError = fullResponse.includes('Error: Tool execution failed.')
    if (hasError) return null

    uiStream.append(
      <Section title="Video Search">
        <VideoSearchSection result={JSON.stringify({ query })} />
      </Section>
    )

    try {
      const response = await fetch('https://google.serper.dev/videos', {
        method: 'POST',
        headers: {
          'X-API-KEY': process.env.SERPER_API_KEY || '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ q: query })
      })
      const json = await response.json()

      if (userId) {
        recordUsageEvent({
          userId,
          chatId,
          kind: 'tool',
          source: 'videoSearch'
        }).catch(console.error)
      }

      return json
    } catch (error) {
      console.error('Video search tool error:', error)
      return {
        error: 'Failed to search for videos'
      }
    }
  }
})
