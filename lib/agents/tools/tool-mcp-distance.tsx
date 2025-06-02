import { z } from "zod";
import mcpClient from "../../utils/mcp-client"; // Corrected path
import { ToolProps } from ".";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

const distanceParameters = z.object({
  from: z.string().describe("Starting location (address or 'latitude,longitude')"),
  to: z.string().describe("Destination location (address or 'latitude,longitude')"),
  profile: z.enum(["driving", "walking", "cycling"]).optional().default("driving").describe("Travel mode: driving, walking, or cycling"),
  includeRouteMap: z.boolean().optional().default(true).describe("Include a route map preview URL in the response"),
});

export const mcpDistanceTool = ({ uiStream, fullResponse }: ToolProps) => ({
  description: "Calculate the distance and travel time between two locations for driving, walking, or cycling. Optionally includes a route map preview.",
  parameters: distanceParameters,
  execute: async (params: z.infer<typeof distanceParameters>) => {
    const { from, to, profile, includeRouteMap } = params;
    let toolResponse;

    uiStream.append(
      <Card className="p-2 my-2 text-sm">
        <div className="flex items-center gap-2">
          <Spinner />
          <span>Calculating route from "{from}" to "{to}"...</span>
        </div>
      </Card>
    );

    try {
      const result = await mcpClient.tool("calculate_distance", { from, to, profile, includeRouteMap });
      let structuredData: any = null;
      let textualSummary = `Calculated route from "${from}" to "${to}".`;

      if (result.content && Array.isArray(result.content)) {
        const structuredDataContent = result.content.find(c => c.text?.includes("Structured Data:"));
        if (structuredDataContent && structuredDataContent.text) {
          try {
            const jsonString = structuredDataContent.text.substring(structuredDataContent.text.indexOf('```json') + 7, structuredDataContent.text.lastIndexOf('```'));
            structuredData = JSON.parse(jsonString);
            textualSummary = result.content.find(c => !c.text?.includes("Structured Data:"))?.text || textualSummary;
          } catch (e) {
            console.error("Error parsing structured data from distance tool:", e);
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
          <span>✅ Route calculated: {textualSummary}</span>
        </Card>
      );

    } catch (error: any) {
      console.error("MCP calculate_distance tool error:", error);
      toolResponse = { error: `Error calculating route from "${from}" to "${to}": ${error.message}` };
      uiStream.update(
        <Card className="p-2 my-2 text-sm bg-red-100 text-red-700">
          <span>Error calculating route: {error.message}</span>
        </Card>
      );
    }
    return toolResponse;
  },
});
