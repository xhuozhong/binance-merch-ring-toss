/* Volumetric hero props for Three.js r160. No external textures or cached GPU
 * resources. Every returned group owns its geometries/materials/textures. */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;
  const GOLD = '#e9ae27', WHITE = '#eeece2', BLACK = '#17191c';
  function create(type, T) {
    const id = typeof type === 'string' ? type : type && type.id;
    if (!['sneaker', 'suitcase', 'yellowcase'].includes(id)) return null;
    if (!T) throw new Error('LuckyHeroModels.create requires Three.js.');
    const group = new T.Group(); group.name = 'SolidHero:' + id;
    group.userData = { heroModel:true, merchId:id, source:'Original volumetric mesh, informed by supplied product references', shared:false };
    const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
    const vec = (x,y,z) => new T.Vector3(x,y,z);
    const resources = { geometries:[], materials:[], textures:[] };
    function own(resource, kind) { resource.userData = Object.assign({}, resource.userData, { shared:false }); resources[kind].push(resource); return resource; }
    function material(options) { return own(new T.MeshPhysicalMaterial(Object.assign({roughness:.6,metalness:0},options)), 'materials'); }
    function mesh(geometry, mat, parent = group) {
      own(geometry,'geometries'); const object=new T.Mesh(geometry,mat); object.castShadow=true;object.receiveShadow=true;parent.add(object);return object;
    }
    function texture(width,height,draw,repeat) {
      const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;draw(canvas.getContext('2d'),width,height);
      const result=own(new T.CanvasTexture(canvas),'textures');result.colorSpace=T.SRGBColorSpace;result.anisotropy=4;
      if(repeat){result.wrapS=result.wrapT=T.RepeatWrapping;result.repeat.set(repeat,repeat);}
      return result;
    }
    function grain(repeat=5) {
      const result=texture(128,128,(ctx,w,h)=>{
        const data=ctx.createImageData(w,h);let seed=76129;
        for(let i=0;i<w*h;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const shade=100+(seed>>>25);data.data[i*4]=data.data[i*4+1]=data.data[i*4+2]=shade;data.data[i*4+3]=255;}ctx.putImageData(data,0,0);
      },repeat);result.colorSpace=T.NoColorSpace;return result;
    }
    function brand(ctx,x,y,size,color) {
      ctx.save();ctx.translate(x,y);ctx.fillStyle=color;
      function diamond(cx,cy,r){ctx.beginPath();ctx.moveTo(cx,cy-r);ctx.lineTo(cx+r,cy);ctx.lineTo(cx,cy+r);ctx.lineTo(cx-r,cy);ctx.closePath();ctx.fill();}
      diamond(0,0,size*.13);diamond(0,-size*.36,size*.16);diamond(0,size*.36,size*.16);diamond(-size*.36,0,size*.16);diamond(size*.36,0,size*.16);ctx.restore();
    }
    function roundedBoxGeometry(w,h,d,r,segments=6) {
      r=Math.min(r,w*.49,h*.49,d*.49);
      const geometry=new T.BoxGeometry(w,h,d,segments,segments,segments),position=geometry.attributes.position,normal=geometry.attributes.normal;
      const half=vec(w/2,h/2,d/2),inner=vec(half.x-r,half.y-r,half.z-r),p=new T.Vector3(),q=new T.Vector3(),n=new T.Vector3();
      // The analytic rounded-box normal stays continuous across BoxGeometry's
      // split face vertices; recomputing face normals would leave hard seams.
      for(let i=0;i<position.count;i++){p.fromBufferAttribute(position,i);q.set(clamp(p.x,-inner.x,inner.x),clamp(p.y,-inner.y,inner.y),clamp(p.z,-inner.z,inner.z));n.copy(p).sub(q).normalize();p.copy(q).addScaledVector(n,r);position.setXYZ(i,p.x,p.y,p.z);normal.setXYZ(i,n.x,n.y,n.z);}
      return geometry;
    }
    function box(w,h,d,r,mat,x,y,z,parent=group,segments=6) {const result=mesh(roundedBoxGeometry(w,h,d,r,segments),mat,parent);result.position.set(x,y,z);return result;}
    function cylinder(radius,length,mat,position,axis='y',parent=group,radial=20) {
      const result=mesh(new T.CylinderGeometry(radius,radius,length,radial),mat,parent);result.position.copy(position);
      if(axis==='x')result.rotation.z=Math.PI/2;if(axis==='z')result.rotation.x=Math.PI/2;return result;
    }
    function curve(points,closed=false) {return new T.CatmullRomCurve3(points,closed,'centripetal',.5);}
    function tube(points,radius,mat,parent=group,segments=36,closed=false,radial=7) {return mesh(new T.TubeGeometry(curve(points,closed),segments,radius,radial,closed),mat,parent);}
    function buffer(positions,indices,uvs) {const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));if(uvs)geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;}
    function labelMap(text,bg,fg,width=768,height=128,logo=false) {
      return texture(width,height,(ctx,w,h)=>{ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);if(logo)brand(ctx,h*.55,h/2,h*.72,fg);ctx.fillStyle=fg;ctx.font=`700 ${Math.round(h*.52)}px Arial,sans-serif`;ctx.textBaseline='middle';ctx.textAlign=logo?'left':'center';ctx.fillText(text,logo?h*1.05:w/2,h*.53,w-(logo?h*1.2:18));});
    }
    // A rounded rectangular *solid*, independent of any image silhouette.
    function makeCase(yellow) {
      const shellColor=yellow?0xf1c316:0x15181b,caseWidth=.78,caseHeight=1.02,caseDepth=.435,centerY=.705;
      const micro=grain(7),nylon=grain(4);
      const plain=material({color:shellColor,roughness:yellow?.30:.26,metalness:yellow?.04:.17,clearcoat:.45,clearcoatRoughness:.27,bumpMap:micro,bumpScale:.0007});
      const rubber=material({color:0x17191b,roughness:.86,bumpMap:micro,bumpScale:.0011});
      const trim=material({color:0x272a2e,roughness:.45,metalness:.14});
      const metal=material({color:0xb9c0c5,roughness:.25,metalness:.88});
      const darkMetal=material({color:0x30353a,roughness:.3,metalness:.78});
      const boltMat=material({color:0xa5adb5,roughness:.24,metalness:.85});
      const print=texture(768,1024,(ctx,w,h)=>{
        ctx.fillStyle=yellow?'#f1c316':'#15181b';ctx.fillRect(0,0,w,h);
        if(yellow){
          ctx.save();ctx.translate(w*.51,h*.52);ctx.rotate(-.43);ctx.fillStyle='#141718';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='900 146px Arial,sans-serif';
          for(let row=-2;row<=2;row++)ctx.fillText('BINANCE',row%2?20:-15,row*158,980);ctx.restore();brand(ctx,w*.15,h*.14,100,'#141718');
        }else{
          ctx.save();ctx.translate(w*.82,h*.26);ctx.rotate(Math.PI/2);brand(ctx,-85,0,60,'#edc029');ctx.fillStyle='#edc029';ctx.font='700 40px Arial,sans-serif';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText('BINANCE',-35,0);ctx.restore();
        }
      });
      const printed=material({color:0xffffff,map:print,roughness:yellow?.30:.26,metalness:yellow?.04:.17,clearcoat:.45,clearcoatRoughness:.27,bumpMap:micro,bumpScale:.0007});
      const faceMaterials=[plain,plain,plain,plain,printed,printed];
      // Two separately rounded molded halves, with a dark zipper gasket between.
      box(caseWidth,caseHeight,caseDepth*.51,.055,faceMaterials,0,centerY,caseDepth*.25,group,10);
      box(caseWidth,caseHeight,caseDepth*.51,.055,faceMaterials,0,centerY,-caseDepth*.25,group,10);
      const zipShape=new T.Shape(),halfX=caseWidth/2+.001,halfY=caseHeight/2+.001,r=.065;
      zipShape.moveTo(-halfX+r,-halfY);zipShape.lineTo(halfX-r,-halfY);zipShape.quadraticCurveTo(halfX,-halfY,halfX,-halfY+r);zipShape.lineTo(halfX,halfY-r);zipShape.quadraticCurveTo(halfX,halfY,halfX-r,halfY);zipShape.lineTo(-halfX+r,halfY);zipShape.quadraticCurveTo(-halfX,halfY,-halfX,halfY-r);zipShape.lineTo(-halfX,-halfY+r);zipShape.quadraticCurveTo(-halfX,-halfY,-halfX+r,-halfY);
      const gasketPoints=zipShape.getPoints(80).map(p=>vec(p.x,p.y+centerY,0));tube(gasketPoints,.010,rubber,group,160,true,6);
      for(const depth of [-.014,.014])tube(gasketPoints.map(p=>vec(p.x,p.y,depth)),.0032,darkMetal,group,160,true,5);
      // Molded vertical strengthening ribs on both sides. UVs sample the same
      // albedo artwork as the shell, so printing crosses the ribs continuously.
      for(const side of [-1,1])for(let i=0;i<23;i++){
        const x=-.327+i*.654/22,height=.828-(Math.abs(x)>.30?.03:0),z=side*(caseDepth*.505+.004);
        const geometry=roundedBoxGeometry(.012,height,.012,.005,3),p=geometry.attributes.position,uv=geometry.attributes.uv;
        for(let n=0;n<p.count;n++)uv.setXY(n,side>0?(p.getX(n)+x)/caseWidth+.5:.5-(p.getX(n)+x)/caseWidth,(p.getY(n)+centerY)/caseHeight-(centerY/caseHeight-.5));
        const rib=mesh(geometry,printed);rib.position.set(x,centerY,z);
      }
      // A recessed perimeter frame protects the ribbed panel.
      for(const side of [-1,1]){
        const outline=[vec(-.303,.269,side*.219),vec(.303,.269,side*.219),vec(.351,.313,side*.215),vec(.351,1.087,side*.215),vec(.303,1.145,side*.219),vec(-.303,1.145,side*.219),vec(-.351,1.087,side*.215),vec(-.351,.313,side*.215)];
        tube(outline,.0085,plain,group,96,true,6);
      }
      // Four corner guards, paired spinner wheels and independent metal axles.
      for(const x of [-.306,.306])for(const z of [-.147,.147]){
        const caster=new T.Group();caster.position.set(x,.079,z);caster.rotation.y=(x<0?-.16:.19)+(z<0?.13:0);group.add(caster);
        cylinder(.025,.095,darkMetal,vec(0,.054,0),'y',caster,12);
        box(.078,.075,.069,.012,trim,0,.038,0,caster,3);
        cylinder(.008,.103,boltMat,vec(0,0,0),'x',caster,12);
        for(const off of [-.039,.039]){
          cylinder(.064,.028,rubber,vec(off,0,0),'x',caster,28);
          cylinder(.043,.030,darkMetal,vec(off,0,0),'x',caster,24);
          cylinder(.014,.032,boltMat,vec(off,0,0),'x',caster,16);
        }
        box(.12,.12,.095,.025,trim,x,.226,z,group,4);
      }
      // Back channels and telescoping aluminum stages; the grip is a real open
      // handle, not a single filled rectangle. Height remains travel-case-like.
      const rear=-caseDepth*.5-.003;
      for(const x of [-.177,.177]){
        box(.068,.77,.036,.015,trim,x,.812,rear,group,4);
        box(.029,.34,.025,.003,metal,x,1.235,rear,group,2);
        box(.019,.18,.018,.002,metal,x,1.377,rear,group,2);
        box(.048,.035,.048,.008,trim,x,1.178,rear,group,3);
      }
      box(.395,.049,.067,.020,rubber,0,1.465,rear,group,5);
      for(const x of [-.181,.181])box(.038,.081,.067,.014,trim,x,1.438,rear,group,4);
      box(.086,.016,.045,.006,darkMetal,0,1.488,rear,group,3);
      const gripLogo=material({map:labelMap('BINANCE','#252a2d','#e6c051',512,96,true),roughness:.56});
      const gripFace=mesh(new T.PlaneGeometry(.27,.027),gripLogo);gripFace.position.set(0,1.466,rear+.035);
      // Folded carrying handle and its mounting pivots, plus a side handle.
      for(const x of [-.108,.108])box(.074,.033,.106,.012,trim,x,1.235,.025,group,3);
      tube([vec(-.105,1.247,.025),vec(-.08,1.277,.025),vec(.08,1.277,.025),vec(.105,1.247,.025)],.017,rubber,group,24,false,8);
      tube([vec(.393,.57,-.015),vec(.422,.60,-.015),vec(.422,.78,-.015),vec(.393,.81,-.015)],.015,rubber,group,24,false,8);
      for(const y of [.563,.818])box(.022,.05,.072,.007,darkMetal,.395,y,-.015,group,3);
      // Zipper lock and pull tabs are located on the middle seam.
      box(.085,.058,.037,.008,darkMetal,.328,1.13,.004,group,4);
      for(const x of [-.023,.012]){const pull=box(.016,.070,.006,.003,metal,x,1.221,.063,group,2);pull.rotation.z=x<0?-.22:.15;cylinder(.004,.008,boltMat,vec(x,1.197,.068),'z',group,10);}
      for(const x of [-.337,.337])for(const y of [.283,1.123])for(const z of [-.214,.214])cylinder(.006,.005,boltMat,vec(x,y,z),'z',group,10);
      if(!yellow){
        const beltMap=labelMap('BINANCE  •  EXCHANGE THE WORLD','#ecc12b','#15191b',1536,144,true);beltMap.wrapS=T.RepeatWrapping;
        const belt=material({map:beltMap,color:0xffffff,roughness:.83,bumpMap:nylon,bumpScale:.0008,side:T.DoubleSide});
        function strap(direction,offset,halfLength,width){
          const normal=vec(-direction.y,direction.x,0),path=[];
          // Rounded loop in the diagonal/depth plane, wrapping front and back.
          const radius=.035,front=.241,back=-.241;
          // Explicit ordered corners give long, straight woven faces.
          const nodes=[[-halfLength,front-radius],[-halfLength+radius,front],[halfLength-radius,front],[halfLength,front-radius],[halfLength,back+radius],[halfLength-radius,back],[-halfLength+radius,back],[-halfLength,back+radius]];
          for(let n=0;n<nodes.length;n++){const a=nodes[n],b=nodes[(n+1)%nodes.length],count=(n%2===1)?26:6;for(let j=0;j<count;j++){const t=j/count,u=a[0]*(1-t)+b[0]*t,z=a[1]*(1-t)+b[1]*t;path.push(vec(direction.x*u,centerY+offset+direction.y*u,z));}}
          const p=[],uv=[],ix=[];let distance=0;
          for(let i=0;i<=path.length;i++){
            const center=path[i%path.length],previous=path[(i+path.length-1)%path.length],next=path[(i+1)%path.length];if(i)distance+=center.distanceTo(previous);
            const tangent=next.clone().sub(previous).normalize(),out=normal.clone().cross(tangent).normalize();
            const u=(center.y-centerY-offset)/direction.y,edgeBlend=clamp((Math.abs(u)-(halfLength-.075))/.05,0,1),acrossDirection=normal.clone().addScaledVector(direction,-normal.y/direction.y*edgeBlend);
            for(const [across,depth] of [[-1,-1],[1,-1],[-1,1],[1,1]]){const point=center.clone().addScaledVector(acrossDirection,width/2*across).addScaledVector(out,.002*depth);p.push(point.x,point.y,point.z);uv.push(distance/.64,(across+1)/2);}
            if(i<path.length){const a=i*4,b=(i+1)*4;ix.push(a,b,a+1,a+1,b,b+1,a+2,a+3,b+2,a+3,b+3,b+2,a,a+2,b,a+2,b+2,b,a+1,b+1,a+3,a+3,b+1,b+3);}
          }
          // Keep the woven band face, cut edge and back face normals separate;
          // averaging across a 4 mm thick edge would invert tiny edge normals.
          const joined=buffer(p,ix,uv),geometry=joined.toNonIndexed();joined.dispose();geometry.computeVertexNormals();mesh(geometry,belt);
        }
        strap(vec(.53,.848,0),0,.603,.124);strap(vec(-.53,.848,0),0,.603,.124);
        // A physical buckle at one side secures the straps.
        box(.057,.104,.022,.011,darkMetal,-.343,.692,.192,group,4);
      }
      group.userData.construction='two molded shell halves, embossed ribs, zipper gasket, diagonal woven straps or printed shell, four twin-wheel casters and telescoping handle';
    }
    function makeShoe() {
      const leatherGrain=grain(8),rubberGrain=grain(12),suedeGrain=grain(11);
      const leather=material({color:0xe4ab2c,roughness:.64,bumpMap:leatherGrain,bumpScale:.0017});
      const suede=material({color:0xd79b20,roughness:.93,bumpMap:suedeGrain,bumpScale:.003});
      const cream=material({color:0xe8e5db,roughness:.62,bumpMap:leatherGrain,bumpScale:.0013});
      const outsole=material({color:0xd5d3c8,roughness:.87,bumpMap:rubberGrain,bumpScale:.0018});
      const midsole=material({color:0xf0eee4,roughness:.78,bumpMap:rubberGrain,bumpScale:.0013});
      const stitch=material({color:0xc7962b,roughness:.89});
      const lace=material({color:0xece8d9,roughness:.93,bumpMap:rubberGrain,bumpScale:.0013});
      const liner=material({color:0x37332a,roughness:.99});
      const eyeletMat=material({color:0x73562b,roughness:.53,metalness:.12});
      const accent=material({color:0x1b1c1e,roughness:.4});
      const metalGold=material({color:0xe5bb52,roughness:.28,metalness:.72});
      // x is heel → toe. Each cross section is an anatomical last, with a low
      // broad toe and a higher narrow heel; there are no sphere-shaped uppers.
      const profiles=[[-.742,.028,.174,.272],[-.69,.172,.162,.447],[-.55,.232,.152,.502],[-.37,.239,.150,.492],[-.19,.245,.145,.463],[.0,.259,.140,.416],[.20,.282,.142,.350],[.41,.294,.151,.293],[.60,.246,.174,.264],[.728,.116,.194,.243],[.759,.014,.208,.222]];
      function section(x){let i=0;while(i<profiles.length-2&&x>profiles[i+1][0])i++;const a=profiles[i],b=profiles[i+1],t=clamp((x-a[0])/(b[0]-a[0]),0,1);return{width:a[1]+(b[1]-a[1])*t,bottom:a[2]+(b[2]-a[2])*t,top:a[3]+(b[3]-a[3])*t};}
      function surface(x,z,raise=0){const s=section(x),fraction=clamp(z/s.width,-1,1);return s.bottom+(s.top-s.bottom)*Math.pow(Math.max(0,1-fraction*fraction),.59)+raise;}
      function sideZ(x,y,sign=1,raise=.003){const s=section(x),fraction=clamp((y-s.bottom)/(s.top-s.bottom),0,.998);return sign*(s.width*Math.sqrt(Math.max(0,1-Math.pow(fraction,1/.59)))+raise);}
      const heelHole=(x,z)=>Math.pow((x+.408)/.219,2)+Math.pow(z/.139,2)<1;
      function upper(){
        const nx=88,nt=34,p=[],uv=[],ix=[];
        for(let i=0;i<=nx;i++){const x=profiles[0][0]+i/nx*(profiles.at(-1)[0]-profiles[0][0]),s=section(x);for(let j=0;j<=nt;j++){const angle=j/nt*Math.PI,z=Math.cos(angle)*s.width,y=surface(x,z);p.push(x,y,z);uv.push(i/nx,j/nt);}}
        for(let i=0;i<nx;i++)for(let j=0;j<nt;j++){
          const a=i*(nt+1)+j,b=a+nt+1;const cx=(p[a*3]+p[(b+1)*3])/2,cz=(p[a*3+2]+p[(b+1)*3+2])/2;
          if(heelHole(cx,cz))continue;
          ix.push(a,b,a+1,a+1,b,b+1);
        }
        const result=mesh(buffer(p,ix,uv),leather);result.material.side=T.DoubleSide;
      }
      const footControl=[[-.746,0],[-.702,.162],[-.537,.235],[-.21,.257],[.105,.288],[.414,.305],[.622,.267],[.759,.126],[.781,0],[.750,-.135],[.61,-.251],[.37,-.288],[.04,-.269],[-.29,-.235],[-.57,-.217],[-.713,-.139]].map(([x,z])=>vec(x,0,z));
      const outline=curve(footControl,true).getSpacedPoints(128).slice(0,-1);
      const soleRise=x=>Math.pow(Math.max(0,(x-.42)/.37),1.5)*.058;
      function sole(levels,mat){
        const p=[],uv=[],ix=[],n=outline.length;
        levels.forEach(([height,scale],k)=>outline.forEach((point,i)=>{p.push(point.x*scale,height+soleRise(point.x),point.z*scale);uv.push(i/n,k/(levels.length-1));}));
        for(let k=0;k<levels.length-1;k++)for(let i=0;i<n;i++){const a=k*n+i,b=k*n+(i+1)%n,c=a+n,d=b+n;ix.push(a,b,c,b,d,c);}
        for(const [ring,up] of [[0,false],[levels.length-1,true]]){const center=p.length/3;p.push(0,levels[ring][0],0);uv.push(.5,.5);for(let i=0;i<n;i++){const a=ring*n+i,b=ring*n+(i+1)%n;ix.push(...(up?[center,a,b]:[center,b,a]));}}
        mesh(buffer(p,ix,uv),mat);
      }
      sole([[.028,.975],[.041,1.013],[.068,1.026]],outsole);
      sole([[.066,1.026],[.105,1.027],[.14,1.009],[.158,.99]],midsole);
      upper();
      // Fine ribbing molded into the rubber sidewall; a real underside tread.
      for(let i=0;i<outline.length;i+=2){const a=outline[i],prev=outline[(i+outline.length-1)%outline.length],next=outline[(i+1)%outline.length],tangent=next.clone().sub(prev).normalize();const mark=box(.005,.034,.006,.0013,outsole,a.x*1.03,.119+soleRise(a.x),a.z*1.03,group,1);mark.rotation.y=-Math.atan2(tangent.z,tangent.x);}
      for(let i=0;i<11;i++){const x=-.64+i*.122,s=section(clamp(x,-.69,.7));for(const sign of [-1,1]){const lug=box(.069,.018,s.width*.65,.004,outsole,x,.020+soleRise(x),sign*s.width*.39,group,2);lug.rotation.y=sign*.32;}}
      const lowerSeam=outline.map(p=>vec(p.x*1.001,.148+soleRise(p.x),p.z*1.001));tube(lowerSeam,.0027,cream,group,160,true,5);
      // Toe suede overlay with two stitched edges follows the same curved last.
      const toeP=[],toeUV=[],toeIx=[],rows=23,cols=40;
      for(let i=0;i<=rows;i++)for(let j=0;j<=cols;j++){
        const angle=j/cols*Math.PI,side=Math.pow(Math.abs(Math.cos(angle)),1.7),back=.37-.115*side,x=back+(profiles.at(-1)[0]-back)*i/rows,s=section(x),z=Math.cos(angle)*s.width*1.002;
        toeP.push(x,surface(x,z,.0038),z);toeUV.push(i/rows,j/cols);
      }
      for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const a=i*(cols+1)+j,b=a+cols+1;toeIx.push(a,b,a+1,a+1,b,b+1);}mesh(buffer(toeP,toeIx,toeUV),suede);
      const toeSeam=[];for(let i=0;i<=40;i++){const angle=i/40*Math.PI,x=.367-.115*Math.pow(Math.abs(Math.cos(angle)),1.7),z=Math.cos(angle)*section(x).width;toeSeam.push(vec(x,surface(x,z,.008),z));}tube(toeSeam,.0025,stitch,group,60,false,5);
      // Hollow collar: upper triangles are omitted inside the aperture; this
      // separate dark lining has actual depth down to the insole.
      const rim=[],innerP=[],innerIx=[],innerUV=[],holeN=72;
      for(let i=0;i<=holeN;i++){
        const angle=i/holeN*TAU,x=-.408+Math.cos(angle)*.222,z=Math.sin(angle)*.142,y=surface(x,z,.004);rim.push(vec(x,y,z));
        innerP.push(x,y,z,-.408+(x+.408)*.82,.248,z*.82);innerUV.push(i/holeN,1,i/holeN,0);
        if(i<holeN){const a=i*2;innerIx.push(a,a+1,a+2,a+2,a+1,a+3);}
      }
      const lining=mesh(buffer(innerP,innerIx,innerUV),liner);lining.material.side=T.DoubleSide;tube(rim.slice(0,-1),.013,cream,group,96,true,8);
      const insole=mesh(new T.CircleGeometry(1,48),liner);insole.rotation.x=-Math.PI/2;insole.position.set(-.408,.248,0);insole.scale.set(.19,.117,1);
      // Heel counter is a separate suede cup rather than a rounded blob.
      const heelP=[],heelUV=[],heelIx=[];for(let i=0;i<=18;i++)for(let j=0;j<=24;j++){const x=-.727+i/18*.17,s=section(x),a=j/24*Math.PI,z=Math.cos(a)*s.width*1.011,y=s.bottom+(surface(x,z)-s.bottom)*(.75+.20*i/18);heelP.push(x,y+.003,z);heelUV.push(i/18,j/24);}for(let i=0;i<18;i++)for(let j=0;j<24;j++){const a=i*25+j,b=a+25;heelIx.push(a,b,a+1,a+1,b,b+1);}mesh(buffer(heelP,heelIx,heelUV),suede);
      // White BINANCE side stripe is thin leather laid on both curved sides.
      const stripeMap=labelMap('BINANCE',WHITE,'#c9a34b',768,160),stripeMat=material({map:stripeMap,color:0xffffff,roughness:.64,bumpMap:leatherGrain,bumpScale:.0012,side:T.DoubleSide});
      function sideStripe(sign){const p=[],uv=[],ix=[],steps=30;for(let i=0;i<=steps;i++){const t=i/steps,cx=-.351+t*.295,cy=.177+t*.230;for(const side of [-1,1]){const x=cx+side*.043,y=cy-side*.017,z=sideZ(x,y,sign,.005);p.push(x,y,z);uv.push(t,sign>0?(1-side)/2:(side+1)/2);}}for(let i=0;i<steps;i++){const a=i*2;ix.push(a,a+1,a+2,a+1,a+3,a+2);}mesh(buffer(p,ix,uv),stripeMat);}
      sideStripe(1);sideStripe(-1);
      // Eye stay panels are individual strips of leather along a padded tongue.
      function topRibbon(x0,x1,zcenter,width,raise,mat){const p=[],uv=[],ix=[],steps=32;for(let i=0;i<=steps;i++){const x=x0+(x1-x0)*i/steps;for(const side of [-1,1]){const z=zcenter+side*width/2;p.push(x,surface(x,z,raise),z);uv.push(i/steps,(1-side)/2);}}for(let i=0;i<steps;i++){const a=i*2;ix.push(a,a+2,a+1,a+1,a+2,a+3);}return mesh(buffer(p,ix,uv),mat);}
      topRibbon(-.182,.340,0,.205,.014,leather);
      for(const sign of [-1,1])topRibbon(-.158,.345,sign*.108,.046,.022,leather);
      // Tongue label is a small stitched woven patch, physically atop the tongue.
      const tongueMap=texture(256,320,(ctx,w,h)=>{ctx.fillStyle='#eeeade';ctx.fillRect(0,0,w,h);brand(ctx,w/2,h*.47,126,'#d8b34b');ctx.fillStyle='#c6a249';ctx.font='700 22px Arial';ctx.textAlign='center';ctx.fillText('BINANCE',w/2,h*.86);});
      const tongueLabel=material({map:tongueMap,roughness:.92,side:T.DoubleSide});
      const tongue=topRibbon(-.202,-.093,0,.104,.025,tongueLabel);
      const laceRows=6;
      for(let i=0;i<laceRows;i++){
        const x=-.116+i*.079;
        for(const sign of [-1,1]){
          const z=sign*.107,y=surface(x,z,.033),eye=mesh(new T.TorusGeometry(.012,.0028,5,14),eyeletMat);eye.rotation.x=-Math.PI/2;eye.position.set(x,y,z);
        }
        const nextX=Math.min(.32,x+.068);
        for(const sign of [-1,1]){
          const start=vec(x,surface(x,sign*.107,.041),sign*.107),end=vec(nextX,surface(nextX,-sign*.101,.041),-sign*.101),middle=start.clone().lerp(end,.5);middle.y=surface((x+nextX)/2,0,.045+(sign>0?.004:0));
          tube([start,start.clone().lerp(middle,.42),middle,middle.clone().lerp(end,.58),end],.0075,lace,group,22,false,7);
        }
      }
      const tag=box(.102,.017,.046,.004,metalGold,.245,surface(.245,0,.056),0,group,3);
      const tagMap=labelMap('BINANCE','#1c1d1d','#e9d49a',512,160),tagMat=material({map:tagMap,roughness:.37,metalness:.17});
      const tagFace=mesh(new T.PlaneGeometry(.093,.036),tagMat);tagFace.rotation.x=-Math.PI/2;tagFace.position.set(.245,tag.position.y+.009,0);
      // Small punched ventilation holes sit in the toe/vamp leather, not on a
      // billboard. Tiny dark cylinders terminate below the surrounding surface.
      for(let row=0;row<3;row++)for(let col=-2;col<=2;col++){
        const x=.38+row*.060,z=col*.048,y=surface(x,z,.0036);const hole=cylinder(.0038,.0026,eyeletMat,vec(x,y,z),'y',group,8);hole.rotation.z=.12;
      }
      // Back-quarter seam follows the actual surface; the dashed stitch thread
      // is instanced geometry rather than hundreds of draw calls.
      const stitches=[];
      function stitchPath(points,spacing=.021){const path=curve(points),length=path.getLength(),count=Math.max(3,Math.floor(length/spacing));for(let i=0;i<count;i++)stitches.push([path.getPoint((i+.16)/count),path.getPoint((i+.64)/count)]);}
      stitchPath(toeSeam,.018);stitchPath(lowerSeam,.023);
      for(const sign of [-1,1]){
        const seam=[];for(let i=0;i<=28;i++){const t=i/28,x=-.57+t*.46,y=.206+Math.sin(t*Math.PI*.85)*.158;seam.push(vec(x,y,sideZ(x,y,sign,.0055)));}tube(seam,.0015,stitch,group,40,false,4);stitchPath(seam,.020);
        for(const edge of [-1,1]){const line=[];for(let i=0;i<=25;i++){const t=i/25,x=-.35+t*.295+edge*.041,y=.178+t*.226-edge*.017;line.push(vec(x,y,sideZ(x,y,sign,.0065)));}stitchPath(line,.018);}
      }
      if(stitches.length){
        const geometry=own(new T.CylinderGeometry(.0013,.0013,1,4),'geometries'),instance=new T.InstancedMesh(geometry,stitch,stitches.length),dummy=new T.Object3D(),up=vec(0,1,0);
        stitches.forEach(([a,b],i)=>{dummy.position.copy(a).add(b).multiplyScalar(.5);dummy.quaternion.setFromUnitVectors(up,b.clone().sub(a).normalize());dummy.scale.set(1,a.distanceTo(b),1);dummy.updateMatrix();instance.setMatrixAt(i,dummy.matrix);});instance.castShadow=true;instance.receiveShadow=true;group.add(instance);
      }
      group.userData.construction='anatomical lofted leather upper, open lined collar, separate suede toe and heel panels, layered solid rubber sole, 3D tread, crossed woven laces, eyelets and instanced thread';
    }
    // All props are static. Bake nested transforms (including thread instances)
    // and batch by material, retaining every original UV/normal/material group.
    // This turns hundreds of small constructed details into 8–13 draw calls.
    function mergeStaticPieces() {
      group.updateMatrixWorld(true);
      const batches=new Map(),oldGeometry=new Set(),pieces=[];
      const position=new T.Vector3(),normal=new T.Vector3(),normalMatrix=new T.Matrix3(),instanceMatrix=new T.Matrix4(),worldMatrix=new T.Matrix4();
      group.traverse(object=>{if(object.isMesh)pieces.push(object);});
      function append(object,matrix) {
        const geometry=object.geometry,index=geometry.index,attributes=geometry.attributes,materialList=Array.isArray(object.material)?object.material:[object.material];
        const entries=Array.isArray(object.material)&&geometry.groups.length?geometry.groups:[{start:0,count:index?index.count:attributes.position.count,materialIndex:0}];
        normalMatrix.getNormalMatrix(matrix);const mirrored=matrix.determinant()<0;
        for(const entry of entries){
          const mat=materialList[entry.materialIndex];if(!mat)continue;
          let batch=batches.get(mat);if(!batch){batch={position:[],normal:[],uv:[]};batches.set(mat,batch);}
          const end=Math.min(entry.start+entry.count,index?index.count:attributes.position.count);
          for(let tri=entry.start;tri+2<end;tri+=3)for(let corner=0;corner<3;corner++){
            const offset=tri+(mirrored&&corner>0?3-corner:corner),vertex=index?index.getX(offset):offset;
            position.fromBufferAttribute(attributes.position,vertex).applyMatrix4(matrix);batch.position.push(position.x,position.y,position.z);
            normal.fromBufferAttribute(attributes.normal,vertex).applyNormalMatrix(normalMatrix);batch.normal.push(normal.x,normal.y,normal.z);
            batch.uv.push(attributes.uv?attributes.uv.getX(vertex):0,attributes.uv?attributes.uv.getY(vertex):0);
          }
        }
        oldGeometry.add(geometry);
      }
      for(const object of pieces){
        if(object.isInstancedMesh){for(let i=0;i<object.count;i++){object.getMatrixAt(i,instanceMatrix);worldMatrix.multiplyMatrices(object.matrixWorld,instanceMatrix);append(object,worldMatrix);}}
        else append(object,object.matrixWorld);
      }
      group.clear();resources.geometries.length=0;
      for(const [mat,batch] of batches){
        const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(batch.position,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(batch.normal,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(batch.uv,2));geometry.computeBoundingBox();geometry.computeBoundingSphere();
        const object=mesh(geometry,mat);object.name=id+':material-batch-'+group.children.length;
      }
      for(const geometry of oldGeometry)geometry.dispose();
      group.userData.drawCalls=group.children.length;group.userData.sourceMeshCount=pieces.length;
    }
    if(id==='sneaker')makeShoe();else makeCase(id==='yellowcase');
    mergeStaticPieces();
    group.updateMatrixWorld(true);
    const bounds=new T.Box3().setFromObject(group),size=bounds.getSize(new T.Vector3());
    group.userData.naturalBounds={min:bounds.min.toArray(),max:bounds.max.toArray(),size:size.toArray()};
    // Materials/maps are owned by the group. The host may traverse and dispose
    // them on prize replacement, just as it does other Three.js prize objects.
    group.userData.heroVersion='3.1.0';
    return group;
  }
  root.LuckyHeroModels=Object.freeze({create,version:'3.1.0'});
})(typeof window!=='undefined'?window:globalThis);
