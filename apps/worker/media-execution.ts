import {mkdir, rename, writeFile, rm, stat, copyFile} from 'node:fs/promises';
import {join} from 'node:path';
import {AppError, assetSchema, importPayloadSchema, exportPayloadSchema, type Asset, type Job} from '../../packages/contracts/src/project';
import {compile} from '../../packages/composition/src/compile';
import type {JobRecord} from '../api/application/ports';
import type {LocalStorage} from '../api/infrastructure/storage';
import {native, probe, hashFile} from './native-media';
import {captionOverlay,captionRuntime} from './caption-raster';

type Progress = (stage: string, value: number) => void;
const seconds = (us: bigint) => (Number(us) / 1_000_000).toFixed(6);
const baseArgs = ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y'];
const encoding = ['-c:v','libx264','-preset','veryfast','-crf','20','-pix_fmt','yuv420p','-c:a','aac','-ar','48000','-ac','2','-movflags','+faststart'];

export async function executeImport(job: JobRecord, lease: string, storage: LocalStorage, work: string, signal: AbortSignal, progress: Progress): Promise<{result: NonNullable<Job['result']>; asset: Asset; published: string[]}> {
  const payload = importPayloadSchema.parse(job.payload), input = storage.path(payload.upload);
  progress('probing', 0);
  let metadata;
  try {metadata = await probe(input, signal);} catch (e) {if (signal.aborted) throw e; throw new AppError('UNSUPPORTED_MEDIA');}
  const video = metadata.streams.find(s => s.codec_type === 'video'), audio = metadata.streams.some(s => s.codec_type === 'audio');
  const duration = Number(metadata.format.duration);
  if (!video?.width || !video.height || !Number.isFinite(duration) || duration <= 0 || duration > 14400) throw new AppError('UNSUPPORTED_MEDIA');
  if (video.width > 3840 || video.height > 2160) throw new AppError('SOURCE_RESOLUTION_LIMIT');
  const durationUs = BigInt(Math.round(duration * 1_000_000));
  const [num, den] = (video.avg_frame_rate ?? '30/1').split('/').map(Number);
  if (!num || !den || num / den > 120) throw new AppError('UNSUPPORTED_FRAME_RATE');
  progress('hashing', 0);
  const hash = await hashFile(input, signal);
  const prefix = `${job.id}-${lease}`, original = `${prefix}-original`, proxy = `${prefix}-proxy`, thumbnail = `${prefix}-thumbnail`;
  const proxyFile = join(work, 'proxy.mp4'), thumbFile = join(work, 'thumbnail.jpg');
  progress('proxy', 0);
  // Same geometry as the export profile. Preserve source seconds for VFR inputs; no frame-index assumption.
  await native('ffmpeg', [...baseArgs, '-i', input, '-map','0:v:0','-map','0:a:0?', '-vf',
    'scale=1920:1080:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30',
    ...encoding, '-threads','2','-progress','pipe:1', proxyFile], signal, us => progress('proxy', us / Number(durationUs)));
  await native('ffmpeg', [...baseArgs, '-i', proxyFile, '-frames:v','1','-vf','scale=480:-2', thumbFile], signal);
  progress('validating', .99);
  const check = await probe(proxyFile, signal);
  if (Math.abs(Number(check.format.duration) - duration) > .15) throw new AppError('PROXY_VALIDATION_FAILED');
  signal.throwIfAborted();
  const asset = assetSchema.parse({id: job.id, projectId: job.projectId, name: payload.name, hash, durationUs: durationUs.toString(),
    width: video.width, height: video.height, fps: {num, den}, hasAudio: audio, size: (await stat(input)).size, original, proxy, thumbnail});
  const published: string[] = [];
  try {
    await copyFile(input, storage.path(original)); published.push(original);
    await rename(proxyFile, storage.path(proxy)); published.push(proxy);
    await rename(thumbFile, storage.path(thumbnail)); published.push(thumbnail);
    return {asset, result: {assetId: asset.id}, published};
  } catch (e) {for (const key of published) await rm(storage.path(key), {force: true}); throw e;}
}

