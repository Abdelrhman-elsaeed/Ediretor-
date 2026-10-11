import {randomUUID} from 'node:crypto';
import {join} from 'node:path';
import {rm} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
import {localConfig} from '../api/infrastructure/config';
import {openDatabase} from '../api/infrastructure/database';
import {SqliteRepository} from '../api/infrastructure/repository';
import {LocalStorage} from '../api/infrastructure/storage';
import {executeExport, executeImport, prepareWork} from './media-execution';
import {AppError, type Asset, type Job} from '../../packages/contracts/src/project';

const config = localConfig(), db = openDatabase(join(config.data, 'project.sqlite'));
const repo = new SqliteRepository(db), storage = new LocalStorage(join(config.data, 'assets'));
await storage.init();
let stopping = false, active: AbortController | undefined;
for (const event of ['SIGINT','SIGTERM'] as const) process.on(event, () => {stopping = true; active?.abort();});
console.log(JSON.stringify({event: 'worker-ready', profile: config.profile, concurrency: 1}));
while (!stopping) {
  const lease = randomUUID(), job = repo.claim(lease);
  if (!job) {await delay(500); continue;}
  const controller = new AbortController(); active = controller;
  let stage = 'starting', value = 0;
  const progress = (nextStage: string, nextValue: number) => {stage = nextStage; value = nextValue;};
  const timer = setInterval(() => {
    try {if (!repo.heartbeat(job.id, lease, stage, value)) controller.abort();}
    catch {controller.abort();console.error(JSON.stringify({event:'heartbeat-failed',jobId:job.id}));}
  }, 500);
  const deadline = setTimeout(() => controller.abort(), 30 * 60 * 1000);
  const work = await prepareWork(config.data, job.id, lease);
  try {
    const result: {result: NonNullable<Job['result']>; published: string[]; asset?: Asset} = job.kind === 'import'
      ? await executeImport(job, lease, storage, work, controller.signal, progress)
      : await executeExport(job, lease, storage, work, controller.signal, progress);
    if (!repo.finish(job.id, lease, result.result, result.asset)) {
      for (const key of result.published) await rm(storage.path(key), {force: true});
    }
    console.log(JSON.stringify({event: 'job-finished', jobId: job.id, kind: job.kind, attempts: job.attempts}));
  } catch (error) {
    const code = error instanceof AppError ? error.code : controller.signal.aborted ? 'INTERRUPTED' : 'MEDIA_PROCESSING_FAILED';
    // Graceful shutdown is recoverable from the expired lease, rather than terminal failure.
    if (!stopping) repo.fail(job.id, lease, code);
    console.error(JSON.stringify({event: 'job-error', jobId: job.id, code}));
  } finally {
    clearInterval(timer); clearTimeout(deadline); active = undefined;
    await rm(work, {recursive: true, force: true});
  }
}
db.close();
