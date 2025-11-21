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
      summary += `**Status:** Failed
**Error:** ${result.error}
`
    } else {
      const resultStr = JSON.stringify(result, null, 2)
      const truncated = resultStr.length > 500 ? resultStr.substring(0, 500) + '...' : resultStr

      summary += `**Status:** Success
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
aker: summary
}
