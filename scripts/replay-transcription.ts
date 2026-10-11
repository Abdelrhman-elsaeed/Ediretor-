import {DatabaseSync} from 'node:sqlite';
import {join} from 'node:path';
import {localConfig} from '../apps/api/infrastructure/config';
import {transcriptionPayloadSchema} from '../packages/contracts/src/transcript';
import {normalizeChunks,speechChunks} from '../apps/worker/deepgram';

// Replay existing provider checkpoints, without uploading audio or altering jobs.
const id=process.argv[2];if(!id)throw new Error('Usage: npx tsx scripts/replay-transcription.ts <jobId>');
const db=new DatabaseSync(join(localConfig().data,'project.sqlite'),{readOnly:true});
try{
  const job=db.prepare("SELECT payload_json FROM jobs WHERE id=? AND kind='transcription'").get(id);if(!job)throw new Error('Transcription job not found');
  const payload=transcriptionPayloadSchema.parse(JSON.parse(String(job.payload_json))),chunks=speechChunks(BigInt(payload.durationUs));
  const rows=db.prepare('SELECT chunk_index,response_json FROM transcription_chunks WHERE job_id=? ORDER BY chunk_index').all(id);
  if(rows.length!==chunks.length)throw new Error('All provider checkpoints are required for replay');
  const normalized=normalizeChunks(payload.transcriptId,BigInt(payload.durationUs),rows.map(row=>{
    const chunk=chunks[Number(row.chunk_index)];if(!chunk)throw new Error('Invalid checkpoint index');return {chunk,response:JSON.parse(String(row.response_json)) as unknown};
  }));
  console.log(JSON.stringify({verdict:'PASS',jobId:id,chunks:chunks.length,durationUs:payload.durationUs,words:normalized.words.length,adjustedWords:normalized.words.filter(w=>w.timingAdjustment).length,normalizationVersion:'dg-words-v2'}));
}finally{db.close();}
