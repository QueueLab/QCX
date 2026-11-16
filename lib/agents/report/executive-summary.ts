import { generateText } from 'ai'
import { getModel } from '@/lib/utils'

function stripJsonFences(text: string): string {
  // Try parsing as-is first — avoids stripping fence literals inside valid JSON
  try {
    JSON.parse(text)
    return text
  } catch {
    // fall through to fence stripping
  }
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  return fenced ? fenced[1].trim() : text.trim()
}

export async function executiveSummaryAgent(crossSessionContext: string, activeMessages: any[]) {
  try {
    const model = await getModel()

    const { text } = await generateText({
      model,
      maxTokens: 512,
      system: `You are a high-level geospatial intelligence analyst. Based on the provided user history and current conversation, generate:
1. A professional, concise report title (max 60 characters).
2. A 150-200 word executive summary that synthesizes the intelligence findings, observations, and spatial analysis discussed, taking into account broader system-wide context from previous sessions.

Format your response as a JSON object:
{
  "title": "The Title Here",
  "summary": "The executive summary here..."
}
Keep your response under 400 tokens. Return only the JSON object with no extra text or markdown formatting.`,
      messages: [
        { role: 'system', content: `User History Context:\n${crossSessionContext}` },
        ...activeMessages
      ],
    })

    try {
      return JSON.parse(stripJsonFences(text)) as { title: string; summary: string }
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