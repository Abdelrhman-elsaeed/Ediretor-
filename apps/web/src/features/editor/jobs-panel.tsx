import type {Job} from '../../../../../packages/contracts/src/project';
import {Icon} from '../../ui/icon';
import {errorText,stages} from '../../ui/errors';

const kinds={import:'استيراد الفيديو',export:'تصدير الفيديو',transcription:'تفريغ الكلام'};
export function JobsPanel({jobs,onCancel,onRetry}:{jobs:Job[];onCancel:(id:string)=>void;onRetry:(id:string)=>void}){
  return <section className="jobs-panel" aria-label="عمليات المشروع">{jobs.length?jobs.map(job=><article className={`job-row job-${job.status}`} key={job.id}><div className="job-heading"><strong>{kinds[job.kind]}</strong><span>{job.status==='succeeded'?'مكتمل':stages[job.stage]??job.stage}</span></div>{job.error?<p className="error">{errorText(job.error)}</p>:null}{['queued','running'].includes(job.status)?<><progress max={1} value={job.progress}/><button className="text-button" onClick={()=>onCancel(job.id)}>إلغاء العملية</button></>:job.status==='succeeded'?job.kind==='export'&&job.result?.output?<a className="button small" href={`/api/jobs/${job.id}/download`} download><Icon name="download" size={16}/>تنزيل الفيديو</a>:null:<button className="button small" onClick={()=>onRetry(job.id)}>إعادة المحاولة</button>}</article>):<div className="tool-empty"><Icon name="activity" size={32}/><h3>كل شيء جاهز</h3><p>تظهر هنا عمليات الاستيراد والتفريغ والتصدير.</p></div>}</section>;
}
