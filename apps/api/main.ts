import {createServer, type IncomingMessage, type ServerResponse} from 'node:http';
import {createReadStream, createWriteStream} from 'node:fs';
import {stat, rm} from 'node:fs/promises';
import {pipeline} from 'node:stream/promises';
import {Transform} from 'node:stream';
import {join, resolve, extname, sep} from 'node:path';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {AppError, idSchema, saveSchema} from '../../packages/contracts/src/project';
import {ProjectService} from './application/projects';
import {openDatabase} from './infrastructure/database';
import {SqliteRepository} from './infrastructure/repository';
import {LocalStorage} from './infrastructure/storage';
import {localConfig} from './infrastructure/config';
import {native} from '../worker/native-media';
import {TranscriptionService} from './application/transcription';
import {captionRuntime} from '../worker/caption-raster';

const config = localConfig(), db = openDatabase(join(config.data, 'project.sqlite'));
const repo = new SqliteRepository(db), storage = new LocalStorage(join(config.data, 'assets'));
await storage.init();
const service = new ProjectService(repo, repo, storage), owner = config.owner;
const transcription=new TranscriptionService(repo,repo,storage,()=>!!process.env.DEEPGRAM_API_KEY);
let captionsRuntime:string|undefined;
try{captionsRuntime=await captionRuntime(AbortSignal.timeout(10000));}catch{console.error(JSON.stringify({event:'caption-runtime-unavailable'}));}
const allowedOrigins = new Set([`http://127.0.0.1:${config.port}`, `http://localhost:${config.port}`, 'http://127.0.0.1:4317', 'http://localhost:4317']);
let mediaTools = false;
try {await native('ffmpeg', ['-version'], AbortSignal.timeout(5000)); await native('ffprobe', ['-version'], AbortSignal.timeout(5000)); mediaTools = true;} catch {}

