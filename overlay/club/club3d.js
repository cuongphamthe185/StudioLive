/*
 * DJ CLUB 3D — cảnh sàn nhảy tương tác cho StudioLive (ý tưởng từ XiuGouDisco "修勾夜店", Mulan PSL v2).
 *
 * - Môi trường 3D bằng Three.js (world.js) + nhân vật / chữ ở lớp CSS3D (cast.js) dùng chung camera.
 * - Đạo diễn camera (director.js) tự đổi góc; có quà -> áp sát người tặng; Top 1 mới -> cận DJ.
 * - Điểm tính trong app chính (src/clubScore.js): Top 1 làm DJ sau bàn DJ, Top 2 giữa (vàng), Top 3 trái (bạc), Top 4 phải (đồng).
 * - Màn LED (led.js): ảnh, tên sàn, cột nhạc, hình DJ, lời cảm ơn quà, báo Top 1 mới.
 * Tài nguyên khai báo trong club-assets/manifest.json; thiếu file thì dùng khối / hình vẽ bằng code.
 */
import * as THREE from 'three';
import { CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { W, H, L, TIERS, rnd, pick, clamp } from './layout.js';
import { LedScreen } from './led.js';
import { Fireworks } from './fireworks.js';
import { DjBadge } from './djbadge.js';
import { World } from './world.js';
import { Cast } from './cast.js';
import { Director } from './director.js';

const BASE = 'club-assets/';
const FRAME_MS = 1000 / 30;
const PODIUM_EVERY = 2000;
const RAIN_MS = 15000;
const DANCE_WORDS = ['nhay', 'quay', 'dance', 'len', 'quay len'];
const SWAP_WORDS = ['doi', 'doi cho', 'doi nv', 'doi nhan vat', 'doi meme', 'doi con'];

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/\s+/g, ' ').trim();
const fmt = (n) => Number(n || 0).toLocaleString('vi-VN');
const keyOf = (u) => String(u?.id || u?.uniqueId || u?.nickname || '');
const safePath = (p) => typeof p === 'string' && /^[\w\-./ ]+\.(gif|webp|png|apng|jpe?g|svg|glb)$/i.test(p) && !p.includes('..') && !p.startsWith('/');

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

// ---------------- Tài nguyên mặc định (ghi đè bằng manifest.json) ----------------
const DEFAULT_ASSETS = {
  characters: [
    { file: 'characters/happy-dance.webp', height: 1.2, faces: 'right', feet: 0.07 }
  ],
  dj: { file: '', width: 330 },   // nhân vật DJ mặc định khi chưa có Top 1 (trống = không có; màn LED hiện trái tim mời lên DJ)
  wings: { pair: 'wings/gold-angel-wings.png' },
  crown: 'decor/crown.svg',
  screen: ['screen/space.jpg'],
  sky: { file: 'sky/night-city-4k.jpg', low: 'sky/night-city-2k.jpg', crop: [0.36, 0.12, 0.82, 0.52], brightness: 0.75, height: 6000, y: 500 },
  models: {
    stage: { file: 'models/concert-stage.glb', scale: 40 },
    djController: { file: 'models/dj-pioneer.glb', scale: 100, y: 19.7 },
    movingHead: { file: 'models/moving-head.glb', scale: 110 },
    spotLight: { file: 'models/spot-light.glb', scale: 90 },
    speaker: { file: 'models/speaker.glb', scale: 300 }
  }
};

async function loadAssets() {
  const a = structuredClone(DEFAULT_ASSETS);
  try {
    const r = await fetch(BASE + 'manifest.json', { cache: 'no-store' });
    const m = r.ok ? await r.json() : null;
    if (!m || typeof m !== 'object') return a;
    const chars = (Array.isArray(m.characters) ? m.characters : []).map((c) => (typeof c === 'string' ? { file: c } : c))
      .filter((c) => c && safePath(c.file))
      .map((c) => ({ file: c.file, height: clamp(Number(c.height) || 1, 0.3, 3), faces: c.faces === 'left' ? 'left' : 'right', feet: clamp(Number(c.feet) || 0, 0, 0.4) }));
    if (chars.length) a.characters = chars;
    if (m.dj && safePath(m.dj.file)) a.dj = { file: m.dj.file, width: clamp(Number(m.dj.width) || 330, 100, 900) };
    if (m.wings && typeof m.wings === 'object') {
      a.wings = {};
      for (const k of ['pair', 'top1', 'gold', 'silver', 'bronze']) if (safePath(m.wings[k])) a.wings[k] = m.wings[k];
    }
    if ('crown' in m) a.crown = safePath(m.crown) ? m.crown : '';
    if (Array.isArray(m.screen)) a.screen = m.screen.filter(safePath);
    if (m.sky && typeof m.sky === 'object') {
      const crop = Array.isArray(m.sky.crop) && m.sky.crop.length === 4 && m.sky.crop.every((v) => Number.isFinite(v) && v >= 0 && v <= 1) ? m.sky.crop : a.sky.crop;
      a.sky = {
        file: safePath(m.sky.file) ? m.sky.file : '', low: safePath(m.sky.low) ? m.sky.low : '', crop,
        brightness: clamp(Number(m.sky.brightness ?? 0.75), 0, 3), height: clamp(Number(m.sky.height) || 6000, 500, 30000), y: Number(m.sky.y ?? 500)
      };
    }
    if (m.models && typeof m.models === 'object') {
      for (const [k, v] of Object.entries(m.models)) {
        if (!(k in a.models)) continue;
        if (v === null || v === '' || (v && v.file === '')) { a.models[k] = null; continue; }
        if (v && safePath(v.file)) a.models[k] = { ...a.models[k], ...v, file: v.file };
      }
    }
  } catch { /* dùng mặc định */ }
  return a;
}

