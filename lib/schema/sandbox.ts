import { DeepPartial } from 'ai'
import { z } from 'zod'

/**
 * Zod schema for the sandbox tool.
 * This schema defines the parameters required to execute code in an isolated microVM.
 */
export const sandboxSchema = z.object({
  code: z.string().describe('The source code to execute in the sandbox'),
  language: z
    .enum(['javascript', 'typescript'])
    .describe('The programming language of the source code'),
  filename: z
    .string()
    .describe('The name of the file to create and execute (e.g., app.js or index.ts)'),
  dependencies: z
    .array(z.string())
    .optional()
    .describe('An optional list of npm packages to install before execution')
})

/**
 * Inferred TypeScript type for the sandbox schema.
 */
export type SandboxParameters = z.infer<typeof sandboxSchema>

/**
 * Partial type for the sandbox schema, useful for streaming tool calls.
 */
export type PartialSandboxParameters = DeepPartial<typeof sandboxSchema>
