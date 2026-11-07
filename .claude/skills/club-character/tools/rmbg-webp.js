// Remove a flat background (flood fill from the edges) from an animated GIF/WebP and write an animated WebP with alpha.
// Env: RB_SRC, RB_TYPE, RB_OUT (webp), RB_SHEET (png preview), RB_TOL (bg colour distance, default 40),
//      RB_STEP (keep every Nth frame, default 1), RB_Q (webp quality 0-1, default 0.85), RB_MAXH (downscale height, 0 = keep)
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
app.whenReady().then(async () => {
  const bytes = fs.readFileSync(process.env.RB_SRC).toString('base64');
  const opt = { type: process.env.RB_TYPE || 'image/gif', tol: +(process.env.RB_TOL || 40), step: +(process.env.RB_STEP || 1), q: +(process.env.RB_Q || 0.85), maxH: +(process.env.RB_MAXH || 0), minArea: +(process.env.RB_MINAREA || 0.002) };
  const win = new BrowserWindow({ show: false, webPreferences: { backgroundThrottling: false } });
  await win.loadFile(__dirname + '/blank.html');
  const r = await win.webContents.executeJavaScript(`(async () => {
    const opt = ${JSON.stringify(opt)};
    const bin = Uint8Array.from(atob(${JSON.stringify(bytes)}), (c) => c.charCodeAt(0));
    const dec = new ImageDecoder({ data: bin, type: opt.type }); await dec.tracks.ready; await dec.completed;
    const n = dec.tracks.selectedTrack.frameCount;
    const c = document.createElement('canvas'); const g = c.getContext('2d', { willReadFrequently: true });
    const frames = []; let W = 0, H = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let i = 0; i < n; i++) {
      const { image } = await dec.decode({ frameIndex: i });
      const dur = Math.round(image.duration / 1000);
      if (i % opt.step) { frames[frames.length - 1].ms += dur; image.close(); continue; }
      W = image.displayWidth; H = image.displayHeight; c.width = W; c.height = H; g.drawImage(image, 0, 0); image.close();
      const id = g.getImageData(0, 0, W, H), d = id.data;
      // background colour = median of the 4 corners
      const cs = [[0, 0], [W - 1, 0], [0, H - 1], [W - 1, H - 1]].map(([x, y]) => { const k = (y * W + x) * 4; return [d[k], d[k + 1], d[k + 2]]; });
      const bg = [0, 1, 2].map((ch) => cs.map((p) => p[ch]).sort((a, b) => a - b)[1]);
      const dist = (k) => Math.hypot(d[k] - bg[0], d[k + 1] - bg[1], d[k + 2] - bg[2]);
      const seen = new Uint8Array(W * H), stack = [];
      const push = (x, y) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const p = y * W + x; if (seen[p]) return; seen[p] = 1; if (dist(p * 4) <= opt.tol) stack.push(p); else seen[p] = 2; };
      for (let x = 0; x < W; x++) { push(x, 0); push(x, H - 1); }
      for (let y = 0; y < H; y++) { push(0, y); push(W - 1, y); }
      while (stack.length) { const p = stack.pop(); d[p * 4 + 3] = 0; const x = p % W, y = (p / W) | 0; push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1); }
      // soften the edge: pixels touching the removed area get alpha by how far they are from the bg colour
      for (let p = 0; p < W * H; p++) if (seen[p] === 2) {
        const k = p * 4, t = Math.min(1, dist(k) / (opt.tol * 3));
        if (t < 1) { d[k + 3] = Math.round(255 * t); for (let ch = 0; ch < 3; ch++) d[k + ch] = Math.max(0, Math.min(255, Math.round((d[k + ch] - bg[ch] * (1 - t)) / Math.max(t, 0.05)))); }
      }
      // drop small detached specks (GIF dither noise left in the background): 4-connected opaque islands smaller than minArea
      { const lab = new Int32Array(W * H).fill(-1), minArea = Math.max(40, Math.round(W * H * (opt.minArea || 0.002))); let q = [];
        for (let p0 = 0; p0 < W * H; p0++) { if (lab[p0] !== -1 || d[p0 * 4 + 3] === 0) continue; q = [p0]; lab[p0] = p0; const comp = [];
          while (q.length) { const p = q.pop(); comp.push(p); const x = p % W, y = (p / W) | 0;
            for (const n of [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, y > 0 ? p - W : -1, y < H - 1 ? p + W : -1]) if (n >= 0 && lab[n] === -1 && d[n * 4 + 3] > 0) { lab[n] = p0; q.push(n); } }
          if (comp.length < minArea) for (const p of comp) d[p * 4 + 3] = 0; } }
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      frames.push({ ms: dur, id });
    }
    // crop to the union box (+2px), optional downscale
    x0 = Math.max(0, x0 - 2); y0 = Math.max(0, y0 - 2); x1 = Math.min(W - 1, x1 + 2); y1 = Math.min(H - 1, y1);
    const cw = x1 - x0 + 1, ch = y1 - y0 + 1, s = opt.maxH && ch > opt.maxH ? opt.maxH / ch : 1;
    const ow = Math.round(cw * s), oh = Math.round(ch * s);
    const src = document.createElement('canvas'); src.width = W; src.height = H; const sg = src.getContext('2d');
    const out = document.createElement('canvas'); out.width = ow; out.height = oh; const og = out.getContext('2d'); og.imageSmoothingQuality = 'high';
    const enc = [];
    for (const f of frames) {
      sg.putImageData(f.id, 0, 0); og.clearRect(0, 0, ow, oh); og.drawImage(src, x0, y0, cw, ch, 0, 0, ow, oh);
      enc.push({ ms: f.ms, webp: out.toDataURL('image/webp', opt.q).split(',')[1], png: frames.indexOf(f) % Math.ceil(frames.length / 8) === 0 ? out.toDataURL('image/png') : null });
    }
    // preview sheet on a checkerboard
    const pv = enc.filter((e) => e.png); const tw = 160, th = Math.round(oh * tw / ow);
    const sh = document.createElement('canvas'); sh.width = pv.length * tw; sh.height = th; const shg = sh.getContext('2d');
    for (let y = 0; y < th; y += 12) for (let x = 0; x < sh.width; x += 12) { shg.fillStyle = ((x + y) / 12) % 2 ? '#d33' : '#36c'; shg.fillRect(x, y, 12, 12); }
    for (let i = 0; i < pv.length; i++) { const im = new Image(); im.src = pv[i].png; await im.decode(); shg.drawImage(im, i * tw, 0, tw, th); }
    return { W, H, crop: [x0, y0, cw, ch], ow, oh, frames: enc.map((e) => ({ ms: e.ms, webp: e.webp })), sheet: sh.toDataURL().split(',')[1] };
  })()`);
  // assemble animated WebP: VP8X + ANIM + ANMF(ALPH? + VP8/VP8L)
  const chunk = (id, data) => { const pad = data.length & 1; const b = Buffer.alloc(8 + data.length + pad); b.write(id, 0, 'ascii'); b.writeUInt32LE(data.length, 4); data.copy(b, 8); return b; };
  const u24 = (v) => Buffer.from([v & 255, (v >> 8) & 255, (v >> 16) & 255]);
  const frameChunks = (buf) => { const out = []; let o = 12; while (o + 8 <= buf.length) { const id = buf.toString('ascii', o, o + 4), len = buf.readUInt32LE(o + 4); if (['ALPH', 'VP8 ', 'VP8L'].includes(id)) out.push(buf.subarray(o, o + 8 + len + (len & 1))); o += 8 + len + (len & 1); } return Buffer.concat(out); };
  const anmf = r.frames.map((f) => chunk('ANMF', Buffer.concat([u24(0), u24(0), u24(r.ow - 1), u24(r.oh - 1), u24(Math.max(20, f.ms)), Buffer.from([0x02]) /* no blend, keep */, frameChunks(Buffer.from(f.webp, 'base64'))])));
  const vp8x = chunk('VP8X', Buffer.concat([Buffer.from([0x12, 0, 0, 0]) /* alpha + animation */, u24(r.ow - 1), u24(r.oh - 1)]));
  const anim = chunk('ANIM', Buffer.from([0, 0, 0, 0, 0, 0])); // transparent bg, loop forever
  const body = Buffer.concat([Buffer.from('WEBP'), vp8x, anim, ...anmf]);
  const riff = Buffer.alloc(8); riff.write('RIFF', 0, 'ascii'); riff.writeUInt32LE(body.length, 4);
  fs.writeFileSync(process.env.RB_OUT, Buffer.concat([riff, body]));
  fs.writeFileSync(process.env.RB_SHEET, Buffer.from(r.sheet, 'base64'));
  console.log(JSON.stringify({ src: [r.W, r.H], crop: r.crop, out: [r.ow, r.oh], frames: r.frames.length, totalMs: r.frames.reduce((a, f) => a + f.ms, 0), bytes: 8 + body.length }));
  app.quit();
}).catch((e) => { console.error(e); app.exit(1); });
