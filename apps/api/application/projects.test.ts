import {afterEach,beforeEach,describe,it,expect} from 'vitest';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import type {DatabaseSync} from 'node:sqlite';
import {openDatabase} from '../infrastructure/database';
import {SqliteRepository} from '../infrastructure/repository';
import {ProjectService} from './projects';
import type {Asset,Project,SaveRequest} from '../../../packages/contracts/src/project';
let path:string,db:DatabaseSync,repo:SqliteRepository,service:ProjectService,project:Project,asset:Asset;
beforeEach(async()=>{
  path=await mkdtemp(join(tmpdir(),'ediretor-test-'));db=openDatabase(join(path,'test.sqlite'));repo=new SqliteRepository(db);
  service=new ProjectService(repo,repo,{exists:async()=>true});project=service.create('alice','شرح React');
  asset={id:'asset',projectId:project.id,name:'React.mp4',hash:'a'.repeat(64),durationUs:'10000000',width:1920,height:1080,fps:{num:30,den:1},hasAudio:true,size:10,original:'original',proxy:'proxy',thumbnail:'thumbnail'};
  repo.addAsset(project.id,asset);
});
afterEach(async()=>{db.close();await rm(path,{recursive:true,force:true});});
const insert=():SaveRequest=>({commandId:'save1',baseRevisionId:project.revisionId,actions:[{kind:'edit',commandId:'insert1',commands:[{type:'InsertClip',assetId:'asset',clipId:'clip'}]}]});
describe('Transactional project application',()=>{
  it('survives database reopen with saved history and immutable revisions',()=>{
    const saved=service.save('alice',project.id,insert());db.close();db=openDatabase(join(path,'test.sqlite'));repo=new SqliteRepository(db);
    const reopened=repo.load('alice',project.id);
    expect(reopened.state).toEqual(saved.state);expect(reopened.state.history).toHaveLength(2);
    expect(db.prepare('SELECT count(*) n FROM revisions').get()?.n).toBe(2);
  });
  it('is idempotent after a lost save acknowledgement',()=>{
    const request=insert(),one=service.save('alice',project.id,request),two=service.save('alice',project.id,request);
    expect(one.revisionId).toBe(two.revisionId);expect(two.state.document.sequence.clips).toHaveLength(1);
    expect(()=>service.save('alice',project.id,{...request,actions:[{...request.actions[0]!,kind:'undo'}]})).toThrow();
  });
  it('rejects a second client on an old revision, keeping the first state',()=>{
    const saved=service.save('alice',project.id,insert());
    expect(()=>service.save('alice',project.id,{...insert(),commandId:'save2',actions:[{kind:'undo',commandId:'undo2'}]})).toThrow('REVISION_CONFLICT');
    expect(service.load('alice',project.id).revisionId).toBe(saved.revisionId);
  });
  it('rolls back a failed batch, including revision and idempotency records',()=>{
    const request=insert();request.actions.push({kind:'edit',commandId:'bad',commands:[{type:'TrimClip',clipId:'clip',sourceInUs:'9000000',durationUs:'3000000'}]});
    expect(()=>service.save('alice',project.id,request)).toThrow('INVALID_TIMING');
    expect(service.load('alice',project.id).state.document.sequence.clips).toHaveLength(0);
    expect(db.prepare('SELECT count(*) n FROM revisions').get()?.n).toBe(1);expect(db.prepare('SELECT count(*) n FROM commits').get()?.n).toBe(0);
  });
  it('enforces owner isolation for read, save, job status and media references',()=>{
    expect(()=>service.load('bob',project.id)).toThrow('PROJECT_NOT_FOUND');
    expect(()=>service.save('bob',project.id,insert())).toThrow('PROJECT_NOT_FOUND');
    expect(()=>service.resolveAsset('bob',project.id,'asset','proxy')).toThrow('PROJECT_NOT_FOUND');
    const job=service.ingest('alice',project.id,{upload:'upload',name:'video.mp4',size:10});
    expect(()=>repo.get('bob',job.id)).toThrow('JOB_NOT_FOUND');expect(()=>repo.cancel('bob',job.id)).toThrow('JOB_NOT_FOUND');
  });
  it('pins export content while later revisions change',async()=>{
    const saved=service.save('alice',project.id,insert());const job=await service.export('alice',project.id,saved.revisionId);
    service.save('alice',project.id,{commandId:'save2',baseRevisionId:saved.revisionId,actions:[{kind:'undo',commandId:'undo2'}]});
    const claimed=repo.claim('worker1');expect(claimed?.id).toBe(job.id);
    expect(claimed?.payload).toMatchObject({document:{revisionId:saved.revisionId,sequence:{clips:[{id:'clip'}]}}});
  });
  it('prevents publication by a cancelled or expired worker and reclaims a crashed lease',()=>{
    const job=service.ingest('alice',project.id,{upload:'upload',name:'video.mp4',size:10});repo.claim('old-worker');
    db.prepare('UPDATE jobs SET lease_until = 0 WHERE id = ?').run(job.id);
    expect(repo.claim('new-worker')?.attempts).toBe(2);
    expect(repo.finish(job.id,'old-worker',{assetId:'asset'})).toBe(false);
    repo.cancel('alice',job.id);expect(repo.finish(job.id,'new-worker',{assetId:'asset'})).toBe(false);
    expect(repo.get('alice',job.id).status).toBe('cancelled');
  });
  it('limits dispatch retries and allows an explicit retry of a terminal job',()=>{
    const job=service.ingest('alice',project.id,{upload:'upload',name:'video.mp4',size:10});
    for(let i=0;i<3;i++){expect(repo.claim(`worker-${i}`)?.id).toBe(job.id);db.prepare('UPDATE jobs SET lease_until = 0 WHERE id = ?').run(job.id);}
    expect(repo.claim('fourth')).toBeNull();expect(repo.get('alice',job.id).error).toBe('RETRY_LIMIT');
    expect(repo.retry('alice',job.id).status).toBe('queued');
  });
  it('refuses missing originals before enqueueing exports',async()=>{
    const saved=service.save('alice',project.id,insert());const unavailable=new ProjectService(repo,repo,{exists:async()=>false});
    await expect(unavailable.export('alice',project.id,saved.revisionId)).rejects.toThrow('MISSING_MEDIA');
    expect(repo.listJobs('alice',project.id)).toHaveLength(0);
  });
  it('rejects duplicate action IDs and supports query filtering and paging',()=>{
    expect(()=>service.save('alice',project.id,{...insert(),actions:[insert().actions[0]!,insert().actions[0]!]})).toThrow('DUPLICATE_COMMAND');
    service.create('bob','شرح React');expect(service.list('alice','React').items).toHaveLength(1);expect(service.list('alice','%').items).toHaveLength(0);
  });
});
