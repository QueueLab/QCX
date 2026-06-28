import { generateText } from 'ai'
import { getModel } from '@/lib/utils'
import { recordUsageEvent } from '@/lib/actions/usage'

export async function strategicSynthesisAgent(userId: string, chatId: string, sensorFusionFindings: any[], strategicContent: any[]) {
  try {
    const { model, modelId } = await getModel()

    const findingsContext = sensorFusionFindings.map(f => f.summary || JSON.stringify(f)).join('\n\n')
    const strategyContext = strategicContent.map(s => s.content).join('\n\n')

    const result = await generateText({
      model,
      system: `You are a strategic intelligence officer. Your task is to synthesize "new knowledge" narrative derived from exploration.
      Focus on insights, implications, and decisions.
      DO NOT restate sensor-fusion observations or raw data.
      Instead, explain what these findings mean for the overall mission and what strategic actions are recommended.

      Format your response as a JSON object:
      {
        "strategicOutput": "The synthesized strategic narrative here..."
      }
      Do not include any other text or markdown formatting in your response.`,
      messages: [
        { role: 'user', content: `Sensor Fusion Findings:\n${findingsContext}\n\nStrategic Content:\n${strategyContext}` }
      ],
    })

    if (userId) {
      recordUsageEvent({
        userId,
        chatId,
        kind: 'llm',
        source: modelId,
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
        totalTokens: result.usage.totalTokens
      }).catch(console.error)
    }

    try {
      return JSON.parse(result.text) as { strategicOutput: string }
    } catch (e) {
      console.error('Failed to parse AI response for strategic synthesis', {
        error: e instanceof Error ? e.message : String(e),
        preview: result.text.slice(0, 200)
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
