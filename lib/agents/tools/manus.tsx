import { manusSchema } from '@/lib/schema/manus'
import { ToolProps } from '.'
import { Card } from '@/components/ui/card'
import { SearchSkeleton } from '@/components/search-skeleton'
import ManusSection from '@/components/manus-section'

export const manusTool = ({ uiStream, fullResponse }: ToolProps) => ({
  description:
    'Execute complex tasks using the Manus AI agent platform. Use this for multi-step tasks requiring planning, research across multiple sources, code execution, file manipulation, or advanced reasoning. Manus can browse the web, analyze data, write code, and perform complex workflows.',
  parameters: manusSchema,
  execute: async ({
    prompt,
    agentProfile,
    taskMode,
    interactiveMode
  }: {
    prompt: string
    agentProfile: 'manus-1.6' | 'manus-1.6-lite' | 'manus-1.6-max'
    taskMode?: 'chat' | 'adaptive' | 'agent'
    interactiveMode: boolean
  }) => {
    let hasError = false
    // Show loading state
    uiStream.append(<SearchSkeleton />)

    let taskResult: {
      task_id: string
      task_title: string
      task_url: string
      share_url?: string
    } | null = null

    try {
      const apiKey = process.env.MANUS_API_KEY
      if (!apiKey) {
        throw new Error('MANUS_API_KEY is not configured')
      }

      // Create task
      const response = await fetch('https://api.manus.ai/v1/tasks', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          API_KEY: apiKey
        },
        body: JSON.stringify({
          prompt,
          agentProfile,
          taskMode,
          interactiveMode,
          createShareableLink: true
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(
          `Manus API error: ${response.status} - ${errorText}`
        )
      }

      taskResult = await response.json()

      if (!taskResult) {
        hasError = true
      }
    } catch (error) {
      hasError = true
      console.error('Manus API error:', error)

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred'
      fullResponse += `\nAn error occurred while executing Manus task: ${errorMessage}`

      uiStream.update(
        <Card className="p-4 mt-2 text-sm">
          {`An error occurred while executing Manus task: ${errorMessage}`}
        </Card>
      )
      return null
    }

    if (hasError || !taskResult) {
      fullResponse += `\nAn error occurred while executing the Manus task.`
      uiStream.update(
        <Card className="p-4 mt-2 text-sm">
          An error occurred while executing the Manus task.
        </Card>
      )
      return null
    }

    // Update UI with task result
    uiStream.update(<ManusSection data={taskResult} />)

    // Add task information to the response context
    fullResponse += `\n\nManus task created successfully:
- Task ID: ${taskResult.task_id}
- Title: ${taskResult.task_title}
- Task URL: ${taskResult.task_url}
${taskResult.share_url ? `- Share URL: ${taskResult.share_url}` : ''}

You can view the task progress and results at the provided URL.`

    return taskResult
  }
})
