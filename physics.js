/* Lucky Loop rigid-body adapter. Original code; Cannon.js 0.6.2 is MIT.
 * Local ring normal is +Y (ring lies in XZ). Rotate Three TorusGeometry by
 * -PI/2 around X ONCE, then copy the body's quaternion directly each frame.
 * Public dt, ages and contact times are seconds; velocities use world units/s.
 */
(function (root) {
  'use strict';
  const RADIUS = .57, TUBE = .055, INNER = RADIUS - TUBE;
  const FIXED = 1 / 120, STABLE_TIME = .35, MAX_AGE = 8, MAX_RINGS = 24;
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
    world.solver.iterations = 16;
    world.solver.tolerance = .00001;
    world.quatNormalizeSkip = 0;
    world.quatNormalizeFast = false;
    const ringMaterial = new C.Material('plastic-ring');
    const tableMaterial = new C.Material('fabric-table');
    const prizeMaterial = new C.Material('solid-prizes');
    const lowerMaterial = new C.Material('lower-floor');
    function contact(a, b, friction, restitution) {
      world.addContactMaterial(new C.ContactMaterial(a, b, {
        friction, restitution, contactEquationStiffness: 1e7,
        contactEquationRelaxation: 3, frictionEquationStiffness: 1e7,
        frictionEquationRelaxation: 3
      }));
    }
    contact(ringMaterial, tableMaterial, .43, .28);
    contact(ringMaterial, prizeMaterial, .34, .24);
    contact(ringMaterial, lowerMaterial, .55, .25);
    contact(ringMaterial, ringMaterial, .30, .22);
    const table = new C.Body({ mass: 0, material: tableMaterial });
    table.addShape(new C.Box(new C.Vec3(5.35, .13, 4.4)));
    table.position.set(0, .055 - .13, 0);
    table._lucky = { kind: 'table' };
    world.addBody(table);
    const lower = new C.Body({ mass: 0, material: lowerMaterial });
    lower.addShape(new C.Plane());
    lower.quaternion.setFromAxisAngle(new C.Vec3(1, 0, 0), -Math.PI / 2);
    lower.position.y = -.8;
    lower._lucky = { kind: 'lower-floor' };
    world.addBody(lower);
    const yCylinder = new C.Quaternion();
    yCylinder.setFromAxisAngle(new C.Vec3(1, 0, 0), -Math.PI / 2);
    const rings = new Map(), targetMap = new Map();
    let time = 0, accumulator = 0, wind = 0;

    function normalizedTarget(t) {
      const radius = Math.max(.04, finite(t.radius, .28));
      const height = Math.max(.08, finite(t.height, .72));
      const shape = t.shape && typeof t.shape === 'object' ? t.shape : { type: t.shape || 'cylinder' };
      const halves = shape.halfExtents || t.halfExtents || {};
      return {
        id: t.id, x: finite(t.x, 0), z: finite(t.z, 0), radius, height,
        caught: !!t.caught, moving: !!t.moving,
        shape: shape.type === 'box' ? 'box' : 'cylinder',
        halfX: Math.max(.02, finite(halves.x, finite(shape.width, finite(t.width, radius * 1.4)) / 2)),
        halfZ: Math.max(.02, finite(halves.z, finite(shape.depth, finite(t.depth, radius * 1.4)) / 2))
      };
    }
    function makeTarget(input) {
      const t = normalizedTarget(input);
      const body = new C.Body({ mass: 0, type: t.moving ? C.Body.KINEMATIC : C.Body.STATIC, material: prizeMaterial });
      body.addShape(new C.Cylinder(.63, .63, .19, 20), new C.Vec3(0, .13, 0), yCylinder);
      const prizeShape = t.shape === 'box'
        ? new C.Box(new C.Vec3(t.halfX, t.height / 2, t.halfZ))
        : new C.Cylinder(t.radius, t.radius, t.height, 16);
      body.addShape(prizeShape, new C.Vec3(0, .25 + t.height / 2, 0), t.shape === 'box' ? undefined : yCylinder);
      body.position.set(t.x, 0, t.z);
      body._lucky = { kind: 'target', targetId: t.id };
      world.addBody(body);
      const record = { data: t, body, desired: new C.Vec3(t.x, 0, t.z), consumed: !!t.caught };
      targetMap.set(t.id, record);
      return record;
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
        if (next.caught) t.consumed = true;
        t.desired.set(next.x, 0, next.z);
        if (t.body.type === C.Body.STATIC && next.moving) t.body.type = C.Body.KINEMATIC;
        if (t.body.type === C.Body.STATIC) {
          t.body.position.copy(t.desired);
          t.body.aabbNeedsUpdate = true;
        }
      }
      for (const [id, t] of targetMap) if (!present.has(id)) { world.removeBody(t.body); targetMap.delete(id); }
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
      setTargets(list || []);
    }
    function readRing(r) {
      return {
        id: r.id, position: vector(r.body.position), quaternion: rotation(r.body.quaternion),
        velocity: vector(r.body.velocity), angularVelocity: vector(r.body.angularVelocity),
        sleeping: r.body.sleepState === C.Body.SLEEPING, settled: r.settled,
        hitTargetId: r.hitTargetId, age: time - r.born, stableTime: r.stableTime,
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
      const body = new C.Body({ mass: .12, material: ringMaterial, linearDamping: .015, angularDamping: .15, allowSleep: true, sleepSpeedLimit: .12, sleepTimeLimit: .5 });
      // A hollow compound ring; no center disk and no post-impact attraction.
      const bead = new C.Sphere(TUBE);
      for (let i = 0; i < 36; i++) {
        const angle = i * Math.PI / 18;
        body.addShape(bead, new C.Vec3(Math.cos(angle) * RADIUS, 0, Math.sin(angle) * RADIUS));
      }
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
      const r = { id: input.id, body, born: time, settled: false, hitTargetId: null, contacts: [], contactCount: 0, lastContact: -Infinity, stableTime: 0, candidate: null, impactTimes: new Map() };
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
    function enclosingTarget(r) {
      const b = r.body;
      b.quaternion.vmult(up, normal);
      if (Math.abs(normal.y) < .72 || b.position.y > .65 || b.position.y < .18) return null;
      b.quaternion.conjugate(inverse);
      for (const t of targetMap.values()) {
        if (t.consumed || t.data.caught) continue;
        const dx = t.body.position.x - b.position.x, dz = t.body.position.z - b.position.z;
        if (Math.hypot(dx, dz) > INNER) continue;
        const crossingY = b.position.y - (normal.x * dx + normal.z * dz) / normal.y;
        if (crossingY < .215 || crossingY > .25 + t.data.height - .015) continue;
        let contains = true;
        const count = t.data.shape === 'box' ? 4 : 16;
        for (let i = 0; i < count; i++) {
          const px = t.data.shape === 'box' ? (i < 2 ? -1 : 1) * t.data.halfX : Math.cos(i * Math.PI / 8) * t.data.radius;
          const pz = t.data.shape === 'box' ? (i % 2 ? -1 : 1) * t.data.halfZ : Math.sin(i * Math.PI / 8) * t.data.radius;
          const ox = dx + px, oz = dz + pz;
          offset.set(ox, -(normal.x * ox + normal.z * oz) / normal.y, oz);
          inverse.vmult(offset, local);
          if (Math.hypot(local.x, local.z) > INNER - .008) { contains = false; break; }
        }
        if (contains) return t;
      }
      return null;
    }
    function inspect(r, events) {
      if (r.settled) return;
      const b = r.body, hit = enclosingTarget(r);
      const relativeX = b.velocity.x - (hit ? hit.body.velocity.x : 0);
      const relativeZ = b.velocity.z - (hit ? hit.body.velocity.z : 0);
      const speed = Math.hypot(relativeX, b.velocity.y, relativeZ);
      const angularSpeed = b.angularVelocity.norm();
      const supported = time - r.lastContact <= FIXED * 2.5 || b.sleepState === C.Body.SLEEPING;
      const stable = supported && speed < .19 && angularSpeed < .65;
      const candidate = hit ? hit.data.id : null;
      if (stable && candidate === r.candidate) r.stableTime += FIXED;
      else { r.stableTime = stable ? FIXED : 0; r.candidate = candidate; }
      const sleeping = b.sleepState === C.Body.SLEEPING;
      const enough = stable && r.stableTime >= STABLE_TIME;
      const timeout = time - r.born >= MAX_AGE;
      if (!enough && !sleeping && !timeout) return;
      // Timeout is always a miss. It never snaps, freezes or reorients a body.
      const accepted = !timeout && hit && (enough || sleeping) ? hit : null;
      r.settled = true;
      r.hitTargetId = accepted ? accepted.data.id : null;
      if (accepted) accepted.consumed = true;
      r.reason = accepted ? 'encircled-and-resting' : timeout ? 'timeout' : b.position.y < -.25 ? 'fell-off-table' : 'resting-outside';
      events.push(Object.assign({ type: 'settled' }, readRing(r)));
    }
    function step(dt) {
      dt = Math.max(0, Math.min(.25, finite(dt, 0)));
      if (!dt) return [];
      const events = [];
      for (const t of targetMap.values()) if (t.body.type === C.Body.KINEMATIC) {
        t.body.velocity.set((t.desired.x - t.body.position.x) / dt, 0, (t.desired.z - t.body.position.z) / dt);
        t.body.angularVelocity.set(0, 0, 0);
      }
      accumulator += dt;
      let substeps = 0;
      while (accumulator + 1e-10 >= FIXED && substeps < 32) {
        for (const r of rings.values()) if (r.body.sleepState !== C.Body.SLEEPING) r.body.force.x += r.body.mass * wind;
        world.step(FIXED);
        time += FIXED; accumulator = Math.max(0, accumulator - FIXED); substeps++;
        for (const contact of world.contacts) {
          for (const body of [contact.bi, contact.bj]) {
            const tag = body._lucky;
            if (tag && tag.kind === 'ring') { const r = rings.get(tag.ringId); if (r) r.lastContact = time; }
          }
        }
        for (const r of rings.values()) inspect(r, events);
      }
      return events;
    }
    function snapshot() {
      return {
        time, wind, fixedTimeStep: FIXED, ringRadius: RADIUS, tubeRadius: TUBE,
        rings: Array.from(rings.values(), readRing),
        targets: Array.from(targetMap.values(), t => ({ id: t.data.id, x: t.body.position.x, z: t.body.position.z, radius: t.data.radius, height: t.data.height, moving: t.data.moving, caught: t.data.caught || t.consumed, velocity: vector(t.body.velocity) }))
      };
    }
    const setWind = value => { wind = finite(value, 0); return wind; };
    return { reset, launch, step, snapshot, setTargets, setWind, clear, getRing };
  }
  const api = { create, constants: { ringRadius: RADIUS, tubeRadius: TUBE, innerRadius: INNER, fixedTimeStep: FIXED, stableTime: STABLE_TIME, maxAge: MAX_AGE, maxRings: MAX_RINGS } };
  root.LuckyPhysics = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
