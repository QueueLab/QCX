import { z } from "zod";
import mcpClient from "lib/utils/mcp-client";
import { ToolProps } from "."; // Assuming ToolProps is exported from index.tsx in the same directory
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

const nearbyParameters = z.object({
  location: z.string().describe("Center location for the search (address or 'latitude,longitude')"),
  query: z.string().describe("What to search for (e.g., 'restaurants', 'coffee shops', 'museums')"),
  radius: z.number().optional().default(1000).describe("Search radius in meters (default is 1000m)"),
  limit: z.number().optional().default(5).describe("Maximum number of results to return (default is 5)"),
});

export const mcpNearbyTool = ({ uiStream, fullResponse }: ToolProps) => ({
  description: "Search for nearby places or points of interest (e.g., restaurants, gas stations, ATMs) around a specific central location.",
  parameters: nearbyParameters,
  execute: async (params: z.infer<typeof nearbyParameters>) => {
    const { location, query, radius, limit } = params;
    let toolResponse;

    uiStream.append(
      <Card className="p-2 my-2 text-sm">
        <div className="flex items-center gap-2">
          <Spinner />
          <span>Searching for "{query}" near "{location}"...</span>
        </div>
      </Card>
    );

    try {
      const result = await mcpClient.tool("search_nearby_places", { location, query, radius, limit });
      let structuredData: any = null;
      let textualSummary = `Searched for "${query}" near "${location}".`;

      if (result.content && Array.isArray(result.content)) {
        const structuredDataContent = result.content.find(c => c.text?.includes("Structured Data:"));
        if (structuredDataContent && structuredDataContent.text) {
          try {
            const jsonString = structuredDataContent.text.substring(structuredDataContent.text.indexOf('```json') + 7, structuredDataContent.text.lastIndexOf('```'));
            structuredData = JSON.parse(jsonString); // This should contain the { places: [] }
            textualSummary = result.content.find(c => !c.text?.includes("Structured Data:"))?.text || textualSummary;
          } catch (e) {
            console.error("Error parsing structured data from nearby tool:", e);
            structuredData = result.content;
          }
        } else {
           textualSummary = result.content[0]?.text || textualSummary;
           structuredData = result.content;
        }
      } else {
        structuredData = result;
      }

      toolResponse = {
        summary: textualSummary,
        data: structuredData // Expected to be an object like { places: [ { name, address, latitude, longitude, mapUrl }, ... ] }
      };

      const numPlaces = structuredData?.places?.length || 0;
      uiStream.update(
        <Card className="p-2 my-2 text-sm">
          <span>✅ Found {numPlaces} places for "{query}" near "{location}". {textualSummary.substring(textualSummary.indexOf(':')+1)}</span>
        </Card>
      );

    } catch (error: any) {
      console.error("MCP search_nearby_places tool error:", error);
      toolResponse = { error: `Error searching for "${query}" near "${location}": ${error.message}` };
      uiStream.update(
        <Card className="p-2 my-2 text-sm bg-red-100 text-red-700">
          <span>Error searching nearby places: {error.message}</span>
        </Card>
      );
    }
    return toolResponse;
  },
});
