import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { micros, type Micros } from '../time/micros';
import { timeInterval, type TimeInterval } from '../interval/time-interval';
import {
  editedDurationUs,
  isDeletedAt,
  normalizeCuts,
  totalDurationUs,
} from '../interval/interval-algebra';
import {
  buildTimeMappingIndex,
  deletedDurationBefore,
  editedToOriginal,
  originalToEdited,
  originalToEditedIntervals,
} from './time-mapping';

const MEDIA_DURATION: Micros = micros(600_000_000n);

function interval(startUs: bigint, endUs: bigint): TimeInterval {
  return timeInterval(micros(startUs), micros(endUs));
}

const arbCut = fc
  .tuple(fc.bigInt({ min: 0n, max: 599_000_000n }), fc.bigInt({ min: 1n, max: 30_000_000n }))
  .map(([startUs, span]) => interval(startUs, startUs + span));

const arbCuts = fc.array(arbCut, { maxLength: 40 });
const arbPosition = fc.bigInt({ min: 0n, max: 600_000_000n });

/** Builds an index from raw, possibly overlapping cuts. */
function indexOf(cuts: readonly TimeInterval[]): ReturnType<typeof buildTimeMappingIndex> {
  return buildTimeMappingIndex(normalizeCuts(cuts, MEDIA_DURATION), MEDIA_DURATION);
}

describe('buildTimeMappingIndex', () => {
  it('maps an uncut timeline onto itself', () => {
    const index = buildTimeMappingIndex([], MEDIA_DURATION);

    expect(index.keepRanges).toEqual([interval(0n, 600_000_000n)]);
    expect(index.editedDurationUs).toBe(MEDIA_DURATION);
  });

  it('reports a zero edited duration when everything is cut', () => {
    const index = buildTimeMappingIndex([interval(0n, 600_000_000n)], MEDIA_DURATION);

    expect(index.keepRanges).toEqual([]);
    expect(index.editedDurationUs).toBe(micros(0n));
  });

  it('conserves duration for any cut list', () => {
    fc.assert(
      fc.property(arbCuts, (cuts) => {
        const canonical = normalizeCuts(cuts, MEDIA_DURATION);
        const index = buildTimeMappingIndex(canonical, MEDIA_DURATION);

        expect(index.editedDurationUs).toBe(editedDurationUs(MEDIA_DURATION, canonical));
        expect(index.editedDurationUs + totalDurationUs(canonical)).toBe(MEDIA_DURATION);
      }),
    );
  });
});

describe('originalToEdited', () => {
  it('shifts a position after one cut back by the cut duration', () => {
    const index = buildTimeMappingIndex([interval(10_000_000n, 12_000_000n)], MEDIA_DURATION);
    const result = originalToEdited(index, micros(20_000_000n));

    expect(result.kind).toBe('kept');
    expect(result.editedUs).toBe(micros(18_000_000n));
  });

  it('leaves a position before every cut unchanged', () => {
    const index = buildTimeMappingIndex([interval(10_000_000n, 12_000_000n)], MEDIA_DURATION);
    const result = originalToEdited(index, micros(5_000_000n));

    expect(result).toEqual({ kind: 'kept', editedUs: micros(5_000_000n) });
  });

  it('reports structured metadata for a position inside a deleted range', () => {
    const index = buildTimeMappingIndex([interval(10_000_000n, 12_000_000n)], MEDIA_DURATION);
    const result = originalToEdited(index, micros(11_000_000n));

    expect(result.kind).toBe('deleted');
    if (result.kind !== 'deleted') throw new Error('Expected a deleted result.');
    expect(result.deletedRange).toEqual(interval(10_000_000n, 12_000_000n));
    // Collapses to the edited instant where the cut begins.
    expect(result.editedUs).toBe(micros(10_000_000n));
  });

  it('treats the cut start as deleted and the cut end as kept', () => {
    // The half-open convention decides both answers, so both are pinned.
    const index = buildTimeMappingIndex([interval(100n, 200n)], micros(1_000n));

    expect(originalToEdited(index, micros(100n)).kind).toBe('deleted');
    expect(originalToEdited(index, micros(200n))).toEqual({ kind: 'kept', editedUs: micros(100n) });
  });

  it('collapses every position within one cut to the same edited instant', () => {
    const index = buildTimeMappingIndex([interval(10_000_000n, 12_000_000n)], MEDIA_DURATION);

    const first = originalToEdited(index, micros(10_000_000n));
    const middle = originalToEdited(index, micros(11_000_000n));
    const last = originalToEdited(index, micros(11_999_999n));

    expect(middle.editedUs).toBe(first.editedUs);
    expect(last.editedUs).toBe(first.editedUs);
  });

  it('handles a cut at the media start', () => {
    const index = buildTimeMappingIndex([interval(0n, 1_000_000n)], MEDIA_DURATION);

    expect(originalToEdited(index, micros(0n)).kind).toBe('deleted');
    expect(originalToEdited(index, micros(1_000_000n))).toEqual({
      kind: 'kept',
      editedUs: micros(0n),
    });
  });

  it('handles a cut at the media end', () => {
    const index = buildTimeMappingIndex([interval(599_000_000n, 600_000_000n)], MEDIA_DURATION);
    const result = originalToEdited(index, micros(599_500_000n));

    expect(result.kind).toBe('deleted');
    if (result.kind !== 'deleted') throw new Error('Expected a deleted result.');
    expect(result.deletedRange).toEqual(interval(599_000_000n, 600_000_000n));
    expect(result.editedUs).toBe(micros(599_000_000n));
  });

  it('clamps a position at or beyond the media duration', () => {
    const index = buildTimeMappingIndex([interval(10n, 20n)], micros(1_000n));

    expect(originalToEdited(index, micros(1_000n)).editedUs).toBe(index.editedDurationUs);
    expect(originalToEdited(index, micros(5_000n)).editedUs).toBe(index.editedDurationUs);
  });

  it('is monotonic across the whole timeline', () => {
    fc.assert(
      fc.property(arbCuts, (cuts) => {
        const index = indexOf(cuts);
        let previous = -1n;

        for (let position = 0n; position <= 600_000_000n; position += 7_919_311n) {
          const current = originalToEdited(index, micros(position)).editedUs;
          expect(current >= previous).toBe(true);
          previous = current;
        }
      }),
    );
  });

  it('never reports an edited position beyond the edited duration', () => {
    fc.assert(
      fc.property(arbCuts, arbPosition, (cuts, position) => {
        const index = indexOf(cuts);
        expect(originalToEdited(index, micros(position)).editedUs <= index.editedDurationUs).toBe(
          true,
        );
      }),
    );
  });

  it('classifies a position as deleted exactly when the cuts contain it', () => {
    fc.assert(
      fc.property(arbCuts, arbPosition, (cuts, rawPosition) => {
        const canonical = normalizeCuts(cuts, MEDIA_DURATION);
        const index = buildTimeMappingIndex(canonical, MEDIA_DURATION);
        const position = micros(rawPosition);
        if (position >= MEDIA_DURATION) return;

        expect(originalToEdited(index, position).kind === 'deleted').toBe(
          isDeletedAt(canonical, position),
        );
      }),
    );
  });

  it('agrees with cumulative deleted duration for kept positions', () => {
    fc.assert(
      fc.property(arbCuts, arbPosition, (cuts, rawPosition) => {
        const index = indexOf(cuts);
        const position = micros(rawPosition);
        const result = originalToEdited(index, position);
        if (result.kind !== 'kept' || position >= MEDIA_DURATION) return;

        expect(result.editedUs).toBe(position - deletedDurationBefore(index, position));
      }),
    );
  });
});

