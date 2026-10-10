import {mkdir,writeFile,readFile,access} from 'node:fs/promises';
import {resolve} from 'node:path';
import {harness,publicDir,json,hash,native,probe} from './io';
import {parseSnapshot, type Snapshot} from '../src/contract';
import {cutClip} from '../../../packages/domain/src/editing/cut-clip';
import {micros} from '../../../packages/domain/src/time/micros';
import {timeInterval} from '../../../packages/domain/src/interval/time-interval';
import {frameToUs} from '../../../packages/domain/src/time/frames';

const dir=resolve(publicDir,'generated'); await mkdir(dir,{recursive:true});
async function download(url:string,name:string,expectedHash:string) {
  const target=resolve(dir,name);try{await access(target);if(await hash(target)!==expectedHash)throw new Error(`FIXTURE_HASH_MISMATCH:${name}`);return;}catch(e){if(e instanceof Error&&e.message.startsWith('FIXTURE_HASH'))throw e;}
  const response=await fetch(url);if(!response.ok)throw new Error(`DOWNLOAD:${response.status}:${url}`);
  await writeFile(target,Buffer.from(await response.arrayBuffer()));
  if(await hash(target)!==expectedHash)throw new Error(`FIXTURE_HASH_MISMATCH:${name}`);
}
await download('https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4','flower.mp4','0cd83d944a6ca7822b4a8306cecc60a36e859b041f6702c6a1ad9ead78924451');
await download('https://raw.githubusercontent.com/google/fonts/bd8f81ddb5c74d5c8897b36ad88b440266245103/ofl/notosansarabic/NotoSansArabic%5Bwdth,wght%5D.ttf','arabic.ttf','63111b5b2e074dd48cc67692e0a2726d86ee94c1c37fe8598257b7b4e87e869e');
await download('https://raw.githubusercontent.com/google/fonts/bd8f81ddb5c74d5c8897b36ad88b440266245103/ofl/notosansarabic/OFL.txt','font-license.txt','07fc70bfeb985cc1a87a8587d0a0c80bab11c86c9dc3fd95b6f0cb332f983e96');
await download('https://raw.githubusercontent.com/mdn/interactive-examples/13024db581b08fae11a0ca229497198b9b0534e7/LICENSE','media-license.txt','36ffd9dc085d529a7e60e1276d73ae5a030b020313e6c5408593a6ae2af39673');
await writeFile(resolve(dir,'overlay.svg'),'<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" rx="28" fill="#62e2b5"/><path d="M30 34h68v14H46v12h42v14H46v12h52v14H30z" fill="#10243b"/></svg>');
// A/V markers share a source clock: white square + 1kHz pulse for the first 100ms of every second.
const markerFilter="drawbox=x=40:y=40:w=100:h=100:color=white:t=fill:enable='lt(mod(t,1),0.1)'";
async function generate(name:string,args:string[]) {try{await access(resolve(dir,name));return;}catch{}await native('ffmpeg',['-hide_banner','-loglevel','error','-nostdin','-y',...args,resolve(dir,name)],180_000);}
await generate('markers.mp4',['-f','lavfi','-i','testsrc2=size=1920x1080:rate=30:duration=16','-f','lavfi','-i',"aevalsrc='if(lt(mod(t,1),0.1),0.5*sin(2*PI*1000*t),0)':s=48000:d=16",'-vf',markerFilter,'-c:v','libx264','-threads','2','-preset','veryfast','-crf','23','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-ac','2','-shortest']);
// Real camera footage, looped to 16s, with explicitly synthetic marker audio.
await generate('real.mp4',['-stream_loop','-1','-i',resolve(dir,'flower.mp4'),'-i',resolve(dir,'markers.mp4'),'-t','16','-map','0:v:0','-map','1:a:0','-vf',`scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=30,${markerFilter}`,'-c:v','libx264','-threads','2','-preset','veryfast','-crf','23','-pix_fmt','yuv420p','-c:a','copy']);
const metadata=await Promise.all(['flower.mp4','real.mp4','markers.mp4'].map(async name=>({name,sha256:await hash(resolve(dir,name)),probe:await probe(resolve(dir,name))})));
async function snapshot(fixture:Snapshot['fixture']):Promise<Snapshot>{
  const real=fixture==='real';const video=real?'real.mp4':'markers.mp4';
  const fps={num:30,den:1};
  const long=fixture==='Q05'||fixture==='Q06';
  const totalFrames=fixture==='Q05'?108000:fixture==='Q06'?432000:360;
  let clips:Snapshot['clips']=[];
  if(!long){
    const base={id:'clip-original',assetId:'source',sourceInUs:0n,sequenceStartUs:0n,durationUs:16000000n};
    clips=cutClip(base,[[2000000n,3000000n],[6000000n,7000000n],[10000000n,12000000n]].map(([a,b])=>timeInterval(micros(a!),micros(b!))),'cut-demo').map(c=>({...c,sourceInUs:String(c.sourceInUs),sequenceStartUs:String(c.sequenceStartUs),durationUs:String(c.durationUs),rate:1}));
  } else {
    const count=fixture==='Q05'?501:900;let cursor=0;
    for(let i=0;i<count;i++){
      const end=Math.floor((i+1)*totalFrames/count); const duration=frameToUs(end,fps)-frameToUs(cursor,fps);
      // Repeated occurrences keep fixture storage bounded. Q05 trims 500 occurrences; last is untrimmed.
      const original={id:`clip-${i}`,assetId:'source',sourceInUs:0n,sequenceStartUs:frameToUs(cursor,fps),durationUs:fixture==='Q05'&&i<500?16000000n:duration};
      const result=fixture==='Q05'&&i<500?cutClip(original,[timeInterval(micros(duration),micros(16000000n))],`trim-${i}`):[original];
      clips.push(...result.map(c=>({...c,sourceInUs:String(c.sourceInUs),sequenceStartUs:String(c.sequenceStartUs),durationUs:String(c.durationUs),rate:1 as const})));cursor=end;
    }
  }
  const durationUs=String(frameToUs(totalFrames,fps));
  const graphicsCount=fixture==='Q05'?100:2;
  const graphics=Array.from({length:graphicsCount},(_,i)=>{
    const from=graphicsCount===2?(i===0?30:totalFrames-90):i*1080+30;
    return {id:`graphic-${i}`,startUs:String(frameToUs(from,fps)),endUs:String(frameToUs(from+60,fps)),text:'شرح واضح — React و TypeScript 2026',imageAssetId:'overlay'};
  });
  return parseSnapshot({schemaVersion:0,projectId:`phase00-${fixture}`,revisionId:`revision-${fixture}-v1`,fixture,synthetic:!real,rendererVersion:'4.0.518',templateVersion:'phase00-v1',width:fixture==='Q10'?3840:1920,height:fixture==='Q10'?2160:1080,fps,durationUs,cutCount:fixture==='Q05'?500:fixture==='Q06'?0:3,
    assets:[{id:'source',file:`generated/${video}`,sha256:await hash(resolve(dir,video)),kind:'video',durationUs:'16000000'}, {id:'overlay',file:'generated/overlay.svg',sha256:await hash(resolve(dir,'overlay.svg')),kind:'image',durationUs:'0'},{id:'font',file:'generated/arabic.ttf',sha256:await hash(resolve(dir,'arabic.ttf')),kind:'font',durationUs:'0'}],clips,graphics,layouts:[{startUs:String(frameToUs(Math.floor(totalFrames/2),fps)),endUs:durationUs,mode:'inset'}]});
}
const snapshots=await Promise.all((['real','markers','Q05','Q06','Q10'] as const).map(snapshot));
await json(resolve(harness,'generated/snapshots.json'),snapshots);
await json(resolve(harness,'generated/fixtures.json'),{createdAt:new Date().toISOString(),metadata,realSource:'MDN CC0 flower.mp4; looped footage + synthetic marker audio, not Arabic speech',longWorkload:'Synthetic repeated 16s source occurrences; complete 60min/4h sequences. Q05 has 500 tail trims and 100 graphic placements. Q06 has two 2s graphics.'});
await mkdir(resolve(harness,'licenses'),{recursive:true});
for(const name of ['font-license.txt','media-license.txt'])await writeFile(resolve(harness,'licenses',name),await readFile(resolve(dir,name)));
console.log('Prepared real, markers, Q05 (60m), Q06 (4h), Q10 (12s 4K) snapshots.');
