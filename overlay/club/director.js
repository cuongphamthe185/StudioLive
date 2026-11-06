// Đạo diễn camera: tự đổi góc máy (toàn cảnh, góc trái/phải, thấp, trên cao), trôi nhẹ để cảnh luôn chuyển động;
// có quà -> áp sát người tặng vài giây; Top 1 mới -> cận DJ. Chuyển góc mượt (làm mềm theo thời gian).
import * as THREE from 'three';
import { L } from './layout.js';

const SHOTS = {
  wide: { pos: [0, 580, 1500], look: [0, 230, -250] },
  left: { pos: [-900, 440, 1250], look: [-40, 230, -380] },
  right: { pos: [900, 440, 1250], look: [40, 230, -380] },
  low: { pos: [0, 210, 1080], look: [0, 290, -480] },
  high: { pos: [0, 1150, 1250], look: [0, 40, -120] },
  dj: { pos: [0, 330, -170], look: [0, 280, L.dj.z] }
};
const AUTO = ['wide', 'left', 'wide', 'right', 'low', 'wide', 'high'];

export class Director {
  constructor(camera) {
    this.camera = camera;
    this.pos = new THREE.Vector3(...SHOTS.wide.pos);
    this.look = new THREE.Vector3(...SHOTS.wide.look);
    this.shot = 'wide';
    this.idx = 0;
    this.since = 0;
    this.focus = null;       // { target: () => Vector3 (đầu nhân vật), until, side }
    this.next = null;
    camera.position.copy(this.pos);
    camera.lookAt(this.look);
  }

  cut(name) {
    if (!SHOTS[name]) return;
    this.shot = name;
    this.since = performance.now();
  }

  nextShot() {
    this.idx = (this.idx + 1) % AUTO.length;
    this.cut(AUTO[this.idx]);
  }

  // áp sát một vị trí (hàm trả về Vector3 đầu nhân vật) trong ms mili giây
  focusOn(target, ms, force = false, dog = null) {
    const now = performance.now();
    const f = { target, until: now + ms, start: now, side: Math.random() < 0.5 ? -1 : 1, dog };
    if (!force && this.focus && now - this.focus.start < 1500 && now < this.focus.until) { this.next = f; return; }
    this.focus = f;
    this.next = null;
  }

  update(dt, { auto = true, every = 12 } = {}) {
    const now = performance.now();
    if (this.next && now - this.focus.start >= 1500) { this.focus = this.next; this.next = null; }
    if (this.focus && now > this.focus.until) this.focus = null;
    if (auto && !this.focus && now - this.since > every * 1000) this.nextShot();

    let tp;
    let tl;
    let rate;
    if (this.focus) {
      const head = this.focus.target();
      if (!head) { this.focus = null; return; }
      tl = head.clone();
      const slot = this.focus.dog?.slot;
      // Top 1 sau bàn DJ: máy đặt trên mép sân khấu (sau lưng bục Top 2) để không bị che
      // đặt máy cao, nhìn chéo xuống để đám đông phía trước không che người được quay
      const off = slot === 1 ? [110, 110, 360] : slot ? [150, 260, 430] : [170, 280, 480];
      tp = head.clone().add(new THREE.Vector3(this.focus.side * off[0], off[1], off[2]));
      rate = 3.2;
    } else {
      const s = SHOTS[this.shot] || SHOTS.wide;
      const t = now / 1000;
      // trôi nhẹ quanh vị trí máy để cảnh không đứng yên
      tp = new THREE.Vector3(...s.pos).add(new THREE.Vector3(Math.sin(t * 0.13) * 90, Math.sin(t * 0.17) * 40, Math.cos(t * 0.11) * 70));
      tl = new THREE.Vector3(...s.look);
      rate = 1.4;
    }
    const k = 1 - Math.exp(-dt * rate);
    this.pos.lerp(tp, k);
    this.look.lerp(tl, k);
    this.camera.position.copy(this.pos);
    this.camera.lookAt(this.look);
  }
}
