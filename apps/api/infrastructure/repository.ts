import type {DatabaseSync, SQLInputValue} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {AppError, assetSchema, stateSchema, type Asset, type Job, type Project, type ProjectState, type SaveRequest} from '../../../packages/contracts/src/project';
import {durationUs} from '../../../packages/domain/src/project/kernel';
import type {JobRecord, JobRepository, ProjectRepository} from '../application/ports';
import {transcriptSchema,type Transcript} from '../../../packages/contracts/src/transcript';
import type {TranscriptRepository} from '../application/transcription';

type Row = Record<string, unknown>;
const readJson = (value: unknown): unknown => {if (typeof value !== 'string') throw new AppError('STORAGE_CORRUPT'); return JSON.parse(value);};
const string = (value: unknown): string => {if (typeof value !== 'string') throw new AppError('STORAGE_CORRUPT'); return value;};
export class SqliteRepository implements ProjectRepository, JobRepository,TranscriptRepository {
  constructor(private readonly db: DatabaseSync) {}
  private query(sql: string, ...params: SQLInputValue[]): Row | undefined { return this.db.prepare(sql).get(...params); }
  private transaction<T>(run: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try {const result = run(); this.db.exec('COMMIT'); return result;} catch (e) {this.db.exec('ROLLBACK'); throw e;}
  }
  list(owner: string, search: string, offset: number) {
    const rows = this.db.prepare('SELECT * FROM projects WHERE owner = ? AND name LIKE ? ESCAPE \'\\\' ORDER BY updated_at DESC LIMIT 41 OFFSET ?')
      .all(owner, `%${search.replace(/[\\%_]/g, '\\$&')}%`, offset);
    return {more: rows.length > 40, items: rows.slice(0, 40).map(row => {
      const state = stateSchema.parse(readJson(row.state_json));
      const count = this.query('SELECT count(*) n FROM assets WHERE project_id = ?', string(row.id));
      const first = this.query('SELECT metadata_json FROM assets WHERE project_id = ? LIMIT 1', string(row.id));
      return {id: string(row.id), name: string(row.name), revisionId: string(row.revision_id), updatedAt: string(row.updated_at),
        durationUs: durationUs(state.document).toString(), assetCount: Number(count?.n ?? 0), clipCount: state.document.sequence.clips.length,
        thumbnail: first ? assetSchema.parse(readJson(first.metadata_json)).thumbnail : null};
    })};
  }
  create(owner: string, name: string, id: string, state: ProjectState): Project {
    const now = new Date().toISOString();
    this.transaction(() => {
      this.db.prepare('INSERT INTO projects VALUES (?, ?, ?, ?, ?, ?)').run(id, owner, name, state.document.revisionId, JSON.stringify(state), now);
      this.db.prepare('INSERT INTO revisions VALUES (?, ?, NULL, ?, ?)').run(state.document.revisionId, id, JSON.stringify(state.document), now);
    });
    return this.load(owner, id);
  }
  load(owner: string, id: string): Project {
    const row = this.query('SELECT * FROM projects WHERE id = ? AND owner = ?', id, owner);
    if (!row) throw new AppError('PROJECT_NOT_FOUND');
    const assets = this.db.prepare('SELECT metadata_json FROM assets WHERE project_id = ?').all(id).map(r => assetSchema.parse(readJson(r.metadata_json)));
    const transcripts=this.db.prepare('SELECT metadata_json FROM transcripts WHERE project_id = ? ORDER BY rowid').all(id).map(r=>transcriptSchema.parse(readJson(r.metadata_json)));
    return {id, name: string(row.name), revisionId: string(row.revision_id), updatedAt: string(row.updated_at), state: stateSchema.parse(readJson(row.state_json)), assets,transcripts};
  }
  save(owner: string, id: string, request: SaveRequest, apply: (project: Project) => ProjectState): Project {
    return this.transaction(() => {
      const project = this.load(owner, id), payload = JSON.stringify(request);
      const old = this.query('SELECT * FROM commits WHERE project_id = ? AND command_id = ?', id, request.commandId);
      if (old) {
        if (old.payload !== payload) throw new AppError('IDEMPOTENCY_MISMATCH');
        // A lost acknowledgement returns the original state, even if later saves exist.
        return JSON.parse(string(old.result_json)) as Project;
      }
      if (project.revisionId !== request.baseRevisionId) throw new AppError('REVISION_CONFLICT');
      for (const action of request.actions) {
        const previous = this.query('SELECT command_id FROM commits WHERE project_id = ? AND command_id = ?', id, action.commandId);
        if (previous) throw new AppError('DUPLICATE_COMMAND');
      }
      const state = apply(project), revisionId = randomUUID(), now = new Date().toISOString();
      state.document = {...state.document, revisionId, parentRevisionId: project.revisionId};
      this.db.prepare('UPDATE projects SET revision_id = ?, state_json = ?, updated_at = ? WHERE id = ? AND revision_id = ?')
        .run(revisionId, JSON.stringify(state), now, id, project.revisionId);
      this.db.prepare('INSERT INTO revisions VALUES (?, ?, ?, ?, ?)').run(revisionId, id, project.revisionId, JSON.stringify(state.document), now);
      const result = {...project, revisionId, updatedAt: now, state};
      this.db.prepare('INSERT INTO commits VALUES (?, ?, ?, ?)').run(id, request.commandId, payload, JSON.stringify(result));
      for (const action of request.actions) this.db.prepare('INSERT INTO commits VALUES (?, ?, ?, ?)').run(id, action.commandId, payload, JSON.stringify(result));
      return result;
    });
  }
  addAsset(projectId: string, asset: Asset): void {this.db.prepare('INSERT INTO assets VALUES (?, ?, ?)').run(asset.id, projectId, JSON.stringify(asset));}
  private job(row: Row): Job {
    const input=row.kind==='transcription'?readJson(row.payload_json) as {assetId:string}:undefined;
    return {id: string(row.id), projectId: string(row.project_id), kind: string(row.kind) as Job['kind'], status: string(row.status) as Job['status'],
      stage: string(row.stage), progress: Number(row.progress), error: row.error ? string(row.error) : null,
      result: row.result_json ? JSON.parse(string(row.result_json)) as Job['result'] : null, createdAt: string(row.created_at),...(input?{inputAssetId:input.assetId}:{})};
  }
  enqueue(owner: string, projectId: string, kind: Job['kind'], payload: unknown): Job {
    this.load(owner, projectId);
    const id = randomUUID(), now = new Date().toISOString();
    this.db.prepare('INSERT INTO jobs (id, project_id, owner, kind, status, payload_json, stage, created_at, updated_at) VALUES (?, ?, ?, ?, \'queued\', ?, \'queued\', ?, ?)')
      .run(id, projectId, owner, kind, JSON.stringify(payload), now, now);
    return this.get(owner, id);
  }
  listJobs(owner: string, projectId: string): Job[] {
    this.load(owner, projectId);
    return this.db.prepare('SELECT * FROM jobs WHERE owner = ? AND project_id = ? ORDER BY created_at DESC LIMIT 30').all(owner, projectId).map(r => this.job(r));
  }
  get(owner: string, id: string): Job {
    const row = this.query('SELECT * FROM jobs WHERE owner = ? AND id = ?', owner, id);
    if (!row) throw new AppError('JOB_NOT_FOUND');
    return this.job(row);
  }
  cancel(owner: string, id: string): Job {
    this.get(owner, id);
    this.db.prepare('UPDATE jobs SET status = \'cancelled\', stage = \'cancelled\', updated_at = ? WHERE id = ? AND status IN (\'queued\',\'running\')')
      .run(new Date().toISOString(), id);
    return this.get(owner, id);
  }
  retry(owner: string, id: string): Job {
    const job = this.get(owner, id);
    if (!['failed','cancelled'].includes(job.status)) throw new AppError('JOB_NOT_RETRYABLE');
    this.db.prepare('UPDATE jobs SET status = \'queued\', stage = \'queued\', progress = 0, error = NULL, lease = NULL, lease_until = NULL, attempts = 0, updated_at = ? WHERE id = ?')
      .run(new Date().toISOString(), id);
    return this.get(owner, id);
  }
  claim(lease: string): JobRecord | null {
    return this.transaction(() => {
      const row = this.query('SELECT * FROM jobs WHERE status = \'queued\' OR (status = \'running\' AND lease_until < ?) ORDER BY created_at LIMIT 1', Date.now());
      if (!row) return null;
      const id = string(row.id), attempts = Number(row.attempts) + 1;
      if (attempts > 3) {
        this.db.prepare('UPDATE jobs SET status = \'failed\', error = \'RETRY_LIMIT\', stage = \'failed\' WHERE id = ?').run(id);
        return null;
      }
      this.db.prepare('UPDATE jobs SET status = \'running\', lease = ?, lease_until = ?, attempts = ?, stage = \'starting\', progress = 0, error = NULL WHERE id = ?')
        .run(lease, Date.now() + 10000, attempts, id);
      return {id, projectId: string(row.project_id), owner: string(row.owner), kind: string(row.kind) as JobRecord['kind'], status: 'running', payload: readJson(row.payload_json), lease, attempts};
    });
  }
  heartbeat(id: string, lease: string, stage: string, progress: number): boolean {
    return this.db.prepare('UPDATE jobs SET lease_until = ?, stage = ?, progress = ?, updated_at = ? WHERE id = ? AND lease = ? AND status = \'running\'')
      .run(Date.now() + 10000, stage, Number.isFinite(progress) ? Math.max(0, Math.min(.99, progress)) : 0, new Date().toISOString(), id, lease).changes === 1;
  }
  finish(id: string, lease: string, result: NonNullable<Job['result']>, asset?: Asset,transcript?:Transcript): boolean {
    return this.transaction(() => {
      const row = this.query('SELECT project_id FROM jobs WHERE id = ? AND lease = ? AND status = \'running\' AND lease_until >= ?', id, lease, Date.now());
      if (!row) return false;
      if (asset) this.addAsset(string(row.project_id), asset);
      if(transcript){const t=transcriptSchema.parse(transcript);if(t.projectId!==row.project_id || t.id!==result.transcriptId)throw new AppError('TRANSCRIPT_FORBIDDEN');
        const assetRow=this.query('SELECT metadata_json FROM assets WHERE id = ? AND project_id = ?',t.assetId,t.projectId);
        if(!assetRow || assetSchema.parse(readJson(assetRow.metadata_json)).hash!==t.sourceHash)throw new AppError('TRANSCRIPT_FORBIDDEN');
        this.db.prepare('INSERT INTO transcripts VALUES (?, ?, ?, ?, ?, ?)').run(t.id,t.projectId,t.assetId,id,t.hash,JSON.stringify(t));}
      this.db.prepare('UPDATE jobs SET status = \'succeeded\', stage = \'completed\', progress = 1, result_json = ?, updated_at = ? WHERE id = ?')
        .run(JSON.stringify(result), new Date().toISOString(), id);
      return true;
    });
  }
  fail(id: string, lease: string, error: string): void {
    this.db.prepare('UPDATE jobs SET status = \'failed\', stage = \'failed\', error = ?, updated_at = ? WHERE id = ? AND lease = ? AND status = \'running\'')
      .run(error.slice(0, 160), new Date().toISOString(), id, lease);
  }
  listTranscripts(owner:string,projectId:string):Transcript[]{
    this.load(owner,projectId);return this.db.prepare('SELECT metadata_json FROM transcripts WHERE project_id = ? ORDER BY rowid').all(projectId).map(r=>transcriptSchema.parse(readJson(r.metadata_json)));
  }
  enqueueTranscription(owner:string,projectId:string,requestId:string,payload:unknown):Job{
    const input=payload as {assetId:string;language:string};
    return this.transaction(()=>{this.load(owner,projectId);
      const old=this.query('SELECT * FROM transcription_requests WHERE project_id = ? AND request_id = ?',projectId,requestId);
      if(old){if(old.asset_id!==input.assetId || old.language!==input.language)throw new AppError('IDEMPOTENCY_MISMATCH');return this.get(owner,string(old.job_id));}
      const existing=this.db.prepare("SELECT * FROM jobs WHERE project_id = ? AND kind = 'transcription' AND status IN ('queued','running')").all(projectId).find(r=>{const p=readJson(r.payload_json) as typeof input;return p.assetId===input.assetId && p.language===input.language;});
      const job=existing?this.job(existing):this.enqueue(owner,projectId,'transcription',payload);
      this.db.prepare('INSERT INTO transcription_requests VALUES (?, ?, ?, ?, ?)').run(projectId,requestId,job.id,input.assetId,input.language);return job;
    });
  }
  checkpoint(jobId:string,lease:string,index:number):unknown|null{
    const row=this.query("SELECT response_json FROM transcription_chunks WHERE job_id = ? AND chunk_index = ? AND EXISTS (SELECT 1 FROM jobs WHERE id = ? AND lease = ? AND status = 'running' AND lease_until >= ?)",jobId,index,jobId,lease,Date.now());return row?readJson(row.response_json):null;
  }
  saveCheckpoint(jobId:string,lease:string,index:number,value:unknown):boolean{
    return this.db.prepare("INSERT OR IGNORE INTO transcription_chunks SELECT ?, ?, ? WHERE EXISTS (SELECT 1 FROM jobs WHERE id = ? AND lease = ? AND status = 'running' AND lease_until >= ?)").run(jobId,index,JSON.stringify(value),jobId,lease,Date.now()).changes===1;
  }
}
