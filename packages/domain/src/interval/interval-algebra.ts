/**
 * Interval algebra for canonical cut ranges.
 *
 * Feature 004 needs one authoritative answer to "which parts of the original
 * timeline were removed". That answer is a *canonical* cut list: sorted,
 * non-overlapping, inside the media duration, and half-open. Every consumer —
 * keep ranges, edited duration, time mapping, export in a later feature —
 * derives from that single normalized form, so normalization must be total and
 * deterministic.
 *
 * Constitution Article III: every value here is integer microseconds. There is
 * no floating-point arithmetic in this file.
 */

import { type Micros, micros } from '../time/micros';
import { compareIntervals, durationUs, timeInterval, type TimeInterval } from './time-interval';

/**
 * Default maximum kept gap that still merges two cuts into one.
 *
 * Two cuts separated by a sliver of surviving media are worse than one longer
 * cut: the sliver is usually a fragment of breath or word tail that produces an
 * audible stutter, and it doubles the boundary count for export. Merging across
 * a gap deletes slightly more media than the user selected, so the threshold is
 * deliberately small and is a *configuration* value rather than a constant
 * buried in a component. 50 ms is below the ~80 ms at which listeners reliably
 * perceive a separate audio event, and it is comfortably under the 40 ms export
 * duration tolerance multiplied over typical cut counts.
 *
 * Callers that must not widen a user selection at all can pass `ZERO_MICROS`,
 * which still merges exactly adjacent and overlapping cuts.
 */
export const DEFAULT_CUT_MERGE_GAP_US: Micros = micros(50_000n);

/** Returns a new array ordered by start, then end. Never mutates the input. */
export function sortIntervals(intervals: readonly TimeInterval[]): TimeInterval[] {
  return [...intervals].sort(compareIntervals);
}

/**
 * Restricts an interval to `[0, mediaDurationUs)`.
 *
 * Returns `null` when nothing survives. A cut derived from a word whose
 * provider timestamp runs past the probed media duration is a real case, and
 * silently keeping the overhang would let a cut claim time the media does not
 * have. `Micros` is already non-negative, so only the upper bound can bind.
 */
export function clampIntervalToDuration(
  interval: TimeInterval,
  mediaDurationUs: Micros,
): TimeInterval | null {
  if (interval.startUs >= mediaDurationUs) return null;
  if (interval.endUs <= mediaDurationUs) return interval;
  return timeInterval(interval.startUs, mediaDurationUs);
}

/**
 * Merges overlapping intervals, and intervals separated by at most `maxGapUs`.
 *
 * A single left-to-right fold over the sorted input is enough: once sorted by
 * start, any interval that can merge with an earlier one can merge with the
 * running accumulator, because the accumulator's end is the maximum end seen so
 * far.
 */
export function mergeIntervals(
  intervals: readonly TimeInterval[],
  maxGapUs: Micros = micros(0n),
): TimeInterval[] {
  const sorted = sortIntervals(intervals);
  const merged: TimeInterval[] = [];

  for (const interval of sorted) {
    const previous = merged[merged.length - 1];

    if (previous !== undefined && interval.startUs - previous.endUs <= maxGapUs) {
      if (interval.endUs > previous.endUs) {
        merged[merged.length - 1] = timeInterval(previous.startUs, interval.endUs);
      }
      continue;
    }

    merged.push(interval);
  }

  return merged;
}

/**
 * Produces the canonical cut list from arbitrary cut contributions.
 *
 * This is the only function that should be trusted to have applied every
 * invariant: clamped to the media, zero-length ranges dropped, sorted, and
 * merged. Running it on its own output returns the same list, which is what
 * makes repeating a delete idempotent.
 */
export function normalizeCuts(
  cuts: readonly TimeInterval[],
  mediaDurationUs: Micros,
  maxGapUs: Micros = DEFAULT_CUT_MERGE_GAP_US,
): TimeInterval[] {
  const clamped: TimeInterval[] = [];

  for (const cut of cuts) {
    const bounded = clampIntervalToDuration(cut, mediaDurationUs);
    if (bounded !== null) clamped.push(bounded);
  }

  return mergeIntervals(clamped, maxGapUs);
}

