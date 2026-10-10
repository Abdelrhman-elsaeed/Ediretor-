import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { micros, type Micros } from '../time/micros';
import { timeInterval, type TimeInterval } from './time-interval';
import {
  DEFAULT_CUT_MERGE_GAP_US,
  clampIntervalToDuration,
  editedDurationUs,
  findContainingIndex,
  isDeletedAt,
  keepRangesFromCuts,
  mergeIntervals,
  nearestKeptBoundary,
  normalizeCuts,
  sortIntervals,
  subtractInterval,
  subtractIntervals,
  totalDurationUs,
} from './interval-algebra';

const MEDIA_DURATION: Micros = micros(600_000_000n); // ten minutes
const NO_GAP: Micros = micros(0n);

function interval(startUs: bigint, endUs: bigint): TimeInterval {
  return timeInterval(micros(startUs), micros(endUs));
}

/** Cut candidates well inside a ten-minute media duration. */
const arbCut = fc
  .tuple(fc.bigInt({ min: 0n, max: 599_000_000n }), fc.bigInt({ min: 1n, max: 30_000_000n }))
  .map(([startUs, span]) => interval(startUs, startUs + span));

const arbCuts = fc.array(arbCut, { maxLength: 60 });

/**
 * Asserts that a list is sorted, disjoint, and free of zero-length ranges.
 *
 * `mergeIntervals` guarantees this much but does not bound its output to the
 * media, so the duration bound is asserted separately by `expectCanonical`.
 */
function expectSortedDisjoint(cuts: readonly TimeInterval[]): void {
  for (const cut of cuts) {
    expect(cut.endUs > cut.startUs).toBe(true); // no zero-length survivor
  }

  for (let index = 1; index < cuts.length; index += 1) {
    const previous = cuts[index - 1];
    const current = cuts[index];
    if (previous === undefined || current === undefined) throw new Error('Unreachable.');
    expect(current.startUs > previous.endUs).toBe(true); // sorted and disjoint
  }
}

/** Asserts the full canonical-cut contract, including the media bound. */
function expectCanonical(cuts: readonly TimeInterval[], mediaDurationUs: Micros): void {
  expectSortedDisjoint(cuts);
  for (const cut of cuts) {
    expect(cut.endUs <= mediaDurationUs).toBe(true); // inside the media
  }
}

describe('sortIntervals', () => {
  it('does not mutate its input', () => {
    const input = [interval(200n, 300n), interval(0n, 100n)];
    const snapshot = [...input];

    sortIntervals(input);

    expect(input).toEqual(snapshot);
  });
});

describe('clampIntervalToDuration', () => {
  it('returns the interval unchanged when it already fits', () => {
    expect(clampIntervalToDuration(interval(10n, 20n), micros(100n))).toEqual(interval(10n, 20n));
  });

  it('truncates an interval that overhangs the media end', () => {
    expect(clampIntervalToDuration(interval(90n, 200n), micros(100n))).toEqual(interval(90n, 100n));
  });

  it('drops an interval that starts at or after the media end', () => {
    expect(clampIntervalToDuration(interval(100n, 200n), micros(100n))).toBeNull();
    expect(clampIntervalToDuration(interval(150n, 200n), micros(100n))).toBeNull();
  });
});

describe('mergeIntervals', () => {
  it('returns an empty list for no input', () => {
    expect(mergeIntervals([])).toEqual([]);
  });

  it('leaves a single interval alone', () => {
    expect(mergeIntervals([interval(10n, 20n)])).toEqual([interval(10n, 20n)]);
  });

  it('merges overlapping intervals', () => {
    expect(mergeIntervals([interval(0n, 100n), interval(50n, 150n)])).toEqual([interval(0n, 150n)]);
  });

  it('merges exactly adjacent intervals even with a zero gap allowance', () => {
    expect(mergeIntervals([interval(0n, 100n), interval(100n, 200n)], NO_GAP)).toEqual([
      interval(0n, 200n),
    ]);
  });

  it('absorbs a nested interval without extending the outer one', () => {
    expect(mergeIntervals([interval(0n, 500n), interval(100n, 200n)])).toEqual([
      interval(0n, 500n),
    ]);
  });

  it('keeps intervals separated by more than the gap allowance', () => {
    expect(mergeIntervals([interval(0n, 100n), interval(200n, 300n)], micros(50n))).toEqual([
      interval(0n, 100n),
      interval(200n, 300n),
    ]);
  });

  it('merges intervals separated by no more than the gap allowance', () => {
    expect(mergeIntervals([interval(0n, 100n), interval(150n, 300n)], micros(50n))).toEqual([
      interval(0n, 300n),
    ]);
  });

  it('produces a sorted, disjoint result for any input', () => {
    fc.assert(
      fc.property(arbCuts, (cuts) => {
        expectSortedDisjoint(mergeIntervals(cuts, NO_GAP));
      }),
    );
  });

  it('never loses covered time', () => {
    fc.assert(
      fc.property(arbCuts, (cuts) => {
        const merged = mergeIntervals(cuts, NO_GAP);
        for (const cut of cuts) {
          // Every original microsecond is still covered by some merged range.
          expect(isDeletedAt(merged, cut.startUs)).toBe(true);
          expect(isDeletedAt(merged, micros(cut.endUs - 1n))).toBe(true);
        }
      }),
    );
  });
});

