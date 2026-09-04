// AgentController decorators from controller-decorator.
// V1 (`/api/v1`) speaks the Claude-shaped `AgentMessage`; V2 (`/api/v2`) speaks
// the provider-neutral `RuntimeMessage` envelope. They are independent route
// sets — an app may mount either or both.
export { AgentController, AgentControllerV2 } from '@eggjs/controller-decorator';
export type { AgentHandler, AgentHandlerV2 } from '@eggjs/controller-decorator';

// Implementation classes from agent-runtime
export { AgentNotFoundError, AgentConflictError, HttpSSEWriter } from '@eggjs/agent-runtime';

// Types (re-exported from agent-runtime, which re-exports @eggjs/tegg-types)
export type {
  AgentStore,
  ThreadRecord,
  RunRecord,
  CreateRunInput,
  RunObject,
  ThreadObject,
  ThreadObjectWithMessages,
  InputMessage,
  InputContentPart,
  TextInputContentPart,
  ToolUseInputContentPart,
  ToolResultInputContentPart,
  GenericInputContentPart,
  AgentRunConfig,
  GetThreadOptions,
  RunStatus,
  // SDK-aligned message types
  AgentMessage,
  SDKSystemMessage,
  SDKStreamEvent,
  SDKUserMessage,
  SDKAssistantMessage,
  SDKResultMessage,
  SDKGenericMessage,
  // V2 message contract
  RuntimeMessage,
  RunUsage,
} from '@eggjs/agent-runtime';
export { isRuntimeMessage, RUNTIME_MESSAGE_PROTOCOL } from '@eggjs/agent-runtime';
// For custom AgentStore implementations: the framework's own answer to "is this
// record part of the visible conversation", which `getThread` and `hasMessages`
// must agree with across both message contracts.
export { isConversationMessage } from '@eggjs/agent-runtime';
