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

    it('matches a known timestamp from the design document', () => {
      // 2025-11-13T08:00:00.000Z (= 1_763_020_800_000) — pulled from the
      // worked example in /Users/jerry/.claude/plans/wobbly-swinging-sparkle.md.
      // The expected complement is 9_999_999_999_999 - 1_763_020_800_000 = 8_236_979_199_999.
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
      // Lexicographic comparison on equal-length decimal strings is the same
      // as numeric comparison; we use the natural String '<'/'>' operators.
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

    it('throws TypeError when the input cannot be parsed as a decimal integer', () => {
      assert.throws(() => decodeReverseMs('abc'), TypeError);
      assert.throws(() => decodeReverseMs(''), TypeError);
      // Leading non-digit text. `parseInt` returns NaN.
      assert.throws(() => decodeReverseMs('xx0000'), TypeError);
    });
  });

  describe('dateBucket', () => {
    it('defaults to UTC and produces YYYY-MM-DD', () => {
      assert.strictEqual(dateBucket(0), '1970-01-01');
      assert.strictEqual(dateBucket(Date.UTC(2025, 10, 13, 0, 0, 0, 0)), '2025-11-13');
      assert.strictEqual(dateBucket(Date.UTC(2025, 10, 13, 12, 34, 56, 789)), '2025-11-13');
      // Last millisecond of the UTC day stays in that day.
      assert.strictEqual(dateBucket(Date.UTC(2025, 10, 13, 23, 59, 59, 999)), '2025-11-13');
      // Adding one ms crosses the UTC midnight.
      assert.strictEqual(dateBucket(Date.UTC(2025, 10, 13, 23, 59, 59, 999) + 1), '2025-11-14');
    });

    it("treats the 'UTC' string case-insensitively", () => {
      const t = Date.UTC(2025, 5, 7, 11, 22, 33, 44);
      assert.strictEqual(dateBucket(t, 'UTC'), dateBucket(t));
      assert.strictEqual(dateBucket(t, 'utc'), dateBucket(t));
      assert.strictEqual(dateBucket(t, 'Utc'), dateBucket(t));
    });

    it('honors a named IANA timezone via Intl.DateTimeFormat', () => {
      // UTC 16:00 on 2025-11-13 is 2025-11-14T00:00 in Asia/Shanghai (UTC+8, no DST).
      const utcAfternoon = Date.UTC(2025, 10, 13, 16, 0, 0, 0);
      assert.strictEqual(dateBucket(utcAfternoon, 'UTC'), '2025-11-13');
      assert.strictEqual(dateBucket(utcAfternoon, 'Asia/Shanghai'), '2025-11-14');

      // UTC 15:59:59.999 on the same day is still 23:59 in Shanghai → same day there.
      const justBeforeShanghaiMidnight = Date.UTC(2025, 10, 13, 15, 59, 59, 999);
      assert.strictEqual(dateBucket(justBeforeShanghaiMidnight, 'Asia/Shanghai'), '2025-11-13');

      // A western-hemisphere zone runs the other way.
      // 2025-11-13T03:00Z is 2025-11-12 19:00 in America/Los_Angeles (PST, UTC-8 in November).
      const earlyMorningUtc = Date.UTC(2025, 10, 13, 3, 0, 0, 0);
      assert.strictEqual(dateBucket(earlyMorningUtc, 'America/Los_Angeles'), '2025-11-12');
    });

    it('throws RangeError for an unknown IANA timezone', () => {
      // Intl.DateTimeFormat throws when the timeZone option is unrecognised.
      assert.throws(() => dateBucket(0, 'Not/A_Real_Zone'), RangeError);
    });
  });
});
