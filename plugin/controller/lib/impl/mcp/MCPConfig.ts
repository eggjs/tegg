import type { Context } from 'egg';
import { randomUUID } from 'node:crypto';
import { EventStore } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { InMemoryEventStore } from '@modelcontextprotocol/sdk/examples/shared/inMemoryEventStore.js';

export interface MCPConfigOptions {
  sseInitPath: string;
  sseMessagePath: string;
  streamPath: string;
  statelessStreamPath: string;
  sessionIdGenerator?: (ctx: Context) => string;
  eventStore?: EventStore;
  sseHeartTime?: number;
}

export class MCPConfig {
  private _sseInitPath: string;
  private _sseMessagePath: string;
  private _streamPath: string;
  private _statelessStreamPath: string;
  private _sessionIdGenerator: (ctx: Context) => string;
  private _eventStore: EventStore;
  private _sseHeartTime: number;

  constructor(options: MCPConfigOptions) {
    this._sessionIdGenerator = options.sessionIdGenerator ?? (() => randomUUID());
    this._sseInitPath = options.sseInitPath;
    this._sseMessagePath = options.sseMessagePath;
    this._streamPath = options.streamPath;
    this._statelessStreamPath = options.statelessStreamPath;
    this._eventStore = options.eventStore ?? new InMemoryEventStore();
    this._sseHeartTime = options.sseHeartTime ?? 25000;
  }

  get sseInitPath() {
    return this._sseInitPath;
  }

  get sseMessagePath() {
    return this._sseMessagePath;
  }

  get streamPath() {
    return this._streamPath;
  }

  get statelessStreamPath() {
    return this._statelessStreamPath;
  }

  get sessionIdGenerator() {
    return this._sessionIdGenerator;
  }

  get eventStore() {
    return this._eventStore;
  }

  get sseHeartTime() {
    return this._sseHeartTime;
  }
}
