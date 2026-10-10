/** Rational frame boundary conversion, adapted from TextCut motion-compiler.ts. */
export interface FrameRate { readonly num: number; readonly den: number }
function checked(rate: FrameRate): void {
  if (![rate.num, rate.den].every(v => Number.isSafeInteger(v) && v > 0)) throw new Error('INVALID_FRAME_RATE');
}
export function usToFrame(us: bigint, rate: FrameRate, rounding: 'floor' | 'ceil' = 'floor'): number {
  checked(rate);
  if (us < 0n) throw new Error('NEGATIVE_TIME');
  const n = us * BigInt(rate.num), d = 1_000_000n * BigInt(rate.den);
  const frame = Number(rounding === 'ceil' ? (n + d - 1n) / d : n / d);
  if (!Number.isSafeInteger(frame)) throw new Error('FRAME_OUT_OF_RANGE');
  return frame;
}
export function frameToUs(frame: number, rate: FrameRate): bigint {
  checked(rate);
  if (!Number.isSafeInteger(frame) || frame < 0) throw new Error('INVALID_FRAME');
  // Ceiling represents the first integer microsecond belonging to this frame.
  const n = BigInt(frame) * 1_000_000n * BigInt(rate.den), d = BigInt(rate.num);
  return (n + d - 1n) / d;
}