describe('normalizeCuts', () => {
  it('returns an empty canonical list for no cuts', () => {
    expect(normalizeCuts([], MEDIA_DURATION)).toEqual([]);
  });

  it('always produces a canonical list', () => {
    fc.assert(
      fc.property(arbCuts, (cuts) => {
        expectCanonical(normalizeCuts(cuts, MEDIA_DURATION), MEDIA_DURATION);
      }),
    );
  });

  it('is idempotent, so repeating the same delete removes no extra duration', () => {
    fc.assert(
      fc.property(arbCuts, (cuts) => {
        const once = normalizeCuts(cuts, MEDIA_DURATION);
        const twice = normalizeCuts(once, MEDIA_DURATION);

        expect(twice).toEqual(once);
        expect(totalDurationUs(twice)).toBe(totalDurationUs(once));
      }),
    );
  });

  it('is idempotent when the same cut list is applied twice over', () => {
    fc.assert(
      fc.property(arbCuts, (cuts) => {
        const once = normalizeCuts(cuts, MEDIA_DURATION);
        const duplicated = normalizeCuts([...cuts, ...cuts], MEDIA_DURATION);

        expect(duplicated).toEqual(once);
      }),
    );
  });

  it('is insensitive to input order', () => {
    fc.assert(
      fc.property(arbCuts, (cuts) => {
        expect(normalizeCuts([...cuts].reverse(), MEDIA_DURATION)).toEqual(
          normalizeCuts(cuts, MEDIA_DURATION),
        );
      }),
    );
  });

  it('clamps a cut that runs past the media end', () => {
    expect(normalizeCuts([interval(599_000_000n, 900_000_000n)], MEDIA_DURATION)).toEqual([
      interval(599_000_000n, 600_000_000n),
    ]);
  });

  it('drops a cut entirely outside the media', () => {
    expect(normalizeCuts([interval(700_000_000n, 800_000_000n)], MEDIA_DURATION)).toEqual([]);
  });

  it('merges cuts across the default gap threshold', () => {
    const cuts = normalizeCuts(
      [interval(0n, 1_000_000n), interval(1_040_000n, 2_000_000n)],
      MEDIA_DURATION,
      DEFAULT_CUT_MERGE_GAP_US,
    );

    expect(cuts).toEqual([interval(0n, 2_000_000n)]);
  });
});

describe('keepRangesFromCuts', () => {
  it('returns the whole media when nothing is cut', () => {
    expect(keepRangesFromCuts([], MEDIA_DURATION)).toEqual([interval(0n, 600_000_000n)]);
  });

  it('returns nothing when the whole media is cut', () => {
    expect(keepRangesFromCuts([interval(0n, 600_000_000n)], MEDIA_DURATION)).toEqual([]);
  });

  it('omits a leading keep range for a cut at the media start', () => {
    expect(keepRangesFromCuts([interval(0n, 100n)], micros(1_000n))).toEqual([
      interval(100n, 1_000n),
    ]);
  });

  it('omits a trailing keep range for a cut at the media end', () => {
    expect(keepRangesFromCuts([interval(900n, 1_000n)], micros(1_000n))).toEqual([
      interval(0n, 900n),
    ]);
  });

  it('exactly complements the canonical cuts', () => {
    fc.assert(
      fc.property(arbCuts, (cuts) => {
        const canonical = normalizeCuts(cuts, MEDIA_DURATION);
        const keeps = keepRangesFromCuts(canonical, MEDIA_DURATION);

        expectCanonical(keeps, MEDIA_DURATION);
        // Complement: kept time plus cut time is the whole media, and no
        // position is both kept and cut.
        expect(totalDurationUs(keeps) + totalDurationUs(canonical)).toBe(MEDIA_DURATION);
        expect(subtractIntervals(keeps, canonical)).toEqual(keeps);
      }),
    );
  });

  it('produces keep ranges that contain no deleted position', () => {
    fc.assert(
      fc.property(arbCuts, (cuts) => {
        const canonical = normalizeCuts(cuts, MEDIA_DURATION);
        for (const keep of keepRangesFromCuts(canonical, MEDIA_DURATION)) {
          expect(isDeletedAt(canonical, keep.startUs)).toBe(false);
          expect(isDeletedAt(canonical, micros(keep.endUs - 1n))).toBe(false);
        }
      }),
    );
  });
});

