import {z} from 'zod';
import {AppError, jobSchema, projectSchema, summarySchema, type SaveRequest} from '../../../../packages/contracts/src/project';
export async function request<T>(path: string, schema: z.ZodType<T>, options?: RequestInit): Promise<T> {
  let response: Response;
  try {response = await fetch(path, options);} catch {throw new AppError('CONNECTION_LOST');}
  const body: unknown = await response.json();
  if (!response.ok) {
    const error = z.object({error:z.object({code:z.string()})}).safeParse(body);
    throw new AppError(error.success ? error.data.error.code : 'REQUEST_FAILED');
  }
  return schema.parse(body);
}
const post = (body: unknown): RequestInit => ({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
export const api = {
  list: (search = '', offset = 0) => request(`/api/projects?search=${encodeURIComponent(search)}&offset=${offset}`,z.object({items:z.array(summarySchema),more:z.boolean()})),
  create: (name: string) => request('/api/projects',projectSchema,post({name})),
  load: (id: string) => request(`/api/projects/${id}`,projectSchema),
  save: (id: string, input: SaveRequest) => request(`/api/projects/${id}/save`,projectSchema,post(input)),
  jobs: (id: string) => request(`/api/projects/${id}/jobs`,z.array(jobSchema)),
  job: (id: string) => request(`/api/jobs/${id}`,jobSchema),
  cancel: (id: string) => request(`/api/jobs/${id}/cancel`,jobSchema,post({})),
  retry: (id: string) => request(`/api/jobs/${id}/retry`,jobSchema,post({})),
  export: (id: string, revisionId: string) => request(`/api/projects/${id}/export`,jobSchema,post({revisionId})),
  transcribe:(id:string,assetId:string,language:'ar-EG'|'ar'|'en',requestId:string)=>request(`/api/projects/${id}/transcribe`,jobSchema,post({assetId,language,requestId})),
  health: () => request('/api/health',z.object({mediaTools:z.boolean(),profile:z.literal('local'),transcriptionAvailable:z.boolean().optional(),captionRuntime:z.string().nullable().optional()})),
};
/** Upload progress comes from actual bytes transmitted; processing is a separate durable job. */
export function upload(projectId: string, file: File, signal: AbortSignal, progress: (value: number) => void) {
  return new Promise<z.infer<typeof jobSchema>>((resolve,reject) => {
    const xhr = new XMLHttpRequest(), abort = () => xhr.abort();
    signal.throwIfAborted();
    signal.addEventListener('abort',abort,{once:true});
    const cleanup = () => signal.removeEventListener('abort',abort);
    xhr.open('POST',`/api/projects/${projectId}/import?name=${encodeURIComponent(file.name)}`);
    xhr.setRequestHeader('Content-Type','application/octet-stream');
    xhr.upload.onprogress = e => {if (e.lengthComputable) progress(e.loaded / e.total);};
    xhr.onerror = () => {cleanup(); reject(new AppError('CONNECTION_LOST'));};
    xhr.onabort = () => {cleanup(); reject(new AppError('CANCELLED'));};
    xhr.onload = () => {
      cleanup();
      try {
        const body: unknown = JSON.parse(xhr.responseText);
        if (xhr.status >= 400) {
          const error = z.object({error:z.object({code:z.string()})}).parse(body); reject(new AppError(error.error.code));
        } else resolve(jobSchema.parse(body));
      } catch {reject(new AppError('REQUEST_FAILED'));}
    };
    xhr.send(file);
  });
}
