import type { InferUITools, UIDataTypes, UIMessage } from 'ai'
import type { InvoiceTools } from '@/worker/ai/tools'

/** Tool definitions are typed once on the server; the client only imports the types. */
export type AssistantTools = InferUITools<InvoiceTools>
export type AssistantMessage = UIMessage<unknown, UIDataTypes, AssistantTools>

type Part = AssistantMessage['parts'][number]
export type AssistantToolPart = Extract<Part, { type: `tool-${string}` }>
export type AssistantToolOutputPart = Extract<
  AssistantToolPart,
  { state: 'output-available' }
>
export type AssistantToolName = keyof AssistantTools
