import {expect,it} from 'vitest';
import snapshots from '../generated/snapshots.json';
import {parseSnapshot,compile} from './contract';
it('retains the full workloads and sparse placements',()=>{
  const q05=parseSnapshot(snapshots.find(s=>s.fixture==='Q05'));
  const q06=parseSnapshot(snapshots.find(s=>s.fixture==='Q06'));
  expect(compile(q05).durationInFrames).toBe(108000);
  expect(q05.cutCount).toBe(500);expect(q05.clips).toHaveLength(501);expect(q05.graphics).toHaveLength(100);
  expect(compile(q06).durationInFrames).toBe(432000);expect(q06.graphics).toHaveLength(2);
  expect(Number(q06.graphics[1]!.startUs)-Number(q06.graphics[0]!.endUs)).toBeGreaterThan(14_000_000_000);
});
it('rejects unknown fields, rates, missing assets and inconsistent timing',()=>{
  const s=parseSnapshot(snapshots[0]);
  expect(()=>parseSnapshot({...s,extra:true})).toThrow();
  expect(()=>parseSnapshot({...s,clips:s.clips.map(c=>({...c,rate:2}))})).toThrow();
  expect(()=>parseSnapshot({...s,assets:[]})).toThrow();
  expect(()=>parseSnapshot({...s,durationUs:'1'})).toThrow();
  expect(()=>parseSnapshot({...s,clips:s.clips.map(c=>({...c,id:'duplicate'}))})).toThrow();
});
