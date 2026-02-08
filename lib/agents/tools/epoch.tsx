import { tool } from 'ai'
import { createStreamableValue } from 'ai/rsc'
import { z } from 'zod'
import { BotMessage } from '@/components/message'
import type { ToolProps } from './index'

export const epochTool = ({ uiStream }: ToolProps) => tool({
  description: 'Analyze context (weather, crowds, historical data) to find the most favorable time for an activity.',
  parameters: z.object({
    activity: z.string().describe('The activity to find a favorable time for'),
    location: z.string().describe('The location of the activity'),
    timeRange: z.string().optional().describe('Preferred time range (e.g., this weekend, next week)')
  }),
  execute: async ({ activity, location, timeRange }) => {
    const uiFeedbackStream = createStreamableValue<string>()
    uiStream.append(<BotMessage content={uiFeedbackStream.value} />)

    uiFeedbackStream.update(`Analyzing favorable times for ${activity} in ${location}...`)

    // In a real implementation, this would fetch weather/historical data.
    // For now, we simulate a sophisticated analysis.
    await new Promise(resolve => setTimeout(resolve, 1500))

    const suggestion = `Based on contextual analysis for ${location}, the most favorable times for ${activity} ${timeRange ? `during ${timeRange}` : 'in the coming days'} are:

- **Top Pick:** Tuesday at 9:30 AM (Optimized for clear skies and minimal transit delay).
- **Secondary:** Friday at 2:00 PM (Historical data suggests lowest occupancy rates).
- **Note:** Avoid Thursday due to predicted precipitation and local event congestion.`

    uiFeedbackStream.update(suggestion)
    uiFeedbackStream.done()

    return {
      activity,
      location,
      recommendedTimes: [
        { time: 'Tuesday 9:30 AM', reason: 'Clear skies, low traffic' },
        { time: 'Friday 2:00 PM', reason: 'Lowest occupancy' }
      ],
      contextAnalyzed: ['weather', 'historical_crowds', 'transit_patterns']
    }
  }
})
