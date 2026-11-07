// Lớp CSS3D (dùng chung camera với WebGL): nhân vật người xem, bục TOP, cánh, vương miện, DJ mặc định,
// mặt trước bàn DJ có chữ chạy và chữ chạy 3D trên không. Dùng thẻ ảnh nên GIF / WebP động vẫn chạy.
import * as THREE from 'three';
import { CSS3DObject, CSS3DSprite } from 'three/addons/renderers/CSS3DRenderer.js';
import { L, TIERS, rnd, clamp, crowdHalf } from './layout.js';
import { measureBody, measureWings } from './silhouette.js';

const BASE = 'club-assets/';
const BOX_W = 340;            // khung DOM của mỗi nhân vật (px); chân nhân vật = mép dưới khung
const BOX_H = 460;
const IMG_H = 120;            // chiều cao ảnh nhân vật (px) trước khi nhân hệ số
const SCALE = { crowd: 1.0, 1: 1.5, 2: 1.35, 3: 1.25, 4: 1.25 };
const WALK = 95;              // cm / giây
const BUBBLE_MS = 4500;

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export class Cast {
  constructor({ scene, assets, getCfg }) {
    this.scene = scene;          // THREE.Scene của CSS3D
    this.assets = assets;
    this.getCfg = getCfg;
    this.dogs = new Map();
    this.buildDesk();
    this.buildTitle();
    this.buildDefaultDj();
  }

  // ---------------- Bàn DJ: mặt trước có chữ chạy ----------------
  buildDesk() {
    const d = L.desk;
    const box = el('div', 'c3-desk');
    box.style.width = d.w + 'px';
    box.style.height = d.h + 'px';
    this.deskText = this.marquee('c3-desk-text');
    box.append(this.deskText, el('div', 'c3-desk-lights'));
    const obj = new CSS3DObject(box);
    obj.position.set(d.x, L.stage.deckY + d.h / 2, d.z + d.d / 2 + 1);
    this.scene.add(obj);
    this.deskEl = box;
  }

  buildTitle() {
    const t = L.title;
    const box = el('div', 'c3-title');
    box.style.width = t.w + 'px';
    box.style.height = t.h + 'px';
    this.titleText = this.marquee('c3-title-text');
    box.appendChild(this.titleText);
    const obj = new CSS3DObject(box);
    obj.position.set(0, t.y, t.z);
    this.scene.add(obj);
    this.titleEl = box;
  }

  buildDefaultDj() {
    const box = el('div', 'c3-box');
    box.style.width = BOX_W + 'px';
    box.style.height = BOX_H + 'px';
    this.djImg = el('img', 'c3-djimg');
    this.djImg.alt = '';
    this.djImg.draggable = false;
    box.appendChild(this.djImg);
    this.dj = new CSS3DSprite(box);
    this.dj.scale.setScalar(1.3);
    this.dj.position.set(L.dj.x, L.stage.deckY + (BOX_H / 2) * 1.3 + 40, L.dj.z);
    this.scene.add(this.dj);
  }

  applyAssets() {
    const a = this.assets;
    this.hasDefaultDj = !!a.dj.file;
    if (this.hasDefaultDj) { this.djImg.src = BASE + a.dj.file; this.djImg.style.width = a.dj.width + 'px'; }
    this.djImg.classList.toggle('hidden', !this.hasDefaultDj);
    for (const d of this.dogs.values()) {
      this.setChar(d, d.charIdx < a.characters.length ? d.charIdx : Math.floor(Math.random() * a.characters.length));
      if (d.slot) this.setWings(d, d.slot);
    }
  }

  marquee(cls) {
    const box = el('div', 'c3-mq ' + cls);
    box.appendChild(el('span'));
    return box;
  }

  setMarquee(box, text, speed) {
    const span = box.firstChild;
    if (span._text === text && span._ok) return;
    span._text = text;
    span.textContent = `${text}     ✦     ${text}     ✦     `;
    const w = span.scrollWidth / 2;
    span._ok = w > 0;
    span.style.animationDuration = (w > 0 ? w / speed : Math.max(10, text.length * 0.3)) + 's';
  }

  setTexts(title, desk) {
    this.setMarquee(this.titleText, title, 260);
    this.setMarquee(this.deskText, desk, 110);
  }

  // ---------------- Nhân vật ----------------
  cleanName(n) {
    let s = String(n || '').replace(/[\u0000-\u001f]/g, '').trim();
    const words = String(this.getCfg().filterWords || '').split(',').map((w) => w.trim().toLowerCase()).filter(Boolean);
    for (const w of words) if (s.toLowerCase().includes(w)) s = 'Bạn';
    return s.slice(0, 22) || 'Bạn';
  }

  get(key) { return this.dogs.get(key); }

  spawn(key, user, cam) {
    this.trim(cam);
    const box = el('div', 'c3-box' + (this.focusKey ? ' c3-dim' : ''));
    box.style.width = BOX_W + 'px';
    box.style.height = BOX_H + 'px';
    const col = el('div', 'c3-col');
    const bubble = el('div', 'c-bubble');
    const badge = el('div', 'c-badge');
    const tag = el('div', 'c-tag');
    const name = this.cleanName(user?.nickname || user?.uniqueId);
    const pts = el('span', 'c-pts');
    tag.append(el('span', 'c-name', name), pts);
    const body = el('div', 'c-body');
    const img = el('img', 'c-img');
    img.alt = '';
    img.draggable = false;
    body.appendChild(img);
    col.append(bubble, badge, tag, body);
    box.appendChild(col);
    const sprite = new CSS3DSprite(box);
    const fromLeft = Math.random() < 0.5;
    const d = {
      key, name, box, col, bubble, badge, tag, pts, body, img, sprite, wings: null, crown: null, charIdx: 0, faces: 'right',
      x: 0, z: rnd(L.crowd.z0, L.crowd.z1), y: 0,
      tx: 0, tz: 0, ty: 0, slot: null, scale: SCALE.crowd, flip: false, points: 0, active: Date.now(),
      nextMove: 0, busyUntil: 0, bubbleTimer: 0, danceTimer: 0, avatarSet: false, fly: 0
    };
    const half = crowdHalf(d.z);
    d.x = (fromLeft ? -1 : 1) * (half + 420);     // chạy vào từ ngoài khung
    d.tx = (fromLeft ? -1 : 1) * rnd(0, half);
    d.tz = d.z;
    d.run = true;
    this.setAvatar(d, user?.avatar);
    this.setChar(d, Math.floor(Math.random() * this.assets.characters.length));
    this.place(d);
    this.scene.add(sprite);
    this.dogs.set(key, d);
    return d;
  }

  setAvatar(d, url) {
    // ảnh TikTok (https) hoặc ảnh thử của app (/club-demo-avatar/…)
    if (d.avatarSet || typeof url !== 'string' || !(url.startsWith('https://') || url.startsWith('/club-demo-avatar/'))) return;
    d.avatarUrl = url;
    const av = el('img', 'c-av');
    av.referrerPolicy = 'no-referrer';
    av.src = url;
    av.onerror = () => av.remove();
    d.tag.prepend(av);
    d.avatarSet = true;
  }

  setChar(d, idx) {
    const c = this.assets.characters[idx] || this.assets.characters[0];
    d.charIdx = this.assets.characters.indexOf(c);
    d.faces = c.faces;
    d.img.src = BASE + c.file;
    d.img.style.height = Math.round(IMG_H * c.height) + 'px';
    // ảnh có khoảng trống dưới chân: kéo ảnh xuống để chân chạm sàn
    d.img.style.marginBottom = c.feet ? -Math.round(IMG_H * c.height * c.feet) + 'px' : '';
    if (d.wings) this.layoutWings(d);
  }

  swapChar(d) {
    const n = this.assets.characters.length;
    if (n > 1) this.setChar(d, (d.charIdx + 1 + Math.floor(Math.random() * (n - 1))) % n);
  }

  // số nhân vật tối đa: theo cài đặt, nhưng có thể bị hạ tạm (capOverride) khi máy không theo kịp
  maxDogs() {
    const max = clamp(Math.round(this.getCfg().clubMaxDogs || 40), 5, 120);
    return this.capOverride ? Math.min(max, this.capOverride) : max;
  }

  // bớt người ít hoạt động nhất cho tới khi còn n (không đụng người trên bục / đang được quay)
  trimTo(n, cam) {
    while (this.dogs.size > n) {
      let oldest = null;
      for (const d of this.dogs.values()) {
        if (d.slot || d === cam) continue;
        if (!oldest || d.active < oldest.active) oldest = d;
      }
      if (!oldest) return;
      this.remove(oldest);
    }
  }

  trim(cam) {
    const max = this.maxDogs();
    while (this.dogs.size >= max) {
      let oldest = null;
      for (const d of this.dogs.values()) {
        if (d.slot || d === cam) continue;
        if (!oldest || d.active < oldest.active) oldest = d;
      }
      if (!oldest) return;
      this.remove(oldest);
    }
  }

  remove(d) {
    this.dogs.delete(d.key);
    clearTimeout(d.bubbleTimer);
    clearTimeout(d.danceTimer);
    d.box.classList.add('out');
    setTimeout(() => this.scene.remove(d.sprite), 700);
  }

  // vị trí chân (y = mặt sàn / mặt bục) theo vị trí hiện tại
  groundAt(d) {
    if (d.slot === 1) return L.stage.deckY;
    if (d.slot) return L.slots[d.slot].h;
    return 0;
  }

  place(d) {
    const s = d.scale;
    d.sprite.scale.setScalar(s);
    d.sprite.position.set(d.x, d.y + (BOX_H / 2) * s, d.z);
  }

  headPos(d) {
    return new THREE.Vector3(d.x, d.y + (IMG_H * 0.75) * d.scale, d.z);
  }

  feetPos(d) { return new THREE.Vector3(d.x, d.y, d.z); }

  say(d, text) {
    d.bubble.textContent = String(text).slice(0, 70);
    d.bubble.classList.add('on');
    clearTimeout(d.bubbleTimer);
    d.bubbleTimer = setTimeout(() => d.bubble.classList.remove('on'), BUBBLE_MS);
  }

  dance(d, ms = 4000) {
    d.body.classList.add('dance');
    clearTimeout(d.danceTimer);
    d.danceTimer = setTimeout(() => d.body.classList.remove('dance'), ms);
  }

  // tim bay lên: mỗi người tối đa ~1 tim / 0,7 giây, cả sàn tối đa 12 tim / giây (phòng đông thả tim liên tục)
  heart(d) {
    const now = performance.now();
    if (now - (d.lastHeart || 0) < 700) return;
    if (!this.heartWin || now - this.heartWin.at > 1000) this.heartWin = { at: now, n: 0 };
    if (this.heartWin.n >= 12) return;
    this.heartWin.n++;
    d.lastHeart = now;
    const h = el('div', 'c-heart', '❤️');
    h.style.left = rnd(30, 70) + '%';
    d.body.appendChild(h);
    setTimeout(() => h.remove(), 1500);
  }

  walkTo(d, x, z) {
    if (d.slot) return;
    d.tz = clamp(z, L.crowd.z0 - 40, L.crowd.z1);
    const half = crowdHalf(d.tz);
    d.tx = clamp(x, -half, half);
    d.nextMove = Date.now() + 2500 + rnd(1500, 6000);
  }

  // ---------------- Cánh / vương miện / chữ TOP ----------------
  // Cánh mọc ra từ vai thật của nhân vật (đo bằng silhouette.js), xoè ra hai bên, vỗ theo nhịp nhạc.
  // Lên bục: cánh bung ra kèm loé sáng và lông vũ bắn ra; luôn có quầng sáng màu hạng sau lưng và bụi sáng rơi từ cánh.
  setWings(d, slot) {
    if (d.wings) d.wings.remove();
    d.wings = null;
    if (d.crown) d.crown.remove();
    d.crown = null;
    if (!slot) return;
    const T = TIERS[slot];
    const w = this.assets.wings || {};
    const file = w[T.key] || w.pair || '';
    const box = el('div', 'c3-wings s' + slot + ' unfold');
    box.style.setProperty('--glow', T.glow);
    box.style.setProperty('--beat', (60 / clamp(Number(this.getCfg().clubBpm) || 124, 60, 180)).toFixed(3) + 's');
    box.appendChild(el('div', 'c3-aura'));
    const tint = file && !w[T.key];   // ảnh riêng từng hạng thì giữ màu gốc
    for (const side of ['l', 'r']) {
      const wing = el('div', 'c3-wing ' + side + (file ? '' : ' fallback'));
      if (file) {
        wing.style.backgroundImage = `url("${BASE + file}")`;
        if (tint) wing.style.filter = T.filter;
      }
      for (let i = 0; i < 4; i++) {
        const s = el('i', 'c3-dust');
        s.style.setProperty('--i', i);
        wing.appendChild(s);
      }
      box.appendChild(wing);
    }
    box.appendChild(el('div', 'c3-flash'));
    for (let i = 0; i < 14; i++) {
      const f = el('i', 'c3-feather');
      const a = rnd(-Math.PI * 0.95, -Math.PI * 0.05);
      const r = rnd(90, 210);
      f.style.setProperty('--dx', (Math.cos(a) * r).toFixed(0) + 'px');
      f.style.setProperty('--dy', (Math.sin(a) * r * 0.8 + 60).toFixed(0) + 'px');
      f.style.setProperty('--r', rnd(-260, 260).toFixed(0) + 'deg');
      f.style.animationDelay = rnd(0.15, 0.4).toFixed(2) + 's';
      box.appendChild(f);
    }
    setTimeout(() => {
      box.classList.remove('unfold');
      box.querySelectorAll('.c3-feather, .c3-flash').forEach((e) => e.remove());
    }, 1800);
    d.body.prepend(box);
    d.wings = box;
    d.wingFile = file;
    if (slot === 1 && this.assets.crown) {
      const c = el('img', 'c3-crown');
      c.src = BASE + this.assets.crown;
      c.alt = '';
      d.body.appendChild(c);
      d.crown = c;
    }
    this.layoutWings(d);
  }

  wingImage(file) {
    this.wingImgs ||= new Map();
    let im = this.wingImgs.get(file);
    if (!im) { im = new Image(); im.src = BASE + file; this.wingImgs.set(file, im); }
    return im;
  }

  // đặt cánh theo dáng thật của ảnh nhân vật đang dùng (gọi lại khi đổi nhân vật)
  layoutWings(d) {
    const box = d.wings;
    if (!box) return;
    const img = d.img;
    const wimg = d.wingFile ? this.wingImage(d.wingFile) : null;
    if (!img.complete || !img.naturalWidth || (wimg && (!wimg.complete || !wimg.naturalWidth))) {
      Promise.all([img.decode(), wimg?.decode()]).then(() => { if (d.wings === box) this.layoutWings(d); }).catch(() => {});
      return;
    }
    const c = this.assets.characters[d.charIdx] || {};
    const H = IMG_H * (c.height || 1);
    const Wd = (H * img.naturalWidth) / img.naturalHeight;
    const m = measureBody(img);
    const flip = d.faces === 'left' ? !d.flip : d.flip;
    const fx = (v) => (flip ? 1 - v : v) * Wd;
    const top = m.top * H;
    const bh = (m.bottom - m.top) * H;
    const cx = fx(m.cx);
    const ay = m.shoulder * H;                    // điểm gắn cánh
    const half = m.half * Wd;
    const size = { 1: 1.3, 2: 1.12, 3: 1, 4: 1 }[d.slot] || 1;
    const Hw = bh * size;
    const wm = wimg ? measureWings(wimg) : null;
    Object.assign(box.style, { width: Wd + 'px', height: H + 'px' });
    box.style.setProperty('--ox', cx + 'px');
    box.style.setProperty('--oy', ay + 'px');
    for (const wing of box.querySelectorAll('.c3-wing')) {
      const side = wing.classList.contains('l') ? 'l' : 'r';
      const b = wm ? wm[side] : { x0: side === 'l' ? 0 : 0.5, x1: side === 'l' ? 0.5 : 1, y0: 0, y1: 1, rootY: 0.3 };
      const aspect = wimg ? ((b.x1 - b.x0) * wimg.naturalWidth) / ((b.y1 - b.y0) * wimg.naturalHeight) : 0.55;
      const Ww = Hw * aspect * 1.12;
      const sx = Ww / (b.x1 - b.x0);
      const sy = Hw / (b.y1 - b.y0);
      const ry = ((b.rootY - b.y0) / (b.y1 - b.y0)) * Hw;
      const tuck = half * 0.55;                   // gốc cánh nấp sau thân
      Object.assign(wing.style, {
        width: Ww + 'px', height: Hw + 'px', top: ay - ry + 'px',
        left: (side === 'l' ? cx - tuck - Ww : cx + tuck) + 'px',
        transformOrigin: (side === 'l' ? Ww : 0) + 'px ' + ry + 'px'
      });
      if (wimg) Object.assign(wing.style, { backgroundSize: `${sx}px ${sy}px`, backgroundPosition: `${-b.x0 * sx}px ${-b.y0 * sy}px` });
    }
    const aura = box.querySelector('.c3-aura');
    const ar = bh * 0.95;
    Object.assign(aura.style, { width: ar * 2 + 'px', height: ar * 2 + 'px', left: cx - ar + 'px', top: top + bh * 0.5 - ar + 'px' });
    const flash = box.querySelector('.c3-flash');
    if (flash) Object.assign(flash.style, { left: cx - 30 + 'px', top: ay - 30 + 'px' });
    box.querySelectorAll('.c3-feather').forEach((f) => Object.assign(f.style, { left: cx + 'px', top: ay + 'px' }));
    if (d.crown) {
      const cw = clamp(H * 0.42, 34, 90);
      Object.assign(d.crown.style, { width: cw + 'px', left: fx(m.headCx) - cw / 2 + 'px', top: top - cw * 0.55 + 'px', transform: 'rotate(-8deg)' });
    }
  }

  toSlot(d, slot) {
    d.slot = slot;
    d.busyUntil = Infinity;
    d.flip = false;
    d.box.classList.remove('s1', 's2', 's3', 's4');
    d.box.classList.add('podium', 's' + slot);
    d.badge.textContent = TIERS[slot].label;
    d.badge.className = 'c-badge on t' + slot;
    this.setWings(d, slot);
    if (slot === 1) { d.tx = L.dj.x; d.tz = L.dj.z; } else { d.tx = L.slots[slot].x; d.tz = L.slots[slot].z; }
    d.fly = 1;   // bay tới bục
    d.scaleTarget = SCALE[slot];
  }

  leaveSlot(d) {
    d.slot = null;
    d.busyUntil = 0;
    this.setWings(d, null);
    d.badge.className = 'c-badge';
    d.badge.textContent = '';
    d.box.classList.remove('podium', 's1', 's2', 's3', 's4');
    d.tz = rnd(L.crowd.z0, L.crowd.z1);
    d.tx = rnd(-1, 1) * crowdHalf(d.tz);
    d.fly = 1;
    d.scaleTarget = SCALE.crowd;
    d.nextMove = Date.now() + 3000;
  }

  // ---------------- Cập nhật mỗi khung hình ----------------
  update(dt, camera) {
    const now = Date.now();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const tmp = new THREE.Vector3();
    const ndc = new THREE.Vector3();
    for (const d of this.dogs.values()) {
      // tự đi lại trong đám đông
      if (!d.slot && now > d.busyUntil && now > d.nextMove) this.walkTo(d, d.x + rnd(-220, 220), d.z + rnd(-150, 150));
      const dx = d.tx - d.x;
      const dz = d.tz - d.z;
      const dist = Math.hypot(dx, dz);
      const ground = this.groundAt(d);
      if (d.fly > 0) {
        // bay: lướt theo đường cong lên cao rồi hạ xuống bục / sàn
        const k = Math.min(1, dt * 1.6);
        d.x += dx * k;
        d.z += dz * k;
        const lift = Math.min(160, dist * 0.35);
        d.y += (ground + lift - d.y) * Math.min(1, dt * 4);
        d.scale += ((d.scaleTarget || SCALE.crowd) - d.scale) * Math.min(1, dt * 3);
        if (dist < 6) { d.fly = 0; d.x = d.tx; d.z = d.tz; }
      } else {
        if (dist > 2) {
          const step = Math.min(dist, WALK * dt * (d.run ? 3 : 1));
          d.x += (dx / dist) * step;
          d.z += (dz / dist) * step;
        } else d.run = false;
        d.y += (ground - d.y) * Math.min(1, dt * 6);
      }
      // quay mặt theo hướng đi so với camera
      if (dist > 4 && !d.slot) {
        const sx = dx * right.x + dz * right.z;
        if (Math.abs(sx) > 2) d.flip = sx < 0;
      }
      const flip = d.faces === 'left' ? !d.flip : d.flip;
      d.body.classList.toggle('flip', flip);
      this.place(d);
      // ẩn nhân vật ở sau / quá sát camera (CSS3D không tự cắt như WebGL)
      tmp.set(d.x, d.y + 80, d.z).sub(camera.position);
      const ahead = tmp.dot(fwd);
      // ngoài khung hình (lúc camera áp sát phần lớn đám đông nằm ngoài): ẩn hẳn để máy khỏi vẽ
      ndc.set(d.x, d.y + 90 * d.scale, d.z).project(camera);
      const hide = ahead < 160 || Math.abs(ndc.x) > 1.35 || ndc.y < -1.5 || ndc.y > 1.9;
      if (hide !== d.hidden) { d.hidden = hide; d.box.style.visibility = hide ? 'hidden' : ''; }
    }
  }

  // Camera áp sát một nhân vật: mọi nhân vật khác mờ, tối, nhạt màu; chữ chạy và bàn DJ cũng mờ
  // (trừ khi đang quay chính DJ đứng sau bàn). Người được quay sáng viền và nhún lên một cái.
  setFocus(d) {
    const prev = this.focusKey;
    this.focusKey = d ? d.key : null;
    for (const x of this.dogs.values()) {
      x.box.classList.toggle('c3-dim', !!d && x !== d);
      x.box.classList.toggle('c3-focus', x === d);
    }
    this.titleEl?.classList.toggle('c3-dim', !!d);
    this.deskEl?.classList.toggle('c3-dim', !!d && d.slot !== 1);
    if (d && d.key !== prev) {
      d.box.classList.remove('c3-pop');
      void d.box.offsetWidth;
      d.box.classList.add('c3-pop');
      clearTimeout(d.popTimer);
      d.popTimer = setTimeout(() => d.box.classList.remove('c3-pop'), 900);
    }
  }

  // Top 1 hiện tại (để DJ mặc định ẩn / hiện)
  setDjVisible(v) { this.djImg.classList.toggle('hidden', !v || !this.hasDefaultDj); }
}
