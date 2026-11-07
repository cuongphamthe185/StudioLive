// Decode an animated image with WebCodecs ImageDecoder, report frames/alpha/bbox, write a contact sheet.
// Env: AN_SRC, AN_TYPE (image/webp|image/gif), AN_SHEET (png out)
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
app.whenReady().then(async () => {
  const bytes = fs.readFileSync(process.env.AN_SRC).toString('base64');
  const win = new BrowserWindow({ show: false, webPreferences: { backgroundThrottling: false } });
  await win.loadFile(__dirname + '/blank.html');
  const r = await win.webContents.executeJavaScript(`(async () => {
    const bin = Uint8Array.from(atob(${JSON.stringify(bytes)}), (c) => c.charCodeAt(0));
    const dec = new ImageDecoder({ data: bin, type: ${JSON.stringify(process.env.AN_TYPE)} });
    await dec.tracks.ready; await dec.completed;
    const n = dec.tracks.selectedTrack.frameCount, frames = [];
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, W = 0, H = 0, partial = 0;
    const c = document.createElement('canvas'); const g = c.getContext('2d', { willReadFrequently: true });
    for (let i = 0; i < n; i++) {
      const { image } = await dec.decode({ frameIndex: i });
      W = image.displayWidth; H = image.displayHeight; c.width = W; c.height = H;
      g.clearRect(0, 0, W, H); g.drawImage(image, 0, 0);
      const d = g.getImageData(0, 0, W, H).data;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const a = d[(y * W + x) * 4 + 3]; if (a > 16) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } if (a > 0 && a < 255) partial++; }
      frames.push({ ms: Math.round(image.duration / 1000), url: c.toDataURL() });
      image.close();
    }
    const corner = (() => { const d = g.getImageData(0, 0, 4, 4).data; return d[3]; })();
    // sheet with checkerboard
    const cols = 8, tw = 160, rows = Math.ceil(n / cols), s = document.createElement('canvas'); s.width = cols * tw; s.height = rows * tw; const sg = s.getContext('2d');
    for (let y = 0; y < s.height; y += 16) for (let x = 0; x < s.width; x += 16) { sg.fillStyle = ((x + y) / 16) % 2 ? '#d33' : '#36c'; sg.fillRect(x, y, 16, 16); }
    for (let i = 0; i < n; i++) { const im = new Image(); im.src = frames[i].url; await im.decode(); sg.drawImage(im, (i % cols) * tw, Math.floor(i / cols) * tw, tw, tw); }
    return { n, W, H, durations: frames.map((f) => f.ms), bbox: [x0, y0, x1, y1], partialAlphaPx: partial, cornerAlpha: corner, sheet: s.toDataURL() };
  })()`);
  fs.writeFileSync(process.env.AN_SHEET, Buffer.from(r.sheet.split(',')[1], 'base64'));
  delete r.sheet; console.log(JSON.stringify(r));
  app.quit();
}).catch((e) => { console.error(e); app.exit(1); });
