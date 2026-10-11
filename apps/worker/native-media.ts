import {spawn} from 'node:child_process';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {z} from 'zod';
import {AppError} from '../../packages/contracts/src/project';

/** No shell; native decoding and encoding run outside the browser/API event loop. */
export async function native(executable: string, args: string[], signal: AbortSignal, progress?: (outTimeUs: number) => void): Promise<string> {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']});
    let out = '', errors = '', pending = '';
    const abort = () => child.kill();
    signal.addEventListener('abort', abort, {once: true});
    child.stdout.on('data', (buffer: Buffer) => {
      const text = buffer.toString();
      if (!progress) {out += text; if (out.length > 2_000_000) child.kill();}
      else {
        pending += text;
        const lines = pending.split('\n'); pending = lines.pop() ?? '';
        for (const line of lines) if (line.startsWith('out_time_us=')) {
          const us = Number(line.slice(12)); if (Number.isFinite(us) && us >= 0) progress(us);
        }
      }
    });
    child.stderr.on('data', (buffer: Buffer) => {errors = (errors + buffer.toString()).slice(-4000);});
    child.once('error', () => {signal.removeEventListener('abort', abort); reject(new AppError('MEDIA_TOOLS_UNAVAILABLE'));});
    child.once('close', code => {
      signal.removeEventListener('abort', abort);
      if (signal.aborted) reject(new AppError('CANCELLED'));
      else if (code !== 0) {console.error(JSON.stringify({event: 'native-failure', executable, code, detail: errors.slice(-1000)})); reject(new AppError('MEDIA_PROCESSING_FAILED'));}
      else resolve(out);
    });
  });
}
export async function hashFile(path: string, signal: AbortSignal): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path, {signal})) hash.update(chunk);
  return hash.digest('hex');
}
const probeSchema = z.object({streams: z.array(z.object({codec_type: z.string(), width: z.number().optional(), height: z.number().optional(), avg_frame_rate: z.string().optional(), nb_frames: z.string().optional()})), format: z.object({duration: z.string().optional()})});
export async function probe(path: string, signal: AbortSignal) {
  return probeSchema.parse(JSON.parse(await native('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', path], signal)));
}
