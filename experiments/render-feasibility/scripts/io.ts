import {spawn} from 'node:child_process';
import {createReadStream} from 'node:fs';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {z} from 'zod';
export const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
export const harness = resolve(root,'experiments/render-feasibility');
export const publicDir = resolve(harness,'public');
export async function json(path: string, value: unknown) {
  await mkdir(dirname(path),{recursive:true}); await writeFile(path,JSON.stringify(value,null,2)+'\n');
}
export async function hash(path: string): Promise<string> {
  const h=createHash('sha256'); for await(const chunk of createReadStream(path)) h.update(chunk); return h.digest('hex');
}
export async function native(exe: string, args: string[], timeoutMs=120_000): Promise<Buffer> {
  return new Promise((resolve,reject)=>{
    const child=spawn(exe,args,{windowsHide:true,stdio:['ignore','pipe','pipe']});
    const out: Buffer[]=[]; let errors=''; let size=0;
    const timer=setTimeout(()=>{child.kill(); reject(new Error(`NATIVE_TIMEOUT:${exe}`));},timeoutMs);
    child.stdout.on('data',(b: Buffer)=>{size+=b.length;if(size>128*1024*1024){child.kill();reject(new Error('OUTPUT_LIMIT'));}else out.push(b);});
    child.stderr.on('data',(b: Buffer)=>{errors=(errors+b.toString()).slice(-16000);});
    child.once('error',e=>{clearTimeout(timer);reject(e);});
    child.once('close',code=>{clearTimeout(timer);if(code!==0)reject(new Error(`${exe}:${code}: ${errors}`));else resolve(Buffer.concat(out));});
  });
}
export const probeSchema=z.object({streams:z.array(z.object({codec_type:z.string(),codec_name:z.string().optional(),width:z.number().optional(),height:z.number().optional(),r_frame_rate:z.string().optional(),avg_frame_rate:z.string().optional(),time_base:z.string().optional(),start_time:z.string().optional(),duration:z.string().optional(),nb_frames:z.string().optional(),sample_rate:z.string().optional()})),format:z.object({duration:z.string()})});
export async function probe(file:string) {return probeSchema.parse(JSON.parse((await native('ffprobe',['-v','error','-show_streams','-show_format','-of','json',file])).toString()));}
export async function loadJson(path:string):Promise<unknown>{return JSON.parse(await readFile(path,'utf8'));}
