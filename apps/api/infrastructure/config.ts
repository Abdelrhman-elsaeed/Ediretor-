import {resolve} from 'node:path';
import {z} from 'zod';
import {existsSync} from 'node:fs';
import {loadEnvFile} from 'node:process';
if(existsSync('.env.local'))loadEnvFile('.env.local');
const config = z.object({profile: z.literal('local'), port: z.coerce.number().int().min(1024).max(65535), data: z.string().min(1)});
export function localConfig() {
  const value = config.parse({profile: process.env.EDIRETOR_PROFILE ?? 'local', port: process.env.EDIRETOR_PORT ?? 4318, data: process.env.EDIRETOR_DATA ?? '.local/ediretor'});
  return {...value, data: resolve(value.data), owner: 'local-owner', host: '127.0.0.1' as const};
}
