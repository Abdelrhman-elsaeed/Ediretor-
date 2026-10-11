import {lazy,Suspense,useEffect,useRef,useState,useSyncExternalStore,type CSSProperties} from 'react';
import {type Edit,type Job,type Project} from '../../../../../packages/contracts/src/project';
import {ProjectSession} from '../../application/project-session';
import {downloadCaptions} from '../../application/caption-download';
import {api} from '../../infrastructure/api';
import {Icon} from '../../ui/icon';
import {errorText} from '../../ui/errors';
import {Preview} from './preview';
import {Timeline} from './timeline';
import {Inspector} from './inspector';
import {Playback} from './playback';
import {snapUs} from './time';
import {ToolSidebar,editorTools,type EditorTool} from './tool-sidebar';
import {SyncPanel} from './sync-panel';
import {LayoutPanel} from './layout-panel';
import {MediaPanel} from './media-panel';
import {JobsPanel} from './jobs-panel';
import {ResizeHandle} from './resize-handle';
const ImportDialog=lazy(()=>import('../import/import-dialog'));
const ExportDialog=lazy(()=>import('./export-dialog'));
const TranscriptPanel=lazy(()=>import('../transcript/transcript-panel'));
const CaptionsPanel=lazy(()=>import('../transcript/captions-panel'));

function initialLayout(){
  try{const layout=JSON.parse(localStorage.getItem('ediretor-layout-v1')??'{}') as {panel?:unknown;timeline?:unknown};return {panel:typeof layout.panel==='number'&&Number.isFinite(layout.panel)?Math.max(280,Math.min(520,layout.panel)):360,timeline:typeof layout.timeline==='number'&&Number.isFinite(layout.timeline)?Math.max(180,Math.min(360,layout.timeline)):216};}catch{return {panel:360,timeline:216};}
}

