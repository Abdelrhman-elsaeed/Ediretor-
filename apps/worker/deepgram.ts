import {z} from 'zod';
import {setTimeout as delay} from 'node:timers/promises';
import {AppError} from '../../packages/contracts/src/project';
import type {SpeechProvider} from '../api/application/transcription';
export class DeepgramProvider implements SpeechProvider {
  constructor(private key:string,private transport:typeof fetch=fetch){}
  async transcribe(wav:Uint8Array,options:Record<string,string>,signal:AbortSignal):Promise<unknown>{
    if(!this.key)throw new AppError('TRANSCRIPTION_UNAVAILABLE');
    const url=new URL('https://api.deepgram.com/v1/listen');for(const [k,v] of Object.entries(options))url.searchParams.set(k,v);
    // Request retries are bounded; successful chunks are checkpointed by the durable job.
    for(let attempt=0;attempt<3;attempt++){
      signal.throwIfAborted();let response:Response;
      try {response=await this.transport(url,{method:'POST',headers:{Authorization:`Token ${this.key}`,'Content-Type':'audio/wav'},body:Buffer.from(wav),signal:AbortSignal.any([signal,AbortSignal.timeout(120000)])});}
      catch {if(signal.aborted)throw new AppError('CANCELLED');if(attempt===2)throw new AppError('TRANSCRIPTION_TIMEOUT');await delay(500*2**attempt,undefined,{signal});continue;}
      if(response.status===401 || response.status===403)throw new AppError('TRANSCRIPTION_CREDENTIALS');
      if(!response.ok){if(response.status!==429 && response.status<500)throw new AppError('TRANSCRIPTION_REJECTED');if(attempt===2)throw new AppError('TRANSCRIPTION_PROVIDER_FAILED');
        const retry=Number(response.headers.get('retry-after'));await response.body?.cancel();await delay(Math.min(10000,Math.max(500*2**attempt,Number.isFinite(retry)?retry*1000:0)),undefined,{signal});continue;}
      const reader=response.body?.getReader();if(!reader)throw new AppError('TRANSCRIPT_INVALID');const parts:Uint8Array[]=[];let size=0;
      while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>16_000_000){await reader.cancel();throw new AppError('TRANSCRIPT_TOO_LARGE');}parts.push(value);}
      try{return JSON.parse(Buffer.concat(parts).toString('utf8')) as unknown;}catch{throw new AppError('TRANSCRIPT_INVALID');}
    }
    throw new AppError('TRANSCRIPTION_PROVIDER_FAILED');
  }
}
const providerWord=z.object({word:z.string().min(1),punctuated_word:z.string().optional(),start:z.number().finite().nonnegative(),end:z.number().finite().nonnegative(),confidence:z.number().min(0).max(1),speaker:z.number().int().nonnegative().optional()});
const responseSchema=z.object({metadata:z.object({request_id:z.string().min(1),model_info:z.record(z.object({version:z.string(),name:z.string().optional()}))}),results:z.object({channels:z.array(z.object({alternatives:z.array(z.object({words:z.array(providerWord)})).min(1)})).min(1),utterances:z.array(z.object({id:z.string().optional(),start:z.number(),end:z.number(),words:z.array(providerWord)})).optional()})});
export interface SpeechChunk {index:number;offsetUs:bigint;endUs:bigint;keepStartUs:bigint;keepEndUs:bigint;}
export function speechChunks(duration:bigint):SpeechChunk[]{
  const chunks:SpeechChunk[]=[];const size=120_000_000n,overlap=1_000_000n;
  for(let start=0n,index=0;start<duration;start+=size,index++)chunks.push({index,offsetUs:start>0n?start-overlap:0n,endUs:start+size+overlap<duration?start+size+overlap:duration,keepStartUs:start,keepEndUs:start+size<duration?start+size:duration});return chunks;
}
/** Adapted legacy normalization: integer µs, real punctuated words, validated provenance.
 * Own overlap by acoustic midpoint; then dedupe equal text with overlapping source spans. */
export function normalizeChunks(id:string,durationUs:bigint,chunks:readonly {chunk:SpeechChunk;response:unknown}[]){
  const words:import('../../packages/contracts/src/transcript').TranscriptWord[]=[],versions=new Set<string>();let lastChunk=-1;
  for(const {chunk,response} of chunks){const parsed=responseSchema.safeParse(response);if(!parsed.success)throw new AppError('TRANSCRIPT_INVALID');const data=parsed.data;
    for(const info of Object.values(data.metadata.model_info))versions.add(info.version);
    const channel=data.results.channels[0]!.alternatives[0]!.words;
    for(const [index,w] of channel.entries()){
      const start=BigInt(Math.round(w.start*1e6))+chunk.offsetUs,reportedEnd=BigInt(Math.round(w.end*1e6))+chunk.offsetUs,end=reportedEnd===start?start+1000n:reportedEnd;
      // A provider can hold the last word beyond the extracted audio (observed
      // 1.106s on a real recording). Bound this repair to 2s, clip to the actual
      // source end and retain the reported timestamp as an explicit review flag.
      if(end<=start || end>durationUs+2_000_000n || start>=durationUs)throw new AppError('TRANSCRIPT_INVALID');
      const mid=(start+(end>durationUs?durationUs:end))/2n;
      if(mid<chunk.keepStartUs || mid>=chunk.keepEndUs)continue;
      const text=(w.punctuated_word??w.word).trim();const prev=words.at(-1);
      if(prev && lastChunk!==chunk.index && prev.text.replace(/\p{P}/gu,'')===text.replace(/\p{P}/gu,'') && BigInt(prev.endUs)>start)continue;
      if(prev && start<BigInt(prev.startUs))throw new AppError('TRANSCRIPT_INVALID');
      const utterance=data.results.utterances?.findIndex(u=>w.start>=u.start && w.start<u.end)??-1;
      words.push({id:`${id}:c${chunk.index}:w${index}`,text,startUs:start.toString(),endUs:(end>durationUs?durationUs:end).toString(),confidence:w.confidence,utteranceId:`${id}:c${chunk.index}:u${utterance<0?0:utterance}`,speaker:w.speaker??null,...(end>durationUs?{reportedEndUs:reportedEnd.toString(),timingAdjustment:'source-end' as const}:reportedEnd===start?{reportedEndUs:reportedEnd.toString(),timingAdjustment:'minimum-span' as const}:{})});
      lastChunk=chunk.index;
    }
  }
  if(!versions.size)throw new AppError('TRANSCRIPT_INVALID');return {words,modelVersions:[...versions]};
}
