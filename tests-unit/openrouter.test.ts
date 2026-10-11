import assert from 'node:assert/strict';
import { createOpenRouterEmbeddingModel, createOpenRouterModel } from '../lib/utils/openrouter';

const envKeys = [
  'OPENROUTER_API_KEY',
  'OPENROUTER_MODEL',
  'OPENROUTER_VISION_MODEL',
  'OPENROUTER_EMBEDDING_MODEL',
  'OPENROUTER_SITE_URL',
  'OPENROUTER_APP_NAME',
] as const;
const previousValues = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

try {
  for (const key of envKeys) delete process.env[key];
  assert.throws(() => createOpenRouterModel(), /OPENROUTER_API_KEY is not configured/);

  process.env.OPENROUTER_API_KEY = 'test-key';
  const defaultModel = createOpenRouterModel();
  assert.equal(defaultModel.modelId, 'openai/gpt-4o');

  process.env.OPENROUTER_MODEL = 'google/gemini-2.5-pro';
  const textModel = createOpenRouterModel();
  assert.equal(textModel.modelId, 'google/gemini-2.5-pro');

  process.env.OPENROUTER_VISION_MODEL = 'openai/gpt-4o';
  const visionModel = createOpenRouterModel(true);
  assert.equal(visionModel.modelId, 'openai/gpt-4o');

  const embeddingModel = createOpenRouterEmbeddingModel();
  assert.equal(embeddingModel.modelId, 'openai/text-embedding-ada-002');
} finally {
  for (const key of envKeys) {
    const value = previousValues[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

console.log('OpenRouter provider tests passed.');
