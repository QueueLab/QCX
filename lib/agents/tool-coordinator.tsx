import { generateObject } from 'ai'
import { z } from 'zod'
import { getModel } from '@/lib/models'
import { Message } from 'ai/react'
import { getTools } from '@/lib/agents/tools'
import { ToolResultPart } from '@/lib/types'
import { createStreamableUI } from '@/lib/streamable'

// ——————————————————————————————————————
// 1. Schemas
// ——————————————————————————————————————

const toolStepSchema = z.object({
  toolName: z.string().describe('Exact tool name, e.g. "geospatialQueryTool"'),
  toolArgs: z.record(z.any()).describe('Arguments for the tool call'),
  dependencyIndices: z.array(z.number()).optional().describe('0-based indices of steps this step depends on'),
  purpose: z.string().describe('Why this tool is being called')
})

const toolPlanSchema = z.object({
  reasoning: z.string().describe('Full explanation of the multi-step plan'),
  steps: z.array(toolStepSchema)
})

export type ToolPlan = z.infer<typeof toolPlanSchema>
export type ToolStep = z.infer<typeof toolStepSchema>

// ——————————————————————————————————————
// 2. Plan generation
// ——————————————————————————————————————

export async function toolCoordinator(messages: Message[]): Promise<ToolPlan> {
  const model = getModel()

  const toolsObj = getTools({
    uiStream: createStreamableUI(),
    fullResponse: ''
  })

  const toolDescriptions = Object.values(toolsObj).map(tool => ({
    name: tool.toolName,
    description: tool.description,
    parameters: tool.parameters
  }))

  const systemPrompt = `You are an expert Tool Coordinator. Create a precise multi-step plan using only the available tools.

Rules:
- Use exact toolName values.
- Specify dependencyIndices when a step needs prior results.
- Output must match the JSON schema exactly.

Available Tools:
${JSON.stringify(toolDescriptions, null, 2)}
`

  const { object } = await generateObject({
    model,
    system: systemPrompt,
    messages,
    schema: toolPlanSchema
  })

  return object
}

// ——————————————————————————————————————
// 3. Execution
// ——————————————————————————————————————

interface ExecutionContext {
  uiStream: ReturnType<typeof createStreamableUI>
  fullResponse: string
}

export async function executeToolPlan(
  plan: ToolPlan,
  context: ExecutionContext
): Promise<ToolResultPart[]> {
  const { uiStream, fullResponse } = context

  const toolsObj = getTools({ uiStream, fullResponse })
  const toolMap = new Map(Object.values(toolsObj).map(t => [t.toolName, t]))

  const results = new Map<number, any>()
  const toolResults: ToolResultPart[] = []

  const getDeps = (indices: number[] = []) =>
    indices.map(i => {
      if (!results.has(i)) throw new Error(`Dependency step ${i} not executed yet`)
      return results.get(i)
    })

  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i]
    const tool = toolMap.get(step.toolName)

    let result: any = { error: `Tool "${step.toolName}" not found` }

    try {
      if (!tool) throw new Error(`Tool "${step.toolName}" not found`)

      const depResults = step.dependencyIndices ? getDeps(step.dependencyIndices) : []

      const args = {
        ...step.toolArgs,
        ...(depResults.length > 0 && { _dependencyResults: depResults })
      }

      console.log(`[ToolCoordinator] Step ${i}: ${step.toolName}`, args)
      result = await tool.execute(args)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[ToolCoordinator] Step ${i} failed:`, err)
      result = { error: msg }
    }

    results.set(i, result)
    toolResults.push({
      toolName: step.toolName,
      toolCallId: `coord-${i}`,
      result
    })
  }

  return toolResults
}

// ——————————————————————————————————————
// 4. Aggregation (for final LLM)
// ——————————————————————————————————————

export function aggregateToolResults(toolResults: ToolResultPart[], plan: ToolPlan): string {
  let summary = `# Tool Coordinator Execution Summary

### Plan Reasoning
${plan.reasoning}

### Step Results
`

  toolResults.forEach((tr, i) => {
    const step = plan.steps[i]
    const hasError = tr.result && typeof tr.result === 'object' && 'error' in tr.result

    summary += `
#### Step ${i + 1}: ${step.purpose} (\`${step.toolName}\`)
`

    if (hasError) {
      summary += `**Status:** Failed
**Error:** ${tr.result.error}
`
    } else {
      const json = JSON.stringify(tr.result, null, 2)
      const truncated = json.length > 500 ? json.slice(0, 500) + '...' : json
      summary += `**Status:** Success
**Result:**
\`\`\`json
${truncated}
\`\`\`
`
    }
  })

  summary += `
---
**INSTRUCTION:** Using the information above and the original user query, write a clear, natural final response. 
Do not mention the Tool Coordinator, planning steps, or internal process — only the synthesized answer.
`

  return summary
}
