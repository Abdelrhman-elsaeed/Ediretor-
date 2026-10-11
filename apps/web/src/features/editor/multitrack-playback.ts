import type {ProjectDocument} from '../../../../../packages/contracts/src/project';
import {activeClips,visualLayers,audioGain} from '../../../../../packages/composition/src/multitrack';
import {durationUs} from '../../../../../packages/domain/src/project/kernel';

interface Surface {currentUs:bigint;playing:boolean;error:string;notify:()=>void;}
type Media={video:HTMLVideoElement;gain?:GainNode;ready:()=>void};
export class MultitrackPlayback {
  document?:ProjectDocument;canvas?:HTMLCanvasElement;private pool=new Map<string,Media>();private context?:AudioContext;private raf=0;private last=0;private seeking=false;
  constructor(private surface:Surface){}
  get durationUs(){return this.document?durationUs(this.document):0n;}
  attach(canvas:HTMLCanvasElement){this.canvas=canvas;this.render();return ()=>{this.pause();this.canvas=undefined;this.clear();};}
  update(d:ProjectDocument){this.pause();this.document=d;
    const keys=new Set(d.sequence.clips.map(c=>`${c.trackId}:${c.assetId}`));
    for(const [key,m] of this.pool)if(!keys.has(key)){m.video.pause();m.video.removeAttribute('src');m.video.load();m.gain?.disconnect();this.pool.delete(key);}
    this.seek(this.surface.currentUs);
  }
  clear(){for(const m of this.pool.values()){m.video.pause();m.video.removeAttribute('src');m.video.load();m.gain?.disconnect();}this.pool.clear();void this.context?.close();this.context=undefined;}
  private ensure(key:string,assetId:string){let m=this.pool.get(key);if(m)return m;const video=document.createElement('video');video.preload='auto';video.playsInline=true;video.src=`/api/assets/${this.document!.projectId}/${assetId}/proxy`;const ready=()=>{this.render();};video.addEventListener('loadeddata',ready);video.addEventListener('seeked',ready);video.addEventListener('error',()=>{this.surface.error='MISSING_MEDIA';this.pause();this.surface.notify();});m={video,ready};this.pool.set(key,m);return m;}
  seek(us:bigint){this.surface.currentUs=us<0n?0n:us>this.durationUs?this.durationUs:us;this.surface.error='';this.seeking=true;this.render();this.seeking=false;this.last=performance.now();this.surface.notify();}
  async play(){if(!this.document||!this.durationUs)return;if(this.surface.currentUs>=this.durationUs)this.seek(0n);this.context??=new AudioContext();this.surface.playing=true;this.last=performance.now();this.tick();this.surface.notify();void this.context.resume();}
  pause(){this.surface.playing=false;cancelAnimationFrame(this.raf);for(const m of this.pool.values())m.video.pause();}
  private tick=()=>{if(!this.surface.playing)return;const now=performance.now(),ready=[...this.pool.values()].every(m=>m.video.readyState>=2&&!m.video.seeking);
    this.surface.currentUs+=BigInt(Math.round((now-this.last)*1000));this.last=now;
    if(this.surface.currentUs>=this.durationUs){this.surface.currentUs=this.durationUs;this.pause();}
    this.render();this.surface.notify();if(this.surface.playing)this.raf=requestAnimationFrame(this.tick);
  };
  private render(){const d=this.document,canvas=this.canvas;if(!d||!canvas)return;const context=canvas.getContext('2d');if(!context)return;canvas.width!==d.sequence.canvas.width&&(canvas.width=d.sequence.canvas.width);canvas.height!==d.sequence.canvas.height&&(canvas.height=d.sequence.canvas.height);
    const us=this.surface.currentUs===this.durationUs&&this.durationUs>0n?this.durationUs-33_334n:this.surface.currentUs,active=activeClips(d,us),keys=new Set<string>();
    for(const c of active){const key=`${c.trackId}:${c.assetId}`,m=this.ensure(key,c.assetId);keys.add(key);const desired=Number(BigInt(c.sourceInUs)+us-BigInt(c.sequenceStartUs))/1e6;
      if(m.video.readyState>=1&&!m.video.seeking&&(this.seeking||Math.abs(m.video.currentTime-desired)>.035))m.video.currentTime=desired;
      if(this.context&&!m.gain){m.gain=this.context.createGain();this.context.createMediaElementSource(m.video).connect(m.gain).connect(this.context.destination);}
      const gain=audioGain(d,c,us);if(m.gain)m.gain.gain.setValueAtTime(gain,this.context!.currentTime);else m.video.volume=Math.min(1,gain);
      if(this.surface.playing&&m.video.paused&&m.video.readyState>=2)void m.video.play().catch(e=>{if(e.name!=='AbortError'){this.surface.error='PREVIEW_UNAVAILABLE';this.pause();this.surface.notify();}});
    }
    for(const [key,m] of this.pool)if(!keys.has(key)){m.video.pause();if(m.gain)m.gain.gain.value=0;else m.video.volume=0;}
    context.fillStyle='#000';context.fillRect(0,0,canvas.width,canvas.height);
    for(const l of visualLayers(d,us)){const m=this.pool.get(`${l.clip.trackId}:${l.clip.assetId}`),v=m?.video,x=l.transform;if(!v||v.readyState<2)continue;context.globalAlpha=l.opacity;context.drawImage(v,x.cropX*v.videoWidth,x.cropY*v.videoHeight,x.cropWidth*v.videoWidth,x.cropHeight*v.videoHeight,x.x*canvas.width,x.y*canvas.height,x.width*canvas.width,x.height*canvas.height);}
    context.globalAlpha=1;
  }
}
