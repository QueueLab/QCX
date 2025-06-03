import { createMcpHandler } from '@vercel/mcp-adapter';
import { getTools } from '@/lib/agents/tools'; // Corrected path
import { OpenAI } from '@ai-sdk/openai'; // Using OpenAI as an example

// Initialize AI provider clients (ensure API keys are set in environment)
// For this example, assuming OPENAI_API_KEY is available.
// The actual model name/ID could also come from an environment variable.
let openai;
try {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    // You can add other OpenAI options here if needed, like organization
  });
} catch (error) {
  console.error("Failed to initialize OpenAI client:", error);
  // Handle client initialization failure, e.g., by not defining models
  // or by having a fallback mechanism if appropriate for your application.
  // For now, if it fails, the models object might be empty or cause runtime errors later.
}

// System prompt (moved from researcher.tsx)
const currentDate = new Date().toLocaleString();
const system_prompt = `As a comprehensive AI assistant, you can search the web, retrieve information from URLs, and understand geospatial queries to assist the user.
Current date and time: ${currentDate}.

Tool Usage Guide:
- For general web searches for factual information: Use the 'search' tool. This tool returns a list of search results with snippets and links.
- For retrieving content from specific URLs provided by the user: Use the 'retrieve' tool. (Do not use this for URLs found in search results). This tool returns the title, content, and URL of the page.
- For any questions involving locations, places, addresses, geographical features, finding businesses or points of interest, distances between locations, or directions: You MUST use the 'geospatialQueryTool'. This tool will process the query and return structured data including latitude, longitude, place name, address, and a map preview URL if available.
  Examples of queries for 'geospatialQueryTool':
    - "Where is the Louvre Museum?"
    - "Show me cafes near the current map center."
    - "How far is it from New York City to Los Angeles?"
    - "What are some parks in San Francisco?"
  When you use 'geospatialQueryTool', the system will handle displaying map information based on its results.

Always aim to directly address the user's question. If using information from a tool (like web search), cite the source URL.
Match the language of your response to the user's language.`;

const { POST } = createMcpHandler({
  models: openai ? {
    // Using a common model name, actual model can be configured via env var too
    // e.g. process.env.OPENAI_MODEL_ID || 'gpt-3.5-turbo'
    'default': openai.chat(process.env.OPENAI_MODEL_ID || 'gpt-4o-mini'), // Defaulting to gpt-4o-mini
  } : {}, // Provide an empty object or handle error if openai client failed
  tools: getTools(),
  initialMessages: [
    {
      role: 'system',
      content: system_prompt,
    },
  ],
  // You might need to add further options here based on @vercel/mcp-adapter documentation,
  // such as handlers for onToolCall, onToolResult, onCompletion, etc., if you need
  // more granular control or logging on the server side.
});

export { POST };
