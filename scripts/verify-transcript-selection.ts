import {spawn,type ChildProcess} from 'node:child_process';
import {mkdir,writeFile,readFile,readdir,cp} from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {join,resolve} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {chromium,expect,type Page,type Locator} from 'playwright/test';
import {projectSchema,type Project} from '../packages/contracts/src/project';
import {projectWords,wordDeletionRanges} from '../packages/domain/src/transcript/projection';

const root=resolve('artifacts'),runs=(await readdir(root)).filter(n=>/^phase-02-20/.test(n)).sort().reverse();
let prior:string|undefined,sourceReport:{projectId:string}|undefined;
for(const run of runs){try{const report=JSON.parse(await readFile(join(root,run,'report.json'),'utf8'));if(report.completedAt){prior=join(root,run);sourceReport=report;break;}}catch{}}
if(!prior||!sourceReport)throw new Error('A completed transcript workflow fixture is required');
const artifacts=join(root,`transcript-selection-${new Date().toISOString().replace(/[:.]/g,'-')}`),data=join(artifacts,'data'),base='http://127.0.0.1:4324';await mkdir(artifacts,{recursive:true});
// Completed acceptance data only: never edit the user's manual-test project.
await cp(join(prior,'data'),data,{recursive:true});
const log=createWriteStream(join(artifacts,'api.log')),api:ChildProcess=spawn(process.execPath,['--import','tsx','apps/api/main.ts'],{env:{...process.env,EDIRETOR_PORT:'4324',EDIRETOR_DATA:data},windowsHide:true,stdio:['ignore','pipe','pipe']});api.stdout?.pipe(log);api.stderr?.pipe(log);
async function load():Promise<Project>{return projectSchema.parse(await(await fetch(`${base}/api/projects/${sourceReport!.projectId}`)).json());}
async function drag(page:Page,from:Locator,to:Locator){const a=(await from.boundingBox())!,b=(await to.boundingBox())!;await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:16});await page.mouse.up();}
const browser=await chromium.launch({headless:true}),results:string[]=[],errors:string[]=[],evidence:Record<string,unknown>={artifacts,prior};
try{
  for(let i=0;i<100;i++){try{if((await fetch(`${base}/api/health`)).ok)break;}catch{}if(i===99)throw new Error('API_TIMEOUT');await delay(100);}
  const context=await browser.newContext({viewport:{width:1440,height:900},locale:'ar-EG',reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}/?project=${sourceReport.projectId}`);await page.getByRole('button',{name:'تحرير بالنص',exact:true}).click();await expect(page.locator('.word-seek').first()).toBeVisible();
  const toolbar=page.getByRole('toolbar',{name:'أوامر الكلمات المحددة'}),viewport=page.locator('.transcript-viewport'),height=await viewport.evaluate(e=>e.clientHeight);
  await expect(page.locator('.transcript-word input')).toHaveCount(0);await page.locator('.word-seek').first().click();await expect(toolbar).toHaveAttribute('data-selection-count','1');
  await page.getByRole('button',{name:'تصحيح الكلمة'}).click();await expect(page.getByLabel('تصحيح الكتابة',{exact:true})).toBeFocused();await page.getByLabel('تصحيح الكتابة',{exact:true}).press('Escape');
  await expect(toolbar).toHaveCount(0);await viewport.focus();await page.keyboard.press('Escape');
  await drag(page,page.locator('.word-seek').nth(0),page.locator('.word-seek').nth(2));await expect(toolbar).toHaveAttribute('data-selection-count','3');
  const selectedKeys=await page.locator('.transcript-word.is-selected').evaluateAll(els=>els.map(e=>(e as HTMLElement).dataset.wordKey));
  await drag(page,page.locator('.word-seek').nth(2),page.locator('.word-seek').nth(0));await expect(toolbar).toHaveAttribute('data-selection-count','3');expect(await page.locator('.transcript-word.is-selected').evaluateAll(els=>els.map(e=>(e as HTMLElement).dataset.wordKey))).toEqual(selectedKeys);
  expect(await viewport.evaluate(e=>e.clientHeight)).toBe(height);
  const v=(await viewport.boundingBox())!,t=(await toolbar.boundingBox())!;expect(t.y).toBeGreaterThanOrEqual(v.y+v.height);expect(t.x).toBeGreaterThanOrEqual(v.x-1);expect(t.x+t.width).toBeLessThanOrEqual(v.x+v.width+20);
  await page.screenshot({path:join(artifacts,'drag-selected-rtl.png')});results.push('Single click and forward/reverse RTL drag select complete words; toolbar reserves space and does not cover any paragraph');
  await page.getByRole('button',{name:'مسح التحديد'}).click();await page.locator('.word-seek').first().focus();await page.keyboard.press('Enter');await page.keyboard.press('Shift+ArrowLeft');await expect(toolbar).toHaveAttribute('data-selection-count','2');await page.keyboard.press('Escape');await expect(toolbar).toHaveCount(0);
  await page.getByRole('searchbox').fill('TypeScript');await page.locator('.word-seek').first().click();await expect(toolbar).toHaveAttribute('data-selection-count','1');await page.getByRole('searchbox').fill('');await expect(toolbar).toHaveCount(0);results.push('Keyboard range extension/Escape and search changes preserve explicit selection scope');
  const before=await load(),words=projectWords(before.state.document,before.transcripts!),pair=words.slice(0,-1).map((w,i)=>[w,words[i+1]!]).find(pair=>{try{wordDeletionRanges(before.state.document,before.transcripts!,pair);return true;}catch{return false;}});expect(pair).toBeDefined();
  const a=page.locator(`[data-word-key="${pair![0]!.key}"] .word-seek`),b=page.locator(`[data-word-key="${pair![1]!.key}"] .word-seek`);await a.scrollIntoViewIfNeeded();await b.scrollIntoViewIfNeeded();await drag(page,a,b);await expect(toolbar).toHaveAttribute('data-selection-count','2');await page.getByRole('button',{name:'حذف الكلمات المحددة'}).click();
  await expect(toolbar).toHaveCount(0);await expect.poll(async()=>{const p=await load();return projectWords(p.state.document,p.transcripts!).some(w=>pair!.some(x=>x.key===w.key));}).toBe(false);
  await page.getByRole('button',{name:'تراجع',exact:true}).click();await expect.poll(async()=>(await load()).state.document.sequence).toEqual(before.state.document.sequence);await page.reload();await page.getByRole('button',{name:'تحرير بالنص',exact:true}).click();await expect(page.locator('.word-seek').first()).toBeVisible();expect((await load()).transcripts).toEqual(before.transcripts);results.push('Drag-selected words delete through real Kernel/Session/save; shared Undo restores exact intervals and immutable source words after reload');
  // Clearly synthetic UI-only stress response, not provider or persisted data.
  const large=structuredClone(before),transcript=large.transcripts![0]!,asset=large.assets.find(a=>a.id===transcript.assetId)!,duration='6000000000';
  transcript.words=Array.from({length:60000},(_,i)=>({id:`stress-w${i}`,text:i%3===0?'React':'كلمة',startUs:String(i*100000),endUs:String(i*100000+80000),confidence:1,utteranceId:'stress-utterance',speaker:null}));
  asset.durationUs=duration;large.state.document.assetRefs=large.assets;large.state.document.sequence.clips=[{...large.state.document.sequence.clips[0]!,assetId:asset.id,sourceInUs:'0',durationUs:duration,sequenceStartUs:'0'}];large.state.document.displayCorrections=[];large.state.document.captionStyle=undefined;large.state.history=[large.state.document];large.state.cursor=0;
  const stress=await context.newPage();stress.on('pageerror',e=>errors.push(e.message));await stress.route('**/api/**',async r=>{if(r.request().method()!=='GET')throw new Error('Synthetic selection must never save');await r.continue();});await stress.route(`**/api/projects/${large.id}`,r=>r.fulfill({json:large}));
  await stress.goto(`${base}/?project=${large.id}`);await stress.getByRole('button',{name:'تحرير بالنص',exact:true}).click();await expect(stress.locator('.word-seek').first()).toBeVisible();
  // A stationary press near an edge must not scroll or expand into a sentence.
  const edgeKey=await stress.locator('.transcript-viewport').evaluate(el=>{const word=el.querySelectorAll<HTMLElement>('[data-word-key]')[24]!,r=word.getBoundingClientRect(),v=el.getBoundingClientRect();el.scrollTop+=r.y+r.height/2-(v.bottom-10);return word.dataset.wordKey!;});
  const edgeWord=stress.locator(`[data-word-key="${edgeKey}"] .word-seek`);await expect(edgeWord).toBeVisible();const edgeBox=(await edgeWord.boundingBox())!,stationaryScroll=await stress.locator('.transcript-viewport').evaluate(e=>e.scrollTop);
  await stress.mouse.move(edgeBox.x+edgeBox.width/2,edgeBox.y+edgeBox.height/2);await stress.mouse.down();await delay(250);expect(await stress.locator('.transcript-viewport').evaluate(e=>e.scrollTop)).toBe(stationaryScroll);await stress.mouse.up();await expect(stress.getByRole('toolbar')).toHaveAttribute('data-selection-count','1');await stress.keyboard.press('Escape');await stress.locator('.transcript-viewport').evaluate(e=>{e.scrollTop=0;});await expect(stress.locator('[data-word-key]').first()).toHaveAttribute('data-word-key',`${large.state.document.sequence.clips[0]!.id}:${transcript.id}:stress-w0`);
  const start=(await stress.locator('.word-seek').first().boundingBox())!,bounds=(await stress.locator('.transcript-viewport').boundingBox())!;await stress.mouse.move(start.x+start.width/2,start.y+start.height/2);await stress.mouse.down();await stress.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height-4,{steps:12});await expect.poll(()=>stress.locator('.transcript-viewport').evaluate(e=>e.scrollTop)).toBeGreaterThan(600);await stress.mouse.up();
  const bar=stress.getByRole('toolbar',{name:'أوامر الكلمات المحددة'}),count=Number(await bar.getAttribute('data-selection-count'));expect(count).toBeGreaterThan(20);expect(await stress.locator('.transcript-word').count()).toBeLessThan(60);
  await stress.locator('.transcript-viewport').evaluate(e=>{e.scrollTop=0;});await expect(stress.locator('.transcript-word').first()).toHaveClass(/is-selected/);await expect(bar).toHaveAttribute('data-selection-count',String(count));await stress.screenshot({path:join(artifacts,'virtual-range.png')});
  evidence.virtualSelection={words:60000,selected:count,mounted:await stress.locator('.transcript-word').count()};results.push('Edge drag auto-scrolls across virtual rows; offscreen range anchors survive unmounting; 60k words remain bounded');
  for(const width of [900,390]){await page.setViewportSize({width,height:844});await page.locator('.word-seek').first().click();await expect(toolbar).toBeVisible();const vr=(await viewport.boundingBox())!,tr=(await toolbar.boundingBox())!;expect(tr.y).toBeGreaterThanOrEqual(vr.y+vr.height);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:join(artifacts,`floating-bar-${width}.png`)});await page.getByRole('button',{name:'مسح التحديد'}).click();}
  expect(errors).toEqual([]);evidence.results=results;evidence.browserErrors=errors;evidence.completedAt=new Date().toISOString();console.log(JSON.stringify(evidence,null,2));
}catch(e){evidence.error=String(e);evidence.results=results;throw e;}finally{await writeFile(join(artifacts,'report.json'),JSON.stringify(evidence,null,2));await browser.close();api.kill();await Promise.race([new Promise<void>(r=>api.once('exit',()=>r())),delay(5000)]);log.end();}
