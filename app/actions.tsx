'use server'

import {
  streamText,
  streamObject,
  createDataStreamResponse,
  CoreMessage,
  ToolResultPart,
  StreamData
} from 'ai'
import { nanoid } from 'nanoid'
import { inquire, researcher, taskManager, querySuggestor, resolutionSearch } from '@/lib/agents'
import { writer } from '@/lib/agents/writer'
import { saveChat, getSystemPrompt } from '@/lib/actions/chat'
import { Chat, AIMessage } from '@/lib/types'
import { getCurrentUserIdOnServer } from '@/lib/auth/get-current-user'

export async function submit(messages: CoreMessage[], formData?: FormData) {
  const userId = await getCurrentUserIdOnServer() || 'anonymous'
  const chatId = (formData?.get('chatId') as string) || nanoid()

  return createDataStreamResponse({
    execute: async (dataStream) => {
      const action = formData?.get('action') as string;

      const saveMessages = async (assistantContent: string, data: any[] = []) => {
        if (userId === 'anonymous') return;

        const lastUserMessage = messages[messages.length - 1];
        const userAIMessage: AIMessage = {
          id: nanoid(),
          role: 'user',
          content: lastUserMessage.content,
          type: 'input'
        };

        const assistantAIMessage: AIMessage = {
          id: nanoid(),
          role: 'assistant',
          content: assistantContent,
          type: 'response'
        };

        const chat: Chat = {
          id: chatId,
          title: typeof lastUserMessage.content === 'string' ? lastUserMessage.content.substring(0, 100) : 'New Chat',
          createdAt: new Date(),
          userId: userId,
          path: `/search/${chatId}`,
          messages: [userAIMessage, assistantAIMessage]
        };

        // Add tool messages if any
        // This is a simplified version of persistence
        await saveChat(chat, userId);
      };

      if (action === 'resolution_search') {
        const file = formData?.get('file') as File;
        if (file) {
          const buffer = await file.arrayBuffer();
          const dataUrl = `data:${file.type};base64,${Buffer.from(buffer).toString('base64')}`;

          const userInput = 'Analyze this map view.';
          const content: CoreMessage['content'] = [
            { type: 'text', text: userInput },
            { type: 'image', image: dataUrl, mimeType: file.type }
          ];

          const msgWithImage = { role: 'user', content } as CoreMessage;
          const messagesForAnalysis = [...messages, msgWithImage];

          const analysisResult = await resolutionSearch(messagesForAnalysis) as any;

          dataStream.write(`0:${analysisResult.summary || 'Analysis complete.'}\n`);
          dataStream.writeData({ type: 'resolution_search_result', object: analysisResult as any });

          const relatedQueries = await querySuggestor(messagesForAnalysis);
          for await (const obj of relatedQueries.partialObjectStream) {
            dataStream.writeData({ type: 'related', object: obj as any })
          }

          await saveMessages(analysisResult.summary || 'Analysis complete.');
          return;
        }
      }

      const lastMessage = messages[messages.length - 1]
      const userInput = typeof lastMessage.content === 'string' ? lastMessage.content : ''

      // Handle special cases
      if (userInput.toLowerCase().trim() === 'what is a planet computer?' || userInput.toLowerCase().trim() === 'what is qcx-terra?') {
        const definition = userInput.toLowerCase().trim() === 'what is a planet computer?'
          ? `A planet computer is a proprietary environment aware system that interoperates weather forecasting, mapping and scheduling using cutting edge multi-agents to streamline automation and exploration on a planet. Available for our Pro and Enterprise customers. [QCX Pricing](https://www.queue.cx/#pricing)`
          : `QCX-Terra is a model garden of pixel level precision geospatial foundational models for efficient land feature predictions from satellite imagery. Available for our Pro and Enterprise customers. [QCX Pricing] (https://www.queue.cx/#pricing)`;

        dataStream.write(`0:${definition}\n`)
        await saveMessages(definition);
        return
      }

      const currentSystemPrompt = (await getSystemPrompt(userId)) || ''
      const mapProvider = (formData?.get('mapProvider') as 'mapbox' | 'google') || 'mapbox'

      // Task Manager
      const taskManagerResult = await taskManager(messages)
      if (taskManagerResult?.object.next === 'inquire') {
        const inquiryResult = await inquire(messages)
        let finalInquiry = '';
        for await (const obj of inquiryResult.partialObjectStream) {
          dataStream.writeData({ type: 'inquiry', object: obj as any })
          if (obj.question) finalInquiry = obj.question;
        }
        await saveMessages(`inquiry: ${finalInquiry}`);
        return
      }

      // Researcher
      const result = await researcher(currentSystemPrompt, messages, mapProvider)

      let fullResponse = ''
      for await (const delta of result.fullStream) {
        switch (delta.type) {
          case 'text-delta':
            if (delta.textDelta) {
              fullResponse += delta.textDelta
              dataStream.write(`0:${delta.textDelta}\n`)
            }
            break
          case 'tool-call':
            dataStream.writeData({ type: 'tool-call', toolCall: delta as any })
            break
          case 'tool-result':
            dataStream.writeData({ type: 'tool-result', toolResult: delta as any })
            break
        }
      }

      // Query Suggestor
      const relatedQueries = await querySuggestor(messages)
      for await (const obj of relatedQueries.partialObjectStream) {
         dataStream.writeData({ type: 'related', object: obj as any })
      }

      await saveMessages(fullResponse);
    },
    onError: (error) => {
      console.error('Data stream error:', error)
      return 'An error occurred.'
    }
  })
}

export async function clearChat() {
  // Implementation handled via clearChats in lib/actions/chat.ts
}
