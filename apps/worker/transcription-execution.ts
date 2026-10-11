import {readFile,writeFile,rename,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {AppError} from '../../packages/contracts/src/project';
import {transcriptionPayloadSchema,transcriptSchema} from '../../packages/contracts/src/transcript';
import type {SpeechProvider,TranscriptRepository} from '../api/application/transcription';
import type {JobRecord} from '../api/application/ports';
import type {LocalStorage} from '../api/infrastructure/storage';
import {native,hashFile} from './native-media';
import {speechChunks,normalizeChunks} from './deepgram';
export async function executeTranscription(job:JobRecord,lease:string,storage:LocalStorage,work:string,signal:AbortSignal,progress:(stage:string,value:number)=>void,provider:SpeechProvider,repo:TranscriptRepository){
  const p=transcriptionPayloadSchema.parse(job.payload),input=storage.path(p.original),duration=BigInt(p.durationUs);
  progress('verifying-assets',0);if(await hashFile(input,signal)!==p.sourceHash)throw new AppError('ASSET_HASH_MISMATCH');
  const chunks=speechChunks(duration),results:{chunk:typeof chunks[number];response:unknown}[]=[];
  for(const chunk of chunks){signal.throwIfAborted();let response=repo.checkpoint(job.id,lease,chunk.index);
    if(!response){const wav=join(work,`chunk-${chunk.index}.wav`);progress('extracting-audio',chunk.index/chunks.length);
      await native('ffmpeg',['-v','error','-nostdin','-y','-ss',(Number(chunk.offsetUs)/1e6).toFixed(6),'-i',input,'-map','0:a:0','-vn','-t',(Number(chunk.endUs-chunk.offsetUs)/1e6).toFixed(6),'-ac','1','-ar','16000','-c:a','pcm_s16le',wav],signal);
      progress('transcribing',chunk.index/chunks.length);response=await provider.transcribe(await readFile(wav),p.options,signal);
      if(!repo.saveCheckpoint(job.id,lease,chunk.index,response))throw new AppError('CANCELLED');await rm(wav,{force:true});
    }
    results.push({chunk,response});
  }
  progress('normalizing',.98);const normalized=normalizeChunks(p.transcriptId,duration,results);
  const rawKey=`${job.id}-${lease}-raw`,data={id:p.transcriptId,projectId:job.projectId,assetId:p.assetId,sourceHash:p.sourceHash,version:1 as const,provider:'deepgram' as const,model:p.model,language:p.language,options:p.options,normalizationVersion:'dg-words-v2' as const,...normalized};
  const hash=createHash('sha256').update(JSON.stringify(data)).digest('hex');
  const transcript=transcriptSchema.parse({...data,hash,rawKey,createdAt:new Date().toISOString()});
  await writeFile(join(work,'raw.json'),JSON.stringify(results.map(r=>({chunk:{index:r.chunk.index,offsetUs:r.chunk.offsetUs.toString()},response:r.response}))));signal.throwIfAborted();await rename(join(work,'raw.json'),storage.path(rawKey));
  return {result:{transcriptId:transcript.id,assetId:p.assetId},transcript,published:[rawKey]};
}