export async function executeExport(job: JobRecord, lease: string, storage: LocalStorage, work: string, signal: AbortSignal, progress: Progress): Promise<{result: NonNullable<Job['result']>; published: string[]}> {
  const payload = exportPayloadSchema.parse(job.payload), plan = compile(payload.document);
  if (!plan.frames || plan.durationUs > 600_000_000n || plan.segments.length > 200) throw new AppError('EXPORT_LIMIT');
  progress('verifying-assets', 0);
  for (const asset of payload.document.assetRefs) {
    if (!await storage.exists(asset.original)) throw new AppError('MISSING_MEDIA');
    if (await hashFile(storage.path(asset.original), signal) !== asset.hash) throw new AppError('ASSET_HASH_MISMATCH');
  }
  const parts: string[] = [], audioParts: string[] = []; let completed = 0;
  for (const [index, segment] of plan.segments.entries()) {
    const target = join(work, `segment-${index}.mp4`), frames = segment.endFrame - segment.startFrame;
    if (frames <= 0) throw new AppError('CLIP_TOO_SHORT');
    const args = [...baseArgs, '-ss', seconds(segment.sourceInUs), '-i', storage.path(segment.asset.original)];
    args.push('-map','0:v:0','-an','-vf',
      `scale=${plan.canvas.width}:${plan.canvas.height}:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=${plan.canvas.width}:${plan.canvas.height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,tpad=stop_mode=clone:stop_duration=1`,
      '-frames:v',String(frames), '-t',(frames / 30).toFixed(6), '-c:v','libx264','-preset','veryfast','-crf','20','-pix_fmt','yuv420p','-threads','2','-progress','pipe:1', target);
    await native('ffmpeg', args, signal, us => progress('encoding', Math.min(.9, (completed + Math.min(frames, us / 1_000_000 * 30)) / plan.frames * .9)));
    // Concatenate uncompressed, exact-length audio before ONE AAC encode. Encoding AAC
    // per segment introduces priming/padding at every cut and accumulates audible drift.
    const audioFile = join(work, `audio-${index}.wav`), duration = (frames / 30).toFixed(6);
    const audioArgs = segment.asset.hasAudio
      ? ['-ss',seconds(segment.sourceInUs),'-i',storage.path(segment.asset.original),'-map','0:a:0']
      : ['-f','lavfi','-i','anullsrc=r=48000:cl=stereo'];
    await native('ffmpeg',[...baseArgs,...audioArgs,'-vn','-af',`aresample=async=1:first_pts=0,apad,atrim=duration=${duration},asetpts=PTS-STARTPTS`,
      '-t',duration,'-c:a','pcm_s16le','-ar','48000','-ac','2',audioFile],signal);
    completed += frames; parts.push(`file 'segment-${index}.mp4'`); audioParts.push(`file 'audio-${index}.wav'`);
  }
  await writeFile(join(work, 'concat.txt'), parts.join('\n'));
  await writeFile(join(work, 'audio-concat.txt'), audioParts.join('\n'));
  const output = join(work, 'output.mp4');
  let captionInput:string|undefined;
  if(payload.document.captionStyle?.enabled && !payload.captions)throw new AppError('NO_CAPTIONS');
  if(payload.captions){progress('rendering-captions',.91);
    if(payload.captions.runtime!==await captionRuntime(signal))throw new AppError('CAPTION_RUNTIME_MISMATCH');
    if(payload.captions.fontHash!==payload.document.captionStyle?.fontHash)throw new AppError('CAPTION_FONT_MISMATCH');
    captionInput=await captionOverlay(payload.captions.cues,plan.frames,plan.canvas.width,plan.canvas.height,work,signal);
  }
  progress('muxing', .92);
  await native('ffmpeg', [...baseArgs, '-f','concat','-safe','1','-i',join(work, 'concat.txt'),
    '-f','concat','-safe','1','-i',join(work, 'audio-concat.txt'),
    ...(captionInput?['-f','concat','-safe','0','-i',captionInput,'-filter_complex','[0:v][2:v]overlay=0:0:format=auto:eof_action=pass,format=yuv420p,fps=30[out]','-map','[out]','-c:v','libx264','-preset','veryfast','-crf','20','-threads','2','-r','30','-fps_mode','cfr','-frames:v',String(plan.frames)]:['-map','0:v:0','-c:v','copy']),
    '-map','1:a:0','-c:a','aac','-ar','48000','-ac','2',
    '-t',(plan.frames/30).toFixed(6),'-movflags','+faststart',output], signal);
  progress('validating', .96);
  const metadata = await probe(output, signal), video = metadata.streams.find(s => s.codec_type === 'video');
  if (video?.width !== plan.canvas.width || video?.height !== plan.canvas.height || Number(video?.nb_frames) !== plan.frames || video.avg_frame_rate !== '30/1' ||
      Math.abs(Number(metadata.format.duration) - plan.frames / 30) > .15) throw new AppError('EXPORT_VALIDATION_FAILED');
  // Full decode precedes publication. Media marker/parity qualification remains separate evidence.
  await native('ffmpeg', ['-v','error','-xerror','-i',output,'-f','null','-'], signal);
  signal.throwIfAborted();
  const key = `${job.id}-${lease}-output`;
  await rename(output, storage.path(key));
  return {result: {output: key, revisionId: payload.document.revisionId}, published: [key]};
}

export async function prepareWork(root: string, jobId: string, lease: string) {
  const work = join(root, 'work', jobId, lease); await mkdir(work, {recursive: true}); return work;
}
