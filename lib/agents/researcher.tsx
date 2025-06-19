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

export async function researcher(
  dynamicSystemPrompt: string, // New parameter
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
  );

  let currentUserLocationForTools: import('./tools').UserLocation | undefined = undefined;
  if (messages.length > 0) {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === 'user' && typeof lastMessage.content === 'string') {
      const content = lastMessage.content;
      // Check if this message is the one indicating location was granted
      // Example content: "The user's current location has been determined: Latitude 37.7749, Longitude -122.4194. ..."
      if (content.startsWith("The user's current location has been determined:")) {
        const latMatch = content.match(/Latitude\s+([\d.-]+)/);
        const lonMatch = content.match(/Longitude\s+([\d.-]+)/);
        // A more robust extraction for place_name would be needed if it's included in the message.
        // For now, let's assume a fixed place_name if lat/lon are found, or derive it if available.
        // The simulated message currently doesn't include a place_name.
        // Let's hardcode one for San Francisco for now if coords match.
        if (latMatch && lonMatch) {
          const lat = parseFloat(latMatch[1]);
          const lon = parseFloat(lonMatch[1]);
          currentUserLocationForTools = { latitude: lat, longitude: lon };
          if (lat === 37.7749 && lon === -122.4194) {
            currentUserLocationForTools.place_name = "San Francisco, CA";
          }
           console.log("[Researcher] Extracted currentUserLocationForTools:", currentUserLocationForTools);
        }
      }
    }
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  const currentDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  // Default system prompt, used if dynamicSystemPrompt is not provided
  const default_system_prompt = `As a comprehensive AI assistant, you can search the web, retrieve information from URLs, and understand geospatial queries to assist the user and display information on a map.
Current date and time: ${currentDate}. You can use this information directly to answer questions about the current time or date.

Tool Usage Guide:
- For general web searches for factual information: Use the 'search' tool.
- For retrieving content from specific URLs provided by the user: Use the 'retrieve' tool. (Do not use this for URLs found in search results).
- **For any questions involving locations, places, addresses, geographical features, finding businesses or points of interest, distances between locations, or directions: You MUST use the 'geospatialQueryTool'. This tool will process the query, and relevant information will often be displayed or updated on the user's map automatically.**
  Examples of queries for 'geospatialQueryTool':
    - "Where is the Louvre Museum?"
    - "Show me cafes near the current map center."
    - "How far is it from New York City to Los Angeles?"
    - "What are some parks in San Francisco?"
  When you use 'geospatialQueryTool', you don't need to describe how the map will change; simply provide your textual answer based on the query, and trust the map will update appropriately. If the user's location has been provided in a recent message (e.g., "User's current location is..."), feel free to use that context to make your geospatial queries more relevant if the original request implied it (e.g. "restaurants near me").
- **For queries that require the user's current location to answer (e.g., "restaurants near me", "weather here", "directions from my current location"): You MUST use the 'request_user_location_tool'.**
  - Provide a clear \`reason_for_request\` in the tool call, ideally quoting or summarizing the part of the user's query that necessitates knowing their location. For example, if the user asks "Show me coffee shops near me", the reason could be "to find coffee shops near the user's current location".
  - **Lifecycle after calling \`request_user_location_tool\`**:
    - The system will attempt to get the user's location.
    - You will then receive a new user message. This message will either:
      1. Provide the user's location (e.g., "User's current location is Latitude X, Longitude Y. Original query was Z" or "User's current location is [Place Name]. Original query was Z"). If you receive this, use the provided location details to answer the original query. You can use this location with other tools like \`geospatialQueryTool\` or \`search\` as appropriate;
      2. State that location permission was denied or the location is unavailable (e.g., "User's location permission was denied..."). If you receive this, politely inform the end-user that you cannot fulfill their location-specific request without their location. Do not ask for their location again for this specific query. You may suggest they can ask again if they choose to provide location, or ask for a location-agnostic query.
  - Do not try to guess the user's location. Always use \`request_user_location_tool\` if their current location is implied by the query and not already provided.
- For the \`search\` tool: If the user's location is known (because it was provided in a recent message), the system will automatically augment your search query with this location if it seems relevant. You do not need to add location details to your \`search\` tool queries; just provide the core search terms.

Always aim to directly address the user's question. If using information from a tool (like web search), cite the source URL.
Match the language of your response to the user's language.`;

     const systemToUse = dynamicSystemPrompt && dynamicSystemPrompt.trim() !== '' ? dynamicSystemPrompt : default_system_prompt;

     const result = await nonexperimental_streamText({
       model: getModel() as LanguageModel,
       maxTokens: 2500,
       system: systemToUse, // Use the dynamic or default system prompt
       messages,
       tools: getTools({
          uiStream,
          fullResponse,
          currentUserLocation: currentUserLocationForTools // Pass it here
    })
  })

  // Remove the spinner
  uiStream.update(null)

  // Process the response
  const toolCalls: ToolCallPart[] = []
  const toolResponses: ToolResultPart[] = []

  // Store the original user query. This assumes the last message is the user's.
  // More robust logic might be needed if the conversation flow is complex.
  let originalUserQuery = "User's original query could not be determined";
  if (messages.length > 0) {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === 'user' && typeof lastMessage.content === 'string') {
      originalUserQuery = lastMessage.content;
    } else if (lastMessage.role === 'user' && Array.isArray(lastMessage.content)) {
      // Handle cases where user content might be an array (e.g. text + images)
      const textContent = lastMessage.content.find(part => part.type === 'text');
      if (textContent && typeof textContent.text === 'string') {
        originalUserQuery = textContent.text;
      }
    }
  }

  let locationRequestContext: { reason: string; toolCallId: string | null } | null = null;

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
      case 'tool-call': {
        if (delta.toolName === 'request_user_location_tool') {
          // This is our special tool call, handle it directly.
          console.log('Detected request_user_location_tool call:', delta);
          try {
            const args = delta.args as { reason_for_request: string };
            locationRequestContext = { reason: args.reason_for_request, toolCallId: delta.toolCallId };
            console.log(`SIMULATING: UI should now request location permission due to: ${args.reason_for_request}`);

            // Simulate UI flow and getting permission.
            // In a real app, this would involve awaiting an actual UI interaction.
            // For now, this entire block (simulating permission and re-engaging LLM)
            // would ideally be lifted out of the delta loop or handled after the loop,
            // because we need to stop processing current LLM response and start a new one.
            // However, for this subtask, we'll simulate the immediate re-engagement.

            // This simulation will be handled *after* the current stream is processed.
            // We just record the tool call here.
            toolCalls.push(delta); // Still record it for now, though it won't be "executed" traditionally.

          } catch (e) {
            console.error("Error processing request_user_location_tool args:", e);
            // Decide how to handle malformed args for this special tool
            // Maybe push an error back to the LLM or a generic tool_result error.
             const errorResult: ToolResultPart = {
              type: 'tool-result',
              toolCallId: delta.toolCallId,
              toolName: delta.toolName,
              result: { error: "Invalid arguments for request_user_location_tool" }
            };
            toolResponses.push(errorResult);
            // Potentially add this to messages and re-engage LLM if needed.
          }
        } else {
          // Regular tool call, add to list for execution later
          toolCalls.push(delta);
        }
        break;
      }
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
    }
  }
  messages.push({
    role: 'assistant',
    content: [{ type: 'text', text: fullResponse }, ...toolCalls.filter(tc => tc.toolName !== 'request_user_location_tool')]
    // We filter out the location request tool call from being sent back with results if it was handled internally
  });

  if (toolResponses.length > 0) {
    messages.push({ role: 'tool', content: toolResponses });
  }

  // === Add holding message if necessary before simulated location flow ===
  if (locationRequestContext && fullResponse.trim() === '') {
    let holdingMessage = "Your request is being processed, and I may need to confirm location preferences. Please wait a moment.";

    fullResponse = holdingMessage;
    streamText.update(fullResponse);

    // Ensure the answerSection is displayed with this holding message.
    // The initial answerSection was defined with streamText.value, which has now been updated.
    // Re-creating it ensures the BotMessage component gets the latest streamText.value.
    const currentAnswerSection = (
      <Section title="response">
        <BotMessage content={streamText.value} />
      </Section>
    );
    // uiStream.update is called when the first text-delta normally arrives.
    // If fullResponse was empty, that call might not have happened or was with an empty value.
    // Calling it here ensures the section with the holding message is rendered.
    uiStream.update(currentAnswerSection);
  }

  // === Handling of simulated location request AFTER processing the stream ===
  if (locationRequestContext) {
    console.log("Processing simulated location request flow for:", locationRequestContext.reason);
    // Simulate permission outcome (50/50 chance)
    const permissionGranted = Math.random() > 0.5;
    let followUpMessages: CoreMessage[] = [...messages]; // Copy current messages

    // Find the assistant message that contained the tool call and remove the tool call part
    // as we are "fulfilling" it now with a new user message.
    const lastAssistantMessageIndex = messages.map(m => m.role).lastIndexOf('assistant');
    if (lastAssistantMessageIndex !== -1) {
        const assistantMessage = messages[lastAssistantMessageIndex];
        // Ensure content is an array before trying to filter it.
        if (typeof assistantMessage.content === 'object' && Array.isArray(assistantMessage.content)) {
            // Filter out the specific tool call part
            const newContent = assistantMessage.content.filter(part => {
                if (part.type === 'tool-call' && part.toolCallId === locationRequestContext?.toolCallId) {
                    return false; // Remove this part
                }
                return true;
            }) as Exclude<CoreMessage['content'], string>; // Assert that newContent is an array of parts

            assistantMessage.content = newContent;
        }
        // If assistantMessage.content is a string, no filtering of tool call parts is needed.
    }


    if (permissionGranted) {
      const simulatedCoords = { lat: 37.7749, lon: -122.4194 }; // San Francisco
      console.log(`SIMULATION: Location permission GRANTED. Coords: ${JSON.stringify(simulatedCoords)}`);
      const locationMessage: CoreMessage = {
        role: 'user',
        content: `The user's current location has been determined: Latitude ${simulatedCoords.lat}, Longitude ${simulatedCoords.lon}. The reason for this request was: "${locationRequestContext.reason}". Please use this information to respond to the user's original query: "${originalUserQuery}".`
      };
      // Modify the messages array passed into the function directly
      messages.push(locationMessage);
    } else {
      console.log("SIMULATION: Location permission DENIED.");
      const denialMessage: CoreMessage = {
        role: 'user',
        content: `The user's location permission was denied or unavailable. The reason for the request was: "${locationRequestContext.reason}". Please inform the user you cannot proceed with the location-specific part of their query: "${originalUserQuery}".`
      };
      // Modify the messages array passed into the function directly
      messages.push(denialMessage);
    }

    // The 'messages' array parameter is directly mutated by pushing locationMessage or denialMessage.
    console.log("SIMULATION: LLM would be re-engaged with the updated 'messages' array by the calling context.");

    const finalToolCalls = toolCalls.filter(tc => tc.toolName !== 'request_user_location_tool' || tc.toolCallId !== locationRequestContext?.toolCallId);
    const finalToolResponses = toolResponses.filter(tr => tr.toolName !== 'request_user_location_tool' || tr.toolCallId !== locationRequestContext?.toolCallId);

    // Important: The 'fullResponse' from the current LLM interaction (which triggered the location request)
    // is likely not the final response the user should see. The calling context needs to handle the re-engagement.
    return { result, fullResponse, hasError, toolResponses: finalToolResponses, toolCalls: finalToolCalls, messages };
  }

  return { result, fullResponse, hasError, toolResponses, toolCalls, messages };
}
