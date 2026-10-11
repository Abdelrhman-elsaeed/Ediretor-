import {useEffect,useState} from 'react';
import type {Job} from '../../../../../packages/contracts/src/project';
import {api} from '../../infrastructure/api';
import {Dialog} from '../../ui/dialog';
import {Icon} from '../../ui/icon';
import {stages,errorText} from '../../ui/errors';
import {downloadCaptions} from '../../application/caption-download';
import type {ProjectSession} from '../../application/project-session';

export default function ExportDialog({session,onClose}: {session:ProjectSession;onClose:()=>void}) {
  const [job,setJob]=useState<Job>(),[busy,setBusy]=useState(false),[error,setError]=useState('');
  useEffect(()=>{
    if(!job || !['queued','running'].includes(job.status))return;
    let alive=true;const timer=setInterval(()=>{void api.job(job.id).then(next=>{if(alive)setJob(next);}).catch(e=>{if(alive)setError(errorText(e));});},600);
    return ()=>{alive=false;clearInterval(timer);};
  },[job?.id,job?.status]);
  async function start() {
    setBusy(true);setError('');
    try {await session.flush();const project=session.snapshot().project;setJob(await api.export(project.id,project.revisionId));} catch(e){setError(errorText(e));}finally{setBusy(false);}
  }
  async function subtitles(format:'srt'|'vtt'){
    setBusy(true);setError('');try{await downloadCaptions(session,format);}catch(e){setError(errorText(e));}finally{setBusy(false);}
  }
  return <Dialog title="نسخة جاهزة للمشاركة" onClose={onClose}><div className="export-profile"><Icon name="film" size={32}/><div><strong>فيديو MP4</strong><span className="mono" dir="ltr">1080p · 30 fps · H.264 / AAC</span></div></div><p className="muted">نصدّر إصدارًا محفوظًا. يمكنك متابعة التحرير أثناء تجهيز الملف.</p><p className="profile-limit">المتاح حاليًا: قص يدوي حتى 10 دقائق و200 مقطع. دعم الفيديو الطويل و4K لم يُعتمد بعد.</p>
    <p className="profile-limit">{session.snapshot().state.document.captionStyle?.enabled?'الكابشن الظاهرة في المعاينة ستُدمج في الفيديو.':'الكابشن غير مدمجة. فعّلها من أداة الكابشن لعرضها في الفيديو.'}</p><div className="subtitle-downloads"><button className="button small" disabled={busy} onClick={()=>{void subtitles('srt');}}>تنزيل SRT</button><button className="button small" disabled={busy} onClick={()=>{void subtitles('vtt');}}>تنزيل VTT</button></div>
    {!job ? <div className="export-revision"><span>الإصدار الحالي</span><bdi className="mono" dir="ltr">{session.snapshot().project.revisionId.slice(0,8)}</bdi></div> : <div className="processing" role="status"><strong>{stages[job.stage]??job.stage}</strong><progress max={1} value={job.stage==='encoding' || job.status==='succeeded' ? job.progress : undefined}/><span>{job.status==='running' && job.stage==='encoding' ? `${Math.round(job.progress*100)}%` : job.status==='succeeded' ? 'اجتاز الملف فحص المدة والإطارات وفك الترميز.' : 'يمكنك إغلاق هذه النافذة ومتابعة حالة التصدير في المشروع.'}</span><bdi className="mono" dir="ltr">{job.result?.revisionId?.slice(0,8)}</bdi></div>}
    {error || job?.error ? <p className="error" role="alert">{error || errorText(job?.error)}</p> : null}
    <div className="dialog-actions"><button className="button" onClick={onClose}>إغلاق</button>{job?.status==='succeeded' ? <a className="button primary" href={`/api/jobs/${job.id}/download`} download><Icon name="download"/>تنزيل الفيديو</a> : job && ['queued','running'].includes(job.status) ? <button className="button" onClick={()=>{void api.cancel(job.id).then(setJob).catch(e=>setError(errorText(e)));}}>إلغاء التصدير</button> : job ? <button className="button primary" onClick={()=>{setError('');void api.retry(job.id).then(setJob).catch(e=>setError(errorText(e)));}}>إعادة تصدير نفس الإصدار</button> : <button className="button primary" disabled={busy} onClick={()=>{void start();}}><Icon name="download"/>{busy?'حفظ الإصدار…':'بدء التصدير'}</button>}</div>
  </Dialog>;
}
