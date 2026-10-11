import {AppError,type ProjectDocument} from '../../contracts/src/project';
import type {Transcript} from '../../contracts/src/transcript';
import {projectWords} from '../../domain/src/transcript/projection';
export interface CaptionCue {startUs:string;endUs:string;lines:string[];}
/** Bounded two-line cues, split at occurrence/utterance, long pauses and 3s. */
export function captionCues(document:ProjectDocument,transcripts:readonly Transcript[]):CaptionCue[]{
  const words=projectWords(document,transcripts),cues:CaptionCue[]=[];
  let lines:string[]=[],start=0n,end=0n,clip='',utterance='';
  const flush=()=>{if(lines.length)cues.push({startUs:start.toString(),endUs:end.toString(),lines});lines=[];end=0n;};
  for(const w of words){if([...w.text].length>32)throw new AppError('CAPTION_OVERFLOW');
    if(lines.length && (clip!==w.clipId || utterance!==w.utteranceId || w.startUs-end>600_000n || w.endUs-start>3_000_000n))flush();
    const line=lines.at(-1),joined=line?`${line} ${w.text}`:w.text;
    if(line && [...joined].length>32){if(lines.length===2)flush();else lines.push('');}
    if(!lines.length){start=w.startUs;lines=[w.text];}else lines[lines.length-1]=lines.at(-1)?`${lines.at(-1)} ${w.text}`:w.text;
    if(w.endUs>end)end=w.endUs;clip=w.clipId;utterance=w.utteranceId;
  }
  flush();
  // Overlapping acoustic words must never produce overlapping caption events.
  for(let i=0;i<cues.length-1;i++){if(BigInt(cues[i]!.endUs)>BigInt(cues[i+1]!.startUs))cues[i]!.endUs=cues[i+1]!.startUs;}
  return cues.filter(c=>BigInt(c.endUs)>BigInt(c.startUs));
}
function timestamp(us:string,separator:string,round:'floor'|'ceil'){
  const n=BigInt(us),ms=round==='floor'?n/1000n:(n+999n)/1000n;
  return `${(ms/3_600_000n).toString().padStart(2,'0')}:${(ms/60_000n%60n).toString().padStart(2,'0')}:${(ms/1000n%60n).toString().padStart(2,'0')}${separator}${(ms%1000n).toString().padStart(3,'0')}`;
}
export function subtitleFile(cues:readonly CaptionCue[],format:'srt'|'vtt'){
  return (format==='vtt'?'WEBVTT\n\n':'')+cues.map((c,i)=>`${format==='srt'?`${i+1}\n`:''}${timestamp(c.startUs,format==='srt'?',':'.','floor')} --> ${timestamp(c.endUs,format==='srt'?',':'.','ceil')}\n${c.lines.join('\n')}\n`).join('\n');
}
/** Self-contained: exactly the same function is executed by preview and export Chromium.
 * Font and geometry are pinned; overflow is rejected, never squeezed/clipped. */
export function drawCaption(ctx:CanvasRenderingContext2D,lines:readonly string[],width:number,height:number):void{
  ctx.clearRect(0,0,width,height);if(!lines.length)return;
  const scale=width/1920,fontSize=52*scale,lineHeight=78*scale,margin=96*scale;
  ctx.font=`600 ${fontSize}px EdiretorCaption`;ctx.textAlign='center';ctx.textBaseline='middle';
  const metrics=lines.map(line=>ctx.measureText(line).width),boxWidth=Math.max(...metrics)+64*scale;
  if(lines.length>2 || boxWidth>width-2*margin)throw new Error('CAPTION_OVERFLOW');
  const boxHeight=lines.length*lineHeight+24*scale,y=height-margin-boxHeight;
  ctx.fillStyle='rgba(0,0,0,0.84)';ctx.fillRect((width-boxWidth)/2,y,boxWidth,boxHeight);
  ctx.fillStyle='#ffffff';
  lines.forEach((line,i)=>{ctx.direction=/[\u0600-\u06ff]/u.test(line)?'rtl':'ltr';ctx.fillText(line,width/2,y+12*scale+lineHeight*(i+.5));});
}