describe('editedToOriginal', () => {
  it('round-trips every kept position', () => {
    fc.assert(
      fc.property(arbCuts, arbPosition, (cuts, rawPosition) => {
        const index = indexOf(cuts);
        const position = micros(rawPosition);
        const forward = originalToEdited(index, position);
        if (forward.kind !== 'kept' || position >= MEDIA_DURATION) return;

        expect(editedToOriginal(index, forward.editedUs)).toBe(position);
      }),
    );
  });

  it('always resolves to a kept original position', () => {
    fc.assert(
      fc.property(arbCuts, arbPosition, (cuts, rawEdited) => {
        const canonical = normalizeCuts(cuts, MEDIA_DURATION);
        const index = buildTimeMappingIndex(canonical, MEDIA_DURATION);
        if (index.keepRanges.length === 0) return;

        const edited = micros(rawEdited % (index.editedDurationUs + 1n));
        const original = editedToOriginal(index, edited);

        // The clamped end-of-timeline answer is a boundary, which is the end of
        // a keep range and therefore not itself inside a keep range.
        if (edited >= index.editedDurationUs) return;
        expect(isDeletedAt(canonical, original)).toBe(false);
      }),
    );
  });

  it('skips a deleted range when crossing its boundary', () => {
    const index = buildTimeMappingIndex([interval(10_000_000n, 12_000_000n)], MEDIA_DURATION);

    expect(editedToOriginal(index, micros(9_999_999n))).toBe(micros(9_999_999n));
    expect(editedToOriginal(index, micros(10_000_000n))).toBe(micros(12_000_000n));
  });

  it('clamps beyond the edited duration to the last kept position', () => {
    const index = buildTimeMappingIndex([interval(900n, 1_000n)], micros(1_000n));

    expect(editedToOriginal(index, micros(900n))).toBe(micros(900n));
    expect(editedToOriginal(index, micros(5_000n))).toBe(micros(900n));
  });

  it('returns zero when nothing is kept', () => {
    const index = buildTimeMappingIndex([interval(0n, 1_000n)], micros(1_000n));

    expect(editedToOriginal(index, micros(0n))).toBe(micros(0n));
  });

  it('is monotonic on the edited timeline', () => {
    fc.assert(
      fc.property(arbCuts, (cuts) => {
        const index = indexOf(cuts);
        if (index.keepRanges.length === 0) return;

        let previous = -1n;
        for (let edited = 0n; edited <= index.editedDurationUs; edited += 3_331_667n) {
          const original = editedToOriginal(index, micros(edited));
          expect(original >= previous).toBe(true);
          previous = original;
        }
      }),
    );
  });
});

