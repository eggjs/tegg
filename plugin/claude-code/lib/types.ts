export type SDKMessage =
  | { type: 'assistant'; message: { content: any[] } }
  | { type: 'user'; message: any }
  | { type: 'result'; subtype: 'success' | 'error'; result?: string; errors?: string[] };

export interface ClaudeSession {
  readonly sessionId: string;
  send(message: string | { type: 'user'; message: any }): Promise<void>;
  stream(): AsyncGenerator<SDKMessage, void>;
  close(): void;
}

export type CreateSessionOptions = {
  ctx?: any;
  model?: string;
  cwd?: string;
};
