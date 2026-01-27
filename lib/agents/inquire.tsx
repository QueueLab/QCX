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
  messages: CoreMessage[]
) {
  const objectStream = createStreamableValue<PartialInquiry>();
  let currentInquiry: PartialInquiry = {};

  // Update the UI stream with the Copilot component, passing only the serializable value
  uiStream.update(
    <Copilot inquiry={{ value: currentInquiry }} />
  );

  let finalInquiry: PartialInquiry = {};
  const result = await streamObject({
    model: getModel() as LanguageModel,
    system: `...`, // Your system prompt remains unchanged
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