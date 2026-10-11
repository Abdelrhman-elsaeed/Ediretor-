import {AppError,type Asset,type Edit,type ProjectClip,type ProjectDocument} from '../../../contracts/src/project';

const B=BigInt;
const end=(c:ProjectClip)=>B(c.sequenceStartUs)+B(c.durationUs);
const timingTypes=new Set(['InsertClip','SplitClip','TrimClip','RippleDeleteRange','AttachTranscript','CorrectWordText','DeleteWords','SetCaptionStyle']);
export const isMultitrackCommand=(c:Edit)=>!timingTypes.has(c.type);
export function alignment(member:{offsetUs:string;markers:{sourceUs:string;groupUs:string}[]}) {
  const residuals=member.markers.map(m=>B(m.groupUs)-B(m.sourceUs)-B(member.offsetUs));
  const abs=(x:bigint)=>x<0n?-x:x;
  const drift=residuals.length>1?residuals.reduce((a,b)=>a>b?a:b)-residuals.reduce((a,b)=>a<b?a:b):0n;
  return {status:residuals.length===0?'unverified':drift>40_000n || residuals.some(r=>abs(r)>40_000n)?'needs_alignment':'manual',driftUs:drift.toString(),residuals:residuals.map(String)};
}
export function validateMultitrack(d:ProjectDocument) {
  if(d.schemaVersion!==3){if(d.sourceRoles||d.syncGroups||d.editLinkGroups||d.layouts||d.sequence.clips.some(c=>c.trackId!=='picture'||c.transform||c.audio||c.syncGroupId||c.transitionUs)||JSON.stringify(d.sequence.tracks)!==JSON.stringify([{id:'picture',kind:'video'},{id:'sound',kind:'linked-audio'}]))throw new AppError('SCHEMA_VERSION_REQUIRED');return;}
  const tracks=new Map(d.sequence.tracks.map(t=>[t.id,t]));
  if(tracks.size!==d.sequence.tracks.length)throw new AppError('DUPLICATE_TRACK');
  for(const c of d.sequence.clips){const t=tracks.get(c.trackId),a=d.assetRefs.find(a=>a.id===c.assetId);if(!t||t.kind==='linked-audio')throw new AppError('INVALID_TRACK');
    if(a?.mediaKind==='audio'&&t.kind!=='audio')throw new AppError('INVALID_TRACK');
    const x=c.transform;if(x&&(x.cropX+x.cropWidth>1.000001||x.cropY+x.cropHeight>1.000001||x.x+x.width>1.000001||x.y+x.height>1.000001))throw new AppError('INVALID_TRANSFORM');
    if(c.audio&&(B(c.audio.fadeInUs)+B(c.audio.fadeOutUs)>B(c.durationUs)))throw new AppError('INSUFFICIENT_HANDLES');
    if(c.transitionUs&&B(c.transitionUs)*2n>B(c.durationUs))throw new AppError('INSUFFICIENT_HANDLES');
  }
  for(const t of tracks.values()){const clips=d.sequence.clips.filter(c=>c.trackId===t.id).sort((a,b)=>B(a.sequenceStartUs)<B(b.sequenceStartUs)?-1:1);if(clips.some((c,i)=>i>0&&B(c.sequenceStartUs)<end(clips[i-1]!)))throw new AppError('TRACK_OVERLAP');}
  const roles=d.sourceRoles??[];if(new Set(roles.map(r=>r.assetId)).size!==roles.length||roles.some(r=>!d.assetRefs.some(a=>a.id===r.assetId)))throw new AppError('INVALID_ROLE');
  const groups=d.syncGroups??[];if(new Set(groups.map(g=>g.id)).size!==groups.length)throw new AppError('INVALID_SYNC_GROUP');
  const membership=new Set<string>();
  for(const g of groups){if(new Set(g.members.map(m=>m.assetId)).size!==g.members.length)throw new AppError('INVALID_SYNC_GROUP');
    for(const m of g.members){if(membership.has(m.assetId)||!d.assetRefs.some(a=>a.id===m.assetId)||m.markers.some(r=>B(r.sourceUs)>B(d.assetRefs.find(a=>a.id===m.assetId)!.durationUs)))throw new AppError('INVALID_SYNC_GROUP');membership.add(m.assetId);}
    if(g.primaryAssetId&&!g.members.some(m=>m.assetId===g.primaryAssetId&&d.assetRefs.find(a=>a.id===m.assetId)?.hasAudio))throw new AppError('SILENT_SOURCE');
  }
  for(const c of d.sequence.clips)if(c.syncGroupId&&!groups.some(g=>g.id===c.syncGroupId&&g.members.some(m=>m.assetId===c.assetId)))throw new AppError('INVALID_SYNC_GROUP');
  const links=d.editLinkGroups??[],linked=new Set<string>();if(new Set(links.map(g=>g.id)).size!==links.length)throw new AppError('INVALID_LINK');
  for(const g of links)for(const id of g.clipIds){if(linked.has(id)||!d.sequence.clips.some(c=>c.id===id))throw new AppError('INVALID_LINK');linked.add(id);}
  if(new Set((d.layouts??[]).map(l=>l.id)).size!==(d.layouts??[]).length)throw new AppError('INVALID_LAYOUT');
}
const assertUnlocked=(d:ProjectDocument,clips:readonly ProjectClip[])=>{if(clips.some(c=>d.sequence.tracks.find(t=>t.id===c.trackId)?.locked))throw new AppError('TRACK_LOCKED');};
function linkedIds(d:ProjectDocument,ids:readonly string[]) {const result=new Set(ids);for(const g of d.editLinkGroups??[])if(g.clipIds.some(id=>result.has(id)))for(const id of g.clipIds)result.add(id);return result;}
function promote(d:ProjectDocument):ProjectDocument{return {...d,schemaVersion:3,sourceRoles:d.sourceRoles??[],syncGroups:d.syncGroups??[],editLinkGroups:d.editLinkGroups??[],layouts:d.layouts??[]};}
export function applyMultitrack(input:ProjectDocument,c:Edit,assets:readonly Asset[],commandId:string):ProjectDocument {
  let d=promote(input),clips=d.sequence.clips.map(c=>({...c})),refs=[...d.assetRefs];
  const include=(id:string)=>{const a=assets.find(a=>a.id===id&&a.projectId===d.projectId);if(!a)throw new AppError('ASSET_FORBIDDEN');if(!refs.some(r=>r.id===id))refs.push(a);return a;};
  const target='clipId'in c?clips.find(x=>x.id===c.clipId):undefined;
  const targets=target?linkedIds(d,[target.id]):new Set<string>();
  // Descendants can share a link group after earlier splits. A trim/remove acts
  // on the temporal cohort of the selected occurrence, not every past segment.
  if(target&&(c.type==='TrimClip'||c.type==='RemoveClip'))for(const x of clips)if(end(x)<=B(target.sequenceStartUs)||B(x.sequenceStartUs)>=end(target))targets.delete(x.id);
  const descendants=new Map<string,string[]>();
  const bound=(x:ProjectClip,start:bigint,finish:bigint,id=x.id):ProjectClip=>({...x,id,sourceInUs:(B(x.sourceInUs)+start-B(x.sequenceStartUs)).toString(),sequenceStartUs:start.toString(),durationUs:(finish-start).toString()});
  if(c.type==='SetSourceRole'){include(c.assetId);assertUnlocked(d,clips.filter(x=>x.assetId===c.assetId));d.sourceRoles=[...d.sourceRoles!.filter(r=>r.assetId!==c.assetId),{assetId:c.assetId,role:c.role}];}
  else if(c.type==='AddTrack'){if(d.sequence.tracks.some(t=>t.id===c.track.id))throw new AppError('DUPLICATE_TRACK');d.sequence={...d.sequence,tracks:[...d.sequence.tracks,c.track]};}
  else if(c.type==='SetTrack'){const t=d.sequence.tracks.find(t=>t.id===c.trackId);if(!t)throw new AppError('INVALID_TRACK');if(t.locked&&(c.hidden!==undefined||c.muted!==undefined))throw new AppError('TRACK_LOCKED');d.sequence={...d.sequence,tracks:d.sequence.tracks.map(t=>t.id===c.trackId?{...t,...(c.locked!==undefined?{locked:c.locked}:{}),...(c.hidden!==undefined?{hidden:c.hidden}:{}),...(c.muted!==undefined?{muted:c.muted}:{})}:t)};}
  else if(c.type==='InsertClip'||c.type==='InsertMedia'){const a=include(c.assetId),trackId=c.type==='InsertMedia'?c.trackId:'picture';assertUnlocked(d,[{trackId} as ProjectClip]);const length=clips.reduce((a,x)=>end(x)>a?end(x):a,0n);clips.push({id:c.clipId,assetId:a.id,trackId,sourceInUs:c.type==='InsertMedia'?c.sourceInUs:'0',durationUs:c.type==='InsertMedia'?c.durationUs:a.durationUs,sequenceStartUs:c.type==='InsertMedia'?c.atUs:length.toString()});}
  else if(c.type==='CreateSyncGroup'){
    if(d.syncGroups!.some(g=>g.id===c.group.id)||c.clipIds.length!==c.group.members.length||new Set(c.clipIds).size!==c.clipIds.length)throw new AppError('INVALID_SYNC_GROUP');
    const chosen=c.clipIds.map(id=>clips.find(x=>x.id===id));if(chosen.some(x=>!x)||chosen.some(x=>!c.group.members.some(m=>m.assetId===x!.assetId))||new Set(chosen.map(x=>x!.assetId)).size!==chosen.length)throw new AppError('INVALID_SYNC_GROUP');assertUnlocked(d,chosen as ProjectClip[]);
    d.syncGroups=[...d.syncGroups!,c.group];clips=clips.map(x=>{if(!c.clipIds.includes(x.id))return x;const m=c.group.members.find(m=>m.assetId===x.assetId)!;const start=B(c.group.originUs)+B(m.offsetUs),trim=start<0n?-start:0n;return {...x,syncGroupId:c.group.id,sequenceStartUs:(start<0n?0n:start).toString(),sourceInUs:trim.toString(),durationUs:(B(refs.find(a=>a.id===x.assetId)!.durationUs)-trim).toString()};});
  }
  else if(c.type==='SetSyncOffset'||c.type==='SetSyncMarkers'||c.type==='SetPrimaryAudio'){
    const g=d.syncGroups!.find(g=>g.id===c.groupId);if(!g)throw new AppError('INVALID_SYNC_GROUP');assertUnlocked(d,clips.filter(x=>x.syncGroupId===g.id));
    if(c.type==='SetPrimaryAudio'){d.syncGroups=d.syncGroups!.map(x=>x.id===g.id?{...x,primaryAssetId:c.assetId}:x);}
    else {const m=g.members.find(m=>m.assetId===c.assetId);if(!m)throw new AppError('INVALID_SYNC_GROUP');
      if(c.type==='SetSyncOffset'){
        // Re-alignment is only safe before destructive edits. Never guess mapping after ripple.
        const occurrences=clips.filter(x=>x.syncGroupId===g.id&&x.assetId===m.assetId),oldStart=B(g.originUs)+B(m.offsetUs),oldTrim=oldStart<0n?-oldStart:0n;
        if(occurrences.length!==1||B(occurrences[0]!.sourceInUs)!==oldTrim||B(occurrences[0]!.durationUs)!==B(refs.find(a=>a.id===m.assetId)!.durationUs)-oldTrim||B(occurrences[0]!.sequenceStartUs)!==(oldStart<0n?0n:oldStart))throw new AppError('ALIGNMENT_AFTER_EDIT');
        const start=B(g.originUs)+B(c.offsetUs),trim=start<0n?-start:0n;clips=clips.map(x=>x.id===occurrences[0]!.id?{...x,sequenceStartUs:(start<0n?0n:start).toString(),sourceInUs:trim.toString(),durationUs:(B(refs.find(a=>a.id===x.assetId)!.durationUs)-trim).toString()}:x);
      }
      d.syncGroups=d.syncGroups!.map(x=>x.id===g.id?{...x,members:x.members.map(x=>x.assetId===m.assetId?{...x,...(c.type==='SetSyncOffset'?{offsetUs:c.offsetUs}:{markers:c.markers})}:x)}:x);
    }
  }
  else if(c.type==='LinkClips'){assertUnlocked(d,clips.filter(x=>c.clipIds.includes(x.id)));d.editLinkGroups=[...d.editLinkGroups!.filter(g=>g.id!==c.groupId),{id:c.groupId,clipIds:c.clipIds}];}
  else if(c.type==='UnlinkClips'){assertUnlocked(d,clips.filter(x=>d.editLinkGroups!.find(g=>g.id===c.groupId)?.clipIds.includes(x.id)));d.editLinkGroups=d.editLinkGroups!.filter(g=>g.id!==c.groupId);}
  else if(c.type==='SetLayout'){d.layouts=[...d.layouts!.filter(x=>x.id!==c.layout.id),c.layout].sort((a,b)=>Number(B(a.atUs)-B(b.atUs)));}
  else if(c.type==='RemoveLayout'){d.layouts=d.layouts!.filter(x=>x.id!==c.layoutId);}
  else if(c.type==='RippleDeleteRange'){
    const start=B(c.startUs),finish=B(c.endUs),delta=finish-start,length=clips.reduce((a,x)=>end(x)>a?end(x):a,0n);if(delta<=0n||finish>length)throw new AppError('INVALID_RANGE');
    const ids=c.clipIds?linkedIds(d,c.clipIds):new Set(clips.map(x=>x.id));if(c.clipIds?.some(id=>!clips.some(x=>x.id===id)))throw new AppError('CLIP_NOT_FOUND');
    assertUnlocked(d,clips.filter(x=>(ids.has(x.id)&&end(x)>start)||B(x.sequenceStartUs)>=finish));
    clips=clips.flatMap((x,i)=>{const cs=B(x.sequenceStartUs),ce=end(x);let parts:ProjectClip[];
      if(!ids.has(x.id)||ce<=start||cs>=finish)parts=[x];else {parts=[];if(cs<start)parts.push(bound(x,cs,start));if(ce>finish)parts.push(bound(x,finish,ce,`${commandId}:cut:${i}`));}
      descendants.set(x.id,parts.map(p=>p.id));return parts.map(p=>B(p.sequenceStartUs)>=finish?{...p,sequenceStartUs:(B(p.sequenceStartUs)-delta).toString()}:p);
    });
    d.layouts=d.layouts!.map(l=>B(l.atUs)>=finish?{...l,atUs:(B(l.atUs)-delta).toString()}:B(l.atUs)>=start?{...l,atUs:start.toString(),needsReview:true}:l);
  }
  else if(target){
    assertUnlocked(d,c.type==='SetTransform'||c.type==='SetAudio'||c.type==='SetTransition'?[target]:clips.filter(x=>targets.has(x.id)));
    if(c.type==='SplitClip') {const at=B(c.atUs);if(at<=B(target.sequenceStartUs)||at>=end(target))throw new AppError('INVALID_SPLIT');clips=clips.flatMap((x,i)=>{if(!targets.has(x.id)||at<=B(x.sequenceStartUs)||at>=end(x))return [x];const right=x.id===target.id?c.rightId:`${commandId}:split:${i}`;descendants.set(x.id,[x.id,right]);return [bound(x,B(x.sequenceStartUs),at),bound(x,at,end(x),right)];});}
    else if(c.type==='TrimClip'){const start=B(target.sequenceStartUs)+B(c.sourceInUs)-B(target.sourceInUs),finish=start+B(c.durationUs);if(start<0n)throw new AppError('INVALID_TIMING');clips=clips.map(x=>{if(!targets.has(x.id))return x;if(x.id===target.id)return {...x,sourceInUs:c.sourceInUs,durationUs:c.durationUs,sequenceStartUs:start.toString()};const si=B(x.sourceInUs)+start-B(x.sequenceStartUs);if(si<0n)throw new AppError('INVALID_TIMING');return {...x,sourceInUs:si.toString(),durationUs:c.durationUs,sequenceStartUs:start.toString()};});}
    else if(c.type==='MoveClip'){const delta=B(c.atUs)-B(target.sequenceStartUs);clips=clips.map(x=>{if(!targets.has(x.id))return x;const start=B(x.sequenceStartUs)+delta;if(start<0n)throw new AppError('INVALID_TIMING');return {...x,sequenceStartUs:start.toString()};});}
    else if(c.type==='DuplicateClip'){assertUnlocked(d,[{trackId:c.trackId} as ProjectClip]);const {syncGroupId,...copy}=target;clips.push({...copy,id:c.newId,sequenceStartUs:c.atUs,trackId:c.trackId});}
    else if(c.type==='RemoveClip'){for(const id of targets)descendants.set(id,[]);clips=clips.filter(x=>!targets.has(x.id));}
    else if(c.type==='SetTransform')clips=clips.map(x=>x.id===target.id?{...x,transform:c.transform}:x);
    else if(c.type==='SetAudio')clips=clips.map(x=>x.id===target.id?{...x,audio:c.audio}:x);
    else if(c.type==='SetTransition')clips=clips.map(x=>x.id===target.id?{...x,transitionUs:c.durationUs}:x);
    else throw new AppError('INVALID_COMMAND');
  } else throw new AppError('CLIP_NOT_FOUND');
  d.editLinkGroups=d.editLinkGroups!.map(g=>({...g,clipIds:g.clipIds.flatMap(id=>descendants.get(id)??[id])})).filter(g=>g.clipIds.length>1);
  return {...d,assetRefs:refs,sequence:{...d.sequence,clips:clips.sort((a,b)=>Number(B(a.sequenceStartUs)-B(b.sequenceStartUs)))}};
}
