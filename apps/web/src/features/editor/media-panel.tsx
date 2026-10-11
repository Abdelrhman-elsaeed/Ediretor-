import type {Project,ProjectDocument,Edit} from '../../../../../packages/contracts/src/project';
import {Icon} from '../../ui/icon';
import {formatTime} from './time';
type Role='camera'|'screen'|'primary-audio'|'supporting'|'combined';
export function MediaPanel({project,document,onEdit,playhead,onImport,onInsert}:{project:Project;document:ProjectDocument;onEdit:(edits:Edit[])=>boolean;playhead:()=>bigint;onImport:()=>void;onInsert:(assetId:string)=>void}){
  return <section className="media-panel" aria-label="وسائط المشروع"><div className="media-panel-actions"><span>{project.assets.length} مصدر</span><button className="button small" onClick={onImport}><Icon name="plus" size={16}/>استيراد مصدر</button></div>
    <div className="media-list">{project.assets.map(asset=>{
      const role=document.sourceRoles?.find(r=>r.assetId===asset.id)?.role??(asset.mediaKind==='audio'?'primary-audio':asset.mediaKind==='image'?'supporting':'camera');
      return <article className="media-item" key={asset.id}><img src={`/api/assets/${project.id}/${asset.id}/thumbnail`} width={240} height={135} alt={`صورة من ${asset.name}`} loading="lazy"/><strong><bdi dir="ltr">{asset.name}</bdi></strong><div className="media-metadata"><span className="mono" dir="ltr">{formatTime(BigInt(asset.durationUs))}</span><span>{asset.mediaKind==='image'?'صورة':asset.mediaKind==='audio'?'صوت':asset.hasAudio?'فيديو وصوت':'فيديو بلا صوت'}</span></div>
        <label className="field">دور المصدر<select aria-label={`دور ${asset.id}`} value={role} onChange={e=>{onEdit([{type:'SetSourceRole',assetId:asset.id,role:e.target.value as Role}]);}}><option value="camera">كاميرا</option><option value="screen">شاشة</option><option value="primary-audio">صوت أساسي</option><option value="supporting">B-roll / صورة / موسيقى</option><option value="combined">كاميرا وشاشة مدمجتان</option></select></label>
        {role==='combined'?<p className="panel-note">مصدر واحد مدمج؛ يمكن اقتصاصه من الخصائص.</p>:null}
        <button className="button small full" onClick={()=>{const trackId=crypto.randomUUID();onEdit([{type:'SetSourceRole',assetId:asset.id,role},{type:'AddTrack',track:{id:trackId,kind:asset.mediaKind==='audio'?'audio':role==='supporting'?'supporting':'video',name:asset.name}},{type:'InsertMedia',assetId:asset.id,clipId:crypto.randomUUID(),trackId,atUs:playhead().toString(),sourceInUs:'0',durationUs:asset.durationUs}]);}}>إضافة كمسار مستقل</button>
        <button disabled={asset.mediaKind==='audio'} className="button small full" onClick={()=>onInsert(asset.id)}><Icon name="plus" size={15}/>إضافة إلى الخط الزمني</button>
      </article>;
    })}{!project.assets.length?<div className="tool-empty"><Icon name="upload" size={32}/><h3>أضف تسجيلك الأول</h3><p>اختر فيديو لبدء التحرير.</p><button className="button primary small" onClick={onImport}>اختيار فيديو</button></div>:null}</div><p className="panel-note">مصادرك الأصلية محفوظة. القص لا يغيّر ملفاتك. أضف الأجزاء المستقلة متتابعة، والتسجيلات المتزامنة على مسارات مستقلة ثم اربطها بأداة المزامنة.</p>
  </section>;
}