export default function Editor({project,initialAsset,onBack}: {project:Project;initialAsset?:string;onBack:()=>void}) {
  const [session]=useState(()=>new ProjectSession(project)), [playback]=useState(()=>new Playback()), view=useSyncExternalStore(session.subscribe,session.snapshot);
  const [selected,setSelected]=useState(''),[error,setError]=useState(''),[importing,setImporting]=useState(false),[exporting,setExporting]=useState(false),[jobs,setJobs]=useState<Job[]>([]),[activeTool,setActiveTool]=useState<EditorTool|null>('media'),[layout,setLayout]=useState(initialLayout);
  const initialized=useRef(false),[recoverySaved,setRecoverySaved]=useState(false);
  const clips=view.state.document.sequence.clips, clip=clips.find(c=>c.id===selected);
  useEffect(()=>{try{localStorage.setItem('ediretor-layout-v1',JSON.stringify(layout));}catch{}},[layout]);
  const edit=(commands:Edit[])=>{try{session.edit(commands);setError('');return true;}catch(e){setError(errorText(e));return false;}};
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
      try{const next=await api.jobs(project.id);if(!alive)return;setJobs(old=>JSON.stringify(old)===JSON.stringify(next)?old:next);const completed=next.filter(j=>['import','transcription'].includes(j.kind) && j.status==='succeeded' && !refreshed.has(j.id));if(completed.length){await session.refreshAssets();for(const job of completed)refreshed.add(job.id);}}catch(e){if(alive)setError(errorText(e));}
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
    const target=(clip && atUs>BigInt(clip.sequenceStartUs)&&atUs<BigInt(clip.sequenceStartUs)+BigInt(clip.durationUs)?clip:undefined)??clips.find(c=>atUs>BigInt(c.sequenceStartUs) && atUs<BigInt(c.sequenceStartUs)+BigInt(c.durationUs));
    if(!target){setError(errorText('INVALID_SPLIT'));return;}
    edit([{type:'SplitClip',clipId:target.id,atUs:atUs.toString(),rightId:crypto.randomUUID()}]);setSelected(target.id);
  };
  const remove=()=>{if(!clip)return;edit(view.state.document.schemaVersion===3&&view.state.document.sequence.tracks.find(t=>t.id===clip.trackId)?.kind==='supporting'?[{type:'RemoveClip',clipId:clip.id}]:[{type:'RippleDeleteRange',startUs:clip.sequenceStartUs,endUs:(BigInt(clip.sequenceStartUs)+BigInt(clip.durationUs)).toString(),...(view.state.document.schemaVersion===3?{clipIds:[clip.id]}:{})}]);};
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
  const allError=error || (view.error ? errorText(view.error) : ''), pending=jobs.filter(j=>['queued','running'].includes(j.status)).length;
  const title=editorTools.find(t=>t.id===activeTool)?.label;
  async function refresh(){await session.refreshAssets();setJobs(await api.jobs(project.id));}
  async function jobAction(id:string,action:'cancel'|'retry'){try{await api[action](id);await refresh();}catch(e){setError(errorText(e));}}
  return <main className={`editor ${activeTool?'tool-open':''}`} id="main" style={{'--tool-width':`${layout.panel}px`,'--timeline-height':`${layout.timeline}px`} as CSSProperties}><header className="editor-topbar"><a href="/" className="back-link" aria-label="العودة إلى المشاريع" onClick={e=>{e.preventDefault();void session.flush().then(onBack).catch(()=>{});}}><Icon name="folder"/></a><div className="project-title"><h1>{project.name}</h1></div><span className={`save-state ${view.error?'failed':view.dirty?'pending':'saved'}`} role="status"><Icon name={view.dirty?'save':'check'} size={15}/>{view.saving?'جارٍ الحفظ…':view.error?'لم تُحفظ التغييرات':view.dirty?'تغييرات غير محفوظة':'محفوظ على الجهاز'}</span>
    <div className="editor-top-actions"><button className="icon-button" aria-label="تراجع" title="تراجع · Ctrl+Z" disabled={view.state.cursor===0 || view.error==='REVISION_CONFLICT'} onClick={()=>{try{session.undo();}catch(e){setError(errorText(e));}}}><Icon name="undo"/></button><button className="icon-button" aria-label="إعادة" title="إعادة · Ctrl+Shift+Z" disabled={view.state.cursor>=view.state.history.length-1 || view.error==='REVISION_CONFLICT'} onClick={()=>{try{session.redo();}catch(e){setError(errorText(e));}}}><Icon name="redo"/></button><span className="action-rule"/><button className="button small save-button" onClick={()=>{void session.flush().catch(()=>{});}} disabled={view.saving || !view.dirty}><Icon name="save" size={17}/>حفظ</button><button className="button primary small" onClick={()=>setExporting(true)} disabled={!clips.length}><Icon name="download" size={17}/>تصدير</button></div>
  </header>
  {allError ? <div className="editor-alert" role="alert"><span>{allError}</span>{view.dirty ? <button className="text-button" onClick={recovery}>تنزيل نسخة الاسترداد</button>:null}{view.error==='REVISION_CONFLICT' ? <button className="text-button" disabled={!recoverySaved} onClick={()=>{void session.reload().then(()=>{setRecoverySaved(false);setError('');}).catch(e=>setError(errorText(e)));}}>فتح الإصدار المحفوظ</button> : <button className="text-button" onClick={()=>{setError('');void session.flush().catch(()=>{});}}>إعادة المحاولة</button>}</div> : view.recovered ? <div className="recovery-banner" role="status">استُعيدت تغييرات جلسة سابقة. راجعها ثم احفظها.<button className="text-button" onClick={()=>{void session.flush().catch(()=>{});}}>حفظ التغييرات</button></div> : null}
  <div className="editor-body"><ToolSidebar active={activeTool} onChange={setActiveTool} pending={pending}/><div className="editor-canvas"><div className="editor-workspace">
    {activeTool?<><div className="editor-tool-panel" id="editor-tool-panel"><div className="panel-heading"><h2>{title}</h2><button className="icon-button" aria-label={activeTool==='transcript'?'إغلاق النص':'إغلاق لوحة الأداة'} title="إغلاق لوحة الأداة" onClick={()=>setActiveTool(null)}><Icon name="close" size={18}/></button></div><div className="tool-panel-content">
      {activeTool==='media'?<MediaPanel document={view.state.document} onEdit={edit} playhead={()=>playback.currentUs} project={view.project} onImport={()=>setImporting(true)} onInsert={assetId=>{const clipId=crypto.randomUUID();edit([{type:'InsertClip',assetId,clipId}]);setSelected(clipId);}}/>:null}
      {activeTool==='transcript'?<Suspense fallback={<div className="tool-empty" role="status">جارٍ فتح النص…</div>}><TranscriptPanel project={view.project} document={view.state.document} playback={playback} jobs={jobs} onEdit={edit} onRefresh={refresh}/></Suspense>:null}
      {activeTool==='captions'?<Suspense fallback={<div className="tool-empty" role="status">جارٍ فتح الكابشن…</div>}><CaptionsPanel document={view.state.document} transcripts={view.project.transcripts??[]} onEdit={edit} onTranscript={()=>setActiveTool('transcript')} onDownload={format=>downloadCaptions(session,format)}/></Suspense>:null}
      {activeTool==='inspector'?<Inspector onEdit={edit} document={view.state.document} clip={clip} onError={e=>setError(errorText(e))} onDelete={remove} onTrim={(start,duration)=>{if(clip)edit([{type:'TrimClip',clipId:clip.id,sourceInUs:start.toString(),durationUs:duration.toString()}]);}}/>:null}
      {activeTool==='sync'?<SyncPanel project={view.project} document={view.state.document} onEdit={edit}/>:null}
      {activeTool==='layout'?<LayoutPanel document={view.state.document} playback={playback} onEdit={edit}/>:null}
      {activeTool==='jobs'?<JobsPanel jobs={jobs} onCancel={id=>{void jobAction(id,'cancel');}} onRetry={id=>{void jobAction(id,'retry');}}/>:null}
    </div></div><ResizeHandle axis="panel" value={layout.panel} min={280} max={520} onChange={panel=>setLayout(old=>({...old,panel}))} onReset={()=>setLayout(old=>({...old,panel:360}))}/></>:null}
    <Preview playback={playback} document={view.state.document} transcripts={view.project.transcripts}/></div>
    <ResizeHandle axis="timeline" value={layout.timeline} min={180} max={360} onChange={timeline=>setLayout(old=>({...old,timeline}))} onReset={()=>setLayout(old=>({...old,timeline:216}))}/>
    <Timeline onEdit={edit} document={view.state.document} playback={playback} selected={selected} onSelect={id=>{setSelected(id);if(activeTool!=='transcript')setActiveTool('inspector');}} onSplit={split} onDelete={remove}/>
  </div></div>
  {importing ? <Suspense fallback={<div role="status">جارٍ فتح الاستيراد…</div>}><ImportDialog project={view.project} onClose={()=>setImporting(false)} onComplete={(next,assetId)=>{setImporting(false);void session.refreshAssets().then(()=>{if(assetId&&!clips.length)edit([{type:'InsertClip',assetId,clipId:crypto.randomUUID()}]);}).catch(e=>setError(errorText(e)));}}/></Suspense> : null}
  {exporting ? <Suspense fallback={<div role="status">جارٍ فتح التصدير…</div>}><ExportDialog session={session} onClose={()=>setExporting(false)}/></Suspense> : null}
  </main>;
}
