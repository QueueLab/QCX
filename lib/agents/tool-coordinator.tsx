import { generateObject } from 'ai'
import { z } from 'zod'
import { CoreMessage } from 'ai'
import { getTools } from '@/lib/agents/tools'
import { ToolResultPart } from '@/lib/types'

// ——————————————————————————————————————
// Fallbacks if the original files don't exist yet
// ——————————————————————————————————————

let getModel: () => any
let createStreamableUI: () => any

try {
  // Try the most common real locations first
  const models = require('@/lib/models')
  getModel = models.getModel || models.default || (() => null)
} catch {
  try {
    const mod = require('@/lib/ai/models')
    getModel = mod.getModel || mod.default
  } catch {
    getModel = () => {
      throw new Error('getModel not available — check your @/lib/models setup')
    }
  }
}

try {
  const streamable = require('@/lib/streamable')
  createStreamableUI = streamable.createStreamableUI || streamable.default
} catch {
  try {
    const s = require('@/lib/ui/streamable')
    createStreamableUI = s.createStreamableUI
  } catch {
    // Minimal no-op version that won't break tool calling
    createStreamableUI = () => ({
      append: () => {},
      update: () => {},
      done: () => {},
      value: null
    })
  }
}

// ——————————————————————————————————————
// Schemas
// ——————————————————————————————————————

const toolStepSchema = z.object({
  toolName: z.string(),
  toolArgs: z.record(z.any()),
  dependencyIndices: z.array(z.number()).optional(),
  purpose: z.string()
})

const toolPlanSchema = z.object({
  reasoning: z.string(),
  steps: z.array(toolStepSchema)
})

export type ToolPlan = z.infer<typeof toolPlanSchema>
export type ToolStep = z.infer<typeof toolStepSchema>

// ——————————————————————————————————————
// 1. Plan Generation
// ——————————————————————————————————————

export async function toolCoordinator(messages: CoreMessage[]): Promise<ToolPlan> {
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

  const systemPrompt = `You are an expert Tool Coordinator. Create a precise multi-step plan using only these tools.

Rules:
- Use exact toolName from the list.
- Use dependencyIndices (0-based) when a step needs prior results.
- Output must be valid JSON matching the schema.

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
// 2. Execution
// ——————————————————————————————————————

interface ExecutionContext {
  uiStream: any
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

  const resolveDeps = (indices: number[] = []) =>
    indices.map(i => {
      if (!results.has(i)) throw new Error(`Dependency step ${i} missing`)
      return results.get(i)
    })

  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i]
    const tool = toolMap.get(step.toolName)

    let result: any = { error: `Tool "${step.toolName}" not found` }

    try {
      if (!tool) throw new Error(`Tool not found: ${step.toolName}`)

      const deps = step.dependencyIndices ? resolveDeps(step.dependencyIndices) : []
      const args = {
        ...step.toolArgs,
        ...(deps.length > 0 && { _dependencyResults: deps })
      }

      console.log(`[ToolCoordinator] Step ${i}: ${step.toolName}`)
      result = await tool.execute(args)
    } catch (err: any) {
      const msg = err?.message || String(err)
      console.error(`[ToolCoordinator] Step ${i} failed:`, msg)
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
// 3. Aggregation
// ——————————————————————————————————————

export function aggregateToolResults(toolResults: ToolResultPart[], plan: ToolPlan): string {
  let out = `# Tool Coordinator Results

### Plan
${plan.reasoning}

### Steps
`

  toolResults.forEach((tr, i) => {
    const step = plan.steps[i]
    const hasError = tr.result && typeof tr.result === 'object' && 'error' in tr.result

    out += `\n#### Step ${i + 1}: ${step.purpose} (\`${step.toolName}\`)`

    if (hasError) {
      out += `\n**Status:** Failed\n**Error:** ${tr.result.error}`
    } else {
      const json = JSON.stringify(tr.result, null, 2)
      const truncated = json.length > 600 ? json.slice(0, 600) + '...' : json
      out += `\n**Status:** Success\n**Result:**\n\`\`\`json\n${truncated}\n\`\`\``
    }
  })

  out += `\n\n---\n**INSTRUCTION:** Write a natural, helpful final answer using only the information above. Do not mention tools, steps, or internal process.`

  return out
}
