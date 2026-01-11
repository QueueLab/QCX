
import { z } from 'zod';
import { tool } from 'ai';
import { createStreamableValue } from 'ai/rsc';
import { Card } from '@/components/ui/card';
import { VideoUnderstandingSection } from '@/components/video-understanding-section';
import { ToolProps } from '.';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Zod schema for the tool parameters
const videoUnderstandingSchema = z.object({
  videoUrl: z.string().url().describe('The URL of the YouTube video to analyze.'),
  prompt: z.string().describe('A specific prompt to guide the video analysis.'),
});

// The video understanding tool
export const videoUnderstandingTool = ({ uiStream }: ToolProps) => tool({
  description: 'Analyze a video from a YouTube URL to understand its content and identify locations.',
  parameters: videoUnderstandingSchema,
  execute: async ({ videoUrl, prompt }) => {
    const stream = createStreamableValue();
    // Append the UI component to the stream
    uiStream.append(<VideoUnderstandingSection result={stream.value} />);

    // Ensure the API key is available
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_3_PRO_API_KEY;
    if (!apiKey) {
      const errorMessage = 'Missing GOOGLE_GEMINI_API_KEY. Please add it to your .env.local file.';
      console.error(errorMessage);
      uiStream.update(
        <Card className="p-4 mt-2 text-sm">
          {errorMessage}
        </Card>
      );
      stream.done({ error: errorMessage });
      return { error: errorMessage };
    }

    try {
      // Initialize the Google Generative AI client
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      // Prepare the multimodal request
      const request = {
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Analyze the video to fulfill this request: "${prompt}". Focus on identifying the geographical location shown in the video. Provide the location as a clear, concise text string.`
              },
              {
                fileData: {
                  mimeType: 'video/youtube',
                  fileUri: videoUrl,
                },
              },
            ],
          },
        ],
      };

      // Call the model to generate content
      const result = await model.generateContent(request);
      const response = result.response;
      const analysisResult = response.text();

      // Stream the result to the UI
      stream.done(analysisResult);
      return analysisResult;

    } catch (error) {
      console.error('Video understanding error:', error);
      const errorMessage = 'An error occurred while analyzing the video.';
      uiStream.update(
        <Card className="p-4 mt-2 text-sm">
          {errorMessage}
        </Card>
      );
      stream.done({ error: errorMessage });
      return { error: errorMessage };
    }
  },
});
