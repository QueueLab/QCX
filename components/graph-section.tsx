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
  result: DataAnalysisResult | string | StreamableValue<DataAnalysisResult> | StreamableValue<string>
}

export function GraphSection({ result }: GraphSectionProps) {
  if (!result) return null;

  // Check if result is a static DataAnalysisResult object
  // A StreamableValue is an opaque object and shouldn't have these properties
  const isStatic = typeof result === 'object' && result !== null &&
    ('chartType' in (result as any) || 'title' in (result as any) || 'data' in (result as any));
  const isString = typeof result === 'string';

  if (isStatic || isString) {
    return <GraphCard data={result as any} />;
  }

  // Handle case where it might be a streamable value or something else
  // We use a safe wrapper to avoid crashing if useStreamableValue throws
  return <StreamedGraphSection result={result as any} />;
}

function StreamedGraphSection({ result }: { result: StreamableValue<any> }) {
  const [data, error, pending] = useStreamableValue(result);

  if (pending && !data) {
    return (
      <Section className="py-2">
        <div className="animate-pulse flex space-y-4 flex-col">
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </Section>
    );
  }

  return <GraphCard data={data} />;
}

function GraphCard({ data, pending }: { data: any, pending?: boolean }) {
  const chartData: DataAnalysisResult | undefined = React.useMemo(() => {
    if (!data) return undefined;
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch (e) {
        console.error('Error parsing graph data:', e);
        return undefined;
      }
    }
    return data as DataAnalysisResult;
  }, [data]);

  if (!chartData) return null;

  const { title, description, chartType, data: plotData, config } = chartData;

  const renderChart = () => {
    if (!plotData || !config) return <div className="flex items-center justify-center h-full text-muted-foreground italic">Missing chart data or configuration</div>;

    const themeColors = {
      text: 'hsl(var(--foreground))',
      grid: 'hsl(var(--border))',
      tooltip: {
        bg: 'hsl(var(--card))',
        text: 'hsl(var(--card-foreground))',
        border: 'hsl(var(--border))'
      }
    }

    const commonAxisProps = {
      stroke: themeColors.text,
      fontSize: 12,
      tickLine: false,
      axisLine: false,
    }

    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={plotData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} vertical={false} />
              <XAxis 
                dataKey={config.xAxisKey} 
                {...commonAxisProps}
                dy={10}
              />
              <YAxis {...commonAxisProps} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: themeColors.tooltip.bg, 
                  color: themeColors.tooltip.text,
                  borderColor: themeColors.tooltip.border,
                  borderRadius: '8px'
                }} 
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              {config.series?.map((s, i) => (
                <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color || COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={plotData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} vertical={false} />
              <XAxis 
                dataKey={config.xAxisKey} 
                {...commonAxisProps}
                dy={10}
              />
              <YAxis {...commonAxisProps} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: themeColors.tooltip.bg, 
                  color: themeColors.tooltip.text,
                  borderColor: themeColors.tooltip.border,
                  borderRadius: '8px'
                }} 
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              {config.series?.map((s, i) => (
                <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color || COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );
      case 'area':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={plotData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} vertical={false} />
              <XAxis 
                dataKey={config.xAxisKey} 
                {...commonAxisProps}
                dy={10}
              />
              <YAxis {...commonAxisProps} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: themeColors.tooltip.bg, 
                  color: themeColors.tooltip.text,
                  borderColor: themeColors.tooltip.border,
                  borderRadius: '8px'
                }} 
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              {config.series?.map((s, i) => (
                <Area key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color || COLORS[i % COLORS.length]} fill={s.color || COLORS[i % COLORS.length]} fillOpacity={0.3} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={plotData}
                dataKey={config.series?.[0]?.key}
                nameKey={config.xAxisKey}
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={{ fill: themeColors.text, fontSize: 12 }}
              >
                {plotData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: themeColors.tooltip.bg, 
                  color: themeColors.tooltip.text,
                  borderColor: themeColors.tooltip.border,
                  borderRadius: '8px'
                }} 
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} />
              <XAxis 
                type="number" 
                dataKey={config.xAxisKey} 
                name={config.xAxisKey} 
                {...commonAxisProps}
                dy={10}
              />
              <YAxis type="number" dataKey={config.yAxisKey} name={config.yAxisKey} {...commonAxisProps} />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }} 
                contentStyle={{ 
                  backgroundColor: themeColors.tooltip.bg, 
                  color: themeColors.tooltip.text,
                  borderColor: themeColors.tooltip.border,
                  borderRadius: '8px'
                }} 
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              {config.series?.map((s, i) => (
                <Scatter key={s.key} name={s.name} data={plotData} fill={s.color || COLORS[i % COLORS.length]} />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        );
      default:
        return (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Unsupported chart type: {chartType || 'None'}
          </div>
        );
    }
  };

  return (
    <Section className="py-2">
      <div className="mb-2">
        <ToolBadge tool="dataAnalysis">Graph: {title || 'Untitled'}</ToolBadge>
      </div>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">{title || 'Data Analysis'}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            {renderChart()}
          </div>
        </CardContent>
      </Card>
    </Section>
  );
}
