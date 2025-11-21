import { generateObject } from 'ai'
import { z } from 'zod'
import { getModel } from '@/lib/models'
import { Message } from 'ai/react'
import { getTools } from '@/lib/agents/tools' // ← Fixed import
import { ToolResultPart } from '@/lib/types'
import { createStreamableUI } from '@/lib/streamable'

// --- 1. Schema Definition for Structured Planning ---

const toolStepSchema = z.object({
  toolName: z.string().describe('The name of the tool to be executed (e.g., "geospatialQueryTool", "searchTool").'),
  toolArgs: z.record(z.any()).describe('The arguments for the tool function call.'),
  dependencyIndices: z.array(z.number()).optional().describe('An array of indices of previous steps whose results are required for this step. Use 0-based indexing.'),
  purpose: z.string().describe('A brief explanation of why this tool is being called in this step.')
})

const toolPlanSchema = z.object({
  reasoning: z.string().describe('A detailed explanation of the multi-step plan to answer the user query.'),
  steps: z.array(toolStepSchema).describe('A sequence of tool execution steps to fulfill the user request.')
})

export type ToolPlan = z.infer<typeof toolPlanSchema>
export type ToolStep = z.infer<typeof toolStepSchema>

// --- 2. Tool Coordinator Planning Function ---

/**
 * Analyzes the user query and generates a structured, multi-step tool execution plan.
 */
export async function toolCoordinator(messages: Message[]): Promise<ToolPlan> {
  const model = getModel()

  // getTools now returns an object map: { toolName: toolDefinition }
  const toolsObj = getTools({
    uiStream: createStreamableUI(), // dummy stream; real one will be injected during execution
    fullResponse: ''
  })

  const toolDescriptions = Object.values(toolsObj).map(tool => ({
    name: tool.toolName,
    description: tool.description,
    parameters: tool.parameters
  }))

  const systemPrompt = `You are an expert Tool Coordinator. Your task is to analyze the user's request and create a structured, multi-step plan to answer it using the available tools.

Rules:
1. The plan must be a sequence of steps.
2. For steps that depend on the output of a previous step, specify the 'dependencyIndices' array (0-based index).
3. You must use the exact 'toolName' and 'toolArgs' structure as defined in the tool descriptions.
4. The final output must strictly adhere to the provided JSON schema.

Available Tools:
${JSON.stringify(toolDescriptions, null, 2)}
`

  const { object } = await generateObject({
    model: model,
    system: systemPrompt,
    messages: messages,
    schema: toolPlanSchema
  })

  return object
}

// --- 3. Tool Execution Function ---

interface ExecutionContext {
  uiStream: ReturnType<typeof createStreamableUI>
  fullResponse: string
}

/**
 * Executes the tool plan sequentially while respecting dependencies.
 * Always returns one ToolResultPart per step (preserves 1:1 alignment with plan.steps).
 */
export async function executeToolPlan(
  plan: ToolPlan,
  context: ExecutionContext
): Promise<ToolResultPart[]> {
  const { uiStream, fullResponse } = context

  // getTools returns object map → convert to array and build Map for lookup
  const toolsObj = getTools({ uiStream, fullResponse })
  const toolsArray = Object.values(toolsObj)
  const toolMap = new Map(toolsArray.map(tool => [tool.toolName, tool]))

  const results: Map<number, any> = new Map()
  const toolResults: ToolResultPart[] = []

  const getDependencyResults = (indices: number[] = []) => {
    return indices.map(idx => {
      if (!results.has(idx)) {
        throw new Error(`Dependency step ${idx} has not been executed yet.`)
      }
      return results.get(idx)
    })
  }

  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i]
    const tool = toolMap.get(step.toolName)

    let result: any
    let errorMessage: string | undefined

    try {
      if (!tool) {
        throw new Error(`Tool "${step.toolName}" not found among available tools.`)
      }

      const dependencyResults = step.dependencyIndices
        ? getDependencyResults(step.dependencyIndices)
        : []

      const argsWithDependencies = {
        ...step.toolArgs,
        ...(dependencyResults.length > 0 && { _dependencyResults: dependencyResults })
      }

      console.log(`Executing step ${i}: ${step.toolName}`, argsWithDependencies)

      result = await tool.execute(argsWithDependencies)
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err)
      console.error(`Error in step ${i} (${step.toolName}):`, err)
      result = { error: errorMessage }
    }

    // Always store result (even on error) and push a ToolResultPart
    results.set(i, result)

    toolResults.push({
      toolName: step.toolName,
      toolCallId: `coord-${i}`,
      result
    })
  }

  return toolResults
}

// --- 4. Result Aggregation Function ---

/**
 * Aggregates the tool results into a markdown summary for the final agent.
 */
export function aggregateToolResults(toolResults: ToolResultPart[], plan: ToolPlan): string {
  let summary = `# Tool Coordinator Execution Summary

The Tool Coordinator executed a multi-step plan to address the user's request.

### Plan Reasoning
${plan.reasoning}

### Execution Steps and Results
`

  toolResults.forEach((toolResult, index) => {
    const step = plan.steps[index]
    const result = toolResult.result
    const hasError = result && typeof result === 'object' && 'error' in result

    summary += `
#### Step ${index + 1}: ${step.purpose} (\`${step.toolName}\`)
`

    if (hasError) {
      summary += `**Status:** ❌ FAILED
**Error:** ${result.error}
`
    } else {
      const resultStr M= JSON.stringify(result, null, 2)
      const truncated = resultStr.length > 500 ? resultStr.substring(0, 500) + '...' : resultStr
      summary += `**Status:** ✅ SUCCESS
**Result Summary:**
\`\`\`json
${truncated}
\`\`\`
`
    }
  })

  summary += `
---
**INSTRUCTION:** Using the information above and the original user messages, generate a final, coherent, and helpful response to the user. 
Do not mention the Tool Coordinator, internal planning, or execution details — only present the synthesized answer naturally.
`

  return summary
}
