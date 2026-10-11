import {lazy,Suspense,useDeferredValue,useEffect,useState} from 'react';
import type {Project,ProjectSummary} from '../../../../../packages/contracts/src/project';
import {api} from '../../infrastructure/api';
import {Icon} from '../../ui/icon';
import {errorText} from '../../ui/errors';
import {formatTime} from '../editor/time';
const ImportDialog = lazy(()=>import('../import/import-dialog'));
export default function Library({onOpen}: {onOpen:(project:Project,assetId?:string)=>void}) {
  const [items,setItems] = useState<ProjectSummary[]>([]), [search,setSearch] = useState(''), query = useDeferredValue(search), [loading,setLoading] = useState(true), [error,setError] = useState(''), [more,setMore] = useState(false), [creating,setCreating] = useState(false), [refresh,setRefresh] = useState(0);
  useEffect(() => {
    let alive = true; setLoading(true);setError('');
    void api.list(query).then(result=>{if (alive) {setItems(result.items);setMore(result.more);}}).catch(e=>{if(alive)setError(errorText(e));}).finally(()=>{if(alive)setLoading(false);});
    return ()=>{alive=false;};
  },[query,refresh]);
  return <main id="main" className="library">
    <div className="library-title"><div><span className="muted">مساحة عملك المحلية</span><h1>هنا يبدأ درسك القادم.</h1><p>اجمع تسجيلك، رتّب أفكارك، واترك للدرس مساحة أوضح.</p></div><button className="button primary" onClick={()=>setCreating(true)}><Icon name="plus"/>مشروع جديد</button></div>
    <div className="library-toolbar"><h2>المشاريع <span className="count">{items.length}{more ? '+' : ''}</span></h2><label className="search"><Icon name="search"/><input name="search" aria-label="البحث في المشاريع" value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث عن مشروع…" autoComplete="off"/></label><span className="muted">الأحدث أولًا</span></div>
    {loading ? <div className="loading-state" role="status">جارٍ فتح المكتبة…</div> : error ? <div className="empty-state"><Icon name="info" size={36}/><p role="alert">{error}</p><button className="button" onClick={()=>setRefresh(v=>v+1)}>إعادة المحاولة</button></div> : !items.length ? <div className="empty-state"><div className="empty-film"><Icon name="film" size={48}/></div><h2>{query ? 'لا توجد مشاريع بهذا الاسم' : 'أول درس، مساحة مفتوحة.'}</h2><p>{query ? 'جرّب كلمات أخرى للبحث.' : 'ابدأ بتسجيل من جهازك. كل قصّة قابلة للتراجع، وكل مصدر يبقى كما هو.'}</p>{!query ? <button className="button primary" onClick={()=>setCreating(true)}><Icon name="upload"/>استيراد أول فيديو</button> : null}</div> :
      <div className="project-list"><div className="project-list-heading"><span>المشروع</span><span>المدة</span><span>المصادر</span><span>آخر تعديل</span><span/></div>{items.map(item=><a className="project-row" key={item.id} href={`?project=${item.id}`} onClick={e=>{if(e.ctrlKey || e.metaKey || e.button!==0)return;e.preventDefault();void api.load(item.id).then(p=>onOpen(p)).catch(e=>setError(errorText(e)));}}>
        <span className="project-identity">{item.thumbnail ? <img src={`/api/projects/${item.id}/thumbnail`} width={144} height={81} alt="" loading="lazy" onError={e=>{e.currentTarget.style.visibility='hidden';}}/> : <span className="thumbnail-empty"><Icon name="film" size={28}/></span>}<span><strong>{item.name}</strong><small>{item.clipCount ? `${item.clipCount} مقطع · إصدار محفوظ` : 'جاهز لإضافة الفيديو'}</small></span></span><bdi className="mono" dir="ltr">{formatTime(BigInt(item.durationUs))}</bdi><span>{new Intl.NumberFormat('ar').format(item.assetCount)} مصدر</span><span className="muted">{new Intl.DateTimeFormat('ar-EG',{dateStyle:'medium',timeStyle:'short'}).format(new Date(item.updatedAt))}</span><Icon name="arrow"/>
      </a>)}{more ? <button className="button load-more" onClick={()=>{setLoading(true);void api.list(query,items.length).then(next=>{setItems(old=>[...old,...next.items]);setMore(next.more);}).catch(e=>setError(errorText(e))).finally(()=>setLoading(false));}}>عرض المزيد</button> : null}</div>}
    <footer className="library-footer"><span><Icon name="folder" size={16}/>المشاريع والمصادر محفوظة على هذا الجهاز</span><span>القص اليدوي، خطوة بخطوة.</span></footer>
    {creating ? <Suspense fallback={<div role="status" className="loading-overlay">جارٍ فتح الاستيراد…</div>}><ImportDialog onClose={()=>{setCreating(false);setRefresh(v=>v+1);}} onComplete={onOpen}/></Suspense> : null}
  </main>;
}
