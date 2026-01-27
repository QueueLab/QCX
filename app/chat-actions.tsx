'use server'

import {
  createStreamableUI,
  createStreamableValue,
  getAIState,
  getMutableAIState,
  StreamableValue
} from 'ai/rsc'
import { CoreMessage, ToolResultPart } from 'ai'
import { nanoid } from 'nanoid'
import type { FeatureCollection } from 'geojson'
import { Section } from '@/components/section'
import { FollowupPanel } from '@/components/followup-panel'
import { inquire, researcher, taskManager, querySuggestor, resolutionSearch } from '@/lib/agents'
import { writer } from '@/lib/agents/writer'
import { saveChat, getSystemPrompt } from '@/lib/actions/chat'
import { Chat, AIMessage } from '@/lib/types'
import { BotMessage } from '@/components/message'
import React from 'react'
import { AIState } from '@/lib/chat/types'
import { getUIStateFromAIState } from '@/lib/chat/ui-mapper'
import type { AI } from './ai'

export async function submit(formData?: FormData, skip?: boolean) {
  const aiState = getMutableAIState<typeof AI>()
  const threadId = formData?.get('threadId') as string
  const uiStream = createStreamableUI()
  const isGenerating = createStreamableValue(true)
  const isCollapsed = createStreamableValue(false)

  const action = formData?.get('action') as string;
  if (action === 'resolution_search') {
    const file = formData?.get('file') as File;
    if (!file) {
      throw new Error('No file provided for resolution search.');
    }

    const buffer = await file.arrayBuffer();
    const dataUrl = `data:${file.type};base64,${Buffer.from(buffer).toString('base64')}`;

    const messages: CoreMessage[] = [...(aiState.get().messages as any[])].filter(
      message =>
        (!threadId || message.threadId === threadId) &&
        message.role !== 'tool' &&
        message.type !== 'followup' &&
        message.type !== 'related' &&
        message.type !== 'end' &&
        message.type !== 'resolution_search_result'
    );

    const userInput = 'Analyze this map view.';
    const content: CoreMessage['content'] = [
      { type: 'text', text: userInput },
      { type: 'image', image: dataUrl, mimeType: file.type }
    ];

    aiState.update({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages,
        { id: nanoid(), role: 'user', content, type: 'input', threadId }
      ]
    });
    messages.push({ role: 'user', content });

    const summaryStream = createStreamableValue<string>();

    async function processResolutionSearch() {
      try {
        const analysisResult = await resolutionSearch(messages) as any;
        summaryStream.done(analysisResult.summary || 'Analysis complete.');
        messages.push({ role: 'assistant', content: analysisResult.summary || 'Analysis complete.' });

        const sanitizedMessages: CoreMessage[] = messages.map(m => {
          if (Array.isArray(m.content)) {
            return {
              ...m,
              content: m.content.filter(part => part.type !== 'image')
            } as CoreMessage
          }
          return m
        })

        const relatedQueries = await querySuggestor(uiStream, sanitizedMessages, threadId);
        uiStream.append(
          <Section title="Follow-up">
            <FollowupPanel threadId={threadId} />
          </Section>
        );

        await new Promise(resolve => setTimeout(resolve, 500));
        const groupeId = nanoid();

        aiState.done({
          ...aiState.get(),
          messages: [
            ...aiState.get().messages,
            {
              id: groupeId,
              role: 'assistant',
              content: analysisResult.summary || 'Analysis complete.',
              type: 'response',
              threadId
            },
            {
              id: groupeId,
              role: 'assistant',
              content: JSON.stringify(analysisResult),
              type: 'resolution_search_result',
              threadId
            },
            {
              id: groupeId,
              role: 'assistant',
              content: JSON.stringify(relatedQueries),
              type: 'related',
              threadId
            },
            {
              id: groupeId,
              role: 'assistant',
              content: 'followup',
              type: 'followup',
              threadId
            }
          ]
        });
      } catch (error) {
        console.error('Error in resolution search:', error);
        summaryStream.error(error);
      } finally {
        isGenerating.done(false);
        uiStream.done();
      }
    }

    processResolutionSearch();

    uiStream.update(
      <Section title="response">
        <BotMessage content={summaryStream.value} />
      </Section>
    );

    return {
      id: nanoid(),
      isGenerating: isGenerating.value,
      component: uiStream.value,
      isCollapsed: isCollapsed.value
    };
  }

  const messages: CoreMessage[] = [...(aiState.get().messages as any[])].filter(
    message =>
      (!threadId || message.threadId === threadId) &&
      message.role !== 'tool' &&
      message.type !== 'followup' &&
      message.type !== 'related' &&
      message.type !== 'end' &&
      message.type !== 'resolution_search_result'
  )

  const groupeId = nanoid()
  const useSpecificAPI = process.env.USE_SPECIFIC_API_FOR_WRITER === 'true'
  const maxMessages = useSpecificAPI ? 5 : 10
  messages.splice(0, Math.max(messages.length - maxMessages, 0))

  const userInput = skip
    ? `{"action": "skip"}`
    : ((formData?.get('related_query') as string) ||
      (formData?.get('input') as string))

  if (userInput && (userInput.toLowerCase().trim() === 'what is a planet computer?' || userInput.toLowerCase().trim() === 'what is qcx-terra?')) {
    const definition = userInput.toLowerCase().trim() === 'what is a planet computer?'
      ? `A planet computer is a proprietary environment aware system that interoperates weather forecasting, mapping and scheduling using cutting edge multi-agents to streamline automation and exploration on a planet. Available for our Pro and Enterprise customers. [QCX Pricing](https://www.queue.cx/#pricing)`
      : `QCX-Terra is a model garden of pixel level precision geospatial foundational models for efficient land feature predictions from satellite imagery. Available for our Pro and Enterprise customers. [QCX Pricing] (https://www.queue.cx/#pricing)`;

    const content = formData ? JSON.stringify(Object.fromEntries(formData)) : userInput;
    const type = 'input';

    aiState.update({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages,
        {
          id: nanoid(),
          role: 'user',
          content,
          type,
          threadId
        },
      ],
    });

    const definitionStream = createStreamableValue();
    definitionStream.done(definition);

    const answerSection = (
      <Section title="response">
        <BotMessage content={definitionStream.value} />
      </Section>
    );

    uiStream.append(answerSection);

    const relatedQueries = { items: [] };

    aiState.done({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages,
        {
          id: groupeId,
          role: 'assistant',
          content: definition,
          type: 'response',
          threadId
        },
        {
          id: groupeId,
          role: 'assistant',
          content: JSON.stringify(relatedQueries),
          type: 'related',
          threadId
        },
        {
          id: groupeId,
          role: 'assistant',
          content: 'followup',
          type: 'followup',
          threadId
        },
      ],
    });

    isGenerating.done(false);
    uiStream.done();

    return {
      id: nanoid(),
      isGenerating: isGenerating.value,
      component: uiStream.value,
      isCollapsed: isCollapsed.value,
    };
  }
  const file = !skip ? (formData?.get('file') as File) : undefined

  if (!userInput && !file) {
    isGenerating.done(false)
    return {
      id: nanoid(),
      isGenerating: isGenerating.value,
      component: null,
      isCollapsed: isCollapsed.value
    }
  }

  const messageParts: {
    type: 'text' | 'image'
    text?: string
    image?: string
    mimeType?: string
  }[] = []

  if (userInput) {
    messageParts.push({ type: 'text', text: userInput })
  }

  if (file) {
    const buffer = await file.arrayBuffer()
    if (file.type.startsWith('image/')) {
      const dataUrl = `data:${file.type};base64,${Buffer.from(
        buffer
      ).toString('base64')}`
      messageParts.push({
        type: 'image',
        image: dataUrl,
        mimeType: file.type
      })
    } else if (file.type === 'text/plain') {
      const textContent = Buffer.from(buffer).toString('utf-8')
      const existingTextPart = messageParts.find(p => p.type === 'text')
      if (existingTextPart) {
        existingTextPart.text = `${textContent}\n\n${existingTextPart.text}`
      } else {
        messageParts.push({ type: 'text', text: textContent })
      }
    }
  }

  const hasImage = messageParts.some(part => part.type === 'image')
  const content: CoreMessage['content'] = hasImage
    ? messageParts as CoreMessage['content']
    : messageParts.map(part => part.text).join('\n')

  const type = skip
    ? undefined
    : formData?.has('input') || formData?.has('file')
    ? 'input'
    : formData?.has('related_query')
    ? 'input_related'
    : 'inquiry'

  if (content) {
    aiState.update({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages,
        {
          id: nanoid(),
          role: 'user',
          content,
          type,
          threadId
        }
      ]
    })
    messages.push({
      role: 'user',
      content
    } as CoreMessage)
  }

  const userId = 'anonymous'
  const currentSystemPrompt = (await getSystemPrompt(userId)) || ''
  const mapProvider = formData?.get('mapProvider') as 'mapbox' | 'google'

  const streamText = createStreamableValue<string>()

  async function processEvents() {
    try {
      let action: any = { object: { next: 'proceed' } }
      if (!skip) {
        const taskManagerResult = await taskManager(messages)
        if (taskManagerResult) {
          action.object = taskManagerResult.object
        }
      }

      if (action.object.next === 'inquire') {
        const inquiry = await inquire(uiStream, messages)
        uiStream.done()
        isGenerating.done()
        isCollapsed.done(false)
        aiState.done({
          ...aiState.get(),
          messages: [
            ...aiState.get().messages,
            {
              id: nanoid(),
              role: 'assistant',
              content: `inquiry: ${inquiry?.question}`,
              threadId
            }
          ]
        })
        return
      }

      isCollapsed.done(true)
      let answer = ''
      let toolOutputs: ToolResultPart[] = []
      let errorOccurred = false

      while (
        useSpecificAPI
          ? answer.length === 0
          : answer.length === 0 && !errorOccurred
      ) {
        const { fullResponse, hasError, toolResponses } = await researcher(
          currentSystemPrompt,
          uiStream,
          streamText,
          messages,
          mapProvider,
          useSpecificAPI
        )
        answer = fullResponse
        toolOutputs = toolResponses
        errorOccurred = hasError

        if (toolOutputs.length > 0) {
          toolOutputs.map(output => {
            aiState.update({
              ...aiState.get(),
              messages: [
                ...aiState.get().messages,
                {
                  id: groupeId,
                  role: 'tool',
                  content: JSON.stringify(output.result),
                  name: output.toolName,
                  type: 'tool',
                  threadId
                }
              ]
            })
          })
        }
      }

      if (useSpecificAPI && answer.length === 0) {
        const modifiedMessages = aiState
          .get()
          .messages.map((msg: any) =>
            msg.role === 'tool'
              ? {
                  ...msg,
                  role: 'assistant',
                  content: JSON.stringify(msg.content),
                  type: 'tool'
                }
              : msg
          ) as CoreMessage[]
        const latestMessages = modifiedMessages.slice(maxMessages * -1)
        answer = await writer(
          currentSystemPrompt,
          uiStream,
          streamText,
          latestMessages
        )
      } else {
        streamText.done()
      }

      if (!errorOccurred) {
        const relatedQueries = await querySuggestor(uiStream, messages, threadId)
        uiStream.append(
          <Section title="Follow-up">
            <FollowupPanel threadId={threadId} />
          </Section>
        )

        await new Promise(resolve => setTimeout(resolve, 500))

        aiState.done({
          ...aiState.get(),
          messages: [
            ...aiState.get().messages,
            {
              id: groupeId,
              role: 'assistant',
              content: answer,
              type: 'response',
              threadId
            },
            {
              id: groupeId,
              role: 'assistant',
              content: JSON.stringify(relatedQueries),
              type: 'related',
              threadId
            },
            {
              id: groupeId,
              role: 'assistant',
              content: 'followup',
              type: 'followup',
              threadId
            }
          ]
        })
      }
    } catch (error) {
      console.error('Error in processEvents:', error)
    } finally {
      isGenerating.done(false);
      uiStream.done();
    }
  }

  uiStream.update(
    <Section title="response">
      <BotMessage content={streamText.value} />
    </Section>
  )

  processEvents()

  return {
    id: nanoid(),
    isGenerating: isGenerating.value,
    component: uiStream.value,
    isCollapsed: isCollapsed.value
  }
}