describe('originalToEditedIntervals', () => {
  it('returns the interval unchanged when nothing is cut', () => {
    const index = buildTimeMappingIndex([], MEDIA_DURATION);

    expect(originalToEditedIntervals(index, interval(1_000n, 2_000n))).toEqual([
      interval(1_000n, 2_000n),
    ]);
  });

  it('splits an interval that a cut divides', () => {
    const index = buildTimeMappingIndex([interval(1_500n, 1_700n)], micros(10_000n));

    expect(originalToEditedIntervals(index, interval(1_000n, 2_000n))).toEqual([
      interval(1_000n, 1_500n),
      interval(1_500n, 1_800n),
    ]);
  });

  it('returns nothing when the interval is deleted entirely', () => {
    const index = buildTimeMappingIndex([interval(1_000n, 2_000n)], micros(10_000n));

    expect(originalToEditedIntervals(index, interval(1_200n, 1_800n))).toEqual([]);
  });

  it('conserves the surviving duration of the interval', () => {
    fc.assert(
      fc.property(arbCuts, arbCut, (cuts, source) => {
        const index = indexOf(cuts);
        const projected = originalToEditedIntervals(index, source);

        // Every projected microsecond corresponds to a kept original microsecond
        // inside the source interval, so the totals must agree.
        let survivingOriginal = 0n;
        for (const keep of index.keepRanges) {
          const start = keep.startUs > source.startUs ? keep.startUs : source.startUs;
          const end = keep.endUs < source.endUs ? keep.endUs : source.endUs;
          if (start < end) survivingOriginal += end - start;
        }

        expect(totalDurationUs(projected)).toBe(micros(survivingOriginal));
      }),
    );
  });

  it('produces sorted, non-overlapping edited intervals', () => {
    fc.assert(
      fc.property(arbCuts, arbCut, (cuts, source) => {
        const projected = originalToEditedIntervals(indexOf(cuts), source);

        for (let position = 1; position < projected.length; position += 1) {
          const previous = projected[position - 1];
          const current = projected[position];
          if (previous === undefined || current === undefined) throw new Error('Unreachable.');
          expect(current.startUs >= previous.endUs).toBe(true);
        }
      }),
    );
  });
});

describe('deletedDurationBefore', () => {
  it('is zero before any cut', () => {
    const index = buildTimeMappingIndex([interval(10_000n, 20_000n)], micros(100_000n));

    expect(deletedDurationBefore(index, micros(5_000n))).toBe(micros(0n));
  });

  it('counts a fully preceding cut', () => {
    const index = buildTimeMappingIndex([interval(10_000n, 20_000n)], micros(100_000n));

    expect(deletedDurationBefore(index, micros(30_000n))).toBe(micros(10_000n));
  });

  it('counts only the deleted part before a position inside a cut', () => {
    const index = buildTimeMappingIndex([interval(10_000n, 20_000n)], micros(100_000n));

    expect(deletedDurationBefore(index, micros(15_000n))).toBe(micros(5_000n));
  });

  it('equals the total cut duration at the media end', () => {
    fc.assert(
      fc.property(arbCuts, (cuts) => {
        const canonical = normalizeCuts(cuts, MEDIA_DURATION);
        const index = buildTimeMappingIndex(canonical, MEDIA_DURATION);

        expect(deletedDurationBefore(index, MEDIA_DURATION)).toBe(totalDurationUs(canonical));
      }),
    );
  });

  it('is non-decreasing', () => {
    fc.assert(
      fc.property(arbCuts, (cuts) => {
        const index = indexOf(cuts);
        let previous = -1n;

        for (let position = 0n; position <= 600_000_000n; position += 11_119_777n) {
          const current = deletedDurationBefore(index, micros(position));
          expect(current >= previous).toBe(true);
          previous = current;
        }
      }),
    );
  });
});

describe('many cut ranges', () => {
  it('maps correctly with two thousand cuts', () => {
    // Every 300 ms of a ten-minute timeline carries a 100 ms cut.
    const cuts = Array.from({ length: 2_000 }, (_unused, position) => {
      const start = BigInt(position) * 300_000n;
      return interval(start, start + 100_000n);
    });

    const index = buildTimeMappingIndex(cuts, MEDIA_DURATION);

    expect(index.keepRanges.length).toBe(2_000);
    expect(index.editedDurationUs).toBe(MEDIA_DURATION - micros(2_000n * 100_000n));

    // Every cut boundary lands on a 300 ms grid, so 300_000_000 itself is the
    // start of cut 1000 and is deleted. Take a position inside the keep range
    // that follows it: cuts 0..1000 precede it, removing 100 ms each.
    expect(originalToEdited(index, micros(300_000_000n)).kind).toBe('deleted');

    const original = micros(300_150_000n);
    const result = originalToEdited(index, original);
    expect(result.kind).toBe('kept');
    expect(result.editedUs).toBe(micros(300_150_000n - 1_001n * 100_000n));
    expect(editedToOriginal(index, result.editedUs)).toBe(original);
  });
});
