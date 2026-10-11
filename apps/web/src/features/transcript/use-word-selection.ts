import {useEffect,useMemo,useRef,useState,type PointerEvent,type KeyboardEvent,type RefObject} from 'react';

interface WordKey {key:string;}
interface Drag {pointer:number;anchor:number;end:number;x:number;y:number;startX:number;startY:number;moved:boolean;previous:Set<string>;}

/** Logical word indices, not screen x order, own a range (including RTL and
 * virtual rows). Pointer geometry only identifies its endpoint. */
export function useWordSelection(words:readonly WordKey[],viewport:RefObject<HTMLDivElement|null>,selection:Set<string>,setSelection:(keys:Set<string>)=>void,onSeek:(key:string)=>void){
  const indices=useMemo(()=>new Map(words.map((w,i)=>[w.key,i])),[words]);
  const drag=useRef<Drag|null>(null),anchor=useRef<number|null>(null),frame=useRef(0),[selecting,setSelecting]=useState(false);
  function range(a:number,b:number){setSelection(new Set(words.slice(Math.min(a,b),Math.max(a,b)+1).map(w=>w.key)));}
  function stop(){cancelAnimationFrame(frame.current);frame.current=0;drag.current=null;setSelecting(false);}
  function clear(){stop();anchor.current=null;setSelection(new Set());}
  useEffect(()=>()=>{cancelAnimationFrame(frame.current);drag.current=null;},[indices]);
  useEffect(()=>{anchor.current=null;setSelecting(false);},[indices]);
  function endpoint(x:number,y:number){
    const el=viewport.current;if(!el)return;const bounds=el.getBoundingClientRect();
    const px=Math.max(bounds.left+2,Math.min(bounds.right-2,x)),py=Math.max(bounds.top+2,Math.min(bounds.bottom-2,y));
    const hit=window.document.elementFromPoint(px,py)?.closest<HTMLElement>('[data-word-key]');
    if(hit&&el.contains(hit))return indices.get(hit.dataset.wordKey!);
    // Whitespace between words/lines and edge scrolling still select a whole word.
    let closest:string|undefined,best=Infinity;
    for(const word of el.querySelectorAll<HTMLElement>('[data-word-key]')){
      const r=word.getBoundingClientRect();if(r.bottom<bounds.top||r.top>bounds.bottom)continue;
      const dy=Math.max(r.top-py,py-r.bottom,0),dx=Math.max(r.left-px,px-r.right,0),score=dy*dy*16+dx*dx;
      if(score<best){best=score;closest=word.dataset.wordKey;}
    }
    return closest?indices.get(closest):undefined;
  }
  function updateEndpoint(){const d=drag.current;if(!d)return;const end=endpoint(d.x,d.y);if(end!==undefined&&end!==d.end){d.end=end;d.moved=true;range(d.anchor,end);}}
  function scrollEdge(){
    const d=drag.current,el=viewport.current;if(!d||!el)return;
    const r=el.getBoundingClientRect(),edge=28;
    const delta=d.y<r.top+edge?-Math.min(18,(r.top+edge-d.y)/2):d.y>r.bottom-edge?Math.min(18,(d.y-r.bottom+edge)/2):0;
    if(delta&&d.moved){el.scrollTop+=delta;updateEndpoint();}
    frame.current=requestAnimationFrame(scrollEdge);
  }
  function onPointerDown(e:PointerEvent<HTMLDivElement>){
    if(!e.isPrimary||e.button!==0)return;
    const word=e.target instanceof Element?e.target.closest<HTMLElement>('[data-word-key]'):null,index=word?indices.get(word.dataset.wordKey!):undefined;
    if(index===undefined)return;
    e.preventDefault();word?.querySelector<HTMLButtonElement>('button')?.focus({preventScroll:true});
    const begin=e.shiftKey&&anchor.current!==null?anchor.current:index;
    drag.current={pointer:e.pointerId,anchor:begin,end:index,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:e.shiftKey,previous:selection};
    anchor.current=begin;range(begin,index);setSelecting(true);e.currentTarget.setPointerCapture(e.pointerId);frame.current=requestAnimationFrame(scrollEdge);
  }
  function onPointerMove(e:PointerEvent<HTMLDivElement>){
    const d=drag.current;if(!d||e.pointerId!==d.pointer)return;d.x=e.clientX;d.y=e.clientY;
    if(Math.hypot(d.x-d.startX,d.y-d.startY)>3)d.moved=true;updateEndpoint();
  }
  function onPointerUp(e:PointerEvent<HTMLDivElement>){
    const d=drag.current;if(!d||e.pointerId!==d.pointer)return;d.x=e.clientX;d.y=e.clientY;updateEndpoint();const seek=!d.moved?words[d.end]?.key:undefined;stop();
    if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);if(seek)onSeek(seek);
  }
  function onPointerCancel(){const previous=drag.current?.previous;stop();if(previous)setSelection(previous);}
  function selectKey(key:string,shift=false){const index=indices.get(key);if(index===undefined)return;const begin=shift&&anchor.current!==null?anchor.current:index;anchor.current=begin;range(begin,index);if(!shift)onSeek(key);}
  function onKeyDown(e:KeyboardEvent<HTMLDivElement>){
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();clear();}
    else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='a'){e.preventDefault();e.stopPropagation();if(words.length){anchor.current=0;range(0,words.length-1);}}
    else if(e.shiftKey&&['ArrowLeft','ArrowRight'].includes(e.key)){
      const word=e.target instanceof Element?e.target.closest<HTMLElement>('[data-word-key]'):null,index=word?indices.get(word.dataset.wordKey!):undefined;
      if(index===undefined)return;e.preventDefault();e.stopPropagation();const rtl=getComputedStyle(word!.parentElement!).direction==='rtl',forward=e.key===(rtl?'ArrowLeft':'ArrowRight');
      const next=Math.max(0,Math.min(words.length-1,index+(forward?1:-1)));selectKey(words[next]!.key,true);
      viewport.current?.querySelector<HTMLButtonElement>(`[data-word-key="${CSS.escape(words[next]!.key)}"] button`)?.focus({preventScroll:true});
    }
  }
  return {selecting,clear,selectKey,onPointerDown,onPointerMove,onPointerUp,onPointerCancel,onLostPointerCapture:()=>{if(drag.current)stop();},onKeyDown};
}
