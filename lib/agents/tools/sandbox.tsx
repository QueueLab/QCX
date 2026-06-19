import { createStreamableValue } from 'ai/rsc'
import { Sandbox } from '@vercel/sandbox'
import { sandboxSchema } from '@/lib/schema/sandbox'
import { ToolProps } from './index'
import { SandboxSection } from '@/components/sandbox-section'
import { nanoid } from '@/lib/utils'
import { Card } from '@/components/ui/card'

export const sandboxTool = ({ uiStream, fullResponse }: ToolProps) => {
  return {
    description: 'Execute code in an isolated microVM environment. Use this to run JavaScript or TypeScript code, perform data transformations, or generate dynamic HTML content.',
    parameters: sandboxSchema,
    execute: async ({ code, language, filename, dependencies }: any) => {
      const streamableLogs = createStreamableValue<{ type: 'stdout' | 'stderr'; content: string }[]>([])
      const logs: { type: 'stdout' | 'stderr'; content: string }[] = []

      uiStream.append(
        <SandboxSection
          key={nanoid()}
          logs={streamableLogs.value}
        />
      )

      let sandbox: Sandbox | undefined
      try {
        sandbox = await Sandbox.create({
          runtime: 'node24',
          ports: [3000],
          timeout: 60000,
        })

        await sandbox.writeFiles([{
          path: filename,
          content: code
        }])

        if (dependencies && dependencies.length > 0) {
          const installCommand = await sandbox.runCommand(`npm install ${dependencies.join(' ')}`)
          for await (const log of installCommand.logs()) {
            const logEntry = { type: log.stream as 'stdout' | 'stderr', content: log.data }
            logs.push(logEntry)
            streamableLogs.update([...logs])
          }
        }

        const isServer = /http|express|serve|listen|app\.get|app\.post|createServer/.test(code)
        const cmd = language === 'typescript' ? 'tsx' : 'node'

        const command = await sandbox.runCommand({
          cmd,
          args: [filename],
          detached: isServer
        })

        let previewUrl: string | undefined
        if (isServer) {
          previewUrl = await sandbox.domain(3000)
          // Update UI with preview URL
          uiStream.update(
            <SandboxSection
              key={nanoid()}
              logs={streamableLogs.value}
              previewUrl={previewUrl}
            />
          )
        }

        const streamLogs = async () => {
          for await (const log of command.logs()) {
            const logEntry = { type: log.stream as 'stdout' | 'stderr', content: log.data }
            logs.push(logEntry)
            streamableLogs.update([...logs])
          }
          streamableLogs.done(logs)
        }

        if (isServer) {
          // For servers, stream logs in the background and return immediately
          streamLogs()
        } else {
          // For regular scripts, wait for execution to complete
          await streamLogs()
          const result = await (command as any).wait()
          await sandbox.stop()
          return {
            logs,
            exitCode: result.exitCode,
            type: 'sandbox_result'
          }
        }

        return {
          logs,
          exitCode: 0,
          previewUrl,
          type: 'sandbox_result'
        }

      } catch (error: any) {
        console.error('Sandbox execution error:', error)
        const errorMsg = error.message || 'Unknown error occurred during sandbox execution'

        uiStream.append(
          <Card className="p-4 mt-2 text-sm text-red-600 bg-red-50 border-red-100">
            <strong>Sandbox Error:</strong> {errorMsg}
          </Card>
        )

        if (sandbox) {
          try {
            await sandbox.stop()
          } catch (e) {
            console.error('Failed to stop sandbox after error:', e)
          }
        }

        streamableLogs.done(logs)
        return {
          logs,
          exitCode: 1,
          error: errorMsg,
          type: 'sandbox_result'
        }
      }
    }
  }
}