// ---------------- Trạng thái ----------------
let cfg = {};
let ui;
let sfx;
let canvas;
let enabled = false;
let paused = false;
let ready = false;
let quality = 'high';
let assets;
let renderer;
let composer;
let cssRenderer;
let fireworks;
let djBadge;
let bloom;
// Tự giảm chất lượng khi máy không theo kịp (thường do quá đông người trên sàn):
// mức 1 tắt phản chiếu sàn (tốn nhất), mức 2 tắt phát sáng lan, mức 3–4 bớt số nhân vật trên sàn (28, rồi 20)
// vì mỗi nhân vật là một lớp hình riêng, đông người là thứ nặng nhất. Chỉ giảm, không tự tăng lại trong phiên.
const perf = { frames: 0, since: 0, slow: 0, level: 0, fps: 0 };
function watchPerf(rt) {
  perf.frames++;
  if (!perf.since) { perf.since = rt; return; }
  const span = rt - perf.since;
  if (span < 4000) return;
  if (span > 8000) { perf.frames = 0; perf.since = rt; return; }   // vừa tạm dừng / ẩn cửa sổ: bỏ qua lần đo này
  perf.fps = (perf.frames * 1000) / span;
  perf.frames = 0;
  perf.since = rt;
  if (document.hidden || paused || rt - clockStart < 12000 || perf.level >= 4) return;
  perf.slow = perf.fps < 21 ? perf.slow + 1 : 0;
  if (perf.slow < 2) return;
  perf.slow = 0;
  perf.level++;
  if (perf.level === 1 && world.reflector) world.reflector.visible = false;
  if (perf.level >= 1) ui.root.classList.add('c3-lite');   // làm mờ người khác bằng độ trong thay vì nhoè (rẻ hơn nhiều)
  if (perf.level === 2 && bloom) bloom.enabled = false;
  if (perf.level >= 3) {
    cast.capOverride = perf.level === 3 ? 28 : 20;
    cast.trimTo(cast.capOverride, director.focus?.dog);
  }
  console.info('[club] máy không theo kịp (' + perf.fps.toFixed(1) + ' khung/giây): tự giảm chất lượng, mức ' + perf.level);
}
let lens;              // nhoè ống kính quanh người được quay (chỉ chất lượng cao)
let focused = null;    // nhân vật camera đang áp sát
let focusAmt = 0;      // 0 → 1 độ đậm hiệu ứng áp sát
let focusC = { x: W / 2, y: H / 2, r: 400 };
let vigKey = '';
// nhoè + tối + nhạt màu dần ra xa tâm (người được quay); vùng tròn quanh người đó giữ nguyên nét
const LensShader = {
  uniforms: { tDiffuse: { value: null }, uCenter: { value: new THREE.Vector2(0.5, 0.5) }, uRadius: { value: 0.2 }, uAmount: { value: 0 }, uAspect: { value: W / H },
    uTime: { value: 0 }, uHaze: { value: 0 }, uTint: { value: new THREE.Color(0.55, 0.45, 0.85) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 uCenter; uniform float uRadius, uAmount, uAspect, uTime, uHaze; uniform vec3 uTint; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float vnoise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
    float fbm(vec2 p){ float v = 0.0; float a = 0.5; for (int i = 0; i < 3; i++) { v += a * vnoise(p); p *= 2.03; a *= 0.5; } return v; }
    void main(){
      vec4 base = texture2D(tDiffuse, vUv);
      vec3 col = base.rgb;
      // ống kính khi áp sát: nhoè + tối + nhạt màu dần ra xa người được quay
      if (uAmount > 0.003) {
        vec2 dv = (vUv - uCenter) * vec2(uAspect, 1.0);
        float k = smoothstep(uRadius, uRadius * 2.4, length(dv)) * uAmount;
        vec3 acc = col; float n = 1.0; float r = k * 0.013;
        for (int i = 0; i < 14; i++) {
          float a = float(i) * 2.39996; float rr = r * sqrt((float(i) + 0.5) / 14.0);
          acc += texture2D(tDiffuse, vUv + vec2(cos(a), sin(a) * uAspect) * rr).rgb; n += 1.0;
        }
        col = acc / n;
        float l = dot(col, vec3(0.299, 0.587, 0.114));
        col = mix(col, vec3(l), k * 0.45) * (1.0 - k * 0.55);
      }
      // khói mù: mảng khói trôi chậm, sáng lên theo ánh đèn xung quanh (như khói tán xạ ánh sáng trong club)
      if (uHaze > 0.001) {
        vec2 q = vec2(vUv.x * uAspect, vUv.y) * 2.4;
        float s = fbm(q + vec2(uTime * 0.03, -uTime * 0.018)) * 0.65 + fbm(q * 1.8 - vec2(uTime * 0.045, uTime * 0.01)) * 0.35;
        vec3 glow = vec3(0.0);
        for (int i = 0; i < 6; i++) { float a = float(i) * 1.0472 + 0.4; glow += texture2D(tDiffuse, vUv + vec2(cos(a), sin(a) * uAspect) * 0.075).rgb; }
        glow /= 6.0;
        float lum = dot(glow, vec3(0.299, 0.587, 0.114));
        vec3 smoke = mix(uTint, glow, 0.7) * smoothstep(0.28, 0.82, s);
        col += smoke * uHaze * (0.16 + lum * 0.9);
        col = mix(col, col * 0.94 + uTint * 0.03, uHaze * 0.7);
      }
      gl_FragColor = vec4(col, base.a);
    }`
};
let camera;
let world;
let cast;
let director;
let led;
let cssScene;
let fx;
let fxg;
let last = 0;
let rank = [];
let rankSession = 0;
let rankReady = false;
let lastTop1 = null;
let lastApply = 0;
let applyTimer = 0;
let likeBase = -1;
let likeCount = 0;
let thanks = '';
let thanksUntil = 0;
const els = {};
const clockStart = performance.now();

// ---------------- Nhạc nền ----------------
let music = null;
let trackIdx = 0;
const tracks = () => (Array.isArray(cfg.clubTracks) ? cfg.clubTracks : []);
const trackName = (p) => String(p || '').split(/[\\/]/).pop().replace(/\.[a-z0-9]+$/i, '');
function syncMusic() {
  const list = tracks();
  const want = enabled && cfg.clubMusic && cfg.sound !== false && !paused && !sfx.muted() && list.length > 0;
  if (!want) { if (music) music.pause(); renderNow(); return; }
  if (trackIdx >= list.length) trackIdx = 0;
  if (!music) {
    music = new Audio();
    music.addEventListener('ended', () => nextTrack(1));
    music.addEventListener('error', () => setTimeout(() => nextTrack(1), 1500));
  }
  const src = `/club/${trackIdx}?v=${encodeURIComponent(list[trackIdx])}`;
  if (!music.src.endsWith(src)) music.src = src;
  music.volume = clamp((cfg.volume ?? 0.7) * (cfg.clubMusicVolume ?? 0.6), 0, 1);
  if (music.paused) music.play().catch(() => {});
  renderNow();
}
function nextTrack(step) {
  const n = tracks().length;
  if (!n) return;
  trackIdx = (trackIdx + step + n) % n;
  if (music) music.removeAttribute('src');
  syncMusic();
}
function renderNow() {
  if (!els.now) return;
  const list = tracks();
  const playing = music && !music.paused && list.length;
  els.now.textContent = playing ? '🎵 ' + trackName(list[trackIdx]) : '';
  els.now.style.display = playing ? '' : 'none';
}

// ---------------- HUD (cố định, không theo camera) ----------------
function buildHud() {
  const root = ui.root;
  const head = el('div', 'c-head');
  const like = el('div', 'c-like');
  els.likeFill = el('div', 'c-like-fill');
  els.likeText = el('span', 'c-like-text');
  like.append(els.likeFill, els.likeText);
  els.now = el('div', 'c-now');
  head.append(like, els.now);

  const board = el('div', 'c-board');
  board.appendChild(el('div', 'cb-title', '🏆 BẢNG ĐIỂM'));
  els.board = el('div', 'cb-list');
  els.boardEmpty = el('div', 'cb-empty', 'Thả tim, tặng quà để lên bảng');
  board.append(els.board, els.boardEmpty);

  const legend = el('div', 'c-legend');
  const row = (k, v, cls) => {
    const r = el('div', 'cl-row' + (cls ? ' ' + cls : ''));
    const val = el('span', 'cl-val', v);
    r.append(el('span', 'key', k), val);
    legend.appendChild(r);
    return val;
  };
  legend.appendChild(el('div', 'cl-title', 'CÁCH LÊN DJ'));
  els.legendLike = row('❤️ 1 tim', '1 điểm', 'emo');
  els.legendCoin = row('🎁 1 xu', '100 điểm', 'emo');
  row('👑', 'Cao nhất làm DJ', 'emo');
  row('nhảy', 'quẩy lên');
  row('đổi', 'đổi nhân vật');
  // bảng tên kiểu truyền hình khi camera áp sát (quà, DJ mới)
  els.cap = el('div', 'c-cap');
  els.capAv = el('img', 'c-cap-av');
  els.capAv.referrerPolicy = 'no-referrer';
  els.capAv.alt = '';
  const capTxt = el('div', 'c-cap-txt');
  els.capTitle = el('div', 'c-cap-title');
  els.capName = el('div', 'c-cap-name');
  els.capSub = el('div', 'c-cap-sub');
  capTxt.append(els.capTitle, els.capName, els.capSub);
  els.cap.append(els.capAv, capTxt);
  root.append(head, board, legend, els.cap);
}

let capTimer = 0;
function showCaption({ title, name, sub, avatar, tone = 'gift', ms = 3500 }) {
  const c = els.cap;
  if (!c) return;
  els.capTitle.textContent = title;
  els.capName.textContent = name;
  els.capSub.textContent = sub || '';
  const src = typeof avatar === 'string' && (avatar.startsWith('https://') || avatar.startsWith('/club-demo-avatar/')) ? avatar : '';
  els.capAv.style.display = src ? '' : 'none';
  if (src) els.capAv.src = src;
  c.className = 'c-cap ' + tone;
  void c.offsetWidth;
  c.classList.add('on');
  clearTimeout(capTimer);
  capTimer = setTimeout(() => c.classList.remove('on'), Math.max(1800, ms - 300));
}
function hideCaption() { clearTimeout(capTimer); els.cap?.classList.remove('on'); }

const clubName = () => (cfg.clubName || '').trim() || 'DJ CLUB';
function updateTexts() {
  if (!ready) return;
  const title = (cfg.clubHeadline || '').trim() || `${clubName().toUpperCase()} · THẢ TIM, TẶNG QUÀ ĐỂ LÊN LÀM DJ`;
  const top = rank[0];
  const parts = [];
  if (top) parts.push(`👑 DJ ${cast.cleanName(top.nickname)} · ${fmt(top.points)} điểm`);
  parts.push((cfg.clubDeskText || '').trim() || `Chào mừng đến ${clubName()}`);
  if (thanks && Date.now() < thanksUntil) parts.push(thanks);
  cast.setTexts(title, parts.join('   ·   '));
  led.setName(clubName());
  els.legendLike.textContent = `${fmt(Number(cfg.clubPtsLike ?? 1))} điểm`;
  els.legendCoin.textContent = `${fmt(Number(cfg.clubPtsCoin ?? 100))} điểm`;
}

function updatePlaylist() {
  if (!ready) return;
  const items = [];
  (Array.isArray(cfg.clubScreenImages) ? cfg.clubScreenImages : []).forEach((p, i) => items.push({ type: 'image', src: `/club-screen/${i}?v=${encodeURIComponent(p)}` }));
  assets.screen.forEach((p) => items.push({ type: 'image', src: BASE + p }));
  items.push({ type: 'logo' }, { type: 'viz' }, { type: 'dj' });
  led.setPlaylist(items, cfg.clubScreenSec);
}

// ---------------- Pháo giấy (lớp 2D trên cùng, theo toạ độ màn hình) ----------------
const COLORS = ['#ff2d95', '#ffd60a', '#3a86ff', '#06d6a0', '#ff6b35', '#c77dff', '#ffffff'];
const confetti = [];
let rainUntil = 0;
const piece = (x, y, vx, vy) => ({ x, y, vx, vy, w: rnd(10, 20), h: rnd(6, 12), r: rnd(0, 6.28), vr: rnd(-0.2, 0.2), c: pick(COLORS), sway: rnd(0, 6.28) });
function screenOf(v) {
  const p = v.clone().project(camera);
  return { x: (p.x + 1) / 2 * W, y: (1 - p.y) / 2 * H };
}
function burstAt(v, n) {
  const { x, y } = screenOf(v);
  for (let i = 0; i < n; i++) {
    const a = rnd(0, Math.PI * 2);
    const sp = rnd(4, 16);
    confetti.push(piece(x, y, Math.cos(a) * sp, Math.sin(a) * sp - 8));
  }
  const cap = perf.level >= 2 ? 320 : 900;   // máy đang chậm: ít mảnh pháo giấy hơn
  if (confetti.length > cap) confetti.splice(0, confetti.length - cap);
}
let fxDirty = false;
function drawConfetti(dt) {
  // không có pháo giấy: khỏi xoá / vẽ lại lớp 1080×1920 mỗi khung (đỡ tốn GPU)
  if (!confetti.length && performance.now() >= rainUntil) {
    if (fxDirty) { fxg.clearRect(0, 0, W, H); fxDirty = false; }
    return;
  }
  fxDirty = true;
  fxg.clearRect(0, 0, W, H);
  if (performance.now() < rainUntil && confetti.length < 600) for (let i = 0; i < 6; i++) confetti.push(piece(rnd(0, W), rnd(150, 240), rnd(-1, 1), rnd(3, 7)));
  for (let i = confetti.length - 1; i >= 0; i--) {
    const p = confetti[i];
    p.vy = Math.min(p.vy + 0.25 * dt, 9);
    p.vx *= 0.985;
    p.sway += 0.08 * dt;
    p.x += (p.vx + Math.sin(p.sway) * 1.2) * dt;
    p.y += p.vy * dt;
    p.r += p.vr * dt;
    if (p.y > H + 30) { confetti.splice(i, 1); continue; }
    fxg.save();
    fxg.translate(p.x, p.y);
    fxg.rotate(p.r);
    fxg.scale(1, Math.cos(p.sway * 2));
    fxg.fillStyle = p.c;
    fxg.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    fxg.restore();
  }
}

// ---------------- Nhân vật ----------------
// Phòng đông (tim, bình luận dồn dập từ nhiều người): mỗi giây chỉ cho ~4 người mới bước lên sàn (dồn tối đa 8),
// để sàn không liên tục thêm / bớt nhân vật làm giật hình. Người tặng quà luôn được lên ngay (create = 'force').
const spawnBucket = { tokens: 8, at: performance.now() };
function canSpawn() {
  const now = performance.now();
  spawnBucket.tokens = Math.min(8, spawnBucket.tokens + (now - spawnBucket.at) / 250);
  spawnBucket.at = now;
  if (spawnBucket.tokens < 1) return false;
  spawnBucket.tokens -= 1;
  return true;
}

function getDog(user, create = true) {
  const k = keyOf(user);
  if (!k || !ready) return null;
  let d = cast.get(k);
  if (!d && create && (create === 'force' || canSpawn())) d = cast.spawn(k, user, director.focus?.dog);
  if (d) {
    d.active = Date.now();
    if (user?.avatar) cast.setAvatar(d, user.avatar);
  }
  return d;
}

// caption: bảng tên hiện khi camera THỰC SỰ chuyển sang người này (không hiện ngay lúc có quà, tránh lệch người)
function focusDog(d, ms, force = false, caption = null, prio = 0) {
  if (cfg.clubCamera === false || !d) return;
  director.focusOn(() => (cast.get(d.key) === d ? cast.headPos(d) : null), ms, force, d, caption, prio);
}

// hiệu ứng áp sát: làm mờ người khác, nhoè ống kính, tối viền, đèn rọi theo
function updateFocus(dt) {
  const f = director.focus;
  let d = f && f.dog && cast.get(f.dog.key) === f.dog ? f.dog : null;
  // tour DJ (không có quà chen ngang): lần lượt "giới thiệu" DJ → Top 2 → Top 3 → Top 4
  let tourSlot = 0;
  if (!d && director.tourKey != null) {
    tourSlot = [1, 2, 3, 4][director.tourKey] || 0;
    d = tourSlot ? [...cast.dogs.values()].find((x) => x.slot === tourSlot) || null : null;
  }
  if (d !== focused) {
    if (d) sfx.play('whoosh');
    focused = d;
    cast.setFocus(d);
    if (!d) hideCaption();
    if (d && tourSlot) {
      const T = { 1: ['👑 DJ ĐANG CHƠI NHẠC', 'dj'], 2: ['🥇 TOP 2', 'big'], 3: ['🥈 TOP 3', 'silver'], 4: ['🥉 TOP 4', 'bronze'] }[tourSlot];
      showCaption({ title: T[0], name: d.name, sub: fmt(d.points || 0) + ' điểm', avatar: d.avatarUrl, tone: T[1], ms: 1900 });
    }
  }
  // bảng tên: khi đổi người hoặc người đó tặng tiếp (cập nhật quà mới)
  if (d && f && f.dog === d && f.meta && f.metaAt !== updateFocus.metaAt) {
    updateFocus.metaAt = f.metaAt;
    showCaption({ name: d.name, avatar: d.avatarUrl, ms: Math.max(1500, f.until - performance.now()), ...f.meta });
  }
  focusAmt += ((d ? 1 : 0) - focusAmt) * Math.min(1, dt * 3.5);
  if (d) {
    const head = screenOf(cast.headPos(d));
    const feet = screenOf(cast.feetPos(d));
    const r = clamp(Math.abs(feet.y - head.y) * 1.25, 200, 820);
    focusC = { x: head.x, y: (head.y + feet.y) / 2, r };
  }
  const c = focusC;
  if (lens) {
    lens.uniforms.uAmount.value = focusAmt;
    // khói mù (cài đặt %, máy chậm thì giảm còn một nửa)
    lens.uniforms.uHaze.value = clamp(Number(cfg.clubHaze ?? 60), 0, 100) / 100 * (perf.level >= 2 ? 0.5 : 1);
    lens.uniforms.uTime.value = performance.now() / 1000;
    lens.uniforms.uCenter.value.set(c.x / W, 1 - c.y / H);
    lens.uniforms.uRadius.value = (c.r / H) * 0.85;
  }
  // tối viền ngoài (cả lớp nhân vật); chỉ vẽ lại khi đổi đủ nhiều cho đỡ tốn máy
  const off = focusAmt < 0.01;
  const key = off ? 'off' : [Math.round(c.x / 6), Math.round(c.y / 6), Math.round(c.r / 8), Math.round(focusAmt * 20)].join('|');
  if (key !== vigKey) {
    vigKey = key;
    els.vig.style.opacity = off ? '0' : (focusAmt * 0.9).toFixed(2);
    if (!off) els.vig.style.background = 'radial-gradient(circle at ' + c.x.toFixed(0) + 'px ' + c.y.toFixed(0) + 'px, rgba(4,0,14,0) ' + (c.r * 0.8).toFixed(0) + 'px, rgba(4,0,14,.6) ' + (c.r * 2.4).toFixed(0) + 'px)';
  }
  world.setFollow(d ? cast.feetPos(d) : null, focusAmt);
}

// ---------------- Bục TOP ----------------
function onRank(p) {
  if (!p) return;
  if (p.session !== rankSession) {
    rankSession = p.session;
    if (rankReady) lastTop1 = null;
  }
  rank = Array.isArray(p.top) ? p.top : [];
  if (!ready) return;
  renderBoard();
  scheduleApply();
}

function scheduleApply() {
  const wait = PODIUM_EVERY - (Date.now() - lastApply);
  if (wait <= 0) applyPodium();
  else if (!applyTimer) applyTimer = setTimeout(() => { applyTimer = 0; applyPodium(); }, wait);
}

function applyPodium() {
  if (!ready) return;
  lastApply = Date.now();
  const want = new Map();
  rank.slice(0, 4).forEach((r, i) => { if (r.points > 0) want.set(r.key, { slot: i + 1, r }); });
  for (const d of cast.dogs.values()) if (d.slot && !want.has(d.key)) cast.leaveSlot(d);
  for (const [key, { slot, r }] of want) {
    const d = cast.get(key) || cast.spawn(key, r, null);
    d.points = r.points;
    if (d.slot !== slot) cast.toSlot(d, slot);
    d.pts.textContent = fmt(r.points);
  }
  for (const d of cast.dogs.values()) if (!d.slot) d.pts.textContent = '';
  const top1 = want.size ? rank[0].key : null;
  cast.setDjVisible(!top1);
  const dj = top1 ? cast.get(top1) : null;
  led.setDj(dj ? { img: dj.img, name: dj.name } : null);
  djBadge.setDj(dj ? { name: dj.name, avatar: dj.avatarUrl || rank[0]?.avatar || '' } : null);
  if (!rankReady) rankReady = true;
  else if (top1 && top1 !== lastTop1) announceTop1(dj);
  lastTop1 = top1;
  updateTexts();
  world.setOccupied(Object.fromEntries([...want.values()].map(({ slot }) => [slot, true])));
  director.tops = want.size;
}

function announceTop1(d) {
  if (!d || !enabled) return;
  led.message({ title: '👑 TOP 1 MỚI', line: d.name, sub: 'lên làm DJ!', color: '#d8b4fe', ms: 5000, priority: true });
  focusDog(d, (clamp(Number(cfg.clubCameraSec) || 3, 1, 10) + 2) * 1000, true, { title: '👑 DJ MỚI LÊN SÀN', sub: fmt(d.points || 0) + ' điểm', tone: 'dj' }, 1e9);
  setTimeout(() => burstAt(cast.headPos(d), 160), 900);
  sfx.play('applause');
}

function renderBoard() {
  const top = rank.slice(0, 5);
  els.board.replaceChildren(...top.map((r, i) => {
    const row = el('div', 'cb-row' + (i < 4 ? ' t' + (i + 1) : ''));
    row.append(el('span', 'cb-rank', String(i + 1)), el('span', 'cb-name', cast.cleanName(r.nickname)), el('span', 'cb-pts', fmt(r.points)));
    return row;
  }));
  els.boardEmpty.style.display = top.length ? 'none' : '';
}

// ---------------- Sự kiện live ----------------
function onEvent(ev) {
  if (!enabled || !ready || !ev || paused) return;
  switch (ev.type) {
    case 'join': getDog(ev.user); return;
    case 'chat': {
      const d = getDog(ev.user);
      if (!d) return;
      const w = norm(ev.text);
      if (SWAP_WORDS.includes(w)) { cast.swapChar(d); burstAt(cast.headPos(d), 24); sfx.play('pop'); return; }
      if (DANCE_WORDS.includes(w)) { cast.dance(d, 5000); cast.say(d, '💃🕺'); return; }
      cast.say(d, ev.text);
      return;
    }
    case 'like': {
      const d = getDog(ev.user);
      if (d && Math.random() < 0.6) cast.heart(d);
      return;
    }
    case 'follow': {
      const d = getDog(ev.user);
      if (d) { cast.say(d, 'Đã follow 💜'); cast.dance(d, 2500); }
      return;
    }
    case 'share': {
      const d = getDog(ev.user);
      if (d) cast.say(d, 'Đã chia sẻ live 🔗');
      return;
    }
    case 'gift': onGift(ev); return;
    default:
  }
}

function onGift(ev) {
  const d = getDog(ev.user, 'force');
  if (!d) return;
  const total = Number(ev.total || 0);
  const gift = `${ev.giftName || 'Quà'}${ev.repeatCount > 1 ? ' x' + ev.repeatCount : ''}`;
  cast.dance(d, 6000);
  cast.say(d, '🎁 ' + gift);
  if (!d.slot) {
    // chưa lên bục: chạy ra giữa hàng đầu sàn nhảy
    d.tx = rnd(-90, 90);
    d.tz = L.crowd.z0 - 30;
    d.run = true;
    d.busyUntil = Date.now() + 6000;
  }
  const big = Number(cfg.bigGiftDiamonds || 30) > 0 && total >= Number(cfg.bigGiftDiamonds || 30);
  focusDog(d, clamp(Number(cfg.clubCameraSec) || 3, 1, 10) * 1000, false, { title: big ? '💎 ĐẠI GIA TẶNG QUÀ' : '🎁 TẶNG QUÀ', sub: gift, tone: big ? 'big' : 'gift' }, total);
  world.ripple(d.slot ? d.tx : d.x, d.slot ? d.tz : d.z, big ? 0.14 : 0.9);
  setTimeout(() => burstAt(cast.headPos(d), big ? 200 : 80), 500);
  led.message({ title: big ? '💎 CẢM ƠN ĐẠI GIA' : '🎁 CẢM ƠN', line: d.name, sub: 'đã tặng ' + gift, color: big ? '#fde047' : '#f9a8d4', ms: big ? 5000 : 3500 });
  thanks = `Cảm ơn ${d.name} đã tặng ${gift}`;
  thanksUntil = Date.now() + 20000;
  updateTexts();
  sfx.play(big ? 'applause' : 'chime');
}

// ---------------- Tim & pháo hoa ----------------
const goal = () => Math.max(10, Math.round(cfg.clubLikeGoal || 300));
function onStats(s) {
  if (!enabled || !s) return;
  if (likeBase < 0) likeBase = s.likes || 0;
  likeCount = (s.likes || 0) - likeBase;
  checkLikes();
}
function addLikes(n) { if (likeBase < 0) likeBase = 0; likeBase -= n; likeCount += n; checkLikes(); }
function checkLikes() {
  if (likeCount >= goal()) { likeBase += goal(); likeCount -= goal(); startRain(); }
  updateLikeBar();
}
function updateLikeBar() {
  if (!els.likeFill) return;
  const raining = performance.now() < rainUntil;
  els.likeFill.style.width = (raining ? 100 : clamp((likeCount / goal()) * 100, 0, 100)) + '%';
  els.likeText.textContent = raining
    ? '🎆 Bắn pháo hoa — cảm ơn cả nhà đã thả tim!'
    : `❤️ ${fmt(Math.max(0, likeCount))}/${fmt(goal())} tim — đủ tim sẽ bắn pháo hoa`;
}
// đủ tim: pháo hoa sau sân khấu + sàn vàng rực + mưa pháo giấy + cả sàn nhảy
function startRain() {
  rainUntil = performance.now() + RAIN_MS;
  if (ready) {
    for (const d of cast.dogs.values()) cast.dance(d, RAIN_MS);
    fireworks.show(RAIN_MS - 2500);
    world.celebrate(RAIN_MS - 1000);
    director.hold('sky', RAIN_MS - 2000);
    led.message({ title: '🎆 ĐỦ ' + fmt(goal()) + ' TIM!', line: 'Cảm ơn cả nhà', sub: 'bắn pháo hoa nào!', color: '#fde047', ms: 6000, priority: true });
  }
  sfx.play('applause');
  updateLikeBar();
}

// ---------------- Điều khiển từ app ----------------
const DEMO = ['Cún Bông', 'Shiba Lầy', 'Mực Đen', 'Lu Lu', 'Corgi Mập', 'Vàng Ươm', 'Bé Bơ', 'Ki Ki', 'Husky Ngáo', 'Mochi', 'Đậu Đỏ', 'Su Su'];
function command(c) {
  if (!enabled || !ready || !c) return;
  switch (c.action) {
    case 'rain': startRain(); break;
    case 'dance': for (const d of cast.dogs.values()) cast.dance(d, 6000); break;
    case 'crowd':
      for (let i = 0; i < (Number(c.n) || 10); i++) {
        const name = pick(DEMO) + ' ' + Math.floor(rnd(1, 99));
        setTimeout(() => getDog({ id: 'demo-' + name, nickname: name, avatar: '/club-demo-avatar/' + Math.floor(rnd(0, 12)) + '.svg' }, 'force'), i * 200);
      }
      break;
    case 'clear': for (const d of [...cast.dogs.values()]) if (!d.slot) cast.remove(d); break;
    case 'next': nextTrack(1); break;
    case 'prev': nextTrack(-1); break;
    case 'screen': led.next(); break;
    case 'camera': director.nextShot(); break;
    case 'testLikes': addLikes(Number(c.n) || 50); break;
    default:
  }
}

// ---------------- Vòng lặp ----------------
function loop(rt) {
  if (!enabled || paused || !ready) return;
  requestAnimationFrame(loop);
  if (rt - last < FRAME_MS - 2) return;
  watchPerf(rt);
  const dtMs = Math.min(250, rt - last);
  last = rt;
  const dt = dtMs / 1000;
  const t = (rt - clockStart) / 1000;
  const bpm = clamp(Number(cfg.clubBpm) || 124, 60, 180);
  const beat = (t * bpm) / 60;
  const pulse = Math.exp(-(beat % 1) * 5);
  director.update(dt, { auto: cfg.clubCamAuto !== false, every: clamp(Number(cfg.clubCamEvery) || 12, 4, 120) });
  led.render(t, rt, pulse);
  world.setHaze(clamp(Number(cfg.clubHaze ?? 60), 0, 100) / 100);
  world.update(t, beat, pulse);
  fireworks.update(dt);
  djBadge.update(t, pulse, !!led.msg && rt < led.msgUntil);
  cast.update(dt, camera);
  updateFocus(dt);
  if (composer) composer.render(); else renderer.render(world.scene, camera);
  cssRenderer.render(cssScene, camera);
  drawConfetti(dtMs / FRAME_MS);
}

// ---------------- Khởi tạo ----------------
async function setup() {
  assets = await loadAssets();
  quality = cfg.clubQuality === 'low' ? 'low' : 'high';
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: quality !== 'low', powerPreference: 'high-performance' });
  } catch (e) {
    const warn = el('div', 'c-warn', 'Máy / trình phát không hỗ trợ WebGL nên không vẽ được cảnh 3D.');
    ui.root.appendChild(warn);
    console.error('[club] WebGL', e);
    return;
  }
  renderer.setPixelRatio(quality === 'low' ? 0.67 : 1);
  renderer.setSize(W, H, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  camera = new THREE.PerspectiveCamera(58, W / H, 10, 40000);
  led = new LedScreen();
  world = new World({ quality, assets, led });
  fireworks = new Fireworks(world.scene, { quality, fov: 58, height: H });
  djBadge = new DjBadge(world.scene);
  fireworks.onBoom = (type) => sfx.play('fwBoom', type === 'willow' || type === 'heart' ? 1.2 : 1);
  fireworks.onLaunch = () => sfx.play('fwLaunch');
  if (quality !== 'low') {
    composer = new EffectComposer(renderer);
    composer.setPixelRatio(1);
    composer.setSize(W, H);
    composer.addPass(new RenderPass(world.scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.55, 0.4, 0.82);
    composer.addPass(bloom);
    lens = new ShaderPass(LensShader);
    composer.addPass(lens);
    composer.addPass(new OutputPass());
  }
  cssRenderer = new CSS3DRenderer();
  cssRenderer.setSize(W, H);
  cssRenderer.domElement.className = 'c3-layer';
  ui.root.prepend(cssRenderer.domElement);
  cssScene = new THREE.Scene();
  cast = new Cast({ scene: cssScene, assets, getCfg: () => cfg });
  cast.applyAssets();
  director = new Director(camera);
  els.vig = el('div', 'c3-vig');
  cssRenderer.domElement.after(els.vig);
  fx = el('canvas', 'c3-fx');
  fx.width = W;
  fx.height = H;
  fxg = fx.getContext('2d');
  cssRenderer.domElement.after(fx);
  ready = true;
  window.__club = { world, camera, director, cast, fireworks, perf, THREE };   // để gỡ lỗi / chỉnh thử trong DevTools
  updatePlaylist();
  updateTexts();
  updateLikeBar();
  renderBoard();
  scheduleApply();
  if (enabled && !paused) { last = performance.now(); requestAnimationFrame(loop); }
}

function init(opts) {
  canvas = opts.canvas;
  ui = opts.ui;
  sfx = opts.sfx;
  canvas.width = W;
  canvas.height = H;
  buildHud();
  setInterval(() => {
    if (!enabled || paused) return;
    updateLikeBar();
    syncMusic();
    if (thanks && Date.now() > thanksUntil) { thanks = ''; updateTexts(); }
  }, 1000);
}

let setupStarted = false;
function setConfig(next) {
  const prevTracks = JSON.stringify(tracks());
  const prevQuality = cfg.clubQuality;
  cfg = next;
  const was = enabled;
  enabled = cfg.mode === 'club';
  canvas.style.display = enabled ? 'block' : 'none';
  ui.root.style.display = enabled ? 'block' : 'none';
  if (enabled && !setupStarted) { setupStarted = true; setup(); }
  if (ready && prevQuality && prevQuality !== cfg.clubQuality) { location.reload(); return; }
  if (JSON.stringify(tracks()) !== prevTracks) { trackIdx = 0; if (music) music.removeAttribute('src'); }
  updatePlaylist();
  updateTexts();
  updateLikeBar();
  if (enabled && !was && ready) { last = performance.now(); requestAnimationFrame(loop); }
  syncMusic();
}

function setPaused(p) {
  if (p === paused) return;
  paused = p;
  ui.root.classList.toggle('paused', p);
  if (!p && enabled && ready) { last = performance.now(); requestAnimationFrame(loop); }
  syncMusic();
}

window.__clubRegister({ init, setConfig, onEvent, onStats, onRank, command, setPaused, isOn: () => enabled });
