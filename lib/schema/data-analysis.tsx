import { DeepPartial } from 'ai'
import { z } from 'zod'

export const dataAnalysisSchema = z.object({
  title: z.string().describe('The title of the chart'),
  description: z.string().optional().describe('A brief description of the chart'),
  chartType: z.enum(['bar', 'line', 'pie', 'area', 'scatter']).describe('The type of chart to render'),
  data: z.array(z.record(z.any())).describe('The data points for the chart'),
  config: z.object({
    xAxisKey: z.string().describe('The key in the data object to use for the X axis'),
    yAxisKey: z.string().optional().describe('The key in the data object to use for the Y axis (for scatter charts)'),
    series: z.array(z.object({
      key: z.string().describe('The key in the data object for this series'),
      name: z.string().describe('The display name for this series'),
      color: z.string().optional().describe('Optional hex color for this series')
    })).describe('The series to be plotted')
  }).describe('Configuration for the chart layout'),
  geospatial: z.array(z.object({
    latitude: z.number(),
    longitude: z.number(),
    label: z.string().optional()
  })).optional().describe('Optional geospatial data points to be displayed on a map')
})

export type PartialDataAnalysis = DeepPartial<typeof dataAnalysisSchema>
