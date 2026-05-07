    isGenerating.done(false)
    return {
      id: nanoid(),
      isGenerating: isGenerating.value,
      component: null,
      isCollapsed: isCollapsed.value
    }
  }

  const messages: CoreMessage[] = [...(aiState.get().messages as any[])].filter(
    (message: any) =>
      message.role !== 'tool' &&
      message.type !== 'followup' &&
      message.type !== 'related' &&
      message.type !== 'end' &&
      message.type !== 'resolution_search_result'
  ).map((m: any) => {
    if (Array.isArray(m.content)) {
      return {
        ...m,
        content: m.content.filter((part: any) =>
          part.type !== "image" || (typeof part.image === "string" && part.image.startsWith("data:"))
        )
      } as any
    }
    return m
  })

  const groupeId = nanoid()
  const useSpecificAPI = process.env.USE_SPECIFIC_API_FOR_WRITER === 'true'
  const maxMessages = useSpecificAPI ? 5 : 10
  messages.splice(0, Math.max(messages.length - maxMessages, 0))

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
          type
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
              content: `inquiry: ${inquiry?.question}`
            }
          ]
        })
        return
      }

      isCollapsed.done(true)
      let answer = ''
      let toolOutputs: ToolResultPart[] = []
      let errorOccurred = false
      const streamText = createStreamableValue<string>()
      uiStream.update(<Spinner />)

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
          useSpecificAPI,
          drawnFeatures
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
                  type: 'tool'
                }
              ]
            })
          })
        }
      }

      if (useSpecificAPI && answer.length === 0) {
        const modifiedMessages = aiState
          .get()
          .messages.map(msg =>
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
        const relatedQueries = await querySuggestor(uiStream, messages)
        uiStream.append(
          <Section title="Follow-up">
            <FollowupPanel />
          </Section>
        )


        aiState.done({
          ...aiState.get(),
          messages: [
            ...aiState.get().messages,
            {
              id: groupeId,
              role: 'assistant',
              content: answer,
              type: 'response'
            },
            {
              id: groupeId,
              role: 'assistant',
              content: JSON.stringify(relatedQueries),
              type: 'related'
            },
            {
              id: groupeId,
              role: 'assistant',
              content: 'followup',
              type: 'followup'
            }
          ]
        })
      }
    } catch (error) {
      console.error('Error in processEvents:', error)
    } finally {
      isGenerating.done(false)
      uiStream.done()
    }
  }

  processEvents()

  return {
    id: nanoid(),
    isGenerating: isGenerating.value,
    component: uiStream.value,
    isCollapsed: isCollapsed.value
  }
}

async function clearChat() {
  'use server'

  const aiState = getMutableAIState<typeof AI>()

  aiState.done({
    chatId: nanoid(),
    messages: []
  })
}

export type AIState = {
  messages: AIMessage[]
  chatId: string
  isSharePage?: boolean
}

export type UIState = {
  id: string
  component: React.ReactNode
  isGenerating?: StreamableValue<boolean>
  isCollapsed?: StreamableValue<boolean>
}[]

const initialAIState: AIState = {
  chatId: nanoid(),
  messages: []
}

const initialUIState: UIState = []

export const AI = createAI<AIState, UIState>({
  actions: {
    submit,
    clearChat
  },
  initialUIState,
  initialAIState,
  onGetUIState: async () => {
    'use server'

    const aiState = getAIState() as AIState
    if (aiState) {
      const uiState = getUIStateFromAIState(aiState)
      return uiState
    }
    return initialUIState
  },
  onSetAIState: async ({ state }) => {
