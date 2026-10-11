import {MultitrackPlayback} from './multitrack-playback';
import type {ProjectDocument} from '../../../../../packages/contracts/src/project';
import {compile} from '../../../../../packages/composition/src/compile';

export class Playback {
  private plan = compile({schemaVersion:1,projectId:'empty',revisionId:'empty',parentRevisionId:null,sequence:{canvas:{width:1920,height:1080},fps:{num:30,den:1},tracks:[{id:'picture',kind:'video'},{id:'sound',kind:'linked-audio'}],clips:[]},assetRefs:[]});
  private signature = '';
  private multiMode=false;
  private multi:MultitrackPlayback;
  constructor(){const owner=this;this.multi=new MultitrackPlayback({get currentUs(){return owner.currentUs;},set currentUs(v){owner.currentUs=v;},get playing(){return owner.playing;},set playing(v){owner.playing=v;},get error(){return owner.error;},set error(v){owner.error=v;},notify:()=>owner.emit()});}
  attachCanvas(canvas:HTMLCanvasElement){this.multiMode=true;return this.multi.attach(canvas);}
  private video?: HTMLVideoElement;
  private activeIndex = -1;
  private raf = 0;
  private seekTarget = 0;
  private listeners = new Set<() => void>();
  private generation = 0;
  currentUs = 0n;
  playing = false;
  error = '';
  get durationUs() {return this.multiMode?this.multi.durationUs:this.plan.durationUs;}
  subscribe = (listener: () => void) => {this.listeners.add(listener); return ()=>{this.listeners.delete(listener);};};
  private emit() {for (const listener of this.listeners) listener();}
  attach(video: HTMLVideoElement): () => void {
    this.video = video;
    const loaded = () => {video.currentTime = this.seekTarget; if (this.playing) void this.safePlay();};
    const failed = () => {this.error='MISSING_MEDIA';this.pause();};
    const ended = () => {this.next();};
    const changed = () => {if (!this.playing) this.emit();};
    video.addEventListener('loadedmetadata',loaded);video.addEventListener('error',failed);video.addEventListener('ended',ended);video.addEventListener('seeked',changed);
    this.seek(this.currentUs);
    return () => {this.pause();video.removeEventListener('loadedmetadata',loaded);video.removeEventListener('error',failed);video.removeEventListener('ended',ended);video.removeEventListener('seeked',changed);video.removeAttribute('src');video.load();this.video=undefined;};
  }
  update(document: ProjectDocument) {
    if(document.schemaVersion===3){this.multiMode=true;this.multi.update(document);return;}
    this.multiMode=false;
    const signature = JSON.stringify([document.sequence,document.assetRefs]);
    if (this.signature === signature) return;
    this.signature=signature; this.pause();this.plan=compile(document);this.activeIndex=-1;this.seek(this.currentUs);
  }
  seek(us: bigint) {
    if(this.multiMode){this.multi.seek(us);return;}
    this.error='';this.currentUs=us < 0n ? 0n : us > this.durationUs ? this.durationUs : us;
    if (!this.plan.segments.length) {this.activeIndex=-1;this.video?.removeAttribute('src');this.emit();return;}
    const index = this.currentUs === this.durationUs ? this.plan.segments.length-1 : this.plan.segments.findIndex(s=>this.currentUs >= s.sequenceStartUs && this.currentUs < s.sequenceStartUs+s.durationUs);
    const segment = this.plan.segments[index];
    if (!segment) return;
    this.seekTarget=Number(segment.sourceInUs + this.currentUs-segment.sequenceStartUs)/1_000_000;
    if (this.currentUs === this.durationUs) {this.seekTarget=Math.max(0,this.seekTarget-1/30);this.pause();}
    const video = this.video;
    if (video) {
      const source=`/api/assets/${segment.asset.projectId}/${segment.asset.id}/proxy`;
      if (video.getAttribute('src') !== source || video.error) {video.src=source;video.load();}
      else if (video.readyState >= 1) {video.currentTime=this.seekTarget;}
    }
    this.activeIndex=index;this.emit();
  }
  private async safePlay() {
    const generation = ++this.generation;
    try {await this.video?.play();} catch (e) {if(generation === this.generation && this.playing && !(e instanceof DOMException && e.name==='AbortError')) {this.error='PREVIEW_UNAVAILABLE';this.pause();}}
  }
  toggle() {if(this.playing)this.pause();else this.play();}
  play() {
    if(this.multiMode){void this.multi.play();return;}
    if(!this.plan.segments.length || !this.video)return;
    if(this.currentUs >= this.durationUs)this.seek(0n);
    this.playing=true;void this.safePlay();this.emit();cancelAnimationFrame(this.raf);this.tick();
  }
  pause() {if(this.multiMode){this.multi.pause();this.emit();return;}this.playing=false;++this.generation;this.video?.pause();cancelAnimationFrame(this.raf);this.emit();}
  private next() {
    const next=this.plan.segments[this.activeIndex+1];
    if(next)this.seek(next.sequenceStartUs);else {this.currentUs=this.durationUs;this.pause();}
    if(this.playing)void this.safePlay();
  }
  private tick = () => {
    if(!this.playing)return;
    const segment=this.plan.segments[this.activeIndex], video=this.video;
    if(segment && video?.readyState && !video.seeking) {
      const sourceUs=BigInt(Math.round(video.currentTime*1_000_000));
      if(sourceUs >= segment.sourceInUs+segment.durationUs)this.next();
      else {this.currentUs=segment.sequenceStartUs+(sourceUs-segment.sourceInUs);if(this.currentUs<0n)this.currentUs=0n;this.emit();}
    }
    if(this.playing)this.raf=requestAnimationFrame(this.tick);
  };
}
