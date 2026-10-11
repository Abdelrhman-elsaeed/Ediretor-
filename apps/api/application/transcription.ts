import {randomUUID} from 'node:crypto';
import {AppError,type Job} from '../../../packages/contracts/src/project';
import {transcribeRequestSchema,type Transcript} from '../../../packages/contracts/src/transcript';
import type {ProjectRepository,JobRepository,AssetStorage} from './ports';

export interface TranscriptRepository {
  listTranscripts(owner:string,projectId:string):Transcript[];
  enqueueTranscription(owner:string,projectId:string,requestId:string,payload:unknown):Job;
  checkpoint(jobId:string,lease:string,index:number):unknown|null;
  saveCheckpoint(jobId:string,lease:string,index:number,value:unknown):boolean;
}
export interface SpeechProvider {
  transcribe(wav:Uint8Array,options:Record<string,string>,signal:AbortSignal):Promise<unknown>;
}
export class TranscriptionService {
  constructor(private projects:ProjectRepository,private transcripts:TranscriptRepository,private storage:AssetStorage,private available:()=>boolean){}
  list(owner:string,projectId:string){this.projects.load(owner,projectId);return this.transcripts.listTranscripts(owner,projectId);}
  async start(owner:string,projectId:string,input:unknown){
    const request=transcribeRequestSchema.parse(input),project=this.projects.load(owner,projectId),asset=project.assets.find(a=>a.id===request.assetId);
    if(!asset)throw new AppError('ASSET_FORBIDDEN');if(!asset.hasAudio)throw new AppError('SILENT_SOURCE');
    if(!this.available())throw new AppError('TRANSCRIPTION_UNAVAILABLE');
    if(!await this.storage.exists(asset.original))throw new AppError('MISSING_MEDIA');
    return this.transcripts.enqueueTranscription(owner,projectId,request.requestId,{transcriptId:randomUUID(),assetId:asset.id,sourceHash:asset.hash,original:asset.original,durationUs:asset.durationUs,language:request.language,model:'nova-3',options:{model:'nova-3',language:request.language,utterances:'true',punctuate:'true',smart_format:'false',version:'latest'}});
  }
}
