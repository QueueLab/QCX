'use client'

import React from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Section } from './section'
import { ToolBadge } from './tool-badge'
import { DataAnalysisResult } from '@/lib/types'
import { StreamableValue, useStreamableValue } from 'ai/rsc'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']

interface GraphSectionProps {
  result: DataAnalysisResult | string | StreamableValue<DataAnalysisResult>
}

export function GraphSection({ result }: GraphSectionProps) {
  // Check if result is a streamable value (has a value property or internal structure)
  // We use a heuristic or just try-catch if needed, but useStreamableValue must be called at the top level.
  // Actually, we can check if it looks like a streamable value.
  const isStreamable = result && typeof result === 'object' && ('value' in result || 'done' in result || (result as any)._isStreamable);

  const [streamData, error, pending] = useStreamableValue(isStreamable ? (result as any) : undefined)

  const data = isStreamable ? streamData : result;

  const chartData: DataAnalysisResult | undefined = typeof data === 'string'
    ? JSON.parse(data)
    : data as DataAnalysisResult

  if (pending && !chartData) {
    return (
      <Section className="py-2">
        <div className="animate-pulse flex space-y-4 flex-col">
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </Section>
    )
  }

  if (!chartData) return null

  const { title, description, chartType, data: plotData, config } = chartData

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return (
          <BarChart data={plotData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={config.xAxisKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {config.series.map((s, i) => (
              <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color || COLORS[i % COLORS.length]} />
            ))}
          </BarChart>
        )
      case 'line':
        return (
          <LineChart data={plotData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={config.xAxisKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {config.series.map((s, i) => (
              <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color || COLORS[i % COLORS.length]} />
            ))}
          </LineChart>
        )
      case 'area':
        return (
          <AreaChart data={plotData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={config.xAxisKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {config.series.map((s, i) => (
              <Area key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color || COLORS[i % COLORS.length]} fill={s.color || COLORS[i % COLORS.length]} />
            ))}
          </AreaChart>
        )
      case 'pie':
        return (
          <PieChart>
            <Pie
              data={plotData}
              dataKey={config.series[0].key}
              nameKey={config.xAxisKey}
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
            >
              {plotData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        )
      case 'scatter':
        return (
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" dataKey={config.xAxisKey} name={config.xAxisKey} />
            <YAxis type="number" dataKey={config.yAxisKey} name={config.yAxisKey} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Legend />
            {config.series.map((s, i) => (
              <Scatter key={s.key} name={s.name} data={plotData} fill={s.color || COLORS[i % COLORS.length]} />
            ))}
          </ScatterChart>
        )
      default:
        return <div>Unsupported chart type: {chartType}</div>
    }
  }

  return (
    <Section className="py-2">
      <div className="mb-2">
        <ToolBadge tool="dataAnalysis">Graph: {title}</ToolBadge>
      </div>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </Section>
  )
}
