import { CoreMessage, streamText } from 'ai';
import { researcher } from '@/lib/agents/researcher';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: CoreMessage[] } = await req.json();

  const result = await researcher(messages);

  return new Response(result.textStream);
}
