# Claude SDK v2 / Claude Code SDK v2 – Architecture Notes (tegg)

> This document summarizes a proposed “Claude Code SDK v2-like” programmable interface in tegg, inspired by LangChain/LangGraph style composition, and aligned with tegg’s existing **decorator → metadata → build hook → runtime** plugin pattern.
>
> Draft source was originally written as an RFC; this file is the in-repo living design note.

## 0. Motivation

tegg already has a stable pattern:

1. **Decorators** write metadata onto classes/methods/params (`MetadataUtil`, `PrototypeUtil`, `QualifierUtil`, …)
2. **Build/LoadUnit lifecycle** collects/validates metadata (`GlobalGraph` build hooks, load unit hooks)
3. **Runtime plugin** compiles metadata into runnable entities (controller registers, compiled graphs, injected objects)

We want a Claude Code SDK v2-like interface that turns “coding agent” behavior (read repo, generate patches, run commands/tests, iterate fixes) into composable primitives with:

- Patch (diff) as a first-class output
- Checkpoint/rollback
- Safety policy (allow/deny/ask)
- Trace/events for observability

## 1. Key alignment points in current tegg codebase

### 1.1 Decorator metadata write style

- `core/core-decorator/src/decorator/Prototype.ts`
  - `PrototypeUtil.setIsEggPrototype(clazz)`
  - `PrototypeUtil.setProperty(clazz, info)`
  - `PrototypeUtil.setFilePath(clazz, StackUtil.getCalleeFromStack(...))`

- `core/core-decorator/src/decorator/Inject.ts`
  - writes inject objects/constructor inject metadata
  - auto-derives names & qualifiers when possible

### 1.2 Build hook pattern

- `core/langchain-decorator` + `plugin/langchain`
  - `@Graph` wraps to `SingletonProto` and writes metadata via `MetadataUtil`
  - plugin registers `GraphBuildHook` via `GlobalGraph.instance!.registerBuildHook(...)`
  - plugin uses object/prototype lifecycle hooks + object factory to create compiled graph objects

### 1.3 Full plugin lifecycle pattern

- `plugin/controller/app.ts`
  - shows “collect metadata → register → runtime” end-to-end
  - illustrates how to wire loaders, load unit creators, instance factories, lifecycle utils, etc.

## 2. Proposed packages

- `core/claude-code-decorator`
  - new decorators + metadata keys + InfoUtil helpers
- `plugin/claude-code`
  - runtime registry + build hook + session factory

## 3. TypeScript SDK v2: core abstractions (from TS typings + docs)

> **Scope note (per project requirement):** this section focuses on the **TypeScript** SDK, specifically the **v2 API surface** exposed in `@anthropic-ai/claude-agent-sdk` (the `unstable_v2_*` functions + `SDKSession`).
>
> Sources:
> - https://platform.claude.com/docs/en/agent-sdk/overview
> - https://platform.claude.com/docs/en/agent-sdk/quickstart
> - TypeScript package `@anthropic-ai/claude-agent-sdk@0.2.23` (`sdk.d.ts`, `sdk-tools.d.ts`)
>
> Note: the “Claude Code SDK” is now called **Claude Agent SDK** in the official docs.

### 3.1 Entry point: `query()` (agentic loop)

Core API is a **streaming agent loop**:

- `query({ prompt, options? }): Query`
- `Query` is an `AsyncGenerator<SDKMessage>` (stream messages as the agent works)

In quickstart, you `async for` the returned generator and render:
- assistant text blocks
- tool calls
- final result message

### 3.2 Built-in Tools (runtime-provided)

Docs list built-in tools (Claude Code-like):

- `Read`, `Write`, `Edit`
- `Bash`
- `Glob`, `Grep`
- `WebSearch`, `WebFetch`
- `AskUserQuestion`

TS typings also expose JSON-schema typed inputs for these tools in `sdk-tools.d.ts`.

### 3.3 Permissions & modes

Two levels:

