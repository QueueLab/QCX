import { createStreamableUI } from 'ai/rsc'
import { retrieveSchema } from '@/lib/schema/retrieve'
import { ToolProps } from './index'
import { BotMessage } from '@/components/message'
import { Section } from '@/components/section'
import RetrieveSection from '@/components/retrieve-section'
import { recordUsageEvent } from '@/lib/actions/usage'

interface RetrieveToolProps extends ToolProps {
  userId?: string
  chatId?: string
}

export const retrieveTool = ({
  uiStream,
  fullResponse,
  userId,
  chatId
}: RetrieveToolProps) => ({
  description: 'Retrieve content from a specific URL provided by the user.',
  parameters: retrieveSchema,
  execute: async ({ url }: { url: string }) => {
    const hasError = fullResponse.includes('Error: Tool execution failed.')
    if (hasError) return null

    uiStream.append(
      <Section title="Retrieve" separator={true}>
        <RetrieveSection url={url} />
      </Section>
    )

    try {
      const response = await fetch(`https://r.jina.ai/${url}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'X-With-Generated-Alt': 'true'
        }
      })
      const json = await response.json()
      if (!json.data || !json.data.content) {
        throw new Error('Failed to retrieve content')
      }

      if (userId) {
        recordUsageEvent({
          userId,
          chatId,
          kind: 'tool',
          source: 'retrieve'
        }).catch(console.error)
      }

      return {
        results: [
          {
            title: json.data.title,
            content: json.data.content,
            url: json.data.url
          }
        ],
        query: url
      }
    } catch (error) {
      console.error('Retrieve tool error:', error)
      return {
        error: 'Failed to retrieve content'
      }
    }
  }
})
