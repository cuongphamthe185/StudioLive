// Nội dung màn hình LED lớn sau DJ: vẽ ở độ phân giải điểm LED (184 × 86), world.js đưa lên màn bằng shader điểm sáng.
// Nội dung xen kẽ: ảnh (của bạn / mặc định), tên sàn, cột nhạc, hình DJ "quay trực tiếp"; tin nhắn ưu tiên đè lên trên.
import { L, clamp } from './layout.js';

const FONT = '"Be Vietnam Pro", system-ui, sans-serif';

export class LedScreen {
  constructor() {
    this.w = L.led.cols;
    this.h = L.led.rows;
    this.canvas = Object.assign(document.createElement('canvas'), { width: this.w, height: this.h });
    this.g = this.canvas.getContext('2d');
    this.prev = Object.assign(document.createElement('canvas'), { width: this.w, height: this.h });
    this.pg = this.prev.getContext('2d');
    this.list = [{ type: 'logo' }];
    this.order = [];
    this.item = null;
    this.since = 0;
    this.wipeAt = -1e9;
    this.sec = 8;
    this.msgs = [];
    this.msg = null;
    this.msgUntil = 0;
    this.name = 'DJ CLUB';
    this.dj = null;
    this.bars = new Array(24).fill(0);
    this.images = new Map();
    this.sig = '';
  }

  loadImage(src) {
    let im = this.images.get(src);
    if (!im) {
      im = new Image();
      im.src = src;
      this.images.set(src, im);
    }
    return im;
  }

  setPlaylist(items, sec) {
    this.sec = clamp(Number(sec) || 8, 3, 60);
    const sig = JSON.stringify(items);
    if (sig === this.sig) return;
    this.sig = sig;
    this.list = items.map((it) => (it.type === 'image' ? { type: 'image', img: this.loadImage(it.src) } : it));
    this.order = [];
    this.item = null;
  }

  setName(n) { this.name = String(n || 'DJ CLUB').toUpperCase(); }
  setDj(dj) { this.dj = dj; }   // { img: HTMLImageElement, name } hoặc null
  next() { this.since = -1e9; }

  message(m) {
    if (!m) return;
    const item = { title: String(m.title || ''), line: String(m.line || ''), sub: String(m.sub || ''), color: m.color || '#ffd60a', ms: m.ms || 4000 };
    if (m.priority) this.msgs.unshift(item); else this.msgs.push(item);
    if (this.msgs.length > 4) this.msgs.length = 4;
  }

  nextItem(now) {
    const list = this.list.filter((it) => it.type !== 'dj' || this.dj);
    if (!list.length) list.push({ type: 'logo' });
    if (!this.order.length) {
      this.order = list.map((_, i) => i).sort(() => Math.random() - 0.5);
      this.orderList = list;
    }
    if (this.item) { this.pg.clearRect(0, 0, this.w, this.h); this.pg.drawImage(this.canvas, 0, 0); this.wipeAt = now; }
    this.item = (this.orderList || list)[this.order.shift()] || { type: 'logo' };
    this.since = now;
  }

  cover(im) {
    const g = this.g;
    const s = Math.max(this.w / im.naturalWidth, this.h / im.naturalHeight);
    const sw = this.w / s;
    const sh = this.h / s;
    g.drawImage(im, (im.naturalWidth - sw) / 2, (im.naturalHeight - sh) / 2, sw, sh, 0, 0, this.w, this.h);
  }

  textLine(text, y, size, color, t, speed = 34) {
    const g = this.g;
    g.font = `900 ${size}px ${FONT}`;
    g.textBaseline = 'middle';
    g.fillStyle = color;
    const tw = g.measureText(text).width;
    if (tw <= this.w - 6) { g.textAlign = 'center'; g.fillText(text, this.w / 2, y); return; }
    g.textAlign = 'left';
    g.fillText(text, this.w - ((t * speed) % (tw + this.w)), y);
  }

