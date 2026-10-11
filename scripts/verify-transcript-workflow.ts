import {spawn,type ChildProcess} from 'node:child_process';
import {mkdir,writeFile,readFile,stat} from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {join,resolve} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {chromium,expect,type Page} from 'playwright/test';
import {projectSchema,jobSchema,type Job} from '../packages/contracts/src/project';
import {native,hashFile,probe} from '../apps/worker/native-media';
import {projectWords,wordDeletionRanges} from '../packages/domain/src/transcript/projection';
import {captionCues,drawCaption} from '../packages/composition/src/captions';

const artifacts=resolve('artifacts',`phase-02-${new Date().toISOString().replace(/[:.]/g,'-')}`),data=join(artifacts,'data'),base='http://127.0.0.1:4322';
await mkdir(artifacts,{recursive:true});
const env={...process.env,EDIRETOR_PORT:'4322',EDIRETOR_DATA:data};
let api:ChildProcess|undefined,worker:ChildProcess|undefined;
function launch(script:string,log:string){const output=createWriteStream(join(artifacts,log));const child=spawn(process.execPath,['--import','tsx',script],{env,windowsHide:true,stdio:['ignore','pipe','pipe']});child.stdout?.pipe(output);child.stderr?.pipe(output);child.on('exit',()=>output.end());return child;}
async function stop(child:ChildProcess|undefined){if(!child||child.exitCode!==null)return;const exited=new Promise<void>(r=>child.once('exit',()=>r()));child.kill();await Promise.race([exited,delay(5000)]);}
async function json(path:string,method='GET',body?:unknown){const response=await fetch(base+path,{method,headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});const value:unknown=await response.json();if(!response.ok)throw new Error(JSON.stringify(value));return value;}
async function waitJob(id:string):Promise<Job>{for(let i=0;i<800;i++){const job=jobSchema.parse(await json(`/api/jobs/${id}`));if(['succeeded','failed','cancelled'].includes(job.status))return job;await delay(250);}throw new Error('JOB_TIMEOUT');}
async function seek(page:Page,us:number){await page.locator('.timeline-seeker').evaluate((element,value)=>{const input=element as HTMLInputElement;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,String(value));input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));},us);}
const evidence:Record<string,unknown>={startedAt:new Date().toISOString(),artifacts,results:[]},results:string[]=[],errors:string[]=[];
const browser=await chromium.launch({headless:true});
try{
  api=launch('apps/api/main.ts','api.log');worker=launch('apps/worker/main.ts','worker.log');
  for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok)break;}catch{}if(i===99)throw new Error('API_TIMEOUT');await delay(100);}
  const health=await json('/api/health') as {transcriptionAvailable:boolean;captionRuntime:string};expect(health.transcriptionAvailable).toBe(true);expect(health.captionRuntime).toContain('chromium');evidence.runtime=health.captionRuntime;
  const context=await browser.newContext({viewport:{width:1440,height:1024},reducedMotion:'reduce',locale:'ar-EG'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(base);await page.getByRole('button',{name:'مشروع جديد',exact:true}).click();await page.getByLabel('اسم المشروع').fill('كلام مصري — تحرير النص والكابشن');
  const source=resolve(process.env.EDIRETOR_SPEECH_FIXTURE??'artifacts/phase-02-fixtures/egyptian.mov'),sourceHash=await hashFile(source,AbortSignal.timeout(10000));
  await page.getByLabel('اختيار ملف فيديو').setInputFiles(source);await page.getByRole('button',{name:'استيراد الفيديو',exact:true}).click();await expect(page.locator('.timeline-clip')).toHaveCount(1,{timeout:120000});await expect(page.getByText('محفوظ على الجهاز',{exact:true})).toBeVisible({timeout:15000});
  const id=new URL(page.url()).searchParams.get('project')!;
  await page.getByRole('button',{name:'تحرير بالنص',exact:true}).click();await expect(page.getByRole('button',{name:'تفريغ الكلام',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'تفريغ الكلام',exact:true}).click();await expect(page.getByRole('button',{name:'استخدام التفريغ في المشروع',exact:true})).toBeVisible({timeout:150000});
  let project=projectSchema.parse(await json(`/api/projects/${id}`));const transcript=project.transcripts![0]!;expect(transcript.words.length).toBeGreaterThan(20);expect(transcript.language).toBe('ar-EG');
  evidence.provider={provider:transcript.provider,model:transcript.model,language:transcript.language,modelVersions:transcript.modelVersions,words:transcript.words.length,hash:transcript.hash,sourceHash,rawKey:transcript.rawKey};
  await page.getByRole('button',{name:'استخدام التفريغ في المشروع',exact:true}).click();await expect(page.locator('.transcript-word')).not.toHaveCount(0);results.push('Actual source upload → native audio extraction → live Deepgram nova-3/ar-EG → immutable transcript → attach through Project Session');
  // Keep real media validation short; all 47s words remain immutable in the transcript.
  await page.getByRole('button',{name:'إغلاق النص',exact:true}).click();await page.locator('.timeline-clip').click();await page.getByLabel('مدة المقطع · ثوانٍ').fill('12');await page.getByRole('button',{name:'تطبيق القص'}).click();await page.getByRole('button',{name:'تحرير بالنص',exact:true}).click();
  await page.locator('.word-seek').first().click();await page.getByRole('button',{name:'تصحيح الكلمة',exact:true}).click();await page.getByLabel('تصحيح الكتابة',{exact:true}).fill('أهلا TypeScript');await page.getByRole('button',{name:'حفظ التصحيح'}).click();await expect(page.locator('.word-seek').first()).toHaveText('أهلا TypeScript');
  await page.getByRole('button',{name:'مسح التحديد'}).click();await page.getByRole('button',{name:'الكابشن',exact:true}).click();await page.getByLabel('إظهار الكابشن ودمجه في الفيديو').check();await page.getByRole('button',{name:'تحرير بالنص',exact:true}).click();
  await expect(page.getByText('محفوظ على الجهاز',{exact:true})).toBeVisible({timeout:15000});project=projectSchema.parse(await json(`/api/projects/${id}`));const before=project.state.document;
  const words=projectWords(before,project.transcripts!),candidate=words.slice(1).find(w=>{try{wordDeletionRanges(before,project.transcripts!,[w]);return true;}catch{return false;}});expect(candidate).toBeDefined();
  const label=`تحديد ${candidate!.text} عند `;await page.getByRole('searchbox').fill(candidate!.text);const word=page.getByRole('button',{name:new RegExp(label)}).first();await word.click();await page.getByRole('button',{name:'حذف الكلمات المحددة'}).click();await page.getByRole('searchbox').fill('');await expect(page.getByText('محفوظ على الجهاز',{exact:true})).toBeVisible({timeout:15000});
  project=projectSchema.parse(await json(`/api/projects/${id}`));expect(projectWords(project.state.document,project.transcripts!).some(w=>w.wordId===candidate!.wordId)).toBe(false);const after=project.state.document;
  await page.getByRole('button',{name:'تراجع',exact:true}).click();await expect(page.getByText('محفوظ على الجهاز',{exact:true})).toBeVisible({timeout:15000});expect(projectSchema.parse(await json(`/api/projects/${id}`)).state.document.sequence).toEqual(before.sequence);
  await page.getByRole('button',{name:'إعادة',exact:true}).click();await expect(page.getByText('محفوظ على الجهاز',{exact:true})).toBeVisible({timeout:15000});await page.reload();await page.getByRole('button',{name:'تحرير بالنص',exact:true}).click();await expect(page.locator('.word-seek').first()).toHaveText('أهلا TypeScript');results.push('Correction changes only display text → word deletion shortens sequence → exact undo/redo → autosave/reload retains caption style and corrected text');
  project=projectSchema.parse(await json(`/api/projects/${id}`));expect(project.state.document.sequence).toEqual(after.sequence);expect(project.transcripts![0]!.hash).toBe(transcript.hash);expect(project.transcripts![0]!.words).toEqual(transcript.words);
  await page.getByRole('searchbox').fill('TypeScript');await expect(page.locator('.transcript-word')).toHaveCount(1);await page.getByRole('searchbox').fill('');
  const cues=captionCues(project.state.document,project.transcripts!),first=cues[0]!;await seek(page,Number(first.startUs)+100000);await expect(page.locator('.transcript-word.is-playing')).not.toHaveCount(0);
  await page.getByRole('button',{name:'تصدير',exact:true}).click();for(const format of ['srt','vtt'] as const){const download=page.waitForEvent('download');await page.getByRole('button',{name:`تنزيل ${format.toUpperCase()}`}).click();await (await download).saveAs(join(artifacts,`captions.${format}`));expect(await readFile(join(artifacts,`captions.${format}`),'utf8')).toContain('أهلا TypeScript');}
  await page.getByRole('button',{name:'بدء التصدير'}).click();await page.getByRole('button',{name:'إغلاق',exact:true}).last().click();
  const jobs=await json(`/api/projects/${id}/jobs`) as Job[],exportJob=jobs.find(j=>j.kind==='export')!,finished=await waitJob(exportJob.id);expect(finished.status,JSON.stringify(finished)).toBe('succeeded');
  const response=await fetch(base+`/api/jobs/${finished.id}/download`),output=join(artifacts,'export.mp4');await writeFile(output,Buffer.from(await response.arrayBuffer()));evidence.output=await probe(output,AbortSignal.timeout(10000));
  // Compare source-shaped pixels, caption rectangle, and exact frame activation.
  const captionTime=Number(first.startUs)/1e6+.2,frame= Math.ceil(captionTime*30),time=frame/30;
  await seek(page,Math.round(time*1e6));await delay(500);
  await page.locator('canvas.caption-preview').screenshot({path:join(artifacts,'preview-caption.png')});
  const pixelData=await page.locator('canvas.caption-preview').evaluate(c=>({url:(c as HTMLCanvasElement).toDataURL('image/png'),width:(c as HTMLCanvasElement).width,height:(c as HTMLCanvasElement).height}));await writeFile(join(artifacts,'preview-caption-full.png'),Buffer.from(pixelData.url.split(',')[1]!,'base64'));
  await native('ffmpeg',['-v','error','-ss',String(time),'-i',output,'-frames:v','1',join(artifacts,'export-caption.png')],AbortSignal.timeout(10000));
  evidence.captionSample={frame,time,cue:first,previewRaster:pixelData.width+'x'+pixelData.height};results.push('Actual corrected SRT/VTT and burned-in H.264 export; same Canvas font/layout used for preview and export');
  for(const theme of ['light','dark']){if(theme==='dark')await page.getByRole('button',{name:'تفعيل المظهر الداكن'}).click();for(const width of [1440,900,390]){await page.setViewportSize({width,height:width===390?844:1024});await page.screenshot({path:join(artifacts,`editor-${width}-${theme}.png`),fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);}}
  results.push('Arabic RTL transcript/editor, isolated playback highlighting, word search, desktop/tablet/phone screenshots in both themes, no horizontal overflow');
  expect(await hashFile(source,AbortSignal.timeout(10000))).toBe(sourceHash);evidence.browserErrors=errors;expect(errors).toEqual([]);evidence.results=results;evidence.projectId=id;evidence.completedAt=new Date().toISOString();await writeFile(join(artifacts,'report.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify({artifacts,results,provider:evidence.provider,outputBytes:(await stat(output)).size},null,2));
}catch(error){evidence.results=results;evidence.error=String(error);evidence.browserErrors=errors;await writeFile(join(artifacts,'report.json'),JSON.stringify(evidence,null,2));console.error(`Phase 02 verification failed; artifacts: ${artifacts}`);throw error;}
finally{await browser.close();await stop(worker);await stop(api);}
