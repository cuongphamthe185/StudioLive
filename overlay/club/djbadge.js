// Ảnh đại diện TikTok của người đang làm DJ (Top 1), hiện ở hai bên màn LED (giữa màn luôn bị DJ và Top 2 che).
// Ảnh tròn như trong TikTok, viền neon xoay, vương miện, dải tên "DJ …". Chưa có DJ: trái tim đập theo nhạc.
// Vẽ nét trên một canvas riêng (không qua lưới điểm LED) để mặt người xem rõ khi phát lên TikTok.
import * as THREE from 'three';
import { L } from './layout.js';

const CW = 512;
const CH = 600;
const FONT = '"Be Vietnam Pro", system-ui, sans-serif';
const WIDTH = 290;          // cm trên sân khấu (vòng tròn ảnh ≈ 190 cm)
const X = 312;              // tâm hai huy hiệu, cách giữa màn LED (phần giữa màn bị DJ và Top 2 che)
const Y = 300;

// ảnh TikTok đi qua server của app (cùng nguồn, vẽ được lên WebGL); ảnh thử có sẵn trên server
export function avatarSrc(url) {
  if (typeof url !== 'string') return '';
  if (url.startsWith('/club-demo-avatar/')) return url;
  if (url.startsWith('https://')) return '/club-avatar?u=' + encodeURIComponent(url);
  return '';
}

