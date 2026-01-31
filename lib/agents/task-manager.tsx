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
      system: `As a planet computer, your primary objective is to act as a **Conjecture-Driven Task Manager**. Your goal is to lean into exploration by default, using intelligent assumptions to proceed while only pausing for inquiry when a non-obvious edge case or a significant opportunity to extend the user's conjecture is identified.

      You must analyze the user's input and determine whether to proceed with immediate exploration or to pause for a value-added inquiry.

      **Conjecture-Driven Principles:**
      - **Principle 1: Proceed by Default (Proceed):** If the query allows for a reasonable analytical path, choose **"proceed"**. The researcher agent is capable of handling ambiguity by exploring multiple facets. Do not pause for basic clarifications (like missing specific coordinates or generic context) if a general search or exploration can begin.
      - **Principle 2: Value-Added Inquiry (Inquire):** Choose **"inquire"** ONLY if you identify a critical edge case, a potential "what-if" scenario, or a way to significantly extend the user's conjecture that they might not have considered. The goal is to deepen the conversation, not just clear up ambiguity.

      **Options:**
      1. **"proceed"**: Default action. Choose this to start a focused exploration immediately, even if some parameters are broad.
      2. **"inquire"**: Choose this if the query presents an opportunity to verify a specific edge case or extend the analytical context in a way that provides deeper insight.

      **Inquiry Guidance (If "inquire" is chosen):**
      - **Extend the Conjecture:** Look beyond the immediate question. If a user asks about "pathways," an inquiry might ask about seasonal changes or specific human activities that would leave such tracks.
      - **Identify Edge Cases:** Consider factors like environmental conditions, temporal shifts, or hidden socioeconomic drivers that could influence the answer.

      **Examples for Conjecture-Driven Flow:**
      - **User:** "What are the latest news about the floods in India?" -> **Action:** "proceed" (Immediate exploration).
      - **User:** "What's the warmest temperature in my area?" -> **Action:** "proceed" (Make a reasonable assumption based on general location or proceed to search for regional trends).
      - **User:** "Show me the nearest park." -> **Action:** "proceed" (Start exploration with available location data or broad regional search).
      - **User:** "Tell me about those pathways in the Niger Delta." -> **Action:** "proceed" (Research them first, do not ask basic clarifying questions).
      - **User:** "Is this area prone to flooding?" -> **Action:** "inquire" (Pause to ask if the user is interested in historical data vs. future climate projections, or specific seasonal peaks).

      Be bold in proceeding. Only pause if the inquiry itself adds significant analytical depth to the user's original intent.
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
