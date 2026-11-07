// Bố cục cảnh DJ Club 3D. Đơn vị: cm. Trục x sang phải, y lên trên, z hướng về phía người xem.
// Sân khấu ở phía sau (z âm), bục TOP trước mép sân khấu, đám đông trên sàn nhảy (z dương).

export const W = 1080;   // khung phát dọc
export const H = 1920;

export const L = {
  // concert-stage.glb thu nhỏ 40 lần: mặt sàn cao 80 cm, mép trước z = -150, vách sau z ≈ -854
  stage: { scale: 40, offsetZ: -855, deckY: 80, front: -150, back: -815, halfW: 480 },
  // màn LED trước vách sau: 920 × 430 cm, 184 × 86 điểm (5 cm/điểm)
  led: { x: 0, y: 80 + 222, z: -838, w: 920, h: 430, cols: 184, rows: 86 },
  desk: { x: 0, z: -520, w: 300, h: 105, d: 90 },          // bàn DJ trên sàn sân khấu
  dj: { x: 0, z: -585 },                                     // chỗ Top 1 đứng sau bàn
  slots: {                                                   // bục Top 2–4 trước mép sân khấu
    2: { x: 0, z: 110, h: 60 },
    3: { x: -350, z: 60, h: 55 },
    4: { x: 350, z: 60, h: 55 }
  },
  podiumR: 88,
  // đám đông: hình thang hẹp dần về phía camera để vừa khung dọc (nửa bề ngang = halfX - (z - z0) * taper)
  crowd: { halfX: 400, taper: 0.3, z0: 250, z1: 720 },
  floor: { x0: -1500, x1: 1500, z0: -160, z1: 1700, tile: 125 },
  title: { y: 730, z: -160, w: 1600, h: 130 },               // chữ chạy 3D trên giàn mái
  trussFrontZ: -80,
  trussTopY: 545
};

export const TIERS = {
  1: { label: 'TOP 1 · DJ', key: 'top1', a: '#f3e8ff', b: '#7e22ce', glow: '#a855f7', hex: 0xa855f7, filter: 'hue-rotate(220deg) saturate(1.5) brightness(1.05)' },
  2: { label: 'TOP 2', key: 'gold', a: '#fff7c2', b: '#d4a017', glow: '#facc15', hex: 0xfacc15, filter: 'none' },
  3: { label: 'TOP 3', key: 'silver', a: '#ffffff', b: '#8b98ad', glow: '#e2e8f0', hex: 0xdbe4f0, filter: 'grayscale(1) brightness(1.3)' },
  4: { label: 'TOP 4', key: 'bronze', a: '#ffe1c7', b: '#b4643c', glow: '#fb923c', hex: 0xfb923c, filter: 'sepia(.6) hue-rotate(-18deg) saturate(1.4) brightness(.85)' }
};

export const rnd = (a, b) => a + Math.random() * (b - a);
export const pick = (a) => a[Math.floor(Math.random() * a.length)];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const crowdHalf = (z) => Math.max(140, L.crowd.halfX - (clamp(z, L.crowd.z0, L.crowd.z1) - L.crowd.z0) * L.crowd.taper);
