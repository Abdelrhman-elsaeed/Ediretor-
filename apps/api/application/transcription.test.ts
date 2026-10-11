import {afterEach,beforeEach,describe,it,expect} from 'vitest';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {DatabaseSync} from 'node:sqlite';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {openDatabase} from '../infrastructure/database';
import {SqliteRepository} from '../infrastructure/repository';
import {ProjectService} from './projects';
import {TranscriptionService} from './transcription';
import type {Asset,Project} from '../../../packages/contracts/src/project';
import type {Transcript} from '../../../packages/contracts/src/transcript';
let path:string,db:DatabaseSync,repo:SqliteRepository,projects:ProjectService,service:TranscriptionService,project:Project,asset:Asset;
beforeEach(async()=>{path=await mkdtemp(join(tmpdir(),'transcript-test-'));db=openDatabase(join(path,'test.sqlite'));repo=new SqliteRepository(db);projects=new ProjectService(repo,repo,{exists:async()=>true});service=new TranscriptionService(repo,repo,{exists:async()=>true},()=>true);project=projects.create('alice','النص');asset={id:'asset',projectId:project.id,name:'source',hash:'a'.repeat(64),durationUs:'10000000',width:1920,height:1080,fps:{num:30,den:1},hasAudio:true,size:1,original:'original',proxy:'proxy',thumbnail:'thumbnail'};repo.addAsset(project.id,asset);});
afterEach(async()=>{db.close();await rm(path,{recursive:true,force:true});});
const start=(requestId='request')=>service.start('alice',project.id,{assetId:'asset',language:'ar-EG',requestId});
describe('Durable transcript lifecycle',()=>{
  it('lets independent API/worker processes concurrently migrate a fresh database',async()=>{
    const file=join(path,'concurrent.sqlite'),script=`import {openDatabase} from './apps/api/infrastructure/database.ts';const db=openDatabase(${JSON.stringify(file)});db.close();`;
    await Promise.all(Array.from({length:4},()=>promisify(execFile)(process.execPath,['--import','tsx','--input-type=module','-e',script],{windowsHide:true})));
    const migrated=openDatabase(file);try{expect(migrated.prepare('SELECT version FROM migrations ORDER BY version').all().map(r=>r.version)).toEqual([1,2]);}finally{migrated.close();}
  });
  it('deduplicates delivery and active requests; mismatched receipt rejected',async()=>{
    const one=await start(),two=await start(),three=await start('second');expect(one.id).toBe(two.id);expect(three.id).toBe(one.id);expect(repo.listJobs('alice',project.id)).toHaveLength(1);
    await expect(service.start('alice',project.id,{assetId:'asset',language:'en',requestId:'request'})).rejects.toThrow('IDEMPOTENCY_MISMATCH');
  });
  it('rejects unavailable provider, silent media, missing originals and other owners',async()=>{
    const request={assetId:'asset',language:'ar-EG',requestId:'r'};
    await expect(new TranscriptionService(repo,repo,{exists:async()=>true},()=>false).start('alice',project.id,request)).rejects.toThrow('TRANSCRIPTION_UNAVAILABLE');
    await expect(new TranscriptionService(repo,repo,{exists:async()=>false},()=>true).start('alice',project.id,request)).rejects.toThrow('MISSING_MEDIA');
    await expect(service.start('bob',project.id,request)).rejects.toThrow('PROJECT_NOT_FOUND');
    db.prepare('UPDATE assets SET metadata_json = ? WHERE id = ?').run(JSON.stringify({...asset,hasAudio:false}),asset.id);await expect(start()).rejects.toThrow('SILENT_SOURCE');expect(repo.listJobs('alice',project.id)).toEqual([]);
  });
  it('persists raw chunk checkpoints, fences stale/cancelled workers and publishes one immutable result',async()=>{
    const job=await start(),record=repo.claim('lease')!,payload=record.payload as {transcriptId:string};
    expect(repo.saveCheckpoint(job.id,'stale',0,{raw:'response'})).toBe(false);expect(repo.saveCheckpoint(job.id,'lease',0,{raw:'response'})).toBe(true);expect(repo.saveCheckpoint(job.id,'lease',0,{raw:'changed'})).toBe(false);
    const t:Transcript={id:payload.transcriptId,projectId:project.id,assetId:'asset',sourceHash:asset.hash,hash:'b'.repeat(64),version:1,provider:'deepgram',model:'nova-3',language:'ar-EG',normalizationVersion:'dg-words-v1',modelVersions:['v'],options:{},rawKey:'raw',words:[{id:'w',text:'أهلا',startUs:'1000000',endUs:'2000000',confidence:.8,utteranceId:'u',speaker:null}],createdAt:'now'};
    expect(repo.finish(job.id,'stale',{transcriptId:t.id},undefined,t)).toBe(false);expect(repo.finish(job.id,'lease',{transcriptId:t.id},undefined,t)).toBe(true);expect(repo.finish(job.id,'lease',{transcriptId:t.id},undefined,t)).toBe(false);expect(service.list('alice',project.id)).toEqual([t]);expect(()=>service.list('bob',project.id)).toThrow('PROJECT_NOT_FOUND');
    const saved=projects.save('alice',project.id,{commandId:'save',baseRevisionId:project.revisionId,actions:[{kind:'edit',commandId:'edit',commands:[{type:'InsertClip',assetId:'asset',clipId:'clip'},{type:'AttachTranscript',ref:{id:t.id,assetId:'asset',hash:t.hash}},{type:'CorrectWordText',transcriptId:t.id,wordId:'w',text:'مرحبا'}]}]});
    expect(saved.state.document.displayCorrections![0]!.text).toBe('مرحبا');expect(service.list('alice',project.id)[0]!.words[0]!.text).toBe('أهلا');
    expect(()=>projects.save('alice',project.id,{commandId:'stale',baseRevisionId:project.revisionId,actions:[{kind:'undo',commandId:'u'}]})).toThrow('REVISION_CONFLICT');
    db.close();db=openDatabase(join(path,'test.sqlite'));repo=new SqliteRepository(db);expect(repo.load('alice',project.id).state).toEqual(saved.state);expect(repo.load('alice',project.id).transcripts).toEqual([t]);
  });
  it('cannot checkpoint or publish after cancellation, keeps completed chunks for explicit retry',async()=>{
    const job=await start();repo.claim('lease');repo.saveCheckpoint(job.id,'lease',0,{source:'real'});repo.cancel('alice',job.id);expect(repo.saveCheckpoint(job.id,'lease',1,{})).toBe(false);expect(repo.finish(job.id,'lease',{transcriptId:'t'})).toBe(false);
    repo.retry('alice',job.id);repo.claim('new-lease');expect(repo.checkpoint(job.id,'new-lease',0)).toEqual({source:'real'});expect(repo.checkpoint(job.id,'lease',0)).toBeNull();
  });
  it('upgrades an actual v1 database without changing projects, history, receipts or jobs',async()=>{
    const legacy=join(path,'legacy.sqlite'),old=new DatabaseSync(legacy);old.exec(await readFile(new URL('../infrastructure/migrations/001-local.sql',import.meta.url),'utf8'));old.exec('CREATE TABLE migrations(version INTEGER PRIMARY KEY,applied_at TEXT NOT NULL)');old.prepare('INSERT INTO migrations VALUES (1,?)').run('then');
    const p=repo.load('alice',project.id);const legacyState={...p.state,document:{...p.state.document,schemaVersion:1,transcriptRefs:undefined,displayCorrections:undefined,captionStyle:undefined}};old.prepare('INSERT INTO projects VALUES (?,?,?,?,?,?)').run(p.id,'alice',p.name,p.revisionId,JSON.stringify(legacyState),'then');old.prepare("INSERT INTO jobs (id,project_id,owner,kind,status,payload_json,stage,created_at,updated_at) VALUES (?,?,?,'export','queued','{}','queued','then','then')").run('legacy-job',p.id,'alice');old.close();
    const upgraded=openDatabase(legacy);try{expect(upgraded.prepare('SELECT max(version) n FROM migrations').get()?.n).toBe(2);expect(new SqliteRepository(upgraded).get('alice','legacy-job').status).toBe('queued');expect(JSON.parse(String(upgraded.prepare('SELECT state_json FROM projects').get()?.state_json))).toEqual(JSON.parse(JSON.stringify(legacyState)));expect(upgraded.prepare('PRAGMA foreign_key_check').all()).toEqual([]);}finally{upgraded.close();}
  });
});
