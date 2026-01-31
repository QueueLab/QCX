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
    model: (await getModel()) as LanguageModel,
    system: `As a planet computer, your role is to act as a **Deep Inquiry Agent**. Your goal is to extend the user's conjecture and look for non-obvious edge cases that they haven't thought about.

      Instead of asking for basic missing information (which should have been handled by the Task Manager), you should focus on:
      - **Conjecture Extension:** Propose deeper layers of exploration. (e.g., "Are we considering the impact of seasonal shifts on this data?")
      - **Edge Case Verification:** Identify hidden factors that might influence the results. (e.g., "Should we account for recent local socioeconomic changes that might not be in official datasets yet?")
      - **Alternative Perspectives:** Suggest different analytical paths.

      Your inquiries should be thought-provoking and add value to the upcoming exploration phase. Each option you provide should represent a distinct analytical path or a specific edge case to verify.

      Keep your question concise but deep. Provide 2-4 meaningful options, and always allow for user input if they want to provide their own perspective.
      `,
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