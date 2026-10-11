import {useEffect,useRef,useState} from 'react';
import type {ProjectDocument} from '../../../../../packages/contracts/src/project';
import {Icon} from '../../ui/icon';
import {errorText} from '../../ui/errors';
import {formatTime} from './time';
import type {Playback} from './playback';
import type {Transcript} from '../../../../../packages/contracts/src/transcript';
import {CaptionPreview} from '../transcript/caption-preview';

function Transport({playback}: {playback:Playback}) {
  const [view,setView]=useState({us:playback.currentUs,playing:playback.playing,error:playback.error});
  useEffect(()=>{
    let last=0;
    return playback.subscribe(()=>{const now=performance.now();if(now-last>100 || !playback.playing || playback.playing!==view.playing || playback.error!==view.error){last=now;setView({us:playback.currentUs,playing:playback.playing,error:playback.error});}});
  },[playback,view.playing,view.error]);
  return <><div className="transport" dir="ltr">
    <span className="timecode mono" aria-label="وقت التشغيل">{formatTime(view.us,true)}</span><span className="muted mono">/ {formatTime(playback.durationUs,true)}</span>
    <div className="transport-buttons"><button className="icon-button" aria-label="الرجوع ثانية" onClick={()=>playback.seek(playback.currentUs-1_000_000n)}><Icon name="undo" size={18}/></button><button className="play-button" aria-label={view.playing?'إيقاف مؤقت':'تشغيل'} onClick={()=>playback.toggle()} disabled={!playback.durationUs}><Icon name={view.playing?'pause':'play'}/></button><button className="icon-button" aria-label="التقدم ثانية" onClick={()=>playback.seek(playback.currentUs+1_000_000n)}><Icon name="redo" size={18}/></button></div><span className="transport-hint" dir="rtl">المسافة للتشغيل</span>
  </div>{view.error ? <p className="error preview-error" role="alert">{errorText(view.error)} <button className="text-button" onClick={()=>{playback.seek(playback.currentUs);}}>إعادة تحميل المعاينة</button></p> : null}</>;
}
export function Preview({playback,document,transcripts=[]}: {playback:Playback;document:ProjectDocument;transcripts?:readonly Transcript[]}) {
  const video=useRef<HTMLVideoElement>(null), [safe,setSafe]=useState(false);
  useEffect(()=>{if(video.current)return playback.attach(video.current);},[playback]);
  useEffect(()=>playback.update(document),[playback,document]);
  return <section className="preview-panel" aria-label="معاينة الفيديو"><div className="panel-heading"><h2>المعاينة</h2><div className="preview-options"><span className="mono" dir="ltr">1920 × 1080</span><button className={`text-button ${safe?'active':''}`} onClick={()=>setSafe(v=>!v)} aria-pressed={safe}>حدود الأمان</button></div></div>
    <div className="preview-stage"><div className="video-frame"><video ref={video} preload="metadata" playsInline aria-label="معاينة تسجيل المشروع"/>{document.captionStyle?.enabled?<CaptionPreview document={document} transcripts={transcripts} playback={playback}/>:null}{safe && document.sequence.clips.length ? <div className="safe-area" aria-hidden="true"/> : null}{!document.sequence.clips.length ? <div className="preview-empty"><Icon name="film" size={40}/><h3>مساحة لقصتك</h3><p>أضف مصدرًا من لوحة الوسائط لبدء التحرير.</p></div> : null}</div></div><Transport playback={playback}/>
  </section>;
}
