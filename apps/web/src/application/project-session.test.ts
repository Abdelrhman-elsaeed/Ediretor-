import {describe,it,expect,vi,afterEach} from 'vitest';
import {ProjectSession} from './project-session';
import {AppError,type Project,type SaveRequest} from '../../../../packages/contracts/src/project';
import {applyAction,emptyState} from '../../../../packages/domain/src/project/kernel';
const project=():Project=>({id:'project',name:'درس',revisionId:'revision',updatedAt:new Date().toISOString(),state:emptyState('project','revision'),assets:[{id:'asset',projectId:'project',name:'video.mp4',hash:'a'.repeat(64),durationUs:'10000000',width:1920,height:1080,fps:{num:30,den:1},hasAudio:true,size:10,original:'original',proxy:'proxy',thumbnail:'thumbnail'}]});
const storage=()=>{const data=new Map<string,string>();return{get:(key:string)=>data.get(key)??null,set:(key:string,value:string)=>{data.set(key,value);},remove:(key:string)=>{data.delete(key);}};};
const insert=(session:ProjectSession)=>session.edit([{type:'InsertClip',assetId:'asset',clipId:'clip'}]);
afterEach(()=>vi.useRealTimers());
describe('Pending project session',()=>{
  it('keeps failed saves visibly dirty and restores pending work after reload',async()=>{
    vi.useFakeTimers();const initial=project(),store=storage(),client={load:async()=>initial,save:async()=>{throw new AppError('CONNECTION_LOST');}};
    const session=new ProjectSession(initial,client,store);insert(session);await expect(session.flush()).rejects.toThrow('CONNECTION_LOST');
    expect(session.snapshot()).toMatchObject({dirty:true,error:'CONNECTION_LOST'});session.dispose();
    const reopened=new ProjectSession(initial,client,store);expect(reopened.snapshot().state.document.sequence.clips).toHaveLength(1);expect(reopened.snapshot().recovered).toBe(true);reopened.dispose();
  });
  it('retries the exact request after an acknowledgement is lost',async()=>{
    vi.useFakeTimers();const initial=project(),requests:SaveRequest[]=[];
    const client={load:async()=>initial,save:async(requestId:string,request:SaveRequest)=>{
      requests.push(request);if(requests.length===1)throw new AppError('CONNECTION_LOST');
      const state=applyAction(initial.state,request.actions[0]!,initial.assets);state.document={...state.document,revisionId:'revision2'};
      return {...initial,state,revisionId:'revision2'};
    }};
    const session=new ProjectSession(initial,client,storage());insert(session);await session.flush().catch(()=>{});await session.flush();
    expect(requests[0]).toEqual(requests[1]);expect(session.snapshot()).toMatchObject({dirty:false,error:null});session.dispose();
  });
  it('preserves actions added while saving and commits them on the new base',async()=>{
    vi.useFakeTimers();const initial=project();let release!:(project:Project)=>void;
    const client={load:async()=>initial,save:async()=>new Promise<Project>(resolve=>{release=resolve;})};
    const session=new ProjectSession(initial,client,storage());insert(session);const saved=session.flush();
    session.edit([{type:'SplitClip',clipId:'clip',atUs:'5000000',rightId:'right'}]);
    const state=applyAction(initial.state,{kind:'edit',commandId:'insert',commands:[{type:'InsertClip',assetId:'asset',clipId:'clip'}]},initial.assets);state.document={...state.document,revisionId:'revision2'};
    release({...initial,state,revisionId:'revision2'});await saved;
    expect(session.snapshot().state.document.sequence.clips).toHaveLength(2);expect(session.snapshot().dirty).toBe(true);expect(session.snapshot().project.revisionId).toBe('revision2');session.dispose();
  });
  it('keeps conflicting work recoverable and refuses silent overwrite',async()=>{
    vi.useFakeTimers();const initial=project(),store=storage();const client={load:async()=>initial,save:async()=>{throw new AppError('REVISION_CONFLICT');}};
    const session=new ProjectSession(initial,client,store);insert(session);await session.flush().catch(()=>{});
    expect(()=>session.undo()).toThrow('REVISION_CONFLICT');expect(await session.recoveryFile().text()).toContain('InsertClip');session.dispose();
    const newer={...initial,revisionId:'newer'};const reopened=new ProjectSession(newer,client,store);expect(reopened.snapshot().error).toBe('REVISION_CONFLICT');expect(await reopened.recoveryFile().text()).toContain('InsertClip');reopened.dispose();
  });
});
