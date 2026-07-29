/**
 * Abstract interface for object storage operations (e.g., OSS, S3, local fs).
 * Implementations must handle serialization/deserialization of values.
 */
export interface ObjectStorageClient {
  init?(): Promise<void>;
  destroy?(): Promise<void>;

  /** Overwrite (or create) the object at `key` with `value`. */
  put(key: string, value: string): Promise<void>;

  /** Read the full object at `key`. Returns `null` if the object does not exist. */
  get(key: string): Promise<string | null>;

  /**
   * Read an inclusive byte range from the object at `key`.
   * Returns `null` if the object does not exist.
   *
   * This method is optional. Callers must treat a trailing partial UTF-8
   * sequence or record as incomplete because `end` is a byte offset.
   */
  getRange?(key: string, start: number, end: number): Promise<string | null>;

  /**
   * Append `value` to an existing Appendable Object.
   * If the object does not exist yet, create it.
   *
   * Used by OSSAgentStore to incrementally write JSONL message lines without
   * reading the entire thread — much more efficient than read-modify-write for
   * append-only workloads.
   *
   * This method is optional: when absent, OSSAgentStore falls back to
   * get-concat-put (which is NOT atomic under concurrent writers).
   */
  append?(key: string, value: string): Promise<void>;
}
