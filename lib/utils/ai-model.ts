import { getSelectedModel } from '@/lib/actions/users'
import { createOpenAI } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { createXai } from '@ai-sdk/xai';

export async function getModel(requireVision: boolean = false) {
  // Check for specific API model override
  if (process.env.SPECIFIC_API_MODEL) {
    const provider = process.env.SPECIFIC_API_MODEL.split(':')[0];
    const modelId = process.env.SPECIFIC_API_MODEL.split(':').slice(1).join(':');

    if (provider === 'openai') {
      return createOpenAI({ apiKey: process.env.OPENAI_API_KEY })(modelId);
    } else if (provider === 'google') {
      return createGoogleGenerativeAI({ apiKey: process.env.GEMINI_3_PRO_API_KEY })(modelId);
    } else if (provider === 'xai') {
      return createXai({ apiKey: process.env.XAI_API_KEY })(modelId);
    }
  }

  const selectedModel = await getSelectedModel();

  const xaiApiKey = process.env.XAI_API_KEY;
  const gemini3ProApiKey = process.env.GEMINI_3_PRO_API_KEY;
  const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const awsRegion = process.env.AWS_REGION;
  const bedrockModelId = process.env.BEDROCK_MODEL_ID || (requireVision ? 'anthropic.claude-3-5-sonnet-20241022-v2:0' : 'anthropic.claude-3-5-sonnet-20241022-v2:0');
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (selectedModel) {
    switch (selectedModel) {
      case 'Grok 4.2':
        if (xaiApiKey) {
          const xai = createXai({
            apiKey: xaiApiKey,
            baseURL: 'https://api.x.ai/v1',
          });
          return xai(requireVision ? 'grok-vision-beta' : 'grok-beta');
        }
        break;
      case 'Gemini 3':
        if (gemini3ProApiKey) {
          const google = createGoogleGenerativeAI({
            apiKey: gemini3ProApiKey,
          });
          return google(requireVision ? 'gemini-1.5-pro' : 'gemini-1.5-pro');
        }
        break;
      case 'GPT-5.1':
        if (openaiApiKey) {
          const openai = createOpenAI({
            apiKey: openaiApiKey,
          });
          return openai('gpt-4o');
        }
        break;
    }
  }

  // Default behavior: Grok -> Gemini -> Bedrock -> OpenAI
  if (xaiApiKey) {
    const xai = createXai({
      apiKey: xaiApiKey,
      baseURL: 'https://api.x.ai/v1',
    });
    try {
      return xai(requireVision ? 'grok-vision-beta' : 'grok-beta');
    } catch (error) {
      console.warn('xAI API unavailable, falling back to next provider');
    }
  }

  if (gemini3ProApiKey) {
    const google = createGoogleGenerativeAI({
      apiKey: gemini3ProApiKey,
    });
    try {
      return google(requireVision ? 'gemini-1.5-pro' : 'gemini-1.5-pro');
    } catch (error) {
      console.warn('Gemini 3 Pro API unavailable, falling back to next provider:', error);
    }
  }

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
    return bedrock(bedrockModelId);
  }

  const openai = createOpenAI({
    apiKey: openaiApiKey,
  });
  return openai('gpt-4o');
}
