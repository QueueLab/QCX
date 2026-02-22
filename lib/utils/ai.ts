import { getSelectedModel } from '@/lib/actions/users'
import { createOpenAI } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { createXai } from '@ai-sdk/xai'
import { getCurrentUserIdOnServer } from '@/lib/auth/get-current-user'
import { withSupermemory } from '@supermemory/tools/ai-sdk'
import { LanguageModel } from 'ai'

export async function getModel(
  requireVision: boolean = false,
  userId?: string,
  chatId?: string,
  requireStructuredOutput: boolean = false
) {
  const actualUserId = userId || await getCurrentUserIdOnServer();

  async function getBaseModel() {
    const selectedModel = await getSelectedModel();

    const xaiApiKey = process.env.XAI_API_KEY;
    const gemini3ProApiKey = process.env.GEMINI_3_PRO_API_KEY;
    const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const awsRegion = process.env.AWS_REGION;
    const bedrockModelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20241022-v2:0';
    const openaiApiKey = process.env.OPENAI_API_KEY;

    // Handle user preference first
    if (selectedModel) {
      switch (selectedModel) {
        case 'Grok 4.2':
          if (xaiApiKey && !requireStructuredOutput && !requireVision) {
            const xai = createXai({
              apiKey: xaiApiKey,
              baseURL: 'https://api.x.ai/v1',
            });
            return xai('grok-4-fast-non-reasoning');
          }
          break;
        case 'Gemini 3':
          if (gemini3ProApiKey) {
            const google = createGoogleGenerativeAI({
              apiKey: gemini3ProApiKey,
            });
            return google('gemini-3-pro-preview');
          }
          break;
        case 'GPT-4o':
        case 'GPT-5.1':
          if (openaiApiKey) {
            const openai = createOpenAI({
              apiKey: openaiApiKey,
            });
            return openai('gpt-4o');
          }
          break;
        default:
          console.warn(`Unknown model selection: ${selectedModel}. Falling back to default provider chain.`);
      }
    }

    // Default provider chain: OpenAI -> Gemini -> Bedrock -> Xai
    // OpenAI and Gemini are our primary choices for vision and structured output.

    if (openaiApiKey) {
      const openai = createOpenAI({
        apiKey: openaiApiKey,
      });
      return openai('gpt-4o');
    }

    if (gemini3ProApiKey) {
      const google = createGoogleGenerativeAI({
        apiKey: gemini3ProApiKey,
      });
      return google('gemini-3-pro-preview');
    }

    // Bedrock might support vision depending on the model, but we'll assume it doesn't for now if requireVision is true and model is generic.
    if (awsAccessKeyId && awsSecretAccessKey) {
      const bedrock = createAmazonBedrock({
        bedrockOptions: {
          region: awsRegion,
          credentials: {
            accessKeyId: awsAccessKeyId,
            secretAccessKey: awsSecretAccessKey,
          },
        },
      });
      return bedrock(bedrockModelId, {
        additionalModelRequestFields: { top_k: 350 },
      });
    }

    if (xaiApiKey && !requireStructuredOutput && !requireVision) {
      const xai = createXai({
        apiKey: xaiApiKey,
        baseURL: 'https://api.x.ai/v1',
      });
      return xai('grok-4-fast-non-reasoning');
    }

    const requirements = [];
    if (requireVision) requirements.push('vision');
    if (requireStructuredOutput) requirements.push('structured output');

    throw new Error(`No compatible AI provider configured. Missing key or provider doesn't support: ${requirements.join(', ') || 'basic completion'}.`);
  }

  const model = await getBaseModel();

  if (process.env.SUPERMEMORY_API_KEY && actualUserId) {
    // Default to 'never' for addMemory unless explicitly opted in via env var for privacy.
    const addMemoryMode = (process.env.SUPERMEMORY_ADD_MEMORY_MODE as 'always' | 'never' | undefined) || 'never';

    return withSupermemory(model as any, actualUserId, {
      conversationId: chatId,
      mode: 'full',
      addMemory: addMemoryMode
    });
  }

  return model;
}
