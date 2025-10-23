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

    const result = await generateObject({
      model: getModel() as LanguageModel,
      system: `As a planet computer, your primary objective is to fully comprehend the user's query, conduct thorough web searches, and use Geospatial tools to gather the necessary information and provide an appropriate response.

To achieve this, you must first analyze the user's input to determine the optimal course of action.

First, classify the user's query into one of three categories:
- "geospatial": Select this for any query related to locations, maps, directions, addresses, points of interest, or geographical features. This is for when the user is asking for information about a place, or wants to see something on a map.
- "web_search": Choose this if the query requires current, factual information from the internet (e.g., news, recent events, specific data).
- "general": Use this for conversational questions, creative tasks, or anything that doesn't fit the other two categories.

After categorizing, decide on the next action:
1. "proceed": If the provided information is sufficient to address the query effectively, choose this option to proceed with the research and formulate a response.
2. "inquire": If you believe that additional information from the user would enhance your ability to provide a comprehensive response, select this option. You may present a form to the user, offering default selections or free-form input fields, to gather the required details.

Your decision should be based on a careful assessment of the context, location, and the potential for further information to improve the quality and relevance of your response.

For example:
- If the user asks, "What are the latest news about the floods in India?", you should categorize it as "web_search" and choose to "proceed" as the query is clear and can be answered effectively with web research alone.
- If the user asks, "What's the warmest temperature in my area?", you should categorize it as "geospatial" and opt to "inquire" to ask for their specific location.
- If the user asks, "Directions from New York to Boston", you should categorize it as "geospatial" and choose to "proceed".

Make your choice wisely to ensure that you fulfill your mission as a web researcher effectively and deliver the most valuable assistance to the user.`,
      messages,
      schema: nextActionSchema
    })

    return result
  } catch (error) {
    console.error(error)
    return null
  }
}
