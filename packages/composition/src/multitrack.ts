import type {ProjectDocument,ProjectClip} from '../../contracts/src/project';

export const defaultTransform={cropX:0,cropY:0,cropWidth:1,cropHeight:1,x:0,y:0,width:1,height:1};
export const defaultAudio={gain:1,fadeInUs:'0',fadeOutUs:'0',ducking:false,duckGain:.25};
export function activeClips(d:ProjectDocument,us:bigint){return d.sequence.clips.filter(c=>us>=BigInt(c.sequenceStartUs)&&us<BigInt(c.sequenceStartUs)+BigInt(c.durationUs));}
export function visualLayers(d:ProjectDocument,us:bigint){
  const events=(d.layouts??[]).filter(l=>BigInt(l.atUs)<=us),mode=events.at(-1)?.mode??'custom';
  const role=(c:ProjectClip)=>d.sourceRoles?.find(r=>r.assetId===c.assetId)?.role;
  const layers=d.sequence.tracks.flatMap(t=>t.hidden||t.kind==='audio'||t.kind==='linked-audio'?[]:activeClips(d,us).filter(c=>c.trackId===t.id&&d.assetRefs.find(a=>a.id===c.assetId)?.mediaKind!=='audio').flatMap(c=>{
    let transform={...defaultTransform,...c.transform};const r=role(c);
    if(mode==='screen'&&r==='camera'||mode==='camera'&&r==='screen')return [];
    if(mode==='pip'&&r==='camera')transform={...transform,x:.72,y:.69,width:.25,height:.28};
    if(mode==='split'&&(r==='screen'||r==='camera'))transform={...transform,x:r==='screen'?0:.5,y:0,width:.5,height:1};
    if((mode==='screen'&&r==='screen')||(mode==='camera'&&r==='camera'))transform={...transform,x:0,y:0,width:1,height:1};
    const local=us-BigInt(c.sequenceStartUs),length=BigInt(c.durationUs),fade=BigInt(c.transitionUs??'0');
    const opacity=fade===0n?1:Math.min(1,Number(local)/Number(fade),Number(length-local)/Number(fade));
    return [{clip:c,transform,opacity}];
  }));
  if(mode==='pip')layers.sort((a,b)=>{const rank=(c:ProjectClip)=>role(c)==='screen'?0:role(c)==='camera'?1:2;return rank(a.clip)-rank(b.clip);});
  return layers;
}
export function audioAllowed(d:ProjectDocument,c:ProjectClip){
  if(!d.assetRefs.find(a=>a.id===c.assetId)?.hasAudio||d.sequence.tracks.find(t=>t.id===c.trackId)?.muted||d.sequence.tracks.find(t=>t.id==='sound')?.muted)return false;
  const g=d.syncGroups?.find(g=>g.id===c.syncGroupId);
  return !g || g.primaryAssetId===c.assetId;
}
export function primaryActive(d:ProjectDocument,us:bigint){return activeClips(d,us).some(c=>audioAllowed(d,c)&&((c.syncGroupId&&d.syncGroups?.find(g=>g.id===c.syncGroupId)?.primaryAssetId===c.assetId)||d.sourceRoles?.find(r=>r.assetId===c.assetId)?.role==='primary-audio'));}
export function audioGain(d:ProjectDocument,c:ProjectClip,us:bigint){
  if(!audioAllowed(d,c))return 0;const a={...defaultAudio,...c.audio},local=Number(us-BigInt(c.sequenceStartUs)),duration=Number(c.durationUs);
  if(local<0||local>=duration)return 0;
  return a.gain*Math.min(1,Number(a.fadeInUs)>0?local/Number(a.fadeInUs):1,Number(a.fadeOutUs)>0?(duration-local)/Number(a.fadeOutUs):1)*(a.ducking&&primaryActive(d,us)?a.duckGain:1);
}
/** Sparse boundaries for native spans: fixed source mappings and layout per interval. */
export function compositionBoundaries(d:ProjectDocument){const points=new Set<bigint>([0n]);for(const c of d.sequence.clips){points.add(BigInt(c.sequenceStartUs));points.add(BigInt(c.sequenceStartUs)+BigInt(c.durationUs));}for(const l of d.layouts??[])points.add(BigInt(l.atUs));return [...points].sort((a,b)=>a<b?-1:a>b?1:0);}
