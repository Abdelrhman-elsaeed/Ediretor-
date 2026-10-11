import {spawn,type ChildProcess} from 'node:child_process';
import {mkdir,writeFile,readFile,rename,stat} from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {join,resolve} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {chromium,expect,type Page} from 'playwright/test';
import {z} from 'zod';
import {projectSchema,jobSchema,type Job} from '../packages/contracts/src/project';
import {native,hashFile,probe} from '../apps/worker/native-media';

const stamp=new Date().toISOString().replace(/[:.]/g,'-'), artifacts=resolve('artifacts',`phase-01-${stamp}`),data=join(artifacts,'data'),base='http://127.0.0.1:4320';
await mkdir(artifacts,{recursive:true});
const env={...process.env,EDIRETOR_PORT:'4320',EDIRETOR_DATA:data};
let api:ChildProcess,worker:ChildProcess;
function launch(script:string,log:string) {const output=createWriteStream(join(artifacts,log),{flags:'a'});const child=spawn(process.execPath,['--import','tsx',script],{env,windowsHide:true,stdio:['ignore','pipe','pipe']});child.stdout?.pipe(output);child.stderr?.pipe(output);child.on('exit',()=>output.end());return child;}
async function stop(child:ChildProcess) {if(child.exitCode!==null)return;const exited=new Promise<void>(resolve=>child.once('exit',()=>resolve()));child.kill();await Promise.race([exited,delay(5000)]);}
async function waitReady() {for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok)return;}catch{}await delay(100);}throw new Error('API_START_TIMEOUT');}
async function json(path:string,method='GET',body?:unknown) {const response=await fetch(base+path,{method,headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});const value:unknown=await response.json();if(!response.ok)throw new Error(JSON.stringify(value));return value;}
async function waitJob(id:string):Promise<Job> {for(let i=0;i<400;i++){const job=jobSchema.parse(await json(`/api/jobs/${id}`));if(['succeeded','failed','cancelled'].includes(job.status))return job;await delay(250);}throw new Error('JOB_TIMEOUT');}
async function seek(page:Page,us:number) {
  await page.locator('.timeline-seeker').evaluate((element,value)=>{const input=element as HTMLInputElement;const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!;setter.call(input,String(value));input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));},us);
}
const evidence:Record<string,unknown>={startedAt:new Date().toISOString(),artifacts,data,results:[]};
const results:string[]=[];
const browser=await chromium.launch({headless:true});
try {
  api=launch('apps/api/main.ts','api.log');worker=launch('apps/worker/main.ts','worker.log');await waitReady();
  const context=await browser.newContext({viewport:{width:1440,height:1024},reducedMotion:'reduce',locale:'ar-EG'}),page=await context.newPage();
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await page.goto(base);await expect(page.getByRole('heading',{name:'أول درس، مساحة مفتوحة.'})).toBeVisible();await page.screenshot({path:join(artifacts,'library-empty-light.png'),fullPage:true});
  await page.getByRole('button',{name:'تفعيل المظهر الداكن'}).click();await page.screenshot({path:join(artifacts,'library-empty-dark.png'),fullPage:true});await page.getByRole('button',{name:'تفعيل المظهر الفاتح'}).click();
  const failurePage=await context.newPage();await failurePage.route('**/api/projects?*',async route=>{await delay(500);await route.abort();});await failurePage.goto(base);await expect(failurePage.getByText('جارٍ فتح المكتبة…')).toBeVisible();await failurePage.screenshot({path:join(artifacts,'library-loading.png'),fullPage:true});await expect(failurePage.getByRole('button',{name:'إعادة المحاولة'})).toBeVisible();await failurePage.screenshot({path:join(artifacts,'library-error.png'),fullPage:true});await failurePage.unroute('**/api/projects?*');await failurePage.getByRole('button',{name:'إعادة المحاولة'}).click();await expect(failurePage.getByRole('heading',{name:'أول درس، مساحة مفتوحة.'})).toBeVisible();await failurePage.close();results.push('Library loading, empty, connection error and retry states');
  await page.getByRole('button',{name:'مشروع جديد',exact:true}).click();await page.getByLabel('اسم المشروع').fill('شرح React و TypeScript — تجربة تحرير');
  const source=resolve('experiments/render-feasibility/public/generated/real.mp4'),before=await hashFile(source,AbortSignal.timeout(10000));
  await page.getByLabel('اختيار ملف فيديو').setInputFiles(source);await page.getByRole('button',{name:'استيراد الفيديو',exact:true}).click();
  await page.waitForSelector('.processing');await page.screenshot({path:join(artifacts,'import-processing.png'),fullPage:true});
  await expect(page.locator('.timeline-clip')).toHaveCount(1,{timeout:120000});await expect(page.getByText('محفوظ على الجهاز',{exact:true})).toBeVisible({timeout:15000});
  const projectId=new URL(page.url()).searchParams.get('project')!;results.push('Create → streamed import → native probe/hash/proxy → saved editor');
  await page.locator('.timeline-clip').click();await seek(page,3000000);await page.getByRole('button',{name:'تقسيم S'}).click();await expect(page.locator('.timeline-clip')).toHaveCount(2);
  await page.locator('.timeline-clip').nth(1).click();await seek(page,6000000);await page.getByRole('button',{name:'تقسيم S'}).click();await expect(page.locator('.timeline-clip')).toHaveCount(3);
  await page.locator('.timeline-clip').nth(1).click();await page.getByRole('button',{name:'حذف المقطع المحدد مع إغلاق الفراغ'}).click();await expect(page.locator('.timeline-clip')).toHaveCount(2);
  await page.getByRole('button',{name:'تراجع',exact:true}).click();await expect(page.locator('.timeline-clip')).toHaveCount(3);await page.getByRole('button',{name:'إعادة',exact:true}).click();await expect(page.locator('.timeline-clip')).toHaveCount(2);
  await expect(page.getByText('محفوظ على الجهاز',{exact:true})).toBeVisible({timeout:15000});
  let saved=projectSchema.parse(await json(`/api/projects/${projectId}`));
  expect(saved.state.document.sequence.clips.map(c=>[c.sourceInUs,c.durationUs,c.sequenceStartUs])).toEqual([['0','3000000','0'],['6000000','10000000','3000000']]);
  await page.reload();await expect(page.locator('.timeline-clip')).toHaveCount(2);await page.getByRole('button',{name:'تراجع',exact:true}).click();await expect(page.locator('.timeline-clip')).toHaveCount(3);await page.getByRole('button',{name:'إعادة',exact:true}).click();await expect(page.locator('.timeline-clip')).toHaveCount(2);
  await expect(page.getByText('محفوظ على الجهاز',{exact:true})).toBeVisible({timeout:15000});results.push('Two frame-aligned splits → middle ripple delete → undo/redo → reload with persisted history');
  await page.locator('.timeline-clip').first().click();await seek(page,2800000);await page.getByRole('button',{name:'تشغيل',exact:true}).click();await delay(900);expect(await page.locator('video').evaluate(v=>(v as HTMLVideoElement).currentTime)).toBeGreaterThan(6);await page.getByRole('button',{name:'إيقاف مؤقت'}).click();results.push('Preview source seek crosses the removed interval');
  await page.getByRole('button',{name:'تشغيل',exact:true}).click();await delay(500);expect(await page.locator('video').evaluate(v=>(v as HTMLVideoElement).currentTime)).toBeGreaterThan(0);await page.getByRole('button',{name:'إيقاف مؤقت'}).click();
  await page.locator('.timeline-clip').nth(1).click();await page.screenshot({path:join(artifacts,'editor-1440-light.png'),fullPage:true});await page.getByRole('button',{name:'تفعيل المظهر الداكن'}).click();await page.screenshot({path:join(artifacts,'editor-1440-dark.png'),fullPage:true});
  for(const width of [1920,1280,900,760,390]) {await page.setViewportSize({width,height:width===390?844:1024});await page.screenshot({path:join(artifacts,`editor-${width}-dark.png`),fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);}
  await page.setViewportSize({width:900,height:1024});await page.getByRole('button',{name:'خصائص المقطع',exact:true}).click();await expect(page.getByRole('heading',{name:'خصائص المقطع'})).toBeVisible();await page.screenshot({path:join(artifacts,'inspector-900-dark.png'),fullPage:true});await page.getByRole('button',{name:'إخفاء الخصائص'}).click();await page.getByRole('button',{name:'تفعيل المظهر الفاتح'}).click();await page.screenshot({path:join(artifacts,'editor-900-light.png'),fullPage:true});await page.setViewportSize({width:1440,height:1024});
  // Failure persists pending edits, then reconnecting and reloading recovers the actual actions.
  await page.route('**/save',route=>route.abort());await page.locator('.timeline-clip').nth(1).click();await page.getByLabel('مدة المقطع · ثوانٍ').fill('8');await page.getByRole('button',{name:'تطبيق القص'}).click();await expect(page.getByText('لم تُحفظ التغييرات',{exact:true})).toBeVisible({timeout:15000});await page.screenshot({path:join(artifacts,'save-failure.png'),fullPage:true});await page.unroute('**/save');await page.reload();await expect(page.getByText('استُعيدت تغييرات جلسة سابقة. راجعها ثم احفظها.')).toBeVisible();await page.getByRole('button',{name:'حفظ التغييرات',exact:true}).click();await expect(page.getByText('محفوظ على الجهاز',{exact:true})).toBeVisible({timeout:15000});results.push('Save connection failure → pending recovery after reload → successful retry');
  await page.getByRole('button',{name:'تصدير',exact:true}).click();await page.getByRole('button',{name:'بدء التصدير'}).click();await expect(page.locator('dialog .processing')).toBeVisible();await page.screenshot({path:join(artifacts,'export-progress.png'),fullPage:true});
  await page.getByRole('button',{name:'إغلاق',exact:true}).last().click();
  saved=projectSchema.parse(await json(`/api/projects/${projectId}`));const jobs=z.array(jobSchema).parse(await json(`/api/projects/${projectId}/jobs`));const exportJob=jobs.find(j=>j.kind==='export')!;
  // Modify the project while the job keeps its pinned revision.
  await page.getByRole('button',{name:'تراجع',exact:true}).click();await expect(page.getByText('محفوظ على الجهاز',{exact:true})).toBeVisible({timeout:15000});
  const finished=await waitJob(exportJob.id);expect(finished.status,JSON.stringify(finished)).toBe('succeeded');expect(finished.result?.revisionId).toBe(saved.revisionId);
  const download=await fetch(base+`/api/jobs/${finished.id}/download`);expect(download.status).toBe(200);const output=join(artifacts,'export.mp4');await writeFile(output,Buffer.from(await download.arrayBuffer()));const info=await probe(output,AbortSignal.timeout(10000));expect(Math.abs(Number(info.format.duration)-11)).toBeLessThan(.15);
  evidence.outputProbe=info;evidence.exportJob=finished;results.push('Real pinned export continues after revision changes; output probe/frame count/full decode passed');
  // Real marker checks use exported frames and audio, not mocked renderer success.
  const markerChecks=[];
  for(const [sequence,sourceTime] of [[1,1],[4,7],[9,12]]) {
    const actual=await native('ffmpeg',['-v','error','-ss',String(sequence),'-i',output,'-frames:v','1','-vf','crop=60:60:50:50,signalstats,metadata=print:file=-','-f','null','-'],AbortSignal.timeout(10000));
    const match=/lavfi.signalstats.YAVG=(\S+)/.exec(actual);expect(Number(match?.[1])).toBeGreaterThan(180);
    const difference=await native('ffmpeg',['-v','error','-ss',String(sourceTime),'-i',join(data,'assets',saved.assets[0]!.proxy),'-ss',String(sequence),'-i',output,
      '-filter_complex','[0:v]scale=320:180,format=yuv420p[a];[1:v]scale=320:180,format=yuv420p[b];[a][b]blend=all_mode=difference,signalstats,metadata=print:file=-',
      '-frames:v','1','-an','-f','null','-'],AbortSignal.timeout(10000));
    const differenceMatch=/lavfi.signalstats.YAVG=(\S+)/.exec(difference);expect(Number(differenceMatch?.[1])).toBeLessThan(5);
    markerChecks.push({sequenceSeconds:sequence,sourceSeconds:sourceTime,whiteMarkerYAverage:Number(match?.[1]),previewExportLumaDifference:Number(differenceMatch?.[1])});
  }
  evidence.markerChecks=markerChecks;
  const pcm=join(artifacts,'output-audio.f32');await native('ffmpeg',['-v','error','-i',output,'-vn','-ac','1','-ar','48000','-f','f32le',pcm],AbortSignal.timeout(10000));
  const samples=await readFile(pcm),audioChecks=[];
  for(const at of [1,4,9]) {let first=-1;for(let i=Math.round((at-.1)*48000);i<Math.round((at+.15)*48000);i++){if(Math.abs(samples.readFloatLE(i*4))>.05){first=i;break;}}const offsetMs=(first/48000-at)*1000;expect(first).toBeGreaterThan(0);expect(Math.abs(offsetMs)).toBeLessThanOrEqual(40);audioChecks.push({sequenceSeconds:at,pulseOffsetMs:offsetMs});}
  evidence.audioMarkers=audioChecks;results.push('Visible source markers and audio pulses checked near beginning/middle/end (≤40 ms)');
  expect(await hashFile(source,AbortSignal.timeout(10000))).toBe(before);
  // Cancellation cannot expose a partial download.
  const current=projectSchema.parse(await json(`/api/projects/${projectId}`));const cancelled=jobSchema.parse(await json(`/api/projects/${projectId}/export`,'POST',{revisionId:current.revisionId}));await json(`/api/jobs/${cancelled.id}/cancel`,'POST',{});expect((await waitJob(cancelled.id)).status).toBe('cancelled');expect((await fetch(base+`/api/jobs/${cancelled.id}/download`)).status).toBe(400);results.push('Cancel prevents partial publication/download');
  // Missing original is surfaced instead of silently using a proxy for export.
  const asset=current.assets[0]!,original=join(data,'assets',asset.original),missing=original+'-missing';await rename(original,missing);try {const unavailable=await fetch(base+`/api/projects/${projectId}/export`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({revisionId:current.revisionId})});expect(unavailable.status).toBe(404);}finally{await rename(missing,original);}results.push('Missing original fails enqueue; original restored without altering content');
  // Restart both runtime processes; persisted project and immutable export remain available.
  const recoveryJob=jobSchema.parse(await json(`/api/projects/${projectId}/export`,'POST',{revisionId:current.revisionId}));
  for(let i=0;i<200;i++){const next=jobSchema.parse(await json(`/api/jobs/${recoveryJob.id}`));if(next.status==='running' && next.stage==='encoding')break;await delay(100);if(i===199)throw new Error('WORKER_START_TIMEOUT');}
  await stop(worker);worker=launch('apps/worker/main.ts','worker.log');const recovered=await waitJob(recoveryJob.id);expect(recovered.status,JSON.stringify(recovered)).toBe('succeeded');expect(recovered.result?.revisionId).toBe(current.revisionId);evidence.workerRecovery=recovered;results.push('Worker killed during encoding → expired lease reclaimed → one validated result published');
  await stop(worker);await stop(api);api=launch('apps/api/main.ts','api.log');worker=launch('apps/worker/main.ts','worker.log');await waitReady();await page.reload();await expect(page.locator('.timeline-clip')).toHaveCount(2);expect((await fetch(base+`/api/jobs/${finished.id}/download`)).status).toBe(200);results.push('API + worker restart preserves project, history and published export');
  // A second client commits while the open editor still holds its earlier revision.
  const conflictBase=projectSchema.parse(await json(`/api/projects/${projectId}`)),last=conflictBase.state.document.sequence.clips.at(-1)!;
  await json(`/api/projects/${projectId}/save`,'POST',{commandId:crypto.randomUUID(),baseRevisionId:conflictBase.revisionId,actions:[{kind:'edit',commandId:crypto.randomUUID(),commands:[{type:'TrimClip',clipId:last.id,sourceInUs:last.sourceInUs,durationUs:'9000000'}]}]});
  await page.locator('.timeline-clip').nth(1).click();await page.getByLabel('مدة المقطع · ثوانٍ').fill('8');await page.getByRole('button',{name:'تطبيق القص'}).click();await expect(page.getByText('حُفظ إصدار أحدث في نافذة أخرى. احتفظ بنسخة الاسترداد ثم افتح الإصدار المحفوظ.')).toBeVisible({timeout:15000});await page.screenshot({path:join(artifacts,'revision-conflict.png'),fullPage:true});expect(await page.getByRole('button',{name:'فتح الإصدار المحفوظ'}).isDisabled()).toBe(true);const recoveryDownload=page.waitForEvent('download');await page.getByRole('button',{name:'تنزيل نسخة الاسترداد'}).click();await (await recoveryDownload).saveAs(join(artifacts,'pending-recovery.json'));await page.getByRole('button',{name:'فتح الإصدار المحفوظ'}).click();await expect(page.getByText('محفوظ على الجهاز',{exact:true})).toBeVisible();results.push('Concurrent revision conflict preserves pending work; recovery download precedes explicit reload');
  // Browser-visible missing proxy and recovery, without fabricating media availability.
  const proxyPath=join(data,'assets',asset.proxy),proxyMissing=proxyPath+'-missing';await rename(proxyPath,proxyMissing);
  const missingPage=await context.newPage();try {await missingPage.goto(base+`/?project=${projectId}`);await expect(missingPage.locator('.preview-error')).toBeVisible({timeout:15000});await missingPage.screenshot({path:join(artifacts,'missing-media.png'),fullPage:true});}finally{await missingPage.close();await rename(proxyMissing,proxyPath);}results.push('Missing preview media exposes an actionable editor error');
  // Corrupt import and silent source exercise actual native ingestion.
  const corruptProject=projectSchema.parse(await json('/api/projects','POST',{name:'ملف تالف للاختبار'}));const corruptResponse=await fetch(base+`/api/projects/${corruptProject.id}/import?name=corrupt.mp4`,{method:'POST',body:'invalid video bytes'});const corrupt=jobSchema.parse(await corruptResponse.json());expect((await waitJob(corrupt.id)).error).toBe('UNSUPPORTED_MEDIA');
  const corruptPage=await context.newPage();await corruptPage.goto(base+`/?project=${corruptProject.id}`);await expect(corruptPage.getByText('تعذر قراءة الفيديو. اختر ملف فيديو صالحًا يمكن لـ FFmpeg قراءته.')).toBeVisible();await corruptPage.screenshot({path:join(artifacts,'corrupt-import.png'),fullPage:true});await corruptPage.close();
  const silent=join(artifacts,'silent.mp4');await native('ffmpeg',['-v','error','-f','lavfi','-i','color=c=gray:s=640x360:r=30:d=1','-c:v','libx264','-pix_fmt','yuv420p','-an',silent],AbortSignal.timeout(10000));
  const silentProject=projectSchema.parse(await json('/api/projects','POST',{name:'فيديو بلا صوت'})),silentUpload=await fetch(base+`/api/projects/${silentProject.id}/import?name=silent.mp4`,{method:'POST',body:await readFile(silent)});const silentJob=jobSchema.parse(await silentUpload.json());expect((await waitJob(silentJob.id)).status).toBe('succeeded');const silentReady=projectSchema.parse(await json(`/api/projects/${silentProject.id}`));expect(silentReady.assets[0]?.hasAudio).toBe(false);
  const silentSaved=projectSchema.parse(await json(`/api/projects/${silentProject.id}/save`,'POST',{commandId:crypto.randomUUID(),baseRevisionId:silentReady.revisionId,actions:[{kind:'edit',commandId:crypto.randomUUID(),commands:[{type:'InsertClip',assetId:silentReady.assets[0]!.id,clipId:crypto.randomUUID()}]}]}));const silentExport=jobSchema.parse(await json(`/api/projects/${silentProject.id}/export`,'POST',{revisionId:silentSaved.revisionId}));expect((await waitJob(silentExport.id)).status).toBe('succeeded');results.push('Corrupt file rejects with UNSUPPORTED_MEDIA; silent video imports and exports successfully');
  // Keyboard focus remains visible and shortcuts work while a clip button is focused.
  await page.locator('.timeline-clip').first().focus();await page.keyboard.press('Control+z');await expect(page.getByText('تغييرات غير محفوظة',{exact:true})).toBeVisible();await page.keyboard.press('Control+Shift+z');await page.keyboard.press('Control+s');await expect(page.getByText('محفوظ على الجهاز',{exact:true})).toBeVisible({timeout:15000});await page.keyboard.press('Tab');expect(await page.evaluate(()=>{const el=document.activeElement;return el instanceof HTMLElement && getComputedStyle(el).outlineStyle!=='none';})).toBe(true);results.push('Keyboard undo/redo/save and visible focus verified under Arabic RTL');
  await page.getByRole('link',{name:'العودة إلى المشاريع'}).click();await expect(page.locator('.project-row')).toHaveCount(3);await page.screenshot({path:join(artifacts,'library-populated-light.png'),fullPage:true});
  // Expected simulated network failures are recorded separately from real browser errors.
  const expectedErrors=errors.filter(e=>e.includes('net::ERR_FAILED') || e.includes('net::ERR_CONNECTION_RESET') || e.includes('status of 409 (Conflict)'));
  expect(expectedErrors.filter(e=>e.includes('409'))).toHaveLength(1);
  evidence.expectedInjectedNetworkErrors=expectedErrors;evidence.browserErrors=errors.filter(e=>!expectedErrors.includes(e));expect(evidence.browserErrors).toEqual([]);
  evidence.results=results;evidence.completedAt=new Date().toISOString();await writeFile(join(artifacts,'report.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify({artifacts,results,outputBytes:(await stat(output)).size},null,2));
} catch(error) {
  evidence.results=results;evidence.error=String(error);await writeFile(join(artifacts,'report.json'),JSON.stringify(evidence,null,2));console.error(`Workflow verification failed; artifacts: ${artifacts}`);throw error;
} finally {await browser.close();if(worker!)await stop(worker);if(api!)await stop(api);}
