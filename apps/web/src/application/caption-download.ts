import {z} from 'zod';
import {AppError} from '../../../../packages/contracts/src/project';
import type {ProjectSession} from './project-session';

/** Both caption entry points export the same saved revision. */
export async function downloadCaptions(session:ProjectSession,format:'srt'|'vtt'){
  await session.flush();const project=session.snapshot().project;
  let response:Response;
  try{response=await fetch(`/api/projects/${project.id}/captions?revisionId=${project.revisionId}&format=${format}`);}catch{throw new AppError('CONNECTION_LOST');}
  if(!response.ok){const error=z.object({error:z.object({code:z.string()})}).safeParse(await response.json());throw new AppError(error.success?error.data.error.code:'REQUEST_FAILED');}
  const url=URL.createObjectURL(await response.blob()),link=document.createElement('a');link.href=url;link.download=`ediretor-captions.${format}`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
