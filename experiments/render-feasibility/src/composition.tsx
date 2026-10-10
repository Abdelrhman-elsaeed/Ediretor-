import React, {useEffect, useMemo, useState} from 'react';
import {AbsoluteFill, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame, delayRender, continueRender, cancelRender} from 'remotion';
import {compile, type Snapshot} from './contract';

export type CompositionProps = {snapshot: Snapshot; graphicsOnly?: boolean};
function Font({file}: {file: string}) {
  const [handle] = useState(()=>delayRender('Pinned Arabic font'));
  useEffect(()=>{
    const font = new FontFace('PhaseArabic', `url(${staticFile(file)})`);
    font.load().then(f=>{document.fonts.add(f); continueRender(handle);}).catch(cancelRender);
  },[file,handle]);
  return null;
}
export function Graphics({snapshot}: CompositionProps) {
  const frame = useCurrentFrame();
  const plan = useMemo(()=>compile(snapshot),[snapshot]);
  const active = plan.graphics.filter(g=>frame>=g.from && frame<g.to);
  const font = snapshot.assets.find(a=>a.kind==='font');
  return <AbsoluteFill style={{fontFamily:'PhaseArabic', direction:'ltr', pointerEvents:'none'}}>
    {font && <Font file={font.file}/>}
    {active.map(g=>{
      const image = snapshot.assets.find(a=>a.id===g.imageAssetId);
      const progress = Math.min(1,(frame-g.from)/15);
      return <div key={g.id} style={{position:'absolute',left:'8%',right:'8%',bottom:'10%',borderRadius:24,padding:32,background:'#10243bef',color:'white',opacity:progress,transform:`translateY(${(1-progress)*40}px)`,display:'flex',alignItems:'center',gap:30}}>
        {image && <Img src={staticFile(image.file)} style={{width:snapshot.width*.07,height:snapshot.width*.07}}/>}
        <div dir="rtl" style={{fontSize:snapshot.width*.035,flex:1,textAlign:'right'}}>{g.text}</div>
        <div style={{width:12,height:snapshot.height*.08,background:'#62e2b5',transform:`scaleY(${progress})`}}/>
      </div>;
    })}
  </AbsoluteFill>;
}
export function FeasibilityComposition({snapshot,graphicsOnly=false}: CompositionProps) {
  const frame = useCurrentFrame();
  const plan = useMemo(()=>compile(snapshot),[snapshot]);
  const clip = plan.clips.find(c=>frame>=c.from && frame<c.to);
  const inset = plan.layouts.some(l=>l.mode==='inset' && frame>=l.from && frame<l.to);
  const asset = clip && snapshot.assets.find(a=>a.id===clip.assetId);
  return <AbsoluteFill style={{backgroundColor:graphicsOnly?'transparent':'#071320'}}>
    {!graphicsOnly && clip && asset && <Sequence from={clip.from} durationInFrames={clip.to-clip.from}>
      <OffthreadVideo src={staticFile(asset.file)} startFrom={clip.sourceFrame} style={{position:'absolute',width:inset?'80%':'100%',height:inset?'80%':'100%',left:inset?'10%':0,top:inset?'5%':0,objectFit:'contain'}}/>
    </Sequence>}
    <Graphics snapshot={snapshot}/>
  </AbsoluteFill>;
}
