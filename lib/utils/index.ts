import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { openai } from '@ai-sdk/openai'
import { createOpenAI } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { createXai } from '@ai-sdk/xai';
import { v4 as uuidv4 } from 'uuid';
import {
  convertToCoreMessages,
  CoreMessage,
  CoreToolMessage,
  generateId,
  JSONValue,
  Message,
  ToolInvocation
} from 'ai'
import { type Model } from '@/lib/types/models'
import { ExtendedCoreMessage } from '@/lib/types'


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateUUID(): string {
  return uuidv4();
}



export function transformToolMessages(messages: CoreMessage[]): CoreMessage[] {
  return messages.map(message =>
    message.role === 'tool'
      ? {
          ...message,
          role: 'assistant',
          content: JSON.stringify(message.content),
          type: 'tool'
        }
      : message
  ) as CoreMessage[]
}

export function sanitizeUrl(url: string): string {
  return url.replace(/\s+/g, '%20')
}

export function createModelId(model: Model): string {
  return `${model.providerId}:${model.id}`
}

export function getDefaultModelId(models: Model[]): string {
  if (!models.length) {
    throw new Error('No models available')
  }
  return createModelId(models[0])
}

function addToolMessageToChat({
  toolMessage,
  messages
}: {
  toolMessage: CoreToolMessage
  messages: Array<Message>
}): Array<Message> {
  return messages.map(message => {
    if (message.toolInvocations) {
      return {
        ...message,
        toolInvocations: message.toolInvocations.map(toolInvocation => {
          const toolResult = toolMessage.content.find(
            tool => tool.toolCallId === toolInvocation.toolCallId
          )

          if (toolResult) {
            return {
              ...toolInvocation,
              state: 'result',
              result: toolResult.result
            }
          }

          return toolInvocation
        })
      }
    }

    return message
  })
}

export function convertToUIMessages(
  messages: Array<ExtendedCoreMessage>
): Array<Message> {
  let pendingAnnotations: JSONValue[] = []
  let pendingReasoning: string | undefined = undefined
  let pendingReasoningTime: number | undefined = undefined

  return messages.reduce((chatMessages: Array<Message>, message) => {
    if (message.role === 'tool') {
      return addToolMessageToChat({
        toolMessage: message as CoreToolMessage,
        messages: chatMessages
      })
    }

    if (message.role === 'data') {
      if (
        message.content !== null &&
        message.content !== undefined &&
        typeof message.content !== 'string'
      ) {
        const content = message.content as JSONValue
        if (
          content &&
          typeof content === 'object' &&
          'type' in content &&
          'data' in content
        ) {
          if (content.type === 'reasoning') {
            if (typeof content.data === 'object' && content.data !== null) {
              pendingReasoning = (content.data as any).reasoning
              pendingReasoningTime = (content.data as any).time
            } else {
              pendingReasoning = content.data as string
              pendingReasoningTime = 0
            }
          } else {
            pendingAnnotations.push(content)
          }
        }
      }
      return chatMessages
    }

    let textContent = ''
    let toolInvocations: Array<ToolInvocation> = []

    if (message.content) {
      if (typeof message.content === 'string') {
        textContent = message.content
      } else if (Array.isArray(message.content)) {
        for (const content of message.content) {
          if (content && typeof content === 'object' && 'type' in content) {
            if (content.type === 'text' && 'text' in content) {
              textContent += content.text
            } else if (
              content.type === 'tool-call' &&
              'toolCallId' in content &&
              'toolName' in content &&
              'args' in content
            ) {
              toolInvocations.push({
                state: 'call',
                toolCallId: content.toolCallId,
                toolName: content.toolName,
                args: content.args
              } as ToolInvocation)
            }
          }
        }
      }
    }

    let annotations: JSONValue[] | undefined = undefined
    if (message.role === 'assistant') {
      if (pendingAnnotations.length > 0 || pendingReasoning !== undefined) {
        annotations = [
          ...pendingAnnotations,
          ...(pendingReasoning !== undefined
            ? [
                {
                  type: 'reasoning',
                  data: {
                    reasoning: pendingReasoning,
                    time: pendingReasoningTime ?? 0
                  }
                }
              ]
            : [])
        ]
      }
    }

    const newMessage: Message = {
      id: generateId(),
      role: message.role,
      content: textContent,
      toolInvocations: toolInvocations.length > 0 ? toolInvocations : undefined,
      annotations: annotations
    }

    chatMessages.push(newMessage)

    if (message.role === 'assistant') {
      pendingAnnotations = []
      pendingReasoning = undefined
      pendingReasoningTime = undefined
    }

    return chatMessages
  }, [])
}

export function convertToExtendedCoreMessages(
  messages: Message[]
): ExtendedCoreMessage[] {
  const result: ExtendedCoreMessage[] = []

  for (const message of messages) {
    if (message.annotations && message.annotations.length > 0) {
      message.annotations.forEach(annotation => {
        result.push({
          role: 'data',
          content: annotation
        })
      })
    }

    if (message.reasoning) {
      const reasoningTime = (message as any).reasoningTime ?? 0
      const reasoningData =
        typeof message.reasoning === 'string'
          ? { reasoning: message.reasoning, time: reasoningTime }
          : {
              ...(message.reasoning as Record<string, unknown>),
              time:
                (message as any).reasoningTime ??
                (message.reasoning as any).time ??
                0
            }
      result.push({
        role: 'data',
        content: {
          type: 'reasoning',
          data: reasoningData
        } as JSONValue
      })
    }

    const converted = convertToCoreMessages([message])
    result.push(...converted)
  }

  return result
}
