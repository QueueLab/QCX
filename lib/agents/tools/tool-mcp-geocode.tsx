import { z } from "zod";
import mcpClient from "../../utils/mcp-client"; // Corrected path
import { ToolProps } from ".";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

const geocodeParameters = z.object({
  query: z.string().describe("Address, place name, or location to geocode"),
  includeMapPreview: z.boolean().optional().default(true).describe("Include map preview URL in the response"),
});

export const mcpGeocodeTool = ({ uiStream, fullResponse }: ToolProps) => ({
  description: "Geocode an address or place name to get its coordinates and optionally a map preview URL. Use this to find the specific geographic location of a place mentioned.",
  parameters: geocodeParameters,
  execute: async (params: z.infer<typeof geocodeParameters>) => {
    const { query, includeMapPreview } = params;
    let toolResponse;

    uiStream.append(
      <Card className="p-2 my-2 text-sm">
        <div className="flex items-center gap-2">
          <Spinner />
          <span>Geocoding "{query}"...</span>
        </div>
      </Card>
    );

    try {
      const result = await mcpClient.tool("geocode_location", { query, includeMapPreview });

      let structuredData: any = null;
      let textualSummary = `Geocoded "${query}".`;

      if (result.content && Array.isArray(result.content)) {
        const structuredDataContent = result.content.find(c => c.text?.includes("Structured Data:"));
        if (structuredDataContent && structuredDataContent.text) {
          try {
            const jsonString = structuredDataContent.text.substring(structuredDataContent.text.indexOf('```json') + 7, structuredDataContent.text.lastIndexOf('```'));
            structuredData = JSON.parse(jsonString);
            textualSummary = result.content.find(c => !c.text?.includes("Structured Data:"))?.text || textualSummary;
          } catch (e) {
            console.error("Error parsing structured data from geocode tool:", e);
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
        data: structuredData
      };

      uiStream.update(
        <Card className="p-2 my-2 text-sm">
          <span>✅ Geocoded "{query}": {textualSummary}</span>
        </Card>
      );

    } catch (error: any) {
      console.error("MCP geocode_location tool error:", error);
      toolResponse = { error: `Error geocoding "${query}": ${error.message}` };
      uiStream.update(
        <Card className="p-2 my-2 text-sm bg-red-100 text-red-700">
          <span>Error geocoding "{query}": {error.message}</span>
        </Card>
      );
    }
    return toolResponse;
  },
});
