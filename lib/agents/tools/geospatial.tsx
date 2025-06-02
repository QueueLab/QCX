import { createStreamableValue } from 'ai/rsc'; // Not strictly needed for this tool's server part, but good for consistency
import { BotMessage } from '@/components/message'; // For UI feedback
import { geospatialQuerySchema } from '@/lib/schema/geospatial';
import { ToolProps } from '.'; // Assuming ToolProps is exported from './index.tsx'

export const geospatialTool = ({ uiStream, fullResponse }: ToolProps) => ({
  description: `Use this tool for any queries that involve locations, places, addresses, distances between places, directions, or finding points of interest on a map. This includes questions like:
- 'Where is [place name/address]?'
- 'Show me [place name/address] on the map.'
- 'What's the latitude and longitude of [place name]?'
- 'How far is it from [location A] to [location B]?'
- 'Give me directions from [location A] to [location B].'
- 'Find cafes near [current location/specified location].'
- 'What's around the [specific landmark]?'
- Any query that implies needing a map or spatial understanding.`,
  parameters: geospatialQuerySchema,
  execute: async ({ query }: { query: string }) => {
         // Provide immediate UI feedback by creating a streamable value for the message.
         const uiFeedbackStream = createStreamableValue<string>();
         // Set the content of the stream and mark it as done.
         uiFeedbackStream.done(`Looking up map information for: "${query}"...`); 
         // Append the BotMessage component with the streamable value to the UI stream.
         uiStream.append(<BotMessage content={uiFeedbackStream.value} />);

    // Return a marker object for client-side processing
         // This object signals the client to handle the map query, potentially by displaying a map component.
    return {
      type: "MAP_QUERY_TRIGGER", // Custom type to identify this tool's specific output
           originalUserInput: query, // The original query that triggered this tool
           timestamp: new Date().toISOString() // Timestamp of when the tool was executed
    };
  }
});
