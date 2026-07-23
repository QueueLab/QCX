import { generateText } from 'ai'
import { getModel } from '@/lib/utils'

export async function strategicSynthesisAgent(
  sensorFusionFindings: any[],
  strategicContent: any[],
  systemPrompt?: string | null,
  domain?: string | null
) {
  try {
    const model = await getModel()

    const findingsContext = sensorFusionFindings.map(f => f.summary || JSON.stringify(f)).join('\n\n')
    const strategyContext = strategicContent.map(s => s.content).join('\n\n')

    let systemInstruction = `You are a strategic intelligence officer. Your task is to synthesize "new knowledge" narrative derived from exploration.
    Focus on insights, implications, and decisions.
    DO NOT restate sensor-fusion observations or raw data.
    Instead, explain what these findings mean for the overall mission and what strategic actions are recommended.`;

    if (systemPrompt) {
      systemInstruction += `\n\nEnsure recommendations, insights, and strategic implications align with the user's custom system prompt/business profile: "${systemPrompt}"`;
    }
    if (domain) {
      systemInstruction += `\n\nTailor the strategic assessment specifically for the business domain: ${domain}`;
    }

    systemInstruction += `\n\nFormat your response as a JSON object:
    {
      "strategicOutput": "The synthesized strategic narrative here..."
    }
    Do not include any other text or markdown formatting in your response.`;

    const { text } = await generateText({
      model,
      system: systemInstruction,
      messages: [
        { role: 'user', content: `Sensor Fusion Findings:\n${findingsContext}\n\nStrategic Content:\n${strategyContext}` }
      ],
    })

    try {
      return JSON.parse(text) as { strategicOutput: string }
    } catch (e) {
      console.error('Failed to parse AI response for strategic synthesis', {
        error: e instanceof Error ? e.message : String(e),
        preview: text.slice(0, 200)
      })
      return {
        strategicOutput: 'Strategic synthesis failed. Manual assessment of strategic implications is required.'
      }
    }
  } catch (error) {
    console.error('Error in strategicSynthesisAgent:', error)
    return {
      strategicOutput: 'Automated strategic synthesis is currently unavailable.'
    }
  }
}
