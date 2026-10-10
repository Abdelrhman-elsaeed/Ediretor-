/**
 * Original ↔ edited time mapping.
 *
 * The original media timeline is authoritative; the edited timeline is derived
 * from it by removing the canonical cuts. This module is the single place that
 * conversion happens, and Features 005 and 006 will both consume it, so it stays
 * pure and framework-independent.
 *
 * The mapping is built once into an index and then answered with a binary search
 * per query. The editor asks these questions on every rendered row and, later,
 * on every player time update, so a linear scan per lookup is not acceptable.
 */

import { type Micros, micros } from '../time/micros';
import { keepRangesFromCuts } from '../interval/interval-algebra';
import { durationUs, type TimeInterval } from '../interval/time-interval';

/**
 * Precomputed mapping between the original and edited timelines.
 *
 * `keepRanges[i]` begins at `editedStarts[i]` on the edited timeline. Storing the
 * running edited offset per keep range turns both directions into a binary search
 * plus one subtraction, with no accumulation at query time.
 */
export interface TimeMappingIndex {
  readonly keepRanges: readonly TimeInterval[];
  /** Edited-timeline start of each keep range. Same length as `keepRanges`. */
  readonly editedStarts: readonly Micros[];
  readonly mediaDurationUs: Micros;
  readonly editedDurationUs: Micros;
}

/** Builds the mapping index from canonical cuts. */
export function buildTimeMappingIndex(
  canonicalCuts: readonly TimeInterval[],
  mediaDurationUs: Micros,
): TimeMappingIndex {
  const keepRanges = keepRangesFromCuts(canonicalCuts, mediaDurationUs);
  const editedStarts: Micros[] = [];

  let elapsed = 0n;
  for (const keep of keepRanges) {
    editedStarts.push(micros(elapsed));
    elapsed += durationUs(keep);
  }

  return { keepRanges, editedStarts, mediaDurationUs, editedDurationUs: micros(elapsed) };
}

/**
 * Result of mapping an original position onto the edited timeline.
 *
 * A deleted original position has no edited position of its own, and returning a
 * bare number would force every caller to guess whether the value is real. The
 * discriminated result makes the deleted case impossible to ignore, which is the
 * explicit requirement of FR-007.
 *
 * For a deleted position, `editedUs` carries the edited instant the deletion
 * collapses to — where playback would continue — so a caller that only needs a
 * seek target can use it directly.
 */
export type OriginalToEditedResult =
  | { readonly kind: 'kept'; readonly editedUs: Micros }
  | {
      readonly kind: 'deleted';
      readonly editedUs: Micros;
      /** The cut containing the requested position, in original time. */
      readonly deletedRange: TimeInterval;
    };

/**
 * Index of the first keep range that ends after `positionUs`.
 *
 * Returns `keepRanges.length` when the position is at or after every keep range.
 * This single search answers all three deleted-position questions: which keep
 * range contains the position, where the enclosing cut begins, and where it ends.
 */
function firstKeepEndingAfter(index: TimeMappingIndex, positionUs: Micros): number {
  let low = 0;
  let high = index.keepRanges.length;

  while (low < high) {
    const middle = (low + high) >>> 1;
    const keep = index.keepRanges[middle];
    if (keep === undefined) break;

    if (keep.endUs <= positionUs) low = middle + 1;
    else high = middle;
  }

  return low;
}

/**
 * Maps an original position to the edited timeline.
 *
 * Positions at or beyond the media duration clamp to the edited duration, which
 * keeps the function total rather than throwing on an out-of-range player event.
 */
