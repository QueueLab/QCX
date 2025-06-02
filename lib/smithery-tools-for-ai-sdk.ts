import {
  smitheryClient,
  connectSmithery,
  getSmitheryToolSchemas,
  smitheryParamsToZod,
  type SmitheryToolSchema
} from './smithery-client';
import { ToolDefinition } from 'ai';
import { z } from 'zod';

export async function getAdaptedSmitheryTools(): Promise<Record<string, ToolDefinition<any, any>>> {
  const adaptedTools: Record<string, ToolDefinition<any, any>> = {};

  try {
    const smitherySchemas = await getSmitheryToolSchemas();

    for (const toolName in smitherySchemas) {
      const schema: SmitheryToolSchema = smitherySchemas[toolName];

      // Convert Smithery parameters to Zod schema
      const zodSchema = smitheryParamsToZod(schema.parameters);

      adaptedTools[toolName] = {
        description: schema.description,
        parameters: zodSchema,
        execute: async (args: z.infer<typeof zodSchema>) => {
          try {
            await connectSmithery(); // Ensure client is connected

            // ASSUMPTION: smitheryClient.call('tool_name', args) is the method to execute tools.
            // This needs to be verified with the actual @modelcontextprotocol/sdk Client API.
            console.log(`Executing Smithery tool "${toolName}" with args:`, args);
            const result = await smitheryClient.call(toolName, args);
            console.log(`Smithery tool "${toolName}" result:`, result);

            // The 'result' structure from smitheryClient.call() is unknown.
            // It might be a simple JSON object, or it could be more complex,
            // possibly including streaming parts if the tool itself streams.
            // For now, directly return it. The calling LLM/agent will need to handle this structure.
            return result;
          } catch (error) {
            console.error(`Error executing Smithery tool "${toolName}":`, error);
            // Return a structured error that the AI SDK can potentially understand or display
            return {
              error: `Failed to execute Smithery tool "${toolName}".`,
              details: error instanceof Error ? error.message : String(error)
            };
          }
        }
      };
    }
  } catch (error) {
    console.error("Error adapting Smithery tools for AI SDK:", error);
    // If adaptation fails, it might be better to throw or return an empty set of tools,
    // depending on how critical these tools are.
    // For now, returning empty so the app might proceed without them if designed to do so.
  }

  if (Object.keys(adaptedTools).length === 0) {
    console.warn("No Smithery tools were adapted. Check schema fetching and adaptation process.");
  }

  return adaptedTools;
}

// Example of how one might use this:
// async function main() {
//   const tools = await getAdaptedSmitheryTools();
//   if (tools.geocode_location) {
//     console.log("Geocode tool is available:", tools.geocode_location.description);
//     // Example execution (would typically be done by the AI SDK):
//     // const result = await tools.geocode_location.execute({ query: "Eiffel Tower" });
//     // console.log(result);
//   }
// }
// main();
