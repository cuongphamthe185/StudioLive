// Đo dáng thật của ảnh (bỏ phần trong suốt) để gắn cánh đúng vai, vương miện đúng đỉnh đầu.
// Mọi số trả về là tỉ lệ 0–1 theo kích thước ảnh gốc, nên dùng được cho mọi cỡ hiển thị.
const SAMPLE_H = 160;
const cache = new Map();

function alphaRows(img, h = SAMPLE_H) {
  const w = Math.max(8, Math.round((img.naturalWidth * h) / img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, w, h);
  const a = g.getImageData(0, 0, w, h).data;
  return { w, h, on: (x, y) => a[(y * w + x) * 4 + 3] > 60 };
}

// Thân nhân vật: khung có hình, tâm thân, vai (chỗ hẹp nhất giữa đầu và thân, gọi là cổ, rồi lùi xuống một chút),
// bề ngang thân ở vai, tâm đầu.
export function measureBody(img) {
  const key = img.currentSrc || img.src;
  if (cache.has(key)) return cache.get(key);
  let m = null;
  try {
    const { w, h, on } = alphaRows(img);
    const count = new Array(h).fill(0);
    const sumX = new Array(h).fill(0);
    let top = -1;
    let bottom = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) if (on(x, y)) { count[y]++; sumX[y] += x; }
      if (count[y] > 1) { if (top < 0) top = y; bottom = y; }
    }
    if (top >= 0 && bottom - top > 8) {
      const bh = bottom - top;
      const sm = (y) => (count[y - 1] + count[y] + count[y + 1]) / 3;
      // cổ: hàng hẹp nhất (theo số điểm có hình) trong khoảng 28%–68% chiều cao, ưu tiên phía trên một chút
      let neck = Math.round(top + bh * 0.45);
      let best = Infinity;
      for (let y = Math.round(top + bh * 0.28); y <= Math.round(top + bh * 0.68); y++) {
        const v = sm(y) * (1 + (y - top) / bh * 0.25);
        if (v < best) { best = v; neck = y; }
      }
      // nhân vật đầu to (chibi) có chỗ hẹp nhất ở eo, nên chặn điểm gắn cánh trong khoảng 32%–50% chiều cao thân
      const shoulder = Math.round(Math.min(top + bh * 0.5, Math.max(top + bh * 0.32, neck + bh * 0.07)));
      // bề ngang thân ở vai: lấy trung bình vài hàng quanh vai, dùng số điểm có hình (tay giơ ra không làm phình)
      let n = 0;
      let cnt = 0;
      let sx = 0;
      for (let y = Math.max(0, shoulder - 2); y <= Math.min(h - 1, shoulder + 2); y++) { if (count[y]) { cnt += count[y]; sx += sumX[y] / count[y]; n++; } }
      const half = n ? cnt / n / 2 : w * 0.2;
      const cx = n ? sx / n : w / 2;
      let hc = 0;
      let hs = 0;
      for (let y = top; y <= top + bh * 0.15; y++) { hc += count[y]; hs += sumX[y]; }
      m = {
        top: top / h, bottom: bottom / h, cx: cx / w, shoulder: shoulder / h,
        half: half / w, headCx: hc ? hs / hc / w : cx / w, width: w / h
      };
    }
  } catch { /* ảnh khác nguồn: không đọc được điểm ảnh */ }
  if (!m) m = { top: 0.05, bottom: 1, cx: 0.5, shoulder: 0.45, half: 0.18, headCx: 0.5, width: img.naturalWidth / img.naturalHeight };
  cache.set(key, m);
  return m;
}

// Ảnh một cặp cánh: khung hình của từng nửa và điểm gốc cánh (mép trong, giữa phần dày nhất của mép trong).
export function measureWings(img) {
  const key = 'wings:' + (img.currentSrc || img.src);
  if (cache.has(key)) return cache.get(key);
  let m = null;
  try {
    const { w, h, on } = alphaRows(img, 240);
    const half = (x0, x1, inner) => {
      let bx0 = w, bx1 = -1, by0 = h, by1 = -1;
      for (let y = 0; y < h; y++) for (let x = x0; x < x1; x++) if (on(x, y)) { if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; }
      if (bx1 < 0) return null;
      // gốc cánh: dải 8% sát mép trong, lấy tâm theo chiều dọc của phần có hình
      const band = Math.max(2, Math.round((bx1 - bx0) * 0.08));
      let ys = 0;
      let yn = 0;
      for (let y = by0; y <= by1; y++) {
        for (let k = 0; k < band; k++) {
          const x = inner === 'right' ? bx1 - k : bx0 + k;
          if (on(x, y)) { ys += y; yn++; }
        }
      }
      const rootY = yn ? ys / yn : (by0 + by1) / 2;
      return { x0: bx0 / w, x1: (bx1 + 1) / w, y0: by0 / h, y1: (by1 + 1) / h, rootY: rootY / h };
    };
    const mid = Math.round(w / 2);
    const l = half(0, mid, 'right');
    const r = half(mid, w, 'left');
    if (l && r) m = { l, r };
  } catch { /* bỏ qua */ }
  cache.set(key, m);
  return m;
}
