import {describe,it,expect} from 'vitest';
import {emptyState,applyAction,durationUs} from '../project/kernel';
import {projectWords,wordDeletionRanges} from './projection';
import {captionCues,subtitleFile,drawCaption} from '../../../composition/src/captions';
import {defaultCaptionStyle,type Transcript} from '../../../contracts/src/transcript';
import type {Asset,Edit,ProjectState} from '../../../contracts/src/project';
const asset:Asset={id:'asset',projectId:'project',name:'speech.mp4',hash:'a'.repeat(64),durationUs:'10000000',width:1920,height:1080,fps:{num:30,den:1},hasAudio:true,size:1,original:'original',proxy:'proxy',thumbnail:'thumbnail'};
const transcript:Transcript={id:'t',projectId:'project',assetId:'asset',sourceHash:asset.hash,hash:'b'.repeat(64),version:1,provider:'deepgram',model:'nova-3',language:'ar-EG',options:{},normalizationVersion:'dg-words-v1',modelVersions:['test-model'],rawKey:'raw',createdAt:'now',words:[{id:'w1',text:'مرحبا',startUs:'1000000',endUs:'1500000',confidence:.9,utteranceId:'u',speaker:null},{id:'w2',text:'React',startUs:'2000000',endUs:'2500000',confidence:.5,utteranceId:'u',speaker:null},{id:'w3',text:'بكم',startUs:'3000000',endUs:'3500000',confidence:1,utteranceId:'u',speaker:null}]};
const edit=(s:ProjectState,commands:Edit[],id='cmd')=>applyAction(s,{kind:'edit',commandId:id,commands},[asset],[transcript]);
function setup(){return edit(emptyState('project','rev'),[{type:'InsertClip',assetId:'asset',clipId:'first'},{type:'AttachTranscript',ref:{id:'t',assetId:'asset',hash:transcript.hash}}]);}
describe('Transcript edits share immutable revisions and source time',()=>{
  it('distinguishes repeated occurrences and corrects source text in both without touching media time',()=>{
    let s=edit(setup(),[{type:'InsertClip',assetId:'asset',clipId:'second'}]);const before=JSON.stringify(s.document.sequence);
    s=edit(s,[{type:'CorrectWordText',transcriptId:'t',wordId:'w2',text:'TypeScript'}]);const words=projectWords(s.document,[transcript]);
    expect(words.filter(w=>w.wordId==='w2').map(w=>[w.clipId,w.text,w.startUs])).toEqual([['first','TypeScript',2000000n],['second','TypeScript',12000000n]]);
    expect(JSON.stringify(s.document.sequence)).toBe(before);expect(transcript.words[1]!.text).toBe('React');
  });
  it('deletes only the selected occurrence, undo restores the exact intervals, redo matches export captions',()=>{
    const before=edit(setup(),[{type:'InsertClip',assetId:'asset',clipId:'second'}]);const s=edit(before,[{type:'DeleteWords',anchors:[{transcriptId:'t',wordId:'w2',clipId:'second'}]}]);
    expect(projectWords(s.document,[transcript]).filter(w=>w.wordId==='w2').map(w=>w.clipId)).toEqual(['first']);
    expect(s.document.sequence.clips[0]).toEqual(before.document.sequence.clips[0]);expect(durationUs(s.document)).toBeLessThan(durationUs(before.document));
    const undo=applyAction(s,{kind:'undo',commandId:'undo'},[asset],[transcript]);expect(undo.document.sequence).toEqual(before.document.sequence);
    const redo=applyAction(undo,{kind:'redo',commandId:'redo'},[asset],[transcript]);expect(captionCues(redo.document,[transcript])).toEqual(captionCues(s.document,[transcript]));
  });
  it('merges adjacent selections, clamps file edges, rejects unknown anchors atomically',()=>{
    const s=setup(),ranges=wordDeletionRanges(s.document,[transcript],[{transcriptId:'t',wordId:'w1',clipId:'first'},{transcriptId:'t',wordId:'w2',clipId:'first'}]);expect(ranges).toHaveLength(1);expect(ranges[0]!.startUs).toBeGreaterThanOrEqual(0n);
    const input=JSON.stringify(s);expect(()=>edit(s,[{type:'CorrectWordText',transcriptId:'t',wordId:'w1',text:'أهلا'},{type:'DeleteWords',anchors:[{transcriptId:'t',wordId:'wrong',clipId:'first'}]}])).toThrow('WORD_NOT_FOUND');expect(JSON.stringify(s)).toBe(input);
  });
  it('maps a word straddling a manual split with clipped half-open occurrence times',()=>{
    const s=edit(setup(),[{type:'SplitClip',clipId:'first',atUs:'1200000',rightId:'second'}]);const words=projectWords(s.document,[transcript]).filter(w=>w.wordId==='w1');
    expect(words.map(w=>[w.clipId,w.startUs,w.endUs])).toEqual([['first',1000000n,1200000n],['second',1200000n,1500000n]]);
  });
  it('retains a long overlapping word across a trim even if its following word ended earlier',()=>{
    const overlap={...transcript,words:[{...transcript.words[0]!,startUs:'1000000',endUs:'5000000'},{...transcript.words[1]!,startUs:'2000000',endUs:'2500000'},{...transcript.words[2]!,startUs:'6000000',endUs:'6500000'}]};
    const s=edit(setup(),[{type:'TrimClip',clipId:'first',sourceInUs:'3000000',durationUs:'4000000'}]);expect(projectWords(s.document,[overlap]).map(w=>[w.wordId,w.startUs,w.endUs])).toEqual([['w1',0n,2000000n],['w3',3000000n,3500000n]]);
  });
  it('rejects acoustic overlap instead of removing retained neighbouring speech',()=>{
    const overlap={...transcript,words:transcript.words.map((w,i)=>i===0?{...w,endUs:'2100000'}:w)};
    expect(()=>wordDeletionRanges(setup().document,[overlap],[{transcriptId:'t',wordId:'w2',clipId:'first'}])).toThrow('AMBIGUOUS_WORD_BOUNDARY');
  });
  it('clamps first/last word deletion at source bounds and unions selections across a manual split',()=>{
    const edge={...transcript,words:[{...transcript.words[0]!,startUs:'0',endUs:'500000'},{...transcript.words[1]!,startUs:'9500000',endUs:'10000000'}]};
    const s=setup(),first=wordDeletionRanges(s.document,[edge],[{transcriptId:'t',wordId:'w1',clipId:'first'}]),last=wordDeletionRanges(s.document,[edge],[{transcriptId:'t',wordId:'w2',clipId:'first'}]);expect(first[0]!.startUs).toBe(0n);expect(last[0]!.endUs).toBe(10000000n);
    const split=edit(s,[{type:'SplitClip',clipId:'first',atUs:'1200000',rightId:'second'}]);const across=wordDeletionRanges(split.document,[transcript],[{transcriptId:'t',wordId:'w1',clipId:'first'},{transcriptId:'t',wordId:'w1',clipId:'second'}]);expect(across).toHaveLength(1);expect(across[0]!.startUs).toBeLessThan(1000000n);expect(across[0]!.endUs).toBeGreaterThan(1500000n);
  });
  it('retimes corrected SRT/VTT using the edited sequence and keeps style in undo history',()=>{
    let s=setup();s=edit(s,[{type:'CorrectWordText',transcriptId:'t',wordId:'w3',text:'TypeScript بالعربي'},{type:'RippleDeleteRange',startUs:'0',endUs:'1000000'},{type:'SetCaptionStyle',style:{...defaultCaptionStyle,enabled:true}}]);
    const cues=captionCues(s.document,[transcript]);expect(cues[0]!.startUs).toBe('0');expect(subtitleFile(cues,'srt')).toContain('00:00:00,000');expect(subtitleFile(cues,'vtt')).toContain('WEBVTT');expect(subtitleFile(cues,'vtt')).toContain('TypeScript بالعربي');
    expect(applyAction(s,{kind:'undo',commandId:'u'},[asset],[transcript]).document.captionStyle?.enabled).toBe(false);
  });
  it('splits overflow into two-line events and rejects an unbreakable correction',()=>{
    const large={...transcript,words:Array.from({length:80},(_,i)=>({...transcript.words[0]!,id:`w${i}`,text:'مرحبا بكم',startUs:String(i*100000),endUs:String(i*100000+80000)}))};
    const cues=captionCues(setup().document,[large]);expect(cues.length).toBeGreaterThan(1);expect(cues.every(c=>c.lines.length<=2 && c.lines.every(l=>[...l].length<=32))).toBe(true);
    const bad=edit(setup(),[{type:'CorrectWordText',transcriptId:'t',wordId:'w1',text:'a'.repeat(80)}]);expect(()=>captionCues(bad.document,[transcript])).toThrow('CAPTION_OVERFLOW');
  });
  it('keeps the longest acoustic end when a following overlapping word is shorter',()=>{
    const overlap={...transcript,words:[{...transcript.words[0]!,startUs:'1000000',endUs:'5000000'},{...transcript.words[1]!,startUs:'2000000',endUs:'2500000'},{...transcript.words[2]!,startUs:'6000000',endUs:'6500000'}]};
    expect(captionCues(setup().document,[overlap])[0]!.endUs).toBe('5000000');
  });
  it('projects and searches 60,000 words without copying them into the document',()=>{
    const large={...transcript,words:Array.from({length:60000},(_,i)=>({...transcript.words[0]!,id:`w${i}`,text:i===45000?'TypeScript':'كلمة',startUs:String(i*100),endUs:String(i*100+80)}))};
    const words=projectWords(setup().document,[large]);expect(words).toHaveLength(60000);expect(words.filter(w=>w.text==='TypeScript')).toHaveLength(1);expect(JSON.stringify(setup().document).length).toBeLessThan(3000);
  });
});
