/* Lucky Loop · Original procedural art and game code. Three.js: MIT, see vendor. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const mount = $('scene');
  if (!window.THREE || !window.LuckyMerch || !window.LuckyPhysics || !window.LuckyAudio) { mount.innerHTML = '<p class="load-error">场景未能加载，请保留完整游戏文件夹后重新打开。</p>'; return; }
  const T = window.THREE;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SAVE_KEY = 'binance-lucky-loop-v1';
  const freshSave = () => ({ best: { classic: 0, daily: 0, practice: 0 }, collection: {}, sound: true, music: true, musicVolume: .55, day: '' });
  let save = freshSave();
  try {
    const old = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (old && typeof old === 'object') {
      for (const m of ['classic', 'daily', 'practice']) if (Number.isFinite(old.best?.[m])) save.best[m] = Math.max(0, old.best[m]);
      if (old.collection && typeof old.collection === 'object') save.collection = old.collection;
      if (typeof old.sound === 'boolean') save.sound = old.sound;
      if (typeof old.music === 'boolean') save.music = old.music;
      if (Number.isFinite(old.musicVolume)) save.musicVolume = clamp(old.musicVolume,0,1);
      if (typeof old.day === 'string') save.day = old.day;
    }
  } catch (_) { /* Private browsing and invalid saves must not prevent play. */ }
  const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (_) {} };
  const date = new Date();
  const day = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  if (save.day !== day) { save.best.daily = 0; save.day = day; }
  const types = window.LuckyMerch.types;
  const state = { phase: 'ready', mode: 'classic', round: 1, score: 0, roundScore: 0, ringsRemaining: 7, combo: 0, maxCombo: 0, hits: 0, throws: 0, perfects: 0, paused: false, time: 0, charge: 0, charging: false, chargeTime: 0, wind: 0, flight: null, endDelay: 0, bonusAwarded: false, missionAwarded: false, roundTypes: new Set(), events: [], lastResult: null };
  let throwId = 0, toyTime = 0, pointerId = null, activeDialog = '', resumePhase = '', keyboardHeld = false, practiceSet = 0;
  const audio = window.LuckyAudio.create();
  audio.setEnabled(save.sound);audio.setMusicEnabled(save.music);audio.setVolume(save.musicVolume);
  const physics = window.LuckyPhysics.create({onContact:event=>{audio.play('contact',event.impactSpeed||1);}});
  const aim = new T.Vector3(0, 0.1, 2.35);
  const scene = new T.Scene();
  scene.background = null;
  scene.fog = null;
  let renderer;
  try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); }
  catch (_) { mount.innerHTML = '<p class="load-error">浏览器暂时无法开启 3D 场景。请在支持 WebGL 的 Chrome 或 Edge 中打开。</p>'; return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000,0);
  renderer.domElement.setAttribute('aria-label', '三维套圈摊位，鼠标或手指控制方向，按住蓄力，松开投掷，圈稳定套住周边才计分');
  renderer.domElement.setAttribute('tabindex', '0');
  mount.appendChild(renderer.domElement);
  const mobileScore=document.createElement('div');mobileScore.className='mobile-score';mobileScore.setAttribute('aria-hidden','true');mobileScore.innerHTML='<small>本局得分</small><strong id="scene-score">0000</strong>';mount.parentElement.appendChild(mobileScore);
  const camera = new T.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 11.8, 18.5);
  camera.lookAt(0, 0.8, -0.1);
  scene.add(new T.HemisphereLight(0xffefcf, 0x2a2622, 1.25));
  const keyLight = new T.DirectionalLight(0xffedc8, 4.0);
  keyLight.position.set(-7, 13, 9);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  Object.assign(keyLight.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 40 });
  keyLight.shadow.bias = -0.0008;
  keyLight.shadow.normalBias = 0.035;
  scene.add(keyLight);
  const rim = new T.DirectionalLight(0xffd572, 2.5); rim.position.set(8, 6, -8); scene.add(rim);
  // An original studio environment supplies real material reflections without a network HDRI.
  const envCanvas=document.createElement('canvas');envCanvas.width=1024;envCanvas.height=512;const ec=envCanvas.getContext('2d');
  const eg=ec.createLinearGradient(0,0,0,512);eg.addColorStop(0,'#38332d');eg.addColorStop(.5,'#19191b');eg.addColorStop(1,'#08090b');ec.fillStyle=eg;ec.fillRect(0,0,1024,512);
  function softbox(x,y,w,h,color){const g=ec.createRadialGradient(x,y,1,x,y,w);g.addColorStop(0,color);g.addColorStop(.35,color);g.addColorStop(1,'rgba(0,0,0,0)');ec.save();ec.translate(x,y);ec.scale(1,h/w);ec.translate(-x,-y);ec.fillStyle=g;ec.fillRect(x-w,y-w,w*2,w*2);ec.restore();}
  softbox(250,180,180,80,'#fff1d3');softbox(720,155,100,150,'#fff6e6');softbox(500,240,70,35,'#ffce69');
  const envTex=new T.CanvasTexture(envCanvas);envTex.mapping=T.EquirectangularReflectionMapping;envTex.colorSpace=T.SRGBColorSpace;const pmrem=new T.PMREMGenerator(renderer);scene.environment=pmrem.fromEquirectangular(envTex).texture;envTex.dispose();pmrem.dispose();
  const mats = new Map();
  function mat(color, roughness = 0.62, metalness = 0) {
    const k = `${color}/${roughness}/${metalness}`;
    if (!mats.has(k)) mats.set(k, new T.MeshStandardMaterial({ color, roughness, metalness }));
    return mats.get(k);
  }
  const sphereGeo = new T.SphereGeometry(1, 24, 18);
  const boxGeo = new T.BoxGeometry(1,1,1);
  function mesh(geo, color, parent = scene, material) { const o = new T.Mesh(geo, material || mat(color)); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o; }
  function box(x,y,z,sx,sy,sz,color,parent=scene) { const o=mesh(boxGeo,color,parent); o.position.set(x,y,z); o.scale.set(sx,sy,sz); return o; }
  function ball(x,y,z,sx,sy,sz,color,parent=scene) { const o=mesh(sphereGeo,color,parent); o.position.set(x,y,z); o.scale.set(sx,sy,sz); return o; }
  function cylinder(x,y,z,rt,rb,h,color,parent=scene,segments=32) { const o=mesh(new T.CylinderGeometry(rt,rb,h,segments),color,parent); o.position.set(x,y,z); return o; }
  function torus(radius,tube,color,parent=scene) { const o=mesh(new T.TorusGeometry(radius,tube,10,56),color,parent); o.rotation.x=-Math.PI/2; return o; }
  function roundShape(w,h,r) {
    const s=new T.Shape(); s.moveTo(-w/2+r,-h/2); s.lineTo(w/2-r,-h/2); s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r); s.lineTo(w/2,h/2-r); s.quadraticCurveTo(w/2,h/2,w/2-r,h/2); s.lineTo(-w/2+r,h/2); s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r); s.lineTo(-w/2,-h/2+r); s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2); return s;
  }
  function slab(w,h,depth,color,y) { const g=new T.ExtrudeGeometry(roundShape(w,h,.55),{ depth,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.12,bevelThickness:.12,curveSegments:10 }); const o=mesh(g,color); o.rotation.x=-Math.PI/2; o.position.y=y; return o; }
  function label(text, fg='#fff3d8', bg='', w=512,h=128) {
    const c=document.createElement('canvas'); c.width=w;c.height=h; const ctx=c.getContext('2d');
    if(bg){ctx.fillStyle=bg;ctx.beginPath();ctx.roundRect(3,3,w-6,h-6,h/2-4);ctx.fill();}
    ctx.font=`700 ${Math.floor(h*.53)}px "Microsoft YaHei",sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=fg;ctx.fillText(text,w/2,h*.52);
    const tex=new T.CanvasTexture(c); tex.colorSpace=T.SRGBColorSpace;
    const s=new T.Sprite(new T.SpriteMaterial({map:tex,transparent:true,depthWrite:false}));s.scale.set(w/h,1,1);return s;
  }
  const brandPaths=[[[1.84252,1.169291],[0,3.011811],[-1.84252,1.145669],[-1.181102,.507874],[0,1.665354],[1.181102,.507874]],[[-2.338583,.649606],[-3,.035433],[-3,-.035433],[-2.362205,-.673228],[-1.700787,-.011811]],[[-.023622,.673228],[-.685039,-.011811],[0,-.673228],[.661417,.011811]],[[2.338583,.673228],[1.677165,.011811],[2.338583,-.673228],[3,-.011811]],[[-1.84252,-1.145669],[-.023622,-3.011811],[1.84252,-1.169291],[1.181102,-.507874],[0,-1.665354],[-1.181102,-.507874]]];
  // Realtime stage, positioned over the generated environment plate. All prizes and rings remain 3D.
  const gold=new T.MeshStandardMaterial({color:0xf0b90b,metalness:.85,roughness:.23});
  const edgeLight=new T.MeshStandardMaterial({color:0xffcf58,emissive:0xf0b90b,emissiveIntensity:1.45,metalness:.55,roughness:.25});
  slab(11.8,10,.4,0x111215,-.65).material=new T.MeshStandardMaterial({color:0x151619,metalness:.58,roughness:.3});
  slab(11.4,9.7,.14,0xf4d16a,-.21).material=gold;
  slab(10.98,9.28,.05,0x171719,-.15).material=new T.MeshStandardMaterial({color:0x151619,metalness:.28,roughness:.46});
  const outlinePoints=roundShape(11.35,9.63,.55).getPoints(90).map(v=>new T.Vector3(v.x,.047,-v.y));
  const rimCurve=new T.CatmullRomCurve3(outlinePoints,true);const lightRim=mesh(new T.TubeGeometry(rimCurve,180,.025,6,true),0xffc635,scene,edgeLight);
  const floorCanvas=document.createElement('canvas');floorCanvas.width=1024;floorCanvas.height=1024;const fc=floorCanvas.getContext('2d');fc.fillStyle='#1a1b1d';fc.fillRect(0,0,1024,1024);
  let seed=98341;for(let i=0;i<32000;i++){seed=(seed*1664525+1013904223)>>>0;const x=seed%1024;seed=(seed*1664525+1013904223)>>>0;const y=seed%1024;fc.fillStyle=i%2?'#202123':'#161719';fc.fillRect(x,y,1,1);}
  fc.save();fc.translate(512,475);fc.globalAlpha=.18;fc.fillStyle='#796237';for(const path of brandPaths){fc.beginPath();path.forEach(([x,y],i)=>i?fc.lineTo(x*88,-y*88):fc.moveTo(x*88,-y*88));fc.closePath();fc.fill();}fc.restore();
  const clothTex=new T.CanvasTexture(floorCanvas);clothTex.colorSpace=T.SRGBColorSpace;const cloth=mesh(new T.ShapeGeometry(roundShape(10.77,8.86,.48)),0x151619,scene,new T.MeshStandardMaterial({map:clothTex,roughness:.54,metalness:.18}));
  const pos=cloth.geometry.attributes.position,uv=cloth.geometry.attributes.uv;for(let i=0;i<pos.count;i++)uv.setXY(i,(pos.getX(i)+5.385)/10.77,(pos.getY(i)+4.43)/8.86);uv.needsUpdate=true;cloth.rotation.x=-Math.PI/2;cloth.position.y=.056;
  for(const x of [-5.55,5.55]){cylinder(x,2.15,-4.35,.058,.074,4.9,0xd8aa38).material=gold;const foot=cylinder(x,-.04,-4.35,.17,.22,.2,0xe2b944);foot.material=gold;}
  box(0,4.37,-4.36,11.35,.17,.16,0x242528).material=gold;
  for(let i=0;i<14;i++){const x=-5.46+i*.84,color=i%2?0x131519:0xf0b90b;const top=box(x,4.92,-4.52,.835,.065,2.25,color);top.rotation.x=-.04;
    const hem=new T.Shape();hem.moveTo(-.413,.22);hem.lineTo(.413,.22);hem.lineTo(.413,-.10);hem.quadraticCurveTo(.413,-.34,0,-.34);hem.quadraticCurveTo(-.413,-.34,-.413,-.10);hem.closePath();
    const scallop=mesh(new T.ExtrudeGeometry(hem,{depth:.026,bevelEnabled:true,bevelSegments:3,bevelSize:.025,bevelThickness:.015,steps:1,curveSegments:12}),color);scallop.position.set(x,4.63,-3.39);scallop.material=new T.MeshStandardMaterial({color,roughness:.53,metalness:.04});}
  const signGroup=new T.Group();signGroup.position.set(0,4.40,-3.24);scene.add(signGroup);
  const sign=mesh(new T.ExtrudeGeometry(roundShape(4.6,.95,.18),{depth:.08,bevelEnabled:true,bevelSegments:3,bevelSize:.04,bevelThickness:.03,steps:1}),0x121315,signGroup);sign.position.z=-.04;
  const title=label('BINANCE','#ffd767','',800,170);title.position.set(.38,0,.16);title.scale.set(3.4,.70,1);title.material.color.setHex(0xffefb9);title.material.depthTest=false;title.renderOrder=5;signGroup.add(title);
  const brandMark=new T.Group();for(const path of brandPaths){const shape=new T.Shape();path.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();mesh(new T.ShapeGeometry(shape),0xf5c44b,brandMark,edgeLight);}brandMark.scale.setScalar(.102);brandMark.position.set(-1.55,0,.13);signGroup.add(brandMark);
  const bulbMat=new T.MeshStandardMaterial({color:0xffedc5,emissive:0xffd891,emissiveIntensity:3.5,roughness:.2});
  const wirePoints=[];for(let i=0;i<=30;i++){const x=-5.35+i/30*10.7;wirePoints.push(new T.Vector3(x,4.35-.22*Math.sin(i/30*Math.PI),-3.39));}
  mesh(new T.TubeGeometry(new T.CatmullRomCurve3(wirePoints),50,.011,5,false),0x383023);
  for(let i=0;i<=14;i++){const x=-5.15+i/14*10.3,y=4.35-.22*Math.sin(i/14*Math.PI);cylinder(x,y-.07,-3.39,.018,.018,.14,0x8d7541);const bulb=ball(x,y-.17,-3.39,.075,.087,.075,0xffebbe);bulb.material=bulbMat;}
  for(const x of [-4.5,4.5]){const fill=new T.PointLight(0xffbf59,2.4,11,2);fill.position.set(x,3.1,-2.7);scene.add(fill);}
  const bounce=new T.PointLight(0xffe0a0,3.5,14,2);bounce.position.set(0,4.0,5);scene.add(bounce);
  const tossLine=label('BINANCE  MERCH','#bb913d','',512,90);tossLine.position.set(0,.08,4.2);tossLine.scale.set(2.2,.38,1);scene.add(tossLine);
  const targets=[], prizeGroup=new T.Group();scene.add(prizeGroup);
  function makePrize(type) {
    const toy=window.LuckyMerch.create(type,T),scale=1.18,c=toy.userData.collider;
    toy.scale.setScalar(scale);
    toy.userData.collider={...c,radius:c.radius*scale,height:c.height*scale,halfExtents:{x:c.halfExtents.x*scale,y:c.halfExtents.y*scale,z:c.halfExtents.z*scale}};
    return toy;
  }
  function disposePrize(group){const geometries=new Set(),materials=new Set(),textures=new Set();group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:o.material?[o.material]:[])){materials.add(m);for(const key of ['map','normalMap','roughnessMap','metalnessMap','emissiveMap'])if(m[key])textures.add(m[key]);}});textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());}
  const layout=[[-2.9,2.45,0],[0,2.45,1],[2.9,2.45,2],[-2.9,.0,3],[0,.0,4],[2.9,.0,5],[-2.9,-2.5,6],[0,-2.5,7],[2.9,-2.5,8]];
  for(let i=0;i<layout.length;i++){
    const [x,z,k]=layout[i],type=types[k%types.length],g=new T.Group();g.position.set(x,.13,z);prizeGroup.add(g);
    const base=cylinder(0,0,0,.63,.7,.19,0x18191d,g);base.receiveShadow=true;
    const border=torus(.615,.018,0xf0be4a,g);border.material=gold;border.position.y=.105;
    const toy=makePrize(type);toy.position.y=.12;g.add(toy);
    const badge=label(String(type.points),'#f6ce60','#151619',256,105);badge.scale.set(.78,.32,1);badge.position.set(0,.04,.72);badge.material.depthTest=false;badge.renderOrder=3;g.add(badge);
    targets.push({id:`p${i}`,x,z,baseX:x,baseZ:z,type,points:type.points,caught:false,group:g,toy,badge,base,bob:i*.75,moving:false});
  }
  const ringMat=new T.MeshStandardMaterial({color:0xf9c728,roughness:.20,metalness:.85});
  const ringGeo=new T.TorusGeometry(.57,.055,12,64);ringGeo.rotateX(-Math.PI/2);
  const heldRing=mesh(ringGeo,null,scene,ringMat);heldRing.position.set(0,1.5,5.15);
  for(let i=0;i<4;i++){const r=mesh(ringGeo,null,scene,ringMat);r.position.set(-4.9,.2+i*.13,4.13);r.scale.setScalar(.75);}
  const aimGroup=new T.Group();scene.add(aimGroup);
  const reticle=torus(.21,.016,0xf4d16a,aimGroup);reticle.position.y=.07;reticle.material=new T.MeshBasicMaterial({color:0xf4d16a,transparent:true,opacity:.85});
  const aimDot=mesh(new T.CircleGeometry(.055,20),0xd5fff0,aimGroup,new T.MeshBasicMaterial({color:0xd5fff0}));aimDot.rotation.x=-Math.PI/2;aimDot.position.y=.07;
  const aimShadow=mesh(new T.RingGeometry(.22,.27,32),0xe5c166,aimGroup,new T.MeshBasicMaterial({color:0xe5c166,transparent:true,opacity:.12,side:T.DoubleSide}));aimShadow.rotation.x=-Math.PI/2;aimShadow.position.y=.065;
  const particles=[], floating=[], ringMeshes=new Map();
  function unlockAudio() { audio.unlock(); }
  function sound(kind,amount) { audio.play(kind,amount); }
  function emit(type,data={}){state.events.push({type,round:state.round,time:+state.time.toFixed(3),...data});if(state.events.length>500)state.events.shift();}
  function toast(message) { if(!$('toast'))return;$('toast').textContent=message;$('toast').classList.remove('hidden');$('toast').classList.add('show');$('toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>{$('toast').classList.remove('show');$('toast').hidden=true;},2600); }
  function setText(id,text){if($(id))$(id).textContent=text;}
  function overlay(title,copy,primary,fn,secondary,fn2){
    const el=$('overlay');el.hidden=false;el.classList.remove('hidden');el.style.display='';
    setText('overlay-title',title);setText('overlay-copy',copy);setText('overlay-action',primary);$('overlay-action').onclick=fn;
    $('overlay-secondary').hidden=!secondary;if(secondary){setText('overlay-secondary',secondary);$('overlay-secondary').onclick=fn2;}
  }
  function hideOverlay(){ $('overlay').hidden=true;$('overlay').classList.add('hidden'); }
  const collectionImages=new Map(Object.entries(window.LuckyMerchThumbnails||{}));
  function refreshCollection(){
    $('collection-list').innerHTML=types.map(t=>{const n=Number(save.collection[t.id])||0;const icon=collectionImages.has(t.id)?`<img src="${collectionImages.get(t.id)}" alt="" width="48" height="48" style="width:100%;height:100%;object-fit:contain;position:relative;z-index:1">`:window.LuckyMerch.icon(t.id);return `<div class="collection-item ${n?'unlocked':'locked'}" title="${t.name} · ${t.points} 分 · ${n?'已套中 '+n+' 次':'尚未套中'}"><span class="collection-icon">${icon}</span><span class="name">${t.name}</span><small>${n?'已收集 ×'+n:t.points+' 分'}</small></div>`;}).join('');
  }
  function updateUI(){
    setText('score',String(state.score).padStart(4,'0'));setText('scene-score',String(state.score).padStart(4,'0'));setText('best-score',save.best[state.mode]||0);
    setText('round-label',state.mode==='practice'?'自由练习':`${String(state.round).padStart(2,'0')} / 03`);
    setText('rings-left',state.mode==='practice'?'∞':state.ringsRemaining);
    setText('combo-label',state.combo>1?`${state.combo} 连中 · ×${Math.min(2,1+(state.combo-1)*.25).toFixed(2).replace(/0$/,'')}`:'瞄准你的好运');
    setText('wind-label',Math.abs(state.wind)<.05?'无风 · 适合开张':`${state.wind>0?'→':'←'} ${Math.abs(state.wind).toFixed(1)} 级微风`);
    const goal=[800,1200,1600][state.round-1]||1600;
    setText('round-goal',state.mode==='practice'?'不限次数，放心试手':`本轮 ${state.roundScore} / ${goal}`);
    $('goal-progress').style.width=`${Math.min(100,state.roundScore/goal*100)}%`;
    setText('mission-text',state.mode==='practice'?'练习不计入挑战纪录':state.missionAwarded?'花样收藏完成 · +200 分':`套中 3 种奖品 · ${state.roundTypes.size}/3 · 奖励 200 分`);
    const p=state.charging?state.charge:0;$('charge-fill').style.width=`${p*100}%`;

    setText('charge-value',state.charging?`${Math.round(p*100)}%`:'按住蓄力');
    setText('pause-btn',state.paused?'继续':'暂停');
    $('pause-btn').setAttribute('aria-label',state.paused?'继续游戏':'暂停游戏');
    $('sound-btn').setAttribute('aria-pressed',String(save.sound));setText('sound-btn',save.sound?'声音 开':'声音 关');
    $('mode-select').value=state.mode;
    if($('music-btn')){setText('music-btn',save.music?'音乐 开':'音乐 关');$('music-btn').setAttribute('aria-pressed',String(save.music));}
    if($('music-volume'))$('music-volume').value=Math.round(save.musicVolume*100);
    if($('shuffle-btn'))$('shuffle-btn').hidden=state.mode!=='practice';
    audio.setPaused(state.paused||document.hidden||state.phase==='ready');
  }
  function clearRings(){
    for(const r of ringMeshes.values())scene.remove(r);ringMeshes.clear();state.flight=null;
    for(const p of particles){scene.remove(p.mesh);p.mesh.geometry.dispose();}particles.length=0;
    for(const f of floating){scene.remove(f.sprite);f.sprite.material.map.dispose();f.sprite.material.dispose();}floating.length=0;
    physics.clear();
  }
  function physicsTargets(){return targets.map(p=>({id:p.id,x:p.x,z:p.z,caught:p.caught,moving:p.moving,...p.toy.userData.collider}));}
  function resetRound(){
    clearRings();state.endDelay=0;state.ringsRemaining=7;state.combo=0;state.roundScore=0;state.bonusAwarded=false;state.missionAwarded=false;state.roundTypes.clear();state.charge=0;state.charging=false;
    let seed=[...day].reduce((a,c)=>a*31+c.charCodeAt(0),0)>>>0;
    const dayOffset=state.mode==='daily'?seed%types.length:0;
    const offset=state.mode==='practice'?practiceSet*9:(state.round-1)*6;
    for(const [i,p]of targets.entries()){
      p.group.remove(p.toy);disposePrize(p.toy);p.type=types[(i+offset+dayOffset)%types.length];p.toy=makePrize(p.type);p.toy.position.y=.12;p.group.add(p.toy);
      p.caught=false;p.group.scale.setScalar(1);p.x=p.baseX;p.z=p.baseZ;p.moving=state.mode!=='practice'&&state.round>1&&i===7;
      if(state.mode==='daily'){seed=(seed*1664525+1013904223)>>>0;p.x+=((seed/4294967296)-.5)*.30;}
      p.originX=p.x;p.points=p.moving?500:p.type.points;p.group.position.set(p.x,.13,p.z);
      p.badge.material.map.dispose();p.badge.material.dispose();p.badge.material=label(String(p.points),'#f6ce60',p.moving?'#5c4618':'#151619',256,105).material;p.badge.material.depthTest=false;
    }
    aim.set(0,.1,2.45);state.wind=state.round===1||state.mode==='practice'?0:state.round===2?.12:-.20;
    physics.reset(physicsTargets());physics.setWind(state.wind);
    setText('status-text',state.round===1?'看准方向，凭手感控制力度':state.round===2?'大奖开始移动，抓准出手时机':'最后一轮：留意侧风和环的回弹');
    updateUI();
  }
  function start(mode='classic'){
    unlockAudio();activeDialog='';keyboardHeld=false;pointerId=null;
    Object.assign(state,{phase:'playing',mode,round:1,score:0,roundScore:0,ringsRemaining:7,combo:0,maxCombo:0,hits:0,throws:0,perfects:0,paused:false,time:0,charge:0,charging:false,lastResult:null,events:[]});
    throwId=0;practiceSet=0;resetRound();hideOverlay();emit('start',{mode});setText('start-btn','重新开局');
    if(mode==='daily')toast(`今日摊位 · ${day} · 同一天相同布局`);
    renderer.domElement.focus({preventScroll:true});
  }
  function nextRound(){state.round++;state.phase='playing';resetRound();hideOverlay();emit('roundStart');renderer.domElement.focus({preventScroll:true});}
  function endRound(){
    state.phase=state.round===3?'finished':'roundEnd';state.charging=false;state.combo=0;
    if(state.score>save.best[state.mode]){save.best[state.mode]=state.score;persist();}
    const goal=[800,1200,1600][state.round-1],stars=state.roundScore>=goal?'三星好手':state.roundScore>=goal*.6?'双星摊主':'新星登场';
    if(state.round<3){overlay(`${stars} · 第 ${state.round} 轮完成`,`本轮 ${state.roundScore} 分，累计 ${state.score} 分。${state.round===1?'下一轮换一批周边，移动大奖可得 500 分。':'最后一轮微风变强，给落点留一点余量。'}`,'逛下一摊',nextRound,'重新挑战',()=>start(state.mode));}
    else {sound('finish');const rank=state.score>=4800?'夜市套圈王':state.score>=3000?'好运收藏家':state.score>=1600?'夜市小能手':'好运刚刚开始';overlay(rank,`总分 ${state.score} · 命中 ${state.hits}/${state.throws} · 最长 ${state.maxCombo} 连中。${state.score>=save.best[state.mode]?'你的最佳纪录已保存。':'再试一次，刷新你的最佳纪录。'}`,'再逛一次',()=>start(state.mode),'轻松练习',()=>start('practice'));emit('finish',{score:state.score});}
    updateUI();
  }
  function requestRestart(mode=state.mode){
    if(state.phase==='playing'&&(state.throws>0||state.charging||state.flight)){
      cancelCharge();state.paused=true;activeDialog='restart';overlay('重新摆摊？','当前这一局会结束，已收集的奖品仍会保留。','重新开始',()=>start(mode),'继续这局',()=>{state.paused=false;activeDialog='';hideOverlay();updateUI();});updateUI();
    }else start(mode);
  }
  function pause(){
    if(state.phase!=='playing'||activeDialog&&activeDialog!=='pause')return;
    state.paused=!state.paused;cancelCharge();
    if(state.paused){activeDialog='pause';overlay('好运歇一会儿','圈、奖品和微风都已暂停。回来接着玩。','继续套圈',()=>pause(),'重新开局',()=>requestRestart());}
    else{activeDialog='';hideOverlay();renderer.domElement.focus({preventScroll:true});}updateUI();
  }
  function cancelCharge(){state.charging=false;state.charge=0;keyboardHeld=false;if(pointerId!==null&&renderer.domElement.hasPointerCapture?.(pointerId))renderer.domElement.releasePointerCapture(pointerId);pointerId=null;}
  function help(){
    if(activeDialog==='help'){closeHelp();return;}
    resumePhase=state.paused?'paused':state.phase;cancelCharge();if(state.phase==='playing')state.paused=true;activeDialog='help';
    overlay('三步，圈住心动周边','移动光标选择方向，按住蓄力，松手投掷。力度越大，投得越远；上下瞄准会微调抛角。圈会碰撞、弹跳和翻滚，稳定套住周边才得分。连中最多 ×2，首次 3 连中送 1 只圈，每件周边每轮只计一次。按方向键也能调整方向。','明白，继续',closeHelp,'',null);updateUI();
  }
  function closeHelp(){activeDialog='';if(state.phase==='playing'){state.paused=resumePhase==='paused';if(state.paused){state.paused=false;pause();}else{hideOverlay();renderer.domElement.focus({preventScroll:true});}}else if(state.phase==='ready')showReady();else if(state.phase==='finished'||state.phase==='roundEnd')endRound();updateUI();}
  function showReady(){overlay('你的周边摊，开张了','18 款品牌周边，真实碰撞与落圈。看准方向，按住蓄力，松手出发。','开始套圈',()=>start($('mode-select').value),'先练练手',()=>start('practice'));}
  function beginCharge(){if(state.phase!=='playing'||state.paused||state.flight||state.ringsRemaining<=0)return false;state.charging=true;state.chargeTime=0;state.charge=0;unlockAudio();return true;}
  function launchVelocity(charge,x=aim.x,z=aim.z){
    const dx=x,dz=z-5.15,len=Math.hypot(dx,dz)||1;
    const angle=(58-clamp(z,-3.5,3.5)*1.0)*Math.PI/180;
    const speed=3.0+clamp(charge,0,1)*7.2;
    return {x:dx/len*speed*Math.cos(angle),y:speed*Math.sin(angle),z:dz/len*speed*Math.cos(angle)};
  }
  function toss(charge=state.charge){
    if(state.phase!=='playing'||state.paused||state.flight||state.ringsRemaining<=0)return false;
    charge=clamp(charge,0,1);
    const velocity=launchVelocity(charge),r=mesh(ringGeo,null,scene,ringMat),id=++throwId;
    r.position.set(0,1.5,5.15);ringMeshes.set(id,r);
    physics.launch({id,position:{x:0,y:1.5,z:5.15},velocity,spin:{x:.04,y:5,z:.025}});
    state.flight={id,mesh:r,charge,t:0,resolved:false};
    state.charging=false;state.charge=0;state.throws++;if(state.mode!=='practice')state.ringsRemaining--;
    emit('throw',{ringId:id,charge:+charge.toFixed(3),velocity});sound('throw');setText('status-text','出手了…等圈落稳');updateUI();return true;
  }
  function burst(pos,color){if(reduced)return;for(let i=0;i<23;i++){const m=mesh(new T.BoxGeometry(.065,.1,.026),i%3?color:0xffe4a0);m.position.copy(pos);m.position.y+=.5;const a=i*2.399;particles.push({mesh:m,v:new T.Vector3(Math.cos(a)*(1+i%3*.4),2.3+(i%5)*.3,Math.sin(a)*(1+i%4*.25)),life:.85+i%4*.08});}}
  function floatText(text,pos){const s=label(text,'#f0c944','#151619',512,130);s.position.copy(pos);s.position.y+=1.6;s.scale.set(2.0,.51,1);scene.add(s);floating.push({sprite:s,life:1.4});}
  function resolveFlight(f,result){
    if(f.resolved)return;f.resolved=true;
    const contactCount=result.contactCount||result.contacts?.length||0;
    const hit=targets.find(p=>p.id===result.hitTargetId&&!p.caught);
    if(hit){
      hit.caught=true;state.combo++;state.maxCombo=Math.max(state.maxCombo,state.combo);state.hits++;
      const multiplier=Math.min(2,1+(state.combo-1)*.25),score=Math.round(hit.points*multiplier);
      state.score+=score;state.roundScore+=score;state.roundTypes.add(hit.type.id);hit.ring=f.mesh;
      hit.badge.material.map.dispose();hit.badge.material.dispose();hit.badge.material=label('已入藏','#f0c944','#151619',256,105).material;
      save.collection[hit.type.id]=(Number(save.collection[hit.type.id])||0)+1;persist();refreshCollection();
      state.lastResult={hit:true,targetId:hit.id,score,ringId:f.id,contacts:contactCount,reason:result.reason};emit('hit',{ringId:f.id,targetId:hit.id,delta:score,combo:state.combo,physical:true});
      floatText('+'+score,hit.group.position);burst(hit.group.position,hit.type.color);sound('hit');
      setText('status-text',hit.type.name+'稳稳入圈！'+(state.combo>1?state.combo+' 连中':'开张了'));
      if(state.combo===3&&!state.bonusAwarded&&state.mode!=='practice'){state.bonusAwarded=true;state.ringsRemaining++;emit('bonusRing',{count:1});toast('三连中！摊主送你 1 只圈');}
      if(state.roundTypes.size>=3&&!state.missionAwarded&&state.mode!=='practice'){state.missionAwarded=true;state.score+=200;state.roundScore+=200;emit('mission',{delta:200});toast('花样收藏完成 · 额外 +200 分');}
    }else{
      state.combo=0;state.lastResult={hit:false,ringId:f.id,score:0,contacts:contactCount,reason:result.reason};emit('miss',{ringId:f.id,physical:true,reason:result.reason});sound('miss');
      setText('status-text',contactCount>0?'碰了一下，没留住。再试一次':'这圈没套住，换个力度试试');
    }
    state.flight=null;
    if(state.mode!=='practice'&&state.score>save.best[state.mode]){save.best[state.mode]=state.score;persist();}
    physics.setTargets(physicsTargets());updateUI();
    if(state.mode==='practice'&&targets.every(p=>p.caught)){practiceSet++;resetRound();toast('满载而归！新一批周边已上架');}
    else if(state.mode!=='practice'&&state.ringsRemaining===0)state.endDelay=.7;
  }
  function updatePhysics(dt){
    physics.setTargets(physicsTargets());
    const events=physics.step(dt),snap=physics.snapshot(),ids=new Set();
    for(const r of snap.rings){ids.add(r.id);const m=ringMeshes.get(r.id);if(m){m.position.copy(r.position);m.quaternion.copy(r.quaternion);}}
    for(const [id,m]of ringMeshes)if(!ids.has(id)){scene.remove(m);ringMeshes.delete(id);}
    for(const event of events)if(event.type==='settled'&&state.flight&&state.flight.id===event.id)resolveFlight(state.flight,event);
  }
  const raycaster=new T.Raycaster(),plane=new T.Plane(new T.Vector3(0,1,0),-.1),ndc=new T.Vector2(),point=new T.Vector3();
  function aimPointer(e){const r=renderer.domElement.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(ndc,camera);if(raycaster.ray.intersectPlane(plane,point)){aim.set(clamp(point.x,-4.8,4.8),.1,clamp(point.z,-3.5,3.5));}}
  renderer.domElement.addEventListener('pointerdown',e=>{if(e.button!==0&&e.pointerType==='mouse')return;if(pointerId!==null)return;aimPointer(e);if(beginCharge()){pointerId=e.pointerId;renderer.domElement.setPointerCapture(e.pointerId);e.preventDefault();}});
  renderer.domElement.addEventListener('pointermove',e=>{if(pointerId!==null&&pointerId!==e.pointerId)return;if(state.phase==='playing'&&!state.paused&&!state.flight)aimPointer(e);});
  renderer.domElement.addEventListener('pointerup',e=>{if(e.pointerId!==pointerId)return;if(state.charging){aimPointer(e);toss();}cancelCharge();});
  renderer.domElement.addEventListener('pointercancel',()=>cancelCharge());
  renderer.domElement.addEventListener('lostpointercapture',()=>{if(state.charging)cancelCharge();});
  renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());
  window.addEventListener('keydown',e=>{
    if(['SELECT','INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;
    if(e.code==='Space'&&document.activeElement?.tagName==='BUTTON')return;
    if(e.code==='KeyP'||e.code==='Escape'){if(!e.repeat){if(activeDialog==='help')closeHelp();else pause();}e.preventDefault();return;}
    if(state.phase!=='playing'||state.paused)return;
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(e.code))e.preventDefault();
    if(e.code==='Space'&&!e.repeat&&!keyboardHeld){keyboardHeld=beginCharge();}
    const d=.13; if(e.code==='ArrowLeft')aim.x-=d;if(e.code==='ArrowRight')aim.x+=d;if(e.code==='ArrowUp')aim.z-=d;if(e.code==='ArrowDown')aim.z+=d;aim.x=clamp(aim.x,-4.8,4.8);aim.z=clamp(aim.z,-3.5,3.5);
  });
  window.addEventListener('keyup',e=>{if(e.code==='Space'&&keyboardHeld){if(state.charging)toss();keyboardHeld=false;}});
  window.addEventListener('blur',()=>{if(state.phase==='playing'&&!state.paused)pause();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.phase==='playing'&&!state.paused)pause();audio.setPaused(state.paused||document.hidden||state.phase==='ready');});
  $('start-btn').onclick=()=>requestRestart($('mode-select').value);
  $('pause-btn').onclick=pause;$('help-btn').onclick=help;
  $('sound-btn').onclick=()=>{save.sound=!save.sound;audio.setEnabled(save.sound);unlockAudio();persist();updateUI();};
  if($('music-btn'))$('music-btn').onclick=()=>{save.music=!save.music;audio.setMusicEnabled(save.music);unlockAudio();persist();updateUI();};
  if($('music-volume'))$('music-volume').oninput=e=>{save.musicVolume=Number(e.target.value)/100;audio.setVolume(save.musicVolume);persist();};
  if($('shuffle-btn'))$('shuffle-btn').onclick=()=>{if(state.mode==='practice'&&!state.flight){cancelCharge();practiceSet++;resetRound();toast('换上新一批币安周边');}};
  $('mode-select').onchange=e=>{const mode=e.target.value;if(state.phase==='ready'){state.mode=mode;updateUI();}else requestRestart(mode);};
  $('collection-btn').onclick=()=>{$('collection-list').scrollIntoView({behavior:reduced?'auto':'smooth',block:'center'});toast(`周边图鉴 · 已收集 ${types.filter(t=>save.collection[t.id]>0).length} / ${types.length} 种`);};
  function update(dt){
    toyTime+=dt;
    if(!state.paused&&(state.phase==='playing'||state.phase==='ready')){
      if(state.phase==='playing')state.time+=dt;
      if(state.charging){state.chargeTime+=dt;state.charge=Math.min(1,state.chargeTime/1.55);}
      for(const p of targets){
        if(p.moving&&!p.caught){p.x=p.originX+Math.sin(state.time*.95+(state.mode==='daily'?1.5:0))*(state.round===3?1.18:.8);p.group.position.x=p.x;}
        p.toy.rotation.y=0;
        p.toy.position.y=.12;
      }
      if(state.phase==='playing'){if(state.flight)state.flight.t+=dt;updatePhysics(dt);}
      if(state.endDelay>0){state.endDelay-=dt;if(state.endDelay<=0&&state.phase==='playing')endRound();}
    }
    for(let i=particles.length-1;i>=0;i--){const p=particles[i];if(!state.paused){p.life-=dt;p.v.y-=5*dt;p.mesh.position.addScaledVector(p.v,dt);p.mesh.rotation.x+=dt*3;p.mesh.rotation.z+=dt*5;}if(p.life<=0){scene.remove(p.mesh);p.mesh.geometry.dispose();particles.splice(i,1);}}
    for(let i=floating.length-1;i>=0;i--){const f=floating[i];if(!state.paused){f.life-=dt;f.sprite.position.y+=dt*.55;f.sprite.material.opacity=clamp(f.life/.35,0,1);}if(f.life<=0){scene.remove(f.sprite);f.sprite.material.map.dispose();f.sprite.material.dispose();floating.splice(i,1);}}
    aimGroup.position.set(aim.x,.23,aim.z);
    const visible=state.phase==='playing'&&!state.paused&&!state.flight;aimGroup.visible=visible;heldRing.visible=!state.flight;
    heldRing.position.y=1.5+(state.charging?state.charge*.16:Math.sin(toyTime*1.6)*.025);
    heldRing.rotation.z=state.charging?Math.sin(toyTime*18)*.015:0;
    const near=targets.filter(p=>!p.caught).map(p=>({p,d:Math.hypot(aim.x-p.x,aim.z-p.z)})).sort((a,b)=>a.d-b.d)[0];
    if(near&&near.d<.85){setText('prize-name',near.p.type.name+(near.p.moving?' · 移动':''));setText('prize-value',`${near.p.points} 分`);reticle.material.color.setHex(0xf4d16a);}
    else {setText('prize-name','方向参考 · 力度决定远近');setText('prize-value','瞄准中');reticle.material.color.setHex(0xf4d16a);}
    if(state.charging)updateUI();
  }
  function resize(){const w=mount.clientWidth,h=mount.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;const ratio=w/h;
    const mobileScale=Math.max(.84,.65/ratio),narrow=ratio<1.08;
    camera.position.set(0,narrow?14.0*mobileScale:9.0,narrow?22.0*mobileScale:14.8);camera.fov=narrow?43:36;camera.lookAt(0,1.30,-.05);camera.updateProjectionMatrix();}
  new ResizeObserver(resize).observe(mount);resize();
  let last=performance.now();function frame(now){const dt=Math.min((now-last)/1000,.05);last=now;update(dt);renderer.render(scene,camera);requestAnimationFrame(frame);}requestAnimationFrame(frame);
  function snapshot(){return {phase:state.phase,mode:state.mode,round:state.round,score:state.score,roundScore:state.roundScore,ringsRemaining:state.ringsRemaining,combo:state.combo,maxCombo:state.maxCombo,hits:state.hits,throws:state.throws,paused:state.paused,time:state.time,charge:state.charge,charging:state.charging,wind:state.wind,flight:state.flight?{id:state.flight.id,t:state.flight.t,charge:state.flight.charge,body:physics.getRing(state.flight.id)}:null,aim:{x:aim.x,z:aim.z},lastResult:state.lastResult,targets:targets.map(p=>({id:p.id,type:p.type.id,x:p.x,z:p.z,points:p.points,caught:p.caught,moving:p.moving,collider:p.toy.userData.collider})),events:state.events,collection:save.collection,best:save.best,physics:physics.snapshot(),audio:audio.getState(),music:save.music,merchCount:types.length,coordinateSystem:'x: left to right; y: up; z: far (-) to near (+). Board x [-5,5], z [-4,4].'};}
  window.render_game_to_text=()=>JSON.stringify(snapshot());
  window.advanceTime=ms=>{for(let t=0;t<ms;t+=1000/60)update(Math.min(1000/60,ms-t)/1000);renderer.render(scene,camera);};
  if(new URLSearchParams(location.search).has('test'))window.__gameTest={launchVelocity,physics, audio, start,aim:(x,z)=>aim.set(clamp(x,-4.8,4.8),.1,clamp(z,-3.5,3.5)),toss,snapshot,targets:()=>snapshot().targets,project:(x,y,z)=>{const v=new T.Vector3(x,y,z).project(camera),r=renderer.domElement.getBoundingClientRect();return {x:r.left+(v.x+1)*r.width/2,y:r.top+(1-v.y)*r.height/2};},pause,nextRound,advance:window.advanceTime};
  physics.reset(physicsTargets());refreshCollection();updateUI();showReady();
})();
