import { manusSchema, type ManusInput } from '@/lib/schema/manus'
import { ToolProps } from '.'
import { Card } from '@/components/ui/card'
import { SearchSkeleton } from '@/components/search-skeleton'
import ManusSection from '@/components/manus-section'
import { z } from 'zod'

// Response validation schema
const manusResponseSchema = z.object({
  task_id: z.string(),
  task_title: z.string(),
  task_url: z.string().url(),
  share_url: z.string().url().optional()
})

// Sanitize error messages to avoid exposing sensitive information
function sanitizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Remove potentially sensitive details, keep only safe error types
    if (error.message.includes('MANUS_API_KEY')) {
      return 'API configuration error. Please check your settings.'
    }
    if (error.message.includes('fetch')) {
      return 'Network error. Please check your connection and try again.'
    }
    // Return generic message for other errors
    return 'An error occurred while processing your request.'
  }
  return 'An unexpected error occurred.'
}

// Validate URL to prevent injection attacks
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    // Only allow https URLs from manus.ai domain
    return (
      parsed.protocol === 'https:' &&
      (parsed.hostname === 'manus.ai' ||
        parsed.hostname.endsWith('.manus.ai'))
    )
  } catch {
    return false
  }
}

export const manusTool = ({ uiStream, fullResponse }: ToolProps) => ({
  description:
    'Execute complex tasks using the Manus AI agent platform. Use this for multi-step tasks requiring planning, research across multiple sources, code execution, file manipulation, or advanced reasoning. Manus can browse the web, analyze data, write code, and perform complex workflows.',
  parameters: manusSchema,
  execute: async (params: ManusInput) => {
    let hasError = false
    // Show loading state
    uiStream.append(<SearchSkeleton />)

    try {
      const apiKey = process.env.MANUS_API_KEY
      if (!apiKey) {
        throw new Error('MANUS_API_KEY is not configured')
      }

      // Filter undefined fields from request body
      const requestBody: Record<string, unknown> = {
        prompt: params.prompt,
        agentProfile: params.agentProfile
      }

      if (params.taskMode !== undefined) {
        requestBody.taskMode = params.taskMode
      }

      if (params.interactiveMode !== undefined) {
        requestBody.interactiveMode = params.interactiveMode
      }

      // Only create shareable link if explicitly requested
      // For now, default to false for privacy
      requestBody.createShareableLink = false

      // Create AbortController for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

      try {
        // Create task
        const response = await fetch('https://api.manus.ai/v1/tasks', {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            API_KEY: apiKey
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          // Don't expose raw error response
          throw new Error(`API request failed with status ${response.status}`)
        }

        const rawData = await response.json()

        // Validate response structure
        const taskResult = manusResponseSchema.parse(rawData)

        // Validate URLs before using them
        if (!isValidUrl(taskResult.task_url)) {
          throw new Error('Invalid task URL received from API')
        }

        if (taskResult.share_url && !isValidUrl(taskResult.share_url)) {
          // Remove invalid share URL rather than failing
          taskResult.share_url = undefined
        }

        // Update UI with task result
        uiStream.update(<ManusSection data={taskResult} />)

        // Log task creation for audit trail (without sensitive data)
        console.info('Manus task created', {
          task_id: taskResult.task_id,
          timestamp: new Date().toISOString()
        })

        return taskResult
      } catch (fetchError) {
        clearTimeout(timeoutId)
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error('Request timeout. The API took too long to respond.')
        }
        throw fetchError
      }
    } catch (error) {
      hasError = true
      
      // Log error securely (avoid logging sensitive data)
      console.error('Manus task creation failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      })

      const sanitizedMessage = sanitizeErrorMessage(error)

      uiStream.update(
        <Card className="p-4 mt-2 text-sm">
          {sanitizedMessage}
        </Card>
      )
      
      return null
    }
  }
})
