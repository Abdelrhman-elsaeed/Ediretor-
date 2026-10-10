import {resolve,basename} from 'node:path';
import {writeFile,readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {ensureBrowser} from '@remotion/renderer';
import {z} from 'zod';
import {root,publicDir,loadJson,probe,native,json} from './io';
import {parseSnapshot,compile} from '../src/contract';

const runDir=resolve(z.string().parse(process.argv[2]));
const s=parseSnapshot(await loadJson(resolve(runDir,'snapshot.json')));const plan=compile(s);
if(Number(s.durationUs)>60_000_000)throw new Error('SHORT_FIXTURE_VALIDATOR_ONLY');
const output=resolve(runDir,'output.mp4');const info=await probe(output);
const video=info.streams.find(s=>s.codec_type==='video'),audio=info.streams.find(s=>s.codec_type==='audio');
const fps=s.fps.num/s.fps.den;
const durationErrorSeconds=Math.abs(Number(info.format.duration)-Number(s.durationUs)/1e6);
const metadataPass=video?.width===s.width&&video.height===s.height&&video.codec_name==='h264'&&audio?.codec_name==='aac'&&audio.sample_rate==='48000'&&Number(video.nb_frames)===plan.durationInFrames&&durationErrorSeconds<=1/fps&&video.avg_frame_rate===`${s.fps.num}/${s.fps.den}`;
// Full decode, not just a successful encoder exit or container probe.
await native('ffmpeg',['-v','error','-xerror','-i',output,'-f','null','-'],600_000);
const decoded=z.object({frames:z.array(z.object({best_effort_timestamp_time:z.string()}))}).parse(JSON.parse((await native('ffprobe',['-v','error','-select_streams','v:0','-show_frames','-show_entries','frame=best_effort_timestamp_time','-of','json',output],600_000)).toString()));
const timingMaxErrorSeconds=Math.max(...decoded.frames.map((f,i)=>Math.abs(Number(f.best_effort_timestamp_time)-i/fps)));
const browserInfo=await ensureBrowser({logLevel:'warn'});if(!('path' in browserInfo))throw new Error('BROWSER_MISSING');
const browser=await chromium.launch({executablePath:browserInfo.path,headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--disable-gpu']});
const page=await browser.newPage({viewport:{width:s.width,height:s.height},deviceScaleFactor:1});
const pageErrors:string[]=[];page.on('pageerror',e=>pageErrors.push(e.message));
const frames=[0,29,30,60,89,90,179,180,269,270,329,359].filter(f=>f<plan.durationInFrames);
const parity:{frame:number;matchedFrame:number;meanAbsoluteError:number;psnr:number;pass:boolean}[]=[];
try{
  await page.goto(`http://127.0.0.1:3100/?fixture=${s.fixture}&validation=1`);
  await page.waitForFunction(()=>Boolean(window.phase00));
  for(const frame of frames){
    const clip=plan.clips.find(c=>frame>=c.from&&frame<c.to);if(!clip)throw new Error('CLIP_MISSING');
    await page.evaluate(f=>window.phase00?.seek(f),frame);
    await page.waitForFunction(expected=>{const v=document.querySelector('video');return v&&v.readyState>=2&&!v.seeking&&Math.abs(v.currentTime-expected)<0.005;},(clip.sourceFrame+frame-clip.from)/fps,{timeout:30000});
    await page.evaluate(()=>document.fonts.ready);
    await page.waitForTimeout(150);
    const png=resolve(runDir,`preview-${frame}.png`);await page.locator('#preview-frame').screenshot({path:png});
    const expected=await native('ffmpeg',['-v','error','-i',png,'-vf','scale=480:270','-pix_fmt','rgb24','-f','rawvideo','-']);
    let best={frame,matchedFrame:frame,meanAbsoluteError:Infinity,psnr:0,pass:false};
    // Quality permits one display-frame tolerance; record which frame matched, never hide it.
    for(const candidate of [frame,frame-1,frame+1].filter(f=>f>=0&&f<plan.durationInFrames)){
      const actual=await native('ffmpeg',['-v','error','-ss',String(candidate/fps),'-i',output,'-frames:v','1','-vf','scale=480:270','-pix_fmt','rgb24','-f','rawvideo','-']);
      let abs=0,square=0;for(let i=0;i<expected.length;i++){const d=(expected[i]??0)-(actual[i]??0);abs+=Math.abs(d);square+=d*d;}
      const mae=abs/expected.length;const psnr=10*Math.log10(255**2/(square/expected.length));
      if(psnr>best.psnr)best={frame,matchedFrame:candidate,meanAbsoluteError:mae,psnr,pass:actual.length===expected.length&&mae<5&&psnr>28};
      if(candidate===frame&&best.pass)break;
    }
    parity.push(best);
    console.log(`Frame ${frame} matched ${best.matchedFrame}: MAE ${best.meanAbsoluteError.toFixed(2)}, PSNR ${best.psnr.toFixed(2)}`);
  }
}finally{await browser.close();}
// Compare pulse envelopes against original source samples mapped through each clip.
// Millisecond bins avoid confusing the periodic 1kHz carrier with A/V drift.
async function envelope(file:string){const b=await native('ffmpeg',['-v','error','-i',file,'-vn','-ac','1','-ar','8000','-f','f32le','-']);const env:number[]=[];for(let offset=0;offset+32<=b.length;offset+=32){let sum=0;for(let j=0;j<8;j++)sum+=b.readFloatLE(offset+j*4)**2;env.push(Math.sqrt(sum/8));}return env;}
const sourceAsset=s.assets.find(a=>a.kind==='video');if(!sourceAsset)throw new Error('SOURCE_MISSING');
const source=await envelope(resolve(publicDir,sourceAsset.file)),actual=await envelope(output);
const sync=[500,Math.floor(actual.length/2)+500,actual.length-1500].map(start=>{
  let bestError=Infinity,bestOffset=0;
  for(let shift=-100;shift<=100;shift++){
    let error=0;
    for(let i=start;i<start+1000;i++){
      const c=s.clips.find(c=>i*1000>=Number(c.sequenceStartUs)&&i*1000<Number(c.sequenceStartUs)+Number(c.durationUs));if(!c)throw new Error('TIMING_GAP');
      const expected=source[Math.floor((Number(c.sourceInUs)+i*1000-Number(c.sequenceStartUs))/1000)]??0;
      error+=(expected-(actual[i+shift]??0))**2;
    }
    if(error<bestError){bestError=error;bestOffset=shift;}
  }
  return {windowStartMs:start,offsetMs:bestOffset,envelopeMeanSquareError:bestError/1000,pass:Math.abs(bestOffset)<=40&&bestError/1000<0.002};
});
const result={runId:basename(runDir),metadataPass,durationErrorSeconds,frameCount:decoded.frames.length,timingMaxErrorSeconds,timingPass:decoded.frames.length===plan.durationInFrames&&timingMaxErrorSeconds<0.00001,fullDecodePass:true,parity,pageErrors,sync,arabicVisualReview:'manual inspection required; screenshots retained',limitations:'Short fixtures only; marker audio is synthetic; Arabic text is authored overlay, not speech transcription',pass:metadataPass&&timingMaxErrorSeconds<0.00001&&parity.every(p=>p.pass)&&sync.every(p=>p.pass)&&pageErrors.length===0};
await json(resolve(runDir,'validation.json'),result);await json(resolve(root,'docs/evidence',`${basename(runDir)}-validation.json`),result);
console.log(JSON.stringify(result,null,2));if(!result.pass)process.exitCode=1;
