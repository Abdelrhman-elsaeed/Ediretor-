import {it,expect} from 'vitest';
import {native} from './native-media';

it('cancellation stops a real native process before completion and reports no successful result',async()=>{
  const controller=new AbortController(),started=Date.now();
  const timer=setTimeout(()=>controller.abort(),200);
  try {
    await expect(native('ffmpeg',['-v','error','-re','-f','lavfi','-i','color=s=64x64:r=30:d=10','-f','null','-','-progress','pipe:1'],controller.signal)).rejects.toThrow('CANCELLED');
    expect(Date.now()-started).toBeLessThan(3000);
  } finally {clearTimeout(timer);}
});
