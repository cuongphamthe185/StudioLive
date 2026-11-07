// Nối CDP vào cửa sổ xuất hình (?output), chạy một biểu thức JS, tuỳ chọn chụp ảnh JPEG.
// Dùng: node cdp.mjs <cổng> "<biểu thức>" [ảnh-ra.jpg]
import { writeFileSync } from 'node:fs';

const [port = '9223', expr = '1', out] = process.argv.slice(2);
const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const t = targets.find((x) => /\/\?output/.test(x.url));
if (!t) {
  console.error('Không thấy cửa sổ ?output — đã bật cửa sổ xuất hình trong app chưa?');
  process.exit(1);
}
const ws = new WebSocket(t.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
};
await new Promise((r) => { ws.onopen = r; });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });

const res = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
const r = res.result;
console.log(JSON.stringify(r?.exceptionDetails ? { error: r.exceptionDetails.exception?.description } : r?.result?.value, null, 2));
if (out) {
  const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 82 });
  writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
  console.log('saved', out);
}
ws.close();
process.exit(0);
