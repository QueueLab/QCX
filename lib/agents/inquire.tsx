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

  // OPTIMIZATION: Only update UI once with initial state instead of on every stream update
  // This prevents unnecessary re-renders of the entire Copilot component
  uiStream.update(
    <Copilot inquiry={{ value: currentInquiry }} />
  );

  let finalInquiry: PartialInquiry = {};
  const result = await streamObject({
    model: (await getModel()) as LanguageModel,
    system: `You are a helpful assistant that gathers clarifying information from the user. 
    Generate a structured inquiry with a clear question, multiple choice options, and optionally allow free-text input.
    Ensure the inquiry is concise and helps narrow down the user's intent.`,
    messages,
    schema: inquirySchema,
  });

  // OPTIMIZATION: Collect all partial objects and only update UI with final state
  // This reduces the number of component re-renders significantly
  const partialObjects: PartialInquiry[] = [];
  
  for await (const obj of result.partialObjectStream) {
    if (obj) {
      partialObjects.push(obj);
      currentInquiry = obj;
      objectStream.update(obj);
      finalInquiry = obj;
    }
  }

  objectStream.done();
  
  // OPTIMIZATION: Single final UI update with the complete inquiry
  // The Copilot component will handle streaming its own state updates
  uiStream.update(
    <Copilot inquiry={{ value: finalInquiry }} />
  );

  return finalInquiry;
}
