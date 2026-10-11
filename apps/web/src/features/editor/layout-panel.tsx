import {useEffect,useState} from 'react';
import type {Edit,ProjectDocument} from '../../../../../packages/contracts/src/project';
import type {Playback} from './playback';
import {formatTime} from './time';
export function LayoutPanel({document,playback,onEdit}:{document:ProjectDocument;playback:Playback;onEdit:(edits:Edit[])=>boolean}){
  const [us,setUs]=useState(playback.currentUs);useEffect(()=>playback.subscribe(()=>{if(!playback.playing)setUs(playback.currentUs);}),[playback]);
  return <section className="settings-panel"><p className="panel-note">ضع مؤشر التشغيل ثم اختر توزيعًا. تبقى المزامنة والصوت مستقلين عن توزيع الصورة.</p><strong dir="ltr">{formatTime(us,true)}</strong><div className="layout-presets">{(['pip','split','screen','camera','custom'] as const).map((mode,i)=><button className="button" key={mode} onClick={()=>onEdit([{type:'SetLayout',layout:{id:document.layouts?.find(l=>l.atUs===us.toString())?.id??crypto.randomUUID(),atUs:us.toString(),mode}}])}>{['شاشة مع كاميرا PiP','شاشة وكاميرا جنبًا إلى جنب','الشاشة كاملة','الكاميرا كاملة','مواضع مخصصة'][i]}</button>)}</div>
    <p className="panel-note">الاقتصاص والتكبير والموضع في خصائص المقطع المحدد. أضف B-roll أو صورة كمسار مستقل من الوسائط.</p>
    {(document.layouts??[]).map(l=><div className="layout-event" key={l.id}><button className="text-button" onClick={()=>playback.seek(BigInt(l.atUs))}><bdi>{Number(l.atUs)/1e6}s · {l.mode}</bdi></button>{l.needsReview?<><span className="error">راجع حدثًا حُذف توقيته</span><button className="text-button" onClick={()=>onEdit([{type:'SetLayout',layout:{...l,needsReview:false}}])}>تثبيت هنا</button></>:null}<button className="text-button danger" onClick={()=>onEdit([{type:'RemoveLayout',layoutId:l.id}])}>حذف</button></div>)}
  </section>;
}
