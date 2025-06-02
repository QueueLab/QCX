import {
  LanguageModelV1,
  LanguageModelV1CallResult,
  LanguageModelV1StreamPart,
  LanguageModelV1StreamResult,
  UnsupportedFunctionalityError,
  LanguageModelV1PromptMessage,
  LanguageModelV1ToolDefinition,
} from '@ai-sdk/provider';
import {
  ToolCall, // May not be needed if we use LanguageModelV1ToolDefinition
  ToolResult, // May not be needed if we use LanguageModelV1ToolDefinition
} from 'ai';
import { createEventSourceStream, readEventSourceStream } from '@ai-sdk/provider-utils';

export interface SmitheryMCPProviderOptions {
  baseURL?: string;
  apiKey: string;
}

class SmitheryMCPLanguageModel implements LanguageModelV1 {
  private readonly baseURL: string;
  private readonly apiKey: string;

  constructor(options: SmitheryMCPProviderOptions) {
    this.baseURL = options.baseURL || 'http://localhost:8080'; // Default to localhost if not provided
    this.apiKey = options.apiKey;
  }

  get provider(): string {
    return 'smithery-mcp';
  }

  get modelName(): string {
    // This can be a fixed string or configured if the provider supports multiple models
    return 'smithery-mcp-geospatial';
  }

