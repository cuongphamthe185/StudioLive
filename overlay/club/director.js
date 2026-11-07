// Đạo diễn camera: tự đổi góc máy theo thời gian (người xem không điều khiển được), luôn xen kẽ góc toàn cảnh
// để ai cũng thấy hết sàn; có quà -> áp sát người tặng vài giây; Top 1 mới -> cận DJ. Chuyển góc mượt.
// Khung dọc 1080×1920: TikTok che ~240 px trên và ~480 px dưới, nên các góc toàn cảnh đặt hàng người cuối
// cùng ở khoảng 70% chiều cao màn hình, sân khấu ở giữa, bầu trời ở trên.
import * as THREE from 'three';
import { L } from './layout.js';

// pos/look: vị trí máy / điểm nhìn (cm). from/to: máy cẩu, trượt dần từ from tới to trong suốt thời gian giữ góc.
// dwell: nhân thời gian giữ góc; minSec: giữ tối thiểu (máy cẩu cần đủ lâu mới mượt). drift: độ trôi nhẹ.
const SHOTS = {
  // TOÀN CẢNH chính diện: thấy trọn đám đông (cả hàng đầu), bục Top 2–4, DJ, màn LED
  wide: { pos: [0, 720, 1860], look: [0, 80, 20], dwell: 1.4, drift: 0.6 },
  // (bỏ góc trên cao: nhìn từ trên xuống làm lộ ảnh nhân vật 2D trên bục / sau bàn DJ)
  // CẬN NỬA SÀN trái / phải: máy thấp, lướt ngang chậm, thấy rõ mặt từng người + bục Top 3 / Top 4
  sideL: { from: [-780, 430, 1180], to: [-470, 370, 1010], look: [-250, 130, 380], minSec: 7, drift: 0 },
  sideR: { from: [780, 430, 1180], to: [470, 370, 1010], look: [250, 130, 380], minSec: 7, drift: 0 },
  // TOUR DJ: cận DJ, rồi lướt nhanh qua Top 2 → Top 3 → Top 4, kéo lùi về toàn cảnh (mỗi điểm dừng ~1 giây)
  tour: {
    keys: [
      { t: 0, hold: 1.7, pos: [110, 320, -60], look: [0, 235, -585] },
      // máy đặt cao, nhìn chéo xuống qua đầu đám đông để người đứng trước không che bục
      { t: 2.7, hold: 1.1, pos: [-60, 430, 470], look: [0, 175, 110] },
      { t: 4.5, hold: 1.1, pos: [-230, 410, 450], look: [-350, 165, 60] },
      { t: 6.3, hold: 1.1, pos: [230, 410, 450], look: [350, 165, 60] },
      { t: 8.6, hold: 2, pos: [0, 640, 1700], look: [0, 100, 10] }
    ],
    minSec: 10.6, drift: 0, needsTops: true
  },
  // máy cẩu: lướt chéo từ trái (phải) vào chính giữa, hạ dần độ cao, vẫn thấy toàn sàn
  craneL: { from: [-1250, 1050, 1500], to: [-350, 700, 1950], look: [0, 90, 80], minSec: 9, drift: 0 },
  craneR: { from: [1250, 1050, 1500], to: [350, 700, 1950], look: [0, 90, 80], minSec: 9, drift: 0 },
  // trung cảnh sân khấu: bục Top 2–4 + DJ + màn LED, máy đủ cao để đám đông không che bục
  stage: { pos: [0, 470, 1300], look: [0, 230, -420], drift: 1 },
  // tên góc cũ (giữ cho tương thích)
  low: { pos: [0, 470, 1300], look: [0, 230, -420], drift: 1 },
  left: { from: [-1250, 1050, 1500], to: [-350, 700, 1950], look: [0, 90, 80], minSec: 9, drift: 0 },
  right: { from: [1250, 1050, 1500], to: [350, 700, 1950], look: [0, 90, 80], minSec: 9, drift: 0 },
  dj: { pos: [0, 330, -170], look: [0, 280, L.dj.z] },
  // lùi xa, ngang tầm: thấy cả sàn, sân khấu và bầu trời phía sau (pháo hoa)
  sky: { pos: [0, 700, 2300], look: [0, 600, -1000] }
};
const MIN_HOLD = 2500;    // ms: mỗi người được quay ít nhất chừng này dù quà dồn dập
// vòng góc máy: cứ một góc gần là một góc toàn cảnh, máy cẩu xen giữa cho sinh động
const AUTO = ['wide', 'sideL', 'craneL', 'tour', 'wide', 'sideR', 'craneR', 'stage'];

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

  // thời gian giữ một góc (ms) theo cài đặt "mỗi góc máy giữ"
  shotMs(name, every) {
    const s = SHOTS[name] || SHOTS.wide;
    return Math.max(every, s.minSec || 0) * 1000 * (s.dwell || 1);
  }

  // giữ một góc máy trong ms (không tự đổi góc); quà vẫn được áp sát
  hold(name, ms) {
    this.cut(name);
    this.holdUntil = performance.now() + ms;
  }

  // tops: số bục đang có người (club3d cập nhật); tour DJ chỉ chạy khi có ít nhất 2 người trên bục
  nextShot() {
    for (let i = 0; i < AUTO.length; i++) {
      this.idx = (this.idx + 1) % AUTO.length;
      const s = SHOTS[AUTO[this.idx]];
      if (!s.needsTops || (this.tops || 0) >= 2) break;
    }
    this.cut(AUTO[this.idx]);
  }

  // áp sát một vị trí (hàm trả về Vector3 đầu nhân vật) trong ms mili giây.
  // Nhiều quà cùng lúc: mỗi người được giữ ít nhất MIN_HOLD; trong lúc đó chỉ giữ MỘT người chờ kế tiếp,
  // ưu tiên quà giá trị cao hơn (bằng nhau thì lấy người mới nhất). Cùng người tặng tiếp thì kéo dài, không cắt cảnh.
  focusOn(target, ms, force = false, dog = null, meta = null, prio = 0) {
    const now = performance.now();
    const cur = this.focus && now < this.focus.until ? this.focus : null;
    if (cur && dog && cur.dog === dog) {
      cur.until = Math.max(cur.until, now + ms);
      if (meta && prio >= (cur.prio || 0)) { cur.meta = meta; cur.prio = prio; cur.metaAt = now; }
      return;
    }
    const f = { target, ms, until: now + ms, start: now, side: Math.random() < 0.5 ? -1 : 1, dog, meta, prio, metaAt: now };
    if (!force && cur && now - cur.start < MIN_HOLD) {
      if (this.next && this.next.dog === dog) { if (prio >= this.next.prio) Object.assign(this.next, { meta, prio, ms }); return; }
      if (!this.next || prio >= this.next.prio) this.next = f;
      return;
    }
    this.focus = f;
    this.next = null;
  }

  update(dt, { auto = true, every = 12 } = {}) {
    const now = performance.now();
    if (this.next && (!this.focus || now - this.focus.start >= MIN_HOLD)) {
      const n = this.next;
      this.next = null;
      Object.assign(n, { start: now, until: now + n.ms, metaAt: now });
      this.focus = n;
    }
    if (this.focus && now > this.focus.until) this.focus = null;
    const held = now < (this.holdUntil || 0);
    if (auto && !held && !this.focus && now - this.since > this.shotMs(this.shot, every)) this.nextShot();

    let tp;
    let tl;
    let rate;
    this.tourKey = null;
    if (this.focus) {
      const head = this.focus.target();
      if (!head) { this.focus = null; return; }
      tl = head.clone();
      const slot = this.focus.dog?.slot;
      // Top 1 sau bàn DJ: máy đặt trên mép sân khấu (sau lưng bục Top 2) để không bị che
      // đặt máy cao, nhìn chéo xuống để đám đông phía trước không che người được quay
      // lùi đủ xa để thấy trọn người + cánh + vương miện (hiệu ứng làm mờ xung quanh lo phần tập trung)
      // DJ: góc gần ngang tầm, máy cao quá thì ảnh nhân vật (luôn quay mặt về camera) nghiêng ra trước, chân đè lên mặt bàn DJ
      const off = slot === 1 ? [130, 190, 720] : slot ? [160, 250, 520] : [170, 280, 480];
      tp = head.clone().add(new THREE.Vector3(this.focus.side * off[0], off[1], off[2]));
      rate = 3.2;
    } else {
      const s = SHOTS[this.shot] || SHOTS.wide;
      const t = now / 1000;
      if (s.keys) {
        // tour: đứng ở mỗi điểm 'hold' giây rồi trượt êm sang điểm kế tiếp; bám đường đi sát hơn (rate cao)
        const el = (now - this.since) / 1000;
        const ks = s.keys;
        let i = 0;
        while (i < ks.length - 1 && el >= ks[i + 1].t) i++;
        const a = ks[i];
        const b = ks[Math.min(i + 1, ks.length - 1)];
        const span = Math.max(0.001, b.t - a.t - a.hold);
        const p = Math.min(1, Math.max(0, (el - a.t - a.hold) / span));
        const e = p * p * (3 - 2 * p);
        tp = new THREE.Vector3(...a.pos).lerp(new THREE.Vector3(...b.pos), e);
        tl = new THREE.Vector3(...a.look).lerp(new THREE.Vector3(...b.look), e);
        this.tourKey = p < 0.5 ? i : i + 1;   // điểm đang giới thiệu (0 = DJ, 1–3 = Top 2–4, 4 = kéo lùi)
      } else if (s.from) {
        // máy cẩu: trượt êm (nhanh dần rồi chậm dần) từ from tới to trong suốt thời gian giữ góc
        const p = Math.min(1, (now - this.since) / this.shotMs(this.shot, every));
        const e = p * p * (3 - 2 * p);
        tp = new THREE.Vector3(...s.from).lerp(new THREE.Vector3(...s.to), e);
      } else {
        // trôi nhẹ quanh vị trí máy để cảnh không đứng yên
        const k = s.drift ?? 1;
        tp = new THREE.Vector3(...s.pos).add(new THREE.Vector3(Math.sin(t * 0.13) * 90 * k, Math.sin(t * 0.17) * 40 * k, Math.cos(t * 0.11) * 70 * k));
      }
      if (!s.keys) tl = new THREE.Vector3(...s.look);
      rate = s.keys ? 2.8 : 1.4;
    }
    const k = 1 - Math.exp(-dt * rate);
    this.pos.lerp(tp, k);
    this.look.lerp(tl, k);
    this.camera.position.copy(this.pos);
    this.camera.lookAt(this.look);
  }
}