function send(res: ServerResponse, value: unknown, status = 200) {
  res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}); res.end(JSON.stringify(value));
}
async function body(req: IncomingMessage): Promise<unknown> {
  let value = '';
  for await (const chunk of req) {value += chunk.toString(); if (value.length > 4_000_000) throw new AppError('REQUEST_TOO_LARGE');}
  try {return JSON.parse(value);} catch {throw new AppError('INVALID_REQUEST');}
}
async function streamFile(req: IncomingMessage, res: ServerResponse, path: string, type: string, download = false) {
  let details;
  try {details = await stat(path);} catch {throw new AppError('MISSING_MEDIA');}
  let start = 0, end = details.size - 1, partial = false;
  if (req.headers.range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
    if (!match || (!match[1] && !match[2])) {res.writeHead(416, {'Content-Range': `bytes */${details.size}`}); res.end(); return;}
    if (!match[1]) start = Math.max(0, details.size - Number(match[2]));
    else {start = Number(match[1]); if (match[2]) end = Math.min(end, Number(match[2]));}
    if (start > end || start >= details.size) {res.writeHead(416, {'Content-Range': `bytes */${details.size}`}); res.end(); return;}
    partial = true;
  }
  res.writeHead(partial ? 206 : 200, {'Content-Type':type,'Accept-Ranges':'bytes','Content-Length':end - start + 1,
    'Cache-Control':type.startsWith('text/html') ? 'no-store' : 'private, max-age=3600', ...(partial ? {'Content-Range':`bytes ${start}-${end}/${details.size}`} : {}),
    ...(download ? {'Content-Disposition':'attachment; filename="ediretor-export.mp4"'} : {})});
  if (req.method === 'HEAD') {res.end(); return;}
  try {await pipeline(createReadStream(path, {start,end}), res);} catch {if (!res.destroyed) res.destroy();}
}
const server = createServer(async (req, res) => {
  const requestId = randomUUID();
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  try {
    if (req.headers.origin && !allowedOrigins.has(req.headers.origin)) throw new AppError('ORIGIN_FORBIDDEN');
    const host = req.headers.host ?? '';
    if (!/^(127\.0\.0\.1|localhost):(4317|\d+)$/.test(host)) throw new AppError('ORIGIN_FORBIDDEN');
    const url = new URL(req.url ?? '/', `http://127.0.0.1:${config.port}`), path = url.pathname;
    if (path === '/api/health' && req.method === 'GET') {send(res, {profile:'local', storage:'sqlite', mediaTools, worker: 'separate-process',transcriptionAvailable:!!process.env.DEEPGRAM_API_KEY,captionRuntime:captionsRuntime??null}); return;}
    if (path === '/api/projects' && req.method === 'GET') {
      const offset = z.coerce.number().int().min(0).max(100000).parse(url.searchParams.get('offset') ?? 0);
      send(res, service.list(owner, (url.searchParams.get('search') ?? '').slice(0,120), offset)); return;
    }
    if (path === '/api/projects' && req.method === 'POST') {
      const data = z.object({name:z.string().trim().min(1).max(120)}).strict().parse(await body(req));
      send(res, service.create(owner, data.name), 201); return;
    }
    const projectMatch = /^\/api\/projects\/([^/]+)(?:\/(save|import|jobs|export|thumbnail|transcripts|transcribe|captions))?$/.exec(path);
    if (projectMatch) {
      const id = idSchema.parse(projectMatch[1]), action = projectMatch[2];
      if (!action && req.method === 'GET') {send(res, service.load(owner,id)); return;}
      if (action === 'save' && req.method === 'POST') {send(res, service.save(owner,id,saveSchema.parse(await body(req)))); return;}
      if (action === 'jobs' && req.method === 'GET') {send(res, repo.listJobs(owner,id)); return;}
      if(action==='transcripts' && req.method==='GET'){send(res,transcription.list(owner,id));return;}
      if(action==='transcribe' && req.method==='POST'){send(res,await transcription.start(owner,id,await body(req)),202);return;}
      if(action==='captions' && req.method==='GET'){
        const revisionId=idSchema.parse(url.searchParams.get('revisionId')),format=z.enum(['srt','vtt']).parse(url.searchParams.get('format'));
        const text=service.subtitles(owner,id,revisionId,format);res.writeHead(200,{'Content-Type':format==='vtt'?'text/vtt; charset=utf-8':'application/x-subrip; charset=utf-8','Cache-Control':'no-store','Content-Disposition':`attachment; filename="ediretor-captions.${format}"`});res.end(text);return;
      }
      if (action === 'export' && req.method === 'POST') {
        if (!mediaTools) throw new AppError('MEDIA_TOOLS_UNAVAILABLE');
        const input = z.object({revisionId:idSchema}).strict().parse(await body(req));
        send(res, await service.export(owner,id,input.revisionId,captionsRuntime),202); return;
      }
      if (action === 'thumbnail' && req.method === 'GET') {
        const asset = service.load(owner,id).assets[0];
        if (!asset) throw new AppError('MISSING_MEDIA');
        await streamFile(req,res,storage.path(asset.thumbnail),'image/jpeg'); return;
      }
      if (action === 'import' && req.method === 'POST') {
        if (!mediaTools) throw new AppError('MEDIA_TOOLS_UNAVAILABLE');
        service.load(owner,id);
        const name = z.string().min(1).max(240).parse(url.searchParams.get('name')), upload = `${randomUUID()}-upload`;
        let size = 0;
        const limit = new Transform({transform(chunk: Buffer, _encoding, callback) {
          size += chunk.length; callback(size > 2 * 1024 ** 3 ? new AppError('IMPORT_SIZE_LIMIT') : null, chunk);
        }});
        try {
          await pipeline(req, limit, createWriteStream(storage.path(upload), {flags:'wx'}));
          if (!size) throw new AppError('EMPTY_FILE');
          send(res, service.ingest(owner,id,{upload,name,size}),202);
        } catch (e) {await rm(storage.path(upload), {force:true}); throw e;}
        return;
      }
    }
    const assetMatch = /^\/api\/assets\/([^/]+)\/([^/]+)\/(proxy|thumbnail)$/.exec(path);
    if (assetMatch && ['GET','HEAD'].includes(req.method ?? '')) {
      const projectId = idSchema.parse(assetMatch[1]), assetId = idSchema.parse(assetMatch[2]), kind = assetMatch[3] as 'proxy'|'thumbnail';
      await streamFile(req,res,storage.path(service.resolveAsset(owner,projectId,assetId,kind)),kind === 'proxy' ? 'video/mp4' : 'image/jpeg'); return;
    }
    const jobMatch = /^\/api\/jobs\/([^/]+)(?:\/(cancel|retry|download))?$/.exec(path);
    if (jobMatch) {
      const id = idSchema.parse(jobMatch[1]), action = jobMatch[2];
      if (!action && req.method === 'GET') {send(res, repo.get(owner,id)); return;}
      if (action === 'cancel' && req.method === 'POST') {send(res,repo.cancel(owner,id)); return;}
      if (action === 'retry' && req.method === 'POST') {send(res,repo.retry(owner,id),202); return;}
      if (action === 'download' && req.method === 'GET') {
        const job = repo.get(owner,id);
        if (job.status !== 'succeeded' || !job.result?.output) throw new AppError('EXPORT_NOT_READY');
        await streamFile(req,res,storage.path(job.result.output),'video/mp4',true); return;
      }
    }
    if (!path.startsWith('/api/') && ['GET','HEAD'].includes(req.method ?? '')) {
      const dist = resolve('apps/web/dist'), file = resolve(dist, '.' + decodeURIComponent(path));
      if (!file.startsWith(dist + sep) && file !== dist) throw new AppError('RESOURCE_NOT_FOUND');
      const types: Record<string,string> = {'.js':'text/javascript','.css':'text/css','.html':'text/html','.woff2':'font/woff2','.ttf':'font/ttf','.svg':'image/svg+xml'};
      const ext = extname(file);
      if (ext && types[ext] && await stat(file).then(s=>s.isFile()).catch(()=>false)) {await streamFile(req,res,file,types[ext]); return;}
      res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'");
      await streamFile(req,res,join(dist,'index.html'),'text/html'); return;
    }
    throw new AppError('RESOURCE_NOT_FOUND');
  } catch (error) {
    if (res.headersSent || res.destroyed) return;
    const code = error instanceof AppError ? error.code : error instanceof z.ZodError ? 'INVALID_REQUEST' : 'STORAGE_ERROR';
    const status = code === 'REVISION_CONFLICT' ? 409 : /NOT_FOUND|MISSING_MEDIA/.test(code) ? 404 : /FORBIDDEN/.test(code) ? 403 : code === 'STORAGE_ERROR' ? 500 : 400;
    console.error(JSON.stringify({event:'request-error',requestId,code})); send(res,{error:{code,requestId}},status);
  }
});
server.listen(config.port,config.host,()=>console.log(`Ediretor local API: http://${config.host}:${config.port}`));
for (const signal of ['SIGINT','SIGTERM'] as const) process.on(signal, () => server.close(() => {db.close(); process.exit(0);}));
