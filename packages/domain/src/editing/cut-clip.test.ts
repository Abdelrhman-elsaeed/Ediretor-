import {expect,it} from 'vitest';
import fc from 'fast-check';
import {cutClip,sequenceToSource} from './cut-clip';
import {micros,microsFromMillis,microsFromSeconds} from '../time/micros';
import {timeInterval} from '../interval/time-interval';
import {frameToUs,usToFrame} from '../time/frames';
it('cuts one occurrence without mutating the source or swallowing a 1us gap',()=>{
  const original=Object.freeze({id:'a',assetId:'source',sourceInUs:100n,sequenceStartUs:200n,durationUs:1000n});
  const cuts=[timeInterval(micros(100n),micros(200n)),timeInterval(micros(201n),micros(300n))];
  const result=cutClip(original,cuts,'cmd');
  expect(result.map(c=>c.durationUs)).toEqual([100n,1n,700n]);
  expect(result.map(c=>c.sourceInUs)).toEqual([100n,300n,400n]);
  expect(result.map(c=>c.sequenceStartUs)).toEqual([200n,300n,301n]);
  expect(new Set(result.map(c=>c.id)).size).toBe(3);
  expect(sequenceToSource(result[1]!,300n)).toBe(300n);
  expect(sequenceToSource(result[1]!,301n)).toBeNull();
  expect(original.durationUs).toBe(1000n);
});
it('maps rational frames without drift for four hours and beyond',()=>{
  fc.assert(fc.property(fc.integer({min:0,max:10_000_000}),frame=>{
    const rate={num:30000,den:1001};
    expect(usToFrame(frameToUs(frame,rate),rate)).toBe(frame);
  }),{seed:42,numRuns:1000});
});
it('rejects unsafe boundary conversions and negative sub-microseconds',()=>{
  expect(()=>microsFromMillis(Number.MAX_SAFE_INTEGER+1)).toThrow();
  expect(()=>microsFromSeconds(-0.0000001)).toThrow();
  expect(()=>usToFrame(1n,{num:0,den:1})).toThrow();
});
