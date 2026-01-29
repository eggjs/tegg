# @eggjs/tegg-claude-code-plugin (WIP)

MVP scaffolding for a Claude Code SDK v2-like programming surface inside tegg.

## What exists in this MVP

- `ctx` middleware that attaches `ctx.claude.session`.
- In-memory `ClaudeSessionStore` that creates/resumes sessions by `sessionId`.
- A placeholder `ClaudeSessionFactory` that currently returns an in-memory stub session.

## Next

Replace the stub implementation with an adapter around `@anthropic-ai/claude-agent-sdk` TypeScript **v2** APIs:

- `unstable_v2_createSession`
- `unstable_v2_resumeSession`
- `SDKSession.send` / `SDKSession.stream`

and wire in permissions/hooks/MCP.
