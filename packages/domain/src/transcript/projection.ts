import {AppError,type ProjectDocument} from '../../../contracts/src/project';
import type {Transcript,WordAnchor} from '../../../contracts/src/transcript';

export interface ProjectedWord extends WordAnchor {key:string;text:string;confidence:number;startUs:bigint;endUs:bigint;sourceStartUs:bigint;sourceEndUs:bigint;utteranceId:string;timingAdjustment?:Transcript['words'][number]['timingAdjustment'];}
/** A word belongs to every occurrence intersecting its immutable source interval. */
export function projectWords(document:ProjectDocument,transcripts:readonly Transcript[]):ProjectedWord[]{
  const corrections=new Map((document.displayCorrections??[]).map(c=>[`${c.transcriptId}:${c.wordId}`,c.text]));
  const byAsset=new Map<string,{transcript:Transcript;prefixEnds:bigint[]}>();
  for(const ref of document.transcriptRefs??[]){const t=transcripts.find(t=>t.id===ref.id && t.assetId===ref.assetId && t.hash===ref.hash && t.projectId===document.projectId);if(!t)throw new AppError('TRANSCRIPT_UNAVAILABLE');let end=0n;const prefixEnds=t.words.map(w=>{const next=BigInt(w.endUs);if(next>end)end=next;return end;});byAsset.set(t.assetId,{transcript:t,prefixEnds});}
  const result:ProjectedWord[]=[];
  for(const clip of document.sequence.clips){const entry=byAsset.get(clip.assetId);if(!entry)continue;const {transcript:t,prefixEnds}=entry,si=BigInt(clip.sourceInUs),se=si+BigInt(clip.durationUs),seq=BigInt(clip.sequenceStartUs);
    // Ends need not be monotonic: a long word may contain a shorter acoustic overlap.
    let lo=0,hi=t.words.length;while(lo<hi){const mid=(lo+hi)>>>1;if(prefixEnds[mid]!<=si)lo=mid+1;else hi=mid;}
    for(let i=lo;i<t.words.length;i++){const w=t.words[i]!,start=BigInt(w.startUs),end=BigInt(w.endUs);if(start>=se)break;if(end<=si)continue;
      result.push({transcriptId:t.id,wordId:w.id,clipId:clip.id,key:`${clip.id}:${t.id}:${w.id}`,text:corrections.get(`${t.id}:${w.id}`)??w.text,confidence:w.confidence,utteranceId:w.utteranceId,timingAdjustment:w.timingAdjustment,sourceStartUs:start,sourceEndUs:end,startUs:seq+(start<si?si:start)-si,endUs:seq+(end>se?se:end)-si});
    }
  }
  return result;
}
const min=(a:bigint,b:bigint)=>a<b?a:b,max=(a:bigint,b:bigint)=>a>b?a:b;
/** Delete selected speech plus ≤40ms silence, stopping halfway to retained neighbours.
 * Round OUT to 30fps frame boundaries only where no retained speech is crossed.
 * Reject ambiguous acoustic overlaps and subframe retained fragments rather than clipping speech. */
export function wordDeletionRanges(document:ProjectDocument,transcripts:readonly Transcript[],anchors:readonly WordAnchor[]){
  const words=projectWords(document,transcripts),keys=new Set(anchors.map(a=>`${a.clipId}:${a.transcriptId}:${a.wordId}`));
  if(keys.size!==anchors.length || anchors.some(a=>!words.some(w=>w.key===`${a.clipId}:${a.transcriptId}:${a.wordId}`)))throw new AppError('WORD_NOT_FOUND');
  const ranges:{startUs:bigint;endUs:bigint}[]=[];
  for(let i=0;i<words.length;i++){
    const w=words[i]!;if(!keys.has(w.key))continue;let j=i;while(j+1<words.length && words[j+1]!.clipId===w.clipId && keys.has(words[j+1]!.key))j++;
    const last=words[j]!,clip=document.sequence.clips.find(c=>c.id===w.clipId)!,cs=BigInt(clip.sequenceStartUs),ce=cs+BigInt(clip.durationUs);
    const prev=words[i-1]?.clipId===w.clipId?words[i-1]:undefined,next=words[j+1]?.clipId===w.clipId?words[j+1]:undefined;
    if((prev && prev.endUs>w.startUs)||(next && next.startUs<last.endUs))throw new AppError('AMBIGUOUS_WORD_BOUNDARY');
    const lower=prev?max(cs,prev.endUs+(w.startUs-prev.endUs)/2n):cs,upper=next?min(ce,last.endUs+(next.startUs-last.endUs)/2n):ce;
    let start=max(lower,w.startUs-40_000n),end=min(upper,last.endUs+40_000n);
    const floorFrame=start*30n/1_000_000n,ceilFrame=(end*30n+999_999n)/1_000_000n;
    const floor=(floorFrame*1_000_000n+29n)/30n,ceil=(ceilFrame*1_000_000n+29n)/30n;
    if((floor<lower && prev)||(ceil>upper && next))throw new AppError('AMBIGUOUS_WORD_BOUNDARY');start=max(cs,floor);end=min(ce,ceil);
    if((start>cs && start-cs<33_333n)||(end<ce && ce-end<33_333n))throw new AppError('AMBIGUOUS_WORD_BOUNDARY');
    const previous=ranges.at(-1);if(previous && start<=previous.endUs)previous.endUs=max(previous.endUs,end);else ranges.push({startUs:start,endUs:end});i=j;
  }
  return ranges;
}
