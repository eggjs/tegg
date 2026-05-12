import crypto from 'node:crypto';

import dayjs from 'dayjs';
import dayjsTimezone from 'dayjs/plugin/timezone';
import dayjsUtc from 'dayjs/plugin/utc';

// Register the dayjs UTC + IANA-timezone plugins exactly once at module
// load. `dayjs.extend` is idempotent so re-registering the same plugin
// in another module that also imports the timezone plugin is a no-op.
dayjs.extend(dayjsUtc);
dayjs.extend(dayjsTimezone);

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
 * Encode a millisecond timestamp as a fixed-width, zero-padded decimal
 * string representing `TS_MAX_MS - ms`. Because the width is constant,
 * ASCII (= lexicographic) order on the resulting strings is identical
 * to the numeric order of the complement, and therefore the *reverse* of
 * the original time order. A directory of keys carrying this suffix
 * lists newest-first when an object store returns entries in dictionary
 * order.
 *
 * Throws `RangeError` if `ms` is not an integer in `[0, TS_MAX_MS]`,
 * which guards against floats, negatives, and the post-year-2286
 * overflow.
 */
export function reverseMs(ms: number): string {
  if (!Number.isInteger(ms) || ms < 0 || ms > TS_MAX_MS) {
    throw new RangeError(`reverseMs: ms must be an integer in [0, ${TS_MAX_MS}], got ${ms}`);
  }
  return String(TS_MAX_MS - ms).padStart(REV_MS_WIDTH, '0');
}

/**
 * Inverse of `reverseMs`: returns the Unix-millisecond timestamp whose
 * `reverseMs` output is the given 13-character zero-padded decimal
 * string. The input contract — exactly thirteen ASCII digits, the
 * literal output of `reverseMs` — is the caller's responsibility;
 * behavior is undefined for any other input, since the standard
 * `Number.parseInt(s, 10)` "longest valid decimal prefix" semantics
 * silently drop a trailing non-digit suffix and consume a leading sign
 * character. In-tegg the only producer is `OSSAgentStore`'s time-index
 * key shape, which emits the correct form by construction; external
 * backfill or analytics scripts that compose the input from an OSS key
 * suffix are responsible for their own slicing.
 */
export function decodeReverseMs(revMsString: string): number {
  return TS_MAX_MS - Number.parseInt(revMsString, 10);
}

/**
 * Format an absolute Unix-millisecond timestamp as the `YYYY-MM-DD`
 * date-bucket directory name used by the OSS time-index keyspace.
 *
 * The UTC case (the default, accepting the case-insensitive `'utc'` and
 * `'UTC'` aliases) is short-circuited through the ECMA-262
 * `Date.prototype.toISOString().slice(0, 10)` standard-library call.
 * That produces the four-digit Gregorian year, two-digit month, and
 * two-digit day separated by literal hyphens in the UTC timezone, with
 * ASCII decimal digits, deterministically across every JavaScript
 * runtime regardless of `Intl` library availability or CLDR data
 * version. Notably the short-circuit works on small-ICU Node builds
 * and on JavaScript runtimes that ship without an `Intl` namespace,
 * which the more-general `Intl.DateTimeFormat`-based path does not.
 *
 * Any other timezone name is routed through dayjs's IANA-timezone
 * plugin. The chain `dayjs.tz(ms, timezone).format('YYYY-MM-DD')` does
 * the Unix-instant-to-wall-clock-fields conversion via the engine's
 * IANA tzdata (which dayjs internally reaches through
 * `Intl.DateTimeFormat`'s `timeZone` option, the standard ECMA-402
 * mechanism for accessing the host's timezone database) and then
 * substitutes the year/month/day into the literal `'YYYY-MM-DD'` token
 * template. The template is dayjs's own — not a locale's CLDR
 * short-date pattern, the way `Intl.DateTimeFormat({ year, month,
 * day }).format(date)` would be — so the output's character
 * composition is invariant across the locale data that a particular
 * runtime ships, where the previous implementation's reliance on the
 * `en-CA` locale's default ISO-order pattern was an empirical-fact-
 * about-Node's-CLDR rather than an ECMA-402 contractual guarantee.
 * The timezone-to-wall-clock half of the conversion still uses the
 * host's tzdata, which is the standard ICU bundle that Node's official
 * full-ICU builds ship and is the same data the prior implementation
 * relied on.
 *
 * Unknown IANA timezone names produce a `RangeError`. The underlying
 * `Intl.DateTimeFormat` constructor inside dayjs's timezone plugin
 * already throws a `RangeError: Invalid time zone specified: <name>`
 * for an unknown zone; the additional `dayjsObj.isValid()` check is
 * defense-in-depth coverage for any future dayjs version that catches
 * the Intl exception and returns an "invalid" sentinel dayjs object
 * instead of propagating it.
 *
 * The input `ms` must be a finite, nonnegative integer. The pre-amend
 * implementation silently passed a `NaN` or `Infinity` input through
 * to either `Date.prototype.toISOString` (which throws an opaque
 * stdlib `RangeError: Invalid time value` without naming the offending
 * function) or `Intl.DateTimeFormat.format(new Date(NaN))` (which
 * returns the literal string `"Invalid Date"` and would leak that
 * string into the OSS key path as a directory name). Both edge cases
 * are now rejected at the function boundary with a domain-aware error
 * message.
 *
 * The signed-zero edge case (the IEEE-754 distinction between `+0`
 * and `-0`, where `Object.is(-0, 0)` is `false` but `-0 < 0` is also
 * `false` and `Number.isInteger(-0)` is `true`) is intentionally
 * accepted: both signed zeros refer to the Unix-epoch instant
 * `1970-01-01T00:00:00.000Z` and the function returns the same
 * `'1970-01-01'` bucket for either input. This matches the standard
 * JavaScript convention of treating the two signed zeros as the same
 * mathematical value, which `Date(0)` and `Date(-0)` themselves
 * follow.
 *
 * Defaults to `'UTC'` so that workers in physically different regions
 * agree on the day-boundary partition for a given absolute instant.
 * Pass an IANA name such as `'Asia/Shanghai'` or
 * `'America/Los_Angeles'` to follow a specific local calendar.
 */
export function dateBucket(ms: number, timezone = 'UTC'): string {
  if (!Number.isInteger(ms) || ms < 0) {
    throw new RangeError(
      `dateBucket: ms must be a nonnegative integer Unix-millisecond timestamp, got ${ms}`,
    );
  }
  // Case-insensitive UTC short-circuit. The length-3 prefix check is a
  // micro-optimisation that avoids the `.toUpperCase` allocation on the
  // common non-UTC names which are all longer than three characters
  // (e.g. `'Asia/Shanghai'` is 13, `'America/Los_Angeles'` is 19).
  if (timezone.length === 3 && timezone.toUpperCase() === 'UTC') {
    return new Date(ms).toISOString().slice(0, 10);
  }
  const d = dayjs.tz(ms, timezone);
  if (!d.isValid()) {
    throw new RangeError(
      `dateBucket: dayjs returned an invalid date for timezone ${JSON.stringify(timezone)} and ms=${ms}; the timezone name is most likely not a recognised IANA zone in the host's tzdata`,
    );
  }
  return d.format('YYYY-MM-DD');
}
