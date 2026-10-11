import {chromium} from 'playwright';
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {AppError} from '../../packages/contracts/src/project';
import {defaultCaptionStyle} from '../../packages/contracts/src/transcript';
import {drawCaption,type CaptionCue} from '../../packages/composition/src/captions';
import {native} from './native-media';

/** Runtime stamp pins the actual Chromium executable and FFmpeg build, not an alias. */
export async function captionRuntime(signal:AbortSignal):Promise<string>{
  const font=await readFile('apps/web/public/fonts/arabic.ttf');
  if(createHash('sha256').update(font).digest('hex')!==defaultCaptionStyle.fontHash)throw new AppError('CAPTION_FONT_MISMATCH');
  const browser=await chromium.launch({headless:true});
  try{return `canvas-captions-v1;playwright-1.62.1;chromium-${browser.version()};${(await native('ffmpeg',['-version'],signal)).split('\n')[0]}`;}finally{await browser.close();}
}
/** Static transparent cue PNGs form a sparse concat stream; one overlay at final mux.
 * No per-word filter graph, no font substitution, no Remotion qualification change. */
export async function captionOverlay(cues:readonly CaptionCue[],frames:number,width:number,height:number,work:string,signal:AbortSignal):Promise<string>{
  const browser=await chromium.launch({headless:true}),abort=()=>{void browser.close();};signal.addEventListener('abort',abort,{once:true});
  try{
    const page=await browser.newPage(),font=(await readFile('apps/web/public/fonts/arabic.ttf')).toString('base64');
    await page.setContent(`<style>@font-face{font-family:EdiretorCaption;src:url(data:font/ttf;base64,${font});font-weight:100 900}</style><canvas width="${width}" height="${height}"></canvas>`);
    await page.evaluate(async()=>{await document.fonts.load('600 52px EdiretorCaption');await document.fonts.ready;});
    const entries:{frame:number;file:string}[]=[{frame:0,file:'caption-blank.png'}];
    async function raster(lines:readonly string[],file:string){
      signal.throwIfAborted();const data=await page.evaluate(({lines,renderer,width,height})=>{const canvas=document.querySelector('canvas')!;const fn=(0,eval)(`(${renderer})`) as typeof drawCaption;fn(canvas.getContext('2d')!,lines,width,height);return canvas.toDataURL('image/png').split(',')[1]!;},{lines:[...lines],renderer:drawCaption.toString(),width,height});
      await writeFile(join(work,file),Buffer.from(data,'base64'));
    }
    await raster([],'caption-blank.png');
    for(const [i,cue] of cues.entries()){
      const start=Number((BigInt(cue.startUs)*30n+999_999n)/1_000_000n),end=Number((BigInt(cue.endUs)*30n+999_999n)/1_000_000n);if(end<=start)continue;
      const file=`caption-${i}.png`;await raster(cue.lines,file);entries.push({frame:start,file},{frame:end,file:'caption-blank.png'});
    }
    const sorted=entries.sort((a,b)=>a.frame-b.frame),events=sorted.filter((e,i)=>i===sorted.length-1 || e.frame!==sorted[i+1]!.frame);
    const lines=['ffconcat version 1.0'];
    for(let i=0;i<events.length;i++){const event=events[i]!,end=events[i+1]?.frame??frames;if(end<=event.frame)continue;lines.push(`file '${event.file}'`,'option framerate 30',`duration ${((end-event.frame)/30).toFixed(9)}`);}
    lines.push("file 'caption-blank.png'",'option framerate 30');
    const file=join(work,'captions.ffconcat');await writeFile(file,lines.join('\n'));return file;
  }catch(e){if(e instanceof Error && e.message.includes('CAPTION_OVERFLOW'))throw new AppError('CAPTION_OVERFLOW');throw e;}
  finally{signal.removeEventListener('abort',abort);await browser.close();}
}
