import type {KeyboardEvent} from 'react';
import {Icon,type IconName} from '../../ui/icon';

export interface SelectionAction {id:string;label:string;shortLabel?:string;icon:IconName;disabled?:boolean;danger?:boolean;run:()=>void;}

/** Context actions share the current selection; new commands add an action
 * descriptor without adding controls between transcript words. */
export function SelectionToolbar({count,actions,onClear}:{count:number;actions:readonly SelectionAction[];onClear:()=>void}){
  function keys(e:KeyboardEvent<HTMLDivElement>){
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();onClear();}
    else if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){
      e.preventDefault();e.stopPropagation();
      const buttons=[...e.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')],at=buttons.indexOf(e.target as HTMLButtonElement),next=e.key==='Home'?0:e.key==='End'?buttons.length-1:(at+(e.key==='ArrowLeft'?1:-1)+buttons.length)%buttons.length;
      buttons[next]?.focus();
    }
  }
  return <div className="transcript-floating-toolbar" role="toolbar" aria-label="أوامر الكلمات المحددة" data-selection-count={count} onKeyDown={keys}>
    <span className="selection-count" role="status">{count.toLocaleString('ar-EG')} كلمة</span><span className="selection-action-rule"/>
    {actions.map(action=><button key={action.id} className={`selection-command ${action.danger?'danger':''}`} title={action.label} aria-label={action.label} disabled={action.disabled} onClick={action.run}><Icon name={action.icon} size={16}/><span>{action.shortLabel??action.label}</span></button>)}
    <button className="icon-button selection-clear" aria-label="مسح التحديد" title="مسح التحديد · Esc" onClick={onClear}><Icon name="close" size={16}/></button>
  </div>;
}
