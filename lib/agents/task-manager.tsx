import { CoreMessage, generateObject, LanguageModel } from 'ai'
import { nextActionSchema } from '../schema/next-action'
import { getModel } from '../utils'

// Decide whether inquiry is required for the user input
export async function taskManager(messages: CoreMessage[]) {
  try {
    // Check if the latest user message contains an image
    const lastUserMessage = messages.slice().reverse().find(m => m.role === 'user');
    if (lastUserMessage && Array.isArray(lastUserMessage.content)) {
      const hasImage = lastUserMessage.content.some(part => part.type === 'image');
      if (hasImage) {
        // If an image is present, bypass the logic and proceed directly
        return { object: { next: 'proceed' } };
      }
    }

    const { model, behavior } = getModel()
    const systemPrompt =
      behavior === 'aggressive'
        ? `As a planet computer, you are an aggressive and proactive AI assistant. Your primary objective is to fully comprehend the user's query, conduct thorough web searches, and use Geospatial tools to gather all necessary information to provide a comprehensive response. You should actively seek out opportunities to use your tools to enhance the user's experience.

- "proceed": If the user's query is clear and you are confident you can provide a complete answer with your tools, choose this option.
- "inquire": If the user's query is ambiguous or lacks detail, present a form to the user to gather the required information.

Your default behavior should be to "proceed" unless the query is exceptionally vague.`
        : `As a planet computer, you are a conservative and cautious AI assistant. Your primary objective is to fully comprehend the user's query and provide an accurate response. You should only use your tools when absolutely necessary to answer the user's question.

- "proceed": If the user's query can be answered directly with your existing knowledge, choose this option.
- "inquire": If you require additional information to answer the query, present a form to the user.

Your default behavior should be to "inquire" unless the query is exceptionally clear and specific.`

    const result = await generateObject({
      model: model as LanguageModel,
      system: systemPrompt,
      messages,
      schema: nextActionSchema
    })

    return result
  } catch (error) {
    console.error(error)
    return null
  }
}
