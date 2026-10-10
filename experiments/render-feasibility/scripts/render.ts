import {spawn} from 'node:child_process';
import {mkdir,writeFile,appendFile,readdir,readFile,statfs} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {root,harness,json,loadJson,native} from './io';
import {parseSnapshot} from '../src/contract';
import {z} from 'zod';

const fixture=z.enum(['real','markers','Q05','Q06','Q10']).parse(process.argv[2]??'real');
const candidate=z.enum(['A','B']).parse(process.argv[3]??'A');
const cache=z.enum(['cold','warm']).parse(process.argv[4]??'cold');
const deadline=z.coerce.number().int().min(10).max(172800).parse(process.argv[5]??(fixture==='Q05'||fixture==='Q06'?180:600));
const snapshots=z.array(z.unknown()).parse(await loadJson(resolve(harness,'generated/snapshots.json'))).map(parseSnapshot);
const snapshot=snapshots.find(s=>s.fixture===fixture);if(!snapshot)throw new Error('FIXTURE_MISSING');
const sourceHash=createHash('sha256');
for(const dir of ['packages/domain/src','experiments/render-feasibility/src','experiments/render-feasibility/scripts']){
  for(const file of (await readdir(resolve(root,dir),{recursive:true})).filter(f=>/\.(ts|tsx|ps1)$/.test(f)).sort())sourceHash.update(dir+'/'+file).update(await readFile(resolve(root,dir,file)));
}
sourceHash.update(await readFile(resolve(root,'package-lock.json')));
const buildHash=sourceHash.digest('hex');
const runId=`${fixture}-${candidate}-${cache}-${new Date().toISOString().replace(/[:.]/g,'-')}`;
const runDir=resolve(root,'artifacts',runId);await mkdir(resolve(runDir,'tmp'),{recursive:true});
await json(resolve(runDir,'snapshot.json'),snapshot);
const start=performance.now();
const child=spawn(process.execPath,['--import','tsx',resolve(harness,'scripts/render-worker.ts'),runDir,candidate,cache],{cwd:root,windowsHide:true,env:{...process.env,TEMP:resolve(runDir,'tmp'),TMP:resolve(runDir,'tmp')},stdio:['ignore','pipe','pipe']});
if(!child.pid)throw new Error('SPAWN_FAILED');
const monitor=spawn('powershell.exe',['-NoProfile','-File',resolve(harness,'scripts/measure.ps1'),'-RootProcessId',String(child.pid),'-RunDirectory',runDir,'-CacheDirectory',resolve(root,'.cache/feasibility')],{windowsHide:true,stdio:['ignore','pipe','pipe']});
let metricsBuffer='';let peakMemory=0,peakDisk=0,peakCacheDisk=0,samples=0;let monitorError='';
monitor.stdout.on('data',(b:Buffer)=>{metricsBuffer+=b.toString();const lines=metricsBuffer.split(/\r?\n/);metricsBuffer=lines.pop()??'';for(const line of lines){if(!line.trim())continue;const m=z.object({workingSetBytes:z.number(),runDiskBytes:z.number(),cacheDiskBytes:z.number()}).parse(JSON.parse(line));samples++;peakMemory=Math.max(peakMemory,m.workingSetBytes);peakDisk=Math.max(peakDisk,m.runDiskBytes);peakCacheDisk=Math.max(peakCacheDisk,m.cacheDiskBytes);void appendFile(resolve(runDir,'metrics.jsonl'),line+'\n');}});
monitor.stderr.on('data',(b:Buffer)=>{monitorError+=b.toString();});
let log='';let reason:string|null=null;
child.stdout.on('data',(b:Buffer)=>{process.stdout.write(b);log+=b.toString();});
child.stderr.on('data',(b:Buffer)=>{process.stderr.write(b);log+=b.toString();});
async function stop(why:string){if(reason)return;reason=why;await native('taskkill.exe',['/PID',String(child.pid),'/T','/F']).catch(()=>{});}
const timeout=setTimeout(()=>void stop('deadline_exceeded'),deadline*1000);
const guard=setInterval(()=>{if(peakMemory>8*1024**3)void stop('worker_memory_limit');if(peakDisk>6*1024**3)void stop('scratch_disk_limit');void statfs(runDir).then(s=>{if(s.bavail*s.bsize<2*1024**3)void stop('disk_free_below_2GiB');});},2000);
const interrupted=()=>void stop('cancelled');process.once('SIGINT',interrupted);process.once('SIGTERM',interrupted);
const code=await new Promise<number|null>((res,rej)=>{child.once('error',rej);child.once('close',res);});
clearTimeout(timeout);clearInterval(guard);monitor.kill();process.removeListener('SIGINT',interrupted);process.removeListener('SIGTERM',interrupted);
const wallSeconds=(performance.now()-start)/1000;
let progress:unknown=null;try{progress=await loadJson(resolve(runDir,'progress.json'));}catch{}
const report={runId,fixture,candidate,cache,cacheMeaning:'application bundle/graphics cache only; OS cache uncontrolled',deadlineSeconds:deadline,status:reason??(code===0?'rendered_unvalidated':'failed'),exitCode:code,wallSeconds,outputSeconds:Number(snapshot.durationUs)/1e6,completedRtf:code===0&&!reason?wallSeconds/(Number(snapshot.durationUs)/1e6):null,elapsedOverRequestedDuration:wallSeconds/(Number(snapshot.durationUs)/1e6),peakTreeWorkingSetBytes:peakMemory,peakRunDiskBytes:peakDisk,samples,samplingSeconds:2,monitorError,progress,profile:{width:snapshot.width,height:snapshot.height,fps:snapshot.fps,codec:'libx264',preset:'veryfast',crf:18,pixelFormat:'yuv420p',audio:'aac 192k 48000 stereo',hardwareAcceleration:'disabled; software encode and decode'},limits:'8GiB sampled tree working set; 6GiB run scratch; deadline is censored failure, never a full-workload pass'};
Object.assign(report,{buildHash,peakSharedCacheDiskBytes:peakCacheDisk});
await writeFile(resolve(runDir,'render.log'),log);await json(resolve(runDir,'report.json'),report);
await json(resolve(root,'docs/evidence',`${runId}.json`),report);
console.log(JSON.stringify(report,null,2));
if(code!==0||reason)process.exitCode=1;
