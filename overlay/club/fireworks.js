// Pháo hoa bắn phía sau sân khấu (trước phông thành phố) khi đủ tim.
// Một khối THREE.Points dùng chung cho mọi tia lửa, tính chuyển động trên CPU (vài nghìn hạt, 30 khung/giây là nhẹ).
import * as THREE from 'three';

const OUT = '\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n';
const G = 230;                       // trọng lực tia lửa (cm/s²)
const COLORS = [
  [1.0, 0.78, 0.25], [1.0, 0.32, 0.62], [0.35, 0.85, 1.0], [0.72, 0.42, 1.0],
  [0.45, 1.0, 0.5], [1.0, 0.5, 0.15], [1.0, 0.95, 0.85]
];
const TYPES = ['peony', 'peony', 'ring', 'willow', 'glitter', 'double'];
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export class Fireworks {
  constructor(scene, { quality = 'high', fov = 58, height = 1920 } = {}) {
    this.amount = quality === 'low' ? 0.5 : 1;
    this.max = quality === 'low' ? 2500 : 6000;
    const m = this.max;
    this.n = 0;
    this.pos = new Float32Array(m * 3);
    this.vel = new Float32Array(m * 3);
    this.col = new Float32Array(m * 3);
    this.size = new Float32Array(m);
    this.alpha = new Float32Array(m);
    this.life = new Float32Array(m);
    this.age = new Float32Array(m);
    this.drag = new Float32Array(m);
    this.grav = new Float32Array(m);
    this.twinkle = new Uint8Array(m);
    this.base = new Float32Array(m);   // kích thước gốc
    this.rockets = [];
    this.queue = [];
    this.clock = 0;
    this.onBoom = null;
    this.onLaunch = null;

    const geo = new THREE.BufferGeometry();
    const attr = (arr, n) => new THREE.BufferAttribute(arr, n).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', attr(this.pos, 3));
    geo.setAttribute('aColor', attr(this.col, 3));
    geo.setAttribute('aSize', attr(this.size, 1));
    geo.setAttribute('aAlpha', attr(this.alpha, 1));
    geo.setDrawRange(0, 0);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 2000, -3000), 20000);
    this.geo = geo;
    const scale = (height / 2) / Math.tan(THREE.MathUtils.degToRad(fov / 2));
    this.points = new THREE.Points(geo, new THREE.ShaderMaterial({
      uniforms: { uScale: { value: scale } },
      vertexShader: `attribute vec3 aColor; attribute float aSize; attribute float aAlpha; uniform float uScale;
        varying vec3 vColor; varying float vAlpha;
        void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = clamp(aSize * uScale / -mv.z, 1.0, 400.0);
          vColor = aColor; vAlpha = aAlpha; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying vec3 vColor; varying float vAlpha;
        void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; float a = clamp(1.0 - d, 0.0, 1.0); a = a * a * (0.6 + 0.4 * a);
          gl_FragColor = vec4(vColor * vAlpha * a * 2.4, 1.0); ${OUT} }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    this.points.frustumCulled = false;
    this.points.renderOrder = 2;
    this.points.visible = false;
    scene.add(this.points);
  }

  get active() { return this.n > 0 || this.rockets.length > 0 || this.queue.length > 0; }

  // một tia lửa
  spark(x, y, z, vx, vy, vz, c, life, size, { drag = 1.6, grav = 1, twinkle = 0 } = {}) {
    if (this.n >= this.max) return;
    const i = this.n++, k = i * 3;
    this.pos[k] = x; this.pos[k + 1] = y; this.pos[k + 2] = z;
    this.vel[k] = vx; this.vel[k + 1] = vy; this.vel[k + 2] = vz;
    this.col[k] = c[0]; this.col[k + 1] = c[1]; this.col[k + 2] = c[2];
    this.size[i] = size; this.base[i] = size; this.alpha[i] = 1;
    this.life[i] = life; this.age[i] = 0; this.drag[i] = drag; this.grav[i] = grav; this.twinkle[i] = twinkle;
  }

  // bắn một quả: bay lên rồi nổ ở (x, by, z)
  launch({ x = rnd(-2000, 2000), z = rnd(-2300, -3500), by = rnd(1350, 2300), type = pick(TYPES), color = pick(COLORS), fuse = rnd(1.0, 1.5) } = {}) {
    const y0 = 120;
    const gr = G * 0.35;
    const vy = (by - y0) / fuse + 0.5 * gr * fuse;
    this.rockets.push({ x, y: y0, z, vx: rnd(-60, 60), vy, vz: 0, gr, t: 0, fuse, type, color });
    if (this.onLaunch) this.onLaunch();
  }

  burst(r) {
    const { x, y, z, color } = r;
    const A = this.amount;
    const flash = [0.75, 0.62, 0.45];
    this.spark(x, y, z, 0, 0, 0, flash, 0.22, 1600, { drag: 0, grav: 0 });
    const sphere = (n, speed, c, life, size, opt) => {
      for (let i = 0; i < n; i++) {
        const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u);
        const sp = speed * rnd(0.85, 1.05);
        this.spark(x, y, z, s * Math.cos(a) * sp, u * sp, s * Math.sin(a) * sp, c, life * rnd(0.8, 1.15), size, opt);
      }
    };
    switch (r.type) {
      case 'ring': {   // vòng tròn quay mặt về khán giả
        const n = Math.round(110 * A), tilt = rnd(-0.5, 0.5);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2, sp = 1450;
          this.spark(x, y, z, Math.cos(a) * sp, Math.sin(a) * sp * Math.cos(tilt), Math.sin(a) * sp * Math.sin(tilt) * 0.4, color, 1.6, 70);
        }
        sphere(Math.round(40 * A), 500, [1, 0.95, 0.8], 0.9, 40);
        break;
      }
      case 'willow':   // liễu vàng: rơi chậm, để vệt dài
        sphere(Math.round(160 * A), 1250, [1, 0.72, 0.22], 3.0, 62, { drag: 1.9, grav: 1.3 });
        break;
      case 'glitter':  // nhũ lấp lánh
        sphere(Math.round(180 * A), 1350, [1, 0.93, 0.7], 2.1, 58, { twinkle: 1 });
        break;
      case 'double': { // hai lớp màu
        const c2 = pick(COLORS);
        sphere(Math.round(130 * A), 1550, color, 1.7, 68);
        sphere(Math.round(80 * A), 780, c2, 1.5, 60);
        break;
      }
      case 'heart': {  // hình trái tim (đủ tim mà!)
        const n = Math.round(150 * A);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          const hx = 16 * Math.sin(a) ** 3;
          const hy = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a);
          this.spark(x, y, z, hx * 90, hy * 90, rnd(-40, 40), [1, 0.3, 0.55], 2.0, 72, { drag: 1.5, grav: 0.35 });
        }
        sphere(Math.round(50 * A), 450, [1, 0.8, 0.9], 1.2, 40);
        break;
      }
      default:         // hoa cúc tròn
        sphere(Math.round(170 * A), 1450, color, 1.7, 68);
    }
    if (this.onBoom) this.onBoom(r.type);
  }

  // màn bắn pháo hoa kéo dài ms: rải đều rồi dồn dập ở cuối
  show(ms = 12000) {
    const end = ms / 1000;
    const finale = Math.max(2, end * 0.22);
    const q = [];
    q.push({ at: 0.15, opt: { x: 0, z: -3000, by: 2050, type: 'heart', fuse: 1.25 } });
    q.push({ at: 0.5, opt: { x: -1500, type: 'willow' } });
    q.push({ at: 0.6, opt: { x: 1500, type: 'willow' } });
    for (let t = 1.2; t < end - finale; t += rnd(0.35, 0.7)) {
      q.push({ at: t, opt: {} });
      if (Math.random() < 0.45) q.push({ at: t + 0.12, opt: {} });
    }
    for (let t = end - finale; t < end; t += rnd(0.08, 0.18)) q.push({ at: t, opt: { type: pick(['peony', 'glitter', 'ring', 'double']) } });
    q.push({ at: end - 0.2, opt: { x: 0, z: -3000, by: 2150, type: 'heart' } });
    const now = this.clock;
    this.queue.push(...q.map((e) => ({ at: now + e.at, opt: e.opt })));
    this.queue.sort((a, b) => a.at - b.at);
  }

  stop() { this.queue.length = 0; }

  update(dt) {
    this.clock += dt;
    if (!this.active) { this.points.visible = false; return; }
    this.points.visible = true;
    while (this.queue.length && this.queue[0].at <= this.clock) this.launch(this.queue.shift().opt);

    // tên lửa: bay lên, nhả vệt sáng
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const r = this.rockets[i];
      r.t += dt;
      r.vy -= r.gr * dt;
      r.x += r.vx * dt; r.y += r.vy * dt; r.z += r.vz * dt;
      for (let k = 0; k < 2; k++) this.spark(r.x + rnd(-6, 6), r.y - rnd(0, 30), r.z, rnd(-25, 25), rnd(-80, -20), 0, [1, 0.75, 0.4], rnd(0.3, 0.55), 34, { drag: 2, grav: 0.4 });
      this.spark(r.x, r.y, r.z, 0, 0, 0, [1, 0.9, 0.7], 0.05, 70, { drag: 0, grav: 0 });
      if (r.t >= r.fuse) { this.burst(r); this.rockets.splice(i, 1); }
    }

    // tia lửa
    let i = 0;
    while (i < this.n) {
      this.age[i] += dt;
      if (this.age[i] >= this.life[i]) { this.kill(i); continue; }
      const k = i * 3, f = Math.exp(-this.drag[i] * dt);
      this.vel[k] *= f; this.vel[k + 1] = this.vel[k + 1] * f - G * this.grav[i] * dt; this.vel[k + 2] *= f;
      this.pos[k] += this.vel[k] * dt; this.pos[k + 1] += this.vel[k + 1] * dt; this.pos[k + 2] += this.vel[k + 2] * dt;
      const p = this.age[i] / this.life[i];
      let a = Math.pow(1 - p, 1.6);
      if (this.twinkle[i]) a *= Math.random() < 0.5 ? 1.3 : 0.15;
      this.alpha[i] = a;
      this.size[i] = this.base[i] * (1 - p * 0.45);
      i++;
    }
    const g = this.geo;
    g.setDrawRange(0, this.n);
    for (const name of ['position', 'aColor', 'aSize', 'aAlpha']) g.attributes[name].needsUpdate = true;
  }

  // xoá hạt i bằng cách chép hạt cuối vào chỗ nó
  kill(i) {
    const j = --this.n;
    if (i === j) return;
    const a = i * 3, b = j * 3;
    for (let k = 0; k < 3; k++) { this.pos[a + k] = this.pos[b + k]; this.vel[a + k] = this.vel[b + k]; this.col[a + k] = this.col[b + k]; }
    this.size[i] = this.size[j]; this.base[i] = this.base[j]; this.alpha[i] = this.alpha[j];
    this.life[i] = this.life[j]; this.age[i] = this.age[j]; this.drag[i] = this.drag[j]; this.grav[i] = this.grav[j]; this.twinkle[i] = this.twinkle[j];
  }
}