/**
 * Removes `minus` from `from`, yielding zero, one, or two intervals.
 *
 * Two results occur when `minus` sits strictly inside `from` and splits it.
 * Zero results occur when `minus` covers `from` entirely.
 */
export function subtractInterval(from: TimeInterval, minus: TimeInterval): TimeInterval[] {
  const disjoint = minus.endUs <= from.startUs || minus.startUs >= from.endUs;
  if (disjoint) return [from];

  const remainder: TimeInterval[] = [];
  if (minus.startUs > from.startUs) remainder.push(timeInterval(from.startUs, minus.startUs));
  if (minus.endUs < from.endUs) remainder.push(timeInterval(minus.endUs, from.endUs));
  return remainder;
}

/** Removes every interval in `minus` from every interval in `from`. */
export function subtractIntervals(
  from: readonly TimeInterval[],
  minus: readonly TimeInterval[],
): TimeInterval[] {
  let remaining = [...from];

  for (const cut of minus) {
    const next: TimeInterval[] = [];
    for (const interval of remaining) {
      next.push(...subtractInterval(interval, cut));
    }
    remaining = next;
  }

  return remaining;
}

/**
 * Complements canonical cuts into the keep ranges that survive playback.
 *
 * Keep ranges are the exact complement of the cuts within
 * `[0, mediaDurationUs)`. Because the input is canonical, this is a single pass
 * that walks the cursor from zero to the media end.
 */
export function keepRangesFromCuts(
  canonicalCuts: readonly TimeInterval[],
  mediaDurationUs: Micros,
): TimeInterval[] {
  const keeps: TimeInterval[] = [];
  let cursor: Micros = micros(0n);

  for (const cut of canonicalCuts) {
    if (cut.startUs > cursor) keeps.push(timeInterval(cursor, cut.startUs));
    if (cut.endUs > cursor) cursor = cut.endUs;
  }

  if (cursor < mediaDurationUs) keeps.push(timeInterval(cursor, mediaDurationUs));
  return keeps;
}

/** Total covered time. Only meaningful for a non-overlapping list. */
export function totalDurationUs(intervals: readonly TimeInterval[]): Micros {
  let total = 0n;
  for (const interval of intervals) total += durationUs(interval);
  return micros(total);
}

/**
 * Duration of the edited timeline: original duration minus canonical cut time.
 *
 * The caller must pass canonical cuts. Overlapping cuts would double-count and
 * could drive the result negative, which is exactly the class of bug the
 * canonical form exists to prevent.
 */
export function editedDurationUs(
  mediaDurationUs: Micros,
  canonicalCuts: readonly TimeInterval[],
): Micros {
  return micros(mediaDurationUs - totalDurationUs(canonicalCuts));
}

/**
 * Index of the interval containing `positionUs`, or `-1`.
 *
 * Binary search rather than a scan, because the editor asks this question on
 * every rendered word and a transcript can carry thousands of cuts.
 */
export function findContainingIndex(
  sortedDisjoint: readonly TimeInterval[],
  positionUs: Micros,
): number {
  let low = 0;
  let high = sortedDisjoint.length - 1;

  while (low <= high) {
    const middle = (low + high) >>> 1;
    const candidate = sortedDisjoint[middle];
    if (candidate === undefined) break;

    if (positionUs < candidate.startUs) {
      high = middle - 1;
      continue;
    }
    if (positionUs >= candidate.endUs) {
      low = middle + 1;
      continue;
    }
    return middle;
  }

  return -1;
}

/** Whether an original-time position falls inside a canonical cut. */
export function isDeletedAt(canonicalCuts: readonly TimeInterval[], positionUs: Micros): boolean {
  return findContainingIndex(canonicalCuts, positionUs) !== -1;
}

/**
 * Nearest surviving original position at or after `positionUs`.
 *
 * Used when a caller holds an original timestamp that may have been deleted and
 * needs a position that still exists. Returns `null` only when every remaining
 * keep range ends before the requested position.
 */
export function nearestKeptBoundary(
  keepRanges: readonly TimeInterval[],
  positionUs: Micros,
): Micros | null {
  for (const keep of keepRanges) {
    if (positionUs < keep.startUs) return keep.startUs;
    if (positionUs < keep.endUs) return positionUs;
  }
  return null;
}
