import {z} from 'zod';
import {transcriptRefSchema, transcriptSchema,correctionSchema, captionStyleSchema, wordAnchorSchema, displayTextSchema} from './transcript';

export const idSchema = z.string().min(1).max(160).regex(/^[a-zA-Z0-9:_-]+$/);
export const usSchema = z.string().regex(/^(0|[1-9]\d*)$/).refine(v => BigInt(v) <= 86_400_000_000n, 'TIME_OUT_OF_RANGE');
export const signedUsSchema = z.string().regex(/^-?(0|[1-9]\d*)$/).refine(v => BigInt(v) >= -86_400_000_000n && BigInt(v) <= 86_400_000_000n);
const positiveUs = usSchema.refine(v => BigInt(v) > 0n);
export const assetSchema = z.object({
  id: idSchema, projectId: idSchema, name: z.string().min(1).max(240),
  hash: z.string().regex(/^[a-f0-9]{64}$/), durationUs: positiveUs,
  width: z.number().int().positive(), height: z.number().int().positive(),
  fps: z.object({num: z.number().int().positive().max(240000), den: z.number().int().positive().max(10000)}).strict(),
  hasAudio: z.boolean(), size: z.number().int().nonnegative(),
  mediaKind: z.enum(['video','audio','image']).optional(),
  original: idSchema, proxy: idSchema, thumbnail: idSchema,
}).strict();
export type Asset = z.infer<typeof assetSchema>;
export const roleSchema=z.enum(['camera','screen','primary-audio','supporting','combined']);
export const transformSchema=z.object({cropX:z.number().min(0).max(1),cropY:z.number().min(0).max(1),cropWidth:z.number().positive().max(1),cropHeight:z.number().positive().max(1),x:z.number().min(0).max(1),y:z.number().min(0).max(1),width:z.number().positive().max(1),height:z.number().positive().max(1)}).strict();
export const audioSettingsSchema=z.object({gain:z.number().min(0).max(4),fadeInUs:usSchema,fadeOutUs:usSchema,ducking:z.boolean(),duckGain:z.number().min(0).max(1)}).strict();
export const trackSchema=z.object({id:idSchema,kind:z.enum(['video','audio','supporting','linked-audio']),name:z.string().max(120).optional(),muted:z.boolean().optional(),hidden:z.boolean().optional(),locked:z.boolean().optional()}).strict();
export const markerSchema=z.object({sourceUs:usSchema,groupUs:signedUsSchema}).strict();
export const syncGroupSchema=z.object({id:idSchema,originUs:usSchema,primaryAssetId:idSchema.nullable(),members:z.array(z.object({assetId:idSchema,offsetUs:signedUsSchema,markers:z.array(markerSchema).max(20)}).strict()).min(2).max(20)}).strict();
export const layoutSchema=z.object({id:idSchema,atUs:usSchema,mode:z.enum(['pip','split','camera','screen','custom']),needsReview:z.boolean().optional()}).strict();
export const clipSchema = z.object({
  id: idSchema, assetId: idSchema, trackId: idSchema,
  sourceInUs: usSchema, durationUs: positiveUs, sequenceStartUs: usSchema,
  transform: transformSchema.optional(), audio: audioSettingsSchema.optional(), syncGroupId:idSchema.optional(), transitionUs:usSchema.optional(),
}).strict();
export type ProjectClip = z.infer<typeof clipSchema>;
export const documentSchema = z.object({
  schemaVersion: z.union([z.literal(1),z.literal(2),z.literal(3)]), projectId: idSchema, revisionId: idSchema,
  parentRevisionId: idSchema.nullable(),
  sequence: z.object({
    canvas: z.object({width: z.number().int().min(2).max(1920), height: z.number().int().min(2).max(1080)}).strict(),
    fps: z.object({num: z.literal(30), den: z.literal(1)}).strict(),
    tracks:z.array(trackSchema).min(2).max(40),
    clips: z.array(clipSchema).max(2000),
  }).strict(),
  assetRefs: z.array(assetSchema).max(200),
  transcriptRefs:z.array(transcriptRefSchema).max(200).optional(),
  displayCorrections:z.array(correctionSchema).max(100000).optional(),
  captionStyle:captionStyleSchema.optional(),
  sourceRoles:z.array(z.object({assetId:idSchema,role:roleSchema}).strict()).max(200).optional(),
  syncGroups:z.array(syncGroupSchema).max(20).optional(),
  editLinkGroups:z.array(z.object({id:idSchema,clipIds:z.array(idSchema).min(2).max(2000)}).strict()).max(200).optional(),
  layouts:z.array(layoutSchema).max(200).optional(),
}).strict();
export type ProjectDocument = z.infer<typeof documentSchema>;
export const editSchema = z.discriminatedUnion('type', [
  z.object({type: z.literal('InsertClip'), assetId: idSchema, clipId: idSchema}).strict(),
  z.object({type: z.literal('SplitClip'), clipId: idSchema, atUs: usSchema, rightId: idSchema}).strict(),
  z.object({type: z.literal('TrimClip'), clipId: idSchema, sourceInUs: usSchema, durationUs: positiveUs}).strict(),
  z.object({type: z.literal('RippleDeleteRange'), startUs: usSchema, endUs: positiveUs,clipIds:z.array(idSchema).min(1).optional()}).strict(),
  z.object({type:z.literal('SetSourceRole'),assetId:idSchema,role:roleSchema}).strict(),
  z.object({type:z.literal('AddTrack'),track:trackSchema}).strict(),
  z.object({type:z.literal('SetTrack'),trackId:idSchema,muted:z.boolean().optional(),hidden:z.boolean().optional(),locked:z.boolean().optional()}).strict(),
  z.object({type:z.literal('InsertMedia'),assetId:idSchema,clipId:idSchema,trackId:idSchema,atUs:usSchema,sourceInUs:usSchema,durationUs:positiveUs}).strict(),
  z.object({type:z.literal('CreateSyncGroup'),group:syncGroupSchema,clipIds:z.array(idSchema).min(2).max(20)}).strict(),
  z.object({type:z.literal('SetSyncOffset'),groupId:idSchema,assetId:idSchema,offsetUs:signedUsSchema}).strict(),
  z.object({type:z.literal('SetSyncMarkers'),groupId:idSchema,assetId:idSchema,markers:z.array(markerSchema).max(20)}).strict(),
  z.object({type:z.literal('SetPrimaryAudio'),groupId:idSchema,assetId:idSchema.nullable()}).strict(),
  z.object({type:z.literal('LinkClips'),groupId:idSchema,clipIds:z.array(idSchema).min(2).max(2000)}).strict(),
  z.object({type:z.literal('UnlinkClips'),groupId:idSchema}).strict(),
  z.object({type:z.literal('MoveClip'),clipId:idSchema,atUs:usSchema}).strict(),
  z.object({type:z.literal('DuplicateClip'),clipId:idSchema,newId:idSchema,atUs:usSchema,trackId:idSchema}).strict(),
  z.object({type:z.literal('RemoveClip'),clipId:idSchema}).strict(),
  z.object({type:z.literal('SetTransform'),clipId:idSchema,transform:transformSchema}).strict(),
  z.object({type:z.literal('SetAudio'),clipId:idSchema,audio:audioSettingsSchema}).strict(),
  z.object({type:z.literal('SetTransition'),clipId:idSchema,durationUs:usSchema}).strict(),
  z.object({type:z.literal('SetLayout'),layout:layoutSchema}).strict(),
  z.object({type:z.literal('RemoveLayout'),layoutId:idSchema}).strict(),
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
export const exportPayloadSchema = z.object({document: documentSchema, renderer: z.enum(['native-cuts-v1','native-multitrack-v1']), profile: z.literal('mp4-1080p-30'), captions:z.object({cues:z.array(z.object({startUs:usSchema,endUs:usSchema,lines:z.array(z.string()).max(2)})),fontHash:z.string(),runtime:z.string()}).optional()}).strict();
export class AppError extends Error {
  constructor(public readonly code: string, message = code) { super(message); }
}
