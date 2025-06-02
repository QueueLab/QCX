import { z } from "zod";
import mcpClient from "lib/utils/mcp-client";
import { ToolProps } from "."; // Assuming ToolProps is exported from index.tsx in the same directory
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

const mapLinkParameters = z.object({
  location: z.string().describe("Location (address or 'latitude,longitude') for which to generate a map link"),
  zoom: z.number().optional().default(12).describe("Map zoom level (integer from 1 to 22)"),
  style: z.enum(["streets", "satellite", "outdoors", "dark", "light"]).optional().default("streets").describe("Map style theme"),
  size: z.enum(["400x400", "600x400", "800x600", "1024x768"]).optional().default("800x600").describe("Static map image size (widthxheight)"),
});

export const mcpMapLinkTool = ({ uiStream, fullResponse }: ToolProps) => ({
  description: "Generate a shareable static image map link and an interactive map link for a given location (address or coordinates).",
  parameters: mapLinkParameters,
  execute: async (params: z.infer<typeof mapLinkParameters>) => {
    const { location, zoom, style, size } = params;
    let toolResponse;

    uiStream.append(
      <Card className="p-2 my-2 text-sm">
        <div className="flex items-center gap-2">
          <Spinner />
          <span>Generating map link for "{location}"...</span>
        </div>
      </Card>
    );

    try {
      const result = await mcpClient.tool("generate_map_link", { location, zoom, style, size });
      let structuredData: any = { staticMapUrl: null, interactiveMapUrl: null, coordinates: null, summary: "" };
      let textualSummary = `Generated map link for "${location}".`;

      if (result.content && Array.isArray(result.content) && result.content[0]?.text) {
        textualSummary = result.content[0].text;
        const staticMapMatch = textualSummary.match(/\[View Image\]\(([^)]+)\)/);
        const interactiveMapMatch = textualSummary.match(/\[Open Map\]\(([^)]+)\)/);
        const coordsMatch = textualSummary.match(/Coordinates:\s*([-\d.]+),\s*([-\d.]+)/);

        if (staticMapMatch) structuredData.staticMapUrl = staticMapMatch[1];
        if (interactiveMapMatch) structuredData.interactiveMapUrl = interactiveMapMatch[1];
        if (coordsMatch) structuredData.coordinates = { latitude: parseFloat(coordsMatch[1]), longitude: parseFloat(coordsMatch[2]) };
        structuredData.summary = textualSummary.split('\n')[0]; // First line as summary
      } else {
        structuredData = result;
      }

      toolResponse = {
        summary: textualSummary,
        data: structuredData
      };

      uiStream.update(
        <Card className="p-2 my-2 text-sm">
          <span>✅ Map links generated for "{location}". <a href={structuredData.interactiveMapUrl || structuredData.staticMapUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">[Open Map]</a></span>
        </Card>
      );

    } catch (error: any) {
      console.error("MCP generate_map_link tool error:", error);
      toolResponse = { error: `Error generating map link for "${location}": ${error.message}` };
      uiStream.update(
        <Card className="p-2 my-2 text-sm bg-red-100 text-red-700">
          <span>Error generating map link: {error.message}</span>
        </Card>
      );
    }
    return toolResponse;
  },
});
