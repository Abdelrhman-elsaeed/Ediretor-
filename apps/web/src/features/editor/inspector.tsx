import {ClipProperties} from './clip-properties';
import type {Edit,ProjectDocument,ProjectClip} from '../../../../../packages/contracts/src/project';
import {Icon} from '../../ui/icon';
import {formatTime,inputUs,snapUs} from './time';

export function Inspector({document,clip,onEdit,onTrim,onDelete,onError}: {document:ProjectDocument;clip?:ProjectClip;onEdit:(edits:Edit[])=>boolean;onTrim:(start:bigint,duration:bigint)=>void;onDelete:()=>void;onError:(error:string)=>void}) {
  const asset=document.assetRefs.find(a=>a.id===clip?.assetId);
  return <aside className="inspector">{clip && asset ? <div className="inspector-body" key={`${clip.id}:${clip.sourceInUs}:${clip.durationUs}`}><span className="section-label">المصدر</span><strong className="asset-name"><bdi dir="ltr">{asset.name}</bdi></strong><dl><div><dt>بداية في المشروع</dt><dd className="mono" dir="ltr">{formatTime(BigInt(clip.sequenceStartUs),true)}</dd></div><div><dt>الدقة الأصلية</dt><dd className="mono" dir="ltr">{asset.width} × {asset.height}</dd></div><div><dt>الصوت</dt><dd>{asset.hasAudio?'مرتبط بالفيديو':'المصدر بلا صوت'}</dd></div></dl>
      <form className="trim-form" onSubmit={e=>{e.preventDefault();const data=new FormData(e.currentTarget),start=inputUs(String(data.get('sourceIn'))),duration=inputUs(String(data.get('duration')));if(start===null || duration===null || duration<=0n){onError('INVALID_TIMING');return;}onTrim(snapUs(Number(start)),snapUs(Number(duration)));}}>
        <span className="section-label">نطاق المصدر</span><label className="field">بداية المصدر · ثوانٍ<input className="mono" dir="ltr" name="sourceIn" inputMode="decimal" defaultValue={(Number(clip.sourceInUs)/1_000_000).toFixed(6)} autoComplete="off"/></label><label className="field">مدة المقطع · ثوانٍ<input className="mono" dir="ltr" name="duration" inputMode="decimal" defaultValue={(Number(clip.durationUs)/1_000_000).toFixed(6)} autoComplete="off"/></label><button className="button full" type="submit"><Icon name="cut" size={16}/>تطبيق القص</button>
      </form><ClipProperties document={document} clip={clip} onEdit={onEdit}/><p className="inspector-note">تتحرك المقاطع التالية لإغلاق الفراغ. يمكنك التراجع عن التغيير.</p><button className="text-button danger" onClick={onDelete}><Icon name="trash" size={16}/>حذف المقطع</button>
    </div> : <div className="inspector-empty"><Icon name="settings" size={28}/><p>حدد مقطعًا من الخط الزمني لتعديل نطاقه.</p></div>}</aside>;
}
