import {resolve} from 'node:path';
import {z} from 'zod';
import {assertGraphicsAlpha} from './graphics-alpha';

const file=resolve(z.string().min(1).parse(process.argv[2]));
const frames=z.coerce.number().int().positive().parse(process.argv[3]);
await assertGraphicsAlpha(file,frames);
console.log(JSON.stringify({file,frames,transparentCornerPass:true}));
