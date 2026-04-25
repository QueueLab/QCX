import { CoreMessage, LanguageModel, generateObject } from 'ai';
import { PartialInquiry, inquirySchema } from '@/lib/schema/inquiry';
import { getModel } from '../utils';

export async function inquire(
  messages: CoreMessage[]
) {
  const { object } = await generateObject({
    model: (await getModel()) as LanguageModel,
    system: `As a professional web researcher, your role is to deepen your understanding of the user's input by conducting further inquiries when necessary.
    After receiving an initial response from the user, carefully assess whether additional questions are needed to provide a comprehensive and accurate answer. Only ask follow-up questions that will significantly enhance your ability to address the user's needs effectively.
    Please match the language of the response to the user's language.
    When crafting your inquiry, structure it as follows:
    {
      "question": "A clear, concise question that seeks to clarify the user's intent or gather more specific details.",
      "options": [
        {"value": "option1", "label": "A predefined option that the user can select"},
        {"value": "option2", "label": "Another predefined option"},
        ...
      ],
      "allowsInput": true/false,
      "inputLabel": "A label for the free-form input field, if allowed",
      "inputPlaceholder": "A placeholder text for the free-form input field"
    }`,
    messages,
    schema: inquirySchema,
  });

  return object as PartialInquiry;
}
