/*
 * @Author: AidenYangX
 * @Email: xscs709560271@gmail.com
 * @Date: 2024-12-21 23:58:32
 * @Description: Search Handler
 */
import { BaseHandler } from "./base";
import { GeocodingArgsSchema } from "../../schemas/search/geocoding";
import { handleGeocoding } from "../../tools/handlers/search/geocoding";
import { GEOCODING_TOOL } from "../../tools/definitions/search/geocoding";

export class SearchHandler extends BaseHandler {
  constructor() {
    super();
    this.tools.add("mapbox_geocoding");
    this.toolDefinitions.push(GEOCODING_TOOL);
  }

  async handle({ name, args }: { name: string; args: any }) {
    switch (name) {
      case "mapbox_geocoding": {
        const validatedArgs = GeocodingArgsSchema.parse(args);
        return await handleGeocoding(validatedArgs);
      }
      default:
        throw new Error(`Unsupported search tool: ${name}`);
    }
  }
}
