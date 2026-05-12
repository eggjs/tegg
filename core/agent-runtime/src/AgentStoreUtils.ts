import crypto from 'node:crypto';

export function nowUnix(): number {
  return Math.floor(Date.now() / 1000);
}

export function newMsgId(): string {
  return `msg_${crypto.randomUUID()}`;
}

export function newThreadId(): string {
  return `thread_${crypto.randomUUID()}`;
}

export function newRunId(): string {
  return `run_${crypto.randomUUID()}`;
}

/**
 * Arithmetic upper bound for a 13-digit Unix millisecond timestamp,
 * corresponding to UTC 2286-11-20T17:46:39.999Z — well past any realistic
 * deployment lifetime.
 *
 * Used as the operand of the "time complement" encoding in `reverseMs`,
 * so a key whose numeric suffix is `TS_MAX_MS - ms` sorts newest-first
 * under an ASC-only ListObjects (the OSS / S3 protocol family exposes no
 * native reverse-order list).
 */
export const TS_MAX_MS = 9_999_999_999_999;

const REV_MS_WIDTH = String(TS_MAX_MS).length;

/**
 * Encode a millisecond timestamp as a fixed-width, zero-padded decimal string
 * representing `TS_MAX_MS - ms`. Because the width is constant, ASCII
 * (= lexicographic) order on the resulting strings is identical to the
 * numeric order of the complement, and therefore the *reverse* of the
 * original time order. A directory of keys carrying this suffix lists
 * newest-first when an object store returns entries in dictionary order.
 *
 * Throws `RangeError` if `ms` is not an integer in `[0, TS_MAX_MS]`,
 * which guards against floats, negatives, and the post-9999-year overflow.
 */
export function reverseMs(ms: number): string {
  if (!Number.isInteger(ms) || ms < 0 || ms > TS_MAX_MS) {
    throw new RangeError(`reverseMs: ms must be an integer in [0, ${TS_MAX_MS}], got ${ms}`);
  }
  return String(TS_MAX_MS - ms).padStart(REV_MS_WIDTH, '0');
}

/**
 * Inverse of `reverseMs`. Parses a 13-digit complement string back into the
 * original millisecond timestamp.
 *
 * Useful in downstream analytics scripts that walk the time-index prefix
 * and want to recover the creation timestamp without GETting each object's
 * body.
 *
 * Throws `TypeError` when the input cannot be parsed as a finite decimal
 * integer.
 */
export function decodeReverseMs(revMsString: string): number {
  const n = Number.parseInt(revMsString, 10);
  if (!Number.isFinite(n)) {
    throw new TypeError(`decodeReverseMs: not a decimal integer: ${JSON.stringify(revMsString)}`);
  }
  return TS_MAX_MS - n;
}

/**
 * Format an absolute millisecond timestamp as a `YYYY-MM-DD` calendar-day
 * string in the supplied IANA timezone.
 *
 * The `'UTC'` branch (case-insensitive, the default) uses the engine's
 * built-in `Date.prototype.toISOString()` and is allocation-cheap. Any other
 * value is passed through `Intl.DateTimeFormat('en-CA', { timeZone })`,
 * whose `en-CA` locale already produces the `YYYY-MM-DD` form expected by
 * data-warehouse date-partition conventions.
 *
 * UTC is the default so that workers across regions partition the same
 * absolute instant into the same date directory. Pass an explicit zone
 * (e.g. `'Asia/Shanghai'`) when the analytics calendar follows a specific
 * local timezone.
 */
export function dateBucket(ms: number, timezone = 'UTC'): string {
  if (timezone.toUpperCase() === 'UTC') {
    return new Date(ms).toISOString().slice(0, 10);
  }
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(new Date(ms));
}
