import {native} from './io';

// The template never paints the canvas corner. Check every decoded frame so a
// flattened source video cannot be published as a reusable transparent scene.
export async function assertGraphicsAlpha(file: string, expectedFrames: number): Promise<void> {
  const alpha=await native('ffmpeg',['-v','error','-i',file,'-vf','alphaextract,crop=16:16:0:0','-pix_fmt','gray','-f','rawvideo','-'],600_000);
  if(alpha.length!==expectedFrames*16*16 || alpha.some(value=>value!==0)) {
    throw new Error('GRAPHICS_ALPHA_INVALID: expected transparent canvas corner in every frame');
  }
}
