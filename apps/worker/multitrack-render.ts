import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import type {ProjectDocument} from '../../packages/contracts/src/project';
import {visualLayers,activeClips,audioAllowed,defaultAudio,compositionBoundaries} from '../../packages/composition/src/multitrack';
import {usToFrame} from '../../packages/domain/src/time/frames';
import {native} from './native-media';
import type {LocalStorage} from '../api/infrastructure/storage';

const sec=(v:bigint)=>Number(v)/1e6;
const even=(v:number)=>Math.max(2,Math.round(v/2)*2);
/** Render sparse constant-layout spans, mix PCM and encode AAC once at final mux. */
export async function renderMultitrack(d:ProjectDocument,storage:LocalStorage,work:string,signal:AbortSignal,progress:(stage:string,value:number)=>void){
  const boundaries=compositionBoundaries(d),videoParts:string[]=[],audioParts:string[]=[];
  const total=boundaries.at(-1)??0n,lastFrame=usToFrame(total,d.sequence.fps,'ceil');
  for(let i=0;i<boundaries.length-1;i++){
    const begin=boundaries[i]!,end=boundaries[i+1]!,startFrame=usToFrame(begin,d.sequence.fps),finishFrame=i===boundaries.length-2?lastFrame:usToFrame(end,d.sequence.fps),frames=finishFrame-startFrame;
    if(frames<=0)continue;
    const spanStart=BigInt(Math.ceil(startFrame*1e6/30)),duration=frames/30;
    const visible=visualLayers(d,begin),audible=activeClips(d,begin).filter(c=>audioAllowed(d,c)),inputs=[...new Map([...visible.map(l=>l.clip),...audible].map(c=>[c.id,c])).values()];
    const args=['-hide_banner','-loglevel','error','-nostdin','-y','-filter_complex_threads','1'];
    for(const c of inputs){const a=d.assetRefs.find(a=>a.id===c.assetId)!;if(a.mediaKind==='image')args.push('-loop','1');else args.push('-ss',String(sec(BigInt(c.sourceInUs))));args.push('-i',storage.path(a.original));}
    args.push('-f','lavfi','-i',`color=c=black:s=${d.sequence.canvas.width}x${d.sequence.canvas.height}:r=30:d=${duration}`,'-f','lavfi','-i',`anullsrc=r=48000:cl=stereo:d=${duration}`);
    const graph:string[]=[],w=d.sequence.canvas.width,h=d.sequence.canvas.height;
    let current=`${inputs.length}:v`;
    for(const [k,l] of visible.entries()){
      const c=l.clip,x=l.transform,index=inputs.findIndex(x=>x.id===c.id),local=Math.max(0,sec(spanStart-BigInt(c.sequenceStartUs))),fade=sec(BigInt(c.transitionUs??'0'));
      graph.push(`[${index}:v]scale=${w}:${h}:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,crop=${even(x.cropWidth*w)}:${even(x.cropHeight*h)}:${Math.round(x.cropX*w)}:${Math.round(x.cropY*h)},scale=${even(x.width*w)}:${even(x.height*h)},format=rgba${fade?`,fade=t=in:st=0:d=${fade}:alpha=1,fade=t=out:st=${sec(BigInt(c.durationUs))-fade}:d=${fade}:alpha=1`:''},trim=start=${local}:duration=${duration},setpts=PTS-STARTPTS[v${k}]`);
      graph.push(`[${current}][v${k}]overlay=x=${Math.round(x.x*w)}:y=${Math.round(x.y*h)}:eof_action=pass:shortest=0[o${k}]`);current=`o${k}`;
    }
    graph.push(`[${current}]trim=duration=${duration},format=yuv420p[outv]`);
    const audioLabels=[`[${inputs.length+1}:a]`];
    for(const [k,c] of audible.entries()){
      const index=inputs.findIndex(x=>x.id===c.id),a={...defaultAudio,...c.audio},local=Math.max(0,sec(spanStart-BigInt(c.sequenceStartUs))),dur=sec(BigInt(c.durationUs)),fi=sec(BigInt(a.fadeInUs)),fo=sec(BigInt(a.fadeOutUs));
      const primary=d.sequence.clips.filter(x=>audioAllowed(d,x)&&(d.syncGroups?.find(g=>g.id===x.syncGroupId)?.primaryAssetId===x.assetId||d.sourceRoles?.find(r=>r.assetId===x.assetId)?.role==='primary-audio'));
      const activity=primary.map(x=>`between(t+${sec(spanStart)},${sec(BigInt(x.sequenceStartUs))},${sec(BigInt(x.sequenceStartUs)+BigInt(x.durationUs))})`).join('+')||'0';
      graph.push(`[${index}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,asetpts=PTS-STARTPTS,volume=${a.gain}${fi?`,afade=t=in:st=0:d=${fi}`:''}${fo?`,afade=t=out:st=${dur-fo}:d=${fo}`:''},atrim=start=${local}:duration=${duration},asetpts=PTS-STARTPTS${a.ducking?`,volume='if(gt(${activity},0),${a.duckGain},1)':eval=frame`:''},apad,atrim=duration=${duration}[a${k}]`);audioLabels.push(`[a${k}]`);
    }
    graph.push(`${audioLabels.join('')}amix=inputs=${audioLabels.length}:normalize=0:duration=first,atrim=duration=${duration}[outa]`);
    const v=`segment-${i}.mp4`,a=`audio-${i}.wav`;
    await native('ffmpeg',[...args,'-filter_complex',graph.join(';'),'-map','[outv]','-an','-frames:v',String(frames),'-c:v','libx264','-preset','veryfast','-crf','20','-pix_fmt','yuv420p','-threads','2',join(work,v),'-map','[outa]','-vn','-t',String(duration),'-c:a','pcm_s16le','-ar','48000','-ac','2',join(work,a)],signal);
    videoParts.push(`file '${v}'`);audioParts.push(`file '${a}'`);progress('encoding',(i+1)/(boundaries.length-1)*.9);
  }
  await writeFile(join(work,'concat.txt'),videoParts.join('\n'));await writeFile(join(work,'audio-concat.txt'),audioParts.join('\n'));
}
