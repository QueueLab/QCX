import { createStreamableUI, createStreamableValue } from 'ai/rsc'
import {
  CoreMessage,
  LanguageModel,
  ToolCallPart,
  ToolResultPart,
  streamText as nonexperimental_streamText,
  tool
} from 'ai'
import { Section } from '@/components/section'
// Note: 'tool' import from 'ai' might not be necessary if ToolResultPart covers it.
// Will proceed with ToolResultPart as per existing code.
import { BotMessage } from '@/components/message'
import { getTools } from './tools'
import { getModel } from '../utils'

export async function researcher(
  uiStream: ReturnType<typeof createStreamableUI>,
  streamText: ReturnType<typeof createStreamableValue<string>>,
  messages: CoreMessage[],
  useSpecificModel?: boolean
): Promise<{
  result: any; // Keeping original type for result, though it's 'StreamTextResult'
  fullResponse: string;
  hasError: boolean;
  toolResponses: ToolResultPart[];
  mapDataFromGeospatialTool: any | null; // Added for geospatial tool output
}> {
  let fullResponse = ''
  let hasError = false
  let mapDataFromGeospatialTool: any = null; // Initialize mapData

  const answerSection = (
    <Section title="response">
      <BotMessage content={streamText.value} />
    </Section>
  )

  const currentDate = new Date().toLocaleString()
  const systemPrompt = `As a professional search expert, you possess the ability to search for any information on the web.
    For each user query, utilize the search results to their fullest potential to provide additional information and assistance in your response.
    If there are any images relevant to your answer, be sure to include them as well.
    Aim to directly address the user's question, augmenting your response with insights gleaned from the search results.
    Whenever quoting or referencing information from a specific URL, always cite the source URL explicitly.
    The retrieve tool can only be used with URLs provided by the user. URLs from search results cannot be used.
    You also have a 'geospatial' tool that can understand location-based queries, find places, calculate distances, and provide map data. Use it when questions involve geography, addresses, navigation, or proximity. If you use the geospatial tool, integrate its textual findings into your main response.
    Please match the language of the response to the user's language. Current date and time: ${currentDate}`;

  const result = await nonexperimental_streamText({
    model: getModel() as LanguageModel,
    maxTokens: 2500,
    system: systemPrompt,
    messages,
    tools: getTools({
      uiStream,
      fullResponse // Pass the accumulating fullResponse here if tools need it, though geospatialTool is self-contained.
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

        // Extract mapData if the result is from geospatialTool
        if (delta.toolName === 'geospatial' && delta.result) {
          const geospatialOutput = delta.result as any; // Output from geospatialTool.execute
          if (geospatialOutput.mapData) {
            mapDataFromGeospatialTool = geospatialOutput.mapData;
            console.log("Researcher: Extracted mapData from geospatialTool:", mapDataFromGeospatialTool);
          }
          if (geospatialOutput.error) {
            console.error("Researcher: Error from geospatialTool execution:", geospatialOutput.error);
            // Optionally append a note about the tool error to fullResponse or handle as needed
          }
          // The geospatialOutput.textResponse is the tool's own summary/text.
          // The main LLM (getModel) is expected to synthesize this into its own response.
        }
        break
      case 'error':
        hasError = true
        fullResponse += `\nError occurred while executing the tool` // Or handle error more gracefully
        console.error("Error in stream delta:", delta.error);
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

  return { result, fullResponse, hasError, toolResponses, mapDataFromGeospatialTool }
}
