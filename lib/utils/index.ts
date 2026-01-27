import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { getSelectedModel } from '@/lib/actions/users'
import { AIMessage } from '../types'
import { openai } from '@ai-sdk/openai'
import { createOpenAI } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import { createXai } from '@ai-sdk/xai';
import { v4 as uuidv4 } from 'uuid';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateUUID(): string {
  return uuidv4();
}

export function getChatTitle(messages: AIMessage[]) {
  let title = 'Untitled Chat'
  if (messages.length > 0) {
    const firstMessage = messages.find(m => m.role === 'user')
    const firstMessageContent = firstMessage?.content || messages[0].content
    if (typeof firstMessageContent === 'string') {
      try {
        const parsedContent = JSON.parse(firstMessageContent)
        title = parsedContent.input?.substring(0, 100) || 'Untitled Chat'
      } catch (e) {
        title = firstMessageContent.substring(0, 100)
      }
    } else if (Array.isArray(firstMessageContent)) {
      const textPart = (
        firstMessageContent as { type: string; text?: string }[]
      ).find(p => p.type === 'text')
      title =
        textPart && textPart.text
          ? textPart.text.substring(0, 100)
          : 'Image Message'
    }
  }
  return title
}

export async function getModel(requireVision: boolean = false) {
  const selectedModel = await getSelectedModel();

  const xaiApiKey = process.env.XAI_API_KEY;
  const gemini3ProApiKey = process.env.GEMINI_3_PRO_API_KEY;
  const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const awsRegion = process.env.AWS_REGION;
  const bedrockModelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20241022-v2:0';
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (selectedModel) {
    switch (selectedModel) {
      case 'Grok 4.2':
        if (xaiApiKey) {
          const xai = createXai({
            apiKey: xaiApiKey,
            baseURL: 'https://api.x.ai/v1',
          });
          try {
            return xai('grok-4-fast-non-reasoning');
          } catch (error) {
            console.error('Selected model "Grok 4.2" is configured but failed to initialize.', error);
            throw new Error('Failed to initialize selected model.');
          }
        } else {
            console.error('User selected "Grok 4.2" but XAI_API_KEY is not set.');
            throw new Error('Selected model is not configured.');
        }
      case 'Gemini 3':
        if (gemini3ProApiKey) {
          const google = createGoogleGenerativeAI({
            apiKey: gemini3ProApiKey,
          });
          try {
            return google('gemini-3-pro-preview');
          } catch (error) {
            console.error('Selected model "Gemini 3" is configured but failed to initialize.', error);
            throw new Error('Failed to initialize selected model.');
          }
        } else {
            console.error('User selected "Gemini 3" but GEMINI_3_PRO_API_KEY is not set.');
            throw new Error('Selected model is not configured.');
        }
      case 'GPT-5.1':
        if (openaiApiKey) {
          const openai = createOpenAI({
            apiKey: openaiApiKey,
          });
          return openai('gpt-4o');
        } else {
            console.error('User selected "GPT-5.1" but OPENAI_API_KEY is not set.');
            throw new Error('Selected model is not configured.');
        }
    }
  }

  // Default behavior: Grok -> Gemini -> Bedrock -> OpenAI
  if (xaiApiKey) {
    const xai = createXai({
      apiKey: xaiApiKey,
      baseURL: 'https://api.x.ai/v1',
    });
    try {
      return xai('grok-4-fast-non-reasoning');
    } catch (error) {
      console.warn('xAI API unavailable, falling back to next provider:');
    }
  }

  if (gemini3ProApiKey) {
    const google = createGoogleGenerativeAI({
      apiKey: gemini3ProApiKey,
    });
    try {
      return google('gemini-3-pro-preview');
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
    const model = bedrock(bedrockModelId, {
      additionalModelRequestFields: { top_k: 350 },
    });
    return model;
  }

  const openai = createOpenAI({
    apiKey: openaiApiKey,
  });
  return openai('gpt-4o');
}
