import {useEffect,useMemo,useRef,useState} from 'react';
import type {ProjectDocument} from '../../../../../packages/contracts/src/project';
import type {Transcript} from '../../../../../packages/contracts/src/transcript';
import {captionCues,drawCaption} from '../../../../../packages/composition/src/captions';
import type {Playback} from '../editor/playback';
export function CaptionPreview({document,transcripts,playback}:{document:ProjectDocument;transcripts:readonly Transcript[];playback:Playback}){
  const canvas=useRef<HTMLCanvasElement>(null),[error,setError]=useState('');
  const plan=useMemo(()=>{try{return {cues:document.captionStyle?.enabled?captionCues(document,transcripts):[],error:''};}catch{return {cues:[],error:'تعذر عرض الكابشن: راجع التفريغ أو طول التصحيح.'};}},[document,transcripts]);
  useEffect(()=>{let alive=true,last=-2;setError(plan.error);const update=()=>{
    const ctx=canvas.current?.getContext('2d');if(!ctx)return;let lo=0,hi=plan.cues.length;
    while(lo<hi){const mid=(lo+hi)>>>1;if(BigInt(plan.cues[mid]!.startUs)<=playback.currentUs)lo=mid+1;else hi=mid;}
    const i=lo>0 && playback.currentUs<BigInt(plan.cues[lo-1]!.endUs)?lo-1:-1;if(i===last)return;last=i;
    try{drawCaption(ctx,i<0?[]:plan.cues[i]!.lines,document.sequence.canvas.width,document.sequence.canvas.height);}catch{setError('الكابشن أكبر من المساحة المتاحة. قصّر التصحيح قبل التصدير.');}
  };let unsubscribe=()=>{};void globalThis.document.fonts.load('600 52px EdiretorCaption').then(()=>{if(alive){update();unsubscribe=playback.subscribe(update);}}).catch(()=>{if(alive)setError('تعذر تحميل خط الكابشن.');});return()=>{alive=false;unsubscribe();};},[plan,playback,document.sequence.canvas]);
  return <><canvas className="caption-preview" ref={canvas} width={document.sequence.canvas.width} height={document.sequence.canvas.height} aria-label="كابشن المعاينة"/>{error?<p className="caption-error" role="alert">{error}</p>:null}</>;
}
