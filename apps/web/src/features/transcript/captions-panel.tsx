import type {Edit,ProjectDocument} from '../../../../../packages/contracts/src/project';
import {defaultCaptionStyle,type Transcript} from '../../../../../packages/contracts/src/transcript';
import {useMemo,useState} from 'react';
import {captionCues} from '../../../../../packages/composition/src/captions';
import {Icon} from '../../ui/icon';
import {errorText} from '../../ui/errors';

export default function CaptionsPanel({document,transcripts,onEdit,onTranscript,onDownload}:{document:ProjectDocument;transcripts:readonly Transcript[];onEdit:(edits:Edit[])=>boolean;onTranscript:()=>void;onDownload:(format:'srt'|'vtt')=>Promise<void>}){
  const [busy,setBusy]=useState(false),[downloadError,setDownloadError]=useState('');
  const ready=!!document.transcriptRefs?.length,{cues,error}=useMemo(()=>{try{return {cues:ready?captionCues(document,transcripts):[],error:''};}catch(e){return {cues:[],error:errorText(e)};}},[ready,document,transcripts]);
  async function download(format:'srt'|'vtt'){
    setBusy(true);setDownloadError('');try{await onDownload(format);}catch(e){setDownloadError(errorText(e));}finally{setBusy(false);}
  }
  return <section className="captions-panel">{!ready?<div className="tool-empty"><Icon name="captions" size={32}/><h3>حوّل الكلام إلى كابشن</h3><p>فرّغ الكلام أولًا، ثم فعّل ظهوره على الفيديو.</p><button className="button primary small" onClick={onTranscript}>فتح تحرير النص</button></div>:<><label className="caption-switch"><span><strong>الكابشن على الفيديو</strong><small>يظهر في المعاينة وفي الفيديو المصدّر.</small></span><input type="checkbox" aria-label="إظهار الكابشن ودمجه في الفيديو" checked={document.captionStyle?.enabled??false} onChange={e=>onEdit([{type:'SetCaptionStyle',style:{...defaultCaptionStyle,enabled:e.target.checked}}])}/></label>{error||downloadError?<p className="error" role="alert">{error||downloadError}</p>:null}<div className="caption-example" dir="auto">{cues[0]?.lines.join(' ')??'أضف مصدرًا إلى الخط الزمني لعرض الكابشن.'}</div><div className="caption-download"><h3>تنزيل ملف الترجمة</h3><p>يتبع النص المصحّح وتوقيت المشروع بعد القص.</p><div className="subtitle-downloads">{(['srt','vtt'] as const).map(format=><button key={format} className="button small" disabled={busy||!cues.length} onClick={()=>{void download(format);}}><Icon name="download" size={16}/>تنزيل {format.toUpperCase()}</button>)}</div></div></>}</section>;
}
