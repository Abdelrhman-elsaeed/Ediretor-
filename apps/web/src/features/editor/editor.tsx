import {lazy,Suspense,useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {AppError,type Edit,type Job,type Project} from '../../../../../packages/contracts/src/project';
import {ProjectSession} from '../../application/project-session';
import {api} from '../../infrastructure/api';
import {Icon} from '../../ui/icon';
import {errorText,stages} from '../../ui/errors';
import {Preview} from './preview';
import {Timeline} from './timeline';
import {Inspector} from './inspector';
import {Playback} from './playback';
import {formatTime,snapUs} from './time';
const ImportDialog=lazy(()=>import('../import/import-dialog'));
const ExportDialog=lazy(()=>import('./export-dialog'));

export default function Editor({project,initialAsset,onBack}: {project:Project;initialAsset?:string;onBack:()=>void}) {
  const [session]=useState(()=>new ProjectSession(project)), [playback]=useState(()=>new Playback()), view=useSyncExternalStore(session.subscribe,session.snapshot);
  const [selected,setSelected]=useState(''),[error,setError]=useState(''),[importing,setImporting]=useState(false),[exporting,setExporting]=useState(false),[jobs,setJobs]=useState<Job[]>([]),[showInspector,setShowInspector]=useState(false);
  const initialized=useRef(false),[recoverySaved,setRecoverySaved]=useState(false);
  const clips=view.state.document.sequence.clips, clip=clips.find(c=>c.id===selected);
  const edit=(commands:Edit[])=>{try{session.edit(commands);setError('');}catch(e){setError(errorText(e));}};
  useEffect(()=>{
    if(!initialized.current){initialized.current=true;if(initialAsset && !session.snapshot().state.document.sequence.clips.length){session.edit([{type:'InsertClip',assetId:initialAsset,clipId:crypto.randomUUID()}]);}}
    return ()=>session.dispose();
  },[session,initialAsset]);
  useEffect(()=>{
    if(selected && !clips.some(c=>c.id===selected))setSelected('');
  },[clips,selected]);
  useEffect(()=>{
    let alive=true;let timer:ReturnType<typeof setTimeout>;const refreshed=new Set<string>();
    const poll=async()=>{
      try{const next=await api.jobs(project.id);if(!alive)return;setJobs(old=>JSON.stringify(old)===JSON.stringify(next)?old:next);const completed=next.filter(j=>j.kind==='import' && j.status==='succeeded' && !refreshed.has(j.id));if(completed.length){await session.refreshAssets();for(const job of completed)refreshed.add(job.id);}}catch(e){if(alive)setError(errorText(e));}
      if(alive)timer=setTimeout(()=>{void poll();},1500);
    };
    void poll();return ()=>{alive=false;clearTimeout(timer);};
  },[project.id,session]);
  useEffect(()=>{
    const guard=(e:BeforeUnloadEvent)=>{if(session.snapshot().dirty){e.preventDefault();e.returnValue='';}};
    window.addEventListener('beforeunload',guard);return ()=>window.removeEventListener('beforeunload',guard);
  },[session]);
  const split=()=>{
    const atUs=snapUs(Number(playback.currentUs));
    const target=clips.find(c=>atUs>BigInt(c.sequenceStartUs) && atUs<BigInt(c.sequenceStartUs)+BigInt(c.durationUs));
    if(!target){setError(errorText('INVALID_SPLIT'));return;}
    edit([{type:'SplitClip',clipId:target.id,atUs:atUs.toString(),rightId:crypto.randomUUID()}]);setSelected(target.id);
  };
  const remove=()=>{if(!clip)return;edit([{type:'RippleDeleteRange',startUs:clip.sequenceStartUs,endUs:(BigInt(clip.sequenceStartUs)+BigInt(clip.durationUs)).toString()}]);};
  useEffect(()=>{
    const key=(e:KeyboardEvent)=>{
      if(e.target instanceof Element && e.target.closest('dialog'))return;
      if((e.ctrlKey || e.metaKey) && e.key.toLowerCase()==='s'){e.preventDefault();void session.flush().catch(()=>{});return;}
      if(e.target instanceof Element && e.target.closest('input,textarea,select,[contenteditable]'))return;
      try {
        if((e.ctrlKey || e.metaKey) && e.key.toLowerCase()==='z'){e.preventDefault();if(e.shiftKey)session.redo();else session.undo();}
        else if((e.ctrlKey || e.metaKey) && e.key.toLowerCase()==='y'){e.preventDefault();session.redo();}
        else if(e.code==='Space' && !(e.target instanceof Element && e.target.closest('button,a'))){e.preventDefault();playback.toggle();}
        else if(e.key==='ArrowLeft'){e.preventDefault();playback.seek(playback.currentUs-1_000_000n);}
        else if(e.key==='ArrowRight'){e.preventDefault();playback.seek(playback.currentUs+1_000_000n);}
        else if(e.key.toLowerCase()==='s'){e.preventDefault();split();}
        else if(e.key==='Delete' || e.key==='Backspace'){e.preventDefault();remove();}
      }catch(error){setError(errorText(error));}
    };
    window.addEventListener('keydown',key);return ()=>window.removeEventListener('keydown',key);
  },[session,playback,clips,clip]);
  function recovery() {
    const url=URL.createObjectURL(session.recoveryFile()),a=document.createElement('a');a.href=url;a.download=`ediretor-recovery-${project.id}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setRecoverySaved(true);
  }
  const allError=error || (view.error ? errorText(view.error) : ''), activeJobs=jobs.filter(j=>j.status!=='succeeded' || j.kind==='export').slice(0,5);
  return <main className={`editor ${showInspector?'show-inspector':''}`} id="main"><header className="editor-topbar"><a href="/" className="back-link" aria-label="العودة إلى المشاريع" onClick={e=>{e.preventDefault();void session.flush().then(onBack).catch(()=>{});}}><Icon name="folder"/></a><div className="project-title"><h1>{project.name}</h1><span className="revision mono" dir="ltr">rev {view.project.revisionId.slice(0,8)}</span></div><span className={`save-state ${view.error?'failed':view.dirty?'pending':'saved'}`} role="status"><Icon name={view.dirty?'save':'check'} size={15}/>{view.saving?'جارٍ الحفظ…':view.error?'لم تُحفظ التغييرات':view.dirty?'تغييرات غير محفوظة':'محفوظ على الجهاز'}</span>
    <div className="editor-top-actions"><button className="icon-button" aria-label="تراجع" title="تراجع · Ctrl+Z" disabled={view.state.cursor===0 || view.error==='REVISION_CONFLICT'} onClick={()=>{try{session.undo();}catch(e){setError(errorText(e));}}}><Icon name="undo"/></button><button className="icon-button" aria-label="إعادة" title="إعادة · Ctrl+Shift+Z" disabled={view.state.cursor>=view.state.history.length-1 || view.error==='REVISION_CONFLICT'} onClick={()=>{try{session.redo();}catch(e){setError(errorText(e));}}}><Icon name="redo"/></button><span className="action-rule"/><button className="button small save-button" onClick={()=>{void session.flush().catch(()=>{});}} disabled={view.saving || !view.dirty}><Icon name="save" size={17}/>حفظ</button><button className="button primary small" onClick={()=>setExporting(true)} disabled={!clips.length}><Icon name="download" size={17}/>تصدير</button></div>
  </header>
  {allError ? <div className="editor-alert" role="alert"><span>{allError}</span>{view.dirty ? <button className="text-button" onClick={recovery}>تنزيل نسخة الاسترداد</button>:null}{view.error==='REVISION_CONFLICT' ? <button className="text-button" disabled={!recoverySaved} onClick={()=>{void session.reload().then(()=>{setRecoverySaved(false);setError('');}).catch(e=>setError(errorText(e)));}}>فتح الإصدار المحفوظ</button> : <button className="text-button" onClick={()=>{setError('');void session.flush().catch(()=>{});}}>إعادة المحاولة</button>}</div> : view.recovered ? <div className="recovery-banner" role="status">استُعيدت تغييرات جلسة سابقة. راجعها ثم احفظها.<button className="text-button" onClick={()=>{void session.flush().catch(()=>{});}}>حفظ التغييرات</button></div> : null}
  <div className="editor-workspace"><aside className="media-panel"><div className="panel-heading"><h2>وسائط المشروع</h2><button className="icon-button" aria-label="استيراد مصدر" onClick={()=>setImporting(true)}><Icon name="plus" size={18}/></button></div><p className="media-intro">مصادرك الأصلية، دائمًا محفوظة.</p><div className="media-list">{view.project.assets.map(asset=><div className="media-item" key={asset.id}><img src={`/api/assets/${project.id}/${asset.id}/thumbnail`} width={240} height={135} alt={`صورة من ${asset.name}`} loading="lazy"/><strong><bdi dir="ltr">{asset.name}</bdi></strong><div className="media-metadata"><span className="mono" dir="ltr">{formatTime(BigInt(asset.durationUs))}</span><span>{asset.hasAudio?'فيديو وصوت':'فيديو بلا صوت'}</span></div><button className="button small full" onClick={()=>{const clipId=crypto.randomUUID();edit([{type:'InsertClip',assetId:asset.id,clipId}]);setSelected(clipId);}}><Icon name="plus" size={15}/>إضافة إلى الخط الزمني</button></div>)}{!view.project.assets.length ? <div className="media-empty"><Icon name="upload" size={30}/><p>أضف تسجيلك الأول</p><button className="button small" onClick={()=>setImporting(true)}>اختيار فيديو</button></div> : null}</div>
    {activeJobs.length ? <section className="jobs-panel"><h3>عمليات المشروع</h3>{activeJobs.map(job=><div className="job-row" key={job.id}><span>{job.kind==='export'?'تصدير':'استيراد'} · {stages[job.stage]??job.stage}</span>{job.result?.revisionId ? <bdi className="mono" dir="ltr">rev {job.result.revisionId.slice(0,8)}</bdi>:null}{job.error?<p className="error">{errorText(job.error)}</p>:null}{job.status==='running'?<progress max={1} value={['proxy','encoding'].includes(job.stage)?job.progress:undefined}/>:null}{job.status==='succeeded' && job.result?.output ? <a className="text-button" href={`/api/jobs/${job.id}/download`} download>تنزيل الفيديو</a> : ['queued','running'].includes(job.status)?<button className="text-button" onClick={()=>{void api.cancel(job.id).then(()=>api.jobs(project.id)).then(setJobs).catch(e=>setError(errorText(e)));}}>إلغاء</button> : <button className="text-button" onClick={()=>{void api.retry(job.id).then(()=>api.jobs(project.id)).then(setJobs).catch(e=>setError(errorText(e)));}}>إعادة المحاولة</button>}</div>)}</section>:null}
    <div className="media-footer"><Icon name="info" size={16}/><span>التحرير بالنص والقوالب والذكاء الاصطناعي يأتي في مراحل لاحقة.</span></div>
  </aside><Preview playback={playback} document={view.state.document}/><Inspector document={view.state.document} clip={clip} onError={e=>setError(errorText(e))} onDelete={remove} onTrim={(start,duration)=>{if(clip)edit([{type:'TrimClip',clipId:clip.id,sourceInUs:start.toString(),durationUs:duration.toString()}]);}}/></div>
  <button className="inspector-toggle text-button" onClick={()=>setShowInspector(v=>!v)} aria-expanded={showInspector}><Icon name="settings" size={16}/>{showInspector?'إخفاء الخصائص':'خصائص المقطع'}</button>
  <Timeline document={view.state.document} playback={playback} selected={selected} onSelect={setSelected} onSplit={split} onDelete={remove}/>
  {importing ? <Suspense fallback={<div role="status">جارٍ فتح الاستيراد…</div>}><ImportDialog project={view.project} onClose={()=>setImporting(false)} onComplete={(next,assetId)=>{setImporting(false);void session.refreshAssets().then(()=>{if(assetId)edit([{type:'InsertClip',assetId,clipId:crypto.randomUUID()}]);}).catch(e=>setError(errorText(e)));}}/></Suspense> : null}
  {exporting ? <Suspense fallback={<div role="status">جارٍ فتح التصدير…</div>}><ExportDialog session={session} onClose={()=>setExporting(false)}/></Suspense> : null}
  </main>;
}
