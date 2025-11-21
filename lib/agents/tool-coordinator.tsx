import { generateObject } from 'ai'
import { z } from 'zod'
import { getModel } from '@/lib/models'
import { Message } from 'ai/react'
import { getTools } from '@/lib/tools'
import { ToolResultPart } from '@/lib/types'

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
  const tools = getTools({}) // Get tool definitions for the prompt

  const toolDescriptions = tools.map(tool => ({
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

/**
 * Executes the tool plan, handling dependencies and parallel execution.
 */
export async function executeToolPlan(plan: ToolPlan): Promise<ToolResultPart[]> {
  const allTools = getTools({})
  const toolMap = new Map(allTools.map(tool => [tool.toolName, tool]))
  const results: Map<number, any> = new Map()
  const toolResults: ToolResultPart[] = []

  // Function to get results of dependencies
  const getDependencyResults = (indices: number[]) => {
    return indices.map(index => {
      if (!results.has(index)) {
        throw new Error(\`Dependency step \${index} has not been executed yet.\`)
      }
      return results.get(index)
    })
  }

  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i]
    const tool = toolMap.get(step.toolName)

    if (!tool) {
      console.error(\`Tool \${step.toolName} not found.\`)
      results.set(i, { error: \`Tool \${step.toolName} not found.\` })
      continue
    }

    try {
      const dependencyResults = step.dependencyIndices ? getDependencyResults(step.dependencyIndices) : []
      
      // Inject dependency results into tool arguments for the tool to use
      const argsWithDependencies = {
        ...step.toolArgs,
        _dependencyResults: dependencyResults.length > 0 ? dependencyResults : undefined
      }

      console.log(\`Executing step \${i}: \${step.toolName} with args: \${JSON.stringify(argsWithDependencies)}\`)
      
      // Execute the tool directly
      const result = await tool.execute(argsWithDependencies)

      results.set(i, result)
      toolResults.push({
        toolName: step.toolName,
        toolCallId: \`coord-\${i}\`,
        result: result
      })
    } catch (error) {
      console.error(\`Error executing step \${i} (\${step.toolName}):\`, error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      results.set(i, { error: errorMessage })
      toolResults.push({
        toolName: step.toolName,
        toolCallId: \`coord-\${i}\`,
        result: { error: errorMessage }
      })
    }
  }

  return toolResults
}

// --- 4. Result Aggregation Function ---

/**
 * Aggregates the tool results into a structured summary for the final agent.
 */
export function aggregateToolResults(toolResults: ToolResultPart[], plan: ToolPlan): string {
  let summary = \`## Tool Coordinator Execution Summary

The Tool Coordinator executed a multi-step plan to address the user's request.

### Plan Reasoning
\${plan.reasoning}

### Execution Steps and Results
\`

  toolResults.forEach((toolResult, index) => {
    const step = plan.steps[index]
    const result = toolResult.result
    const isError = result && typeof result === 'object' && 'error' in result

    summary += \`
#### Step \${index + 1}: \${step.purpose} (\${step.toolName})
\`
    if (isError) {
      summary += \`**Status:** ❌ FAILED
**Error:** \${result.error}
\`
    } else {
      summary += \`**Status:** ✅ SUCCESS
**Result Summary:** \${JSON.stringify(result, null, 2).substring(0, 500)}...\`
    }
    summary += '\n'
  })

  summary += \`
---
**INSTRUCTION:** Use the above summary and the original user messages to generate a final, coherent, and helpful response. Do not mention the Tool Coordinator or the plan execution process in the final answer, only the synthesized information.
\`

  return summary
}

