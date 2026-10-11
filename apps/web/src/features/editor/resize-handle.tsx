import {useRef} from 'react';

export function ResizeHandle({axis,value,min,max,onChange,onReset}:{axis:'panel'|'timeline';value:number;min:number;max:number;onChange:(value:number)=>void;onReset:()=>void}){
  const drag=useRef<{position:number;value:number}|null>(null);
  const change=(next:number)=>onChange(Math.round(Math.max(min,Math.min(max,next))));
  return <div className={`resize-handle resize-${axis}`} role="separator" tabIndex={0} aria-label={axis==='panel'?'عرض لوحة الأداة':'ارتفاع الخط الزمني'} aria-orientation={axis==='panel'?'vertical':'horizontal'} aria-valuemin={min} aria-valuemax={max} aria-valuenow={value}
    onPointerDown={e=>{if(e.button!==0)return;e.preventDefault();drag.current={position:axis==='panel'?e.clientX:e.clientY,value};e.currentTarget.setPointerCapture(e.pointerId);}}
    onPointerMove={e=>{if(drag.current)change(drag.current.value+drag.current.position-(axis==='panel'?e.clientX:e.clientY));}}
    onPointerUp={e=>{drag.current=null;e.currentTarget.releasePointerCapture(e.pointerId);}} onLostPointerCapture={()=>{drag.current=null;}}
    onDoubleClick={onReset} onKeyDown={e=>{const delta=axis==='panel'?(e.key==='ArrowLeft'?16:e.key==='ArrowRight'?-16:0):(e.key==='ArrowUp'?16:e.key==='ArrowDown'?-16:0);if(delta||e.key==='Home'||e.key==='End'){e.preventDefault();e.stopPropagation();change(e.key==='Home'?min:e.key==='End'?max:value+delta);}}}><span/></div>;
}