  renderItem(it, t, pulse) {
    const g = this.g;
    const { w, h } = this;
    if (it.type === 'image' && it.img.complete && it.img.naturalWidth) { this.cover(it.img); return; }
    if (it.type === 'viz') {
      g.fillStyle = '#05010f';
      g.fillRect(0, 0, w, h);
      const n = this.bars.length;
      const bw = w / n;
      for (let i = 0; i < n; i++) {
        const target = (0.2 + 0.8 * Math.abs(Math.sin(t * (1.3 + i * 0.29) + i))) * (0.55 + pulse * 0.45);
        this.bars[i] += (target - this.bars[i]) * 0.3;
        const bh = Math.round(this.bars[i] * (h - 8));
        g.fillStyle = `hsl(${(i * 15 + t * 40) % 360},100%,58%)`;
        g.fillRect(Math.round(i * bw) + 1, h - 4 - bh, Math.max(2, Math.round(bw) - 2), bh);
      }
      return;
    }
    if (it.type === 'dj' && this.dj) {
      const hue = (t * 25) % 360;
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, `hsl(${hue},70%,22%)`);
      gr.addColorStop(1, `hsl(${(hue + 80) % 360},70%,10%)`);
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      const im = this.dj.img;
      if (im && im.complete && im.naturalWidth) {
        const ih = h - 16;
        const iw = (im.naturalWidth / im.naturalHeight) * ih;
        g.drawImage(im, (w - iw) / 2 + Math.sin(t * 2) * 3, 4, iw, ih);
      }
      g.fillStyle = 'rgba(0,0,0,.25)';
      for (let y = 0; y < h; y += 2) g.fillRect(0, y, w, 1);
      this.textLine('● LIVE · DJ ' + this.dj.name.toUpperCase(), h - 7, 10, '#fff', t, 30);
      return;
    }
    // logo: tên sàn chữ lớn trên nền đổi màu
    const hue = (t * 30) % 360;
    const gr = g.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, `hsl(${hue},80%,20%)`);
    gr.addColorStop(1, `hsl(${(hue + 120) % 360},80%,12%)`);
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    this.textLine(this.name, h / 2 - 8, 34, `hsl(${(hue + 60) % 360},100%,${70 + pulse * 20}%)`, t, 45);
    this.textLine('THẢ TIM · TẶNG QUÀ · LÊN LÀM DJ', h - 12, 12, 'rgba(255,255,255,.9)', t, 30);
  }

  renderMessage(m, t, now) {
    const g = this.g;
    const { w, h } = this;
    const age = (now - (this.msgUntil - m.ms)) / 1000;
    g.fillStyle = 'rgba(8,0,20,.86)';
    g.fillRect(0, 0, w, h);
    // viền nháy
    g.strokeStyle = m.color;
    g.lineWidth = 2;
    g.globalAlpha = 0.5 + 0.5 * Math.sin(t * 10);
    g.strokeRect(1, 1, w - 2, h - 2);
    g.globalAlpha = 1;
    this.textLine(m.title, 15, 15, m.color, t);
    const s = 1 + Math.max(0, 0.3 - age) * 1.4;
    g.save();
    g.translate(w / 2, h / 2 + 4);
    g.scale(s, s);
    g.translate(-w / 2, -(h / 2 + 4));
    this.textLine(m.line, h / 2 + 4, 26, '#ffffff', t, 40);
    g.restore();
    if (m.sub) this.textLine(m.sub, h - 12, 13, '#fde68a', t, 34);
  }

  render(t, now, pulse) {
    if (!this.item || now - this.since > this.sec * 1000) this.nextItem(now);
    this.renderItem(this.item, t, pulse);
    const wp = (now - this.wipeAt) / 700;
    if (wp < 1) {
      const y = Math.floor(wp * this.h);
      this.g.drawImage(this.prev, 0, y, this.w, this.h - y, 0, y, this.w, this.h - y);
      this.g.fillStyle = 'rgba(255,255,255,.95)';
      this.g.fillRect(0, y, this.w, 1);
    }
    if (!this.msg || now > this.msgUntil) {
      this.msg = this.msgs.shift() || null;
      if (this.msg) this.msgUntil = now + this.msg.ms;
    }
    if (this.msg) this.renderMessage(this.msg, t, now);
  }
}
