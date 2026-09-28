/* Hidden NPC target alignment and foreground ring occlusion only.
 * All ring positions/quaternions and success decisions remain physics-owned. */
(function (root) {
  'use strict';
  const number = (value, fallback) => Number.isFinite(value) ? value : fallback;
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const copy = value => JSON.parse(JSON.stringify(value));

  function create(options = {}) {
    const { camera, THREE: T, physics, npcs } = options;
    let mount = options.mount;
    if (typeof mount === 'string') mount = document.querySelector(mount);
    mount = mount || document.querySelector('#scene')?.parentElement;
    if (!mount || !camera || !T || !physics?.setSpecialTargets || !npcs?.getHeadAnchors) throw new Error('LuckySecretVisuals requires mount, camera, THREE, physics and NPC anchors.');
    const previous = mount.querySelector('#secret-ring-overlay');
    if (previous?._luckySecretVisuals) return previous._luckySecretVisuals;

    const canvas = document.createElement('canvas');
    canvas.id = 'secret-ring-overlay';
    canvas.setAttribute('aria-hidden', 'true');
    Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', zIndex: '4', pointerEvents: 'none' });
    mount.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const calibration = options.calibration || {};
    let targets = [], targetSignature = '', destroyed = false;
    let cssWidth = 0, cssHeight = 0, pixelRatio = 1;
    const tubeRadius = number(root.LuckyPhysics?.constants?.tubeRadius, 0.045);
    const ringRadius = number(root.LuckyPhysics?.constants?.ringRadius, 0.64);
    const cameraRight = new T.Vector3();
    const q = new T.Quaternion();

    function projectToPlane(normalized, z) {
      if (!normalized || !Number.isFinite(normalized.x) || !Number.isFinite(normalized.y)) return null;
      const x = normalized.x * 2 - 1, y = 1 - normalized.y * 2;
      const near = new T.Vector3(x, y, -1).unproject(camera);
      const far = new T.Vector3(x, y, 1).unproject(camera);
      const direction = far.sub(near);
      if (Math.abs(direction.z) < 1e-8) return null;
      const distance = (z - near.z) / direction.z;
      if (!Number.isFinite(distance) || distance < 0) return null;
      return near.addScaledVector(direction, distance);
    }

    function worldWidth(region, z) {
      const a = projectToPlane({ x: region.left, y: region.center.y }, z);
      const b = projectToPlane({ x: region.right, y: region.center.y }, z);
      return a && b ? Math.abs(b.x - a.x) : 0;
    }

    function resizeCanvas() {
      const rect = mount.getBoundingClientRect();
      cssWidth = rect.width; cssHeight = rect.height;
      pixelRatio = clamp(number(root.devicePixelRatio, 1), 1, 2);
      const width = Math.max(1, Math.round(cssWidth * pixelRatio));
      const height = Math.max(1, Math.round(cssHeight * pixelRatio));
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    }

    function syncTargets() {
      if (destroyed) return [];
      camera.updateMatrixWorld(true);
      const anchors = npcs.getHeadAnchors({ restPose: true });
      const next = [];
      for (const anchor of anchors) {
        if (!anchor.valid || !anchor.head || !anchor.neck) continue;
        const config = calibration[anchor.hostId] || {};
        const z = number(config.z, number(options.depth, 3.3));
        const observedHead = projectToPlane(anchor.head.center, z);
        const observedNeck = projectToPlane(anchor.neck.center, z);
        const observedBase = projectToPlane(anchor.neckBase || anchor.neck.center, z);
        const observedShoulders = projectToPlane(anchor.shoulders?.center || anchor.neck.center, z);
        if (!observedHead || !observedNeck || !observedBase) continue;
        const headRadius = clamp(number(config.headRadius, worldWidth(anchor.head, z) / 2), 0.08, number(options.maxHeadRadius, 0.44));
        const neckRadius = clamp(number(config.neckRadius, worldWidth(anchor.neck, z) / 2), 0.05, 0.20);
        const neckY = number(config.neckY, observedBase.y + tubeRadius) + number(config.yOffset, 0);
        const neckHeight = Math.max(0.12, number(config.neckHeight, observedHead.y - (neckY - tubeRadius) - headRadius));
        const headCenterY = neckY - tubeRadius + neckHeight + headRadius;
        next.push({
          id: anchor.hostId, hostId: anchor.hostId,
          x: number(config.x, observedNeck.x) + number(config.xOffset, 0), z,
          neckY, neckRadius, neckHeight, headRadius,
          shoulderHalfWidth: Math.max(0.75, number(config.shoulderHalfWidth, number(options.shoulderHalfWidth, 0.75))),
          shoulderHalfDepth: Math.max(0.10, number(config.shoulderHalfDepth, number(options.shoulderHalfDepth, 0.26))),
          centerTolerance: clamp(number(config.centerTolerance, 0.11), 0.06, 0.12),
          shoulderTop: neckY - tubeRadius, headCenterY, headTop: headCenterY + headRadius,
          observedHeadCenter: { x: observedHead.x, y: observedHead.y, z },
          observedNeckBase: { x: observedBase.x, y: observedBase.y, z },
          observedShoulders: observedShoulders ? { x: observedShoulders.x, y: observedShoulders.y, z } : null,
          headHeightMismatch: headCenterY - observedHead.y
        });
      }
      const physical = next.map(({ id, x, z, neckY, neckRadius, neckHeight, headRadius, shoulderHalfWidth, shoulderHalfDepth, centerTolerance }) =>
        ({ id, x, z, neckY, neckRadius, neckHeight, headRadius, shoulderHalfWidth, shoulderHalfDepth, centerTolerance }));
      const signature = JSON.stringify(physical);
      targets = next;
      if (signature !== targetSignature) {
        physics.setSpecialTargets(physical);
        targetSignature = signature;
      }
      resizeCanvas();
      return getTargets();
    }

    function screen(world) {
      const p = world.clone().project(camera);
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || p.z < -1 || p.z > 1) return null;
      return { x: (p.x + 1) * cssWidth / 2, y: (1 - p.y) * cssHeight / 2 };
    }

    function projectedDiameter(point, radius) {
      const a = screen(point.clone().addScaledVector(cameraRight, radius));
      const b = screen(point.clone().addScaledVector(cameraRight, -radius));
      return a && b ? Math.max(0.7, Math.hypot(a.x - b.x, a.y - b.y)) : 0;
    }

    function strokeSegment(a, b, diameter) {
      const pa = screen(a), pb = screen(b);
      if (!pa || !pb || !diameter) return;
      // A dark outer edge and restrained highlight reproduce a round gold tube.
      // Both endpoints come only from the current rigid-body pose.
      ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y);
      ctx.lineWidth = diameter; ctx.strokeStyle = '#926113'; ctx.stroke();
      ctx.lineWidth = diameter * 0.78; ctx.strokeStyle = '#edb824'; ctx.stroke();
      ctx.lineWidth = diameter * 0.24; ctx.strokeStyle = '#ffe17b'; ctx.stroke();
    }

    function update(snapshot) {
      if (destroyed) return;
      // Synchronization is cheap when unchanged; the signature prevents body
      // replacement each frame. It also handles initially unloaded NPC images.
      syncTargets();
      ctx.clearRect(0, 0, cssWidth, cssHeight);
      canvas.dataset.rings = '0';
      if (!cssWidth || !cssHeight || !targets.length) return;
      const state = snapshot?.physics || snapshot || {};
      const rings = state.rings || [];
      const radius = number(state.ringRadius, ringRadius);
      const tube = number(state.tubeRadius, tubeRadius);
      cameraRight.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      let drawn = 0;
      for (const ring of rings) {
        if (!ring.position || !ring.quaternion) continue;
        const position = new T.Vector3(ring.position.x, ring.position.y, ring.position.z);
        const target = targets.filter(item => Math.abs(position.x - item.x) < 1.3 && Math.abs(position.z - item.z) < 1.3 && position.y > item.neckY - 0.5)
          .sort((a, b) => Math.hypot(position.x - a.x, position.z - a.z) - Math.hypot(position.x - b.x, position.z - b.z))[0];
        if (!target) continue;
        q.set(ring.quaternion.x, ring.quaternion.y, ring.quaternion.z, ring.quaternion.w).normalize();
        const pointAt = angle => new T.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius).applyQuaternion(q).add(position);
        const samples = 96;
        let previousPoint = pointAt(0), hasFront = false;
        for (let i = 1; i <= samples; i++) {
          const currentPoint = pointAt(i / samples * Math.PI * 2);
          let a = previousPoint, b = currentPoint;
          const aFront = a.z > target.z, bFront = b.z > target.z;
          if (aFront || bFront) {
            if (aFront !== bFront) {
              const fraction = clamp((target.z - a.z) / (b.z - a.z), 0, 1);
              const intersection = a.clone().lerp(b, fraction);
              if (aFront) b = intersection; else a = intersection;
            }
            const midpoint = a.clone().add(b).multiplyScalar(0.5);
            strokeSegment(a, b, projectedDiameter(midpoint, tube));
            hasFront = true;
          }
          previousPoint = currentPoint;
        }
        if (hasFront) drawn++;
      }
      canvas.dataset.rings = String(drawn);
    }

    function getTargets() { return copy(targets); }
    function destroy() {
      if (destroyed) return;
      destroyed = true;
      const owned = new Set(targets.map(target => target.id));
      const others = (physics.snapshot?.().specialTargets || []).filter(target => !owned.has(target.id));
      physics.setSpecialTargets(others);
      targets = [];
      canvas.remove();
    }

    const api = { syncTargets, update, getTargets, destroy };
    canvas._luckySecretVisuals = api;
    syncTargets();
    return api;
  }

  root.LuckySecretVisuals = Object.freeze({ create, version: '1.0.0' });
})(typeof window !== 'undefined' ? window : globalThis);
