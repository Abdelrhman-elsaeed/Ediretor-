import {z} from 'zod';
import {AppError, actionSchema, type Asset, type Edit, type Project, type ProjectState, type SaveRequest, type SessionAction} from '../../../../packages/contracts/src/project';
import {applyAction} from '../../../../packages/domain/src/project/kernel';
import {api} from '../infrastructure/api';

interface PendingStore {get(key: string): string | null; set(key: string, value: string): void; remove(key: string): void;}
interface SessionApi {save(id: string, request: SaveRequest): Promise<Project>; load(id: string): Promise<Project>;}
const pendingSchema = z.object({version:z.literal(1),baseRevisionId:z.string(),actions:z.array(actionSchema),inflight:z.object({commandId:z.string(),baseRevisionId:z.string(),actions:z.array(actionSchema)}).nullable()});
export interface SessionView {
  project: Project; state: ProjectState; dirty: boolean;
  saving: boolean; error: string | null; recovered: boolean;
}
const browserStore: PendingStore = {
  get: key => localStorage.getItem(key), set: (key,value) => localStorage.setItem(key,value), remove: key => localStorage.removeItem(key),
};
export class ProjectSession {
  private view: SessionView;
  private actions: SessionAction[] = [];
  private inflight: SaveRequest | null = null;
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private saving: Promise<void> | undefined;
  private key: string;
  private disposed = false;
  constructor(project: Project, private readonly client: SessionApi = api, private readonly store: PendingStore = browserStore) {
    this.key = `ediretor-pending-v1:${project.id}`;
    this.view = {project,state:project.state,dirty:false,saving:false,error:null,recovered:false};
    try {
      const raw = store.get(this.key);
      if (raw) {
        const pending = pendingSchema.parse(JSON.parse(raw));
        this.actions = pending.actions; this.inflight = pending.inflight;
        if (pending.baseRevisionId !== project.revisionId) this.view = {...this.view,dirty:true,error:'REVISION_CONFLICT',recovered:true};
        else {
          let state = project.state;
          for (const action of this.actions) state = applyAction(state,action,project.assets,project.transcripts??[]);
          this.view = {...this.view,state,dirty:!!this.actions.length,recovered:true};
        }
      }
    } catch {this.view = {...this.view,error:'RECOVERY_STORAGE_ERROR'};}
  }
  snapshot = (): SessionView => this.view;
  subscribe = (listener: () => void) => {this.listeners.add(listener); return () => {this.listeners.delete(listener);};};
  private publish(patch: Partial<SessionView>) {this.view = {...this.view,...patch}; for (const listener of this.listeners) listener();}
  private persist() {
    try {
      if (this.actions.length) this.store.set(this.key,JSON.stringify({version:1,baseRevisionId:this.view.project.revisionId,actions:this.actions,inflight:this.inflight}));
      else this.store.remove(this.key);
    } catch {this.publish({error:'RECOVERY_STORAGE_ERROR'});}
  }
  edit(commands: Edit[]) {this.dispatch({kind:'edit',commandId:crypto.randomUUID(),commands});}
  undo() {this.dispatch({kind:'undo',commandId:crypto.randomUUID()});}
  redo() {this.dispatch({kind:'redo',commandId:crypto.randomUUID()});}
  private dispatch(action: SessionAction) {
    if (this.view.error === 'REVISION_CONFLICT') throw new AppError('REVISION_CONFLICT');
    const state = applyAction(this.view.state,action,this.view.project.assets,this.view.project.transcripts??[]);
    this.actions.push(action); this.publish({state,dirty:true,error:null}); this.persist();
    clearTimeout(this.timer); this.timer = setTimeout(() => {void this.flush().catch(()=>{});},1200);
  }
  async refreshAssets(): Promise<void> {
    const latest = await this.client.load(this.view.project.id);
    // Do not replace a dirty timeline with a query response.
    this.publish({project:{...this.view.project,assets:latest.assets,transcripts:latest.transcripts}});
  }
  async flush(): Promise<void> {
    clearTimeout(this.timer);
    if (this.saving) {await this.saving; if (this.actions.length) return this.flush(); return;}
    if (!this.actions.length) return;
    if (this.view.error === 'REVISION_CONFLICT' && !this.inflight) throw new AppError('REVISION_CONFLICT');
    const request = this.inflight ?? {commandId:crypto.randomUUID(),baseRevisionId:this.view.project.revisionId,actions:[...this.actions]};
    this.inflight = request; this.persist(); this.publish({saving:true});
    this.saving = (async () => {
      try {
        const project = await this.client.save(this.view.project.id,request);
        this.actions = this.actions.slice(request.actions.length); this.inflight = null;
        let state = project.state;
        for (const action of this.actions) state = applyAction(state,action,project.assets,project.transcripts??[]);
        this.publish({project,state,dirty:!!this.actions.length,saving:false,error:null}); this.persist();
      } catch (error) {
        this.publish({saving:false,error:error instanceof AppError ? error.code : 'SAVE_FAILED',dirty:true}); throw error;
      } finally {this.saving = undefined;}
    })();
    await this.saving;
    if (this.actions.length && !this.disposed) {this.timer = setTimeout(() => {void this.flush().catch(()=>{});},1200);}
  }
  /** Recovery is downloaded before deliberately discarding conflicting pending actions. */
  recoveryFile(): Blob {return new Blob([JSON.stringify({project:this.view.project,state:this.view.state,actions:this.actions,inflight:this.inflight},null,2)],{type:'application/json'});}
  async reload(): Promise<void> {
    if (this.saving) throw new AppError('SAVE_IN_PROGRESS');
    const project = await this.client.load(this.view.project.id);
    this.actions = []; this.inflight = null; this.store.remove(this.key);
    this.publish({project,state:project.state,dirty:false,saving:false,error:null,recovered:false});
  }
  dispose() {this.disposed = true; clearTimeout(this.timer); this.listeners.clear();}
}
