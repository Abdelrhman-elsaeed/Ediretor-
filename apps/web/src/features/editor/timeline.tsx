import {useEffect,useRef,useState} from 'react';
import {MultitrackTimeline} from './multitrack-timeline';
import type {Edit,ProjectDocument} from '../../../../../packages/contracts/src/project';
import {Icon} from '../../ui/icon';
import {durationUs} from '../../../../../packages/domain/src/project/kernel';
import {formatTime,snapUs} from './time';
import type {Playback} from './playback';

export function Timeline({document,playback,selected,onSelect,onEdit,onSplit,onDelete}: {document:ProjectDocument;playback:Playback;selected:string;onEdit:(edits:Edit[])=>boolean;onSelect:(id:string)=>void;onSplit:()=>void;onDelete:()=>void}) {
  const length=durationUs(document), span=Number(length || 1n), marker=useRef<HTMLDivElement>(null), seeker=useRef<HTMLInputElement>(null), [zoom,setZoom]=useState(1);
  useEffect(()=>{
    const update=()=>{if(marker.current)marker.current.style.left=`calc((100% - 56px) * ${Number(playback.currentUs)/span})`;if(seeker.current)seeker.current.value=String(playback.currentUs);};
    update();return playback.subscribe(update);
  },[playback,span]);
  if(document.schemaVersion===3)return <MultitrackTimeline document={document} playback={playback} selected={selected} onSelect={onSelect} onEdit={onEdit} onSplit={onSplit} onDelete={onDelete}/>;
  const ticks=Array.from({length:11},(_,i)=>BigInt(Math.round(span*i/10)));
  return <section className="timeline" aria-label="الخط الزمني"><div className="timeline-toolbar"><div><h2>الخط الزمني</h2><span className="muted">الوقت من اليسار إلى اليمين</span></div><div className="timeline-actions"><button className="button small" onClick={onSplit} disabled={!selected}><Icon name="cut" size={16}/>تقسيم <kbd>S</kbd></button><button className="icon-button" aria-label="حذف المقطع المحدد مع إغلاق الفراغ" onClick={onDelete} disabled={!selected}><Icon name="trash" size={18}/></button><label className="zoom-label">تكبير<input aria-label="تكبير الخط الزمني" type="range" min={1} max={8} step={1} value={zoom} onChange={e=>setZoom(Number(e.target.value))}/></label></div></div>
    <div className="timeline-layout" dir="ltr"><div className="track-headers" dir="rtl"><div className="ruler-space">المسارات</div><div><Icon name="film" size={16}/><span>الفيديو</span><small>V1</small></div><div><Icon name="sound" size={16}/><span>صوت المصدر</span><small>A1</small></div></div>
    <div className="timeline-scroll"><div className="timeline-content" style={{width:`${zoom*100}%`}}>
      <div className="ruler">{ticks.map((us,i)=><span key={i} style={{left:`${i*10}%`}} className="mono">{formatTime(us)}</span>)}</div>
      <input ref={seeker} className="timeline-seeker" type="range" aria-label="مؤشر التشغيل بالميكروثانية" min={0} max={span} step={33333} defaultValue={Number(playback.currentUs)} onChange={e=>playback.seek(snapUs(Number(e.target.value)))}/>
      <div className="video-track">{document.sequence.clips.map(clip=>{
        const asset=document.assetRefs.find(a=>a.id===clip.assetId);
        return <button key={clip.id} className={`timeline-clip ${selected===clip.id?'selected':''}`} style={{left:`${Number(clip.sequenceStartUs)/span*100}%`,width:`${Number(clip.durationUs)/span*100}%`}} title={asset?.name} onClick={()=>{onSelect(clip.id);playback.seek(BigInt(clip.sequenceStartUs));}} aria-label={`مقطع ${asset?.name} من ${formatTime(BigInt(clip.sequenceStartUs))}`} aria-pressed={selected===clip.id}>
          <span className="clip-cap"><Icon name="film" size={14}/><bdi>{asset?.name}</bdi></span><span className="mono clip-length">{formatTime(BigInt(clip.durationUs),true)}</span><span className="clip-edge start"/><span className="clip-edge end"/>
        </button>;
      })}{!document.sequence.clips.length ? <span className="track-empty" dir="rtl">أضف فيديو من لوحة الوسائط</span> : null}</div>
      <div className="audio-track">{document.sequence.clips.map(clip=>{const hasAudio=document.assetRefs.find(a=>a.id===clip.assetId)?.hasAudio;return <div key={clip.id} className={`audio-clip ${hasAudio?'':'silent'}`} style={{left:`${Number(clip.sequenceStartUs)/span*100}%`,width:`${Number(clip.durationUs)/span*100}%`}}><Icon name="sound" size={14}/><span dir="rtl">{hasAudio?'مرتبط بالفيديو':'مصدر بلا صوت'}</span></div>;})}</div>
      <div className="playhead" ref={marker} aria-hidden="true"><i/></div>
    </div></div></div><div className="timeline-footer"><span>{document.sequence.clips.length} مقطع</span><span>القص غير متلف · الصوت يتبع الفيديو</span><bdi className="mono" dir="ltr">{formatTime(length,true)} · 30 fps</bdi></div>
  </section>;
}
