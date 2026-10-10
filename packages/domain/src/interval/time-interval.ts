/**
 * Half-open media time intervals: `[startUs, endUs)`.
 *
 * Constitution Article III fixes the half-open convention. It makes adjacent
 * intervals composable without double-counting the shared instant: `[0, 100)`
 * and `[100, 200)` are adjacent, disjoint, and together cover `[0, 200)`.
 *
 * Batch A establishes the interval type and its invariants only. Cut-range
 * merging, complement generation, and original-to-edited mapping belong to
 * feature 004 and are deliberately not implemented here.
 */

import { type Micros, micros } from '../time/micros';

/** Thrown when interval arguments violate the half-open invariant. */
export class InvalidIntervalError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'InvalidIntervalError';
  }
}

/**
 * A non-empty half-open interval on the original media timeline.
 *
 * `endUs` is strictly greater than `startUs`; the data model states the same
 * rule as the database check constraint `end_us > start_us`. An empty interval
 * is not representable, so no consumer needs to handle that case.
 */
export interface TimeInterval {
  readonly startUs: Micros;
  readonly endUs: Micros;
}

/** Constructs a validated half-open interval. */
export function timeInterval(startUs: Micros, endUs: Micros): TimeInterval {
  if (endUs <= startUs) {
    throw new InvalidIntervalError(
      `Interval end must be strictly after start, received [${startUs}, ${endUs}).`,
    );
  }
  return { startUs, endUs };
}

/** Duration in microseconds. Always positive, given the constructor invariant. */
export function durationUs(interval: TimeInterval): Micros {
  return micros(interval.endUs - interval.startUs);
}

/**
 * Whether a position lies within the interval.
 *
 * `startUs` is inside and `endUs` is outside, which is what makes adjacent
 * intervals partition a timeline without overlap.
 */
export function contains(interval: TimeInterval, positionUs: Micros): boolean {
  return positionUs >= interval.startUs && positionUs < interval.endUs;
}

/** Whether two intervals share at least one microsecond. */
export function overlaps(left: TimeInterval, right: TimeInterval): boolean {
  return left.startUs < right.endUs && right.startUs < left.endUs;
}

/**
 * Whether `left` ends exactly where `right` begins.
 *
 * Adjacency is the condition under which two cut ranges can be merged into one
 * without changing the covered time.
 */
export function isAdjacent(left: TimeInterval, right: TimeInterval): boolean {
  return left.endUs === right.startUs;
}

/**
 * Orders intervals by start, then by end.
 *
 * Returns a `number` because it feeds `Array.prototype.sort`; the compared
 * values remain `bigint`, so no precision is lost in the comparison itself.
 */
export function compareIntervals(left: TimeInterval, right: TimeInterval): number {
  if (left.startUs !== right.startUs) {
    return left.startUs < right.startUs ? -1 : 1;
  }
  if (left.endUs !== right.endUs) {
    return left.endUs < right.endUs ? -1 : 1;
  }
  return 0;
}
