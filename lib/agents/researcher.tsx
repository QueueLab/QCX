import { createStreamableUI, createStreamableValue } from 'ai/rsc'
import {
  CoreMessage,
  LanguageModel,
  ToolCallPart,
  ToolResultPart,
  streamText as nonexperimental_streamText
} from 'ai'
import { Section } from '@/components/section'
import { BotMessage } from '@/components/message'
import { getTools } from './tools'
import { getModel } from '../utils'
import {
  formatGeographicalContext,
  type GeographicalContextData,
  formatExperienceIntegration,
  type ExperienceIntegrationData,
  assembleEnvironmentalIntelligencePrompt
} from '../prompts/planetary-copilot'

export async function researcher(
  uiStream: ReturnType<typeof createStreamableUI>,
  streamText: ReturnType<typeof createStreamableValue<string>>,
  messages: CoreMessage[],
  useSpecificModel?: boolean
) {
  let fullResponse = ''
  let hasError = false
  const answerSection = (
    <Section title="response">
      <BotMessage content={streamText.value} />
    </Section>
  )

  // Data for dynamic prompt parts
  const mockGeoData: GeographicalContextData = {
    LOCATION_DESCRIPTION: "Valley near Olympus Mons, Mars",
    TERRAIN_FEATURES: "Rocky terrain, some sand dunes, evidence of ancient lava flows",
    CLIMATE_CLASSIFICATION: "Cold desert climate",
    SEASONAL_FACTORS: "Dust storm season approaching, moderate solar radiation"
  };

  const mockExperienceData: ExperienceIntegrationData = {
    PROVEN_APPROACHES: "Spiral search pattern for sample collection, prioritizing areas with hydrated minerals.",
    KNOWN_OBSTACLES: "Steep inclines (>20 degrees) pose traversal challenges; fine dust can clog sensor intakes if not managed.",
    IMPROVEMENT_AREAS: "Optimize power usage during long-duration observations; improve data transmission bandwidth from remote sites."
  };

  // Assemble the full system prompt using the centralized function
  const systemPrompt = assembleEnvironmentalIntelligencePrompt(mockGeoData, mockExperienceData);

  const result = await nonexperimental_streamText({
    model: getModel() as LanguageModel,
    maxTokens: 2500,
    system: systemPrompt,
    messages,
    tools: getTools({
      uiStream,
      fullResponse
    })
  })

  // Remove the spinner
  uiStream.update(null)

  // Process the response
  const toolCalls: ToolCallPart[] = []
  const toolResponses: ToolResultPart[] = []
  for await (const delta of result.fullStream) {
    switch (delta.type) {
      case 'text-delta':
        if (delta.textDelta) {
          // If the first text delta is available, add a UI section
          if (fullResponse.length === 0 && delta.textDelta.length > 0) {
            // Update the UI
            uiStream.update(answerSection)
          }

          fullResponse += delta.textDelta
          streamText.update(fullResponse)
        }
        break
      case 'tool-call':
        toolCalls.push(delta)
        break
      case 'tool-result':
        // Append the answer section if the specific model is not used
        if (!useSpecificModel && toolResponses.length === 0 && delta.result) {
          uiStream.append(answerSection)
        }
        if (!delta.result) {
          hasError = true
        }
        toolResponses.push(delta)
        break
      case 'error':
        hasError = true
        fullResponse += `\nError occurred while executing the tool`
        break
      case 'reasoning':
        // Assuming delta.value contains the reasoning content as a string
        if (typeof delta.value === 'string') {
          fullResponse += delta.value
          streamText.update(fullResponse)
        }
        break
    }
  }
  messages.push({
    role: 'assistant',
    content: [{ type: 'text', text: fullResponse }, ...toolCalls]
  })

  if (toolResponses.length > 0) {
    // Add tool responses to the messages
    messages.push({ role: 'tool', content: toolResponses })
  }

  return { result, fullResponse, hasError, toolResponses }
}
