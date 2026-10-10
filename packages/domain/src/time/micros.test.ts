import { describe, expect, it } from 'vitest';

import {
  InvalidMicrosError,
  MICROS_PER_SECOND,
  micros,
  microsFromMillis,
  microsFromSeconds,
  microsToSeconds,
} from './micros';

describe('micros', () => {
  it('accepts zero and positive positions', () => {
    expect(micros(0n)).toBe(0n);
    expect(micros(46_200_000n)).toBe(46_200_000n);
  });

  it('rejects negative positions', () => {
    expect(() => micros(-1n)).toThrow(InvalidMicrosError);
  });

  it('preserves values far beyond Number.MAX_SAFE_INTEGER', () => {
    // Correction section 9: no JavaScript `number` for persisted microseconds.
    // 2^53 microseconds is ~285 years; the guard is against silent precision
    // loss in arithmetic, which this asserts directly.
    const beyondSafe = BigInt(Number.MAX_SAFE_INTEGER) + 1n;
    const value = micros(beyondSafe);

    expect(value + 1n).toBe(beyondSafe + 1n);
    expect(value + 1n).not.toBe(value);
  });
});

describe('microsFromMillis', () => {
  it('converts whole milliseconds', () => {
    expect(microsFromMillis(1_500)).toBe(1_500_000n);
  });

  it('rejects fractional milliseconds rather than rounding silently', () => {
    expect(() => microsFromMillis(12.5)).toThrow(InvalidMicrosError);
  });
});

describe('microsFromSeconds', () => {
  it('converts fractional seconds at the external boundary', () => {
    expect(microsFromSeconds(1.5)).toBe(1_500_000n);
  });

  it('truncates toward zero so a position never lands after its subject', () => {
    expect(microsFromSeconds(0.0000019)).toBe(1n);
  });

  it('rejects non-finite input', () => {
    expect(() => microsFromSeconds(Number.NaN)).toThrow(InvalidMicrosError);
    expect(() => microsFromSeconds(Number.POSITIVE_INFINITY)).toThrow(InvalidMicrosError);
  });

  it('round-trips a player position within one microsecond', () => {
    const original = 12.345678;
    const roundTripped = microsToSeconds(microsFromSeconds(original));

    expect(Math.abs(roundTripped - original)).toBeLessThanOrEqual(1 / Number(MICROS_PER_SECOND));
  });
});
