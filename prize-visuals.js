/* Solid prize geometry, bottom-centred with measured collision dimensions. */
(function (root) {
  'use strict';
  const textures = new WeakMap();
  const cylinderIds = new Set(['bottle', 'hat', 'umbrella', 'tennis']);
  function surface(T, fabric) {
    let cache=textures.get(T);if(!cache){cache={};textures.set(T,cache);}
    const key=fabric?'weave':'grain';if(cache[key])return cache[key];
    if(typeof document==='undefined')return null;
    const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
    const ctx=canvas.getContext('2d'),im=ctx.createImageData(128,128);
    let seed=73491;for(let y=0;y<128;y++)for(let x=0;x<128;x++){
      seed=(Math.imul(seed,1664525)+1013904223)>>>0;
      const thread=fabric?((x%4===0?22:-5)+(y%4===0?18:-4)):0;
      const value=128+thread+(seed>>>27)-16,i=(y*128+x)*4;
      im.data[i]=im.data[i+1]=im.data[i+2]=value;im.data[i+3]=255;
    }
    ctx.putImageData(im,0,0);const map=new T.CanvasTexture(canvas);
    map.wrapS=map.wrapT=T.RepeatWrapping;map.repeat.set(fabric?5:3,fabric?5:3);
    map.userData.shared=true;map.anisotropy=4;cache[key]=map;return map;
  }
  function refineLegacy(model,id,T){
    const cloth=['hat','tennis','umbrella'].includes(id),seen=new Set();
    model.traverse(o=>{
      if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;
      for(const m of Array.isArray(o.material)?o.material:[o.material]){
        if(seen.has(m)||m.map||m.transparent)continue;seen.add(m);
        if(m.metalness>.5){m.roughness=.26;m.envMapIntensity=.7;continue;}
        m.roughness=cloth?.94:id==='bottle'?.69:id==='keyboard'?.68:id==='passport'?.78:.61;
        m.metalness=id==='bottle'?.22:0;m.envMapIntensity=.6;
        m.bumpMap=surface(T,cloth);m.bumpScale=cloth?.0028:.001;
      }
    });
    if(id==='keyboard')model.rotation.x=-Math.PI/2;
    if(id==='racket'){model.rotation.x=-1.23;model.rotation.z=-.24;}
    return model;
  }
  function create(type,T){
    const id=typeof type==='string'?type:type.id;
    let model=root.LuckyHeroModels?.create(type,T)||root.LuckyClothModels?.create(type,T);
    if(!model)model=refineLegacy(root.LuckyMerch.create(type,T,{raw:true}),id,T);
    model.updateMatrixWorld(true);
    let box=new T.Box3().setFromObject(model),size=box.getSize(new T.Vector3());
    const widths={bottle:.47,hat:.76,passport:.60,umbrella:.33,massager:.65,tennis:.70};
    let scale=(widths[id]||.76)/Math.max(size.x,.001);
    scale=Math.min(scale,.91/Math.hypot(size.x,size.z),1.16/Math.max(size.y,.001));
    model.scale.multiplyScalar(scale);model.updateMatrixWorld(true);
    box=new T.Box3().setFromObject(model);size=box.getSize(new T.Vector3());
    const center=box.getCenter(new T.Vector3());model.position.x-=center.x;model.position.y-=box.min.y;model.position.z-=center.z;
    const group=new T.Group();group.name='SolidPrize:'+id;group.add(model);
    const radius=Math.max(size.x,size.z)/2;
    group.userData.collider={shape:cylinderIds.has(id)?'cylinder':'box',radius,height:size.y,halfExtents:{x:size.x/2,y:size.y/2,z:size.z/2}};
    let triangles=0,meshes=0;const materials=new Set();group.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position?.count||0)/3;(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));}});
    group.userData.solidModel={id,ready:true,source:'Constructed three-dimensional geometry',meshes,triangles,materials:materials.size,width:size.x,height:size.y,depth:size.z};
    return group;
  }
  root.LuckyPrizeVisuals={create};
})(window);
