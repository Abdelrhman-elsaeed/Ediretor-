import {z} from 'zod';

const id = z.string().min(1).max(160).regex(/^[a-zA-Z0-9:_-]+$/);
const us = z.string().regex(/^(0|[1-9]\d*)$/).refine(v => BigInt(v) <= 86_400_000_000n);
export const displayTextSchema = z.string().trim().min(1).max(160).refine(v => !/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069<>]/u.test(v), 'INVALID_WORD_TEXT');
export const transcriptRefSchema = z.object({id, assetId:id, hash:z.string().regex(/^[a-f0-9]{64}$/)}).strict();
export const wordSchema = z.object({id, text:displayTextSchema, startUs:us, endUs:us, confidence:z.number().min(0).max(1), utteranceId:id, speaker:z.number().int().nonnegative().nullable(),reportedEndUs:us.optional(),timingAdjustment:z.enum(['minimum-span','source-end']).optional()}).strict();
export const transcriptSchema = z.object({id, projectId:id, assetId:id, sourceHash:z.string().regex(/^[a-f0-9]{64}$/), hash:z.string().regex(/^[a-f0-9]{64}$/), version:z.literal(1), provider:z.literal('deepgram'), model:z.literal('nova-3'), language:z.enum(['ar-EG','ar','en']), options:z.record(z.string()), normalizationVersion:z.enum(['dg-words-v1','dg-words-v2']), modelVersions:z.array(z.string()).min(1), rawKey:id, words:z.array(wordSchema).max(100000), createdAt:z.string()}).strict().superRefine((t,ctx)=>{
  const ids=new Set<string>();let previous=0n;
  for(const w of t.words){if(ids.has(w.id)||BigInt(w.startUs)<previous||BigInt(w.endUs)<=BigInt(w.startUs))ctx.addIssue({code:'custom',message:'INVALID_TRANSCRIPT_TIMING'});ids.add(w.id);previous=BigInt(w.startUs);}
});
export type Transcript = z.infer<typeof transcriptSchema>;
export type TranscriptWord = z.infer<typeof wordSchema>;
export const wordAnchorSchema = z.object({transcriptId:id,wordId:id,clipId:id}).strict();
export type WordAnchor = z.infer<typeof wordAnchorSchema>;
export const correctionSchema = z.object({transcriptId:id,wordId:id,text:displayTextSchema}).strict();
export const captionStyleSchema = z.object({version:z.literal('canvas-captions-v1'), enabled:z.boolean(), fontHash:z.literal('63111b5b2e074dd48cc67692e0a2726d86ee94c1c37fe8598257b7b4e87e869e')}).strict();
export const defaultCaptionStyle:z.infer<typeof captionStyleSchema>={version:'canvas-captions-v1',enabled:false,fontHash:'63111b5b2e074dd48cc67692e0a2726d86ee94c1c37fe8598257b7b4e87e869e'};
export const transcribeRequestSchema=z.object({assetId:id,language:z.enum(['ar-EG','ar','en']),requestId:id}).strict();
export const transcriptionPayloadSchema=z.object({transcriptId:id,assetId:id,sourceHash:z.string(),durationUs:us,original:id,language:z.enum(['ar-EG','ar','en']),model:z.literal('nova-3'),options:z.record(z.string())}).strict();
