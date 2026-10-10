import {micros} from '../time/micros';
import {normalizeCuts} from '../interval/interval-algebra';
import type {TimeInterval} from '../interval/time-interval';
import {buildTimeMappingIndex} from './time-mapping';

export interface Clip {
  readonly id: string;
  readonly assetId: string;
  readonly sourceInUs: bigint;
  readonly durationUs: bigint;
  readonly sequenceStartUs: bigint;
}
/** Pure non-destructive edit. Cuts are relative to this occurrence, not the asset. */
export function cutClip(clip: Clip, cuts: readonly TimeInterval[], commandId: string): readonly Clip[] {
  if (clip.durationUs <= 0n || clip.sourceInUs < 0n || clip.sequenceStartUs < 0n || !commandId) throw new Error('INVALID_CLIP');
  const canonical = normalizeCuts(cuts, micros(clip.durationUs), micros(0n));
  if (!canonical.length) return [clip];
  const index = buildTimeMappingIndex(canonical, micros(clip.durationUs));
  return index.keepRanges.map((keep, i) => ({
    id: `${clip.id}:${commandId}:${i}`, assetId: clip.assetId,
    sourceInUs: clip.sourceInUs + keep.startUs,
    durationUs: keep.endUs - keep.startUs,
    sequenceStartUs: clip.sequenceStartUs + (index.editedStarts[i] ?? 0n),
  }));
}
export function sequenceToSource(clip: Clip, sequenceUs: bigint): bigint | null {
  if (sequenceUs < clip.sequenceStartUs || sequenceUs >= clip.sequenceStartUs + clip.durationUs) return null;
  return clip.sourceInUs + sequenceUs - clip.sequenceStartUs;
}
