import { Copilot } from '@/components/copilot';
import { createStreamableUI, createStreamableValue } from 'ai/rsc';
import { CoreMessage, LanguageModel, streamObject } from 'ai';
import { PartialInquiry, inquirySchema } from '@/lib/schema/inquiry';
import { getModel } from '../utils';

// Define a plain object type for the inquiry prop
interface InquiryProp {
  value: PartialInquiry;
}

export async function inquire(
  uiStream: ReturnType<typeof createStreamableUI>,
  messages: CoreMessage[],
  userId?: string,
  chatId?: string
) {
  const objectStream = createStreamableValue<PartialInquiry>();
  let currentInquiry: PartialInquiry = {};

  // Update the UI stream with the Copilot component, passing only the serializable value
  uiStream.update(
    <Copilot inquiry={{ value: currentInquiry }} />
  );

  let finalInquiry: PartialInquiry = {};
  const result = await streamObject({
    model: (await getModel(false, userId, chatId)) as LanguageModel,
    system: `As a planet computer, your goal is to help the user narrow down their query for more efficient research.
    Ask a clear and concise question to clarify the user's intent or to get missing information.
    For geospatial queries, focus on location, time, or specific travel needs.
    Provide a few suggested responses to guide the user.`,
    messages,
    schema: inquirySchema,
  });

  for await (const obj of result.partialObjectStream) {
    if (obj) {
      // Update the local state
      currentInquiry = obj;
      // Update the stream with the new serializable value
      objectStream.update(obj);
      finalInquiry = obj;

      // Update the UI stream with the new inquiry value
      uiStream.update(
        <Copilot inquiry={{ value: currentInquiry }} />
      );
    }
  }

  objectStream.done();
  // Final UI update
  uiStream.update(
    <Copilot inquiry={{ value: finalInquiry }} />
  );

  return finalInquiry;
}
