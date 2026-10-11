import {describe,it,expect} from 'vitest';
import {applyAction,emptyState,durationUs,validateDocument} from './kernel';
import type {Asset,Edit,ProjectState} from '../../../contracts/src/project';
const asset:Asset={id:'asset',projectId:'project',name:'lesson.mp4',hash:'a'.repeat(64),durationUs:'10000000',width:1920,height:1080,fps:{num:30000,den:1001},hasAudio:true,size:10,original:'original',proxy:'proxy',thumbnail:'thumbnail'};
const edit=(state:ProjectState,commands:Edit[],commandId='command')=>applyAction(state,{kind:'edit',commandId,commands},[asset]);
const start=()=>edit(emptyState('project','revision'),[{type:'InsertClip',assetId:'asset',clipId:'clip'}],'insert');
describe('Project editing contract',()=>{
  it('splits without changing source timing, with linked audio derived from the same occurrence',()=>{
    const state=edit(start(),[{type:'SplitClip',clipId:'clip',atUs:'3000000',rightId:'right'}]);
    expect(state.document.sequence.clips.map(c=>[c.sourceInUs,c.durationUs,c.sequenceStartUs])).toEqual([['0','3000000','0'],['3000000','7000000','3000000']]);
    expect(durationUs(state.document)).toBe(10000000n);
  });
  it('ripple deletes across clip boundaries and retains source intervals',()=>{
    let state=edit(start(),[{type:'SplitClip',clipId:'clip',atUs:'5000000',rightId:'right'}],'split');
    state=edit(state,[{type:'RippleDeleteRange',startUs:'3000000',endUs:'7000000'}]);
    expect(state.document.sequence.clips.map(c=>[c.sourceInUs,c.durationUs,c.sequenceStartUs])).toEqual([['0','3000000','0'],['7000000','3000000','3000000']]);
  });
  it('rejects an entire invalid batch without mutating history',()=>{
    const state=start(),before=JSON.stringify(state);
    expect(()=>edit(state,[{type:'SplitClip',clipId:'clip',atUs:'3000000',rightId:'right'},{type:'TrimClip',clipId:'right',sourceInUs:'9000000',durationUs:'3000000'}])).toThrow('INVALID_TIMING');
    expect(JSON.stringify(state)).toBe(before);
  });
  it('undo/redo restore every visible change; an edit after undo creates a branch',()=>{
    const state=edit(start(),[{type:'TrimClip',clipId:'clip',sourceInUs:'1000000',durationUs:'8000000'}]);
    const undo=applyAction(state,{kind:'undo',commandId:'undo'},[asset]);
    expect(durationUs(undo.document)).toBe(10000000n);
    const redo=applyAction(undo,{kind:'redo',commandId:'redo'},[asset]);
    expect(redo.document.sequence).toEqual(state.document.sequence);
    const branched=edit(undo,[{type:'TrimClip',clipId:'clip',sourceInUs:'0',durationUs:'1000000'}]);
    expect(()=>applyAction(branched,{kind:'redo',commandId:'redo2'},[asset])).toThrow('NOTHING_TO_REDO');
  });
  it('cannot insert another project’s asset',()=>{
    expect(()=>applyAction(emptyState('other','revision'),{kind:'edit',commandId:'insert',commands:[{type:'InsertClip',assetId:'asset',clipId:'clip'}]},[asset])).toThrow('ASSET_FORBIDDEN');
  });
  it('refuses duplicate occurrences and gaps',()=>{
    const state=start();
    expect(()=>edit(state,[{type:'InsertClip',assetId:'asset',clipId:'clip'}])).toThrow('DUPLICATE_CLIP');
    expect(()=>validateDocument({...state.document,sequence:{...state.document.sequence,clips:[{...state.document.sequence.clips[0]!,sequenceStartUs:'1'}]}})).toThrow('INVALID_TIMING');
  });
  it('allows an empty sequence after deleting all content and undo restores it',()=>{
    const state=edit(start(),[{type:'RippleDeleteRange',startUs:'0',endUs:'10000000'}]);
    expect(state.document.assetRefs).toHaveLength(0);
    expect(durationUs(state.document)).toBe(0n);
    expect(applyAction(state,{kind:'undo',commandId:'undo'},[asset]).document.sequence.clips).toHaveLength(1);
  });
});