export async function clearChat() {
  const aiState = getMutableAIState<typeof AI>()

  aiState.done({
    chatId: nanoid(),
    messages: []
  })
}

export async function onGetUIState() {
  const aiState = getAIState() as AIState
  if (aiState) {
    const uiState = getUIStateFromAIState(aiState)
    return uiState
  }
  return []
}

export async function onSetAIState({ state }: { state: AIState }) {
  const { messages: allMessages } = state

  // Group messages by threadId. Default to state.chatId if no threadId.
  const messagesByThread = allMessages.reduce((acc, msg) => {
    const tid = msg.threadId || state.chatId
    if (!acc[tid]) acc[tid] = []
    acc[tid].push(msg)
    return acc
  }, {} as Record<string, AIMessage[]>)

  const { getCurrentUserIdOnServer } = await import(
    '@/lib/auth/get-current-user'
  )
  const actualUserId = await getCurrentUserIdOnServer()

  if (!actualUserId) {
    console.error('onSetAIState: User not authenticated. Chat not saved.')
    return
  }

  for (const [tid, messages] of Object.entries(messagesByThread)) {
    if (!messages.some(e => e.type === 'response')) {
      continue
    }

    const createdAt = new Date()
    const path = `/search/${tid}`

    let title = 'Untitled Chat'
    if (messages.length > 0) {
      const firstMessage = messages.find(m => m.role === 'user');
      const firstMessageContent = firstMessage?.content || messages[0].content
      if (typeof firstMessageContent === 'string') {
        try {
          const parsedContent = JSON.parse(firstMessageContent)
          title = parsedContent.input?.substring(0, 100) || 'Untitled Chat'
        } catch (e) {
          title = firstMessageContent.substring(0, 100)
        }
      } else if (Array.isArray(firstMessageContent)) {
        const textPart = (
          firstMessageContent as { type: string; text?: string }[]
        ).find(p => p.type === 'text')
        title =
          textPart && textPart.text
            ? textPart.text.substring(0, 100)
            : 'Image Message'
      }
    }

    const updatedMessages: AIMessage[] = [
      ...messages,
      {
        id: nanoid(),
        role: 'assistant',
        content: `end`,
        type: 'end',
        threadId: tid
      }
    ]

    const chat: Chat = {
      id: tid,
      createdAt,
      userId: actualUserId,
      path,
      title,
      messages: updatedMessages
    }

    // Background save
    saveChat(chat, actualUserId).catch(err => {
        console.error(`Failed to save chat ${tid} in onSetAIState:`, err)
    })
  }
}
