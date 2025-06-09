/*
 * @Author: AidenYangX
 * @Email: xscs709560271@gmail.com
 * @Date: 2024-12-21 23:54:22
 * @Description: Base Handler
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { IHandler } from "../registry";
import { Tool } from "@modelcontextprotocol/sdk/types.js";

/**
 * @abstract
 * @class BaseHandler
 * @description Base class for implementing MCP tool handlers
 *
 * BaseHandler provides a foundation for implementing tool-specific handlers in the MCP server.
 * It implements common functionality and enforces a consistent interface for all handlers.
 *
 * @implements {IHandler}
 *
 * @example
 * ```typescript
 * class NavigationHandler extends BaseHandler {
 *   constructor() {
 *     super();
 *     this.tools.add("mapbox_directions");
 *   }
 *
 *   register(server: Server): void {
 *     server.addTool(DIRECTIONS_TOOL);
 *   }
 *
 *   async handle(params: any): Promise<any> {
 *     // Implementation
 *   }
 * }
 * ```
 */
export abstract class BaseHandler implements IHandler {
  /**
   * Set of tool names that this handler can process
   * @protected
   * @type {Set<string>}
   */
  protected tools: Set<string>;

  /**
   * Array of tool definitions that this handler can process
   * @protected
   * @type {Tool[]}
   */
  protected toolDefinitions: Tool[];

  /**
   * Initialize the handler
   * @constructor
   */
  constructor() {
    this.tools = new Set();
    this.toolDefinitions = [];
  }

  /**
   * Get the tool definitions that this handler can process
   * @returns {Tool[]} Array of tool definitions
   */
  getTools(): Tool[] {
    return this.toolDefinitions;
  }

  /**
   * Check if this handler can process the specified tool
   *
   * @param {string} toolName - Name of the tool to check
   * @returns {boolean} True if this handler can process the tool
   */
  canHandle(toolName: string): boolean {
    return this.tools.has(toolName);
  }

  /**
   * Process a tool request
   * Must be implemented by concrete handler classes
   *
   * @abstract
   * @param {object} params - The parameters for the tool request
   * @param {string} params.name - The name of the tool to execute
   * @param {any} params.args - The arguments for the tool
   * @returns {Promise<any>} The result of the tool execution
   * @throws {Error} If the tool execution fails
   */
  abstract handle(params: any): Promise<any>;
}
