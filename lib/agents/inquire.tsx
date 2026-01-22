import { CoreMessage, LanguageModel, streamObject } from 'ai';
import { inquirySchema } from '@/lib/schema/inquiry';
import { getModel } from '../utils';

export async function inquire(
  messages: CoreMessage[]
) {
  const result = streamObject({
    model: (await getModel()) as LanguageModel,
    system: `As a professional search engine, your job is to help the user refine their search query by asking them for more information.
    You must only ask one question at a time.
    You should also provide a set of suggestions for the user to choose from.
    You must only ask a question if it is necessary to provide a better search result.
    If the user's query is already specific enough, you should not ask a question.
    `,
    messages,
    schema: inquirySchema,
  });

  return result;
}
