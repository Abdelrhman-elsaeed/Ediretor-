import React,{useRef} from 'react';
import {createRoot} from 'react-dom/client';
import {Player,type PlayerRef} from '@remotion/player';
import snapshots from '../generated/snapshots.json';
import {parseSnapshot,compile} from './contract';
import {FeasibilityComposition} from './composition';
const params=new URLSearchParams(location.search);
const snapshot=parseSnapshot(snapshots.find(s=>s.fixture===(params.get('fixture')??'real')));
declare global {interface Window {phase00?:{seek:(frame:number)=>void;frame:()=>number;play:()=>void;pause:()=>void}}}
function Preview(){
  const player=useRef<PlayerRef>(null);
  const testMode=params.has('validation');
  React.useEffect(()=>{window.phase00={seek:f=>player.current?.seekTo(f),frame:()=>player.current?.getCurrentFrame()??-1,play:()=>player.current?.play(),pause:()=>player.current?.pause()};},[]);
  return <main style={{maxWidth:testMode?'none':1100,margin:'auto',padding:testMode?0:24}}>
    {!testMode&&<><h1>Ediretor — تجربة Phase 00</h1><p>معاينة نسخة ثابتة: {snapshot.revisionId} · {snapshot.synthetic?'عينة اصطناعية':'تصوير حقيقي مع صوت علامات مولد'}</p><nav style={{display:'flex',gap:20,marginBottom:20}}>{snapshots.map(s=><a style={{color:'#62e2b5'}} key={s.fixture} href={`?fixture=${s.fixture}`}>{s.fixture}</a>)}</nav></>}
    <div id="preview-frame" style={{width:testMode?snapshot.width:'100%'}}><Player ref={player} component={FeasibilityComposition} inputProps={{snapshot}} durationInFrames={compile(snapshot).durationInFrames} compositionWidth={snapshot.width} compositionHeight={snapshot.height} fps={snapshot.fps.num/snapshot.fps.den} controls={!testMode} style={{width:'100%'}}/></div>
  </main>;
}
const target=document.getElementById('root');if(!target)throw new Error('ROOT_MISSING');createRoot(target).render(<Preview/>);
