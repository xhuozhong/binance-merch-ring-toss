/* Fixed-position portrait NPCs. A lightweight 2D deformation mesh, not a Cubism rig. */
(function () {
  'use strict';

  const scriptURL = document.currentScript && document.currentScript.src;
  const assetURL = name => new URL(`${name}`, scriptURL || document.baseURI).href;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;
  const SECRET_LINE = '恭喜你获得隐藏神秘大奖，欢迎加入币安天使';
  const definitions = [
    {
      id: 'male', label: '左侧摊主', image: 'npc-male.png', offset: 0.2,
      // Original PNG pixels: scalp/ears/chin, neck and shoulder support region.
      // The wider black shirt/raised arm is not part of the head target.
      headCalibration: {
        sourceWidth: 565, sourceHeight: 1000,
        head: { x: 166, y: 7, width: 134, height: 154 },
        neck: { x: 195, y: 150, width: 53, height: 43 },
        shoulders: { x: 112, y: 185, width: 202, height: 58 },
        neckBase: { x: 219, y: 190 }
      },
      // Calibrated to the 565 x 1000 transparent portrait; masks stay inside lenses.
      eyes: [
        { x: 0.4106, y: 0.0808, w: 0.0407, h: 0.0080, angle: 0.10, color: '#dc9a74', lowerColor: '#bc7b59', lineColor: '#624332' },
        { x: 0.4805, y: 0.0877, w: 0.0340, h: 0.0074, angle: 0.16, color: '#cb8c68', lowerColor: '#ac7052', lineColor: '#624332' }
      ],
      talk: ['来，挑一件喜欢的周边。', '手放轻松，慢慢找到自己的手感。', '别急，每一圈都有新的机会。'],
      hit: ['漂亮！这一圈稳稳当当。', '好眼力，心动周边圈到手啦！', '有手感了，接着来！'],
      miss: ['差一点，下一圈再试试。', '看准落点，再来一圈。', '没关系，先熟悉圈的分量。']
    },
    {
      id: 'female', label: '右侧摊主', image: 'npc-female.png', offset: 2.1,
      // Scalp/face only: the long hair flowing to the shoulder is excluded.
      headCalibration: {
        sourceWidth: 464, sourceHeight: 972,
        head: { x: 209, y: 8, width: 137, height: 153 },
        neck: { x: 263, y: 151, width: 53, height: 47 },
        shoulders: { x: 198, y: 188, width: 211, height: 55 },
        neckBase: { x: 288, y: 196 }
      },
      // Calibrated to the 464 x 972 transparent portrait, following the head tilt.
      eyes: [
        { x: 0.5948, y: 0.0954, w: 0.0496, h: 0.0090, angle: -0.18, color: '#edb58f', lowerColor: '#dda580', lineColor: '#623c2c' },
        { x: 0.6730, y: 0.0851, w: 0.0399, h: 0.0090, angle: -0.28, color: '#e7ac84', lowerColor: '#d89b75', lineColor: '#653e2c' }
      ],
      talk: ['欢迎来逛，喜欢哪一件？', '小小一个圈，圈住好心情。', '慢慢来，夜市才刚开始。'],
      hit: ['套中啦！好东西被你圈走了。', '这一圈真漂亮！', '收好这份小惊喜！'],
      miss: ['再试一次，好运还在后面。', '别着急，放松一点就好。', '下一圈，说不定就中了。']
    }
  ];

  function create(options = {}) {
    let mount = options.mount;
    if (typeof mount === 'string') mount = document.querySelector(mount);
    mount = mount || document.querySelector('#scene')?.parentElement;
    if (!mount) throw new Error('LuckyNPC requires the scene viewport as its mount.');
    const existing = mount.querySelector('#npc-layer');
    if (existing && existing._luckyNPC) return existing._luckyNPC;

    const layer = existing || document.createElement('div');
    layer.id = 'npc-layer';
    layer.className = 'npc-layer';
    layer.setAttribute('aria-label', '夜市摊主');
    if (!existing) mount.appendChild(layer);
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reducedMotion = media.matches;
    let enabled = true;
    let destroyed = false;
    let clock = 0;
    let frameTime = 1;
    let blocked = false;
    let paused = false;
    let lastResultKey = null;
    let responseIndex = 0;
    let dialogue = null;

    const hosts = definitions.map(definition => {
      const config = { ...definition, ...(options.hosts?.[definition.id] || {}) };
      const element = document.createElement('div');
      element.className = `npc-host npc-host--${config.id}`;
      element.dataset.npc = config.id;
      element.dataset.asset = 'loading';

      const button = document.createElement('button');
      button.className = 'npc-character';
      button.type = 'button';
      button.setAttribute('aria-label', `和${config.label}聊一聊`);
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-controls', `npc-dialogue-${config.id}`);
      button.title = `和${config.label}聊一聊`;

      const canvas = document.createElement('canvas');
      canvas.className = 'npc-portrait';
      canvas.setAttribute('aria-hidden', 'true');
      button.appendChild(canvas);
      const hint = document.createElement('span');
      hint.className = 'npc-talk-hint';
      hint.textContent = '聊一聊';
      hint.setAttribute('aria-hidden', 'true');
      button.appendChild(hint);

      const bubble = document.createElement('div');
      bubble.className = 'npc-dialogue';
      bubble.id = `npc-dialogue-${config.id}`;
      bubble.setAttribute('role', 'status');
      bubble.setAttribute('aria-live', 'polite');
      bubble.setAttribute('aria-atomic', 'true');
      bubble.hidden = true;
      const name = document.createElement('span');
      name.className = 'npc-dialogue-name';
      name.textContent = '夜市摊主';
      const text = document.createElement('span');
      text.className = 'npc-dialogue-text';
      bubble.append(name, text);
      element.append(button, bubble);
      layer.appendChild(element);

      const image = new Image();
      const host = { config, element, button, canvas, bubble, text, image,
        loaded: false, talkIndex: 0, hitIndex: 0, missIndex: 0,
        eyes: Array.isArray(config.eyes) ? config.eyes : [],
        eyeAttribute: '', reaction: 0, nextBlink: 2.9 + config.offset, blinkAge: -1 };

      // Keep NPC input inside this component; Space/Enter must never throw a ring.
      const stop = event => event.stopPropagation();
      ['pointerdown', 'pointerup', 'pointermove', 'pointercancel', 'keydown', 'keyup', 'touchstart', 'touchend'].forEach(type => button.addEventListener(type, stop));
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        if (!enabled || paused || blocked || !host.loaded) return;
        const lines = config.talk;
        show(host, lines[host.talkIndex++ % lines.length]);
        host.reaction = 0.85;
      });
      image.onload = () => {
        if (destroyed) return;
        // A small transparent safety margin accommodates the mesh deformation.
        const scale = Math.min(1, 1050 / image.naturalHeight, 600 / image.naturalWidth);
        canvas.width = Math.ceil(image.naturalWidth * scale * 1.06);
        canvas.height = Math.ceil(image.naturalHeight * scale * 1.02);
        canvas.style.aspectRatio = `${canvas.width} / ${canvas.height}`;
        host.loaded = true;
        element.dataset.asset = 'ready';
        draw(host);
      };
      image.onerror = () => {
        if (destroyed) return;
        element.dataset.asset = 'missing';
        button.disabled = true;
      };
      if (host.eyes.length) {
        element.dataset.eyes = JSON.stringify(host.eyes);
        host.eyeAttribute = element.dataset.eyes;
      }
      image.src = config.src || assetURL(config.image);
      return host;
    });

    function hideDialogue(force = false) {
      if (!dialogue) return;
      if (dialogue.secret && !force) return false;
      dialogue.host.bubble.hidden = true;
      dialogue.host.bubble.style.removeProperty('opacity');
      dialogue.host.bubble.classList.toggle('npc-dialogue--secret', false);
      dialogue.host.button.setAttribute('aria-expanded', 'false');
      dialogue = null;
      return true;
    }

    function show(host, line, secret = false) {
      if (!enabled || !host.loaded || (!secret && (paused || blocked || dialogue?.secret))) return false;
      hideDialogue(true);
      host.text.textContent = secret ? SECRET_LINE : String(line).slice(0, 30);
      host.bubble.hidden = false;
      host.bubble.style.opacity = '1';
      host.bubble.classList.toggle('npc-dialogue--secret', secret);
      host.button.setAttribute('aria-expanded', 'true');
      dialogue = { host, remaining: secret ? 12 : 5, secret };
      return true;
    }

    function getHeadAnchors(options = {}) {
      const rect = mount.getBoundingClientRect();
      const mountRect = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
      return hosts.map(host => {
        const calibration = host.config.headCalibration;
        if (!host.loaded || !calibration || !rect.width || !rect.height) return { hostId: host.config.id, loaded: host.loaded, valid: false, mountRect };
        const canvas = host.canvas, box = canvas.getBoundingClientRect();
        if (!box.width || !box.height || !canvas.width || !canvas.height) return { hostId: host.config.id, loaded: true, valid: false, mountRect };

        // CSS object-fit:contain; object-position:center bottom. The element's
        // rectangle includes letterboxing and is not the image content rectangle.
        const cssScale = Math.min(box.width / canvas.width, box.height / canvas.height);
        const contentLeft = box.left + (box.width - canvas.width * cssScale) / 2;
        const contentTop = box.top + box.height - canvas.height * cssScale;
        const imageWidth = canvas.width / 1.06, imageHeight = canvas.height / 1.02;
        const imageLeft = (canvas.width - imageWidth) / 2, imageTop = canvas.height - imageHeight;
        const sourcePoint = point => {
          const x = point.x / calibration.sourceWidth, y = point.y / calibration.sourceHeight;
          const deformation = options.restPose ? { x: 0, y: 0, scale: 1 } : warp(host, y);
          return {
            x: contentLeft + (imageLeft + imageWidth * (0.5 + (x - 0.5) * deformation.scale + deformation.x)) * cssScale,
            y: contentTop + (imageTop + imageHeight * (y + deformation.y)) * cssScale
          };
        };
        const normalizedPoint = point => ({ x: (point.x - rect.left) / rect.width, y: (point.y - rect.top) / rect.height });
        const region = source => {
          const leftTop = sourcePoint({ x: source.x, y: source.y });
          const rightTop = sourcePoint({ x: source.x + source.width, y: source.y });
          const leftBottom = sourcePoint({ x: source.x, y: source.y + source.height });
          const rightBottom = sourcePoint({ x: source.x + source.width, y: source.y + source.height });
          const center = sourcePoint({ x: source.x + source.width / 2, y: source.y + source.height / 2 });
          const left = Math.min(leftTop.x, rightTop.x, leftBottom.x, rightBottom.x);
          const right = Math.max(leftTop.x, rightTop.x, leftBottom.x, rightBottom.x);
          const top = Math.min(leftTop.y, rightTop.y, leftBottom.y, rightBottom.y);
          const bottom = Math.max(leftTop.y, rightTop.y, leftBottom.y, rightBottom.y);
          const client = { center, left, top, right, bottom, width: right - left, height: bottom - top };
          return {
            center: normalizedPoint(center),
            left: (left - rect.left) / rect.width, top: (top - rect.top) / rect.height,
            right: (right - rect.left) / rect.width, bottom: (bottom - rect.top) / rect.height,
            width: (right - left) / rect.width, height: (bottom - top) / rect.height,
            client
          };
        };
        const head = region(calibration.head), neck = region(calibration.neck), shoulders = region(calibration.shoulders);
        const neckBaseClient = sourcePoint(calibration.neckBase);
        return {
          hostId: host.config.id, loaded: true, valid: enabled,
          coordinateSpace: 'mount-normalized; x right, y down',
          center: head.center, headWidth: head.width, headHeight: head.height,
          head, neck, shoulders, neckBase: normalizedPoint(neckBaseClient),
          client: { center: head.client.center, head: head.client, neck: neck.client, shoulders: shoulders.client, neckBase: neckBaseClient },
          mountRect,
          portraitRect: { left: contentLeft, top: contentTop, width: canvas.width * cssScale, height: canvas.height * cssScale },
          animated: !options.restPose && !reducedMotion
        };
      });
    }

    function readEyes(host) {
      const value = host.element.dataset.eyes || '';
      if (host.eyeAttribute === value) return;
      host.eyeAttribute = value;
      try {
        const eyes = JSON.parse(value || '[]');
        host.eyes = Array.isArray(eyes) ? eyes.filter(eye =>
          ['x', 'y', 'w', 'h'].every(key => Number.isFinite(eye[key])) && eye.w > 0 && eye.h > 0
        ).slice(0, 2) : [];
      } catch (_) { host.eyes = []; }
    }

    function warp(host, y) {
      const phase = clock + host.config.offset;
      const breathing = reducedMotion ? 0 : Math.sin(phase * TAU / 4.5);
      const sway = reducedMotion ? 0 : Math.sin(phase * TAU / 7.7);
      const head = Math.pow(1 - y, 2.3);
      const chest = Math.exp(-Math.pow((y - 0.33) / 0.16, 2));
      const nod = reducedMotion || host.reaction <= 0 ? 0 : Math.sin((0.85 - host.reaction) * 8) * host.reaction;
      return {
        x: sway * 0.005 * head,
        y: -breathing * 0.0018 * head + nod * 0.002 * head,
        scale: 1 + breathing * 0.006 * chest
      };
    }

    function draw(host) {
      if (!host.loaded) return;
      const { canvas, image } = host;
      const ctx = canvas.getContext('2d');
      const width = canvas.width / 1.06;
      const height = canvas.height / 1.02;
      const left = (canvas.width - width) / 2;
      const top = canvas.height - height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Horizontal mesh strips deform the shoulder/chest/head continuously;
      // displacement falls to zero at the feet, preserving the ground anchor.
      const rows = reducedMotion ? 1 : 80;
      for (let row = 0; row < rows; row++) {
        const y0 = row / rows;
        const y1 = (row + 1) / rows;
        const a = warp(host, y0);
        const b = warp(host, y1);
        const mid = warp(host, (y0 + y1) * 0.5);
        const dy = top + (y0 + a.y) * height;
        const dh = Math.max(0.1, (y1 + b.y - y0 - a.y) * height);
        ctx.drawImage(image, 0, y0 * image.naturalHeight,
          image.naturalWidth, (y1 - y0) * image.naturalHeight,
          left + width * mid.x - width * (mid.scale - 1) / 2, dy,
          width * mid.scale, dh + 0.35);
      }

      // Eye patches are opt-in: normalized coordinates must be calibrated to the
      // final crop. Without them we animate breathing only, never flash the face.
      if (host.eyes.length && host.blinkAge >= 0 && !reducedMotion) {
        const amount = Math.sin(Math.PI * clamp(host.blinkAge / 0.18, 0, 1));
        if (amount > 0.05) for (const eye of host.eyes) {
          const v = warp(host, eye.y);
          const cx = left + width * (0.5 + (eye.x - 0.5) * v.scale + v.x);
          const cy = top + height * (eye.y + v.y);
          const ew = width * eye.w * v.scale;
          const eh = height * eye.h;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(eye.angle || 0);
          ctx.beginPath();
          ctx.ellipse(0, 0, ew * 0.53, eh * 0.55, 0, 0, TAU);
          ctx.clip();
          const skin = ctx.createLinearGradient(0, -eh * 0.55, 0, eh * 0.55);
          skin.addColorStop(0, eye.color || '#c99576');
          skin.addColorStop(1, eye.lowerColor || eye.color || '#c99576');
          ctx.fillStyle = skin;
          ctx.fillRect(-ew, -eh, ew * 2, eh * (0.5 + amount * 1.15));
          if (amount > 0.8) {
            ctx.strokeStyle = eye.lineColor || '#5f3d30';
            ctx.lineWidth = Math.max(0.6, height * 0.00085);
            ctx.beginPath();
            ctx.moveTo(-ew * 0.38, eh * 0.08);
            ctx.quadraticCurveTo(0, eh * 0.26, ew * 0.38, eh * 0.03);
            ctx.stroke();
          }
          ctx.restore();
        }
      }
    }

    function react(type, detail = {}) {
      if (destroyed || !enabled) return false;
      if (type === 'secret') {
        const host = hosts.find(item => item.config.id === (detail.hostId || detail.host));
        if (!host) return false;
        host.reaction = 0.85;
        return show(host, SECRET_LINE, true);
      }
      if (type === 'throw' || type === 'charge' || type === 'reset') {
        hideDialogue(type === 'reset');
        if (type === 'reset') lastResultKey = null;
        return true;
      }
      const host = hosts.find(item => item.config.id === detail.host) || hosts[responseIndex++ % hosts.length];
      let line;
      if (type === 'hit' || type === 'perfect') {
        line = host.config.hit[host.hitIndex++ % host.config.hit.length];
      } else if (type === 'miss') {
        line = host.config.miss[host.missIndex++ % host.config.miss.length];
      } else if (type === 'welcome' || type === 'talk') {
        line = host.config.talk[host.talkIndex++ % host.config.talk.length];
      } else return false;
      host.reaction = 0.85;
      return show(host, detail.text || line);
    }

    function update(dt, state = {}) {
      if (destroyed) return;
      const delta = clamp(Number.isFinite(dt) ? dt : 0, 0, 0.15);
      paused = !!state.paused || document.hidden;
      const wasBlocked = blocked;
      blocked = !!state.charging || !!state.flight;
      layer.classList.toggle('npc-layer--busy', blocked);
      layer.classList.toggle('npc-layer--paused', paused);
      if (blocked && !wasBlocked) hideDialogue();
      if (!enabled || paused) return;

      clock += delta;
      if (dialogue) {
        dialogue.remaining -= delta;
        dialogue.host.bubble.style.opacity = String(clamp(dialogue.remaining / 0.28, 0, 1));
        if (dialogue.remaining <= 0) hideDialogue(true);
      }

      // Optional automatic result reaction. ringId deduplicates persistent state.
      // If caller uses react(hit/miss) directly, omit lastResult from update.
      const result = state.lastResult;
      if (!blocked && result && result.ringId != null && result.ringId !== lastResultKey) {
        lastResultKey = result.ringId;
        react(result.hit ? 'hit' : 'miss');
      }
      for (const host of hosts) {
        readEyes(host);
        host.reaction = Math.max(0, host.reaction - delta);
        if (reducedMotion) {
          host.blinkAge = -1;
        } else if (host.blinkAge >= 0) {
          host.blinkAge += delta;
          if (host.blinkAge > 0.18) host.blinkAge = -1;
        } else if (clock >= host.nextBlink) {
          host.blinkAge = 0;
          host.nextBlink = clock + 3.7 + Math.sin(clock * 0.37 + host.config.offset) * 1.2;
        }
      }
      // Portrait rendering at 30 fps is enough for subtle idle motion.
      frameTime += delta;
      if (frameTime >= 1 / 30) {
        frameTime = 0;
        hosts.forEach(draw);
      }
    }

    function setEnabled(value) {
      enabled = !!value;
      layer.hidden = !enabled;
      if (!enabled) hideDialogue(true);
    }

    function setReducedMotion(event) {
      reducedMotion = event.matches;
      hosts.forEach(draw);
    }
    if (media.addEventListener) media.addEventListener('change', setReducedMotion);
    else media.addListener(setReducedMotion);

    const api = {
      update, react, setEnabled, getHeadAnchors,
      configureEyes(id, eyes) {
        const host = hosts.find(item => item.config.id === id);
        if (!host) return false;
        host.element.dataset.eyes = JSON.stringify(eyes || []);
        readEyes(host);
        return true;
      },
      getState() {
        return { enabled, paused, busy: blocked, reducedMotion,
          dialogue: dialogue ? { host: dialogue.host.config.id, text: dialogue.host.text.textContent, remaining: dialogue.remaining, secret: dialogue.secret } : null,
          hosts: hosts.map(host => ({ id: host.config.id, loaded: host.loaded, eyesCalibrated: host.eyes.length === 2 })) };
      },
      destroy() {
        destroyed = true;
        hideDialogue(true);
        if (media.removeEventListener) media.removeEventListener('change', setReducedMotion);
        else media.removeListener(setReducedMotion);
        hosts.forEach(host => { host.image.onload = null; host.image.onerror = null; });
        layer.remove();
      }
    };
    layer._luckyNPC = api;
    return api;
  }

  window.LuckyNPC = Object.freeze({ create, version: '1.1.0' });
})();
