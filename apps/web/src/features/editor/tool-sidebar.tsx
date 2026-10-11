import {Icon,type IconName} from '../../ui/icon';

// One catalog owns tool navigation. Add a tool here and its panel in Editor;
// visibility and layout remain UI state, never part of the editing document.
export const editorTools = [
  {id:'media',label:'الوسائط',icon:'film'},
  {id:'transcript',label:'تحرير بالنص',icon:'text'},
  {id:'captions',label:'الكابشن',icon:'captions'},
  {id:'inspector',label:'خصائص المقطع',icon:'settings'},
  {id:'jobs',label:'العمليات',icon:'activity'},
] as const satisfies readonly {id:string;label:string;icon:IconName}[];
export type EditorTool = typeof editorTools[number]['id'];

export function ToolSidebar({active,onChange,pending}:{active:EditorTool|null;onChange:(tool:EditorTool|null)=>void;pending:number}){
  return <nav className="tool-sidebar" aria-label="أدوات التحرير">{editorTools.map(tool=><button key={tool.id} className={`tool-button ${active===tool.id?'is-active':''}`} aria-label={tool.label} title={tool.label} aria-pressed={active===tool.id} aria-controls="editor-tool-panel" onClick={()=>onChange(active===tool.id?null:tool.id)}><span className="tool-icon"><Icon name={tool.icon} size={22}/>{tool.id==='jobs'&&pending>0?<span className="tool-badge">{pending}</span>:null}</span><span>{tool.label}</span></button>)}<span className="tool-sidebar-spacer"/><span className="tools-hint">أدواتك</span></nav>;
}
