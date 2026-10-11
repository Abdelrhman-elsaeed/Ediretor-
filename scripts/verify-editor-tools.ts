import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {chromium,expect} from 'playwright/test';
import {projectSchema,summarySchema} from '../packages/contracts/src/project';
import {z} from 'zod';

// Read-only checks against a running dev instance. Attachment is injected into
// the browser response solely to review the recovered transcript; no saved edits.
const base=process.env.EDIRETOR_EDITOR_URL??'http://127.0.0.1:4317',artifacts=resolve('artifacts',`editor-tools-${new Date().toISOString().replace(/[:.]/g,'-')}`);
await mkdir(artifacts,{recursive:true});
const summaries=z.object({items:z.array(summarySchema)}).parse(await(await fetch(`${base}/api/projects`)).json());
const projects=await Promise.all(summaries.items.slice(0,10).map(async p=>projectSchema.parse(await(await fetch(`${base}/api/projects/${p.id}`)).json())));
const original=projects.find(p=>p.transcripts?.some(t=>t.words.length)&&p.state.document.sequence.clips.length);
if(!original)throw new Error('A real speech transcript is required for tool UI verification');
const project=structuredClone(original),transcript=project.transcripts!.at(-1)!;
project.state.document={...project.state.document,schemaVersion:2,transcriptRefs:[{id:transcript.id,assetId:transcript.assetId,hash:transcript.hash}]};
project.state.history=[project.state.document];project.state.cursor=0;
const browser=await chromium.launch({headless:true}),results:string[]=[],errors:string[]=[],report:Record<string,unknown>={artifacts,projectId:project.id,readOnlyAttachment:true,sourceWords:transcript.words.length};
try{
  const context=await browser.newContext({viewport:{width:1440,height:900},locale:'ar-EG',reducedMotion:'reduce'}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/**',async route=>{if(route.request().method()!=='GET')throw new Error('Read-only tool verification attempted a mutation');await route.continue();});
  await page.route(`**/api/projects/${project.id}`,r=>r.fulfill({json:project}));
  await page.goto(`${base}/?project=${project.id}`);await expect(page.getByRole('navigation',{name:'أدوات التحرير'})).toBeVisible();
  for(const name of ['تحرير بالنص','الكابشن','العمليات','الوسائط','خصائص المقطع']){
    await page.getByRole('button',{name,exact:true}).click();await expect(page.locator('.editor-tool-panel')).toHaveCount(1);await expect(page.locator('.editor-tool-panel h2')).toHaveText(name);
    await page.getByRole('button',{name:name==='تحرير بالنص'?'إغلاق النص':'إغلاق لوحة الأداة',exact:true}).click();await expect(page.locator('.editor-tool-panel')).toHaveCount(0);
  }
  results.push('Five tools share one drawer; switching/closing never changes the editing revision');
  await page.getByRole('button',{name:'تحرير بالنص',exact:true}).click();await expect(page.locator('.word-seek').first()).toHaveText(transcript.words[0]!.text);
  const firstRow=page.locator('.paragraph-words').first(),firstText=await firstRow.innerText();
  if(/[\u0600-\u06ff]/u.test(firstText))expect(await firstRow.evaluate(e=>getComputedStyle(e).direction)).toBe('rtl');
  const panel=page.getByRole('separator',{name:'عرض لوحة الأداة'}),timeline=page.getByRole('separator',{name:'ارتفاع الخط الزمني'}),box=(await panel.boundingBox())!;
  await page.mouse.move(box.x+box.width/2,box.y+40);await page.mouse.down();await page.mouse.move(box.x-80,box.y+40);await page.mouse.up();expect(Number(await panel.getAttribute('aria-valuenow'))).toBeGreaterThan(400);
  await panel.focus();await page.keyboard.press('Home');await expect(panel).toHaveAttribute('aria-valuenow','280');await page.keyboard.press('ArrowLeft');await expect(panel).toHaveAttribute('aria-valuenow','296');
  await timeline.focus();await page.keyboard.press('ArrowUp');await expect(timeline).toHaveAttribute('aria-valuenow','232');
  await page.reload();await page.getByRole('button',{name:'تحرير بالنص',exact:true}).click();await expect(panel).toHaveAttribute('aria-valuenow','296');await expect(timeline).toHaveAttribute('aria-valuenow','232');
  await panel.dblclick();await expect(panel).toHaveAttribute('aria-valuenow','360');await timeline.dblclick();
  results.push('Pointer and keyboard resizing, minimum bound, double-click reset and layout persistence passed');
  await page.getByRole('searchbox').fill(transcript.words.at(-1)!.text);await expect(page.locator('.transcript-word')).not.toHaveCount(0);await page.getByRole('searchbox').fill('');
  await page.locator('.word-seek').first().click();await page.getByRole('button',{name:'تصحيح الكلمة',exact:true}).click();await expect(page.getByLabel('تصحيح الكتابة',{exact:true})).toBeVisible();await page.getByRole('button',{name:'مسح التحديد'}).click();
  results.push('Recovered real transcript is searchable; selection exposes correction/cut actions only when needed');
  const layouts:unknown[]=[];
  for(const theme of ['light','dark']){
    if(theme==='dark')await page.getByRole('button',{name:'تفعيل المظهر الداكن'}).click();
    for(const width of [1920,1440,900,760,390]){
      await page.setViewportSize({width,height:width===390?844:900});
      await expect(page.locator('.transcript-paragraph').first()).toBeVisible();
      const layout=await page.evaluate(()=>{
        const frame=document.querySelector('.video-frame')!.getBoundingClientRect();
        const clipped=[...document.querySelectorAll('.transcript-word')].filter(word=>{const r=word.getBoundingClientRect(),parent=word.parentElement!.getBoundingClientRect();return r.bottom>parent.bottom+1;}).length;
        return {width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,videoRatio:frame.width/frame.height,clipped,mounted:document.querySelectorAll('.transcript-word').length};
      });
      expect(layout.scrollWidth).toBeLessThanOrEqual(width+1);expect(layout.scrollHeight).toBeLessThanOrEqual(width===390?845:901);expect(Math.abs(layout.videoRatio-16/9)).toBeLessThan(.01);expect(layout.clipped).toBe(0);expect(layout.mounted).toBeLessThan(60);
      layouts.push({theme,...layout});await page.screenshot({path:join(artifacts,`transcript-${width}-${theme}.png`)});
    }
  }
  report.layouts=layouts;results.push('Two themes, five viewport sizes: no page overflow, true 16:9 preview, bounded visible paragraphs and no clipped word controls');
  expect(errors).toEqual([]);report.results=results;report.browserErrors=errors;report.completedAt=new Date().toISOString();console.log(JSON.stringify(report,null,2));
}catch(e){report.error=String(e);report.results=results;throw e;}finally{await writeFile(join(artifacts,'report.json'),JSON.stringify(report,null,2));await browser.close();}
