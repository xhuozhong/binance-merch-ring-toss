/* Lucky Loop — original, locally synthesized music and game sounds. No media requests. */
(function (global) {
  'use strict';
  const BPM = 78, BEAT = 60 / BPM, BARS = 16, BAR_BEATS = 4;
  const LOOP_BEATS = BARS * BAR_BEATS, LOOP_SECONDS = LOOP_BEATS * BEAT;
  const TICK_MS = 50, LOOKAHEAD = 0.16, STEP = 0.5;
  const MUSIC_LEVEL = 0.22, SFX_LEVEL = 0.58, MASTER_LEVEL = 0.72;
  const MAX_MUSIC_VOICES = 18, MAX_SFX_VOICES = 10, MAX_VOICES = 28;
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const mod = (n, d) => ((n % d) + d) % d;
  const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

  // Sixteen original bars: Cmaj9 / Am7 / Dm9 / G13, with a gentle F-major bridge.
  const HARMONY = [
    [36,[60,64,67,71]], [33,[60,64,67,69]], [38,[60,64,65,69]], [31,[59,64,65,69]],
    [40,[59,62,67,71]], [33,[60,64,67,71]], [38,[60,65,69,72]], [31,[59,62,65,69]],
    [41,[60,64,67,69]], [40,[59,62,67,71]], [33,[60,64,67,71]], [38,[60,64,65,69]],
    [41,[60,64,65,69]], [31,[59,64,65,69]], [36,[60,64,67,71]], [36,[60,64,67,69]]
  ];
  // [beat within bar, MIDI note, duration in beats]. Space is part of the tune.
  const MELODY = [
    [[.5,76,.65],[1.5,79,.65],[3,74,.65]], [[.5,72,.65],[2,71,.45],[3,69,.65]],
    [[.5,69,.6],[1.5,72,.6],[3,76,.6]], [[.5,74,.7],[2,71,.6],[3,69,.5]],
    [[.5,71,.6],[2,74,.6],[3,76,.6]], [[.5,72,.7],[2,71,.45],[3,67,.7]],
    [[.5,69,.6],[1.5,72,.55],[3,74,.65]], [[.5,71,.7],[2.5,67,.85]],
    [[.5,69,.65],[1.5,72,.65],[3,76,.65]], [[.5,74,.55],[2,71,.65],[3,67,.6]],
    [[.5,72,.55],[1.5,76,.55],[3,71,.7]], [[.5,69,.6],[2,72,.6],[3,74,.5]],
    [[.5,72,.7],[2,69,.55],[3,67,.7]], [[.5,71,.65],[1.5,74,.6],[3,69,.55]],
    [[.5,76,.6],[2,74,.6],[3,72,.7]], [[.5,71,.6],[2,69,.55],[3,67,.7]]
  ];
  const score = Array.from({ length: LOOP_BEATS / STEP }, () => []);
  function add(beat, event) { score[Math.round(beat / STEP)].push(event); }
  HARMONY.forEach(([root, chord], bar) => {
    const base = bar * BAR_BEATS;
    chord.forEach((midi, i) => add(base, { kind:'piano', midi, duration:1.7*BEAT, level:.088, offset:i*.012 }));
    [chord[1], chord[3]].forEach((midi, i) => add(base+2.5, { kind:'piano', midi, duration:1.05*BEAT, level:.052, offset:i*.017 }));
    add(base, { kind:'bass', midi:root, duration:1.7*BEAT, level:.16 });
    add(base+2.5, { kind:'bass', midi:root+7, duration:1.05*BEAT, level:.1 });
    MELODY[bar].forEach(([beat,midi,duration]) => add(base+beat, { kind:'mallet', midi, duration:duration*BEAT, level:.1 }));
    [.5,1.5,2.5,3.5].forEach((beat,i) => add(base+beat, { kind:'brush', duration:.13, level:i%2?.025:.018 }));
  });

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
      const kind=event.kind || 'mallet', bass=kind==='bass', end=start+duration+.12;
      const envelope=context.createGain(), filter=context.createBiquadFilter();
      filter.type='lowpass'; filter.frequency.value=bass?680:(kind==='piano'?2200:2600); filter.Q.value=.45;
      envelope.gain.setValueAtTime(0,start);
      envelope.gain.linearRampToValueAtTime(event.level||.08,start+(bass?.022:.014));
      envelope.gain.exponentialRampToValueAtTime(Math.max(.00012,(event.level||.08)*.19),start+duration*.55);
      envelope.gain.exponentialRampToValueAtTime(.0001,start+duration);
      envelope.gain.linearRampToValueAtTime(0,end);
      const fundamental=context.createOscillator(), frequency=event.frequency||hz(event.midi||72);
      fundamental.type=bass?'triangle':'sine'; fundamental.frequency.setValueAtTime(frequency,start);
      if(event.endFrequency)fundamental.frequency.exponentialRampToValueAtTime(Math.max(25,event.endFrequency),start+duration);
      const sources=[fundamental],nodes=[fundamental,filter,envelope];
      fundamental.connect(filter);
      if (!bass && kind!=='sweep') {
        const overtone=context.createOscillator(), partial=context.createGain();
        overtone.type='sine'; overtone.frequency.value=frequency*2; partial.gain.value=kind==='piano'?.12:.07;
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
    let context=null,rig=null,timer=null,disposed=false,unlocking=null;
    let enabled=true,musicEnabled=true,paused=false,volume=.72,running=false;
    let phase=0,startPhase=0,startedAt=0,nextStep=0;
    let scheduledNotes=0,scheduledSfx=0,schedulerStarts=0,lastContact=-99,lastError='';
    const events={throw:0,hit:0,miss:0,finish:0,contact:0,perfect:0};
    function currentPhase() {
      return running&&context ? mod(startPhase+Math.max(0,context.currentTime-startedAt)/BEAT,LOOP_BEATS) : phase;
    }
    function shouldRun() { return !disposed&&enabled&&musicEnabled&&!paused&&context&&context.state==='running'; }
    function tick() {
      if(!running||!shouldRun()){ sync(); return; }
      const now=context.currentTime,cutoff=now+LOOKAHEAD;
      const actualBeat=startPhase+Math.max(0,now-startedAt)/BEAT;
      if(startedAt+(nextStep*STEP-startPhase)*BEAT<now-.035) nextStep=Math.ceil(actualBeat/STEP);
      let safety=0;
      while(startedAt+(nextStep*STEP-startPhase)*BEAT<cutoff&&safety++<12){
        const time=startedAt+(nextStep*STEP-startPhase)*BEAT;
        score[mod(nextStep,score.length)].forEach(event=>{rig.schedule(event,time,'music');scheduledNotes++;});
        nextStep++;
      }
    }
    function stopMusic() {
      if(running)phase=currentPhase();
      running=false;
      if(timer!==null){global.clearInterval(timer);timer=null;}
      if(rig)rig.stopGroup('music',false);
    }
    function sync() {
      if(disposed)return;
      if(rig){smooth(rig.master.gain,enabled&&!paused?MASTER_LEVEL:0,context.currentTime,.025);}
      if(!shouldRun()){if(running||timer!==null)stopMusic();return;}
      if(running)return;
      smooth(rig.music.gain,MUSIC_LEVEL*volume,context.currentTime,.025);
      startPhase=phase;startedAt=context.currentTime+.035;nextStep=Math.ceil((startPhase-1e-7)/STEP);
      running=true;schedulerStarts++;tick();
      if(running&&timer===null)timer=global.setInterval(tick,TICK_MS);
    }
    async function unlock() {
      if(disposed)return false;
      if(unlocking)return unlocking;
      unlocking=(async()=>{
        try{
          if(!context){
            const Native=global.AudioContext||global.webkitAudioContext;
            if(!Native){lastError='Web Audio is unavailable';return false;}
            context=new Native({latencyHint:'interactive'});rig=createRig(context,false);rig.master.gain.value=0;rig.music.gain.value=MUSIC_LEVEL*volume;
            context.onstatechange=()=>{if(!disposed)sync();};
          }
          if(context.state==='suspended')await context.resume();
          // Always yield once so a context that starts in the running state cannot leave a stale unlock promise.
          await Promise.resolve();
          sync();return context.state==='running';
        }catch(error){lastError=String(error&&error.message||error);return false;}
        finally{unlocking=null;}
      })();
      return unlocking;
    }
    function setEnabled(value) {
      if(disposed)return;enabled=Boolean(value);
      if(!enabled&&rig){stopMusic();rig.stopGroup(null,false);}
      sync();
    }
    function setPaused(value) {
      if(disposed)return;paused=Boolean(value);
      if(paused&&rig){stopMusic();rig.stopGroup(null,false);}
      sync();
    }
    function setMusicEnabled(value) {
      if(disposed)return;musicEnabled=Boolean(value);
      if(!musicEnabled)stopMusic();sync();
    }
    function setVolume(value) {
      if(disposed)return;
      const number=Number(value);if(!Number.isFinite(number))return;
      volume=clamp(number,0,1);
      if(rig)smooth(rig.music.gain,MUSIC_LEVEL*volume,context.currentTime,.025);
    }
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
    function getState() {
      const position=currentPhase();
      return Object.assign({ available:Boolean(global.AudioContext||global.webkitAudioContext),unlocked:Boolean(context),
        contextState:context?context.state:'not-created',enabled,musicEnabled,paused,volume,musicVolume:volume,running,
        musicGain:rig?rig.music.gain.value:0,sfxGain:rig?rig.sfx.gain.value:0,masterGain:rig?rig.master.gain.value:0,
        phase:+position.toFixed(5),bar:Math.floor(position/BAR_BEATS)+1,beatInBar:+mod(position,BAR_BEATS).toFixed(5),
        positionSeconds:+(position*BEAT).toFixed(4),bpm:BPM,bars:BARS,beatsPerBar:BAR_BEATS,
        loopSeconds:+LOOP_SECONDS.toFixed(5),scheduledNotes,scheduledSfx,schedulerStarts,timerActive:timer!==null,
        lookaheadSeconds:LOOKAHEAD,schedulerIntervalMs:TICK_MS,maxVoices:MAX_VOICES,
        events:Object.assign({},events),disposed,lastError },rig?rig.stats():{
          activeVoices:0,activeMusicVoices:0,activeSfxVoices:0,activeNodes:0,peakVoices:0,peakNodes:0,stolenVoices:0 });
    }
    function dispose() {
      if(disposed)return;
      stopMusic();disposed=true;
      if(rig){rig.dispose();rig=null;}
      if(context){context.onstatechange=null;try{const closing=context.close();if(closing&&closing.catch)closing.catch(()=>{});}catch(_){} }
    }
    return Object.freeze({unlock,setEnabled,setPaused,setMusicEnabled,setVolume,play,getState,dispose});
  }

  // Optional QA export: the same synthesis rendered offline, with a tail after the last bar.
  async function renderPreview(options) {
    const opts=options||{},Native=global.OfflineAudioContext||global.webkitOfflineAudioContext;
    if(!Native)throw new Error('OfflineAudioContext is unavailable');
    const sampleRate=clamp(Number(opts.sampleRate)||24000,8000,48000);
    const seconds=clamp(Number(opts.seconds)||LOOP_SECONDS+1.5,1,LOOP_SECONDS*2+2);
    const context=new Native(2,Math.ceil(seconds*sampleRate),sampleRate),rig=createRig(context,true);
    for(let step=0;step*STEP*BEAT<Math.min(seconds,LOOP_SECONDS);step++){
      score[mod(step,score.length)].forEach(event=>rig.schedule(event,step*STEP*BEAT+.01,'music'));
    }
    if(opts.includeSfx){
      [72,76,79].forEach((midi,i)=>rig.schedule({kind:'mallet',midi,duration:.24,level:.105},7+i*.047,'sfx'));
    }
    return context.startRendering();
  }
  global.LuckyAudio=Object.freeze({create,renderPreview});
})(typeof window!=='undefined'?window:globalThis);
