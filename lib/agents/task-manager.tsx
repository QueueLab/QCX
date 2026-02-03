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
      model: (await getModel()) as LanguageModel,
      system: `As a planet computer, your primary objective is to act as an efficient **Task Manager** for the user's query. Your goal is to minimize unnecessary steps and maximize the efficiency of the subsequent exploration phase (researcher agent).

	    You must first analyze the user's input and determine the optimal course of action. You have two options at your disposal:

	    **Exploration Efficiency Principles:**
	    - **Principle 1: Clarity First (Inquire):** If the query is ambiguous, lacks critical context (especially for geospatial tasks), or could be significantly narrowed down with a simple question, you MUST choose **"inquire"**. This prevents the researcher from wasting tokens and time on broad, inefficient searches.
	    - **Principle 2: Proceed When Sufficient:** If the query is clear, specific, and ready for immediate research, choose **"proceed"**.

	    **Options:**
	    1. **"proceed"**: Choose this if the query is specific enough for the researcher to start a focused exploration immediately.
	    2. **"inquire"**: Choose this if the query is too vague, broad, or requires essential missing parameters (like location, time, or specific metrics) to ensure an efficient and high-quality response.

	    **Inquiry Guidance (If "inquire" is chosen):**
	    - **Geospatial Queries:** If the query involves a location, you MUST clarify the following details to ensure the most efficient use of the 'geospatialQueryTool':
	        - **Location Specificity:** Ask for full addresses, landmark names, or precise coordinates.
	        - **Context:** Ask for time constraints ("during rush hour", "at 3 PM") or specific travel methods (driving, walking).
	        - **Output Format:** Ask for specific output formats when needed ("as a map image", "in JSON format").

	    **Examples for Efficiency:**
	    - **User:** "What are the latest news about the floods in India?" -> **Action:** "proceed" (Clear, ready for web search).
	    - **User:** "What's the warmest temperature in my area?" -> **Action:** "inquire" (Missing location and preferred metric).
	    - **User:** "Show me the nearest park." -> **Action:** "inquire" (Missing current location).
	    - **User:** "Tell me about the new AI model." -> **Action:** "inquire" (Too broad; ask for the model name or specific aspect).

	    Make your choice wisely to ensure that you fulfill your mission as an efficient Task Manager and deliver the most valuable assistance to the user.

    `,
      messages,
      schema: nextActionSchema
    })

    return result
  } catch (error) {
    console.error(error)
    return null
  }
}