export class DjBadge {
  constructor(scene) {
    this.canvas = Object.assign(document.createElement('canvas'), { width: CW, height: CH });
    this.g = this.canvas.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.mat = new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, depthWrite: false, toneMapped: false, color: new THREE.Color(1.25, 1.25, 1.25) });
    const h = (WIDTH * CH) / CW;
    this.meshes = [-1, 1].map((side) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(WIDTH, h), this.mat);
      m.position.set(side * X, Y, L.led.z + 5);
      m.renderOrder = 1;
      scene.add(m);
      return m;
    });
    this.dj = null;
    this.key = null;
    this.img = null;
    this.changedAt = -1e9;
    this.lastDraw = 0;
    this.setDj(null);
  }

  // dj = { name, avatar } hoặc null
  setDj(dj) {
    const key = dj ? dj.name + '|' + (dj.avatar || '') : '';
    if (key === this.key) return;
    this.key = key;
    this.dj = dj;
    this.img = null;
    this.changedAt = performance.now();
    const src = dj && avatarSrc(dj.avatar);
    if (src) {
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => { if (this.dj === dj) this.img = im; };
      im.src = src;
    }
  }

  // dim: màn LED đang hiện lời cảm ơn / thông báo -> làm mờ để chữ trên LED đọc được
  update(t, pulse, dim) {
    const target = dim ? 0.12 : 1;
    this.mat.opacity += (target - this.mat.opacity) * 0.15;
    const now = performance.now();
    if (now - this.lastDraw < 66) return;   // vẽ lại ~15 lần/giây là đủ mượt cho viền xoay, đỡ tốn máy
    this.lastDraw = now;
    this.draw(t, pulse, (now - this.changedAt) / 1000);
    this.tex.needsUpdate = true;
  }

  draw(t, pulse, age) {
    const g = this.g;
    g.clearRect(0, 0, CW, CH);
    // bật ra khi đổi DJ
    const pop = age < 0.6 ? 0.6 + 0.4 * (1 - Math.pow(1 - age / 0.6, 3)) + Math.sin(age * 18) * 0.06 * (1 - age / 0.6) : 1;
    g.save();
    g.translate(CW / 2, 250);
    g.scale(pop, pop);
    g.translate(-CW / 2, -250);
    g.fillStyle = 'rgba(8,3,20,.78)';
    g.beginPath();
    g.arc(CW / 2, 250, 214, 0, Math.PI * 2);
    g.fill();
    if (this.dj) this.drawDj(t, pulse); else this.drawHeart(t, pulse);
    g.restore();
  }

  drawDj(t, pulse) {
    const g = this.g;
    const cx = CW / 2;
    const cy = 250;
    const R = 168;
    // quầng sáng
    const glow = g.createRadialGradient(cx, cy, R * 0.9, cx, cy, R + 70);
    glow.addColorStop(0, `rgba(190,90,255,${0.55 + pulse * 0.3})`);
    glow.addColorStop(1, 'rgba(190,90,255,0)');
    g.fillStyle = glow;
    g.beginPath();
    g.arc(cx, cy, R + 70, 0, Math.PI * 2);
    g.fill();
    // viền neon xoay
    const ring = g.createConicGradient(t * 1.6, cx, cy);
    ['#a855f7', '#ec4899', '#facc15', '#22d3ee', '#a855f7'].forEach((c, i, a) => ring.addColorStop(i / (a.length - 1), c));
    g.lineWidth = 22;
    g.strokeStyle = ring;
    g.beginPath();
    g.arc(cx, cy, R + 13, 0, Math.PI * 2);
    g.stroke();
    // ảnh đại diện (cắt tròn, phủ kín)
    g.save();
    g.beginPath();
    g.arc(cx, cy, R, 0, Math.PI * 2);
    g.clip();
    const im = this.img;
    if (im && im.naturalWidth) {
      const s = Math.max((2 * R) / im.naturalWidth, (2 * R) / im.naturalHeight);
      const w = im.naturalWidth * s;
      const h = im.naturalHeight * s;
      g.drawImage(im, cx - w / 2, cy - h / 2, w, h);
    } else {
      const bg = g.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
      bg.addColorStop(0, '#7c3aed');
      bg.addColorStop(1, '#db2777');
      g.fillStyle = bg;
      g.fillRect(cx - R, cy - R, 2 * R, 2 * R);
      g.fillStyle = '#fff';
      g.font = `900 150px ${FONT}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(initials(this.dj.name), cx, cy + 6);
    }
    g.restore();
    // vương miện
    crown(g, cx, cy - R - 30, 1 + pulse * 0.06);
    // dải tên
    const name = 'DJ ' + this.dj.name;
    g.font = `900 52px ${FONT}`;
    let size = 52;
    while (g.measureText(name).width > CW - 70 && size > 26) { size -= 2; g.font = `900 ${size}px ${FONT}`; }
    const tw = Math.min(CW - 40, g.measureText(name).width + 56);
    const by = cy + R + 34;
    const rb = g.createLinearGradient(cx - tw / 2, 0, cx + tw / 2, 0);
    rb.addColorStop(0, '#6d28d9');
    rb.addColorStop(1, '#be185d');
    g.fillStyle = rb;
    roundRect(g, cx - tw / 2, by, tw, 70, 35);
    g.fill();
    g.lineWidth = 4;
    g.strokeStyle = 'rgba(255,255,255,.85)';
    g.stroke();
    g.fillStyle = '#fff';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(name, cx, by + 37, CW - 60);
  }

  drawHeart(t, pulse) {
    const g = this.g;
    const cx = CW / 2;
    const cy = 245;
    const s = 9.2 * (1 + pulse * 0.1);
    g.save();
    g.shadowColor = '#ff2d95';
    g.shadowBlur = 40;
    const hg = g.createRadialGradient(cx - 40, cy - 60, 10, cx, cy, 190);
    hg.addColorStop(0, '#ffd1e3');
    hg.addColorStop(0.45, '#ff4d8d');
    hg.addColorStop(1, '#c2185b');
    g.fillStyle = hg;
    g.beginPath();
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      const x = cx + 16 * Math.sin(a) ** 3 * s;
      const y = cy - (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * s;
      if (i) g.lineTo(x, y); else g.moveTo(x, y);
    }
    g.closePath();
    g.fill();
    g.shadowBlur = 0;
    g.lineWidth = 6;
    g.strokeStyle = 'rgba(255,255,255,.9)';
    g.stroke();
    g.restore();
    g.fillStyle = '#fff';
    g.font = `900 64px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('DJ?', cx, cy - 4);
    // dải chữ mời
    const by = 440;
    g.fillStyle = 'rgba(20,6,40,.85)';
    roundRect(g, 46, by, CW - 92, 64, 32);
    g.fill();
    g.lineWidth = 4;
    g.strokeStyle = `rgba(255,77,141,${0.6 + pulse * 0.4})`;
    g.stroke();
    g.fillStyle = '#ffd1e3';
    g.font = `900 40px ${FONT}`;
    g.fillText('TẶNG QUÀ ĐỂ LÊN DJ', cx, by + 34, CW - 110);
  }
}

function initials(name) {
  const w = String(name || '?').trim().split(/\s+/).filter(Boolean);
  const s = w.length > 1 ? w[0][0] + w[w.length - 1][0] : (w[0] || '?').slice(0, 2);
  return s.toUpperCase();
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function crown(g, x, y, s) {
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  g.shadowColor = '#facc15';
  g.shadowBlur = 18;
  const cg = g.createLinearGradient(0, -40, 0, 30);
  cg.addColorStop(0, '#fff3b0');
  cg.addColorStop(1, '#f59e0b');
  g.fillStyle = cg;
  g.beginPath();
  g.moveTo(-58, 28);
  g.lineTo(-64, -22);
  g.lineTo(-30, 2);
  g.lineTo(0, -40);
  g.lineTo(30, 2);
  g.lineTo(64, -22);
  g.lineTo(58, 28);
  g.closePath();
  g.fill();
  g.shadowBlur = 0;
  g.lineWidth = 4;
  g.strokeStyle = '#7c2d12';
  g.stroke();
  g.fillStyle = '#ef4444';
  for (const px of [-32, 0, 32]) { g.beginPath(); g.arc(px, 16, 7, 0, Math.PI * 2); g.fill(); }
  g.restore();
}
