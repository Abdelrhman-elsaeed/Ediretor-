import {validateDocument, durationUs} from '../../domain/src/project/kernel';
import {usToFrame} from '../../domain/src/time/frames';
import type {ProjectDocument} from '../../contracts/src/project';

/** Both browser preview and native export consume these same half-open source intervals. */
export function compile(input: ProjectDocument) {
  const document = validateDocument(input);
  const assets = new Map(document.assetRefs.map(a => [a.id, a]));
  return {canvas: document.sequence.canvas, fps: document.sequence.fps, durationUs: durationUs(document),
    frames: usToFrame(durationUs(document), document.sequence.fps, 'ceil'),
    segments: document.sequence.clips.map((c, index) => ({id: c.id, asset: assets.get(c.assetId)!,
      clip:c, sourceInUs: BigInt(c.sourceInUs), durationUs: BigInt(c.durationUs), sequenceStartUs: BigInt(c.sequenceStartUs),
      startFrame: usToFrame(BigInt(c.sequenceStartUs), document.sequence.fps),
      endFrame: usToFrame(BigInt(c.sequenceStartUs) + BigInt(c.durationUs), document.sequence.fps,
        index === document.sequence.clips.length - 1 ? 'ceil' : 'floor')}))};
}
