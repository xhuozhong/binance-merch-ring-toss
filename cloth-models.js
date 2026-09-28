/* Dimensional fabric prizes: folded garments, sewn bags, a rolled towel and knitted socks.
   Original geometry and procedural textile textures. No silhouette/photo extrusion. */
(function (global) {
  'use strict';
  const SUPPORTED=new Set(['hoodie','tshirt','pajamas','tote','bag','towel','socks']);
  const materialCache=new WeakMap();
  function materials(T){
    if(materialCache.has(T))return materialCache.get(T);
    function texture(color,mode){
      if(typeof document==='undefined')return null;
      const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
      const c=canvas.getContext('2d');c.fillStyle=mode==='rough'?'#fafafa':mode==='bump'?'#808080':color;c.fillRect(0,0,128,128);
      let seed=21047;
      for(let y=0;y<128;y+=2)for(let x=0;x<128;x+=2){
        seed=(seed*1664525+1013904223)>>>0;const n=seed/4294967296;
        if(mode==='bump'){const v=Math.round(105+n*37+(((x+y)%8)?0:27));c.fillStyle='rgb('+v+','+v+','+v+')';}
        else if(mode==='rough'){const v=235+Math.round(n*20);c.fillStyle='rgb('+v+','+v+','+v+')';}
        else c.fillStyle=n>.5?'rgba(255,244,204,.075)':'rgba(0,0,0,.09)';
        c.fillRect(x,y,1+(y%4===0?1:0),1+(x%4===0?1:0));
      }
      c.lineWidth=1;c.strokeStyle=mode==='bump'?'#aaa':mode==='rough'?'#f6f6f6':'rgba(255,255,255,.045)';
      for(let i=1;i<128;i+=4){c.beginPath();c.moveTo(i,0);c.lineTo(i,128);c.stroke();}
      const map=new T.CanvasTexture(canvas);map.wrapS=map.wrapT=T.RepeatWrapping;map.repeat.set(3,3);map.anisotropy=4;
      map.userData.shared=true;
      if(mode==='color'&&T.SRGBColorSpace)map.colorSpace=T.SRGBColorSpace;
      return map;
    }
    const bump=texture(null,'bump'),roughness=texture(null,'rough');
    function fabric(color,bumpScale=.002){const map=texture(color,'color');return new T.MeshStandardMaterial({color:map?'#ffffff':color,map,bumpMap:bump,bumpScale,roughnessMap:roughness,roughness:.99,metalness:0,side:T.DoubleSide});}
    const m={yellow:fabric('#e9b817'),gold:fabric('#c49512'),black:fabric('#191d24'),dark:fabric('#090c10'),edge:fabric('#3a3c40'),cream:fabric('#ddd7bd'),knit:fabric('#e7b81d',.003),nylon:fabric('#171b21',.0015)};
    m.hardware=new T.MeshStandardMaterial({color:'#8e8d78',roughness:.49,metalness:.6});
    Object.values(m).forEach(material=>{material.userData.shared=true;});
    materialCache.set(T,m);return m;
  }
  function create(type,T){
    const id=typeof type==='string'?type:type&&type.id;if(!SUPPORTED.has(id))return null;
    const g=new T.Group();g.name='FabricPrize:'+id;const m=materials(T);
    function mesh(geometry,material,parent=g){const o=new T.Mesh(geometry,material);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
    function geometry(positions,indices,uv){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));if(uv)geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();return geo;}
    function surface(nx,ny,fn,mat,parent=g){const p=[],ix=[],uv=[];for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){p.push(...fn(i/nx,j/ny));uv.push(i/nx,j/ny);}for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i,b=a+1,c=a+nx+1,d=c+1;ix.push(a,c,b,b,c,d);}return mesh(geometry(p,ix,uv),mat,parent);}
    function slab(w,d,h,y,mat,x=0,z=0,parent=g,crease=.006){
      const part=new T.Group();part.position.set(x,y,z);parent.add(part);
      // A narrow rolled cloth edge, with continuous analytic normals at split UV
      // seams. Radius follows layer thickness: folded cloth, not a padded pillow.
      const geo=new T.BoxGeometry(w,h,d,6,3,5),p=geo.attributes.position,n=geo.attributes.normal;
      const r=Math.min(h*.30,.013),point=new T.Vector3(),core=new T.Vector3(),normal=new T.Vector3();
      const fold=(u,v)=>crease*(Math.sin(u*10+v*3)*.42+Math.sin(v*16-u*2)*.23)*(.32+.68*Math.sin(Math.PI*u)*Math.sin(Math.PI*v));
      for(let i=0;i<p.count;i++){
        point.fromBufferAttribute(p,i);core.set(Math.max(-w/2+r,Math.min(w/2-r,point.x)),Math.max(-h/2+r,Math.min(h/2-r,point.y)),Math.max(-d/2+r,Math.min(d/2-r,point.z)));
        normal.copy(point).sub(core).normalize();point.copy(core).addScaledVector(normal,r);
        const u=point.x/w+.5,v=point.z/d+.5,top=Math.max(0,Math.min(1,point.y/h+.5)),corner=Math.pow(Math.abs(2*u-1)*Math.abs(2*v-1),9);
        point.x*=1-corner*.025;point.z*=1-corner*.025;point.y+=fold(u,v)*top;
        const e=.001,dx=(fold(u+e,v)-fold(u-e,v))/(2*e*w)*top,dz=(fold(u,v+e)-fold(u,v-e))/(2*e*d)*top;
        normal.set(normal.x-normal.y*dx,normal.y,normal.z-normal.y*dz).normalize();p.setXYZ(i,point.x,point.y,point.z);n.setXYZ(i,normal.x,normal.y,normal.z);
      }
      mesh(geo,mat,part);
      return part;
    }
    function tube(points,radius,mat,parent=g,segments=16,sides=4){const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));return mesh(new T.TubeGeometry(curve,segments,radius,sides,false),mat,parent);}
    function cylinder(radius,height,mat,x,y,z,parent=g,open=false){const o=mesh(new T.CylinderGeometry(radius,radius,height,20,1,open),mat,parent);o.position.set(x,y,z);return o;}
    function torus(r,t,mat,x,y,z,parent=g){const o=mesh(new T.TorusGeometry(r,t,5,24),mat,parent);o.position.set(x,y,z);return o;}
    function patch(points,mat,parent=g,thickness=.01){const p=[],ix=[],uv=[],n=points.length;points.forEach(a=>{p.push(...a);uv.push(a[0]+.5,a[2]+.5);});points.forEach(a=>{p.push(a[0],a[1]-thickness,a[2]);uv.push(a[0]+.5,a[2]+.5);});for(let i=1;i<n-1;i++)ix.push(0,i,i+1,n,n+i+1,n+i);for(let i=0;i<n;i++){const k=(i+1)%n;ix.push(i,n+i,k,k,n+i,n+k);}return mesh(geometry(p,ix,uv),mat,parent);}
    function ribbon(points,width,mat,parent=g,segments=22,thickness=.012){
      const path=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),p=[],uv=[],ix=[];
      for(let i=0;i<=segments;i++){const u=i/segments,v=path.getPoint(u),t=path.getTangent(u),len=Math.hypot(t.x,t.y)||1,dx=-t.y/len*width/2,dy=t.x/len*width/2;for(const z of [-thickness/2,thickness/2])for(const s of [-1,1]){p.push(v.x+dx*s,v.y+dy*s,v.z+z);uv.push((s+1)/2,u*3);}}
      for(let i=0;i<segments;i++){const a=i*4,b=a+4;ix.push(a,a+1,b,a+1,b+1,b,a+2,b+2,a+3,a+3,b+2,b+3,a,b,a+2,a+2,b,b+2,a+1,a+3,b+1,a+3,b+3,b+1);}ix.push(0,2,1,1,2,3);const q=segments*4;ix.push(q,q+1,q+2,q+1,q+3,q+2);return mesh(geometry(p,ix,uv),mat,parent);
    }
    function print(w,h,paint,x,y,z,top=false,parent=g){
      if(typeof document==='undefined')return null;const c=document.createElement('canvas');c.width=1024;c.height=512;const ctx=c.getContext('2d');paint(ctx,c.width,c.height);
      const map=new T.CanvasTexture(c);if(T.SRGBColorSpace)map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
      const mat=new T.MeshStandardMaterial({map,transparent:true,alphaTest:.06,depthWrite:false,roughness:.98,metalness:0,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1});
      const o=mesh(new T.PlaneGeometry(w,h),mat,parent);o.castShadow=false;o.position.set(x,y,z);if(top)o.rotation.x=-Math.PI/2;return o;
    }
    function mark(ctx,w,h,color){const shapes=[[[1.84252,1.169291],[0,3.011811],[-1.84252,1.145669],[-1.181102,.507874],[0,1.665354],[1.181102,.507874]],[[-2.338583,.649606],[-3,.035433],[-3,-.035433],[-2.362205,-.673228],[-1.700787,-.011811]],[[-.023622,.673228],[-.685039,-.011811],[0,-.673228],[.661417,.011811]],[[2.338583,.673228],[1.677165,.011811],[2.338583,-.673228],[3,-.011811]],[[-1.84252,-1.145669],[-.023622,-3.011811],[1.84252,-1.169291],[1.181102,-.507874],[0,-1.665354],[-1.181102,-.507874]]];ctx.fillStyle=color;const s=Math.min(w,h)/6.8;for(const shape of shapes){ctx.beginPath();shape.forEach(([x,y],i)=>i?ctx.lineTo(w/2+x*s,h/2-y*s):ctx.moveTo(w/2+x*s,h/2-y*s));ctx.closePath();ctx.fill();}}
    function logo(size,x,y,z,color='#1a1d21',top=false,parent=g){return print(size,size,(c,w,h)=>mark(c,w,h,color),x,y,z,top,parent);}
    function label(text,w,h,x,y,z,color='#ecc442',top=false,parent=g){return print(w,h,(c,cw,ch)=>{c.fillStyle=color;c.textAlign='center';c.textBaseline='middle';c.font='900 100px Arial';c.fillText(text,cw/2,ch/2,cw*.94);},x,y,z,top,parent);}
    function edgeRectangle(w,d,y,z,mat=m.gold){tube([[-w/2,y,z-d/2],[-w/2,y-.001,z],[-w/2,y,z+d/2],[-w*.26,y+.0015,z+d/2-.002],[0,y-.001,z+d/2],[w*.27,y+.001,z+d/2-.002],[w/2,y,z+d/2],[w/2,y-.001,z],[w/2,y,z-d/2]],.0032,mat,g,22,3);}
    function collar(x,y,z,mat,r=.115){const ring=torus(r,.016,mat,x,y,z);ring.rotation.x=-Math.PI/2;ring.scale.y=.67;const disc=mesh(new T.CircleGeometry(r*.88,24),m.dark);disc.rotation.x=-Math.PI/2;disc.position.set(x,y-.008,z);disc.scale.y=.67;}

    if(id==='hoodie'){
      slab(.80,.84,.045,.027,m.gold);slab(.81,.80,.072,.082,m.yellow);slab(.78,.75,.043,.137,m.yellow,0,.022);
      const left=slab(.23,.60,.044,.174,m.yellow,-.255,-.012);left.rotation.y=-.20;
      const right=slab(.23,.58,.044,.176,m.yellow,.253,-.005);right.rotation.y=.20;
      slab(.23,.095,.049,.183,m.gold,-.21,.23).rotation.y=-.20;slab(.23,.095,.049,.184,m.gold,.21,.23).rotation.y=.20;
      slab(.73,.082,.028,.168,m.gold,0,.36);edgeRectangle(.72,.70,.163,.022);
      const lining=mesh(new T.CircleGeometry(.168,24),m.gold);lining.rotation.x=-Math.PI/2;lining.scale.y=.77;lining.position.set(0,.188,-.27);
      // Curved fabric fills the hood's back and sides beneath its rolled opening;
      // the old exposed U-shaped rim alone read as a bag handle from this camera.
      const hood=(u,v,outer)=>{const a=u*Math.PI;return[Math.cos(a)*.182*v,.181+(.095*Math.sin(a)+.014)*Math.pow(v,1.45)-(outer?.008:0),-.20-.22*Math.sin(a)*v-(outer?.006:0)];};
      surface(12,5,(u,v)=>hood(u,v,true),m.yellow);surface(12,5,(u,v)=>hood(u,v,false),m.gold);
      tube([[-.165,.194,-.19],[-.20,.25,-.34],[0,.287,-.43],[.20,.25,-.34],[.165,.194,-.19]],.040,m.yellow,g,18,6);
      tube([[-.12,.218,-.19],[-.11,.207,-.085],[-.075,.193,.08]],.007,m.cream,g,12,4);
      tube([[.12,.218,-.19],[.13,.204,-.035],[.11,.193,.12]],.007,m.cream,g,12,4);
      cylinder(.010,.035,m.dark,-.075,.194,.10).rotation.x=Math.PI/2;cylinder(.010,.035,m.dark,.11,.194,.14).rotation.x=Math.PI/2;
      logo(.19,0,.162,.19,'#191b20',true);
      tube([[-.115,.166,.32],[-.11,.177,.26],[.11,.177,.26],[.115,.166,.32]],.004,m.gold,g,14,3);
    }else if(id==='tshirt'){
      const a=slab(.32,.32,.025,.044,m.black,-.285,-.22);a.rotation.y=-.32;const b=slab(.32,.32,.025,.043,m.black,.285,-.22);b.rotation.y=.32;
      slab(.72,.81,.038,.03,m.dark);slab(.735,.80,.055,.072,m.black);slab(.70,.78,.035,.116,m.black,0,.012);
      slab(.69,.060,.019,.142,m.black,0,.359);edgeRectangle(.67,.71,.138,.008,m.edge);collar(0,.142,-.282,m.black,.12);
      print(.58,.27,(c,w,h)=>{c.fillStyle='#edc443';c.textAlign='center';c.font='900 182px Arial';c.fillText('EXCHANGE',w/2,208,w*.94);c.font='900 166px Arial';c.fillText('THE WORLD',w/2,410,w*.94);},0,.144,.09,true);
      logo(.09,-.23,.142,-.19,'#edc443',true);
    }else if(id==='pajamas'){
      slab(.78,.88,.054,.032,m.dark);slab(.82,.83,.052,.09,m.black);slab(.77,.77,.037,.133,m.black,0,.022);
      const sleeve=slab(.22,.58,.035,.162,m.black,-.275,.02);sleeve.rotation.y=-.16;
      const sleeve2=slab(.22,.56,.035,.161,m.black,.275,.03);sleeve2.rotation.y=.16;
      patch([[-.27,.16,-.35],[-.075,.168,-.38],[.025,.201,-.07],[-.07,.164,.05]],m.black);
      patch([[.27,.16,-.35],[.075,.168,-.38],[-.025,.201,-.07],[.07,.164,.05]],m.black);
      tube([[-.27,.166,-.35],[-.07,.169,.05],[.025,.205,-.07],[-.075,.173,-.38]],.004,m.yellow,g,16,3);
      tube([[.27,.166,-.35],[.07,.169,.05],[-.025,.205,-.07],[.075,.173,-.38]],.004,m.yellow,g,16,3);
      tube([[0,.16,-.015],[0,.16,.18],[0,.16,.392]],.004,m.yellow,g,10,3);
      for(const z of [.08,.20,.32])cylinder(.011,.008,m.cream,.028,.161,z);
      slab(.15,.14,.009,.158,m.black,.205,.075);tube([[.132,.165,.006],[.132,.165,.143],[.28,.165,.143],[.28,.165,.006]],.003,m.yellow,g,12,3);
      edgeRectangle(.71,.70,.155,.036,m.yellow);logo(.064,.204,.166,.07,'#e7bb32',true);
    }else if(id==='towel'){
      slab(.88,.31,.033,.019,m.gold,0,.10, g,.003);
      const roll=cylinder(.205,.87,m.knit,0,.223,0,g,true);roll.rotation.z=Math.PI/2;
      for(const x of [-.439,.439]){
        const end=mesh(new T.CircleGeometry(.202,28),m.gold);end.rotation.y=x<0?-Math.PI/2:Math.PI/2;end.position.set(x,.223,0);
        const points=[];for(let i=0;i<=60;i++){const t=i/60,a=t*Math.PI*6,r=.014+t*.183;points.push([x+(x<0?-.002:.002),.223+Math.sin(a)*r,Math.cos(a)*r]);}
        tube(points,.0042,m.yellow,g,60,3);const rim=torus(.20,.004,m.yellow,x,.223,0);rim.rotation.y=Math.PI/2;
      }
      for(const x of [-.26,-.18]){const stripe=cylinder(.207,.027,m.black,x,.223,0,g,true);stripe.rotation.z=Math.PI/2;}
      logo(.14,.12,.237,.206,'#17191c');label('BINANCE',.28,.07,.12,.147,.193,'#1b1d21');
    }else if(id==='tote'){
      const width=.82,height=.69,depth=.30;
      const front=(u,v,sign,inside=false)=>{const x=(u-.5)*(width-.07*(1-v)),y=.025+v*height,fold=(Math.sin(u*Math.PI*8+v*2)*.011+Math.cos(v*9+u*3)*.006)*Math.sin(v*Math.PI);return[x,y,sign*(depth/2+fold-(inside?.014:0))];};
      for(const sign of [-1,1]){surface(10,7,(u,v)=>front(u,v,sign),m.yellow);surface(8,6,(u,v)=>front(u,v,sign,true),m.dark);}
      for(const side of [-1,1])surface(4,7,(u,v)=>[side*((width-.07*(1-v))/2-.033*Math.sin(u*Math.PI)),.025+v*height,(u-.5)*depth],m.gold);
      slab(.75,.27,.026,.02,m.dark);
      for(const sign of [-1,1]){
        tube([[-.41,.718,sign*.15],[0,.706,sign*.151],[.41,.718,sign*.15]],.009,m.gold,g,16,4);
        ribbon([[-.23,.68,sign*.157],[-.235,.96,sign*.14],[0,1.135,sign*.118],[.235,.96,sign*.14],[.23,.68,sign*.157]],.048,m.yellow,g,24,.011);
        for(const side of [-1,1])tube([[side*.367,.05,sign*.151],[side*.389,.37,sign*.155],[side*.402,.699,sign*.151]],.0035,m.gold,g,12,3);
      }
      logo(.30,0,.42,.167,'#15191e');label('BINANCE',.49,.10,0,.22,.163,'#15191e');
      for(const x of [-.23,.23]){tube([[x-.023,.69,.163],[x-.023,.62,.163],[x+.023,.62,.163],[x+.023,.69,.163]],.0025,m.gold,g,8,3);}
    }else if(id==='bag'){
      const geo=new T.BoxGeometry(.88,.43,.31,7,4,3),pos=geo.attributes.position;
      for(let i=0;i<pos.count;i++){const v=new T.Vector3().fromBufferAttribute(pos,i),core=new T.Vector3(Math.max(-.405,Math.min(.405,v.x)),Math.max(-.18,Math.min(.18,v.y)),Math.max(-.12,Math.min(.12,v.z))),delta=v.clone().sub(core);if(delta.length())delta.normalize().multiplyScalar(.035);v.copy(core).add(delta);v.z+=Math.sin(v.x*28)*Math.sin((v.y+.215)*Math.PI/.43)*.004;pos.setXYZ(i,v.x,v.y+.234,v.z);}geo.computeVertexNormals();mesh(geo,m.nylon);
      patch([[-.435,.465,.123],[.435,.465,.123],[.409,.245,.185],[.32,.222,.19],[-.32,.222,.19],[-.409,.245,.185]],m.black,g,.017);
      tube([[-.413,.447,.151],[-.397,.26,.191],[-.30,.241,.198],[.30,.241,.198],[.397,.26,.191],[.413,.447,.151]],.0038,m.edge,g,24,3);
      tube([[-.29,.173,.162],[.29,.173,.162]],.008,m.dark,g,12,5);
      for(let i=0;i<18;i++){const tooth=mesh(new T.BoxGeometry(.014,.010,.009),m.hardware);tooth.position.set(-.275+i*.032,.173,.173);}
      const zip=mesh(new T.BoxGeometry(.045,.023,.012),m.hardware);zip.position.set(.282,.163,.177);zip.rotation.z=-.4;
      ribbon([[-.425,.37,.0],[-.477,.78,-.015],[-.23,1.01,-.06],[.20,1.035,-.065],[.474,.80,-.015],[.425,.37,.0]],.063,m.yellow,g,30,.014);
      for(const x of [-.434,.434]){const ring=torus(.038,.008,m.hardware,x,.399,0);ring.rotation.y=Math.PI/2;}
      const adjust=mesh(new T.BoxGeometry(.082,.048,.023),m.hardware);adjust.position.set(-.476,.721,-.005);adjust.rotation.z=.02;
      const stamp=logo(.155,0,.331,.166,'#e8bd29'),word=label('BINANCE',.24,.051,0,.274,.182,'#e8bd29');if(stamp)stamp.rotation.x=-.28;if(word)word.rotation.x=-.28;
      tube([[-.40,.043,.135],[0,.032,.157],[.40,.043,.135]],.004,m.edge,g,16,3);
    }else if(id==='socks'){
      function sock(x,angle){
        const s=new T.Group();s.position.x=x;s.rotation.y=angle;g.add(s);
        const curve=new T.CatmullRomCurve3([new T.Vector3(0,.686,-.045),new T.Vector3(0,.47,-.038),new T.Vector3(0,.26,.005),new T.Vector3(0,.125,.13),new T.Vector3(0,.103,.285)]);
        const steps=22,sides=10,frames=curve.computeFrenetFrames(steps,false),p=[],uv=[],ix=[];
        for(let i=0;i<=steps;i++){const t=i/steps,c=curve.getPoint(t),r=.089+(t>.55?.013:0),n=frames.normals[i],b=frames.binormals[i];for(let j=0;j<=sides;j++){const a=j/sides*Math.PI*2,v=c.clone().addScaledVector(n,Math.cos(a)*r).addScaledVector(b,Math.sin(a)*r);p.push(v.x,v.y,v.z);uv.push(j/sides*2,t*4);}}
        for(let i=0;i<steps;i++)for(let j=0;j<sides;j++){const a=i*(sides+1)+j,c=a+sides+1;ix.push(a,a+1,c,a+1,c+1,c);}mesh(geometry(p,ix,uv),m.knit,s);
        const toe=mesh(new T.SphereGeometry(1,14,8),m.knit,s);toe.position.set(0,.103,.28);toe.scale.set(.102,.085,.125);
        cylinder(.096,.062,m.knit,0,.681,-.045,s,true);cylinder(.078,.040,m.dark,0,.685,-.045,s,true);
        const cuff=torus(.088,.009,m.yellow,0,.714,-.045,s);cuff.rotation.x=-Math.PI/2;
        for(const y of [.619,.565])cylinder(.0915,.026,m.black,0,y,-.042,s,true);
        logo(.095,0,.43,.055,'#1b1f22',false,s);
        tube([[-.079,.082,.21],[0,.031,.25],[.079,.082,.21]],.0035,m.gold,s,12,3);
      }
      sock(-.165,-.15);sock(.165,.13);
    }
    // Static prizes: bake nested folds and seams into one draw per material.
    // Printed labels retain their own material; texture maps are never flattened photographs.
    g.updateMatrixWorld(true);const batches=new Map(),oldGeometry=[];
    g.traverse(o=>{if(!o.isMesh)return;let batch=batches.get(o.material);if(!batch){batch={p:[],n:[],uv:[]};batches.set(o.material,batch);}const geo=o.geometry.clone().applyMatrix4(o.matrixWorld),p=geo.attributes.position,n=geo.attributes.normal,u=geo.attributes.uv,index=geo.index,count=index?index.count:p.count;
      for(let j=0;j<count;j++){const k=index?index.getX(j):j;batch.p.push(p.getX(k),p.getY(k),p.getZ(k));batch.n.push(n.getX(k),n.getY(k),n.getZ(k));batch.uv.push(u?u.getX(k):0,u?u.getY(k):0);}geo.dispose();oldGeometry.push(o.geometry);
    });
    g.clear();oldGeometry.forEach(geo=>geo.dispose());
    batches.forEach((batch,mat)=>{const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(batch.p,3));geo.setAttribute('normal',new T.Float32BufferAttribute(batch.n,3));geo.setAttribute('uv',new T.Float32BufferAttribute(batch.uv,2));mesh(geo,mat);});
    g.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(g),center=new T.Vector3();bounds.getCenter(center);
    g.children.forEach(child=>{child.position.x-=center.x;child.position.y-=bounds.min.y;child.position.z-=center.z;});
    g.updateMatrixWorld(true);const finalBounds=new T.Box3().setFromObject(g),size=new T.Vector3();finalBounds.getSize(size);let triangles=0;
    g.traverse(o=>{if(o.isMesh&&o.geometry)triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;});
    g.userData.clothModel={id,width:size.x,height:size.y,depth:size.z,triangles,construction:'dimensional sewn/folded fabric',photoPlane:false};
    return g;
  }
  global.LuckyClothModels=Object.freeze({create});
})(typeof window!=='undefined'?window:globalThis);
