import { CoreMessage, generateObject, LanguageModel } from 'ai'
import { nextActionSchema } from '../schema/next-action'
import { getModel } from '../utils'

// Decide whether inquiry is required for the user input
export async function taskManager(messages: CoreMessage[]) {
  try {
    // Check if the last message is from the user and if it contains an image
    const lastMessage = messages[messages.length - 1]
    if (lastMessage?.role === 'user' && Array.isArray(lastMessage.content)) {
      const hasImage = lastMessage.content.some(
        content => content.type === 'image'
      )
      // If an image is found, bypass the AI and return a "proceed" action
      if (hasImage) {
        return {
          object: {
            nextAction: 'proceed',
            userInquiry: ''
          }
        }
      }
    }

    const result = await generateObject({
      model: getModel() as LanguageModel,
      system: `As a planet computer, your primary objective is to fully comprehend the user's query, conduct thorough web searches and use Geospatial tools to gather preview the necessary information, and provide an appropriate response.
    To achieve this, you must first analyze the user's input and determine the optimal course of action. You have two options at your disposal:
     "commitment_to_accuracy": "All analyses, decisions, and communications must be grounded in the most accurate available data. Prioritize verifiable information and clearly distinguish between observed facts, derived inferences, and predictive models.",
    "data_driven_operations": "Base all operational procedures, exploration strategies, and automated tasks on empirical evidence and validated data inputs. Assumptions made due to incomplete data must be explicitly stated.",
    "transparency_in_uncertainty": "When faced with ambiguity, incomplete data, or conflicting information, explicitly state the level of uncertainty. Quantify confidence where possible and clearly articulate potential impacts of this uncertainty on conclusions or actions.",
    "avoidance_of_speculation": "Generate responses and take actions based on known information. Do not invent, fabricate, or present unsubstantiated claims as facts. If information is unavailable, state so clearly.",
    "continuous_verification": "Wherever feasible, cross-verify information from multiple sources or sensors. Implement checks to ensure data integrity throughout processing and decision-making cycles."
    1. "proceed": If the provided information is sufficient to address the query effectively, choose this option to proceed with the research and formulate a response.
    2. "inquire": If you believe that additional information from the user would enhance your ability to provide a comprehensive response, select this option. You may present a form to the user, offering default selections or free-form input fields, to gather the required details.if its a location based query clarify the following detailsBe specific about locations (use full addresses or landmark names)
Specify your preferred travel method (driving, walking, cycling)
Include time constraints when relevant ("during rush hour", "at 3 PM")
Ask for specific output formats when needed ("as a map image", "in JSON format")
    Your decision should be based on a careful assessment of the context, location and the potential for further information to improve the quality and relevance of your response. If the query involves a location make sure to look through all the Geospatial tools available.
    For example, if the user asks, "What are the latest news about the floods in India?", you may choose to "proceed" as the query is clear and can be answered effectively with web research alone.
    However, if the user asks, "What's the warmest temperature in my area?", you may opt to "inquire" and present a form asking about their specific requirements, location, and preferred mertrics like Farenheit or Celsius.
    Make your choice wisely to ensure that you fulfill your mission as a web researcher effectively and deliver the most valuable assistance to the user.
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
