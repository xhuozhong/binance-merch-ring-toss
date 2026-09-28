/* Lucky Loop rigid-body adapter. Original code; Cannon.js 0.6.2 is MIT.
 * Local ring normal is +Y (ring lies in XZ). Rotate Three TorusGeometry by
 * -PI/2 around X ONCE, then copy the body's quaternion directly each frame.
 * Public dt, ages and contact times are seconds; velocities use world units/s.
 */
(function (root) {
  'use strict';
  const RADIUS = .64, TUBE = .045, INNER = RADIUS - TUBE;
  const GROUND_Y = .055, TARGET_BOTTOM = .065, BEADS = 64;
  const RING_MASS = .09;
  const PRIZE_MASS = {bottle:.30,hat:.16,passport:.18,bag:.38,hoodie:.55,keyboard:.65,sneaker:.45,gift:.55,suitcase:2.5,yellowcase:2.5,tote:.22,tshirt:.28,socks:.12,umbrella:.38,massager:.80,racket:.32,towel:.40,pajamas:.40,tennis:.18};
  const SOFT_PRIZES = new Set(['hat','bag','hoodie','tote','tshirt','socks','towel','pajamas']);
  const FIXED = 1 / 120, STABLE_TIME = .4, MAX_AGE = 10, MAX_RINGS = 24;
  const vector = v => ({ x: v.x, y: v.y, z: v.z });
  const rotation = q => ({ x: q.x, y: q.y, z: q.z, w: q.w });
  const finite = (n, fallback) => Number.isFinite(n) ? n : fallback;

  function create(options) {
    options = options || {};
    const C = options.CANNON || root.CANNON;
    if (!C) throw new Error('LuckyPhysics requires Cannon.js 0.6.2 before physics.js.');
    const world = new C.World();
    world.gravity.set(0, -9.81, 0);
    world.allowSleep = true;
    world.broadphase = new C.SAPBroadphase(world);
    world.solver.iterations = 20;
    world.solver.tolerance = .00001;
    world.quatNormalizeSkip = 0;
    world.quatNormalizeFast = false;
    const ringMaterial = new C.Material('plastic-ring');
    const tableMaterial = new C.Material('night-market-carpet');
    const prizeMaterial = new C.Material('solid-prizes');
    const clothMaterial = new C.Material('cloth-prizes');
    const lowerMaterial = new C.Material('lower-floor');
    function contact(a, b, friction, restitution) {
      world.addContactMaterial(new C.ContactMaterial(a, b, {
        friction, restitution, contactEquationStiffness: 1e7,
        contactEquationRelaxation: 3, frictionEquationStiffness: 1e7,
        frictionEquationRelaxation: 3
      }));
    }
    contact(ringMaterial, tableMaterial, .38, .18);
    contact(ringMaterial, prizeMaterial, .26, .3);
    contact(ringMaterial, lowerMaterial, .45, .23);
    contact(ringMaterial, ringMaterial, .28, .25);
    contact(prizeMaterial, tableMaterial, .62, .04);
    contact(prizeMaterial, lowerMaterial, .52, .09);
    contact(prizeMaterial, prizeMaterial, .45, .10);
    contact(ringMaterial, clothMaterial, .48, .08);
    contact(clothMaterial, tableMaterial, .78, .015);
    contact(clothMaterial, lowerMaterial, .65, .035);
    contact(clothMaterial, prizeMaterial, .55, .06);
    contact(clothMaterial, clothMaterial, .65, .025);
    const table = new C.Body({ mass: 0, material: tableMaterial });
    table.addShape(new C.Box(new C.Vec3(5.35, .13, 4.4)));
    table.position.set(0, GROUND_Y - .13, 0);
    table._lucky = { kind: 'table' };
    world.addBody(table);
    const lower = new C.Body({ mass: 0, material: lowerMaterial });
    lower.addShape(new C.Plane());
    lower.quaternion.setFromAxisAngle(new C.Vec3(1, 0, 0), -Math.PI / 2);
    lower.position.y = .015;
    lower._lucky = { kind: 'lower-floor' };
    world.addBody(lower);
    const yCylinder = new C.Quaternion();
    yCylinder.setFromAxisAngle(new C.Vec3(1, 0, 0), -Math.PI / 2);
    const rings = new Map(), targetMap = new Map(), specialMap = new Map();
    let time = 0, accumulator = 0, wind = 0;

    function correctCompoundBounds(body){
      // Cannon 0.6.2 computeAABB rotates child offsets by the child orientation.
      // Offsets belong to the parent body; a rotated strap/cylinder must not
      // orbit its own orientation. Keep broadphase and inertia in that frame.
      const p=new C.Vec3(),q=new C.Quaternion(),bounds=new C.AABB();
      body.computeAABB=function(){
        for(let i=0;i<this.shapes.length;i++){
          this.quaternion.vmult(this.shapeOffsets[i],p);p.vadd(this.position,p);
          this.quaternion.mult(this.shapeOrientations[i],q);
          this.shapes[i].calculateWorldAABB(p,q,bounds.lowerBound,bounds.upperBound);
          if(i===0)this.aabb.copy(bounds);else this.aabb.extend(bounds);
        }
        this.aabbNeedsUpdate=false;
      };
    }

    function normalizedTarget(t) {
      const radius = Math.max(.04, finite(t.radius, .28));
      const height = Math.max(.08, finite(t.height, .72));
      const shape = t.shape && typeof t.shape === 'object' ? t.shape : { type: t.shape || 'cylinder' };
      const halves = shape.halfExtents || t.halfExtents || {};
      const typeId = String(t.typeId || t.merchId || t.id || 'prize');
      return {
        id: t.id, typeId, x: finite(t.x, 0), z: finite(t.z, 0), radius, height,
        centerY: height * (typeId==='bag'?.245:typeId==='tote'?.35:.5),
        mass: Math.max(.06, Math.min(8, finite(t.mass, PRIZE_MASS[typeId] || .5))),
        caught: !!t.caught, moving: !!t.moving,
        shape: shape.type === 'box' ? 'box' : 'cylinder',
        halfX: Math.max(.02, finite(halves.x, finite(shape.width, finite(t.width, radius * 1.4)) / 2)),
        halfZ: Math.max(.02, finite(halves.z, finite(shape.depth, finite(t.depth, radius * 1.4)) / 2))
      };
    }
    function makeTarget(input) {
      const t = normalizedTarget(input);
      const body = new C.Body({mass:t.moving?0:t.mass,type:t.moving?C.Body.KINEMATIC:C.Body.DYNAMIC,material:SOFT_PRIZES.has(t.typeId)?clothMaterial:prizeMaterial,linearDamping:.035,angularDamping:.08,allowSleep:!t.moving,sleepSpeedLimit:.055,sleepTimeLimit:.7});
      correctCompoundBounds(body);
      // Origin approximates the mass centre, below the empty handles of bags.
      // All parts remain bottom-relative; graphics use bottomPosition + rotation.
      const h=t.height,hx=t.halfX,hz=t.halfZ,cy=t.centerY;
      const box=(x,y,z,w,height,depth)=>body.addShape(new C.Box(new C.Vec3(w/2,height/2,depth/2)),new C.Vec3(x,y-cy,z));
      const cylinder=(y,height,bottom,top=bottom)=>body.addShape(new C.Cylinder(top,bottom,height,24),new C.Vec3(0,y-cy,0),yCylinder);
      function ribbon(points,width,depth){
        for(let i=1;i<points.length;i++){
          const a=new C.Vec3(points[i-1][0]*hx,points[i-1][1]*h,points[i-1][2]*hz),b=new C.Vec3(points[i][0]*hx,points[i][1]*h,points[i][2]*hz),dx=b.x-a.x,dy=b.y-a.y;
          // Ribbon width follows its XY tangent; it must not twist into Z as
          // the arched path bends slightly toward the back of the bag.
          const q=new C.Quaternion();q.setFromAxisAngle(new C.Vec3(0,0,1),Math.atan2(-dx,dy));
          body.addShape(new C.Box(new C.Vec3(width/2,Math.hypot(dx,dy)/2,(depth+Math.abs(b.z-a.z))/2)),new C.Vec3((a.x+b.x)/2,(a.y+b.y)/2-cy,(a.z+b.z)/2),q);
        }
      }
      if(t.typeId==='bottle'){
        cylinder(h*.39,h*.78,t.radius);
        cylinder(h*.865,h*.17,t.radius*.62);
        cylinder(h*.975,h*.05,t.radius*.77);
      }else if(t.typeId==='hat'){
        cylinder(h*.055,h*.11,t.radius);
        cylinder(h*.555,h*.89,t.radius*.78,t.radius*.63);
      }else if(t.typeId==='sneaker'){
        box(0,h*.08,0,hx*2,h*.16,hz*2);
        box(-hx*.58,h*.58,0,hx*.84,h*.84,hz*1.72);
        box(hx*.42,h*.385,0,hx*1.16,h*.45,hz*1.92);
      }else if(t.typeId==='gift'){
        box(0,h*.42,0,hx*2,h*.84,hz*2);
        box(0,h*.88,0,hx*.58,h*.08,hz*.42);
        const bow=Math.min(h*.07,hz*.35);
        for(const x of [-hx*.23,hx*.23])body.addShape(new C.Sphere(bow),new C.Vec3(x,h*.93-cy,0));
      }else if(t.typeId==='suitcase'||t.typeId==='yellowcase'){
        const wheel=Math.min(h*.0432,hz*.27);
        box(-hx*.056,h*.466,hz*.022,hx*1.842,h*.689,hz*1.75);
        for(const x of [-hx*.779,hx*.667])for(const z of [-hz*.57,hz*.614]){
          body.addShape(new C.Sphere(wheel),new C.Vec3(x,wheel-cy,z));
          box(x,h*.11,z,hx*.12,h*.08,hz*.2);
        }
        box(-hx*.056,h*.979,-hz*.855,hx*.933,h*.033,hz*.27);
        for(const x of [-hx*.474,hx*.362])box(x,h*.874,-hz*.855,hx*.09,h*.21,hz*.13);
      }else if(t.typeId==='bag'){
        box(0,h*.2085,0,hx*1.70,h*.417,hz*2);
        // Sampled from the sewn strap in cloth-models.js, normalized to its
        // measured width/height/depth. The centre of its arch is genuinely empty.
        ribbon([[-.81793,.32805,-.1259],[-.87561,.46146,-.14601],[-.93328,.59488,-.16612],[-.91815,.71124,-.2084],[-.80852,.79902,-.2865],[-.63895,.87277,-.38286],[-.44211,.92621,-.45589],[-.17904,.96124,-.49733],[.11853,.97058,-.50926],[.38664,.94957,-.48339],[.60107,.89876,-.40598],[.79057,.82227,-.29659],[.91472,.72994,-.2084],[.93501,.60853,-.16411],[.87765,.46829,-.145],[.82028,.32805,-.1259]],hx*.1214,hz*.077);
      }else if(t.typeId==='tote'){
        box(0,h*.3125,0,hx*2,h*.625,hz*2);
        const path=[[-.56062,.5842,.9398],[-.58562,.66868,.90668],[-.61061,.75317,.87356],[-.5728,.82726,.83746],[-.42572,.8964,.78558],[-.21286,.95466,.73059],[0,.97917,.70503],[.21286,.95466,.73059],[.42572,.8964,.78558],[.5728,.82726,.83746],[.61061,.75317,.87356],[.58562,.66868,.90668],[.56062,.5842,.9398]];
        for(const sign of [-1,1])ribbon(path.map(p=>[p[0],p[1],sign*(p[2]+.00532)-.00532]),hx*.117,hz*.0662);
      }else if(t.shape==='box')box(0,h/2,0,hx*2,h,hz*2);
      else cylinder(h/2,h,t.radius);
      body.position.set(t.x,TARGET_BOTTOM+cy,t.z);
      body._lucky = { kind: 'target', targetId: t.id };
      world.addBody(body);
      const record = { data: t, body, desired: new C.Vec3(t.x,TARGET_BOTTOM+cy,t.z), consumed: !!t.caught };
      targetMap.set(t.id, record);
      if(t.caught)freezePrize(record);
      return record;
    }
    function freezePrize(t){
      // A won, already-resting prize becomes display-stable at its actual pose.
      t.consumed=true;t.body.type=C.Body.STATIC;t.body.mass=0;
      t.body.velocity.set(0,0,0);t.body.angularVelocity.set(0,0,0);
      t.body.updateMassProperties();t.body.aabbNeedsUpdate=true;
    }
    function setTargets(list) {
      const present = new Set();
      for (const source of list || []) {
        if (source.id === undefined || source.id === null) throw new Error('Physics target requires an id.');
        present.add(source.id);
        let t = targetMap.get(source.id);
        if (!t) { makeTarget(source); continue; }
        const next = normalizedTarget(source);
        // Shape dimensions remain a per-round contract. reset() rebuilds shapes.
        t.data.caught = next.caught;
        t.data.moving = next.moving;
        if (next.caught && !t.consumed) freezePrize(t);
        if (t.consumed) continue;
        t.desired.set(next.x,TARGET_BOTTOM+t.data.centerY,next.z);
        const bodyType=next.moving?C.Body.KINEMATIC:C.Body.DYNAMIC;
        t.body.allowSleep=!next.moving;
        if(t.body.type!==bodyType){t.body.type=bodyType;t.body.mass=next.moving?0:t.data.mass;t.body.updateMassProperties();t.body.wakeUp();}
        // Ordinary prizes belong to the solver. Never overwrite a displacement
        // with the original UI layout on the next setTargets() call.
      }
      for (const [id, t] of targetMap) if (!present.has(id)) { world.removeBody(t.body); targetMap.delete(id); }
    }
    function setSpecialTargets(list){
      const present=new Set();
      for(const input of list||[]){
        if(input.id===undefined||input.id===null)throw new Error('Special target requires an id.');
        present.add(input.id);
        const data={id:input.id,x:finite(input.x,0),z:finite(input.z,0),neckY:finite(input.neckY,2.3),headRadius:Math.max(.08,finite(input.headRadius,.32)),neckRadius:Math.max(.05,finite(input.neckRadius,.13)),neckHeight:Math.max(.12,finite(input.neckHeight,.34)),shoulderHalfWidth:Math.max(.25,finite(input.shoulderHalfWidth,.8)),shoulderHalfDepth:Math.max(.1,finite(input.shoulderHalfDepth,.22)),centerTolerance:Math.max(.06,Math.min(.12,finite(input.centerTolerance,.11)))};
        data.shoulderTop=data.neckY-TUBE;
        data.headCenterY=data.shoulderTop+data.neckHeight+data.headRadius;
        data.headTop=data.headCenterY+data.headRadius;
        let record=specialMap.get(data.id);
        const consumed=!!record?.consumed;
        if(record&&JSON.stringify(record.data)===JSON.stringify(data))continue;
        if(record)world.removeBody(record.body);
        const body=new C.Body({mass:0,type:C.Body.STATIC,material:clothMaterial});
        body.position.set(data.x,0,data.z);
        body.addShape(new C.Box(new C.Vec3(data.shoulderHalfWidth,.07,data.shoulderHalfDepth)),new C.Vec3(0,data.shoulderTop-.07,0));
        body.addShape(new C.Cylinder(data.neckRadius,data.neckRadius,data.neckHeight,20),new C.Vec3(0,data.shoulderTop+data.neckHeight/2,0),yCylinder);
        body.addShape(new C.Sphere(data.headRadius),new C.Vec3(0,data.headCenterY,0));
        body._lucky={kind:'special-target',targetId:data.id};world.addBody(body);
        specialMap.set(data.id,{data,body,consumed});
      }
      for(const [id,t]of specialMap)if(!present.has(id)){world.removeBody(t.body);specialMap.delete(id);}
    }
    function clear() {
      for (const r of rings.values()) world.removeBody(r.body);
      rings.clear();
      accumulator = 0;
    }
    function reset(list) {
      clear();
      for (const t of targetMap.values()) world.removeBody(t.body);
      targetMap.clear();
      time = 0;
      wind = 0;
      world.time = 0;
      world.stepnumber = 0;
      for(const t of specialMap.values())t.consumed=false;
      setTargets(list || []);
    }
    function readRing(r) {
      return {
        id: r.id, position: vector(r.body.position), quaternion: rotation(r.body.quaternion),
        velocity: vector(r.body.velocity), angularVelocity: vector(r.body.angularVelocity),
        sleeping: r.body.sleepState === C.Body.SLEEPING, settled: r.settled,
        hitTargetId: r.hitTargetId, secretTargetId:r.secretTargetId, age: time - r.born, stableTime: r.stableTime,
        clearedSpecialTargets:Array.from(r.clearedSpecial),
        contacts: r.contacts.map(c => Object.assign({}, c, { position: Object.assign({}, c.position) })),
        contactCount: r.contactCount, reason: r.reason || null
      };
    }
    function getRing(id) { const r = rings.get(id); return r ? readRing(r) : null; }
    function launch(input) {
      if (!input || input.id === undefined || input.id === null) throw new Error('Physics ring requires an id.');
      if (rings.has(input.id)) return false;
      while (rings.size >= MAX_RINGS) {
        const oldest = Array.from(rings.values()).find(r => r.settled) || rings.values().next().value;
        world.removeBody(oldest.body); rings.delete(oldest.id);
      }
      const body = new C.Body({ mass: RING_MASS, material: ringMaterial, linearDamping: .018, angularDamping: .12, allowSleep: true, sleepSpeedLimit: .07, sleepTimeLimit: .7 });
      // Overlapping beads form a continuous, smoother hollow contact surface.
      // The center stays empty; impulses, gravity and friction do all the work.
      const bead = new C.Sphere(TUBE);
      for (let i = 0; i < BEADS; i++) {
        const angle = i * Math.PI * 2 / BEADS;
        body.addShape(bead, new C.Vec3(Math.cos(angle) * RADIUS, 0, Math.sin(angle) * RADIUS));
      }
      // Cannon's generic compound inertia uses its enclosing box. A torus has
      // more mass near the rim: use the analytic inertia, without changing any
      // contact geometry, so glancing impacts and precession keep ring weight.
      const planarInertia = body.mass * (.5 * RADIUS * RADIUS + .625 * TUBE * TUBE);
      const axialInertia = body.mass * (RADIUS * RADIUS + .75 * TUBE * TUBE);
      body.inertia.set(planarInertia, axialInertia, planarInertia);
      body.invInertia.set(1 / planarInertia, 1 / axialInertia, 1 / planarInertia);
      body.updateInertiaWorld(true);
      const p = input.position || {}, v = input.velocity || {}, s = input.spin || {};
      body.position.set(finite(p.x, 0), finite(p.y, 1), finite(p.z, 4));
      body.velocity.set(finite(v.x, 0), finite(v.y, 0), finite(v.z, 0));
      body.angularVelocity.set(finite(s.x, 0), finite(s.y, 0), finite(s.z, 0));
      if (input.quaternion) {
        const q = input.quaternion;
        body.quaternion.set(finite(q.x, 0), finite(q.y, 0), finite(q.z, 0), finite(q.w, 1));
        body.quaternion.normalize();
      }
      body._lucky = { kind: 'ring', ringId: input.id };
      const r = { id: input.id, body, born: time, settled: false, hitTargetId: null, secretTargetId:null, clearedSpecial:new Set(), contacts: [], contactCount: 0, lastContact: -Infinity, stableTime: 0, candidate: null, impactTimes: new Map(),specialContact:new Map(),descendedSpecial:new Set() };
      rings.set(r.id, r);
      body.addEventListener('collide', function (event) {
        const equation = event.contact, other = event.body;
        if (!equation) return;
        const speed = Math.abs(equation.getImpactVelocityAlongNormal());
        const prior = r.impactTimes.get(other.id);
        if (speed < .15 || prior !== undefined && time - prior < .065) return;
        r.impactTimes.set(other.id, time);
        const localContact = equation.bi === body ? equation.ri : equation.rj;
        const point = body.position.vadd(localContact);
        const label = other._lucky || { kind: 'body' };
        const info = { id: r.id, ringId: r.id, time, with: label.kind, targetId: label.targetId === undefined ? null : label.targetId, impactSpeed: speed, position: vector(point) };
        r.contacts.push(info); r.contactCount++;
        if (r.contacts.length > 24) r.contacts.shift();
        if (typeof options.onContact === 'function') options.onContact(Object.assign({}, info));
      });
      world.addBody(body);
      return getRing(r.id);
    }

    // Test a whole prize cross-section against the real, tilted ring plane.
    // The ring must have descended around the column, not merely be near it.
    const up = new C.Vec3(0, 1, 0), normal = new C.Vec3(), inverse = new C.Quaternion();
    const offset = new C.Vec3(), local = new C.Vec3();
    const targetUp=new C.Vec3(),targetNormal=new C.Vec3(),targetInverse=new C.Quaternion(),targetPoint=new C.Vec3(),worldPoint=new C.Vec3();
    function enclosingSpecial(r){
      const b=r.body;b.quaternion.vmult(up,normal);
      const ny=Math.abs(normal.y),lowestY=b.position.y-RADIUS*Math.sqrt(Math.max(0,1-ny*ny))-TUBE;
      if(normal.y<0)normal.scale(-1,normal);
      b.quaternion.conjugate(inverse);
      for(const t of specialMap.values()){
        const d=t.data,dx=d.x-b.position.x,dz=d.z-b.position.z,distance=Math.hypot(dx,dz);
        if(t.consumed)continue;
        if(distance<INNER+d.headRadius&&lowestY>d.headTop+.025)r.clearedSpecial.add(d.id);
        if(r.clearedSpecial.has(d.id)&&b.velocity.y<-.12&&b.position.y<d.headTop)r.descendedSpecial.add(d.id);
        if(!r.descendedSpecial.has(d.id)||ny<.97||distance>d.centerTolerance||Math.abs(b.position.y-d.neckY)>.06)continue;
        if(time-(r.specialContact.get(d.id)||-Infinity)>FIXED*3&&b.sleepState!==C.Body.SLEEPING)continue;
        let contains=true;
        for(let i=0;i<24;i++){
          const ox=dx+Math.cos(i*Math.PI/12)*d.neckRadius,oz=dz+Math.sin(i*Math.PI/12)*d.neckRadius;
          offset.set(ox,-(normal.x*ox+normal.z*oz)/normal.y,oz);inverse.vmult(offset,local);
          if(Math.hypot(local.x,local.z)>INNER-.008){contains=false;break;}
        }
        if(contains)return t;
      }
      return null;
    }
    function enclosingTarget(r) {
      const b = r.body;
      b.quaternion.vmult(up, normal);
      if (Math.abs(normal.y) < .86 || b.position.y > GROUND_Y + TUBE + .27 || b.position.y < GROUND_Y + TUBE * .5) return null;
      if(normal.y<0)normal.scale(-1,normal);
      b.quaternion.conjugate(inverse);
      for (const t of targetMap.values()) {
        if (t.consumed || t.data.caught) continue;
        t.body.quaternion.vmult(up,targetUp);
        // A toppled prize is not an upright post. A nearby horizontal ring must
        // never score against its old axis-aligned layout envelope.
        if(targetUp.y<.90)continue;
        const dx = t.body.position.x - b.position.x, dz = t.body.position.z - b.position.z;
        if (Math.hypot(dx, dz) > INNER) continue;
        t.body.quaternion.conjugate(targetInverse);
        targetInverse.vmult(normal,targetNormal);
        if(targetNormal.y<.55)continue;
        b.position.vsub(t.body.position,offset);
        const planeDistance=normal.dot(offset),crossingY=planeDistance/targetNormal.y;
        if(crossingY < -t.data.centerY + .004 || crossingY > t.data.height-t.data.centerY - .015)continue;
        let contains = true;
        const count = t.data.shape === 'box' ? 4 : 32;
        for (let i = 0; i < count; i++) {
          const px = t.data.shape === 'box' ? (i < 2 ? -1 : 1) * t.data.halfX : Math.cos(i * Math.PI / 16) * t.data.radius;
          const pz = t.data.shape === 'box' ? (i % 2 ? -1 : 1) * t.data.halfZ : Math.sin(i * Math.PI / 16) * t.data.radius;
          const py=(planeDistance-targetNormal.x*px-targetNormal.z*pz)/targetNormal.y;
          targetPoint.set(px,py,pz);
          t.body.quaternion.vmult(targetPoint,worldPoint);
          worldPoint.vadd(t.body.position,worldPoint);
          worldPoint.vsub(b.position,offset);
          inverse.vmult(offset, local);
          if (Math.hypot(local.x, local.z) > INNER - .008) { contains = false; break; }
        }
        if (contains) return t;
      }
      return null;
    }
    function inspect(r, events) {
      if (r.settled) return;
      const b = r.body, secret = enclosingSpecial(r), hit = secret?null:enclosingTarget(r);
      const relativeX = b.velocity.x - (hit ? hit.body.velocity.x : 0);
      const relativeZ = b.velocity.z - (hit ? hit.body.velocity.z : 0);
      const relativeY = b.velocity.y - (hit ? hit.body.velocity.y : 0);
      const speed = Math.hypot(relativeX, relativeY, relativeZ);
      const angularSpeed = b.angularVelocity.norm();
      const supported = time - r.lastContact <= FIXED * 2.5 || b.sleepState === C.Body.SLEEPING;
      const prizeStable=!hit||(hit.body.velocity.norm()<.06&&hit.body.angularVelocity.norm()<.12);
      const stable = supported && speed < .08 && angularSpeed < .20 && prizeStable;
      const candidate = secret?'secret:'+secret.data.id:hit?'prize:'+hit.data.id:null;
      if (stable && candidate === r.candidate) r.stableTime += FIXED;
      else { r.stableTime = stable ? FIXED : 0; r.candidate = candidate; }
      const sleeping = b.sleepState === C.Body.SLEEPING;
      const enough = stable && r.stableTime >= STABLE_TIME;
      const timeout = time - r.born >= MAX_AGE;
      if (!enough && !(sleeping&&stable&&!hit&&!secret) && !timeout) return;
      // Timeout is always a miss. It never snaps, freezes or reorients a body.
      const accepted = !timeout && hit && enough ? hit : null;
      const acceptedSecret=!timeout&&secret&&enough?secret:null;
      r.settled = true;
      r.hitTargetId = accepted ? accepted.data.id : null;
      r.secretTargetId=acceptedSecret?acceptedSecret.data.id:null;
      if (accepted) freezePrize(accepted);
      if(acceptedSecret)acceptedSecret.consumed=true;
      r.reason = acceptedSecret?'secret-neck-encircled-and-resting':accepted ? 'encircled-and-resting' : timeout ? 'timeout' : Math.abs(b.position.x) > 5.35 || Math.abs(b.position.z) > 4.4 ? 'outside-carpet' : 'resting-outside';
      events.push(Object.assign({ type: 'settled' }, readRing(r)));
    }
    function step(dt) {
      dt = Math.max(0, Math.min(.25, finite(dt, 0)));
      if (!dt) return [];
      const events = [];
      accumulator += dt;
      const integratedTime=Math.min(32,Math.floor((accumulator+1e-10)/FIXED))*FIXED;
      for (const t of targetMap.values()) if (t.body.type === C.Body.KINEMATIC) {
        // At 240/360 Hz there may be no physics tick this render frame. Divide
        // by the actual integration interval, otherwise tracking overshoots.
        if(integratedTime>0)t.body.velocity.set((t.desired.x-t.body.position.x)/integratedTime,0,(t.desired.z-t.body.position.z)/integratedTime);
        if(t.body.velocity.norm2()>1e-10)t.body.wakeUp();
        t.body.angularVelocity.set(0, 0, 0);
      }
      let substeps = 0;
      while (accumulator + 1e-10 >= FIXED && substeps < 32) {
        for (const r of rings.values()) if (r.body.sleepState !== C.Body.SLEEPING) r.body.force.x += r.body.mass * wind;
        world.step(FIXED);
        time += FIXED; accumulator = Math.max(0, accumulator - FIXED); substeps++;
        for (const contact of world.contacts) {
          for (const body of [contact.bi, contact.bj]) {
            const tag = body._lucky;
            if (tag && tag.kind === 'ring') { const r = rings.get(tag.ringId); if (r){r.lastContact=time;const other=contact.bi===body?contact.bj:contact.bi;if(other._lucky?.kind==='special-target')r.specialContact.set(other._lucky.targetId,time);} }
          }
        }
        for (const r of rings.values()) inspect(r, events);
      }
      return events;
    }
    function snapshot() {
      const prizes=Array.from(targetMap.values(),t=>{
        t.body.quaternion.vmult(new C.Vec3(0,-t.data.centerY,0),offset);
        t.body.position.vadd(offset,worldPoint);
        t.body.quaternion.vmult(up,targetUp);
        return {id:t.data.id,typeId:t.data.typeId,position:vector(t.body.position),quaternion:rotation(t.body.quaternion),bottomPosition:vector(worldPoint),velocity:vector(t.body.velocity),angularVelocity:vector(t.body.angularVelocity),mass:t.data.mass,dynamic:t.body.type===C.Body.DYNAMIC,moving:t.data.moving,sleeping:t.body.sleepState===C.Body.SLEEPING,caught:t.data.caught||t.consumed,upright:targetUp.y>=.90,upY:targetUp.y,shapeCount:t.body.shapes.length};
      });
      return {
        time, wind, fixedTimeStep: FIXED, ringRadius: RADIUS, tubeRadius: TUBE,
        groundY: GROUND_Y, targetBottom: TARGET_BOTTOM, ringBeads: BEADS,
        prizes,
        specialTargets:Array.from(specialMap.values(),t=>Object.assign({},t.data,{caught:t.consumed,position:vector(t.body.position)})),
        rings: Array.from(rings.values(), readRing),
        targets: Array.from(targetMap.values(), t => ({ id: t.data.id, x: t.body.position.x, z: t.body.position.z, radius: t.data.radius, height: t.data.height, bottom: TARGET_BOTTOM, shape: t.data.shape, halfX: t.data.halfX, halfZ: t.data.halfZ, moving: t.data.moving, caught: t.data.caught || t.consumed, velocity: vector(t.body.velocity) }))
      };
    }
    const setWind = value => { wind = finite(value, 0); return wind; };
    return { reset, launch, step, snapshot, setTargets, setSpecialTargets, setWind, clear, getRing };
  }
  const api = { create, constants: { ringRadius: RADIUS, tubeRadius: TUBE, innerRadius: INNER, ringMass:RING_MASS, groundY: GROUND_Y, targetBottom: TARGET_BOTTOM, ringBeads: BEADS, fixedTimeStep: FIXED, stableTime: STABLE_TIME, maxAge: MAX_AGE, maxRings: MAX_RINGS } };
  root.LuckyPhysics = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