1) `permissionMode` (session-wide):
- `'default'` (prompt on dangerous operations)
- `'acceptEdits'` (auto-accept file edits)
- `'dontAsk'` (deny if not pre-approved)
- `'plan'` (planning mode; no tool execution)
- `'bypassPermissions'` (requires explicit opt-in flag)
- `'delegate'` (present in typings)

2) callback gate:
- `canUseTool(toolName, input, options) -> PermissionResult`
- The callback receives `toolUseID`, optional `blockedPath`, `decisionReason`, and `suggestions` (permission updates).

Also supports dynamic permission updates via `PermissionUpdate` structures (add/replace/remove rules; add/remove directories; set mode).

### 3.4 Sessions (V2 API, unstable)

There is an **unstable v2 session API**:

- `unstable_v2_createSession(options): SDKSession`
- `SDKSession.send(message)`
- `SDKSession.stream()` returns `AsyncGenerator<SDKMessage>`
- `unstable_v2_resumeSession(sessionId, options)`
- `unstable_v2_prompt(message, options) -> SDKResultMessage` (one-shot)

This is effectively the “multi-turn conversation object” abstraction.

### 3.5 Hooks (event interception)

A major abstraction: **hooks** with typed events:

- `HOOK_EVENTS`: `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `Notification`, `UserPromptSubmit`, `SessionStart`, `SessionEnd`, `Stop`, `SubagentStart`, `SubagentStop`, `PreCompact`, `PermissionRequest`, `Setup`
- `hooks` option allows multiple matchers with optional `matcher` patterns and timeouts.
- Hook outputs can add context / modify behavior (e.g., update tool output, add additionalContext).

This is the main extension mechanism besides MCP.

### 3.6 Subagents / Agents

A first-class abstraction:

- `agents?: Record<string, AgentDefinition>` defines named subagents
- `AgentDefinition` includes `description`, `prompt`, optional `tools`/`disallowedTools`, `model` (sonnet/opus/haiku/inherit), `skills`, `maxTurns`, and `mcpServers`

Tool schema includes an `Agent`/`Task` related tool input (`AgentInput`) indicating the runtime can spawn subagents and run tasks in background.

### 3.7 MCP integration (Model Context Protocol)

MCP is a core abstraction in the SDK:

- configure MCP servers via `mcpServers?: Record<string, McpServerConfig>`
- server types: stdio / sse / http / sdk (in-process)
- dynamic control: `Query.setMcpServers()`, `mcpServerStatus()`, `reconnectMcpServer()`, `toggleMcpServer()`
- in-process custom tools: `createSdkMcpServer({ name, tools })`
- helper for tool definitions: `tool(name, description, inputSchema, handler)` (Zod-based)

### 3.8 Output formats (structured output)

- `outputFormat?: { type: 'json_schema', schema: ... }`
- Result may include `structured_output`.

### 3.9 Observability primitives: streaming message types

`SDKMessage` is a union including:

- `SDKAssistantMessage` (final assistant message)
- `SDKPartialAssistantMessage` (`stream_event` with raw stream chunks)
- `SDKToolProgressMessage`, `SDKToolUseSummaryMessage`
- `SDKHookStarted/Progress/ResponseMessage`
- `SDKStatusMessage` (e.g., compacting)
- `SDKTaskNotificationMessage` (background task complete)
- `SDKFilesPersistedEvent`
- `SDKResultMessage` (success/error, usage/cost, permission_denials)

### 3.10 Workspace / file rewind (checkpointing)

Not exposed as a “Workspace object” in the public API, but there is:

- `enableFileCheckpointing?: boolean`
- `Query.rewindFiles(userMessageId, { dryRun? }) -> { canRewind, filesChanged, insertions, deletions }`

So checkpoint/rewind is a first-class capability even if not surfaced as a direct workspace API.

---

## 4. Proposed tegg-side abstractions (SDK v2-like surface)

These are the primitives tegg should expose if we want a Claude Code SDK v2-like programmable interface.

### 4.1 Workspace (first-class)

Represents a repo/workdir with patch management.

- `readFile`, `glob`, `search`
- `applyPatch(patch) -> { diff, filesChanged }`
- `checkpoint(label?) -> checkpointId`
- `rollback(checkpointId)`

### 4.2 Session (execution context)

Binds model/provider + workspace + tools + policy + trace.

- `runTask(taskName, input, opts)`
- streaming events: tokens, tool calls, patch applied, command results, diagnostics

### 4.3 Tool

A callable capability (shell/git/fs/http/tests) with schema + risk.

- metadata: `name`, optional `inputSchema/outputSchema`, `risk: low|medium|high`
- policy hooks can gate dangerous calls (e.g., `exec: ask`)

### 4.4 Step

Smallest composable unit.

- `run(ctx: StepContext) -> StepResult`
- can be injected with tegg protos via `@Inject`

### 4.5 Task / Pipeline / (optional) Graph

MVP: linear pipeline of steps.

Later: upgrade to graph-based control flow (similar to `langchain` plugin) for branching “test fail → fix → re-test”.

### 4.6 Policy

First-class safety config.

- `exec/write/network: allow|deny|ask`
- `ask(req) -> boolean` hook for approvals

### 4.7 Trace / Events

Serializable event stream for UI/logging/audit/replay.

Suggested event types:
- `token.delta`
- `tool.call` / `tool.result`
- `workspace.patch.apply`
- `command.start` / `command.result`
- `diagnostic`

## 4. Decorator design (aligned with tegg)

### 4.1 `@CodeTool()`

Marks a proto as an agent tool.

```ts
@CodeTool({ name: 'shell', risk: 'high' })
@SingletonProto()
export class ShellTool { /* ... */ }
```

### 4.2 `@CodeStep()`

Marks a proto as a step.

```ts
@CodeStep({ name: 'runTests', retry: 0 })
@Prototype()
export class RunTestsStep {
  @Inject('shell') shell: ShellTool;
  async run(ctx: StepContext) { return this.shell.run('pnpm test'); }
}
```

### 4.3 `@CodeTask()`

Declares a task composed of steps.

```ts
@CodeTask({ name: 'fixBug', entry: 'analyze' })
@SingletonProto()
export class FixBugTask {
  pipeline() { return ['analyze', 'patch', 'test']; }
}
```

### 4.4 Metadata & build hook

- new metadata keys: `CODE_TOOL_METADATA`, `CODE_STEP_METADATA`, `CODE_TASK_METADATA`
- InfoUtil helpers similar to `GraphInfoUtil` with internal `Map` for scan
- `CodeBuildHook`: scan → validate → compile into runtime descriptors

## 5. Plugin wiring (claude-code)

### 5.1 Lifecycle wiring

- `configWillLoad`
  - register object/prototype lifecycle hooks
  - register build hook
  - register factories/registries on `app`

- `configDidLoad`
  - `GlobalGraph.instance!.registerBuildHook(CodeBuildHook)`

### 5.2 Runtime exports on `app`

- `app.claudeSessionFactory` (or `app.claudeSdk`) – create/resume/prompt
- `app.claudeSessionStore` – in-memory session store (MVP)
- `app.codeTaskRegistry` / `app.codeToolRegistry` – if we add tegg-side Task/Tool decorators

### 5.3 Egg Context integration (important)

tegg already bridges Egg’s `ctx` into tegg runtime via `plugin/tegg`:

- `ctxLifecycleMiddleware` creates `EggContextImpl(ctx)` once per request and stores it on `ctx[TEGG_CONTEXT]`
- `EggContextImpl` stores the original Egg `ctx` under `EGG_CONTEXT`
- `EggContextHandler` registers callbacks so tegg runtime can retrieve the current context

Implication for our SDK programming interface:

- any proto (tool/step/task) can **inject and use the current Egg Context** (e.g. access logger, headers, user info)
- our `ctx.claude.session` middleware can safely reuse this pattern and simply attach session objects to Egg `ctx`

## 6. Delivery plan

### MVP

- decorators + registries
- linear pipeline execution
- workspace applyPatch + diff
- shell tool runner
- trace events

### Next

- checkpoint/rollback
- ask-policy + approvals
- optional graph execution model