  async doGenerate(options: {
    inputFormat: 'prompt';
    mode: { type: 'regular'; tools?: any; toolChoice?: any };
    prompt: LanguageModelV1.Prompt;
    tools?: any; // Added tools here
  }): Promise<LanguageModelV1CallResult> {
    const { prompt, mode, tools } = options;

    // Assuming the prompt is a simple string for now, e.g., "Geocode: 123 Main St"
    // Or "CalculateDistance: { from: [lon, lat], to: [lon, lat] }"
    // Or "SearchNearby: { query: 'coffee', location: [lon, lat] }"
    const promptMessages = prompt.map(p => p.content).join('\n');


    let operation = '';
    let params: any = {};

    if (promptMessages.startsWith('Geocode:')) {
      operation = 'geocode_location';
      params = { address: promptMessages.replace('Geocode:', '').trim() };
    } else if (promptMessages.startsWith('CalculateDistance:')) {
      operation = 'calculate_distance';
      try {
        // Extract the JSON part and parse it
        const jsonString = promptMessages.replace('CalculateDistance:', '').trim();
        const parsedParams = JSON.parse(jsonString);
        params = {
          start_latitude: parsedParams.from[1],
          start_longitude: parsedParams.from[0],
          end_latitude: parsedParams.to[1],
          end_longitude: parsedParams.to[0],
        };
      } catch (e) {
        console.error("Error parsing CalculateDistance params:", e);
        return {
          finishReason: 'error',
          usage: { promptTokens: 0, completionTokens: 0 },
          logprobs: undefined,
          rawResponse: undefined,
          toolCalls: undefined,
          toolResults: undefined,
          text: undefined,
          warnings: undefined,
          error: { message: 'Invalid parameters for CalculateDistance' }
        };
      }
    } else if (promptMessages.startsWith('SearchNearby:')) {
      operation = 'search_nearby_places';
      try {
        // Extract the JSON part and parse it
        const jsonString = promptMessages.replace('SearchNearby:', '').trim();
        const parsedParams = JSON.parse(jsonString);
        params = {
          query: parsedParams.query,
          latitude: parsedParams.location[1],
          longitude: parsedParams.location[0],
        };
      } catch (e) {
        console.error("Error parsing SearchNearby params:", e);
        return {
          finishReason: 'error',
          usage: { promptTokens: 0, completionTokens: 0 },
          logprobs: undefined,
          rawResponse: undefined,
          toolCalls: undefined,
          toolResults: undefined,
          text: undefined,
          warnings: undefined,
          error: { message: 'Invalid parameters for SearchNearby' }
        };
      }
    } else {
      return {
        finishReason: 'error',
        usage: { promptTokens: 0, completionTokens: 0 },
        logprobs: undefined,
        rawResponse: undefined,
        toolCalls: undefined,
        toolResults: undefined,
        text: undefined,
        warnings: undefined,
        error: { message: 'Unknown operation in prompt' }
      };
    }

    const fullURL = `${this.baseURL}/mcp`; // Smithery MCP server endpoint

    try {
      const response = await fetch(fullURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify({
          tool_name: operation,
          parameters: params,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Smithery MCP Error:', errorText);
        return {
          finishReason: 'error',
          usage: { promptTokens: 0, completionTokens: 0 },
          error: { message: `Smithery MCP request failed: ${response.statusText} - ${errorText}` },
          rawResponse: {
            headers: Object.fromEntries(response.headers.entries()),
            statusCode: response.status,
          }
        };
      }

      const jsonResponse = await response.json();

      // Smithery MCP is expected to return a direct result, not a tool call that the client then executes.
      // The "tool call" in the context of AI SDK here is the call to the Smithery service itself.
      // The result from Smithery is the "tool result".

      if (jsonResponse.error) {
         console.error('Smithery MCP returned an error:', jsonResponse.error);
         return {
          finishReason: 'error',
          usage: { promptTokens: 0, completionTokens: 0 },
          error: { message: `Smithery MCP execution error: ${jsonResponse.error}` },
         };
      }

      // We need to map the Smithery response to what generateText expects.
      // If Smithery directly returns the data, we can pass it as a "text" response,
      // or simulate a "toolResult" if that fits better with how generateText handles it.

      // For now, let's assume the Smithery server returns a JSON that can be directly
      // used or stringified. If the calling code (in hooks.ts) expects toolResults,
      // we might need to wrap it.

      // If the `tools` parameter was provided to `doGenerate` (meaning `generateText` was called with `tools`),
      // AI SDK might expect `toolCalls` or `toolResults`.
      // Since our provider *is* the tool executioner, we return the result as if it's a direct text
      // or if we want to align with the `tools` usage in `generateText`, we can construct a `toolResults`.

      if (mode.type === 'regular' && mode.tools && mode.tools.length > 0) {
        // If tools are defined in the call to generateText, the AI SDK expects toolCalls or toolResults.
        // Since our provider *is* the tool, we'll format the response as a toolResult.
        // This assumes the Smithery MCP server returns the direct result of the tool execution.

        // We need a toolCallId. Since we are not making a call *back* to the client to execute,
        // we can generate a dummy one or use a convention.
        // The `tools` argument passed to `doGenerate` contains the schema of tools the *client* defined.
        // We need to find the matching tool.
        const clientToolDefinition = mode.tools.find(t => t.name === operation);

        if (clientToolDefinition) {
            const toolCallId = `${operation}-${Date.now()}`;
            return {
                finishReason: 'tool-calls',
                usage: { promptTokens: 0, completionTokens: 0 }, // Update with actual token counts if available
                toolCalls: [{
                    toolCallId: toolCallId,
                    toolName: operation,
                    args: params, // The arguments we sent to Smithery
                }],
                // We then need to provide the result as if the tool was called.
                // This part is a bit tricky because `doGenerate` is supposed to return `toolCalls`
                // and then the main `generateText` would execute them and call the provider *again*
                // with `toolResults`.
                // However, since our provider *is* the tool, it executes it directly.

                // Let's try returning the result directly in `text` for now, and adapt if `generateText`
                // doesn't handle it as expected when `tools` are passed to it.
                // OR, we can try to send back a "toolResult" directly.
                // The AI SDK expects `LanguageModelV1CallResult` to have `toolCalls` OR `text`.
                // If it has `toolCalls`, then `generateText` will try to execute them.
                // This is not what we want.

                // What we want is to tell `generateText` that the "tool call" it thought it was making
                // (by specifying `tools` in its options) has been executed by the provider itself.

                // Let's return the result as a stringified JSON in the 'text' field for now.
                // The calling code in hooks.ts will then parse this.
                // This simplifies the provider's role.
                text: JSON.stringify(jsonResponse.result || jsonResponse),
            };
        }
      }


      // Default: return the result as text
      return {
        finishReason: 'stop',
        usage: { promptTokens: 0, completionTokens: 0 }, // Update with actual token counts if available
        text: JSON.stringify(jsonResponse.result || jsonResponse), // Assuming Smithery returns { "result": ... } or the direct JSON
        rawResponse: {
            headers: Object.fromEntries(response.headers.entries()),
            statusCode: response.status,
        }
      };
    } catch (error: any) {
      console.error('Fetch error in Smithery MCP Provider:', error);
      return {
        finishReason: 'error',
        usage: { promptTokens: 0, completionTokens: 0 },
        error: { message: error.message || 'Unknown fetch error' },
      };
    }
  }

  async doStream(options: {
    inputFormat: 'prompt'; // Assuming 'prompt' which maps to messages for Smithery
    mode: { type: 'regular'; tools?: LanguageModelV1ToolDefinition[]; toolChoice?: any };
    prompt: LanguageModelV1PromptMessage[]; // Changed from LanguageModelV1.Prompt
    tools?: LanguageModelV1ToolDefinition[]; // Ensure this is used
  }): Promise<LanguageModelV1StreamResult> {
    const { prompt: messages, tools, mode } = options; // mode.tools will also have tools if passed via 'regular'
    const actualTools = tools || mode.tools;

    const payload = {
      messages: messages.map(msg => ({ // Map to Smithery's expected message format
        role: msg.role,
        content: msg.content,
        // tool_calls: msg.toolCalls, // If Smithery expects tool calls in messages
        // tool_results: msg.toolResults, // If Smithery expects tool results in messages
      })),
      tools: actualTools ? actualTools.map(t => ({ // Map to Smithery's expected tool definition format
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      })) : undefined,
      stream: true, // Explicitly tell Smithery we want to stream
    };

    const fullURL = `${this.baseURL}/mcp`; // Assuming same endpoint for streaming

    try {
      const response = await fetch(fullURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
          'Accept': 'text/event-stream', // Important for SSE
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Smithery MCP Stream Error:', errorText);
        // If the response is not OK, we can't stream. Return an error part.
        // This part is tricky as doStream expects a LanguageModelV1StreamResult,
        // which itself contains a stream. We might need to return a stream that immediately yields an error.
        async function* errorStream(): AsyncGenerator<LanguageModelV1StreamPart> {
          yield {
            type: 'error',
            error: new Error(`Smithery MCP stream request failed: ${response.statusText} - ${errorText}`),
          };
        }
        return { stream: errorStream(), rawResponse: { statusCode: response.status } };
      }

      if (response.body == null) {
        throw new Error('Response body is null');
      }

      const eventStream = createEventSourceStream(response.body);
      const self = this; // for usage inside the generator

      async function* processStream(): AsyncGenerator<LanguageModelV1StreamPart> {
        // Helper to estimate token counts (very basic)
        const countTokens = (text?: string | object): number => {
            if (!text) return 0;
            if (typeof text === 'object') text = JSON.stringify(text);
            return Math.floor(text.length / 4);
        };
        let promptTokens = countTokens(JSON.stringify(payload.messages) + JSON.stringify(payload.tools));
        let completionTokens = 0;

        for await (const event of readEventSourceStream(eventStream)) {
          if (event.type === 'event') {
            const data = event.data;
            if (!data) continue;

            try {
              const part = JSON.parse(data);
              // console.log("Smithery Stream Part:", part); // For debugging

              if (part.type === 'text_delta' && typeof part.text === 'string') {
                completionTokens += countTokens(part.text);
                yield { type: 'text-delta', textDelta: part.text };
              } else if (part.type === 'tool_call' && part.id && part.name && part.args) {
                // Smithery sends tool_call with id, name, args (stringified JSON)
                completionTokens += countTokens(part.args); // Args contribute to completion
                yield {
                  type: 'tool-call',
                  toolCallId: part.id,
                  toolName: part.name,
                  args: part.args, // args are already stringified JSON from Smithery
                };
              } else if (part.type === 'tool_result' && part.id && part.content) {
                 // Smithery sends tool_result if it executes tools internally
                 completionTokens += countTokens(part.content);
                 yield {
                    type: 'tool-result',
                    toolCallId: part.id,
                    toolName: part.name || '', // Smithery might not send name back with result, try to get it or leave empty
                    result: part.content, // content is stringified JSON from Smithery
                 };
              } else if (part.type === 'finish') {
                // Smithery sends a finish event
                // { "type": "finish", "reason": "stop" | "tool_calls" | "length" | "error", "usage": { "prompt_tokens": X, "completion_tokens": Y } }
                const finishReason = part.reason === 'tool_calls' ? 'tool-calls' :
                                     part.reason === 'length' ? 'length' :
                                     part.reason === 'error' ? 'error' : 'stop';

                // Use Smithery's token counts if available, otherwise our estimates
                const usage = {
                    promptTokens: part.usage?.prompt_tokens ?? promptTokens,
                    completionTokens: part.usage?.completion_tokens ?? completionTokens,
                };
                if (part.usage?.total_tokens) {
                    usage.totalTokens = part.usage.total_tokens;
                }

                yield { type: 'finish', finishReason, usage };
              } else if (part.type === 'error') {
                console.error('Error part from Smithery stream:', part.error);
                yield { type: 'error', error: part.error };
              }
              // Potentially other part types from Smithery to handle
            } catch (e: any) {
              console.warn('Failed to parse Smithery stream part or unknown part structure:', data, e);
              // yield { type: 'error', error: new Error(`Error parsing stream data: ${e.message}`) };
            }
          } else if (event.type === 'error') {
            // Error events from the EventSource stream itself
            console.error('EventSource stream error:', event.error);
            yield { type: 'error', error: event.error };
            return; // Terminate the stream on EventSource error
          } else if (event.type === 'finish') {
            // The EventSource stream finished (connection closed by server)
            // This might not always be preceded by a Smithery 'finish' message,
            // so we might need to yield a generic 'finish' if not already done.
            // However, readEventSourceStream handles this and the loop just ends.
            // console.log("EventSource stream finished.");
          }
        }
      }

      return {
        stream: processStream(),
        rawResponse: { statusCode: response.status },
      };
    } catch (error: any) {
      console.error('Fetch error in Smithery MCP Provider doStream:', error);
      async function* errorStream(): AsyncGenerator<LanguageModelV1StreamPart> {
        yield { type: 'error', error: error.message || 'Unknown fetch error' };
      }
      return { stream: errorStream() };
    }
  }
}

export function createSmitheryMCPProvider(
  options: SmitheryMCPProviderOptions,
): (modelId: string) => LanguageModelV1 {
  return (modelId: string) => {
    // modelId could be used here if the provider was to serve multiple "models" or configurations
    // For now, we ignore it as SmitheryMCPLanguageModel is specific.
    if (modelId !== 'smithery-mcp-geospatial') {
        console.warn(`SmitheryMCPProvider: modelId "${modelId}" is not the expected "smithery-mcp-geospatial". Proceeding anyway.`);
    }
    return new SmitheryMCPLanguageModel(options);
  };
}
