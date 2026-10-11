import {frameToUs,usToFrame} from '../../../../../packages/domain/src/time/frames';
export const frameRate = {num:30,den:1};
export function formatTime(us: bigint, frames = false): string {
  const frame = usToFrame(us < 0n ? 0n : us,frameRate), total = Math.floor(frame / 30);
  const pieces = [Math.floor(total / 3600), Math.floor(total / 60) % 60,total % 60].map(v=>String(v).padStart(2,'0'));
  return pieces.join(':') + (frames ? ':' + String(frame % 30).padStart(2,'0') : '');
}
export function snapUs(value: number): bigint {return frameToUs(Math.max(0,Math.round(value / 1_000_000 * 30)),frameRate);}
export function inputUs(value: string): bigint | null {
  if (!/^\d+(?:\.\d{1,6})?$/.test(value)) return null;
  const [seconds = '0',fraction = ''] = value.split('.');
  return BigInt(seconds) * 1_000_000n + BigInt(fraction.padEnd(6,'0'));
}
