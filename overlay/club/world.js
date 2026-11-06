// Môi trường 3D của DJ Club (WebGL): trời đêm thành phố, sàn LED bóng có phản chiếu, sân khấu + giàn truss (GLB),
// màn LED lớn, bàn DJ + bộ CDJ (GLB), bục Top 2–4, loa, đèn moving head + vệt sáng, đèn treo + vòng sáng trên sàn,
// laser, cột LED, hàng đèn mép sân khấu. Mô hình thiếu file thì dùng khối thay thế để cảnh vẫn chạy.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { L, TIERS, rnd } from './layout.js';

const OUT = '\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n';
const HSV = `vec3 hsv2rgb(vec3 c){ vec3 p = abs(fract(c.xxx + vec3(0.0, 2.0/3.0, 1.0/3.0)) * 6.0 - 3.0); return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y); }`;

function gradientTexture(stops) {
  const c = Object.assign(document.createElement('canvas'), { width: 4, height: 128 });
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 128);
  stops.forEach(([o, col]) => gr.addColorStop(o, col));
  g.fillStyle = gr;
  g.fillRect(0, 0, 4, 128);
  const t = new THREE.CanvasTexture(c);
  t.needsUpdate = true;
  return t;
}

function radialTexture() {
  const c = Object.assign(document.createElement('canvas'), { width: 128, height: 128 });
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.55, 'rgba(255,255,255,.45)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function labelTexture(text, color) {
  const c = Object.assign(document.createElement('canvas'), { width: 128, height: 128 });
  const g = c.getContext('2d');
  g.font = '900 96px "Be Vietnam Pro", system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = color;
  g.fillText(text, 64, 70);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class World {
  constructor({ quality, assets, led }) {
    this.quality = quality;
    this.assets = assets;
    this.led = led;
    this.scene = new THREE.Scene();
    this.loader = new GLTFLoader();
    this.ripples = [0, 1, 2, 3].map(() => new THREE.Vector4(0, 0, -99, 0));
    this.ripIdx = 0;
    this.glowMats = [];
    this.beams = [];
    this.pools = [];
    this.lasers = [];
    this.build();
  }

  // ---------------- Dựng cảnh ----------------
  build() {
    const s = this.scene;
    s.add(new THREE.HemisphereLight(0x9b8cff, 0x12051f, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 1.3);
    key.position.set(300, 900, 1400);
    s.add(key);
    const rim = new THREE.DirectionalLight(0xff4fd8, 0.8);
    rim.position.set(-800, 600, -1200);
    s.add(rim);

    this.buildSky();
    this.buildFloor();
    this.buildStage();
    this.buildLedWall();
    this.buildDesk();
    this.buildPodiums();
    this.buildSpeakers();
    this.buildMovingHeads();
    this.buildHangingSpots();
    this.buildLasers();
    this.buildPillars();
    this.buildFrontLights();
  }

  model(key, cb) {
    const def = this.assets.models?.[key];
    if (!def || !def.file) return;
    this.loader.load('club-assets/' + def.file, (gltf) => {
      const obj = gltf.scene;
      obj.traverse((o) => {
        if (!o.isMesh) return;
        [].concat(o.material).forEach((m) => {
          if (/glow/i.test(m.name || '')) { m.emissive = new THREE.Color(0xffffff); m.emissiveIntensity = 2.2; this.glowMats.push(m); }
        });
      });
      cb(obj, def);
    }, undefined, (err) => console.warn('[club] không tải được mô hình', def.file, err?.message || err));
  }

  buildSky() {
    // Trời đêm: dải màu tím đậm + sao. Ảnh toàn cảnh chỉ lấy dải cao ốc bên kia sông, dựng thành phông cong
    // sau sân khấu và nâng lên cao hơn giàn đèn (camera nhìn từ trên xuống nên đường chân trời thật bị sân khấu che).
    const bg = Object.assign(document.createElement('canvas'), { width: 4, height: 256 });
    const bgc = bg.getContext('2d');
    const gr = bgc.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#05030f');
    gr.addColorStop(0.55, '#140a33');
    gr.addColorStop(1, '#2a1250');
    bgc.fillStyle = gr;
    bgc.fillRect(0, 0, 4, 256);
    const bgTex = new THREE.CanvasTexture(bg);
    bgTex.colorSpace = THREE.SRGBColorSpace;
    this.scene.background = bgTex;

    const starGeo = new THREE.BufferGeometry();
    const pts = [];
    for (let i = 0; i < 700; i++) {
      const a = rnd(-Math.PI, Math.PI);
      const e = rnd(0.12, 1.3);
      pts.push(Math.sin(a) * Math.cos(e) * 12000, Math.sin(e) * 12000, Math.cos(a) * Math.cos(e) * 12000 - 800);
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0.8, fog: false }));
    this.scene.add(this.stars);

    const sky = this.assets.sky;
    const file = sky && (this.quality === 'low' ? sky.low || sky.file : sky.file);
    if (file) {
      new THREE.TextureLoader().load('club-assets/' + file, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        const [u0, t0, u1, t1] = Array.isArray(sky.crop) && sky.crop.length === 4 ? sky.crop : [0.36, 0.12, 0.82, 0.52];
        // phông cong nhìn từ bên trong: lật ngang để trái / phải đúng như ảnh gốc
        tex.repeat.set(-(u1 - u0), t1 - t0);
        tex.offset.set(u1, 1 - t1);
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        const R = 7000;
        const h = sky.height ?? 6000;
        const span = Math.min(Math.PI * 1.2, ((u1 - u0) * 2048) / ((t1 - t0) * 1024) * h / R);
        const geo = new THREE.CylinderGeometry(R, R, h, 64, 1, true, Math.PI - span / 2, span);
        const b = sky.brightness ?? 0.75;
        const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, color: new THREE.Color(b, b, b), transparent: true, depthWrite: false });
        const backdrop = new THREE.Mesh(geo, mat);
        backdrop.position.set(0, (sky.y ?? 500) + h / 2, -800);
        backdrop.renderOrder = -1;
        this.scene.add(backdrop);
      }, undefined, () => console.warn('[club] không tải được ảnh nền', file));
    }
    // nền đất tối che phần dưới
    const ground = new THREE.Mesh(new THREE.CircleGeometry(9000, 48), new THREE.MeshBasicMaterial({ color: 0x030108 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2;
    this.scene.add(ground);
  }

  buildFloor() {
    const f = L.floor;
    const w = f.x1 - f.x0;
    const d = f.z1 - f.z0;
    const geo = new THREE.PlaneGeometry(w, d);
    geo.rotateX(-Math.PI / 2);
    this.floorMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }, uBeat: { value: 0 }, uPulse: { value: 0 }, uMode: { value: 0 }, uTile: { value: f.tile },
        uRip: { value: this.ripples }
      },
      vertexShader: `varying vec3 vPos; void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vPos = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
      fragmentShader: `
        uniform float uTime, uBeat, uPulse, uMode, uTile; uniform vec4 uRip[4]; varying vec3 vPos;
        ${HSV}
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        void main(){
          vec2 p = vPos.xz / uTile; vec2 id = floor(p); vec2 f = fract(p);
          float edge = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y));
          float grout = smoothstep(0.02, 0.06, edge);
          float on = 0.0; float hue = 0.8; int mode = int(uMode + 0.5);
          if (mode == 0) { on = pow(0.5 + 0.5 * sin(id.x * 0.75 + id.y * 0.55 - uTime * 3.0), 3.0); hue = fract(uTime * 0.08 + id.x * 0.04); }
          else if (mode == 1) { float dd = length(id - vec2(0.0, 5.0)); on = exp(-pow(dd - mod(uTime * 2.2, 12.0), 2.0) * 0.8); hue = fract(0.8 - dd * 0.05 + uTime * 0.05); }
          else if (mode == 2) { float sp = hash(id + floor(uTime * 5.0)); on = sp > 0.8 ? 1.0 : 0.06; hue = sp; }
          else if (mode == 3) { on = mod(id.x + id.y + floor(uBeat), 2.0) > 0.5 ? 0.25 + uPulse * 0.75 : 0.05; hue = fract(floor(uBeat / 2.0) * 0.13); }
          else if (mode == 4) { on = exp(-pow(id.y - (mod(uTime * 4.0, 18.0) - 3.0), 2.0) * 0.6); hue = fract(uTime * 0.14 + id.y * 0.07); }
          else { on = 0.35 + 0.3 * sin(uTime * 2.0 + id.x * 0.4); hue = fract(id.x * 0.07 + id.y * 0.03 + uTime * 0.2); }
          for (int i = 0; i < 4; i++) {
            vec4 r = uRip[i]; float age = uTime - r.z;
            if (age > 0.0 && age < 1.8) {
              float dd = length(vPos.xz - r.xy);
              float ring = exp(-pow((dd - age * 650.0) / 110.0, 2.0)) * (1.0 - age / 1.8);
              if (ring > on) { on = ring; hue = r.w; }
            }
          }
          on = max(on, 0.06);
          float fade = 1.0 - smoothstep(1000.0, 1500.0, abs(vPos.x));
          vec3 col = hsv2rgb(vec3(hue, 0.85, 1.0)) * on * 1.15 * grout * fade;
          float sweep = exp(-pow((vPos.x + vPos.z * 0.6) - (mod(uTime * 260.0, 4400.0) - 2200.0), 2.0) / 50000.0) * 0.07;
          gl_FragColor = vec4(vec3(0.014, 0.006, 0.035) + col + sweep, 1.0);
          ${OUT}
        }`
    });
    const floor = new THREE.Mesh(geo, this.floorMat);
    floor.position.set((f.x0 + f.x1) / 2, 0, (f.z0 + f.z1) / 2);
    this.scene.add(floor);

    if (this.quality !== 'low') {
      const rgeo = new THREE.PlaneGeometry(w, d);
      const shader = {
        name: 'ClubFloorReflection',
        uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, uStrength: { value: 0.2 } },
        vertexShader: Reflector.ReflectorShader.vertexShader,
        fragmentShader: `uniform vec3 color; uniform sampler2D tDiffuse; uniform float uStrength; varying vec4 vUv;
          void main(){ vec4 b = texture2DProj(tDiffuse, vUv); gl_FragColor = vec4(b.rgb * uStrength, 1.0); ${OUT} }`
      };
      const refl = new Reflector(rgeo, { textureWidth: 540, textureHeight: 960, clipBias: 0.003, shader, multisample: 0 });
      refl.material.transparent = true;
      refl.material.blending = THREE.AdditiveBlending;
      refl.material.depthWrite = false;
      refl.rotation.x = -Math.PI / 2;
      refl.position.set(floor.position.x, 0.6, floor.position.z);
      this.scene.add(refl);
      this.reflector = refl;
    }
  }

  buildStage() {
    const st = L.stage;
    // khối thay thế, bị ẩn khi mô hình sân khấu tải xong
    const fallback = new THREE.Group();
    const deckMat = new THREE.MeshStandardMaterial({ color: 0x07040d, roughness: 0.35, metalness: 0.3 });
    const deck = new THREE.Mesh(new THREE.BoxGeometry(st.halfW * 2, st.deckY, st.front - st.back), deckMat);
    deck.position.set(0, st.deckY / 2, (st.front + st.back) / 2);
    fallback.add(deck);
    const trussMat = new THREE.MeshStandardMaterial({ color: 0x8a8f99, roughness: 0.5, metalness: 0.7 });
    for (const x of [-620, 620]) for (const z of [L.trussFrontZ, st.back - 30]) {
      const tower = new THREE.Mesh(new THREE.BoxGeometry(30, L.trussTopY, 30), trussMat);
      tower.position.set(x, L.trussTopY / 2, z);
      fallback.add(tower);
    }
    for (const z of [L.trussFrontZ, st.back - 30]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1270, 30, 30), trussMat);
      bar.position.set(0, L.trussTopY, z);
      fallback.add(bar);
    }
    this.scene.add(fallback);
    // dải LED mép trước sân khấu
    this.edgeMat = new THREE.MeshBasicMaterial({ color: 0xff4fd8 });
    const edge = new THREE.Mesh(new THREE.BoxGeometry(st.halfW * 2, 5, 5), this.edgeMat);
    edge.position.set(0, st.deckY + 2, st.front + 2);
    this.scene.add(edge);

    this.model('stage', (obj, def) => {
      obj.scale.setScalar(def.scale ?? st.scale);
      obj.position.set(0, def.y ?? 0, def.z ?? st.offsetZ);
      obj.traverse((o) => {
        if (!o.isMesh) return;
        [].concat(o.material).forEach((m) => {
          if (/^black$/i.test(m.name)) { m.color = new THREE.Color(0x07040d); m.roughness = 0.3; m.metalness = 0.35; }
        });
      });
      this.scene.add(obj);
      fallback.visible = false;
    });
  }

  buildLedWall() {
    const c = L.led;
    this.ledTex = new THREE.CanvasTexture(this.led.canvas);
    this.ledTex.colorSpace = THREE.SRGBColorSpace;
    this.ledTex.magFilter = THREE.NearestFilter;
    this.ledTex.minFilter = THREE.LinearFilter;
    this.ledTex.generateMipmaps = false;
    this.ledMat = new THREE.ShaderMaterial({
      uniforms: { map: { value: this.ledTex }, grid: { value: new THREE.Vector2(c.cols, c.rows) }, bright: { value: 1.6 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform sampler2D map; uniform vec2 grid; uniform float bright; varying vec2 vUv;
        void main(){
          vec2 cell = vUv * grid; vec2 f = fract(cell) - 0.5;
          float dotMask = smoothstep(0.52, 0.30, length(f));
          vec3 col = texture2D(map, (floor(cell) + 0.5) / grid).rgb;
          gl_FragColor = vec4(col * (dotMask * bright + 0.06), 1.0);
          ${OUT}
        }`
    });
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(c.w, c.h), this.ledMat);
    wall.position.set(c.x, c.y, c.z);
    this.scene.add(wall);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(c.w + 30, c.h + 30, 12), new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.4, metalness: 0.8 }));
    frame.position.set(c.x, c.y, c.z - 8);
    this.scene.add(frame);
  }

  buildDesk() {
    const d = L.desk;
    const y0 = L.stage.deckY;
    const body = new THREE.Mesh(new THREE.BoxGeometry(d.w, d.h, d.d), new THREE.MeshStandardMaterial({ color: 0x120822, roughness: 0.3, metalness: 0.5 }));
    body.position.set(d.x, y0 + d.h / 2, d.z);
    this.scene.add(body);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(body.geometry), new THREE.LineBasicMaterial({ color: 0xd946ef }));
    edges.position.copy(body.position);
    this.scene.add(edges);
    this.deskEdge = edges.material;
    this.model('djController', (obj, def) => {
      obj.scale.setScalar(def.scale ?? 100);
      if (def.rotateY) obj.rotation.y = def.rotateY;
      obj.position.set(d.x, y0 + d.h + (def.y ?? 0), d.z + (def.z ?? 0));
      this.scene.add(obj);
    });
  }

  buildPodiums() {
    this.podiums = {};
    for (const slot of [2, 3, 4]) {
      const T = TIERS[slot];
      const { x, z, h } = L.slots[slot];
      const r = L.podiumR;
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.08, h, 48), new THREE.MeshStandardMaterial({ color: T.b, roughness: 0.25, metalness: 0.75, emissive: new THREE.Color(T.hex), emissiveIntensity: 0.08 }));
      body.position.y = h / 2;
      g.add(body);
      const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(T.hex).multiplyScalar(2.2) });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r + 2, 3.2, 8, 72), ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = h;
      g.add(ring);
      const base = new THREE.Mesh(new THREE.TorusGeometry(r * 1.1, 2.4, 8, 72), ringMat);
      base.rotation.x = -Math.PI / 2;
      base.position.y = 2;
      g.add(base);
      const num = new THREE.Mesh(new THREE.PlaneGeometry(46, 46), new THREE.MeshBasicMaterial({ map: labelTexture(String(slot), T.a), transparent: true }));
      num.position.set(0, h * 0.5, r * 1.04 + 1);
      g.add(num);
      g.position.set(x, 0, z);
      this.scene.add(g);
      this.podiums[slot] = { ring: ringMat, body };
    }
  }

  buildSpeakers() {
    this.model('speaker', (obj, def) => {
      const sc = def.scale ?? 300;
      for (const side of [-1, 1]) {
        for (const level of [0, 1]) {
          const o = obj.clone();
          o.scale.setScalar(sc);
          o.position.set(side * 730, level * 0.716 * sc, -40);
          o.rotation.y = -side * 0.25;
          this.scene.add(o);
        }
      }
    });
  }

  beamMesh(len, rTop, rBottom) {
    const geo = new THREE.CylinderGeometry(rTop, rBottom, len, 28, 1, true);
    geo.translate(0, -len / 2, 0);   // đầu hẹp ở gốc, chiếu xuống theo -Y
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff, alphaMap: this.beamAlpha || (this.beamAlpha = gradientTexture([[0, 'rgb(120,120,120)'], [0.5, 'rgb(30,30,30)'], [1, 'rgb(0,0,0)']])),
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, opacity: 0.55
    });
    return new THREE.Mesh(geo, mat);
  }

  buildMovingHeads() {
    const spots = [[-430, L.stage.deckY, L.stage.front - 25], [430, L.stage.deckY, L.stage.front - 25], [-560, L.stage.deckY, -620], [560, L.stage.deckY, -620]];
    this.model('movingHead', (obj, def) => {
      for (const p of spots) {
        const o = obj.clone();
        o.scale.setScalar(def.scale ?? 110);
        o.position.set(...p);
        this.scene.add(o);
      }
    });
    const n = this.quality === 'low' ? 2 : spots.length;
    for (let i = 0; i < n; i++) {
      const [x, y, z] = spots[i];
      const pivot = new THREE.Group();
      pivot.position.set(x, y + 52, z);
      const beam = this.beamMesh(2600, 6, 170);
      pivot.add(beam);
      this.scene.add(pivot);
      this.beams.push({ pivot, beam, side: x < 0 ? -1 : 1, phase: i * 1.7 });
    }
  }

  buildHangingSpots() {
    const xs = this.quality === 'low' ? [-300, 300] : [-480, -160, 160, 480];
    const y = L.trussTopY - 20;
    const z = L.trussFrontZ;
    this.model('spotLight', (obj, def) => {
      for (const x of xs) {
        const o = obj.clone();
        o.scale.setScalar(def.scale ?? 90);
        o.position.set(x, y, z);
        o.rotation.x = 0.5;
        this.scene.add(o);
      }
    });
    const poolTex = radialTexture();
    xs.forEach((x, i) => {
      const color = new THREE.Color().setHSL((i * 0.23 + 0.12) % 1, 1, 0.55);
      const pool = new THREE.Mesh(new THREE.CircleGeometry(120, 40), new THREE.MeshBasicMaterial({ map: poolTex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.85 }));
      pool.rotation.x = -Math.PI / 2;
      pool.position.y = 1.2;
      this.scene.add(pool);
      const cone = this.beamMesh(1, 5, 120);
      cone.material.color = color;
      cone.material.opacity = 0.07;
      this.scene.add(cone);
      this.pools.push({ pool, cone, from: new THREE.Vector3(x, y - 60, z), phase: i * 1.9, color });
    });
  }

  buildLasers() {
    const emitters = [[-600, L.trussTopY, L.trussFrontZ], [600, L.trussTopY, L.trussFrontZ], [-600, L.trussTopY - 40, -820], [600, L.trussTopY - 40, -820]];
    const n = this.quality === 'low' ? 5 : 7;
    const geo = new THREE.CylinderGeometry(1.3, 1.3, 1, 5, 1, true);
    geo.translate(0, 0.5, 0);
    this.laserMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x39ff14).multiplyScalar(3), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false });
    emitters.forEach(([x, y, z], e) => {
      for (let i = 0; i < n; i++) {
        const m = new THREE.Mesh(geo, this.laserMat);
        m.position.set(x, y, z);
        m.scale.set(1, 2600, 1);
        this.scene.add(m);
        this.lasers.push({ m, e, i, n, side: x < 0 ? 1 : -1, back: z < -500 });
      }
    });
  }

  buildPillars() {
    this.pillarMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uPulse: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform float uTime, uPulse; varying vec2 vUv; ${HSV}
        void main(){ float band = 0.5 + 0.5 * sin(vUv.y * 18.0 - uTime * 5.0); vec3 c = hsv2rgb(vec3(fract(vUv.y * 0.6 + uTime * 0.1), 0.9, 1.0)) * (0.35 + band * 1.6 + uPulse * 0.5); gl_FragColor = vec4(c, 1.0); ${OUT} }`
    });
    const h = L.led.h;
    for (const x of [-520, 520]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(30, h, 30), this.pillarMat);
      p.position.set(x, L.stage.deckY + h / 2, -760);
      this.scene.add(p);
    }
  }

  buildFrontLights() {
    const xs = [];
    for (let x = -440; x <= 440; x += 80) xs.push(x);
    const geo = new THREE.SphereGeometry(13, 16, 12);
    this.frontLights = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff }), xs.length);
    const m = new THREE.Matrix4();
    xs.forEach((x, i) => {
      m.makeTranslation(x, L.stage.deckY / 2, L.stage.front + 6);
      this.frontLights.setMatrixAt(i, m);
      this.frontLights.setColorAt(i, new THREE.Color(1, 1, 1));
    });
    this.scene.add(this.frontLights);
  }

  // ---------------- Cập nhật mỗi khung hình ----------------
  ripple(x, z, hue = 0.9) {
    const r = this.ripples[this.ripIdx];
    r.set(x, z, this.t, hue);
    this.ripIdx = (this.ripIdx + 1) % this.ripples.length;
  }

  setOccupied(occ) { this.occupied = occ || {}; }

  update(t, beat, pulse) {
    this.t = t;
    const u = this.floorMat.uniforms;
    u.uTime.value = t;
    u.uBeat.value = beat;
    u.uPulse.value = pulse;
    u.uMode.value = Math.floor(t / 12) % 6;
    this.ledTex.needsUpdate = true;
    this.pillarMat.uniforms.uTime.value = t;
    this.pillarMat.uniforms.uPulse.value = pulse;

    const hue = (t * 0.05) % 1;
    const edgeCol = new THREE.Color().setHSL(hue, 1, 0.6).multiplyScalar(1.8 + pulse);
    this.edgeMat.color.copy(edgeCol);
    this.deskEdge.color.setHSL((hue + 0.5) % 1, 1, 0.6);
    for (const m of this.glowMats) m.emissive.setHSL((hue + 0.25) % 1, 1, 0.6);

    // bục: vòng sáng mạnh hơn khi có người đứng
    if (this.podiums) {
      for (const slot of [2, 3, 4]) {
        const p = this.podiums[slot];
        const on = this.occupied?.[slot];
        p.ring.color.set(TIERS[slot].hex).multiplyScalar(on ? 2.2 + pulse * 1.5 : 0.9);
      }
    }

    // đèn moving head: quét qua lại, đổi màu theo đoạn nhạc
    const bar = Math.floor(beat / 8);
    for (const b of this.beams) {
      const yaw = Math.sin(t * 0.6 + b.phase) * 0.7 - b.side * 0.25;
      const tilt = -(2.65 + Math.sin(t * 0.9 + b.phase * 1.3) * 0.3);   // hướng lên trời, hơi nghiêng ra trước
      b.pivot.rotation.set(tilt, yaw, 0, 'YXZ');
      b.beam.material.color.setHSL(((bar * 0.17) + b.phase * 0.1) % 1, 1, 0.6);
      b.beam.material.opacity = 0.12 + pulse * 0.1;
    }

    // đèn treo: vòng sáng chạy trên sàn + vệt sáng nối từ đèn xuống
    const up = new THREE.Vector3(0, 1, 0);
    for (const p of this.pools) {
      const x = Math.sin(t * 0.35 + p.phase) * 620;
      const z = 420 + Math.sin(t * 0.27 + p.phase * 1.7) * 380;
      p.pool.position.x = x;
      p.pool.position.z = z;
      const to = new THREE.Vector3(x, 0, z);
      const dir = p.from.clone().sub(to);
      const len = dir.length();
      p.cone.position.copy(p.from);
      p.cone.scale.set(1, len, 1);
      p.cone.quaternion.setFromUnitVectors(up, dir.normalize());
      p.pool.material.opacity = 0.3 + pulse * 0.25;
    }

    // laser: quạt mở ra khép lại, bật theo nhịp
    const laserOn = (Math.floor(beat / 4) % 4) !== 3;
    this.laserMat.color.setHSL([0.33, 0.15, 0.85, 0.5][bar % 4], 1, 0.6).multiplyScalar(3);
    for (const l of this.lasers) {
      l.m.visible = laserOn && (!l.back || bar % 2 === 1);
      if (!l.m.visible) continue;
      const spread = 0.55 + 0.35 * Math.sin(t * 0.8 + l.e);
      const a = (l.i / (l.n - 1) - 0.5) * spread;
      const yaw = a + l.side * (0.35 + Math.sin(t * 0.5 + l.e) * 0.25);
      const pitch = l.back ? 1.85 + Math.sin(t * 0.7) * 0.2 : 2.25 + Math.sin(t * 0.6 + l.e) * 0.2;
      l.m.rotation.set(pitch, yaw, 0, 'YXZ');
    }

    // hàng đèn tròn mép sân khấu chạy đuổi theo nhịp
    const n = this.frontLights.count;
    const head = Math.floor(beat * 2) % n;
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const on = (i === head || i === n - 1 - head) ? 2.4 : 0.35 + pulse * 0.4;
      c.setHSL((i / n + t * 0.1) % 1, 0.9, 0.6).multiplyScalar(on);
      this.frontLights.setColorAt(i, c);
    }
    this.frontLights.instanceColor.needsUpdate = true;
  }
}

export { rnd };