export function originalToEdited(
  index: TimeMappingIndex,
  originalUs: Micros,
): OriginalToEditedResult {
  if (originalUs >= index.mediaDurationUs) {
    return { kind: 'kept', editedUs: index.editedDurationUs };
  }

  const position = firstKeepEndingAfter(index, originalUs);
  const keep = index.keepRanges[position];
  const editedStart = index.editedStarts[position];

  if (keep !== undefined && editedStart !== undefined && originalUs >= keep.startUs) {
    return { kind: 'kept', editedUs: micros(editedStart + (originalUs - keep.startUs)) };
  }

  // The position sits in a cut: after the previous keep range and before the
  // next one. Both ends collapse to the same edited instant, which is what makes
  // boundary mapping deterministic.
  const previous = index.keepRanges[position - 1];
  const previousStart = index.editedStarts[position - 1];
  const collapsedUs =
    previous !== undefined && previousStart !== undefined
      ? micros(previousStart + durationUs(previous))
      : micros(0n);

  return {
    kind: 'deleted',
    editedUs: collapsedUs,
    deletedRange: {
      startUs: previous !== undefined ? previous.endUs : micros(0n),
      endUs: keep !== undefined ? keep.startUs : index.mediaDurationUs,
    },
  };
}

/**
 * Maps an edited position back to a kept original position.
 *
 * Always resolves to a position that still exists, because the edited timeline is
 * built exclusively from kept ranges. Positions beyond the edited duration clamp
 * to the end of the last kept range.
 */
export function editedToOriginal(index: TimeMappingIndex, editedUs: Micros): Micros {
  if (index.keepRanges.length === 0) return micros(0n);

  if (editedUs >= index.editedDurationUs) {
    const last = index.keepRanges[index.keepRanges.length - 1];
    if (last === undefined) throw new Error('Unreachable: keep ranges are non-empty.');
    return last.endUs;
  }

  let low = 0;
  let high = index.keepRanges.length - 1;

  while (low <= high) {
    const middle = (low + high) >>> 1;
    const start = index.editedStarts[middle];
    const keep = index.keepRanges[middle];
    if (start === undefined || keep === undefined) break;

    if (editedUs < start) {
      high = middle - 1;
      continue;
    }
    if (editedUs >= start + durationUs(keep)) {
      low = middle + 1;
      continue;
    }
    return micros(keep.startUs + (editedUs - start));
  }

  throw new Error('Unreachable: an edited position below the edited duration is always kept.');
}

/**
 * Projects an original interval onto the edited timeline.
 *
 * One original interval can become several edited intervals, because cuts inside
 * it split it. Returns an empty array when the interval was deleted entirely.
 * A later feature needs exactly this to retime a caption cue.
 */
export function originalToEditedIntervals(
  index: TimeMappingIndex,
  interval: TimeInterval,
): TimeInterval[] {
  const projected: TimeInterval[] = [];

  for (
    let position = firstKeepEndingAfter(index, interval.startUs);
    position < index.keepRanges.length;
    position += 1
  ) {
    const keep = index.keepRanges[position];
    const editedStart = index.editedStarts[position];
    if (keep === undefined || editedStart === undefined) break;
    if (keep.startUs >= interval.endUs) break;

    const overlapStart = keep.startUs > interval.startUs ? keep.startUs : interval.startUs;
    const overlapEnd = keep.endUs < interval.endUs ? keep.endUs : interval.endUs;
    if (overlapStart >= overlapEnd) continue;

    projected.push({
      startUs: micros(editedStart + (overlapStart - keep.startUs)),
      endUs: micros(editedStart + (overlapEnd - keep.startUs)),
    });
  }

  return projected;
}

/**
 * Total deleted time strictly before an original position.
 *
 * For a kept position this is `originalUs` minus its edited position. It is also
 * defined for a deleted position, where the edited position is a collapse point
 * rather than a distinct instant, which is why it is exposed separately.
 */
export function deletedDurationBefore(index: TimeMappingIndex, originalUs: Micros): Micros {
  const bounded = originalUs > index.mediaDurationUs ? index.mediaDurationUs : originalUs;
  const position = firstKeepEndingAfter(index, bounded);
  const keep = index.keepRanges[position];
  const editedStart = index.editedStarts[position];

  if (keep !== undefined && editedStart !== undefined && bounded >= keep.startUs) {
    return micros(bounded - (editedStart + (bounded - keep.startUs)));
  }

  const previous = index.keepRanges[position - 1];
  const previousStart = index.editedStarts[position - 1];
  const keptBefore =
    previous !== undefined && previousStart !== undefined
      ? previousStart + durationUs(previous)
      : 0n;

  return micros(bounded - keptBefore);
}
