import type { Context } from 'egg';
import type { ClaudeSession } from '../../lib/types';

function getIncomingSessionId(ctx: Context): string | undefined {
  // Compatibility: header > body > query
  const fromHeader = ctx.get('x-session-id') || ctx.get('x-claude-session-id');
  if (fromHeader) return fromHeader;

  const body: any = (ctx.request as any).body;
  const fromBody = body?.session_id || body?.sessionId;
  if (fromBody) return String(fromBody);

  const fromQuery = (ctx.query as any)?.session_id || (ctx.query as any)?.sessionId;
  if (fromQuery) return String(fromQuery);

  return undefined;
}

export default function claudeSessionMiddleware() {
  return async (ctx: Context, next: () => Promise<any>) => {
    const incoming = getIncomingSessionId(ctx);

    const session: ClaudeSession = incoming
      ? await ctx.app.claudeSessionStore.getOrResume(incoming, { ctx })
      : await ctx.app.claudeSessionStore.create({ ctx });

    ctx.claude = ctx.claude || {};
    ctx.claude.session = session;

    // Always echo session id back
    ctx.set('x-session-id', session.sessionId);
    ctx.set('x-claude-session-id', session.sessionId);

    await next();
  };
}
