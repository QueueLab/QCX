'use server'

import { generateObject, LanguageModel } from 'ai'
import { getModel } from '../utils' // Assuming getModel is in lib/utils.ts
import { z } from 'zod'

// Define the schema for the enhanced prompt response
const EnhancedPromptSchema = z.object({
  enhancedPrompt: z.string()
})

// Define the schema for the new example prompts response
const NewExamplePromptsSchema = z.object({
  newPrompts: z.array(z.string())
})

/**
 * Enhances a given prompt using an AI model to be more verbose, specific, and contextual.
 *
 * @param currentPrompt The user's current prompt.
 * @returns A promise that resolves to the enhanced prompt string, or the original prompt if enhancement fails.
 */
export async function getEnhancedPrompt(
  currentPrompt: string
): Promise<string> {
  const systemMessage = `You are an AI assistant. Given the user's prompt, rewrite it to be more verbose, specific, and contextual, aiming to improve clarity and elicit a more comprehensive response. Return only the refined prompt as a JSON object with a single key 'enhancedPrompt'. User's prompt: "${currentPrompt}"`

  try {
    const { object } = await generateObject({
      model: getModel() as LanguageModel,
      system: systemMessage,
      schema: EnhancedPromptSchema
    })
    return object.enhancedPrompt
  } catch (error) {
    console.error('Error enhancing prompt:', error)
    return currentPrompt
  }
}

/**
 * Generates a list of new, diverse conversation starter prompts using an AI model,
 * ensuring they are different from the provided existing prompts.
 *
 * @param existingPrompts An array of strings representing the current example prompts.
 * @returns A promise that resolves to an array of new prompt strings, or an empty array if generation fails.
 */
export async function getNewExamplePrompts(
  existingPrompts: string[]
): Promise<string[]> {
  const systemMessage = `You are an AI assistant. Generate a list of 3 diverse, contextual conversation starter prompts. These prompts should be different from the following existing prompts: ${existingPrompts.join(', ')}. Return the new prompts as a JSON object with a single key 'newPrompts', which should be an array of strings, each a distinct prompt.`

  try {
    // console.log('Attempting to generate new example prompts.')
    // console.log('System message for AI:', systemMessage)

    const { object } = await generateObject({
      model: getModel() as LanguageModel,
      system: systemMessage,
      schema: NewExamplePromptsSchema
    })

    // console.log('Successfully received new prompts from AI:', object.newPrompts)
    return object.newPrompts
  } catch (error) {
    console.error('Error generating new example prompts:', error)
    // console.error('Failed to generate new example prompts. Existing prompts were:', existingPrompts.join(', '))
    return [] // Return an empty array if generation fails
  }
}
