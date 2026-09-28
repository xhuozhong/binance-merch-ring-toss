/* Photo-front prize volumes. Alpha outlines provide thickness, not unseen views. */
(function (root) {
  'use strict';
  const caches = new WeakMap();
  const ALPHA = 31, MAX_SAMPLE = 160;

  function cacheFor(THREE) {
    let cache = caches.get(THREE);
    if (!cache) { cache = { images: new Map(), materials: new Map() }; caches.set(THREE, cache); }
    return cache;
  }

  function shared(resource) {
    resource.userData = resource.userData || {};
    resource.userData.shared = true;
    resource.userData.owner = 'LuckyPrizeVisuals';
    return resource;
  }

  function area(points) {
    let sum = 0;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) sum += points[j].x * points[i].y - points[i].x * points[j].y;
    return sum * 0.5;
  }

  function distanceToSegment(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const length = dx * dx + dy * dy;
    const t = length ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length)) : 0;
    return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
  }

  function simplifyPath(points, epsilon) {
    if (points.length < 3) return points;
    let furthest = 0, at = 0;
    for (let i = 1; i < points.length - 1; i++) {
      const d = distanceToSegment(points[i], points[0], points[points.length - 1]);
      if (d > furthest) { furthest = d; at = i; }
    }
    if (furthest <= epsilon) return [points[0], points[points.length - 1]];
    return simplifyPath(points.slice(0, at + 1), epsilon).slice(0, -1).concat(simplifyPath(points.slice(at), epsilon));
  }

  function simplifyLoop(points) {
    let far = 1, distance = 0;
    for (let i = 1; i < points.length; i++) {
      const d = Math.hypot(points[i].x - points[0].x, points[i].y - points[0].y);
      if (d > distance) { distance = d; far = i; }
    }
    const a = simplifyPath(points.slice(0, far + 1), 0.42);
    const b = simplifyPath(points.slice(far).concat(points[0]), 0.42);
    const result = a.slice(0, -1).concat(b.slice(0, -1));
    return result.length >= 3 ? result : points;
  }

  function contains(p, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const a = polygon[i], b = polygon[j];
      if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
    }
    return inside;
  }

  function traceAlpha(image) {
    const scale = Math.min(1, MAX_SAMPLE / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(2, Math.round(image.naturalWidth * scale));
    const height = Math.max(2, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(image, 0, 0, width, height);
    const pixels = ctx.getImageData(0, 0, width, height).data;
    const solid = (x, y) => x >= 0 && x < width && y >= 0 && y < height && pixels[(y * width + x) * 4 + 3] > ALPHA;
    const edges = [], starts = new Map();
    const key = (x, y) => y * (width + 1) + x;
    function edge(x0, y0, x1, y1, direction) {
      const index = edges.length;
      edges.push({ x: x0, y: y0, end: key(x1, y1), start: key(x0, y0), direction, used: false });
      const list = starts.get(key(x0, y0)) || [];
      list.push(index); starts.set(key(x0, y0), list);
    }
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (solid(x, y)) {
      if (!solid(x, y - 1)) edge(x, y, x + 1, y, 0);
      if (!solid(x + 1, y)) edge(x + 1, y, x + 1, y + 1, 1);
      if (!solid(x, y + 1)) edge(x + 1, y + 1, x, y + 1, 2);
      if (!solid(x - 1, y)) edge(x, y + 1, x, y, 3);
    }
    const loops = [];
    for (let start = 0; start < edges.length; start++) {
      if (edges[start].used) continue;
      const points = [];
      let current = start, closed = false;
      for (let guard = 0; guard <= edges.length; guard++) {
        const e = edges[current];
        if (e.used) break;
        e.used = true; points.push({ x: e.x, y: e.y });
        if (e.end === edges[start].start) { closed = true; break; }
        const candidates = (starts.get(e.end) || []).filter(i => !edges[i].used);
        if (!candidates.length) break;
        // At diagonal contacts, turn right to preserve separate alpha islands.
        const priority = [1, 0, 3, 2];
        candidates.sort((a, b) => priority.indexOf((edges[a].direction - e.direction + 4) % 4) - priority.indexOf((edges[b].direction - e.direction + 4) % 4));
        current = candidates[0];
      }
      const signedArea = area(points);
      if (closed && points.length >= 3 && Math.abs(signedArea) >= 2) loops.push({ points: simplifyLoop(points), area: signedArea });
    }
    const outlines = loops.filter(loop => loop.area > 0).map(loop => ({ ...loop, holes: [] }));
    for (const hole of loops.filter(loop => loop.area < 0)) {
      const parent = outlines.filter(outline => contains(hole.points[0], outline.points)).sort((a, b) => a.area - b.area)[0];
      if (parent) parent.holes.push(hole.points);
    }
    if (!outlines.length) throw new Error('Prize photo has no usable alpha silhouette.');
    return { outlines, width, height, sampleSize: [width, height] };
  }

  function imageRecord(THREE, uri) {
    const cache = cacheFor(THREE);
    if (cache.images.has(uri)) return cache.images.get(uri);
    const image = new Image();
    const texture = shared(new THREE.Texture(image));
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    const record = { texture, image, error: null };
    record.material = shared(new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: 0.12, depthWrite: true, side: THREE.DoubleSide, toneMapped: false }));
    record.promise = new Promise(resolve => {
      image.onload = () => {
        texture.needsUpdate = true;
        try { record.alpha = traceAlpha(image); }
        catch (error) { record.error = error.message; }
        resolve(record);
      };
      image.onerror = () => { record.error = 'Prize photo failed to load.'; resolve(record); };
    });
    cache.images.set(uri, record);
    image.src = uri;
    return record;
  }

  function sideMaterials(THREE, type) {
    const cache = cacheFor(THREE), id = type.id || '';
    const goldItems = ['sneaker', 'hoodie', 'socks', 'tote', 'towel', 'tennis', 'yellowcase'];
    const color = goldItems.includes(id) ? 0xe5ab18 : 0x17191c;
    const material = (key, value, roughness) => {
      if (!cache.materials.has(key)) cache.materials.set(key, shared(new THREE.MeshStandardMaterial({ color: value, roughness, metalness: id === 'bottle' || id === 'suitcase' ? 0.12 : 0.01, side: THREE.DoubleSide })));
      return cache.materials.get(key);
    };
    return [material(`${id}:body`, color, id === 'bottle' ? 0.4 : 0.78), material('sole:cream', 0xe8e5da, 0.82), material('trim:yellow', 0xf0b90b, 0.63)];
  }

  function create(type, THREE, imageDataURI) {
    if (!type || !THREE || !imageDataURI) throw new Error('LuckyPrizeVisuals.create requires a type, THREE and image data URI.');
    const width = Math.max(0.02, type.halfExtents.x * 2);
    const height = Math.max(0.02, type.height);
    const halfZ = Math.max(0.005, type.halfExtents.z);
    const group = new THREE.Group();
    group.name = `PhotoVolume:${type.id}`;
    group.userData.collider = { shape: type.shape, radius: type.radius, height, halfExtents: { x: width / 2, y: height / 2, z: halfZ } };
    group.userData.merchId = type.id;
    group.userData.photoVolume = { ready: false, fallback: false, thickness: halfZ * 2, source: 'alpha silhouette extrusion; single front photo' };
    let disposed = false, replacingGeometry = false;
    const record = imageRecord(THREE, imageDataURI);

    function watchGeometry(geometry) {
      geometry.addEventListener('dispose', () => { if (!replacingGeometry) disposed = true; });
      return geometry;
    }
    // Visible as soon as its texture loads; replaced in place by the exact front
    // silhouette after alpha sampling. Geometry keeps the same photo UV mapping.
    const initial = watchGeometry(new THREE.PlaneGeometry(width, height));
    initial.translate(0, height / 2, 0);
    const front = new THREE.Mesh(initial, record.material);
    front.name = 'PrizePhotoFront'; front.position.z = halfZ;
    group.add(front);
    group.userData.dispose = () => { disposed = true; };
    group.userData.isDisposed = () => disposed;

    record.promise.then(loaded => {
      if (disposed) return;
      if (!loaded.alpha) {
        group.userData.photoVolume.fallback = true;
        group.userData.photoVolume.error = loaded.error;
        return;
      }
      const alpha = loaded.alpha;
      const worldPoint = point => new THREE.Vector2((point.x / alpha.width - 0.5) * width, (1 - point.y / alpha.height) * height);
      const shapes = [], contours = [];
      for (const outline of alpha.outlines) {
        const contour = outline.points.map(worldPoint);
        const shape = new THREE.Shape(contour);
        contours.push(contour);
        for (const hole of outline.holes) {
          const points = hole.map(worldPoint);
          shape.holes.push(new THREE.Path(points)); contours.push(points);
        }
        shapes.push(shape);
      }

      const frontGeometry = new THREE.ShapeGeometry(shapes);
      const vertices = frontGeometry.getAttribute('position');
      const uv = frontGeometry.getAttribute('uv');
      for (let i = 0; i < vertices.count; i++) uv.setXY(i, vertices.getX(i) / width + 0.5, vertices.getY(i) / height);
      uv.needsUpdate = true;
      watchGeometry(frontGeometry);
      replacingGeometry = true;
      front.geometry.dispose();
      replacingGeometry = false;
      front.geometry = frontGeometry;

      const materials = sideMaterials(THREE, type);
      if (type.id === 'hat' || type.id === 'bottle') {
        // Rotational objects must not inherit a long rectangular extrusion of
        // their front silhouette. Keep the original photo at the front tangent,
        // while an actual rounded body supplies the side and rear appearance.
        const radius = Math.min(width / 2, halfZ);
        const addVolume = (geometry, material, name) => {
          const mesh = new THREE.Mesh(watchGeometry(geometry), material);
          mesh.name = name;
          group.add(mesh);
          return mesh;
        };
        if (type.id === 'hat') {
          // Shallow circular brim, sloping crown and rounded fabric top.
          const profile = [
            [0, 0.014], [0.88, 0.006], [0.99, 0.026], [1.00, 0.050],
            [0.87, 0.086], [0.79, 0.15], [0.755, 0.23], [0.68, 0.76],
            [0.65, 0.86], [0.58, 0.92], [0.38, 0.94], [0, 0.94]
          ].map(([r, y]) => new THREE.Vector2(r * radius, y * height));
          addVolume(new THREE.LatheGeometry(profile, 56), materials[0], 'HatRoundedCrownAndBrim');
          const trim = addVolume(new THREE.TorusGeometry(radius * 0.985, height * 0.007, 8, 64), materials[2], 'HatGoldBrimEdge');
          trim.rotation.x = Math.PI / 2;
          trim.position.y = height * 0.042;
        } else {
          // Body, tapered shoulder, narrow neck and cap are one lathed shell.
          // The top handle remains an open ring, not a filled cylinder cap.
          const profile = [
            [0, 0.007], [0.78, 0.004], [0.93, 0.020], [0.98, 0.052],
            [0.98, 0.585], [0.95, 0.640], [0.84, 0.687], [0.62, 0.730],
            [0.59, 0.754], [0.59, 0.785], [0.75, 0.788], [0.75, 0.865],
            [0.70, 0.890], [0, 0.890]
          ].map(([r, y]) => new THREE.Vector2(r * radius, y * height));
          addVolume(new THREE.LatheGeometry(profile, 48), materials[0], 'BottleRoundedBodyNeckAndCap');
          const handleRadius = height * 0.052;
          const handle = addVolume(new THREE.TorusGeometry(handleRadius, height * 0.010, 8, 32), materials[0], 'BottleOpenCarryLoop');
          handle.scale.x = radius * 0.64 / (handleRadius + height * 0.010);
          handle.position.y = height * 0.930;
        }
        group.userData.photoVolume.ready = true;
        group.userData.photoVolume.geometryStyle = 'rotational body behind original photo';
        group.userData.photoVolume.contours = contours.length;
        group.userData.photoVolume.sampleSize = alpha.sampleSize;
        group.userData.photoVolume.sideTriangles = group.children.slice(1).reduce((sum, mesh) => sum + (mesh.geometry.index ? mesh.geometry.index.count : mesh.geometry.getAttribute('position').count) / 3, 0);
        group.updateMatrixWorld(true);
        return;
      }
      const backGeometry = watchGeometry(frontGeometry.clone());
      const back = new THREE.Mesh(backGeometry, materials[0]);
      back.name = 'PrizeSolidBack'; back.position.z = -halfZ;
      // Double-sided solid caps deliberately avoid mirroring the front photo.
      group.add(back);

      const positions = [], normals = [], uvs = [], indexBuckets = [[], [], []];
      for (const points of contours) for (let i = 0; i < points.length; i++) {
        const a = points[i], b = points[(i + 1) % points.length];
        const length = Math.hypot(b.x - a.x, b.y - a.y);
        if (length < 1e-7) continue;
        const vertex = positions.length / 3;
        positions.push(a.x, a.y, halfZ, b.x, b.y, halfZ, b.x, b.y, -halfZ, a.x, a.y, -halfZ);
        const nx = -(b.y - a.y) / length, ny = (b.x - a.x) / length;
        for (let k = 0; k < 4; k++) normals.push(nx, ny, 0);
        uvs.push(0, 1, 1, 1, 1, 0, 0, 0);
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        let material = type.id === 'sneaker' && my < height * 0.20 ? 1 : 0;
        if (type.id === 'gift' && Math.abs(mx) < width * 0.10) material = 2;
        if (type.id === 'suitcase' && mx < -width * 0.40) material = 2;
        indexBuckets[material].push(vertex, vertex + 1, vertex + 2, vertex, vertex + 2, vertex + 3);
      }
      const sideGeometry = watchGeometry(new THREE.BufferGeometry());
      sideGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      sideGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      sideGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      const indices = indexBuckets.flat();
      sideGeometry.setIndex(indices);
      let groupStart = 0;
      indexBuckets.forEach((bucket, material) => {
        if (bucket.length) sideGeometry.addGroup(groupStart, bucket.length, material);
        groupStart += bucket.length;
      });
      sideGeometry.computeBoundingSphere();
      const sides = new THREE.Mesh(sideGeometry, materials);
      sides.name = 'PrizeSilhouetteSides';
      group.add(sides);
      // No additional scale and no attached floor shadow: game owns both.
      group.userData.photoVolume.ready = true;
      group.userData.photoVolume.contours = contours.length;
      group.userData.photoVolume.sampleSize = alpha.sampleSize;
      group.userData.photoVolume.sideTriangles = indices.length / 3;
      group.updateMatrixWorld(true);
    }).catch(error => {
      if (disposed) return;
      group.userData.photoVolume.fallback = true;
      group.userData.photoVolume.error = String(error && error.message || error);
    });

    return group;
  }

  root.LuckyPrizeVisuals = Object.freeze({ create, version: '1.0.0' });
})(typeof window !== 'undefined' ? window : globalThis);
