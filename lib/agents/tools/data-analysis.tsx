import { createStreamableValue } from 'ai/rsc'
import { dataAnalysisSchema } from '@/lib/schema/data-analysis'
import { ToolProps } from '.'
import { DataAnalysisResult } from '@/lib/types'
import { GraphSection } from '@/components/graph-section'

export const dataAnalysisTool = ({ uiStream }: ToolProps) => ({
  description: 'Analyze data and generate a structured representation for visualization in a graph or chart. Use this tool when the user asks for a chart, graph, or data visualization, or when you have structured data (like from a CSV or search results) that would be better understood visually.',
  parameters: dataAnalysisSchema,
  execute: async (result: DataAnalysisResult) => {
    const streamResults = createStreamableValue<DataAnalysisResult>()

    uiStream.append(<GraphSection result={streamResults.value} />)

    streamResults.done(result)

    return result
  }
})
