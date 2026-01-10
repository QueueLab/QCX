import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
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

export function getModel(requireVision: boolean = false) {
  const xaiApiKey = process.env.XAI_API_KEY
  const gemini3ProApiKey = process.env.GEMINI_3_PRO_API_KEY
  const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID
  const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
  const awsRegion = process.env.AWS_REGION
  const bedrockModelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20241022-v2:0'

  // If vision is required, skip models that don't support it
  if (!requireVision && xaiApiKey) {
    const xai = createXai({
      apiKey: xaiApiKey,
      baseURL: 'https://api.x.ai/v1',
    })
    // Optionally, add a check for credit status or skip xAI if credits are exhausted
    try {
      return xai('grok-4-fast-non-reasoning')
    } catch (error) {
      console.warn('xAI API unavailable, falling back to OpenAI:')
    }
  }

  // Gemini 3 Pro
  if (gemini3ProApiKey) {
    const google = createGoogleGenerativeAI({
      apiKey: gemini3ProApiKey,
      // Enable Gemini's "thinking mode" to stream reasoning steps.
      // See: https://ai-sdk.dev/cookbook/guides/gemini#enhanced-reasoning-with-thinking-mode
      structuredOutput: {
        thinkingLevel: 'low'
      }
    })
    try {
      return google('gemini-3-pro-preview')
    } catch (error) {
      console.warn(
        'Gemini 3 Pro API unavailable, falling back to next provider:',
        error
      )
    }
  }

  // AWS Bedrock

  if (awsAccessKeyId && awsSecretAccessKey) {
    const bedrock = createAmazonBedrock({
      bedrockOptions: {
        region: awsRegion,
        credentials: {
          accessKeyId: awsAccessKeyId,
          secretAccessKey: awsSecretAccessKey,
        },
      },
    })
    const model = bedrock(bedrockModelId, {
      additionalModelRequestFields: { top_k: 350 },
    })
    return model
  }

  // Default fallback (OpenAI gpt-4o supports vision)
  const openai = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
  return openai('gpt-4o')
}
