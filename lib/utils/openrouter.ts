import { createOpenAI } from '@ai-sdk/openai';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_OPENROUTER_MODEL = 'openai/gpt-4o';
// Keep this at ada-002 so new document/query vectors remain in the same vector space as existing rows.
const DEFAULT_OPENROUTER_EMBEDDING_MODEL = 'openai/text-embedding-ada-002';

function createOpenRouterProvider() {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('INFERENCE_PROVIDER is "openrouter" but OPENROUTER_API_KEY is not configured.');
  }

  const headers: Record<string, string> = {
    'X-Title': process.env.OPENROUTER_APP_NAME?.trim() || 'QCX',
  };
  const siteUrl = process.env.OPENROUTER_SITE_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (siteUrl) headers['HTTP-Referer'] = siteUrl;

  return createOpenAI({
    apiKey,
    baseURL: OPENROUTER_BASE_URL,
    headers,
  });
}

/**
 * Creates an OpenRouter model using the OpenAI-compatible Chat Completions API.
 * The default model supports the text, vision, tool-call, and structured-output
 * paths used by QCX. Deployments may choose a different model through env vars.
 */
export function createOpenRouterModel(requireVision = false) {
  const textModel = process.env.OPENROUTER_MODEL?.trim() || DEFAULT_OPENROUTER_MODEL;
  const modelId = requireVision
    ? process.env.OPENROUTER_VISION_MODEL?.trim() || textModel
    : textModel;
  // OpenRouter exposes Chat Completions compatibility, not OpenAI Responses.
  return createOpenRouterProvider().chat(modelId);
}

export function createOpenRouterEmbeddingModel() {
  const modelId = process.env.OPENROUTER_EMBEDDING_MODEL?.trim() || DEFAULT_OPENROUTER_EMBEDDING_MODEL;
  return createOpenRouterProvider().embedding(modelId);
}
