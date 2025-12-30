# Gemini 3 Pro Integration

## Overview

This document describes the integration of Google's Gemini 3 Pro model into the QCX application. Gemini 3 Pro is Google's most advanced reasoning model with state-of-the-art capabilities for multimodal understanding, coding, and agentic tasks.

## Changes Made

### 1. Updated `lib/utils/index.ts`

Added Gemini 3 Pro as a provider option in the `getModel()` function with the following priority order:

1. **xAI (Grok)** - Primary choice if `XAI_API_KEY` is configured
2. **Gemini 3 Pro** - Secondary choice if `GEMINI_3_PRO_API_KEY` is configured *(NEW)*
3. **AWS Bedrock** - Tertiary choice if AWS credentials are configured
4. **OpenAI** - Default fallback if `OPENAI_API_KEY` is configured

The implementation includes:
- Environment variable check for `GEMINI_3_PRO_API_KEY`
- Creation of Google Generative AI client using `createGoogleGenerativeAI()`
- Model identifier: `gemini-3-pro-preview`
- Error handling with fallback to the next available provider

### 2. Updated `.env.local.example`

Added documentation for the new environment variable:

```bash
# AI Provider API Keys
# Gemini 3 Pro (Google Generative AI)
GEMINI_3_PRO_API_KEY="your_gemini_3_pro_api_key_here"
```

## Configuration

To use Gemini 3 Pro in your QCX deployment:

1. Obtain a Google AI API key from [Google AI Studio](https://aistudio.google.com/)
2. Add the API key to your `.env.local` file:
   ```bash
   GEMINI_3_PRO_API_KEY="your_actual_api_key_here"
   ```
3. Restart your development server or redeploy your application

## Model Capabilities

Gemini 3 Pro (`gemini-3-pro-preview`) supports:

- **Advanced Reasoning**: State-of-the-art reasoning capabilities with optional thinking modes
- **Multimodal Understanding**: Text, image, and file inputs
- **Tool Usage**: Function calling and tool integration
- **Large Context Window**: 1M token context window
- **Agentic Capabilities**: Excellent for complex multi-step tasks
- **Coding**: Exceptional coding and technical capabilities

## Provider Priority

The provider selection follows this priority order:

```
XAI_API_KEY exists? → Use Grok
  ↓ No
GEMINI_3_PRO_API_KEY exists? → Use Gemini 3 Pro
  ↓ No
AWS credentials exist? → Use AWS Bedrock
  ↓ No
OPENAI_API_KEY exists? → Use OpenAI (default)
```

## Technical Details

- **SDK Package**: `@ai-sdk/google` (already imported in the codebase)
- **Model ID**: `gemini-3-pro-preview`
- **API Endpoint**: Google Generative AI API
- **Vercel AI SDK Compatible**: Yes, fully compatible with the unified interface

## References

- [Google Gemini 3 Documentation](https://ai.google.dev/gemini-api/docs/gemini-3)
- [Vercel AI SDK - Google Provider](https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai)
- [Google AI Studio](https://aistudio.google.com/)
