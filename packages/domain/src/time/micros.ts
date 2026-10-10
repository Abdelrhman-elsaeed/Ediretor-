/**
 * Media time primitives.
 *
 * Constitution Article III: all internal media time is integer microseconds.
 * Floating-point seconds are permitted only at external API or player
 * boundaries and must be converted at a single audited boundary — the
 * conversion helpers at the bottom of this file are that boundary.
 *
 * `bigint` rather than `number` is deliberate. A 64-bit microsecond value
 * exceeds `Number.MAX_SAFE_INTEGER` (2^53 - 1) after roughly 285 years, but the
 * real motivation is that `number` silently permits fractional and
 * precision-losing arithmetic on values that must stay exact.
 */

/** Microseconds per millisecond. */
export const MICROS_PER_MILLI = 1_000n;

/** Microseconds per second. */
export const MICROS_PER_SECOND = 1_000_000n;

/**
 * A point on a media timeline, in whole microseconds.
 *
 * The brand prevents an arbitrary `bigint` (a byte count, a database row id)
 * from being passed where a timeline position is required. It carries no
 * runtime cost.
 */
export type Micros = bigint & { readonly __brand: 'Micros' };

/** Thrown when a value cannot represent a valid microsecond position. */
export class InvalidMicrosError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'InvalidMicrosError';
  }
}

/**
 * Constructs a `Micros` from a `bigint`, rejecting negative positions.
 *
 * Media positions are non-negative. A container may report a non-zero start
 * time, but that start time is itself a non-negative offset.
 */
export function micros(value: bigint): Micros {
  if (value < 0n) {
    throw new InvalidMicrosError(`Media time must not be negative, received ${value}.`);
  }
  return value as Micros;
}

/** The zero position on a timeline. */
export const ZERO_MICROS: Micros = micros(0n);

/**
 * Converts whole milliseconds to microseconds.
 *
 * Rejects fractional input rather than rounding, because a caller passing
 * `12.5` has a unit error that silent rounding would hide.
 */
export function microsFromMillis(millis: number): Micros {
  if (!Number.isSafeInteger(millis)) {
    throw new InvalidMicrosError(`Expected whole milliseconds, received ${millis}.`);
  }
  return micros(BigInt(millis) * MICROS_PER_MILLI);
}

/**
 * Converts seconds to microseconds at an external boundary.
 *
 * Player and provider APIs report fractional seconds. Truncation toward zero is
 * chosen over rounding so a converted position never lands after the frame or
 * word it describes.
 */
export function microsFromSeconds(seconds: number): Micros {
  if (!Number.isFinite(seconds) || seconds < 0 || !Number.isSafeInteger(Math.trunc(seconds * Number(MICROS_PER_SECOND)))) {
    throw new InvalidMicrosError(`Expected a finite seconds value, received ${seconds}.`);
  }
  return micros(BigInt(Math.trunc(seconds * Number(MICROS_PER_SECOND))));
}

/**
 * Converts microseconds to fractional seconds for a player or provider.
 *
 * Lossy by nature, so this is only for the outbound boundary. Never feed the
 * result back into domain arithmetic.
 */
export function microsToSeconds(value: Micros): number {
  return Number(value) / Number(MICROS_PER_SECOND);
}
