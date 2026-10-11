import {resolve} from 'node:path';
import {mkdir,access,writeFile,readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {bundle} from '@remotion/bundler';
import {openBrowser,selectComposition,renderMedia} from '@remotion/renderer';
import {harness,root,publicDir,loadJson,hash,json,native} from './io';
import {compile,parseSnapshot} from '../src/contract';
import {z} from 'zod';
import {assertGraphicsAlpha} from './graphics-alpha';
const runDir=z.string().parse(process.argv[2]);const candidate=z.enum(['A','B']).parse(process.argv[3]);const cache=process.argv[4];
const snapshot=parseSnapshot(await loadJson(resolve(runDir,'snapshot.json')));
for(const a of snapshot.assets)if(await hash(resolve(publicDir,a.file))!==a.sha256)throw new Error(`ASSET_HASH_MISMATCH:${a.id}`);
const cacheDir=resolve(root,'.cache/feasibility');await mkdir(cacheDir,{recursive:true});
const bundlePath=resolve(cacheDir,'bundle');
const fingerprint=createHash('sha256');
for(const directory of ['packages/domain/src','experiments/render-feasibility/src']){
  for(const file of (await readdir(resolve(root,directory),{recursive:true})).filter(f=>/\.(ts|tsx)$/.test(f)).sort())fingerprint.update(directory+'/'+file).update(await readFile(resolve(root,directory,file)));
}
fingerprint.update(await readFile(resolve(root,'package-lock.json'))).update(await readFile(resolve(harness,'generated/snapshots.json')));
const compositionHash=fingerprint.digest('hex');
let exists=true;try{await access(resolve(bundlePath,'index.html'));}catch{exists=false;}
try{if((await readFile(resolve(cacheDir,'bundle.hash'),'utf8'))!==compositionHash)exists=false;}catch{exists=false;}
console.log('Preparing composition bundle');
if(cache==='cold'||!exists){await bundle({entryPoint:resolve(harness,'src/index.ts'),publicDir,outDir:bundlePath});await writeFile(resolve(cacheDir,'bundle.hash'),compositionHash);}
console.log('Opening renderer browser');
const browser=await openBrowser('chrome',{logLevel:'warn',chromiumOptions:{gl:'swangle'}});
const inputProps={snapshot};
// Remotion's PCM split and Matroska segments may quantize packet clocks to ms.
// The composition already samples a CFR grid; restore that grid without re-encoding.
const clockFilter=`setts=pts=round(PTS*TB*${snapshot.fps.num}/${snapshot.fps.den})*${snapshot.fps.den}:dts=round(DTS*TB*${snapshot.fps.num}/${snapshot.fps.den})*${snapshot.fps.den}:duration=${snapshot.fps.den}:time_base=1/${snapshot.fps.num}`;
const composition=await selectComposition({serveUrl:bundlePath,id:snapshot.fixture,inputProps,puppeteerInstance:browser});
const shared={serveUrl:bundlePath,composition,inputProps,puppeteerInstance:browser,concurrency:2,hardwareAcceleration:'disable' as const,chromiumOptions:{gl:'swangle' as const},offthreadVideoCacheSizeInBytes:256*1024*1024,logLevel:'warn' as const};
let last=0;
async function progress(value:unknown){await json(resolve(runDir,'progress.json'),value);}
try{
  if(candidate==='A'){
    await renderMedia({...shared,outputLocation:resolve(runDir,'video.mp4'),codec:'h264',crf:18,x264Preset:'veryfast',pixelFormat:'yuv420p',audioCodec:'pcm-16',separateAudioTo:resolve(runDir,'audio.wav'),sampleRate:48000,
      onProgress:p=>{if(Date.now()-last>3000){last=Date.now();void progress({stage:'remotion',renderedFrames:p.renderedFrames,encodedFrames:p.encodedFrames,totalFrames:composition.durationInFrames,progress:p.progress});console.log(`A frames ${p.renderedFrames}/${composition.durationInFrames}`);}}
    });
    // Encode AAC once from lossless composition audio. Avoid repeated AAC priming delays.
    await native('ffmpeg',['-hide_banner','-loglevel','error','-nostdin','-y','-i',resolve(runDir,'video.mp4'),'-i',resolve(runDir,'audio.wav'),'-map','0:v:0','-map','1:a:0','-c:v','copy','-bsf:v',clockFilter,'-video_track_timescale',String(snapshot.fps.num),'-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-t',String(Number(snapshot.durationUs)/1e6),'-movflags','+faststart',resolve(runDir,'output.mp4')],600_000);
  }else{
    const graphicsInputProps={snapshot,graphicsOnly:true};
    const graphicsComposition=await selectComposition({serveUrl:bundlePath,id:snapshot.fixture,inputProps:graphicsInputProps,puppeteerInstance:browser});
    const plan=compile(snapshot);const graphicsPaths=new Map<string,string>();
    for(const g of plan.graphics){
      // Content key excludes placement, includes all visual dependencies and runtime.
      const key=createHash('sha256').update(JSON.stringify({graphicsCacheVersion:2,compositionHash,text:g.text,image:snapshot.assets.find(a=>a.id===g.imageAssetId),font:snapshot.assets.find(a=>a.kind==='font'),width:snapshot.width,height:snapshot.height,fps:snapshot.fps,frames:g.to-g.from,template:snapshot.templateVersion,runtime:snapshot.rendererVersion})).digest('hex');
      const path=resolve(cacheDir,`${key}.mov`);let ready=true;try{await access(path);}catch{ready=false;}
      // Only the first matching placement needs rendering even in a cold run.
      if(!ready||(cache==='cold'&&![...graphicsPaths.values()].includes(path))){
        await progress({stage:'graphics',graphicId:g.id,frames:g.to-g.from});
        const temporary=resolve(runDir,`${key}.partial.mov`);
        await renderMedia({...shared,composition:graphicsComposition,inputProps:graphicsInputProps,frameRange:[g.from,g.to-1],outputLocation:temporary,codec:'prores',proResProfile:'4444',pixelFormat:'yuva444p10le',imageFormat:'png',muted:true});
        await assertGraphicsAlpha(temporary,g.to-g.from);
        const {rename}=await import('node:fs/promises');await rename(temporary,path);
      }
      graphicsPaths.set(g.id,path);
    }
    const boundaries=[...new Set([0,plan.durationInFrames,...plan.clips.flatMap(c=>[c.from,c.to]),...plan.graphics.flatMap(g=>[g.from,g.to]),...plan.layouts.flatMap(l=>[l.from,l.to])])].sort((a,b)=>a-b);
    const parts:string[]=[];const fps=snapshot.fps.num/snapshot.fps.den;
    for(let i=0;i<boundaries.length-1;i++){
      const from=boundaries[i]!,to=boundaries[i+1]!;const c=plan.clips.find(c=>from>=c.from&&from<c.to);if(!c)throw new Error('CLIP_GAP');
      const a=snapshot.assets.find(a=>a.id===c.assetId);if(!a)throw new Error('ASSET_MISSING');
      const duration=(to-from)/fps;const args=['-hide_banner','-loglevel','error','-nostdin','-y','-ss',String((c.sourceFrame+from-c.from)/fps),'-i',resolve(publicDir,a.file)];
      const g=plan.graphics.find(g=>from>=g.from&&from<g.to);
      if(g)args.push('-ss',String((from-g.from)/fps),'-i',graphicsPaths.get(g.id)!);
      const inset=plan.layouts.some(l=>l.mode==='inset'&&from>=l.from&&from<l.to);
      const w=inset?snapshot.width*.8:snapshot.width,h=inset?snapshot.height*.8:snapshot.height;
      const scale=`[0:v]scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${snapshot.width}:${snapshot.height}:${inset?snapshot.width*.1:'(ow-iw)/2'}:${inset?snapshot.height*.05:'(oh-ih)/2'}:color=0x071320,setsar=1,fps=${snapshot.fps.num}/${snapshot.fps.den}`;
      args.push('-filter_complex',g?`${scale}[base];[base][1:v]overlay=0:0:shortest=1,format=yuv420p[v]`:`${scale},format=yuv420p[v]`,'-map','[v]','-map','0:a:0','-t',String(duration),'-c:v','libx264','-threads','2','-preset','veryfast','-crf','18','-pix_fmt','yuv420p','-c:a','pcm_s16le','-ar','48000','-ac','2');
      const part=resolve(runDir,`part-${String(i).padStart(5,'0')}.mkv`);args.push(part);await native('ffmpeg',args,600_000);parts.push(part);
      await progress({stage:'ffmpeg',completedFrames:to,totalFrames:plan.durationInFrames,completedSegments:i+1,totalSegments:boundaries.length-1});console.log(`B frames ${to}/${plan.durationInFrames}`);
    }
    const list=resolve(runDir,'concat.txt');await writeFile(list,parts.map(p=>`file '${p.replaceAll('\\','/').replaceAll("'","'\\''")}'`).join('\n'));
    await native('ffmpeg',['-hide_banner','-loglevel','error','-nostdin','-y','-f','concat','-safe','0','-i',list,'-c:v','copy','-bsf:v',clockFilter,'-video_track_timescale',String(snapshot.fps.num),'-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-t',String(Number(snapshot.durationUs)/1e6),'-movflags','+faststart',resolve(runDir,'output.mp4')],600_000);
  }
  await progress({stage:'rendered',totalFrames:composition.durationInFrames});
}finally{await browser.close({silent:true});}
