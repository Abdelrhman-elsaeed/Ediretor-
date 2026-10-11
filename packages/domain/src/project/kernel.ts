import {AppError, documentSchema, type Asset, type Edit, type ProjectDocument, type ProjectState, type SessionAction} from '../../../contracts/src/project';
import {cutClip} from '../editing/cut-clip';
import {micros} from '../time/micros';

export function durationUs(document: ProjectDocument): bigint {
  const last = document.sequence.clips.at(-1);
  return last ? BigInt(last.sequenceStartUs) + BigInt(last.durationUs) : 0n;
}
export function emptyState(projectId: string, revisionId: string): ProjectState {
  const document: ProjectDocument = {schemaVersion: 1, projectId, revisionId, parentRevisionId: null,
    sequence: {canvas: {width: 1920, height: 1080}, fps: {num: 30, den: 1}, tracks: [{id: 'picture', kind: 'video'}, {id: 'sound', kind: 'linked-audio'}], clips: []}, assetRefs: []};
  return {document, history: [document], cursor: 0};
}
export function validateDocument(input: unknown): ProjectDocument {
  const document = documentSchema.parse(input);
  const assets = new Map(document.assetRefs.map(a => [a.id, a]));
  if (assets.size !== document.assetRefs.length) throw new AppError('DUPLICATE_ASSET');
  const ids = new Set<string>(); let start = 0n;
  for (const a of assets.values()) if (a.projectId !== document.projectId) throw new AppError('ASSET_FORBIDDEN');
  for (const clip of document.sequence.clips) {
    const asset = assets.get(clip.assetId);
    if (!asset) throw new AppError('MISSING_ASSET');
    if (ids.has(clip.id)) throw new AppError('DUPLICATE_CLIP');
    ids.add(clip.id);
    if (BigInt(clip.sequenceStartUs) !== start || BigInt(clip.sourceInUs) + BigInt(clip.durationUs) > BigInt(asset.durationUs)) throw new AppError('INVALID_TIMING');
    start += BigInt(clip.durationUs);
  }
  if (start > 86_400_000_000n) throw new AppError('TIME_OUT_OF_RANGE');
  return document;
}
function applyEdit(document: ProjectDocument, command: Edit, assets: readonly Asset[], commandId: string): ProjectDocument {
  let clips = document.sequence.clips.map(c => ({...c}));
  let refs = [...document.assetRefs];
  if (command.type === 'InsertClip') {
    const asset = assets.find(a => a.id === command.assetId && a.projectId === document.projectId);
    if (!asset) throw new AppError('ASSET_FORBIDDEN');
    if (!refs.some(a => a.id === asset.id)) refs.push(asset);
    clips.push({id: command.clipId, assetId: asset.id, trackId: 'picture', sourceInUs: '0', durationUs: asset.durationUs, sequenceStartUs: durationUs(document).toString()});
  } else if (command.type === 'RippleDeleteRange') {
    const start = BigInt(command.startUs), end = BigInt(command.endUs);
    if (start >= end || end > durationUs(document)) throw new AppError('INVALID_RANGE');
    clips = clips.flatMap(clip => {
      const cs = BigInt(clip.sequenceStartUs), ce = cs + BigInt(clip.durationUs);
      if (end <= cs || start >= ce) return [clip];
      return cutClip({...clip, sourceInUs: BigInt(clip.sourceInUs), durationUs: BigInt(clip.durationUs), sequenceStartUs: cs},
        [{startUs: micros(start > cs ? start - cs : 0n), endUs: micros(end < ce ? end - cs : ce - cs)}], commandId)
        .map(c => ({...c, id: `${commandId}:${clips.findIndex(x => x.id === clip.id)}:${c.id.split(':').at(-1)}`, trackId: 'picture' as const, sourceInUs: c.sourceInUs.toString(), durationUs: c.durationUs.toString(), sequenceStartUs: c.sequenceStartUs.toString()}));
    });
  } else {
    const index = clips.findIndex(c => c.id === command.clipId), clip = clips[index];
    if (!clip) throw new AppError('CLIP_NOT_FOUND');
    if (command.type === 'SplitClip') {
      const offset = BigInt(command.atUs) - BigInt(clip.sequenceStartUs);
      if (offset <= 0n || offset >= BigInt(clip.durationUs)) throw new AppError('INVALID_SPLIT');
      clips.splice(index, 1, {...clip, durationUs: offset.toString()}, {...clip, id: command.rightId,
        sourceInUs: (BigInt(clip.sourceInUs) + offset).toString(), durationUs: (BigInt(clip.durationUs) - offset).toString()});
    } else clips[index] = {...clip, sourceInUs: command.sourceInUs, durationUs: command.durationUs};
  }
  let start = 0n;
  clips = clips.map(c => {const value = {...c, sequenceStartUs: start.toString()}; start += BigInt(c.durationUs); return value;});
  refs = refs.filter(a => clips.some(c => c.assetId === a.id));
  return validateDocument({...document, sequence: {...document.sequence, clips}, assetRefs: refs});
}
/** Batch edits apply on a temporary document; a failure cannot mutate the input. */
export function applyAction(state: ProjectState, action: SessionAction, assets: readonly Asset[]): ProjectState {
  if (action.kind !== 'edit') {
    const cursor = state.cursor + (action.kind === 'undo' ? -1 : 1), entry = state.history[cursor];
    if (!entry) throw new AppError(action.kind === 'undo' ? 'NOTHING_TO_UNDO' : 'NOTHING_TO_REDO');
    return {...state, cursor, document: {...entry, revisionId: state.document.revisionId, parentRevisionId: state.document.parentRevisionId}};
  }
  let document = state.document;
  for (const command of action.commands) document = applyEdit(document, command, assets, action.commandId);
  const history = [...state.history.slice(0, state.cursor + 1), document].slice(-100);
  return {document, history, cursor: history.length - 1};
}
