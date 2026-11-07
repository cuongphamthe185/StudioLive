// Render frame 0 of an animated image at 1:1 on a dark background next to a checkerboard. Env: VW_SRC, VW_TYPE, VW_OUT
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
app.whenReady().then(async () => {
  const bytes = fs.readFileSync(process.env.VW_SRC).toString('base64');
  const win = new BrowserWindow({ show: false });
  await win.loadFile(__dirname + '/blank.html');
  const png = await win.webContents.executeJavaScript(`(async () => {
    const bin = Uint8Array.from(atob(${JSON.stringify(bytes)}), (c) => c.charCodeAt(0));
    const dec = new ImageDecoder({ data: bin, type: ${JSON.stringify(process.env.VW_TYPE || 'image/webp')} }); await dec.tracks.ready;
    const { image } = await dec.decode({ frameIndex: 0 });
    const w = image.displayWidth, h = image.displayHeight, c = document.createElement('canvas'); c.width = w * 2; c.height = h; const g = c.getContext('2d');
    g.fillStyle = '#140a24'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 10) for (let x = 0; x < w; x += 10) { g.fillStyle = ((x + y) / 10) % 2 ? '#e33' : '#2a6'; g.fillRect(w + x, y, 10, 10); }
    g.drawImage(image, 0, 0); g.drawImage(image, w, 0);
    return c.toDataURL();
  })()`);
  fs.writeFileSync(process.env.VW_OUT, Buffer.from(png.split(',')[1], 'base64'));
  app.quit();
}).catch((e) => { console.error(e); app.exit(1); });
