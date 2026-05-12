import assert from 'node:assert';

import { TS_MAX_MS, dateBucket, decodeReverseMs, reverseMs } from '../index';

describe('test/AgentStoreUtils.test.ts', () => {
  describe('TS_MAX_MS', () => {
    it('is 9_999_999_999_999 — the algebraic ceiling of a 13-digit ms timestamp', () => {
      assert.strictEqual(TS_MAX_MS, 9_999_999_999_999);
      assert.strictEqual(String(TS_MAX_MS).length, 13);
      // Sanity: this corresponds to a date past the year 2286.
      const isoOfCeiling = new Date(TS_MAX_MS).toISOString();
      assert.match(isoOfCeiling, /^2286-/);
    });
  });

  describe('reverseMs', () => {
    it('produces a 13-character zero-padded decimal string', () => {
      // ms=0 → complement is the max value itself, so the string is all 9s.
      assert.strictEqual(reverseMs(0), '9999999999999');
      // ms=TS_MAX_MS → complement is zero, padded to thirteen zeroes.
      assert.strictEqual(reverseMs(TS_MAX_MS), '0000000000000');
      // A small positive ms still pads on the left to thirteen chars.
      assert.strictEqual(reverseMs(1), String(TS_MAX_MS - 1).padStart(13, '0'));
      assert.strictEqual(reverseMs(1).length, 13);
    });

    it('matches the worked example timestamp from the PR description', () => {
      // The PR description's worked example uses the instant
      // 2025-11-13T08:00:00.000Z, which is the Unix-millisecond value
      // 1_763_020_800_000. The decimal complement against TS_MAX_MS is
      // 9_999_999_999_999 - 1_763_020_800_000 = 8_236_979_199_999. This
      // assertion pins the algebra so any drift in the encoding helper
      // is caught immediately.
      const knownMs = Date.UTC(2025, 10, 13, 8, 0, 0, 0);
      assert.strictEqual(knownMs, 1_763_020_800_000);
      assert.strictEqual(reverseMs(knownMs), '8236979199999');
    });

    it('throws RangeError for non-integer, negative, or out-of-range ms', () => {
      assert.throws(() => reverseMs(-1), RangeError);
      assert.throws(() => reverseMs(TS_MAX_MS + 1), RangeError);
      assert.throws(() => reverseMs(1.5), RangeError);
      assert.throws(() => reverseMs(Number.NaN), RangeError);
      assert.throws(() => reverseMs(Number.POSITIVE_INFINITY), RangeError);
      assert.throws(() => reverseMs(Number.NEGATIVE_INFINITY), RangeError);
    });

    it('is strictly monotonically decreasing in lex order versus the input', () => {
      // Pairs where the first element is strictly less than the second.
      // Lexicographic comparison on equal-length decimal strings is
      // identical to numeric comparison, so we use the natural String
      // `<` / `>` operators.
      const pairs: Array<[number, number]> = [
        [ 0, 1 ],
        [ 0, TS_MAX_MS ],
        [ 1, 2 ],
        [ 1_000, 1_001 ],
        [ 1_762_992_000_000, 1_763_078_400_000 ], // one day apart in November 2025
        [ Date.UTC(2025, 0, 1), Date.UTC(2026, 0, 1) ],
        [ Math.floor(Date.now() / 2), Date.now() ],
        [ TS_MAX_MS - 1, TS_MAX_MS ],
      ];
      for (const [ a, b ] of pairs) {
        assert.ok(a < b, `precondition: ${a} < ${b}`);
        const ra = reverseMs(a);
        const rb = reverseMs(b);
        assert.strictEqual(ra.length, 13);
        assert.strictEqual(rb.length, 13);
        assert.ok(
          ra > rb,
          `monotonicity broken for a=${a} b=${b}: reverseMs(a)=${ra} should be > reverseMs(b)=${rb}`,
        );
      }
    });
  });

  describe('decodeReverseMs', () => {
    it('inverts reverseMs for a representative range of inputs', () => {
      const samples = [
        0,
        1,
        999,
        1_000_000_000_000,
        Date.UTC(1970, 0, 1, 0, 0, 0, 0),
        Date.UTC(2025, 10, 13, 8, 0, 1, 234),
        TS_MAX_MS - 1,
        TS_MAX_MS,
      ];
      for (const ms of samples) {
        assert.strictEqual(decodeReverseMs(reverseMs(ms)), ms, `round-trip failed for ms=${ms}`);
      }
    });

    it('parses the all-zero string as TS_MAX_MS and the all-nine string as zero', () => {
      assert.strictEqual(decodeReverseMs('0000000000000'), TS_MAX_MS);
      assert.strictEqual(decodeReverseMs('9999999999999'), 0);
    });
  });

  describe('dateBucket', () => {
    it('defaults to UTC and produces YYYY-MM-DD', () => {
      assert.strictEqual(dateBucket(0), '1970-01-01');
      assert.strictEqual(dateBucket(Date.UTC(2025, 10, 13, 0, 0, 0, 0)), '2025-11-13');
      assert.strictEqual(dateBucket(Date.UTC(2025, 10, 13, 12, 34, 56, 789)), '2025-11-13');
      // Last millisecond of the UTC day stays in that day.
      assert.strictEqual(dateBucket(Date.UTC(2025, 10, 13, 23, 59, 59, 999)), '2025-11-13');
      // Adding one ms crosses the UTC midnight boundary.
      assert.strictEqual(dateBucket(Date.UTC(2025, 10, 13, 23, 59, 59, 999) + 1), '2025-11-14');
    });

    it("treats the 'UTC' string case-insensitively", () => {
      const t = Date.UTC(2025, 5, 7, 11, 22, 33, 44);
      assert.strictEqual(dateBucket(t, 'UTC'), dateBucket(t));
      assert.strictEqual(dateBucket(t, 'utc'), dateBucket(t));
      assert.strictEqual(dateBucket(t, 'Utc'), dateBucket(t));
    });

    it('honors a named IANA timezone (via dayjs\'s timezone plugin under the hood)', () => {
      // UTC 16:00 on 2025-11-13 is 2025-11-14T00:00 in Asia/Shanghai
      // (UTC+8, no DST in the Asia/Shanghai zone). dayjs's timezone
      // plugin uses the host's IANA tzdata to resolve the wall-clock
      // fields, the same data the prior `Intl.DateTimeFormat`-based
      // implementation consulted, so the expected strings are
      // bit-identical between the two implementations on a
      // Node-official full-ICU runtime.
      const utcAfternoon = Date.UTC(2025, 10, 13, 16, 0, 0, 0);
      assert.strictEqual(dateBucket(utcAfternoon, 'UTC'), '2025-11-13');
      assert.strictEqual(dateBucket(utcAfternoon, 'Asia/Shanghai'), '2025-11-14');

      // UTC 15:59:59.999 on the same day is 23:59:59.999 in Shanghai,
      // still the same Shanghai day.
      const justBeforeShanghaiMidnight = Date.UTC(2025, 10, 13, 15, 59, 59, 999);
      assert.strictEqual(dateBucket(justBeforeShanghaiMidnight, 'Asia/Shanghai'), '2025-11-13');

      // A western-hemisphere zone runs the other way.
      // UTC 2025-11-13T03:00 is 2025-11-12 19:00 in America/Los_Angeles
      // (PST, UTC-8 in November).
      const earlyMorningUtc = Date.UTC(2025, 10, 13, 3, 0, 0, 0);
      assert.strictEqual(dateBucket(earlyMorningUtc, 'America/Los_Angeles'), '2025-11-12');
    });

    it('throws RangeError for an unknown IANA timezone', () => {
      // dayjs's timezone plugin delegates the timezone resolution to
      // `Intl.DateTimeFormat`'s constructor, which throws
      // `RangeError: Invalid time zone specified` for an unknown IANA
      // name. The dateBucket function also has an explicit
      // `dayjsObj.isValid() === false` defense-in-depth check that
      // would surface its own `RangeError` if dayjs's wrapping ever
      // caught the Intl exception and returned an invalid-sentinel
      // dayjs object instead. The user-visible contract — "unknown
      // zone throws `RangeError`" — is preserved by both layers.
      assert.throws(() => dateBucket(0, 'Not/A_Real_Zone'), RangeError);
    });

    it('rejects non-finite, non-integer, or negative ms inputs with a RangeError', () => {
      // The input contract matches the sibling `reverseMs` function in
      // this same module: a Unix-millisecond timestamp is a finite,
      // nonnegative integer. The pre-amend implementation would have
      // passed `NaN` through to `new Date(NaN).toISOString()` which
      // throws a stdlib `RangeError: Invalid time value` (generic
      // message, doesn't name `dateBucket`), and `Infinity` through
      // to the Intl-format path which returned the literal string
      // `"Invalid Date"` (which then leaks to the OSS key path as a
      // directory name segment). Both are now caught at the function
      // boundary with a domain-aware error message that names the
      // bad input value.
      assert.throws(() => dateBucket(Number.NaN), RangeError);
      assert.throws(() => dateBucket(Number.POSITIVE_INFINITY), RangeError);
      assert.throws(() => dateBucket(Number.NEGATIVE_INFINITY), RangeError);
      assert.throws(() => dateBucket(1.5), RangeError, 'a fractional ms is out of contract');
      assert.throws(() => dateBucket(-1), RangeError, 'a pre-epoch negative ms is out of contract');
      // IEEE-754 signed-zero: `Object.is(-0, 0)` is `false` but
      // `Number.isInteger(-0)` is `true` and `-0 < 0` is `false`. So
      // negative-zero passes the `Number.isInteger(ms) && ms >= 0`
      // guard. Both `Date(0)` and `Date(-0)` represent the Unix
      // epoch instant, so the function returns the same `'1970-01-01'`
      // bucket for either input. This is the JavaScript convention
      // of "the two signed zeros refer to the same value" and we
      // adopt it here rather than over-specifying the contract.
      assert.doesNotThrow(() => dateBucket(-0), 'signed -0 collapses to the epoch instant');
      assert.strictEqual(dateBucket(-0), dateBucket(0));
    });
  });
});
