import {Component,lazy,Suspense,useEffect,useState,type ReactNode} from 'react';
import {createRoot} from 'react-dom/client';
import type {Project} from '../../../packages/contracts/src/project';
import {api} from './infrastructure/api';
import {Icon} from './ui/icon';
import {errorText} from './ui/errors';
import './styles.css';
const Library=lazy(()=>import('./features/library/library'));
const Editor=lazy(()=>import('./features/editor/editor'));
class ErrorBoundary extends Component<{children:ReactNode},{failed:boolean}> {
  state={failed:false};static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(error:Error){console.error(error);}
  render(){return this.state.failed ? <div className="empty-state" role="alert"><h1>تعذر فتح مساحة العمل</h1><p>تغييرات الاسترداد محفوظة في المتصفح إن كانت الكتابة متاحة.</p><button className="button" onClick={()=>location.reload()}>إعادة فتح التطبيق</button></div> : this.props.children;}
}
function App() {
  const [theme,setTheme]=useState(()=>document.documentElement.dataset.theme==='dark'?'dark':'light'),[project,setProject]=useState<Project>(),[initialAsset,setInitialAsset]=useState<string>(),[loading,setLoading]=useState(true),[error,setError]=useState(''),[health,setHealth]=useState(true);
  useEffect(()=>{document.documentElement.dataset.theme=theme;document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='dark'?'#171716':'#F3EEE4');try{localStorage.setItem('ediretor-theme',theme);}catch{}},[theme]);
  useEffect(()=>{
    let alive=true;const id=new URLSearchParams(location.search).get('project');
    void Promise.all([id ? api.load(id) : Promise.resolve(undefined),api.health()]).then(([project,health])=>{if(alive){setProject(project);setHealth(health.mediaTools);}}).catch(e=>{if(alive)setError(errorText(e));}).finally(()=>{if(alive)setLoading(false);});
    return ()=>{alive=false;};
  },[]);
  function open(next:Project,assetId?:string){history.pushState({},'',`?project=${next.id}`);setInitialAsset(assetId);setProject(next);setError('');}
  function back(){history.pushState({},'','/');setProject(undefined);setInitialAsset(undefined);}
  // History navigation reloads through the persisted session; beforeunload protects pending edits.
  useEffect(()=>{const pop=()=>location.reload();window.addEventListener('popstate',pop);return ()=>window.removeEventListener('popstate',pop);},[]);
  return <><a className="skip-link" href="#main">تجاوز إلى مساحة العمل</a><header className="app-header"><a href="/" className="brand" translate="no" aria-label="Ediretor — المشاريع"><span className="brand-mark" aria-hidden="true"><i/><i/><i/></span><span dir="ltr">Ediretor<span className="brand-version">2</span></span></a><span className="workspace-label">استوديو الدروس</span><div className="header-end"><span className="local-status"><span/>مساحة محلية</span><button className="icon-button theme-button" aria-label={theme==='light'?'تفعيل المظهر الداكن':'تفعيل المظهر الفاتح'} onClick={()=>setTheme(t=>t==='light'?'dark':'light')}><Icon name={theme==='light'?'moon':'sun'}/></button></div></header>
  {!health?<div className="editor-alert" role="alert">{errorText('MEDIA_TOOLS_UNAVAILABLE')}</div>:null}
  {loading ? <main id="main" className="loading-state" role="status">جارٍ فتح مساحة العمل…</main> : error ? <main id="main" className="empty-state"><p role="alert">{error}</p><a className="button" href="/">العودة إلى المكتبة</a><button className="button" onClick={()=>location.reload()}>إعادة المحاولة</button></main> : <ErrorBoundary><Suspense fallback={<main id="main" className="loading-state" role="status">جارٍ فتح مساحة العمل…</main>}>{project ? <Editor key={project.id} project={project} initialAsset={initialAsset} onBack={back}/> : <Library onOpen={open}/>}</Suspense></ErrorBoundary>}</>;
}
createRoot(document.getElementById('root')!).render(<App/>);
