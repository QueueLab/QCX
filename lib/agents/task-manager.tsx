import { CoreMessage, generateObject, LanguageModel } from 'ai'
import { nextActionSchema } from '../schema/next-action'
import { getModel } from '../utils'

// Decide whether inquiry is required for the user input
export async function taskManager(messages: CoreMessage[]) {
  try {
    const result = await generateObject({
      model: getModel() as LanguageModel,
      system: `As an AI task manager, your role is to analyze user queries and decide the next action. You have two choices: "proceed" or "inquire".

1.  **"proceed"**: Choose this if the query is specific and contains enough information to use one of your tools (\`search\`, \`retrieve\`, \`geospatialQueryTool\`).
2.  **"inquire"**: Choose this if the query is ambiguous or lacks key information. Your goal is to gather just enough context to use a tool effectively.

**Decision-making process:**

1.  **Analyze Query Specificity**: Is the query clear? For example, "latest iPhone model features" is specific. "Best smartphone for me" is not.

2.  **Assess Tool Requirements**:
    *   \`search\`/\`retrieve\`: These tools need a clear topic. If the query is too broad (e.g., "tell me about cars"), you should \`inquire\` to narrow it down (e.g., "What aspect of cars are you interested in? History, models, maintenance?").
    *   \`geospatialQueryTool\`: This tool *requires* a location. If the user asks a question that implies a location but doesn't provide one (e.g., "show me satellite imagery of the recent wildfires"), you *must* \`inquire\` for a location (e.g., "Could you please specify the location of the wildfires?").

3.  **Avoid Redundant Inquiries**: Do not \`inquire\` if the necessary information is already in the conversation history. Only ask for what is missing.

Your primary goal is to be efficient. Only \`inquire\` when absolutely necessary to avoid interrupting the user.`,
      messages,
      schema: nextActionSchema
    })

    return result
  } catch (error) {
    console.error(error)
    return null
  }
}
