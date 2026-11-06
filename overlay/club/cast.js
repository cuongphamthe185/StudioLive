// Lớp CSS3D (dùng chung camera với WebGL): nhân vật người xem, bục TOP, cánh, vương miện, DJ mặc định,
// mặt trước bàn DJ có chữ chạy và chữ chạy 3D trên không. Dùng thẻ ảnh nên GIF / WebP động vẫn chạy.
import * as THREE from 'three';
import { CSS3DObject, CSS3DSprite } from 'three/addons/renderers/CSS3DRenderer.js';
import { L, TIERS, rnd, clamp, crowdHalf } from './layout.js';

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
    this.djImg.src = BASE + a.dj.file;
    this.djImg.style.width = a.dj.width + 'px';
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
    const box = el('div', 'c3-box');
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
    if (d.avatarSet || typeof url !== 'string' || !url.startsWith('https://')) return;
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
  }

  swapChar(d) {
    const n = this.assets.characters.length;
    if (n > 1) this.setChar(d, (d.charIdx + 1 + Math.floor(Math.random() * (n - 1))) % n);
  }

  trim(cam) {
    const max = clamp(Math.round(this.getCfg().clubMaxDogs || 40), 5, 120);
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

  heart(d) {
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
  setWings(d, slot) {
    if (d.wings) d.wings.remove();
    d.wings = null;
    if (d.crown) d.crown.remove();
    d.crown = null;
    if (!slot) return;
    const T = TIERS[slot];
    const w = this.assets.wings || {};
    const file = w[T.key] || w.pair || '';
    const box = el('div', 'c3-wings s' + slot);
    box.style.setProperty('--glow', T.glow);
    if (file) {
      // ảnh một cặp cánh: tách đôi để mỗi bên vỗ riêng; ảnh riêng từng hạng thì không cần đổi màu
      const tint = !w[T.key];
      for (const side of ['l', 'r']) {
        const half = el('div', 'c3-wing ' + side);
        half.style.backgroundImage = `url("${BASE + file}")`;
        if (tint) half.style.filter = T.filter;
        box.appendChild(half);
      }
    } else {
      box.classList.add('fallback');
      for (const side of ['l', 'r']) box.appendChild(el('div', 'c3-wing ' + side));
    }
    d.body.prepend(box);
    d.wings = box;
    if (slot === 1 && this.assets.crown) {
      const c = el('img', 'c3-crown');
      c.src = BASE + this.assets.crown;
      c.alt = '';
      d.body.appendChild(c);
      d.crown = c;
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
      if (dist > 4) {
        const sx = dx * right.x + dz * right.z;
        if (Math.abs(sx) > 2) d.flip = sx < 0;
      }
      const flip = d.faces === 'left' ? !d.flip : d.flip;
      d.body.classList.toggle('flip', flip);
      this.place(d);
      // ẩn nhân vật ở sau / quá sát camera (CSS3D không tự cắt như WebGL)
      tmp.set(d.x, d.y + 80, d.z).sub(camera.position);
      const ahead = tmp.dot(fwd);
      const hide = ahead < 160;
      if (hide !== d.hidden) { d.hidden = hide; d.box.style.visibility = hide ? 'hidden' : ''; }
    }
  }

  // Top 1 hiện tại (để DJ mặc định ẩn / hiện)
  setDjVisible(v) { this.djImg.classList.toggle('hidden', !v); }
}
