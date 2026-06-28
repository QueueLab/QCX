export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 0.0000025, output: 0.00001 },
  'gemini-1.5-pro-latest': { input: 0.00000125, output: 0.00000375 },
  'anthropic.claude-3-5-sonnet-20241022-v2:0': { input: 0.000003, output: 0.000015 },
  'grok-2-1212': { input: 0.000002, output: 0.00001 },
  'grok-latest': { input: 0.000002, output: 0.00001 },
};

export const TOOL_PRICING: Record<string, number> = {
  'search': 0.01,
  'retrieve': 0.001,
  'geospatialQueryTool': 0.05,
  'videoSearch': 0.01,
};

export function calculateLlmCost({
  modelId,
  promptTokens,
  completionTokens
}: {
  modelId: string;
  promptTokens: number;
  completionTokens: number;
}): number {
  const pricing = MODEL_PRICING[modelId] || { input: 0.000002, output: 0.00001 }; // Default fallback
  return (promptTokens * pricing.input) + (completionTokens * pricing.output);
}

export function getToolCost(toolName: string): number {
  return TOOL_PRICING[toolName] || 0;
}
