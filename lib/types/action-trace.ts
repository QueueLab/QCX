export type ActionTraceStatus = 'active' | 'complete' | 'error'

export interface ActionTraceStep {
  id: string
  label: string
  detail?: string
  status: ActionTraceStatus
}

export interface ActionTrace {
  steps: ActionTraceStep[]
  completed: boolean
}

export type ActionTraceEvent =
  | { type: 'tool-start'; toolCallId: string; toolName: string }
  | { type: 'tool-complete'; toolCallId: string }
  | { type: 'response-start' }
