import { generateText } from 'ai'
import { getModel } from '@/lib/utils'

export async function executiveSummaryAgent(
  crossSessionContext: string,
  activeMessages: any[],
  systemPrompt?: string | null,
  domain?: string | null
) {
  try {
    const model = await getModel()

    let systemInstruction = `You are a high-level geospatial intelligence analyst. Based on the provided user history and current conversation, generate:
    1. A professional, concise report title (max 60 characters).
    2. A 150-200 word executive summary that synthesizes the intelligence findings, observations, and spatial analysis discussed, taking into account broader system-wide context from previous sessions.`;

    if (systemPrompt) {
      systemInstruction += `\n\nWhen writing, align the tone, persona, and focus with the user's custom system prompt/business profile: "${systemPrompt}"`;
    }
    if (domain) {
      systemInstruction += `\n\nThis intelligence report is generated specifically for the business domain: ${domain}. Ensure the observations and summary are tailored to this business context.`;
    }

    systemInstruction += `\n\nFormat your response as a JSON object:
    {
      "title": "The Title Here",
      "summary": "The executive summary here..."
    }
    Do not include any other text or markdown formatting in your response.`;

    const { text } = await generateText({
      model,
      system: systemInstruction,
      messages: [
        { role: 'system', content: `User History Context:\n${crossSessionContext}` },
        ...activeMessages
      ],
    })

    try {
      return JSON.parse(text) as { title: string; summary: string }
    } catch (e) {
      console.error('Failed to parse AI response for executive summary', {
        error: e instanceof Error ? e.message : String(e),
        preview: text.slice(0, 200)
      })
      return {
        title: 'QCX Intelligence Analysis',
        summary: 'Executive summary generation failed, but manual review of the intelligence assessment is recommended.'
      }
    }
  } catch (error) {
    console.error('Error in executiveSummaryAgent:', error)
    return {
      title: 'QCX Intelligence Analysis',
      summary: 'Automated executive summary is currently unavailable.'
    }
  }
}
