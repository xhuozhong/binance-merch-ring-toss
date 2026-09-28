/* Original miniature models. Brand symbol follows the previously researched
   official Binance public-data logo. Source notes: RESEARCH.md. No remote assets. */
(function () {
  'use strict';
  const YELLOW = '#F0B90B', BLACK = '#171C23';
  const POLYGONS = [
    [[1.84252,1.169291],[0,3.011811],[-1.84252,1.145669],[-1.181102,.507874],[0,1.665354],[1.181102,.507874]],
    [[-2.338583,.649606],[-3,.035433],[-3,-.035433],[-2.362205,-.673228],[-1.700787,-.011811]],
    [[-.023622,.673228],[-.685039,-.011811],[0,-.673228],[.661417,.011811]],
    [[2.338583,.673228],[1.677165,.011811],[2.338583,-.673228],[3,-.011811]],
    [[-1.84252,-1.145669],[-.023622,-3.011811],[1.84252,-1.169291],[1.181102,-.507874],[0,-1.665354],[-1.181102,-.507874]]
  ];
  const glyph = (x,y,size,color) => '<g fill="'+color+'" transform="translate('+x+' '+y+') scale('+(size/6)+' '+(-size/6)+')">'+POLYGONS.map(p=>'<polygon points="'+p.map(v=>v.join(',')).join(' ')+'"/>').join('')+'</g>';
  const iconParts = {
    bottle:'<rect x="21" y="21" width="22" height="36" rx="8" fill="#171c23"/><rect x="22" y="17" width="20" height="8" rx="3" fill="#303740"/><path d="M26 17v-5a6 6 0 0112 0v5" fill="none" stroke="#171c23" stroke-width="4"/><path d="M22 47h20v7H22z" fill="#f0b90b"/>'+glyph(32,35,13,YELLOW),
    hat:'<ellipse cx="32" cy="46" rx="26" ry="10" fill="#171c23"/><path d="M16 44l4-25q12-7 24 0l4 25z" fill="#242a33"/><path d="M17 37h30l1 7H16z" fill="#f0b90b"/>'+glyph(32,28,12,YELLOW),
    passport:'<rect x="16" y="10" width="34" height="47" rx="5" fill="#171c23"/><path d="M20 11v45" stroke="#f0b90b" stroke-width="4"/><path d="M27 44h16m-16 4h12" stroke="#f0b90b" stroke-width="2"/>'+glyph(35,29,19,YELLOW),
    bag:'<path d="M17 30V17c0-17 30-17 30 0v13" fill="none" stroke="#f0b90b" stroke-width="7"/><rect x="11" y="27" width="43" height="29" rx="7" fill="#171c23"/><path d="M15 35h35" stroke="#f0b90b" stroke-width="2"/>'+glyph(33,44,13,YELLOW),
    hoodie:'<path d="M23 19C13-3 51-3 41 19l12 6 10 18-10 6-9-11v21H20V38L11 49 1 43l10-18z" fill="#f0b90b"/><path d="M24 13q8-11 16 0l-8 8z" fill="#171c23"/><path d="M23 49h18v6H23z" fill="#d69c04"/>'+glyph(32,35,15,BLACK),
    keyboard:'<rect x="4" y="16" width="56" height="36" rx="5" fill="#171c23"/><g fill="#f0b90b">'+Array.from({length:24},(_,i)=>'<rect x="'+(9+(i%8)*6)+'" y="'+(22+Math.floor(i/8)*7)+'" width="4" height="5" rx="1"/>').join('')+'<rect x="21" y="44" width="22" height="4" rx="1"/></g>',
    sneaker:'<path d="M8 22l17 6 12-3 11 15 12 5v11H5V39z" fill="#f0b90b"/><path d="M5 48q26 8 55-1v9H5z" fill="#f6f2df"/><path d="M8 23l15 5-3 8-12-2z" fill="#171c23"/><path d="M27 32l13-3m-10 8l13-3m-10 8l14-3" stroke="#fff8dc" stroke-width="3"/>'+glyph(16,42,9,BLACK),
    gift:'<rect x="9" y="25" width="46" height="32" rx="4" fill="#171c23"/><path d="M29 25h8v32h-8z" fill="#f0b90b"/><rect x="6" y="18" width="52" height="10" rx="3" fill="#f0b90b"/><path d="M32 18C10 20 12 1 23 8l9 10c22 2 20-17 9-10z" fill="none" stroke="#f0b90b" stroke-width="4"/>'+glyph(33,41,14,BLACK),
    suitcase:'<path d="M23 15V7h18v8" fill="none" stroke="#596270" stroke-width="4"/><rect x="14" y="14" width="36" height="43" rx="7" fill="#171c23"/><path d="M21 20v30m7-30v30m8-30v30m7-30v30" stroke="#39414c" stroke-width="2"/><path d="M14 33h36v8H14zm13-19h7v43h-7z" fill="#f0b90b"/><path d="M20 57v4m24-4v4" stroke="#171c23" stroke-width="6"/>'+glyph(40,37,7,BLACK),
    tote:'<path d="M22 23V14a10 10 0 0120 0v9" fill="none" stroke="#d59900" stroke-width="5"/><path d="M12 21h40l-4 38H16z" fill="#f0b90b"/><path d="M17 24l3 30m27-30l-3 30" stroke="#d59900" stroke-width="2"/>'+glyph(32,38,19,BLACK),
    tshirt:'<path d="M22 9L9 15 1 32l11 6 7-9v30h26V29l7 9 11-6-8-17-13-6q-10 10-20 0z" fill="#171c23"/><path d="M23 9q9 12 18 0" fill="none" stroke="#f0b90b" stroke-width="3"/>'+glyph(32,31,17,YELLOW),
    socks:'<path d="M12 7h17v31l-6 17H4q-2-12 8-17zm26 0h17v31l6 17H43l-5-17z" fill="#f0b90b"/><path d="M12 15h17m-17 6h17m9-6h17m-17 6h17" stroke="#171c23" stroke-width="3"/>'+glyph(20,31,9,BLACK)+glyph(46,31,9,BLACK),
    umbrella:'<path d="M32 4l-10 40h20z" fill="#171c23"/><path d="M32 6v42q0 11-9 11-7 0-7-7" fill="none" stroke="#f0b90b" stroke-width="4"/><path d="M24 33h16v5H24z" fill="#f0b90b"/>',
    massager:'<path d="M23 25h13l5 31H27z" fill="#171c23"/><rect x="10" y="14" width="34" height="20" rx="9" fill="#303740"/><rect x="9" y="16" width="8" height="16" rx="4" fill="#f0b90b"/><path d="M43 20h7v7h-7z" fill="#171c23"/><circle cx="54" cy="24" r="8" fill="#171c23"/><path d="M27 47h13v6H27z" fill="#f0b90b"/>'+glyph(29,24,10,YELLOW),
    racket:'<ellipse cx="32" cy="22" rx="17" ry="20" fill="#171c23"/><ellipse cx="32" cy="22" rx="14" ry="17" fill="#fff5d8"/><path d="M23 11v22m6-28v34m6-34v34m6-28v22M20 13h24M18 20h28M19 27h26M23 34h18" stroke="#d8d0af" stroke-width="1"/><ellipse cx="32" cy="22" rx="16" ry="19" fill="none" stroke="#f0b90b" stroke-width="4"/><path d="M26 39l6 10 6-10m-6 7v15" fill="none" stroke="#171c23" stroke-width="5"/>',
    towel:'<rect x="15" y="12" width="34" height="44" rx="2" fill="#f0b90b"/><rect x="12" y="6" width="40" height="14" rx="7" fill="#dca609"/><path d="M15 43h34m-34 6h34" stroke="#171c23" stroke-width="4"/><path d="M18 56v5m7-5v5m7-5v5m7-5v5m7-5v5" stroke="#f0b90b" stroke-width="3"/>'+glyph(32,31,16,BLACK),
    pajamas:'<path d="M22 7L9 15 3 41l10 4 7-18v30h25V27l6 18 10-4-6-26-13-8z" fill="#171c23"/><path d="M23 7l9 16 9-16M32 22v35M20 49h25M6 35l8 3m37 0l8-3" stroke="#f0b90b" stroke-width="2" fill="none"/><path d="M35 27h7v8h-7z" fill="none" stroke="#f0b90b"/><circle cx="29" cy="30" r="1.5" fill="#f0b90b"/><circle cx="29" cy="38" r="1.5" fill="#f0b90b"/>',
    tennis:'<circle cx="21" cy="43" r="16" fill="#f0b90b"/><circle cx="45" cy="43" r="16" fill="#e3ad00"/><circle cx="32" cy="20" r="16" fill="#f0b90b"/><path d="M21 8q22 11 0 23m22-21q-21 11 0 23M9 33q20 12 0 21m46-22q-20 12 0 21" fill="none" stroke="#fff5d8" stroke-width="2"/>'+glyph(32,20,11,BLACK)
  };
  function icon(id) { return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true">'+(iconParts[id]||iconParts.gift)+'</svg>'; }
  // [shape, fallback cylinder radius, full height, box half-width, box half-depth].
  // These dimensions are available before create(); create() also exposes the
  // exact measured envelope on result.userData.collider and its type descriptor.
  const colliderSpecs = {
  "bottle": [
    "cylinder",
    0.21823529411764708,
    1.12,
    0.21823529411764708,
    0.21823529411764708
  ],
  "hat": [
    "cylinder",
    0.38,
    0.5357854406130268,
    0.38,
    0.38
  ],
  "passport": [
    "box",
    0.38,
    1.0723287671232877,
    0.38,
    0.045
  ],
  "bag": [
    "box",
    0.38,
    0.5185559566787004,
    0.38,
    0.23
  ],
  "hoodie": [
    "box",
    0.38,
    0.8236279069767442,
    0.38,
    0.12
  ],
  "keyboard": [
    "box",
    0.38,
    0.462880658436214,
    0.38,
    0.12
  ],
  "sneaker": [
    "box",
    0.38,
    0.47907142857142854,
    0.38,
    0.19
  ],
  "gift": [
    "box",
    0.38,
    0.6992,
    0.38,
    0.21
  ],
  "suitcase": [
    "box",
    0.38,
    0.9585585585585586,
    0.38,
    0.23
  ],
  "tote": [
    "box",
    0.38,
    1.0824242424242425,
    0.38,
    0.12
  ],
  "tshirt": [
    "box",
    0.38,
    0.6939130434782609,
    0.38,
    0.09
  ],
  "socks": [
    "box",
    0.38,
    0.9008780487804878,
    0.38,
    0.1
  ],
  "umbrella": [
    "cylinder",
    0.22504672897196265,
    1.12,
    0.22504672897196265,
    0.22504672897196265
  ],
  "massager": [
    "box",
    0.38,
    0.6719313304721031,
    0.38,
    0.23
  ],
  "racket": [
    "box",
    0.32051446945337625,
    1.12,
    0.32051446945337625,
    0.04
  ],
  "towel": [
    "box",
    0.38,
    0.5236974789915966,
    0.38,
    0.16
  ],
  "pajamas": [
    "box",
    0.38,
    0.7922033898305084,
    0.38,
    0.12
  ],
  "tennis": [
    "cylinder",
    0.38,
    0.7144,
    0.38,
    0.38
  ],
  "yellowcase": [
    "box",
    0.38,
    0.8563380281690142,
    0.38,
    0.23
  ]
};
  const types = [
    {id:'bottle',name:'提环水瓶',color:YELLOW,points:100},
    {id:'hat',name:'品牌渔夫帽',color:YELLOW,points:100},
    {id:'passport',name:'旅行护照夹',color:YELLOW,points:100},
    {id:'bag',name:'黄带肩包',color:YELLOW,points:180},
    {id:'hoodie',name:'黄色卫衣',color:YELLOW,points:180},
    {id:'keyboard',name:'黑黄键盘',color:YELLOW,points:180},
    {id:'sneaker',name:'黄白币安运动鞋',color:YELLOW,points:300},
    {id:'gift',name:'端午龙鳞礼盒',color:YELLOW,points:300},
    {id:'suitcase',name:'黑金交叉带行李箱',color:YELLOW,points:300},
    {id:'tote',name:'黄色帆布袋',color:YELLOW,points:100},
    {id:'tshirt',name:'品牌黑T恤',color:YELLOW,points:100},
    {id:'socks',name:'双条纹黄袜',color:YELLOW,points:100},
    {id:'umbrella',name:'黑黄收拢伞',color:YELLOW,points:180},
    {id:'massager',name:'便携筋膜枪',color:YELLOW,points:180},
    {id:'racket',name:'网球拍·概念',color:YELLOW,points:300,concept:true},
    {id:'towel',name:'品牌海滩巾',color:YELLOW,points:100},
    {id:'pajamas',name:'黑黄滚边睡衣',color:YELLOW,points:180},
    {id:'tennis',name:'品牌网球套装',color:YELLOW,points:180},
    {id:'yellowcase',name:'亮黄印字行李箱',color:YELLOW,points:300}
  ].map(t=>{const [shape,radius,height,x,z]=colliderSpecs[t.id];return Object.assign(t,{icon:icon(t.id),shape,radius,height,halfExtents:{x,y:height/2,z}});});

  function create(type, THREE) {
    const id = typeof type === 'string' ? type : type.id;
    const g = new THREE.Group(); g.name = 'BinanceMerch:'+id;
    const mat = (color,roughness=.65,metalness=.03) => new THREE.MeshStandardMaterial({color,roughness,metalness});
    const m = {black:mat(BLACK),dark:mat('#29313b'),edge:mat('#444d59'),yellow:mat(YELLOW,.48),gold:mat('#CC9605',.5),cream:mat('#FFF4D3'),white:mat('#FCFAF0'),metal:mat('#949B9F',.3,.75),rubber:mat('#0C1016',.94)};
    function mesh(geo,material,x=0,y=0,z=0,parent=g) {const a=new THREE.Mesh(geo,material);a.position.set(x,y,z);a.castShadow=true;a.receiveShadow=true;parent.add(a);return a;}
    function box(w,h,d,material,x=0,y=0,z=0,parent=g,r=.035) {
      const s=new THREE.Shape(), a=-w/2,b=-h/2; r=Math.min(r,w/3,h/3);
      s.moveTo(a+r,b);s.lineTo(a+w-r,b);s.quadraticCurveTo(a+w,b,a+w,b+r);s.lineTo(a+w,b+h-r);s.quadraticCurveTo(a+w,b+h,a+w-r,b+h);s.lineTo(a+r,b+h);s.quadraticCurveTo(a,b+h,a,b+h-r);s.lineTo(a,b+r);s.quadraticCurveTo(a,b,a+r,b);
      const geo=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:Math.min(.012,d*.15),bevelThickness:Math.min(.012,d*.15),curveSegments:5});geo.translate(0,0,-d/2);
      return mesh(geo,material,x,y,z,parent);
    }
    function cyl(rt,rb,h,material,x=0,y=0,z=0,parent=g,segments=32) {return mesh(new THREE.CylinderGeometry(rt,rb,h,segments),material,x,y,z,parent);}
    function sphere(sx,sy,sz,material,x,y,z,parent=g) {const a=mesh(new THREE.SphereGeometry(1,24,16),material,x,y,z,parent);a.scale.set(sx,sy,sz);return a;}
    function torus(radius,tube,material,x,y,z,parent=g,arc=Math.PI*2) {return mesh(new THREE.TorusGeometry(radius,tube,6,28,arc),material,x,y,z,parent);}
    function tube(points,radius,material,parent=g,closed=false) {const c=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),closed);return mesh(new THREE.TubeGeometry(c,Math.max(10,points.length*5),radius,6,closed),material,0,0,0,parent);}
    function logo(size,x,y,z,material=m.yellow,parent=g) {
      const stamp=new THREE.Group();stamp.position.set(x,y,z);stamp.scale.setScalar(size/6);
      for(const p of POLYGONS){const s=new THREE.Shape();p.forEach((v,i)=>i?s.lineTo(v[0],v[1]):s.moveTo(v[0],v[1]));s.closePath();const a=mesh(new THREE.ShapeGeometry(s),material,0,0,0,stamp);a.castShadow=false;}
      parent.add(stamp);return stamp;
    }
    function label(text,w,h,x,y,z,color=YELLOW,parent=g) {
      if(typeof document==='undefined')return;
      const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');ctx.font='800 64px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(text,256,50);
      const tex=new THREE.CanvasTexture(c);if(THREE.SRGBColorSpace)tex.colorSpace=THREE.SRGBColorSpace;tex.minFilter=THREE.LinearFilter;
      const mm=new THREE.MeshStandardMaterial({map:tex,transparent:true,depthWrite:false,roughness:.7,side:THREE.DoubleSide});const a=mesh(new THREE.PlaneGeometry(w,h),mm,x,y,z,parent);a.castShadow=false;return a;
    }
    function ribbon(points,width,material,parent=g) {
      const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),p=curve.getPoints(28),positions=[],indices=[];
      p.forEach((v,i)=>{const prev=p[Math.max(0,i-1)],next=p[Math.min(p.length-1,i+1)],dx=next.x-prev.x,dy=next.y-prev.y,l=Math.hypot(dx,dy)||1;const ox=-dy/l*width/2,oy=dx/l*width/2;positions.push(v.x+ox,v.y+oy,v.z,v.x-ox,v.y-oy,v.z);if(i<p.length-1){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}});
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();const mm=material.clone();mm.side=THREE.DoubleSide;return mesh(geo,mm,0,0,0,parent);
    }
    function silhouette(points,depth,material,z=0) {
      const s=new THREE.Shape();points.forEach((p,i)=>i?s.lineTo(...p):s.moveTo(...p));s.closePath();
      const geo=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSegments:2,bevelSize:.016,bevelThickness:.016,curveSegments:4});geo.translate(0,0,z-depth/2);return mesh(geo,material);
    }
    if(id==='bottle') {
      cyl(.225,.225,.66,m.black,0,.38,0);sphere(.225,.08,.225,m.black,0,.07,0);sphere(.225,.09,.225,m.black,0,.70,0);
      cyl(.203,.20,.13,m.dark,0,.79,0);cyl(.207,.207,.035,m.edge,0,.74,0);
      const loop=torus(.125,.034,m.black,0,.94,0);loop.scale.x=.85;
      cyl(.228,.228,.105,m.yellow,0,.19,0);logo(.24,0,.45,.228);label('BINANCE',.34,.055,0,.31,.23);
      for(let i=0;i<6;i++){const mark=box(.017,.06,.015,m.black,-.15+i*.06,.19,.219);mark.rotation.z=-.45;}
      torus(.219,.007,m.edge,0,.085,0).rotation.x=Math.PI/2;
    } else if(id==='hat') {
      const brim=cyl(.44,.45,.055,m.black,0,.068,0);brim.scale.z=.9;
      cyl(.24,.31,.33,m.dark,0,.26,0);sphere(.241,.045,.241,m.dark,0,.423,0);
      cyl(.292,.305,.075,m.yellow,0,.14,0);
      for(const r of [.34,.385,.424]){const st=torus(r,.0035,m.edge,0,.099,0);st.rotation.x=Math.PI/2;st.scale.y=.9;}
      logo(.15,0,.29,.287);label('BINANCE',.23,.04,0,.142,.307,BLACK);
      const seam=tube([[-.15,.38,.165],[0,.42,.22],[.15,.38,.165]],.003,m.edge);seam.castShadow=false;
      g.scale.set(1.05,1.42,1.05);
    } else if(id==='passport') {
      box(.54,.77,.09,m.gold,0,.398,0);box(.522,.744,.025,m.cream,.007,.398,0);
      box(.55,.78,.023,m.black,0,.40,.064);box(.55,.78,.023,m.black,0,.40,-.064);
      box(.038,.76,.145,m.yellow,-.267,.40,0);logo(.28,.035,.49,.078);
      label('BINANCE',.33,.055,.02,.278,.08);label('PASSPORT',.25,.041,.02,.17,.08);
      tube([[-.22,.75,.078],[.245,.75,.078],[.245,.047,.078],[-.22,.047,.078]],.0025,m.gold);
      const globe=torus(.034,.003,m.yellow,.02,.102,.08);sphere(.003,.027,.001,m.yellow,.02,.102,.08);box(.06,.003,.003,m.yellow,.02,.102,.08);
      g.rotation.y=-.15;
    } else if(id==='bag') {
      box(.68,.43,.28,m.black,0,.255,0);box(.55,.255,.045,m.dark,0,.245,.157);
      ribbon([[-.31,.48,0],[-.35,.84,0],[-.24,1.08,0],[0,1.14,0],[.24,1.08,0],[.35,.84,0],[.31,.48,0]],.095,m.yellow);
      for(const x of [-.32,.32])torus(.043,.013,m.metal,x,.47,.01);
      tube([[-.29,.431,.149],[0,.454,.155],[.29,.431,.149]],.008,m.yellow);
      box(.035,.063,.012,m.metal,.20,.408,.167);logo(.17,0,.255,.184);
      label('BINANCE',.30,.046,0,.14,.184);box(.04,.085,.05,m.yellow,-.28,.21,.188);
      g.scale.setScalar(.94);
    } else if(id==='hoodie') {
      const outline=[[-.245,.025],[.245,.025],[.257,.39],[.37,.22],[.49,.29],[.36,.60],[.19,.68],[-.19,.68],[-.36,.60],[-.49,.29],[-.37,.22],[-.257,.39]];
      const s=new THREE.Shape();outline.forEach((p,i)=>i?s.lineTo(...p):s.moveTo(...p));s.closePath();const geo=new THREE.ExtrudeGeometry(s,{depth:.20,bevelEnabled:true,bevelSegments:3,bevelSize:.035,bevelThickness:.035,curveSegments:5});geo.translate(0,0,-.10);mesh(geo,m.yellow);
      sphere(.23,.21,.14,m.gold,0,.68,-.012);sphere(.144,.139,.055,m.black,0,.719,.115);
      const hood=torus(.152,.033,m.yellow,0,.72,.13);hood.scale.set(1,1.03,.9);
      box(.49,.067,.235,m.gold,0,.045,0);box(.29,.135,.025,m.gold,0,.211,.137,g,.02);
      tube([[-.15,.268,.156],[-.105,.315,.156],[.105,.315,.156],[.15,.268,.156]],.005,m.yellow);
      for(const x of [-.075,.075])tube([[x,.605,.15],[x*1.17,.5,.155],[x*1.22,.47,.155]],.007,m.cream);
      logo(.21,0,.435,.139,m.black);label('BINANCE',.28,.042,0,.355,.14,BLACK);
      for(const side of [-1,1]){const cuff=box(.135,.064,.21,m.gold,side*.43,.264,0);cuff.rotation.z=side*.47;}
      g.scale.x=.9;
    } else if(id==='keyboard') {
      const kb=new THREE.Group();g.add(kb);kb.position.y=.31;kb.rotation.x=-.43;
      box(.94,.45,.075,m.black,0,0,0,kb);box(.90,.405,.018,m.edge,0,0,.047,kb);
      for(let row=0;row<4;row++)for(let col=0;col<12;col++){
        const yellow=(row===0&&col===0)||(col===11)||(row===3&&col>2&&col<8);
        const key=box(.058,.058,.029,yellow?m.yellow:m.dark,-.405+col*.073,.105-row*.078,.077,kb,.008);
        if(!yellow&&((col+row)%4===0))box(.016,.0025,.001,m.edge,key.position.x,key.position.y+.012,.094,kb,.001);
      }
      box(.22,.052,.033,m.yellow,-.04,-.135,.08,kb,.009);logo(.063,-.394,.18,.061,m.yellow,kb);label('BINANCE',.24,.036,-.20,.182,.062,YELLOW,kb);
      sphere(.015,.015,.004,m.yellow,.394,.182,.061,kb);g.rotation.y=-.13;g.scale.y=1.3;
    } else if(id==='sneaker') {
      const outline=[[-.18,-.37],[-.215,-.20],[-.223,.19],[-.17,.39],[-.06,.46],[.09,.455],[.205,.34],[.224,.08],[.20,-.25],[.14,-.37]];
      function shoeLayer(points,depth,y,material,bevel){const s=new THREE.Shape();points.forEach((p,i)=>i?s.lineTo(p[0],-p[1]):s.moveTo(p[0],-p[1]));s.closePath();const ge=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSegments:3,bevelSize:bevel,bevelThickness:bevel,curveSegments:6});ge.rotateX(-Math.PI/2);return mesh(ge,material,0,y,0);}
      shoeLayer(outline,.065,.022,m.cream,.016);shoeLayer(outline.map(p=>[p[0]*.965,p[1]*.98]),.155,.109,m.yellow,.035);
      box(.34,.22,.28,m.yellow,0,.295,-.235);sphere(.19,.091,.24,m.yellow,0,.271,.185);
      sphere(.134,.016,.121,m.black,0,.421,-.244);const collar=torus(.129,.023,m.cream,0,.423,-.244);collar.rotation.x=Math.PI/2;collar.scale.y=.9;
      box(.16,.245,.043,m.gold,0,.346,-.067).rotation.x=-1.12;
      for(let i=0;i<6;i++){const z=.147-i*.047,y=.347+i*.009;tube([[-.11,y,z],[0,y+.019,z-.018],[.11,y,z]],.009,m.cream);sphere(.012,.008,.012,m.gold,-.12,y,z);sphere(.012,.008,.012,m.gold,.12,y,z);}
      tube([[0,.425,-.115],[-.092,.468,-.128],[-.097,.454,-.065],[0,.425,-.115],[.094,.472,-.143],[.105,.444,-.079],[0,.425,-.115]],.009,m.cream);
      tube([[0,.425,-.115],[.073,.414,-.031],[.077,.39,.035]],.008,m.cream);
      tube([[0,.425,-.115],[-.075,.404,-.034],[-.099,.377,.031]],.008,m.cream);
      for(const x of [-.211,.211])tube([[x,.208,-.19],[x,.178,-.02],[x,.185,.20]],.018,m.cream);
      const topMark=logo(.105,0,.294,.349,m.black);topMark.rotation.x=-.55;
      for(let i=0;i<6;i++)tube([[-.21,.055,-.22+i*.096],[-.214,.07,-.22+i*.096]],.005,m.gold);
      g.rotation.y=-.48;g.scale.set(.98,1.28,.98);
    } else if(id==='gift') {
      box(.76,.44,.63,m.black,0,.25,0);box(.82,.075,.685,m.yellow,0,.507,0);
      for(let row=0;row<3;row++)for(let col=0;col<6;col++){
        const arc=torus(.053,.0035,m.edge,-.322+col*.123+(row%2)*.025,.15+row*.103,.328,g,Math.PI);arc.scale.y=.63;
      }
      box(.11,.45,.655,m.yellow,0,.25,0);box(.84,.017,.103,m.gold,0,.557,0);box(.11,.017,.70,m.gold,0,.557,0);
      tube([[0,.585,0],[-.12,.67,-.04],[-.205,.63,.015],[-.09,.581,.063],[0,.585,0]],.028,m.yellow);
      tube([[0,.585,0],[.12,.67,-.04],[.205,.63,.015],[.09,.581,.063],[0,.585,0]],.028,m.yellow);
      logo(.082,0,.26,.34,m.black);label('BINANCE',.255,.048,.16,.507,.356,BLACK);
      box(.027,.073,.025,m.gold,0,.576,.19).rotation.x=.16;
    } else if(id==='suitcase') {
      box(.59,.745,.31,m.black,0,.475,0,g,.075);box(.535,.69,.045,m.dark,0,.475,.17);
      for(let i=0;i<5;i++)box(.033,.60,.026,m.edge,-.216+i*.108,.477,.192,g,.015);
      for(const x of [-.215,.215])for(const z of [-.12,.12]){
        box(.075,.092,.078,m.dark,x,.105,z);const wheel=cyl(.068,.068,.061,m.rubber,x,.068,z);wheel.rotation.z=Math.PI/2;
        const hub=cyl(.033,.033,.063,m.yellow,x,.068,z);hub.rotation.z=Math.PI/2;
      }
      for(const x of [-.155,.155])cyl(.013,.013,.29,m.metal,x,.958,-.047, g,10);
      box(.36,.052,.067,m.dark,0,1.11,-.047);box(.19,.038,.07,m.dark,0,.874,.023);
      box(.096,.76,.337,m.yellow,-.075,.48,0);box(.607,.097,.026,m.yellow,0,.433,.223);
      box(.13,.124,.043,m.black,-.075,.433,.242,g,.008);box(.07,.074,.016,m.yellow,-.075,.433,.271,g,.008);
      logo(.055,-.075,.433,.282,m.black);label('BINANCE',.18,.035,.137,.433,.24,BLACK);
      for(const x of [-.267,.267]){sphere(.035,.045,.025,m.black,x,.795,.163);sphere(.035,.045,.025,m.black,x,.157,.163);}
      g.rotation.y=-.12;
    } else if(id==='tote') {
      silhouette([[-.245,.035],[.245,.035],[.30,.64],[-.30,.64]],.16,m.yellow);
      box(.597,.045,.19,m.gold,0,.626,0,g,.01);
      for(const z of [-.07,.083])ribbon([[-.16,.615,z],[-.165,.82,z],[-.11,.99,z],[.11,.99,z],[.165,.82,z],[.16,.615,z]],.05,m.gold);
      for(const side of [-1,1])tube([[side*.255,.61,.098],[side*.233,.34,.098],[side*.216,.07,.098]],.003,m.gold);
      tube([[-.218,.074,.099],[.218,.074,.099]],.003,m.gold);
      logo(.28,0,.39,.099,m.black);label('BINANCE',.39,.06,0,.18,.100,BLACK);
      box(.041,.094,.021,m.black,.269,.49,.09,g,.005);logo(.031,.269,.49,.104,m.yellow);
    } else if(id==='tshirt') {
      silhouette([[-.225,.02],[.225,.02],[.225,.42],[.36,.325],[.48,.48],[.34,.655],[.145,.725],[-.145,.725],[-.34,.655],[-.48,.48],[-.36,.325],[-.225,.42]],.135,m.black);
      sphere(.115,.065,.036,m.rubber,0,.714,.063);
      tube([[-.137,.736,.084],[-.087,.664,.086],[0,.645,.086],[.087,.664,.086],[.137,.736,.084]],.012,m.yellow);
      tube([[-.206,.054,.087],[.206,.054,.087]],.003,m.edge);
      for(const side of [-1,1])tube([[side*.378,.348,.087],[side*.459,.478,.087]],.005,m.gold);
      logo(.265,0,.442,.089,m.yellow);label('BINANCE',.37,.051,0,.261,.089);
      box(.032,.068,.014,m.yellow,-.218,.09,.09,g,.004);
    } else if(id==='socks') {
      for(const [x,z] of [[-.13,-.025],[.13,.025]]) {
        cyl(.086,.087,.50,m.yellow,x,.427,z);sphere(.085,.095,.087,m.yellow,x,.182,z);
        box(.164,.146,.30,m.yellow,x,.087,z+.095,g,.057);sphere(.081,.072,.083,m.gold,x,.088,z+.237);
        cyl(.09,.09,.048,m.gold,x,.684,z);cyl(.091,.091,.019,m.black,x,.64,z);cyl(.091,.091,.017,m.black,x,.602,z);
        logo(.084,x,.456,z+.089,m.black);label('BNB',.094,.03,x,.354,z+.09,BLACK);
        for(let i=0;i<5;i++)tube([[x-.059+i*.029,.669,z+.072],[x-.059+i*.029,.701,z+.072]],.0018,m.yellow);
      }
    } else if(id==='umbrella') {
      cyl(.014,.014,.89,m.metal,0,.637,0,g,12);
      cyl(.027,.117,.65,m.black,0,.665,0);sphere(.116,.03,.116,m.dark,0,.337,0);
      for(let i=0;i<8;i++){const a=i/8*Math.PI*2;const rib=[[Math.cos(a)*.025,.982,Math.sin(a)*.025],[Math.cos(a)*.075,.66,Math.sin(a)*.075],[Math.cos(a)*.117,.343,Math.sin(a)*.117]];tube(rib,.0035,i%2?m.edge:m.gold);}
      cyl(.074,.077,.045,m.yellow,0,.668,0);cyl(.021,.016,.065,m.dark,0,1.037,0,g,12);
      tube([[0,.325,0],[0,.165,0],[0,.059,0],[-.071,.026,0],[-.123,.072,0],[-.123,.14,0]],.027,m.yellow);
      label('BINANCE',.1,.025,0,.665,.079,BLACK);
      tube([[.021,.297,0],[.08,.245,.016],[.06,.198,.03],[.021,.258,0]],.008,m.black);
    } else if(id==='massager') {
      const grip=cyl(.078,.093,.46,m.black,0,.302,0);grip.rotation.z=.13;
      const wrap=cyl(.088,.092,.106,m.yellow,.015,.16,0);wrap.rotation.z=.13;
      const motor=cyl(.113,.113,.36,m.dark,-.032,.622,0);motor.rotation.z=Math.PI/2;
      const cap=cyl(.114,.114,.047,m.yellow,-.225,.622,0);cap.rotation.z=Math.PI/2;
      const shaft=cyl(.035,.035,.105,m.metal,.20,.622,0);shaft.rotation.z=Math.PI/2;
      sphere(.115,.115,.115,m.rubber,.30,.622,0);
      logo(.12,-.052,.621,.115,m.yellow);sphere(.022,.028,.008,m.yellow,-.025,.448,.078);
      for(let i=0;i<4;i++)box(.012,.007,.003,m.black,-.12+i*.035,.64,.115,g,.002);
      label('BINANCE',.12,.025,.014,.158,.091,BLACK);
    } else if(id==='racket') {
      const frame=torus(.213,.025,m.yellow,0,.687,0);frame.scale.y=1.27;
      const inner=torus(.189,.005,m.black,0,.687,.003);inner.scale.y=1.27;
      for(let i=-4;i<=4;i++) {
        const x=i*.04,h=Math.sqrt(Math.max(0,1-(x/.186)**2))*.238;
        tube([[x,.687-h,.006],[x,.687+h,.006]],.0024,m.cream);
      }
      for(let i=-5;i<=5;i++) {
        const y=i*.039,w=Math.sqrt(Math.max(0,1-(y/.237)**2))*.188;
        tube([[-w,.687+y,.005],[w,.687+y,.005]],.0024,m.cream);
      }
      tube([[-.105,.452,0],[-.058,.336,0],[0,.282,0],[.058,.336,0],[.105,.452,0]],.019,m.yellow);
      cyl(.026,.026,.15,m.yellow,0,.261,0,g,12);cyl(.042,.045,.235,m.black,0,.123,0,g,16);
      cyl(.05,.05,.027,m.yellow,0,.019,0,g,16);
      for(let i=0;i<7;i++){const wrap=torus(.043,.003,m.edge,0,.039+i*.027,0);wrap.rotation.x=Math.PI/2;}
      logo(.048,0,.17,.046,m.yellow);
    } else if(id==='towel') {
      box(.49,.647,.082,m.yellow,0,.347,0,g,.018);box(.50,.035,.089,m.gold,0,.656,0,g,.009);
      const roll=cyl(.083,.083,.53,m.gold,0,.736,0);roll.rotation.z=Math.PI/2;
      const rollEnd=torus(.058,.007,m.yellow,.271,.736,0);rollEnd.rotation.y=Math.PI/2;
      const rollCore=cyl(.018,.018,.545,m.black,0,.736,0);rollCore.rotation.z=Math.PI/2;
      box(.495,.046,.089,m.black,0,.15,0,g,.004);box(.495,.021,.089,m.black,0,.095,0,g,.003);
      for(let i=0;i<12;i++)tube([[-.23+i*.042,.028,.008],[-.233+i*.042,-.005,.012],[-.23+i*.042,-.022,.003]],.004,m.yellow);
      logo(.267,0,.457,.054,m.black);label('BINANCE',.365,.053,0,.271,.056,BLACK);
      for(const x of [-.215,.215])tube([[x,.204,.051],[x,.619,.051]],.0025,m.gold);
    } else if(id==='pajamas') {
      // Shirt and folded trouser legs: no claim about fabric composition.
      for(const x of [-.115,.115]){box(.198,.28,.13,m.black,x,.156,-.024,g,.018);box(.202,.022,.145,m.yellow,x,.044,-.023,g,.003);}
      silhouette([[-.23,.259],[.23,.259],[.227,.62],[.349,.367],[.461,.407],[.348,.794],[.14,.86],[-.14,.86],[-.348,.794],[-.461,.407],[-.349,.367],[-.227,.62]],.133,m.black);
      silhouette([[-.142,.862],[-.031,.708],[-.11,.65],[-.19,.793]],.012,m.dark,.089);
      silhouette([[.142,.862],[.031,.708],[.11,.65],[.19,.793]],.012,m.dark,.089);
      tube([[-.143,.862,.112],[-.033,.708,.113],[-.11,.65,.112]],.006,m.yellow);
      tube([[.143,.862,.112],[.033,.708,.113],[.11,.65,.112]],.006,m.yellow);
      tube([[0,.71,.091],[0,.283,.091],[-.217,.283,.091]],.004,m.yellow);
      tube([[0,.283,.091],[.217,.283,.091]],.004,m.yellow);
      for(let i=0;i<5;i++)sphere(.010,.010,.005,m.yellow,-.022,.35+i*.064,.096);
      box(.106,.098,.008,m.dark,.127,.58,.084,g,.005);
      tube([[.072,.622,.096],[.072,.531,.096],[.18,.531,.096],[.18,.622,.096]],.003,m.yellow);
      logo(.052,.127,.574,.098,m.yellow);
      for(const side of [-1,1])tube([[side*.353,.392,.092],[side*.443,.426,.092]],.005,m.yellow);
    } else if(id==='tennis') {
      for(const [x,y,z] of [[-.146,.151,.018],[.146,.151,.018],[0,.40,-.01]]) {
        sphere(.146,.146,.146,m.yellow,x,y,z);
        for(const side of [-1,1]) {
          const pts=[];for(let i=0;i<=12;i++){const a=-1.19+i/12*2.38;pts.push([x+side*(.094-.050*Math.cos(a)),y+Math.sin(a)*.139,z+Math.cos(a)*.130]);}
          tube(pts,.0033,m.cream);
        }
        logo(.072,x,y,z+.147,m.black);
      }
    } else {
      return create('gift',THREE);
    }
    g.updateMatrixWorld(true);
    let bounds = new THREE.Box3().setFromObject(g);const size=new THREE.Vector3();bounds.getSize(size);
    // A conservative horizontal envelope leaves room inside the 1.03 ring hole.
    const fit=Math.min(1,.78/Math.hypot(size.x,size.z));g.scale.x*=fit;g.scale.z*=fit;g.updateMatrixWorld(true);
    bounds=new THREE.Box3().setFromObject(g);bounds.getSize(size);const center=bounds.getCenter(new THREE.Vector3());
    g.position.set(-center.x,-bounds.min.y,-center.z);
    const result=new THREE.Group();result.name='BinanceMerch:'+id;result.add(g);
    const descriptor=types.find(t=>t.id===id),shape=['bottle','hat','umbrella','tennis'].includes(id)?'cylinder':'box';
    const radius=Math.max(.17,Math.min(.35,Math.max(size.x,size.z)/2));
    const collider={shape,radius,height:size.y,halfExtents:{x:size.x/2,y:size.y/2,z:size.z/2}};
    if(descriptor)Object.assign(descriptor,collider);
    result.userData.merchId=id;result.userData.source='Original procedural miniature; see RESEARCH.md';result.userData.collider=collider;
    return result;
  }
  window.LuckyMerch = {types, create, icon};
})();
