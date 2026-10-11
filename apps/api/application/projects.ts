import {randomUUID} from 'node:crypto';
import {AppError, saveSchema, type Job, type Project, type SaveRequest} from '../../../packages/contracts/src/project';
import {applyAction, emptyState, validateDocument, durationUs} from '../../../packages/domain/src/project/kernel';
import type {AssetStorage, ProjectRepository, JobRepository} from './ports';

export class ProjectService {
  constructor(private readonly projects: ProjectRepository, private readonly jobs: JobRepository, private readonly storage: AssetStorage) {}
  list(owner: string, search = '', offset = 0) {return this.projects.list(owner, search, offset);}
  create(owner: string, name: string): Project {
    const id = randomUUID(); return this.projects.create(owner, name.trim(), id, emptyState(id, randomUUID()));
  }
  load(owner: string, id: string): Project {return this.projects.load(owner, id);}
  save(owner: string, id: string, input: SaveRequest): Project {
    const request = saveSchema.parse(input);
    if (new Set([request.commandId, ...request.actions.map(a => a.commandId)]).size !== request.actions.length + 1) throw new AppError('DUPLICATE_COMMAND');
    return this.projects.save(owner, id, request, project => {
      let state = project.state;
      for (const action of request.actions) state = applyAction(state, action, project.assets);
      validateDocument(state.document); return state;
    });
  }
  ingest(owner: string, projectId: string, payload: {upload: string; name: string; size: number}): Job {
    this.load(owner, projectId); return this.jobs.enqueue(owner, projectId, 'import', payload);
  }
  async export(owner: string, projectId: string, revisionId: string): Promise<Job> {
    const project = this.load(owner, projectId), document = validateDocument(project.state.document);
    if (document.revisionId !== revisionId) throw new AppError('REVISION_CONFLICT');
    const length = durationUs(document);
    if (length === 0n) throw new AppError('EMPTY_SEQUENCE');
    // A bounded working profile, not qualification of long-video/graphics/4K rendering.
    if (length > 600_000_000n || document.sequence.clips.length > 200) throw new AppError('EXPORT_LIMIT');
    for (const asset of document.assetRefs) {
      if (!project.assets.some(a => a.id === asset.id && a.hash === asset.hash)) throw new AppError('ASSET_FORBIDDEN');
      if (!await this.storage.exists(asset.original)) throw new AppError('MISSING_MEDIA');
    }
    return this.jobs.enqueue(owner, projectId, 'export', {document, renderer: 'native-cuts-v1', profile: 'mp4-1080p-30'});
  }
  resolveAsset(owner: string, projectId: string, assetId: string, kind: 'original' | 'proxy' | 'thumbnail'): string {
    const asset = this.load(owner, projectId).assets.find(a => a.id === assetId);
    if (!asset) throw new AppError('ASSET_FORBIDDEN'); return asset[kind];
  }
}
