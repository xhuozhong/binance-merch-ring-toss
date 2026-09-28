/* Lucky Loop — user-provided MP3 background music and original synthesized game effects. */
(function (global) {
  'use strict';
  const MUSIC_LEVEL=.20,SFX_LEVEL=.58,MASTER_LEVEL=.72;
  const MAX_MUSIC_VOICES=18,MAX_SFX_VOICES=10,MAX_VOICES=28;
  const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
  const hz=midi=>440*Math.pow(2,(midi-69)/12);
  const sourceUrl=()=>typeof global.LuckyBGMSource==='string'&&global.LuckyBGMSource.trim()?global.LuckyBGMSource:'./game-bgm.mp3';
  const publicSource=url=>url.startsWith('data:')?'embedded audio (data URI)':url;
  function smooth(param, value, now, seconds) {
    try {
      if (typeof param.cancelAndHoldAtTime === 'function') param.cancelAndHoldAtTime(now);
      else { param.cancelScheduledValues(now); param.setValueAtTime(param.value, now); }
      param.linearRampToValueAtTime(value, now + (seconds || .025));
    } catch (_) { param.value = value; }
  }

  function createRig(context, offline) {
    const music = context.createGain(), sfx = context.createGain(), master = context.createGain();
    const limiter = context.createDynamicsCompressor();
    music.gain.value = MUSIC_LEVEL*.72; sfx.gain.value = SFX_LEVEL; master.gain.value = MASTER_LEVEL;
    limiter.threshold.value = -10; limiter.knee.value = 16; limiter.ratio.value = 5;
    limiter.attack.value = .004; limiter.release.value = .16;
    music.connect(master); sfx.connect(master); master.connect(limiter); limiter.connect(context.destination);
    const voices = new Set();
    let peakVoices = 0, peakNodes = 4, stolenVoices = 0;
    const noise = context.createBuffer(1, Math.ceil(context.sampleRate*.5), context.sampleRate);
    const channel = noise.getChannelData(0); let seed = 73021, previous = 0;
    for (let i=0;i<channel.length;i++) {
      seed = (seed*1664525+1013904223) >>> 0;
      const white = seed/2147483648-1;
      previous = previous*.55+white*.45; channel[i] = previous;
    }
    function cleanup(voice) {
      if (voice.cleaned) return;
      voice.cleaned = true; voices.delete(voice);
      voice.nodes.forEach(node => { try { node.disconnect(); } catch (_) {} });
    }
    function release(voice, immediate) {
      if (voice.cleaned) return;
      const now=context.currentTime;
      if (!immediate) smooth(voice.envelope.gain, 0, now, .018);
      voice.sources.forEach(source => { try { source.stop(now+(immediate?0:.023)); } catch (_) {} });
      if (immediate) cleanup(voice);
    }
    function reserve(group) {
      // Offline contexts enqueue an entire score before rendering; their future voices do not overlap yet.
      if (offline) return;
      const limit = group==='music' ? MAX_MUSIC_VOICES : MAX_SFX_VOICES;
      const same = Array.from(voices).filter(v => v.group===group && !v.cleaned);
      if (same.length>=limit) { release(same[0],true); stolenVoices++; }
      if (voices.size>=MAX_VOICES) {
        const victim = Array.from(voices).find(v=>v.group==='music') || voices.values().next().value;
        if (victim) { release(victim,true); stolenVoices++; }
      }
    }
    function register(group, sources, envelope, nodes, end) {
      const voice = { group, sources, envelope, nodes, end, cleaned:false, ended:0 };
      sources.forEach(source => { source.onended = () => { voice.ended++; if(voice.ended>=sources.length)cleanup(voice); }; });
      voices.add(voice); peakVoices=Math.max(peakVoices,voices.size);
      peakNodes=Math.max(peakNodes,4+Array.from(voices).reduce((n,v)=>n+v.nodes.length,0));
      return voice;
    }
    function note(event, time, group) {
      reserve(group);
      const start=Math.max(time,context.currentTime+.002), duration=Math.max(.055,event.duration||.3);
      const kind=event.kind || 'mallet', bass=kind==='bass', pluck=kind==='pluck', chip=kind==='chip', kick=kind==='kick', end=start+duration+.12;
      const envelope=context.createGain(), filter=context.createBiquadFilter();
      filter.type='lowpass'; filter.frequency.value=bass?680:(kick?420:(chip?1800:(pluck?3200:(kind==='piano'?2200:2600)))); filter.Q.value=.45;
      if(pluck){filter.frequency.setValueAtTime(3200,start);filter.frequency.exponentialRampToValueAtTime(1000,start+duration);}
      envelope.gain.setValueAtTime(0,start);
      envelope.gain.linearRampToValueAtTime(event.level||.08,start+(kick?.006:(bass?.022:(pluck?.009:.014))));
      envelope.gain.exponentialRampToValueAtTime(Math.max(.00012,(event.level||.08)*.19),start+duration*.55);
      envelope.gain.exponentialRampToValueAtTime(.0001,start+duration);
      envelope.gain.linearRampToValueAtTime(0,end);
      const fundamental=context.createOscillator(), frequency=event.frequency||hz(event.midi||72);
      fundamental.type=(bass||pluck)?'triangle':(chip?'square':'sine'); fundamental.frequency.setValueAtTime(frequency,start);
      if(event.endFrequency)fundamental.frequency.exponentialRampToValueAtTime(Math.max(25,event.endFrequency),start+duration);
      const sources=[fundamental],nodes=[fundamental,filter,envelope];
      fundamental.connect(filter);
      if (!bass && !chip && !kick && kind!=='sweep') {
        const overtone=context.createOscillator(), partial=context.createGain();
        overtone.type='sine'; overtone.frequency.value=frequency*(pluck?3:2); partial.gain.value=pluck?.065:(kind==='piano'?.12:.07);
        overtone.connect(partial).connect(filter); sources.push(overtone); nodes.push(overtone,partial);
      }
      filter.connect(envelope).connect(group==='music'?music:sfx);
      register(group,sources,envelope,nodes,end);
      sources.forEach(source=>{source.start(start);source.stop(end+.015);});
    }
    function brush(event,time,group) {
      reserve(group);
      const start=Math.max(time,context.currentTime+.002),duration=Math.max(.035,event.duration||.11),end=start+duration;
      const source=context.createBufferSource(),filter=context.createBiquadFilter(),envelope=context.createGain();
      source.buffer=noise; filter.type='bandpass'; filter.frequency.value=event.frequency||1350; filter.Q.value=.6;
      envelope.gain.setValueAtTime(0,start); envelope.gain.linearRampToValueAtTime(event.level||.02,start+.009);
      envelope.gain.exponentialRampToValueAtTime(.0001,end); envelope.gain.setValueAtTime(0,end+.012);
      source.connect(filter).connect(envelope).connect(group==='music'?music:sfx);
      register(group,[source],envelope,[source,filter,envelope],end+.015);
      source.start(start);source.stop(end+.018);
    }
    function schedule(event,time,group) { (event.kind==='brush'?brush:note)(event,time+(event.offset||0),group); }
    function stopGroup(group, immediate) { Array.from(voices).forEach(voice=>{if(!group||voice.group===group)release(voice,immediate);}); }
    function stats() {
      const list=Array.from(voices);
      return { activeVoices:list.length,activeMusicVoices:list.filter(v=>v.group==='music').length,
        activeSfxVoices:list.filter(v=>v.group==='sfx').length,activeNodes:4+list.reduce((n,v)=>n+v.nodes.length,0),
        peakVoices,peakNodes,stolenVoices };
    }
    function dispose() { stopGroup(null,true); [music,sfx,master,limiter].forEach(node=>{try{node.disconnect();}catch(_){}}); }
    return { music,sfx,master,schedule,stopGroup,stats,dispose };
  }


  function create() {
    let context=null,rig=null,media=null,mediaNode=null,disposed=false,unlocking=null,playPending=null;
    let enabled=true,musicEnabled=true,paused=false,volume=.72,running=false;
    let scheduledSfx=0,schedulerStarts=0,lastContact=-99,lastError='',bgmError='',playbackBlocked=false,playSerial=0;
    const bgmSource=sourceUrl(),events={throw:0,hit:0,miss:0,finish:0,contact:0,perfect:0};
    function wantsMusic(){return !disposed&&enabled&&musicEnabled&&!paused;}
    function shouldRun(){return wantsMusic()&&context&&context.state==='running'&&media&&mediaNode;}
    function initMedia(){
      if(media&&mediaNode)return;
      if(media){mediaNode=context.createMediaElementSource(media);mediaNode.connect(rig.music);return;}
      if(typeof global.Audio!=='function')throw new Error('HTML audio playback is unavailable');
      media=new global.Audio();media.preload='auto';media.loop=true;media.volume=1;media.src=bgmSource;
      mediaNode=context.createMediaElementSource(media);mediaNode.connect(rig.music);
      media.addEventListener('playing',()=>{if(disposed)return;running=Boolean(shouldRun()&&!media.paused);if(running){playbackBlocked=false;bgmError='';lastError='';}});
      media.addEventListener('pause',()=>{running=false;});
      media.addEventListener('error',()=>{if(disposed)return;running=false;bgmError='Background music could not load (media error '+(media.error?media.error.code:'unknown')+').';lastError=bgmError;});
    }
    function stopMusic(){playSerial++;running=false;if(media)media.pause();}
    function startMusic(retry){
      if(!shouldRun())return Promise.resolve(false);
      if(playPending)return playPending;
      if(playbackBlocked&&!retry)return Promise.resolve(false);
      if(!media.paused){running=true;return Promise.resolve(true);}
      if(retry){playbackBlocked=false;bgmError='';if(media.error)media.load();}
      const serial=++playSerial;let request;
      try{request=media.play();}catch(error){request=Promise.reject(error);}
      const pending=Promise.resolve(request).then(()=>{
        if(disposed||serial!==playSerial)return false;
        if(!shouldRun()){media.pause();running=false;return false;}
        running=true;schedulerStarts++;playbackBlocked=false;bgmError='';lastError='';return true;
      }).catch(error=>{
        if(disposed||serial!==playSerial||!wantsMusic())return false;
        running=false;playbackBlocked=error&&error.name==='NotAllowedError';
        bgmError=String(error&&error.message||error);lastError=bgmError;return false;
      }).finally(()=>{
        if(playPending===pending)playPending=null;
        // A rapid pause/resume can abort an older play request. Resume once it settles.
        if(!disposed&&serial!==playSerial&&shouldRun()&&!running&&!playbackBlocked)startMusic(false);
      });
      playPending=pending;return pending;
    }
    function sync(retry){
      if(disposed)return Promise.resolve(false);
      if(rig){smooth(rig.master.gain,enabled&&!paused?MASTER_LEVEL:0,context.currentTime,.025);smooth(rig.music.gain,MUSIC_LEVEL*volume,context.currentTime,.025);}
      if(!shouldRun()){stopMusic();return Promise.resolve(false);}
      return startMusic(Boolean(retry));
    }
    async function unlock(){
      if(disposed)return false;if(unlocking)return unlocking;
      unlocking=(async()=>{
        try{
          if(!context){
            const Native=global.AudioContext||global.webkitAudioContext;if(!Native){lastError='Web Audio is unavailable';return false;}
            context=new Native({latencyHint:'interactive'});rig=createRig(context,false);rig.master.gain.value=0;
            context.onstatechange=()=>{if(!disposed)sync(false);};
          }
          initMedia();
          if(context.state==='suspended')await context.resume();
          await sync(true);return context.state==='running';
        }catch(error){lastError=String(error&&error.message||error);bgmError=lastError;return false;}
        finally{unlocking=null;}
      })();return unlocking;
    }
    function setEnabled(value){if(disposed)return;enabled=Boolean(value);if(!enabled&&rig)rig.stopGroup(null,false);sync(enabled);}
    function setPaused(value){if(disposed)return;paused=Boolean(value);if(paused&&rig)rig.stopGroup(null,false);sync(!paused);}
    function setMusicEnabled(value){if(disposed)return;musicEnabled=Boolean(value);sync(musicEnabled);}
    function setVolume(value){if(disposed)return;const n=Number(value);if(!Number.isFinite(n))return;volume=clamp(n,0,1);if(rig)smooth(rig.music.gain,MUSIC_LEVEL*volume,context.currentTime,.025);}
    function play(type,amount) {
      if(disposed||!enabled||paused||!rig||context.state!=='running')return false;
      const time=context.currentTime+.003;
      if(!Object.prototype.hasOwnProperty.call(events,type))return false;
      if(type==='contact'&&time-lastContact<.035)return false;
      const send=(event,delay)=>{rig.schedule(event,time+(delay||0),'sfx');scheduledSfx++;};
      if(type==='throw'){
        send({kind:'sweep',frequency:410,endFrequency:235,duration:.12,level:.068});
        send({kind:'brush',frequency:1050,duration:.095,level:.025},.015);
      }else if(type==='hit'||type==='perfect'){
        const perfect=type==='perfect'||Number(amount)>=2;
        (perfect?[76,79,84]:[72,76,79]).forEach((midi,i)=>send({kind:'mallet',midi,duration:perfect?.3:.24,level:perfect?.12:.105},i*.047));
      }else if(type==='miss'){
        send({kind:'piano',midi:55,duration:.16,level:.07});send({kind:'piano',midi:52,duration:.23,level:.052},.10);
      }else if(type==='finish'){
        [60,64,67,72,76].forEach((midi,i)=>send({kind:'piano',midi,duration:.52,level:.11},i*.11));
        send({kind:'bass',midi:36,duration:.65,level:.12},.12);
      }else if(type==='contact'){
        lastContact=time;const impact=clamp(Number(amount)||0,0,12);
        send({kind:'piano',frequency:210+impact*14,duration:.045+impact*.004,level:.023+impact*.004});
        send({kind:'brush',frequency:650+impact*24,duration:.045,level:.012+impact*.002});
      }
      events[type]++;
      // Short, gentle music ducking leaves hit/finish cues readable without raising their peaks.
      if(musicEnabled&&running&&(type==='hit'||type==='perfect'||type==='finish')){
        smooth(rig.music.gain,MUSIC_LEVEL*volume*.68,time,.025);
        rig.music.gain.linearRampToValueAtTime(MUSIC_LEVEL*volume,time+.38);
      }
      return true;
    }

    function getState(){
      const position=media&&Number.isFinite(media.currentTime)?media.currentTime:0;
      const duration=media&&Number.isFinite(media.duration)?media.duration:null;
      return Object.assign({available:Boolean(global.AudioContext||global.webkitAudioContext),unlocked:Boolean(context),
        contextState:context?context.state:'not-created',enabled,musicEnabled,paused,volume,musicVolume:volume,running,
        musicGain:rig?rig.music.gain.value:0,sfxGain:rig?rig.sfx.gain.value:0,masterGain:rig?rig.master.gain.value:0,
        phase:+position.toFixed(5),bar:null,beatInBar:null,positionSeconds:+position.toFixed(4),bpm:null,bars:null,beatsPerBar:null,
        loopSeconds:duration,scheduledNotes:0,scheduledSfx,schedulerStarts,timerActive:false,lookaheadSeconds:0,schedulerIntervalMs:0,maxVoices:MAX_VOICES,
        bgmType:'user-mp3',bgmSource:publicSource(bgmSource),bgmEmbedded:bgmSource.startsWith('data:'),bgmLoop:media?media.loop:true,
        bgmReadyState:media?media.readyState:0,bgmNetworkState:media?media.networkState:0,bgmPaused:media?media.paused:true,
        bgmDuration:duration,bgmPlaybackBlocked:playbackBlocked,bgmPlayPending:Boolean(playPending),bgmError,
        events:Object.assign({},events),disposed,lastError},rig?rig.stats():{activeVoices:0,activeMusicVoices:0,activeSfxVoices:0,activeNodes:0,peakVoices:0,peakNodes:0,stolenVoices:0});
    }
    function dispose(){
      if(disposed)return;stopMusic();disposed=true;
      if(mediaNode){try{mediaNode.disconnect();}catch(_){}mediaNode=null;}
      if(media){media.removeAttribute('src');try{media.load();}catch(_){}media=null;}
      if(rig){rig.dispose();rig=null;}
      if(context){context.onstatechange=null;try{const closing=context.close();if(closing&&closing.catch)closing.catch(()=>{});}catch(_){}}
    }
    return Object.freeze({unlock,setEnabled,setPaused,setMusicEnabled,setVolume,play,getState,dispose});
  }
  // Optional QA export decodes the selected user source. Failure is explicit; no synthesized fallback.
  async function renderPreview(options){
    const opts=options||{},Native=global.OfflineAudioContext||global.webkitOfflineAudioContext;
    if(!Native||typeof global.fetch!=='function')throw new Error('Offline music decoding is unavailable');
    const sampleRate=clamp(Number(opts.sampleRate)||24000,8000,48000),response=await global.fetch(sourceUrl());
    if(!response.ok)throw new Error('Background music fetch failed: '+response.status);
    const decoder=new Native(2,1,sampleRate),decoded=await decoder.decodeAudioData(await response.arrayBuffer());
    const seconds=clamp(Number(opts.seconds)||decoded.duration,1,600),context=new Native(2,Math.ceil(seconds*sampleRate),sampleRate),rig=createRig(context,true);
    const source=context.createBufferSource();source.buffer=decoded;source.loop=true;source.connect(rig.music);source.start(0);source.stop(seconds);
    if(opts.includeSfx)[72,76,79].forEach((midi,i)=>rig.schedule({kind:'mallet',midi,duration:.24,level:.105},7+i*.047,'sfx'));
    return context.startRendering();
  }
  global.LuckyAudio=Object.freeze({create,renderPreview});
})(typeof window!=='undefined'?window:globalThis);
