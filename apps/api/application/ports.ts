import type {Asset, Job, Project, ProjectState, ProjectSummary, SaveRequest} from '../../../packages/contracts/src/project';
import type {Transcript} from '../../../packages/contracts/src/transcript';

export interface ProjectRepository {
  list(owner: string, search: string, offset: number): {items: ProjectSummary[]; more: boolean};
  create(owner: string, name: string, id: string, state: ProjectState): Project;
  load(owner: string, id: string): Project;
  save(owner: string, id: string, request: SaveRequest, apply: (project: Project) => ProjectState): Project;
  addAsset(projectId: string, asset: Asset): void;
}
export interface JobRecord {
  id: string; projectId: string; owner: string; kind: Job['kind'];
  status: Job['status']; payload: unknown; lease: string | null; attempts: number;
}
export interface JobRepository {
  enqueue(owner: string, projectId: string, kind: Job['kind'], payload: unknown): Job;
  listJobs(owner: string, projectId: string): Job[];
  get(owner: string, id: string): Job;
  cancel(owner: string, id: string): Job;
  retry(owner: string, id: string): Job;
  claim(lease: string): JobRecord | null;
  heartbeat(id: string, lease: string, stage: string, progress: number): boolean;
  finish(id: string, lease: string, result: NonNullable<Job['result']>, asset?: Asset,transcript?:Transcript): boolean;
  fail(id: string, lease: string, error: string): void;
}
export interface AssetStorage {
  exists(key: string): Promise<boolean>;
}
