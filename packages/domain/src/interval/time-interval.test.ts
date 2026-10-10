import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { micros, type Micros } from '../time/micros';
import {
  InvalidIntervalError,
  compareIntervals,
  contains,
  durationUs,
  isAdjacent,
  overlaps,
  timeInterval,
} from './time-interval';

/** Non-negative microsecond positions, including values beyond 2^53. */
const arbMicros = fc.bigInt({ min: 0n, max: 2n ** 62n }).map((value) => micros(value));

/** A valid non-empty half-open interval. */
const arbInterval = fc
  .tuple(arbMicros, fc.bigInt({ min: 1n, max: 2n ** 40n }))
  .map(([startUs, span]) => timeInterval(startUs, micros(startUs + span)));

describe('timeInterval', () => {
  it('constructs a non-empty interval', () => {
    const interval = timeInterval(micros(46_200_000n), micros(48_700_000n));

    expect(interval.startUs).toBe(46_200_000n);
    expect(interval.endUs).toBe(48_700_000n);
  });

  it('rejects an empty interval', () => {
    expect(() => timeInterval(micros(100n), micros(100n))).toThrow(InvalidIntervalError);
  });

  it('rejects an inverted interval', () => {
    expect(() => timeInterval(micros(200n), micros(100n))).toThrow(InvalidIntervalError);
  });

  it('rejects any end at or before start, for all generated inputs', () => {
    fc.assert(
      fc.property(arbMicros, arbMicros, (a, b) => {
        const [lower, upper] = a <= b ? [a, b] : [b, a];
        if (lower === upper) {
          expect(() => timeInterval(lower, upper)).toThrow(InvalidIntervalError);
          return;
        }
        expect(() => timeInterval(upper, lower)).toThrow(InvalidIntervalError);
      }),
    );
  });
});

describe('durationUs', () => {
  it('equals end minus start for all valid intervals', () => {
    fc.assert(
      fc.property(arbInterval, (interval) => {
        expect(durationUs(interval)).toBe(interval.endUs - interval.startUs);
      }),
    );
  });

  it('is always strictly positive', () => {
    fc.assert(
      fc.property(arbInterval, (interval) => {
        expect(durationUs(interval) > 0n).toBe(true);
      }),
    );
  });
});

describe('contains', () => {
  it('includes the start instant and excludes the end instant', () => {
    // This is the defining property of [startUs, endUs): it is what lets
    // adjacent intervals partition a timeline without double counting.
    fc.assert(
      fc.property(arbInterval, (interval) => {
        expect(contains(interval, interval.startUs)).toBe(true);
        expect(contains(interval, interval.endUs)).toBe(false);
      }),
    );
  });

  it('excludes any position before the start', () => {
    fc.assert(
      fc.property(arbInterval, (interval) => {
        fc.pre(interval.startUs > 0n);
        expect(contains(interval, micros(interval.startUs - 1n))).toBe(false);
      }),
    );
  });

  it('includes the last microsecond before the end', () => {
    fc.assert(
      fc.property(arbInterval, (interval) => {
        expect(contains(interval, micros(interval.endUs - 1n))).toBe(true);
      }),
    );
  });
});

describe('overlaps', () => {
  it('is symmetric', () => {
    fc.assert(
      fc.property(arbInterval, arbInterval, (left, right) => {
        expect(overlaps(left, right)).toBe(overlaps(right, left));
      }),
    );
  });

  it('is true for any interval against itself', () => {
    fc.assert(
      fc.property(arbInterval, (interval) => {
        expect(overlaps(interval, interval)).toBe(true);
      }),
    );
  });

  it('is false for adjacent intervals, which share no microsecond', () => {
    fc.assert(
      fc.property(arbMicros, fc.bigInt({ min: 1n, max: 2n ** 30n }), (start, span) => {
        const boundary = micros(start + span);
        const left = timeInterval(start, boundary);
        const right = timeInterval(boundary, micros(boundary + span));

        expect(isAdjacent(left, right)).toBe(true);
        expect(overlaps(left, right)).toBe(false);
      }),
    );
  });

  it('agrees with containment of the later start', () => {
    fc.assert(
      fc.property(arbInterval, arbInterval, (left, right) => {
        const laterStart: Micros = left.startUs >= right.startUs ? left.startUs : right.startUs;
        expect(overlaps(left, right)).toBe(
          contains(left, laterStart) && contains(right, laterStart),
        );
      }),
    );
  });
});

describe('compareIntervals', () => {
  it('produces a total order usable by Array.prototype.sort', () => {
    fc.assert(
      fc.property(fc.array(arbInterval, { maxLength: 40 }), (intervals) => {
        const sorted = [...intervals].sort(compareIntervals);

        for (let index = 1; index < sorted.length; index += 1) {
          const previous = sorted[index - 1];
          const current = sorted[index];
          if (previous === undefined || current === undefined) {
            throw new Error('Unreachable: index is within array bounds.');
          }
          expect(compareIntervals(previous, current)).toBeLessThanOrEqual(0);
        }
      }),
    );
  });

  it('returns zero only for equal intervals', () => {
    fc.assert(
      fc.property(arbInterval, (interval) => {
        expect(compareIntervals(interval, interval)).toBe(0);
      }),
    );
  });
});
