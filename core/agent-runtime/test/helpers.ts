import type { ObjectStorageClient } from '@eggjs/tegg-types/agent-runtime';

interface PutDelayRule {
  pattern: RegExp;
  ms: number;
}

/**
 * Inspect every key matched against the failure-injection state and throw a
 * deterministic error if a hit is found. Shared between the two test clients.
 */
function shouldFailPut(
  key: string,
  exact: ReadonlySet<string>,
  pattern: RegExp | null,
): boolean {
  return exact.has(key) || (pattern !== null && pattern.test(key));
}

/** Resolve a delay rule for `key`, or `undefined` if no rule matches. */
function findPutDelay(key: string, rules: readonly PutDelayRule[]): PutDelayRule | undefined {
  return rules.find(r => r.pattern.test(key));
}

function sleep(ms: number): Promise<void> {
  return new Promise<void>(resolve => {
    setTimeout(resolve, ms);
  });
}

/** In-memory ObjectStorageClient backed by a Map — for testing only. */
export class MapStorageClient implements ObjectStorageClient {
  private readonly store = new Map<string, string>();
  private readonly putFailureExact = new Set<string>();
  private putFailurePattern: RegExp | null = null;
  private readonly putDelays: PutDelayRule[] = [];

  init?(): Promise<void>;
  destroy?(): Promise<void>;

  /** Test helper: snapshot of every stored key, sorted ASCII-ascending. */
  keys(): string[] {
    return [ ...this.store.keys() ].sort();
  }

  /** Test helper: snapshot of stored keys whose prefix matches `prefix`. */
  keysWithPrefix(prefix: string): string[] {
    return this.keys().filter(k => k.startsWith(prefix));
  }

  /** Test helper: make subsequent `put`s whose key matches `pattern` reject. */
  failPutWhenKeyMatches(pattern: RegExp): void {
    this.putFailurePattern = pattern;
  }

  /** Test helper: make a single `put(key)` reject. */
  failPutForExactKey(key: string): void {
    this.putFailureExact.add(key);
  }

  /** Test helper: remove all PUT-failure injection rules. */
  clearPutFailures(): void {
    this.putFailureExact.clear();
    this.putFailurePattern = null;
  }

  /** Test helper: delay `put`s matching `pattern` by `ms` milliseconds. */
  delayPutWhenKeyMatches(pattern: RegExp, ms: number): void {
    this.putDelays.push({ pattern, ms });
  }

  /** Test helper: remove all PUT-delay injection rules. */
  clearPutDelays(): void {
    this.putDelays.length = 0;
  }

  async put(key: string, value: string): Promise<void> {
    if (shouldFailPut(key, this.putFailureExact, this.putFailurePattern)) {
      throw new Error(`MapStorageClient: simulated PUT failure for ${key}`);
    }
    const delay = findPutDelay(key, this.putDelays);
    if (delay) {
      await sleep(delay.ms);
    }
    this.store.set(key, value);
  }

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async append(key: string, value: string): Promise<void> {
    // append is not subject to the time-index failure-injection hooks,
    // since the time index is written via `put`, not `append`.
    const existing = this.store.get(key) ?? '';
    this.store.set(key, existing + value);
  }
}

/**
 * MapStorageClient variant without `append` — exercises OSSAgentStore's
 * get-concat-put fallback path for message appends. The test-control hooks
 * (`keys`, `failPut*`, `delayPut*`) mirror `MapStorageClient`'s.
 */
export class MapStorageClientWithoutAppend implements ObjectStorageClient {
  private readonly store = new Map<string, string>();
  private readonly putFailureExact = new Set<string>();
  private putFailurePattern: RegExp | null = null;
  private readonly putDelays: PutDelayRule[] = [];

  init?(): Promise<void>;
  destroy?(): Promise<void>;

  keys(): string[] {
    return [ ...this.store.keys() ].sort();
  }

  keysWithPrefix(prefix: string): string[] {
    return this.keys().filter(k => k.startsWith(prefix));
  }

  failPutWhenKeyMatches(pattern: RegExp): void {
    this.putFailurePattern = pattern;
  }

  failPutForExactKey(key: string): void {
    this.putFailureExact.add(key);
  }

  clearPutFailures(): void {
    this.putFailureExact.clear();
    this.putFailurePattern = null;
  }

  delayPutWhenKeyMatches(pattern: RegExp, ms: number): void {
    this.putDelays.push({ pattern, ms });
  }

  clearPutDelays(): void {
    this.putDelays.length = 0;
  }

  async put(key: string, value: string): Promise<void> {
    if (shouldFailPut(key, this.putFailureExact, this.putFailurePattern)) {
      throw new Error(`MapStorageClientWithoutAppend: simulated PUT failure for ${key}`);
    }
    const delay = findPutDelay(key, this.putDelays);
    if (delay) {
      await sleep(delay.ms);
    }
    this.store.set(key, value);
  }

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }
}