describe('subtractInterval', () => {
  it('returns the original when the intervals are disjoint', () => {
    expect(subtractInterval(interval(0n, 100n), interval(200n, 300n))).toEqual([
      interval(0n, 100n),
    ]);
  });

  it('returns the original when only the boundary instant touches', () => {
    // Half-open intervals that merely abut share no microsecond.
    expect(subtractInterval(interval(0n, 100n), interval(100n, 200n))).toEqual([
      interval(0n, 100n),
    ]);
  });

  it('returns nothing when fully covered', () => {
    expect(subtractInterval(interval(50n, 100n), interval(0n, 200n))).toEqual([]);
  });

  it('splits into two when the subtrahend is strictly inside', () => {
    expect(subtractInterval(interval(0n, 300n), interval(100n, 200n))).toEqual([
      interval(0n, 100n),
      interval(200n, 300n),
    ]);
  });

  it('trims the head and the tail', () => {
    expect(subtractInterval(interval(100n, 300n), interval(0n, 150n))).toEqual([
      interval(150n, 300n),
    ]);
    expect(subtractInterval(interval(100n, 300n), interval(250n, 400n))).toEqual([
      interval(100n, 250n),
    ]);
  });

  it('never returns a zero-length or inverted remainder', () => {
    fc.assert(
      fc.property(arbCut, arbCut, (from, minus) => {
        for (const remainder of subtractInterval(from, minus)) {
          expect(remainder.endUs > remainder.startUs).toBe(true);
        }
      }),
    );
  });
});

describe('editedDurationUs', () => {
  it('equals the media duration when nothing is cut', () => {
    expect(editedDurationUs(MEDIA_DURATION, [])).toBe(MEDIA_DURATION);
  });

  it('equals original duration minus merged cut duration', () => {
    fc.assert(
      fc.property(arbCuts, (cuts) => {
        const canonical = normalizeCuts(cuts, MEDIA_DURATION);
        expect(editedDurationUs(MEDIA_DURATION, canonical)).toBe(
          MEDIA_DURATION - totalDurationUs(canonical),
        );
      }),
    );
  });

  it('never falls below zero for canonical cuts', () => {
    fc.assert(
      fc.property(arbCuts, (cuts) => {
        const canonical = normalizeCuts(cuts, MEDIA_DURATION);
        expect(editedDurationUs(MEDIA_DURATION, canonical) >= 0n).toBe(true);
      }),
    );
  });

  it('is zero when the entire media is deleted', () => {
    expect(editedDurationUs(MEDIA_DURATION, [interval(0n, 600_000_000n)])).toBe(micros(0n));
  });
});

describe('findContainingIndex', () => {
  it('locates the containing interval among many', () => {
    const cuts = Array.from({ length: 500 }, (_unused, position) =>
      interval(BigInt(position) * 1_000n, BigInt(position) * 1_000n + 400n),
    );

    expect(findContainingIndex(cuts, micros(0n))).toBe(0);
    expect(findContainingIndex(cuts, micros(250_399n))).toBe(250);
    expect(findContainingIndex(cuts, micros(250_400n))).toBe(-1);
    expect(findContainingIndex(cuts, micros(499_000n))).toBe(499);
  });

  it('agrees with a linear scan for every generated input', () => {
    fc.assert(
      fc.property(arbCuts, fc.bigInt({ min: 0n, max: 600_000_000n }), (cuts, rawPosition) => {
        const canonical = normalizeCuts(cuts, MEDIA_DURATION);
        const position = micros(rawPosition);
        const expected = canonical.findIndex(
          (cut) => position >= cut.startUs && position < cut.endUs,
        );

        expect(findContainingIndex(canonical, position)).toBe(expected);
      }),
    );
  });

  it('returns -1 for an empty list', () => {
    expect(findContainingIndex([], micros(10n))).toBe(-1);
  });
});

describe('nearestKeptBoundary', () => {
  const keeps = [interval(0n, 100n), interval(300n, 400n)];

  it('returns the position itself when it is kept', () => {
    expect(nearestKeptBoundary(keeps, micros(50n))).toBe(micros(50n));
  });

  it('advances to the next kept start when the position is deleted', () => {
    expect(nearestKeptBoundary(keeps, micros(150n))).toBe(micros(300n));
  });

  it('returns null when nothing is kept at or after the position', () => {
    expect(nearestKeptBoundary(keeps, micros(500n))).toBeNull();
    expect(nearestKeptBoundary([], micros(0n))).toBeNull();
  });

  it('always returns a kept position when it returns anything', () => {
    fc.assert(
      fc.property(arbCuts, fc.bigInt({ min: 0n, max: 600_000_000n }), (cuts, rawPosition) => {
        const canonical = normalizeCuts(cuts, MEDIA_DURATION);
        const resolved = nearestKeptBoundary(
          keepRangesFromCuts(canonical, MEDIA_DURATION),
          micros(rawPosition),
        );

        if (resolved === null) return;
        expect(resolved >= rawPosition).toBe(true);
        expect(isDeletedAt(canonical, resolved)).toBe(false);
      }),
    );
  });
});
