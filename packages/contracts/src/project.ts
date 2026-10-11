import {z} from 'zod';
import {transcriptRefSchema, transcriptSchema,correctionSchema, captionStyleSchema, wordAnchorSchema, displayTextSchema} from './transcript';

export const idSchema = z.string().min(1).max(160).regex(/^[a-zA-Z0-9:_-]+$/);
export const usSchema = z.string().regex(/^(0|[1-9]\d*)$/).refine(v => BigInt(v) <= 86_400_000_000n, 'TIME_OUT_OF_RANGE');
const positiveUs = usSchema.refine(v => BigInt(v) > 0n);
export const assetSchema = z.object({
  id: idSchema, projectId: idSchema, name: z.string().min(1).max(240),
  hash: z.string().regex(/^[a-f0-9]{64}$/), durationUs: positiveUs,
  width: z.number().int().positive(), height: z.number().int().positive(),
  fps: z.object({num: z.number().int().positive().max(240000), den: z.number().int().positive().max(10000)}).strict(),
  hasAudio: z.boolean(), size: z.number().int().nonnegative(),
  original: idSchema, proxy: idSchema, thumbnail: idSchema,
}).strict();
export type Asset = z.infer<typeof assetSchema>;
export const clipSchema = z.object({
  id: idSchema, assetId: idSchema, trackId: z.literal('picture'),
  sourceInUs: usSchema, durationUs: positiveUs, sequenceStartUs: usSchema,
}).strict();
export type ProjectClip = z.infer<typeof clipSchema>;
export const documentSchema = z.object({
  schemaVersion: z.union([z.literal(1),z.literal(2)]), projectId: idSchema, revisionId: idSchema,
  parentRevisionId: idSchema.nullable(),
  sequence: z.object({
    canvas: z.object({width: z.number().int().min(2).max(1920), height: z.number().int().min(2).max(1080)}).strict(),
    fps: z.object({num: z.literal(30), den: z.literal(1)}).strict(),
    tracks: z.tuple([
      z.object({id: z.literal('picture'), kind: z.literal('video')}).strict(),
      z.object({id: z.literal('sound'), kind: z.literal('linked-audio')}).strict(),
    ]),
    clips: z.array(clipSchema).max(2000),
  }).strict(),
  assetRefs: z.array(assetSchema).max(200),
  transcriptRefs:z.array(transcriptRefSchema).max(200).optional(),
  displayCorrections:z.array(correctionSchema).max(100000).optional(),
  captionStyle:captionStyleSchema.optional(),
}).strict();
export type ProjectDocument = z.infer<typeof documentSchema>;
export const editSchema = z.discriminatedUnion('type', [
  z.object({type: z.literal('InsertClip'), assetId: idSchema, clipId: idSchema}).strict(),
  z.object({type: z.literal('SplitClip'), clipId: idSchema, atUs: usSchema, rightId: idSchema}).strict(),
  z.object({type: z.literal('TrimClip'), clipId: idSchema, sourceInUs: usSchema, durationUs: positiveUs}).strict(),
  z.object({type: z.literal('RippleDeleteRange'), startUs: usSchema, endUs: positiveUs}).strict(),
  z.object({type:z.literal('AttachTranscript'),ref:transcriptRefSchema}).strict(),
  z.object({type:z.literal('CorrectWordText'),transcriptId:idSchema,wordId:idSchema,text:displayTextSchema}).strict(),
  z.object({type:z.literal('DeleteWords'),anchors:z.array(wordAnchorSchema).min(1).max(2000)}).strict(),
  z.object({type:z.literal('SetCaptionStyle'),style:captionStyleSchema}).strict(),
]);
export type Edit = z.infer<typeof editSchema>;
export const actionSchema = z.discriminatedUnion('kind', [
  z.object({kind: z.literal('edit'), commandId: idSchema, commands: z.array(editSchema).min(1).max(100)}).strict(),
  z.object({kind: z.literal('undo'), commandId: idSchema}).strict(),
  z.object({kind: z.literal('redo'), commandId: idSchema}).strict(),
]);
export type SessionAction = z.infer<typeof actionSchema>;
export const stateSchema = z.object({document: documentSchema, history: z.array(documentSchema).min(1).max(100), cursor: z.number().int().nonnegative()}).strict();
export type ProjectState = z.infer<typeof stateSchema>;
export const projectSchema = z.object({id: idSchema, name: z.string(), revisionId: idSchema, updatedAt: z.string(), state: stateSchema, assets: z.array(assetSchema),transcripts:z.array(transcriptSchema).optional()});
export type Project = z.infer<typeof projectSchema>;
export const summarySchema = z.object({id: idSchema, name: z.string(), revisionId: idSchema, updatedAt: z.string(), durationUs: usSchema, assetCount: z.number(), clipCount: z.number(), thumbnail: z.string().nullable()});
export type ProjectSummary = z.infer<typeof summarySchema>;
export const saveSchema = z.object({commandId: idSchema, baseRevisionId: idSchema, actions: z.array(actionSchema).min(1).max(500)}).strict();
export type SaveRequest = z.infer<typeof saveSchema>;
export const jobSchema = z.object({
  id: idSchema, projectId: idSchema, kind: z.enum(['import','export','transcription']),
  status: z.enum(['queued','running','succeeded','failed','cancelled']),
  stage: z.string(), progress: z.number(), error: z.string().nullable(),
  inputAssetId:idSchema.optional(),
  result: z.object({assetId: idSchema.optional(), output: idSchema.optional(), revisionId: idSchema.optional(),transcriptId:idSchema.optional()}).nullable(),
  createdAt: z.string(),
});
export type Job = z.infer<typeof jobSchema>;
export const importPayloadSchema = z.object({upload: idSchema, name: z.string().min(1).max(240), size: z.number().int().positive()}).strict();
export const exportPayloadSchema = z.object({document: documentSchema, renderer: z.literal('native-cuts-v1'), profile: z.literal('mp4-1080p-30'), captions:z.object({cues:z.array(z.object({startUs:usSchema,endUs:usSchema,lines:z.array(z.string()).max(2)})),fontHash:z.string(),runtime:z.string()}).optional()}).strict();
export class AppError extends Error {
  constructor(public readonly code: string, message = code) { super(message); }
}
