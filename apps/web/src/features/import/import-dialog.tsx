import {useEffect,useRef,useState} from 'react';
import type {Job,Project} from '../../../../../packages/contracts/src/project';
import {api,upload} from '../../infrastructure/api';
import {Dialog} from '../../ui/dialog';
import {Icon} from '../../ui/icon';
import {errorText,stages} from '../../ui/errors';

export default function ImportDialog({project,onClose,onComplete}: {project?:Project;onClose:()=>void;onComplete:(project:Project,assetId?:string)=>void}) {
  const [name,setName] = useState(''), [file,setFile] = useState<File>(), [job,setJob] = useState<Job>(), [error,setError] = useState(''), [busy,setBusy] = useState(false), [uploadProgress,setUploadProgress] = useState(0);
  const controller = useRef<AbortController | undefined>(undefined), currentProject = useRef(project), poll = useRef<ReturnType<typeof setTimeout> | undefined>(undefined), alive = useRef(true), cancelRequested = useRef(false);
  useEffect(() => () => {alive.current = false; clearTimeout(poll.current); controller.current?.abort();},[]);
  const watch = async (id: string) => {
    try {
      const next = await api.job(id); if (!alive.current) return; setJob(next);
      if (next.status === 'succeeded') {setBusy(false); const refreshed = await api.load(next.projectId); if (alive.current) onComplete(refreshed,next.result?.assetId);}
      else if (next.status === 'failed' || next.status === 'cancelled') {setBusy(false); setError(errorText(next.error ?? 'CANCELLED'));}
      else poll.current = setTimeout(()=>{void watch(id);},600);
    } catch (e) {if (alive.current) {setBusy(false);setError(errorText(e));}}
  };
  async function start() {
    if (!file || (!project && !name.trim())) return;
    setBusy(true);setError('');cancelRequested.current = false; controller.current = new AbortController();
    try {
      const created = currentProject.current ?? await api.create(name.trim()); currentProject.current = created;
      const accepted = await upload(created.id,file,controller.current.signal,setUploadProgress);
      if (cancelRequested.current) {await api.cancel(accepted.id);setBusy(false);return;}
      setJob(accepted);void watch(accepted.id);
    } catch (e) {if (alive.current) {setBusy(false);setError(errorText(e));}}
  }
  async function cancel() {
    cancelRequested.current = true; controller.current?.abort();
    try {if (job) setJob(await api.cancel(job.id));clearTimeout(poll.current);setBusy(false);setError(errorText('CANCELLED'));} catch (e) {setError(errorText(e));}
  }
  const choose = (chosen?: File) => {if (busy) return;setFile(chosen);setError('');setJob(undefined);setUploadProgress(0); if (chosen && !name) setName(chosen.name.replace(/\.[^.]+$/,''));};
  return <Dialog title={project ? 'إضافة مصدر إلى المشروع' : 'مساحة جديدة لدرس جديد'} onClose={()=>{if (!busy) onClose();}}>
    <form onSubmit={e=>{e.preventDefault();void start();}}>
      {!project ? <label className="field">اسم المشروع<input name="projectName" autoComplete="off" maxLength={120} value={name} onChange={e=>setName(e.target.value)} placeholder="مثال: مقدمة في TypeScript…" required disabled={busy}/></label> : null}
      <label className={`drop-zone ${busy ? 'is-busy' : ''}`} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();choose(e.dataTransfer.files[0]);}}>
        <Icon name="upload" size={32}/><strong>{file ? <bdi dir="ltr">{file.name}</bdi> : 'اسحب فيديوك إلى هنا'}</strong>
        <span>{file ? `${new Intl.NumberFormat('ar').format(file.size / 1024 / 1024)} MB` : 'أو اختر ملفًا من جهازك'}</span>
        <input type="file" name="video" aria-label="اختيار ملف فيديو" accept="video/*,audio/*,image/png,image/jpeg,image/webp,.mkv,.mov,.webm,.avi" disabled={busy} onChange={e=>choose(e.target.files?.[0])}/>
      </label>
      <p className="muted">يُحتفظ بالمصدر كما هو. نجهّز نسخة للمعاينة؛ القص لا يغيّر الملف الأصلي.</p>
      {busy || job ? <div className="processing" role="status" aria-live="polite"><strong>{job ? stages[job.stage] ?? job.stage : 'رفع الملف…'}</strong>
        <progress max={1} value={job?.stage === 'proxy' ? job.progress : !job ? uploadProgress : job.status === 'succeeded' ? 1 : undefined}/>
        <span>{job?.stage === 'proxy' ? `${Math.round(job.progress * 100)}% من نسخة المعاينة` : !job ? `${Math.round(uploadProgress * 100)}% من الملف` : 'يمكنك الرجوع للمشروع؛ تستمر المهمة محليًا.'}</span>
      </div> : null}
      {error ? <p className="error" role="alert">{error}</p> : null}
      <div className="dialog-actions">{busy ? <button type="button" className="button" onClick={()=>{void cancel();}}>إلغاء المعالجة</button> : <button type="button" className="button" onClick={onClose}>إغلاق</button>}
        {job && ['failed','cancelled'].includes(job.status) ? <button type="button" className="button primary" onClick={()=>{setBusy(true);setError('');void api.retry(job.id).then(next=>{setJob(next);void watch(next.id);}).catch(e=>{setBusy(false);setError(errorText(e));});}}>إعادة المحاولة</button> : <button type="submit" className="button primary" disabled={busy || !file || (!project && !name.trim())}><Icon name="film"/>{busy ? 'جارٍ التجهيز…' : 'استيراد الفيديو'}</button>}
      </div>
    </form>
  </Dialog>;
}
