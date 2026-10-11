import {describe,it,expect,vi} from 'vitest';
import {DeepgramProvider,normalizeChunks,speechChunks} from './deepgram';
const response=(words:unknown[])=>({metadata:{request_id:'request',model_info:{one:{version:'2026-test'}}},results:{channels:[{alternatives:[{words}]}],utterances:[]}});
const word=(text:string,start:number,end:number)=>({word:text,start,end,confidence:.8});
describe('Deepgram provider boundary',()=>{
  it('submits actual WAV bytes with explicit Arabic options; returns unmodified raw response',async()=>{
    const raw=response([word('أهلا',1,2)]),transport=vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(raw)));
    const result=await new DeepgramProvider('server-secret',transport).transcribe(new Uint8Array([1,2]),{model:'nova-3',language:'ar-EG'},AbortSignal.timeout(5000));expect(result).toEqual(raw);
    expect(String(transport.mock.calls[0]![0])).toContain('language=ar-EG');expect(transport.mock.calls[0]![1]?.headers).toMatchObject({Authorization:'Token server-secret'});
  });
  it('fails unavailable and invalid credentials without retries or secret leakage',async()=>{
    const transport=vi.fn<typeof fetch>().mockResolvedValue(new Response('no',{status:401}));
    await expect(new DeepgramProvider('',transport).transcribe(new Uint8Array(),{},AbortSignal.timeout(5000))).rejects.toThrow('TRANSCRIPTION_UNAVAILABLE');
    await expect(new DeepgramProvider('private',transport).transcribe(new Uint8Array(),{},AbortSignal.timeout(5000))).rejects.toThrow('TRANSCRIPTION_CREDENTIALS');expect(transport).toHaveBeenCalledTimes(1);
  });
  it('bounds retryable failures to three requests',async()=>{
    const transport=vi.fn<typeof fetch>().mockImplementation(async()=>new Response('busy',{status:503}));
    await expect(new DeepgramProvider('key',transport).transcribe(new Uint8Array(),{},AbortSignal.timeout(5000))).rejects.toThrow('TRANSCRIPTION_PROVIDER_FAILED');expect(transport).toHaveBeenCalledTimes(3);
  });
  it('passes cancellation to the underlying provider fetch',async()=>{
    const controller=new AbortController(),transport=vi.fn<typeof fetch>().mockImplementation(async(_url,init)=>{controller.abort();expect(init?.signal?.aborted).toBe(true);throw new Error('aborted');});
    await expect(new DeepgramProvider('key',transport).transcribe(new Uint8Array(),{},controller.signal)).rejects.toThrow('CANCELLED');expect(transport).toHaveBeenCalledTimes(1);
  });
  it('normalizes silence as zero words, retains provenance and validates invalid timestamps',()=>{
    const chunk=speechChunks(10000000n)[0]!;expect(normalizeChunks('t',10000000n,[{chunk,response:response([])}]).words).toEqual([]);
    expect(()=>normalizeChunks('t',10000000n,[{chunk,response:response([word('x',5,4)])}])).toThrow('TRANSCRIPT_INVALID');
  });
  it('uses global offsets and overlap ownership without duplicating a boundary word',()=>{
    const [a,b]=speechChunks(240000000n),results=normalizeChunks('t',240000000n,[{chunk:a!,response:response([word('قبل',119,119.5),word('الحد',119.8,120.2)])},{chunk:b!,response:response([word('الحد',.8,1.2),word('بعد',2,2.5)])}]);
    expect(results.words.map(w=>[w.text,w.startUs])).toEqual([['قبل','119000000'],['الحد','119800000'],['بعد','121000000']]);expect(results.modelVersions).toEqual(['2026-test']);
  });
  it('records a bounded provider end overshoot and instantaneous-word repair without changing raw response',()=>{
    const raw=response([word('أهلا',1,1),word('بخير',9,10.86)]),chunk=speechChunks(10000000n)[0]!,before=JSON.stringify(raw),result=normalizeChunks('t',10000000n,[{chunk,response:raw}]);
    expect(result.words[0]).toMatchObject({startUs:'1000000',endUs:'1001000',reportedEndUs:'1000000',timingAdjustment:'minimum-span'});expect(result.words[1]).toMatchObject({endUs:'10000000',reportedEndUs:'10860000',timingAdjustment:'source-end'});expect(JSON.stringify(raw)).toBe(before);
    expect(()=>normalizeChunks('t',10000000n,[{chunk,response:response([word('خاطئ',9,13)])}])).toThrow('TRANSCRIPT_INVALID');
  });
  it('accepts a real multi-chunk trailing word that extends 1.106 seconds past the source, retaining the reported end for review',()=>{
    const duration=161287696n,[a,b]=speechChunks(duration);
    const result=normalizeChunks('t',duration,[{chunk:a!,response:response([word('الحسبه',119.17,120.05),word('لكل',120.05,123.090004)])},{chunk:b!,response:response([word('الحسبه',.24,.96),word('لكل',.96,1.76),word('حد',41.473625,43.393623)])}]);
    expect(result.words.map(w=>w.text)).toEqual(['الحسبه','لكل','حد']);
    expect(result.words.at(-1)).toMatchObject({startUs:'160473625',endUs:'161287696',reportedEndUs:'162393623',timingAdjustment:'source-end'});
    expect(()=>normalizeChunks('t',duration,[{chunk:b!,response:response([word('خارج',42.3,42.5)])}])).toThrow('TRANSCRIPT_INVALID');
  });
  it('preserves repeated spoken words within one chunk, even when their acoustics overlap',()=>{
    const result=normalizeChunks('t',10000000n,[{chunk:speechChunks(10000000n)[0]!,response:response([word('لا',1,1.5),word('لا',1.4,1.8)])}]);expect(result.words).toHaveLength(2);expect(result.words[0]!.id).not.toBe(result.words[1]!.id);
  });
});
