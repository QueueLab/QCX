import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { HandlerRegistry } from "./registry";
import { NavigationHandler } from "./handlers/navigation";
import { SearchHandler } from "./handlers/search";

export class MapboxServer {
  private server: Server;
  private registry: HandlerRegistry;

  constructor() {
    this.server = new Server(
      {
        name: "mcp-server/mapbox",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.registry = new HandlerRegistry();
    this.initializeHandlers();
  }

  private initializeHandlers() {
    // Register all handlers
    this.registry.register(new NavigationHandler());
    this.registry.register(new SearchHandler());

    // Register all handlers to the server
    this.registry.registerAll(this.server);
  }

  public getMcpServer(): Server {
    return this.server;
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Mapbox MCP Server running on stdio");
  }
}
