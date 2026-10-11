import {useEffect,useRef,type ReactNode} from 'react';
import {Icon} from './icon';
export function Dialog({title,children,onClose}: {title:string;children:ReactNode;onClose:()=>void}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {const element = ref.current; const previous = document.activeElement; element?.showModal(); return () => {element?.close(); if (previous instanceof HTMLElement) previous.focus();};},[]);
  return <dialog ref={ref} aria-labelledby="dialog-title" onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if (e.target === e.currentTarget) {const box = e.currentTarget.getBoundingClientRect(); if (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom) onClose();}}}>
    <div className="dialog-heading"><h2 id="dialog-title">{title}</h2><button className="icon-button" aria-label="إغلاق" onClick={onClose}><Icon name="close"/></button></div>{children}
  </dialog>;
}
