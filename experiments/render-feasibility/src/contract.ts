import {z} from 'zod';
import {usToFrame} from '../../../packages/domain/src/time/frames';

const us = z.string().regex(/^(0|[1-9][0-9]*)$/);
const id = z.string().min(1).max(160);
const asset = z.object({id, file: z.string().regex(/^generated\/[A-Za-z0-9._-]+$/), sha256: z.string().regex(/^[a-f0-9]{64}$/), kind: z.enum(['video','image','font']), durationUs: us}).strict();
const span = {startUs: us, endUs: us};
export const snapshotSchema = z.object({
  schemaVersion: z.literal(0), projectId: id, revisionId: id,
  fixture: z.enum(['real','markers','Q05','Q06','Q10']), synthetic: z.boolean(),
  rendererVersion: z.literal('4.0.518'), templateVersion: z.literal('phase00-v1'),
  width: z.number().int().positive().max(3840), height: z.number().int().positive().max(2160),
  fps: z.object({num: z.number().int().positive().max(120000), den: z.number().int().positive().max(1001)}).strict(),
  durationUs: us, cutCount: z.number().int().nonnegative(), assets: z.array(asset).min(3),
  clips: z.array(z.object({id, assetId: id, sourceInUs: us, sequenceStartUs: us, durationUs: us, rate: z.literal(1)}).strict()).min(1),
  graphics: z.array(z.object({id, ...span, text: z.string().min(1).max(180), imageAssetId: id}).strict()),
  layouts: z.array(z.object({...span, mode: z.enum(['full','inset'])}).strict()),
}).strict().superRefine((s, ctx) => {
  const fail = (message: string) => ctx.addIssue({code: 'custom', message});
  if (s.width % 2 || s.height % 2) fail('EVEN_DIMENSIONS_REQUIRED');
  if (BigInt(s.durationUs) <= 0n) fail('EMPTY_SEQUENCE');
  const ids = [...s.assets.map(a=>a.id), ...s.clips.map(c=>c.id), ...s.graphics.map(g=>g.id)];
  if (new Set(ids).size !== ids.length) fail('DUPLICATE_ID');
  let cursor = 0n;
  for (const c of s.clips) {
    const a = s.assets.find(a=>a.id===c.assetId);
    if (!a || a.kind !== 'video' || BigInt(c.sourceInUs)+BigInt(c.durationUs)>BigInt(a.durationUs)) fail('INVALID_ASSET_RANGE');
    if (BigInt(c.sequenceStartUs)!==cursor || BigInt(c.durationUs)<=0n) fail('NONCONTIGUOUS_SEQUENCE');
    cursor += BigInt(c.durationUs);
  }
  if (cursor !== BigInt(s.durationUs)) fail('DURATION_MISMATCH');
  for (const v of [...s.graphics, ...s.layouts]) {
    if (BigInt(v.endUs)<=BigInt(v.startUs) || BigInt(v.endUs)>cursor) fail('INVALID_SPAN');
  }
  if (s.assets.filter(a=>a.kind==='font').length!==1) fail('ONE_PINNED_FONT_REQUIRED');
  for(const g of s.graphics) if(!s.assets.some(a=>a.id===g.imageAssetId && a.kind==='image')) fail('IMAGE_MISSING');
  // One policy for all boundaries. Both renderers sample on the output frame grid.
  if (usToFrame(cursor,s.fps,'ceil') < 1) fail('EMPTY_FRAME_RANGE');
});
export type Snapshot = z.infer<typeof snapshotSchema>;
export function parseSnapshot(value: unknown): Snapshot { return snapshotSchema.parse(value); }
export function compile(s: Snapshot) {
  return {
    durationInFrames: usToFrame(BigInt(s.durationUs),s.fps,'ceil'),
    clips: s.clips.map(c=>({...c, from: usToFrame(BigInt(c.sequenceStartUs),s.fps,'ceil'), to: usToFrame(BigInt(c.sequenceStartUs)+BigInt(c.durationUs),s.fps,'ceil'), sourceFrame: usToFrame(BigInt(c.sourceInUs),s.fps)})),
    graphics: s.graphics.map(g=>({...g, from: usToFrame(BigInt(g.startUs),s.fps,'ceil'), to: usToFrame(BigInt(g.endUs),s.fps,'ceil')})),
    layouts: s.layouts.map(l=>({...l, from: usToFrame(BigInt(l.startUs),s.fps,'ceil'), to: usToFrame(BigInt(l.endUs),s.fps,'ceil')})),
  };
}
