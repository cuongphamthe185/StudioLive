/*
 * RẠP PHIM ONLINE — phòng chiếu phim mô phỏng cho TikTok LIVE.
 * Người xem vào phòng -> được chào, đi theo lối giữa vào hàng ghế, ngồi xem.
 * Màn hình chiếu danh sách phim do chủ phòng chọn (file trên máy).
 * Lệnh: vỗ tay / haha / wow / bắp / khóc. Quà -> ghế VIP vàng + đèn rọi + cảm ơn.
 * Đủ tim -> mưa bắp rang. Bảng TOP KHÁN GIẢ: 1 điểm/bình luận, 10 điểm/kim cương.
 * (Logic chào mừng / giọng đọc / tim / bảng điểm dùng lại cách làm của cảnh Đi Chùa.)
 */
(() => {
  'use strict';

  const W = 1080;
  const H = 1920;
  const FRAME_MS = 1000 / 30;
  const ASSETS = 'chua-assets/';
  // Màn hình 16:9 nằm trong vùng an toàn TikTok (cách mép 120px, dưới thanh trên)
  // Màn hình 16:9 nằm trong vùng an toàn TikTok (cách mép 120px, dưới thanh trên)
  const SCREEN = { x: 120, y: 305, w: 840, h: 472 };
  const AISLE_X = 540;
  const DOOR = { x: AISLE_X, y: 1960 }; // đi vào từ phía người xem (dưới khung hình)
  // Phối cảnh: tường sau bao quanh màn hình, sàn/tường bên/trần hội tụ về điểm tụ
  const BACK = { x0: 70, x1: 1010, y0: 220, y1: 870 };
  const halfFloor = (y) => 470 + (y - BACK.y1) * 0.25; // nửa bề ngang sàn tại độ cao y
  const RAIN_MS = 30 * 1000;
  const SEAT_AFTER_JOIN_MS = 4000;


  const REACT = [
    [/^(vo ?tay|clap|👏)/, 'clap', '👏'],
    [/^(haha|hihi|kaka|cuoi|😂|🤣)/, 'laugh', '😂'],
    [/^(wow|woa|oa|😮|😱)/, 'wow', '😮'],
    [/^(bap|bong ngo|popcorn|🍿)/, 'popcorn', '🍿'],
    [/^(khoc|huhu|😭|😢)/, 'cry', '😭'],
    [/^(yeu|tha tim|❤|💕|🥰)/, 'love', '❤️']
  ];
  const THANKS = [
    'Chúc bạn xem phim vui vẻ nhé.',
    'Mời bạn lên ghế VIP thưởng thức phim.',
    'Cả rạp cảm ơn bạn rất nhiều.',
    'Chúc bạn một buổi tối thật thư giãn.'
  ];

  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').trim();

  const ok = (im) => im && im.complete && im.naturalWidth > 0;

  // ---------------- Ngoại hình người xem (đồ thường, vẽ bằng code) ----------------
  const SKINS = ['#f1c7a5', '#e8b48f', '#d79f7a', '#c68863', '#a86b47', '#f6d5bc'];
  const HAIRS = ['#1a1412', '#2b1d16', '#3d2a1e', '#5a3b24', '#8a5a33', '#b98a52', '#d8b26e', '#6b2e2e', '#2e2e3a', '#c9c3bd'];
  const TOPS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#f1f5f9', '#1f2937', '#64748b', '#7c2d12', '#065f46'];
  const PANTS = ['#1e3a8a', '#1f2937', '#334155', '#3f3f46', '#57534e', '#d6d3d1', '#1e40af'];
  const HAIR_STYLES = ['short', 'short', 'long', 'long', 'bun', 'ponytail', 'curly', 'cap', 'hood', 'buzz'];
  function randomLook() {
    const hair = pick(HAIR_STYLES);
    return {
      skin: pick(SKINS), hairColor: pick(HAIRS), hair,
      top: pick(TOPS), topKind: hair === 'hood' ? 'hoodie' : pick(['tee', 'tee', 'hoodie', 'jacket']),
      pants: pick(PANTS), shoes: pick(['#f8fafc', '#111827', '#7c2d12', '#e11d48']),
      capColor: pick(['#111827', '#dc2626', '#2563eb', '#f8fafc', '#16a34a']),
      phones: Math.random() < 0.15, wide: rnd(0.92, 1.1)
    };
  }

  let cv, g, bg, ui, sfx, cfg = {};
  let enabled = false;
  let pauseAt = 0;
  let pausedMs = 0;
  const clock = () => (pauseAt || performance.now()) - pausedMs;
  let last = 0;

  // ---------------- Ghế: 7 hàng bậc thang, mỗi bên lối đi 6 ghế ----------------
  // (hàng trước tràn ra mép như nhìn từ trong rạp)
  const ROWS = [];
  for (let r = 0; r < 7; r++) {
    const y = 940 + r * 104 + r * r * 5;
    ROWS.push({ y, s: 0.5 + (y - 940) * 0.00078 });
  }
  const SEATS = [];
  ROWS.forEach((row, r) => {
    const sw = 90 * row.s;
    const aisle = 44 * row.s;
    for (let i = 0; i < 6; i++) {
      for (const side of [-1, 1]) {
        SEATS.push({ x: AISLE_X + side * (aisle + sw * (i + 0.5)), y: row.y, s: row.s, r, i, taken: null });
      }
    }
  });
  // hàng giữa (vùng an toàn TikTok) trước, ghế gần lối đi trước; hàng cuối bị bình luận che nên ngồi sau cùng
  const ROW_PRIORITY = [3, 2, 4, 1, 0, 5, 6];
  SEATS.sort((a, b) => ROW_PRIORITY.indexOf(a.r) - ROW_PRIORITY.indexOf(b.r) || a.i - b.i);
  const scaleAt = (y) => clamp(0.5 + (y - 940) * 0.00078, 0.42, 1.25);

  const people = new Map();
  let tagAllowed = new Set();
  let laneFlip = 1; // người vào liên tiếp đi lệch trái/phải trong lối đi
  const avatars = new Map();
  const effects = [];
  const bits = [];          // bắp rang / pháo giấy rơi
  let spotlight = null;
  let rainUntil = 0;
  let likeBase = -1;
  let likeCount = 0;
  const glow = { r: 60, g: 60, b: 80, a: 0.2 }; // ánh sáng màn hình hắt ra

  // ---------------- Phim ----------------
  const video = document.createElement('video');
  video.playsInline = true;
  video.preload = 'auto';
  let movieIdx = 0;
  let wantPlay = true;
  let sampleCv = null;
  const sampleG = () => {
    if (!sampleCv) { sampleCv = document.createElement('canvas'); sampleCv.width = 8; sampleCv.height = 8; }
    return sampleCv.getContext('2d', { willReadFrequently: true });
  };

  const movies = () => (Array.isArray(cfg.rapVideos) ? cfg.rapVideos : []).filter((x) => typeof x === 'string' && x);
  const movieName = (p) => String(p || '').split(/[\\/]/).pop().replace(/\.[a-z0-9]+$/i, '').replace(/[._-]+/g, ' ').trim();

  // YouTube: watch?v=, youtu.be/, shorts/, live/, embed/
  const ytId = (u) => {
    const m = String(u).match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|live\/|embed\/)|youtu\.be\/)([\w-]{11})/i);
    return m ? m[1] : '';
  };
  const ytStart = (u) => { const m = String(u).match(/[?&]t=(\d+)/); return m ? Number(m[1]) : 0; };
  let yt = null, ytReady = false, ytMode = false, ytTitle = '', ytHost = null;
  function ensureYT(cb) {
    if (window.YT && window.YT.Player) return cb();
    ensureYT.q = ensureYT.q || [];
    ensureYT.q.push(cb);
    if (ensureYT.loading) return;
    ensureYT.loading = true;
    window.onYouTubeIframeAPIReady = () => { ensureYT.q.forEach((f) => f()); ensureYT.q = []; };
    const sc = document.createElement('script');
    sc.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(sc);
  }
  function ytBox() {
    if (!ytHost) {
      ytHost = document.createElement('div');
      ytHost.className = 'r-yt';
      Object.assign(ytHost.style, { left: SCREEN.x + 'px', top: SCREEN.y + 'px', width: SCREEN.w + 'px', height: SCREEN.h + 'px' });
      const inner = document.createElement('div');
      inner.id = 'r-yt-player';
      ytHost.appendChild(inner);
      ui.root.prepend(ytHost);
    }
    return ytHost;
  }

  function onEnded() {
    const list = movies();
    if (movieIdx + 1 < list.length) loadMovie(movieIdx + 1);
    else if (cfg.rapLoop !== false) loadMovie(0);
    else { wantPlay = false; updateNowPlaying(); }
  }

  function loadMovie(i) {
    const list = movies();
    if (!list.length) {
      video.removeAttribute('src'); video.load();
      ytMode = false; if (ytHost) ytHost.style.display = 'none'; if (yt && ytReady) yt.stopVideo();
      updateNowPlaying(); return;
    }
    movieIdx = ((i % list.length) + list.length) % list.length;
    const p = list[movieIdx];
    const id = ytId(p);
    if (id) {
      ytMode = true;
      ytTitle = '';
      video.pause(); video.removeAttribute('src'); video.load();
      ytBox().style.display = 'block';
      ensureYT(() => {
        if (!yt) {
          yt = new window.YT.Player('r-yt-player', {
            width: SCREEN.w, height: SCREEN.h, videoId: id,
            playerVars: { autoplay: 0, controls: 0, rel: 0, playsinline: 1, modestbranding: 1, iv_load_policy: 3, disablekb: 1, fs: 0, start: ytStart(p) },
            events: {
              onReady: () => { ytReady = true; syncVideo(); },
              onStateChange: (e) => {
                if (e.data === 0) onEnded();
                if (e.data === 1) { try { ytTitle = yt.getVideoData().title || ''; } catch { /* bỏ qua */ } updateNowPlaying(); }
              },
              onError: (e) => {
                const code = e && e.data;
                ytTitle = code === 101 || code === 150 || code === 153
                  ? '⚠️ Video này bị chủ kênh / YouTube chặn phát ngoài YouTube — hãy chọn video khác'
                  : code === 100 ? '⚠️ Video không tồn tại hoặc đã bị xoá' : '⚠️ Không phát được video này';
                updateNowPlaying();
                if (movies().length > 1) setTimeout(() => loadMovie(movieIdx + 1), 4000);
              }
            }
          });
        } else if (ytReady) {
          yt.loadVideoById({ videoId: id, startSeconds: ytStart(p) });
          syncVideo();
        }
      });
    } else {
      ytMode = false;
      if (ytHost) ytHost.style.display = 'none';
      if (yt && ytReady) yt.stopVideo();
      video.removeAttribute('crossorigin');
      video.src = /^https?:\/\//i.test(p) ? p : `/rap/${movieIdx}?v=${encodeURIComponent(p)}`;
    }
    syncVideo();
    updateNowPlaying();
  }

  function syncVideo() {
    const muted = sfx ? sfx.muted() : true;
    const vol = clamp((cfg.volume ?? 0.7) * (cfg.rapVolume ?? 0.8) * (duck ? 0.4 : 1), 0, 1);
    const shouldPlay = enabled && wantPlay && !pauseAt;
    if (ytMode) {
      if (ytHost) ytHost.style.display = enabled ? 'block' : 'none';
      if (!yt || !ytReady) return;
      try {
        if (muted || !enabled) yt.mute(); else { yt.unMute(); yt.setVolume(Math.round(vol * 100)); }
        const st = yt.getPlayerState();
        if (shouldPlay && st !== 1 && st !== 3) yt.playVideo();
        if (!shouldPlay && st !== 2 && st !== 0) yt.pauseVideo(); // dừng cả khi đang tải dở
      } catch { /* player chưa sẵn sàng */ }
      return;
    }
    video.muted = muted;
    video.volume = vol;
    const play = shouldPlay && !!video.getAttribute('src');
    if (play && video.paused) video.play().catch(() => {});
    if (!play && !video.paused) video.pause();
  }

  video.addEventListener('ended', onEnded);
  video.addEventListener('error', () => {
    // file hỏng / link không phát được: chuyển phim kế tiếp sau 2 giây
    if (movies().length > 1) setTimeout(() => loadMovie(movieIdx + 1), 2000);
  });

  function updateNowPlaying() {
    if (!ui) return;
    const list = movies();
    const cur = list[movieIdx];
    const name = ytMode ? (ytTitle || 'YouTube') : /^https?:\/\//i.test(cur || '') ? decodeURIComponent(movieName(cur.split('?')[0])) || 'Video' : movieName(cur);
    ui.now.textContent = list.length ? `Đang chiếu: ${name}` : 'Chưa có phim — thêm phim trong app';
  }

  // ---------------- Khởi tạo ----------------
  function init(opts) {
    cv = opts.canvas;
    cv.width = W;
    cv.height = H;
    g = cv.getContext('2d');
    ui = opts.ui;
    sfx = opts.sfx;
    bg = document.createElement('canvas');
    bg.width = W;
    bg.height = H;
    paintBackground();
    last = clock();
    started = true;
    kick();
    setInterval(tick1s, 1000);
    setInterval(sampleScreen, 400);
  }

  let lastList = '';
  function setConfig(next) {
    cfg = next;
    const was = enabled;
    enabled = cfg.mode === 'rap';
    cv.style.display = enabled ? 'block' : 'none';
    ui.root.style.display = enabled ? 'block' : 'none';
    ui.title.textContent = '🎬 ' + roomName().toUpperCase();
    ui.title.style.color = theme().title;
    if ((cfg.rapTheme || 'classic') !== paintedTheme && bg) paintBackground();
    const listKey = JSON.stringify(movies());
    // chỉ nạp phim khi đang ở cảnh Rạp (tránh phim chạy ngầm có tiếng ở cảnh khác)
    if (enabled && listKey !== lastList) {
      lastList = listKey;
      loadMovie(Number(cfg.rapIndex) || 0);
    }
    updateLikeBar();
    if (enabled && !was) lastSpeechAt = Date.now();
    if (!enabled) voice.stop();
    syncVideo();
    kick();
  }

  const roomName = () => (cfg.rapName || '').trim() || 'Rạp Chiếu Phim';

  function setPaused(p) {
    if (p && !pauseAt) pauseAt = performance.now();
    else if (!p && pauseAt) {
      pausedMs += performance.now() - pauseAt;
      pauseAt = 0;
      kick();
    }
    if (p) voice.stop();
    syncVideo();
  }

  // ---------------- Khán giả ----------------
  function loadAvatar(url) {
    if (!url || !url.startsWith('https://')) return null;
    if (avatars.has(url)) return avatars.get(url);
    const img = new Image();
    img.referrerPolicy = 'no-referrer';
    img.src = url;
    avatars.set(url, img);
    return img;
  }
  const keyOf = (u) => String(u?.id || u?.uniqueId || u?.nickname || '');

  function cleanName(n) {
    let s = String(n).replace(/[\u0000-\u001f]/g, '').trim();
    const words = String(cfg.filterWords || '').split(',').map((w) => w.trim().toLowerCase()).filter(Boolean);
    for (const w of words) if (s.toLowerCase().includes(w)) s = 'Bạn';
    return s.slice(0, 24) || 'Bạn';
  }

  function pickSeat() {
    const free = SEATS.find((s) => !s.taken);
    if (free) return free;
    // hết ghế: người vào rạp lâu nhất đứng dậy ra về nhường ghế
    let oldest = null;
    for (const p of people.values()) {
      if (p.state !== 'sit' || p === spotlight?.p || p.vip) continue;
      if (!oldest || p.joinedAt < oldest.joinedAt) oldest = p;
    }
    if (!oldest) return null;
    const seat = oldest.seat;
    startLeave(oldest); // nhường ghế: đứng dậy đi ra, không biến mất
    return seat;
  }

  // Đứng dậy, đi ra lối giữa rồi xuống cầu thang ra khỏi rạp; ghế được trả lại ngay
  function startLeave(p) {
    if (p.state === 'leave') return;
    if (p.seat && p.seat.taken === p) p.seat.taken = null;
    const walkY = p.seat.y + 44 * p.seat.s;
    p.state = 'leave';
    p.bubble = null;
    p.path = [{ x: p.x, y: walkY }, { x: AISLE_X + 14 * p.seat.s, y: walkY }, { x: AISLE_X + 14 * p.seat.s, y: DOOR.y }];
  }

  function getPerson(user, create = true) {
    const k = keyOf(user);
    if (!k) return null;
    let p = people.get(k);
    if (p && p.state === 'leave' && create) { people.delete(k); p = null; } // đang đi ra mà quay lại: mời vào ngồi lại
    if (!p && create) {
      const seat = pickSeat();
      if (!seat) return null;
      const walkY = seat.y + 44 * seat.s;
      p = {
        key: k, name: cleanName(user?.nickname || 'Bạn'), img: loadAvatar(user?.avatar),
        look: randomLook(), seat,
        x: DOOR.x + (laneFlip = -laneFlip) * 34, y: DOOR.y, state: 'walk',
        path: [{ x: AISLE_X + laneFlip * 16 * seat.s, y: walkY }, { x: seat.x, y: walkY }],
        frame: 0, ft: 0, sitAt: 0, fade: 0, phase: rnd(0, 6.28), points: 0, active: Date.now(),
        bubble: null, react: null, vip: false, flip: false, joinedAt: Date.now()
      };
      seat.taken = p;
      people.set(k, p);
    }
    if (p) {
      p.active = Date.now();
      if (user?.avatar && !p.img) p.img = loadAvatar(user.avatar);
    }
    return p;
  }

  function react(p, kind, emoji) {
    p.react = { emoji, t0: clock(), dur: 2200 };
    effects.push({ type: 'emoji', emoji, x: p.x + rnd(-10, 10), y: headY(p) - 10, t0: clock(), dur: 1800 });
    if (kind === 'clap') { sfx.play('applause', 1); maybeCrowd('clap'); }
    else if (kind === 'laugh') { sfx.play('crowdLaugh', 1); maybeCrowd('laugh'); }
    else if (kind === 'wow') sfx.play('wow');
    else if (kind === 'popcorn') sfx.play('crunch');
    else if (kind === 'cry') sfx.play('sob');
    else if (kind === 'love') sfx.play('pop');
  }

  // Nhiều người cùng vỗ tay / cười trong 6 giây -> cả rạp hưởng ứng
  const recent = { clap: [], laugh: [] };
  function maybeCrowd(kind) {
    const now = Date.now();
    recent[kind] = recent[kind].filter((t) => now - t < 6000);
    recent[kind].push(now);
    if (recent[kind].length >= 3) { recent[kind] = []; crowd(kind); }
  }

  function crowd(kind) {
    const emoji = kind === 'clap' ? '👏' : '😂';
    for (const p of people.values()) {
      if (p.state !== 'sit') continue;
      setTimeout(() => {
        p.react = { emoji, t0: clock(), dur: 2000 };
        effects.push({ type: 'emoji', emoji, x: p.x, y: headY(p) - 10, t0: clock(), dur: 1600 });
      }, rnd(0, 700));
    }
    sfx.play(kind === 'clap' ? 'applause' : 'crowdLaugh', 3);
  }

  // ---------------- Quà ----------------
  function onGift(ev) {
    const p = getPerson(ev.user);
    if (!p) return;
    const coins = Number(ev.total || ev.diamonds || 1);
    p.points += coins * 10;
    p.vip = true;
    p.glowUntil = clock() + 9000;
    confetti(p.x, headY(p) - 40, 40 + Math.min(120, coins * 2));
    if (!spotlight || clock() > spotlight.until - 2000) {
      spotlight = { p, t0: clock(), until: clock() + 8000 };
      showNameplate(p, ev);
    }
    if (coins >= 99) { startRain(false); crowd('clap'); }
    else sfx.play('applause', 1);
    voice.say(`${roomName()} cảm ơn bạn ${speakName(p.name)} đã gửi tặng ${ev.giftName || 'quà'}. ${pick(THANKS)}`, true);
  }

  function showNameplate(p, ev) {
    const n = ui.plate;
    n.querySelector('.np-name').textContent = p.name;
    n.querySelector('.np-gift').textContent = `đã gửi tặng ${ev.giftName || 'quà'}${ev.repeatCount > 1 ? ' x' + ev.repeatCount : ''} · ghế VIP`;
    const av = n.querySelector('.np-av');
    av.replaceChildren();
    if (p.img) { const im = new Image(); im.referrerPolicy = 'no-referrer'; im.src = p.img.src; av.appendChild(im); }
    else av.textContent = (p.name[0] || '?').toUpperCase();
    n.classList.remove('on');
    void n.offsetWidth;
    n.classList.add('on');
    clearTimeout(showNameplate.t);
    showNameplate.t = setTimeout(() => n.classList.remove('on'), 7500);
  }

  function confetti(x, y, n) {
    const colors = ['#facc15', '#f472b6', '#38bdf8', '#a3e635', '#fb923c', '#ffffff'];
    for (let i = 0; i < n; i++) {
      const a = rnd(-Math.PI, 0), s = rnd(4, 11);
      bits.push({ kind: 'confetti', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: rnd(0, 6), vr: rnd(-0.2, 0.2), c: pick(colors), life: rnd(1.6, 2.6), age: 0 });
    }
  }

  // ---------------- Tim & mưa bắp rang ----------------
  function onStats(s) {
    if (!enabled || !s) return;
    if (likeBase < 0) likeBase = s.likes || 0;
    likeCount = (s.likes || 0) - likeBase;
    checkLikes();
  }
  function addLikes(n) { likeCount += n; checkLikes(); }
  function checkLikes() {
    const goal = Math.max(10, cfg.rapLikeGoal || 500);
    if (likeCount >= goal) { likeBase += goal; likeCount -= goal; startRain(true); }
    updateLikeBar();
  }
  function updateLikeBar() {
    if (!ui) return;
    const goal = Math.max(10, cfg.rapLikeGoal || 500);
    const raining = clock() < rainUntil;
    ui.likeFill.style.width = (raining ? 100 : clamp((likeCount / goal) * 100, 0, 100)) + '%';
    ui.likeText.textContent = raining ? '🍿 Mưa bắp rang — cảm ơn cả nhà đã thả tim!' : `❤️ ${Math.max(0, likeCount)}/${goal} tim — đủ tim sẽ mưa bắp rang`;
  }
  function startRain(fromLikes) {
    rainUntil = clock() + RAIN_MS;
    sfx.play('applause', 2);
    if (fromLikes) voice.say(`Cảm ơn cả nhà đã thả tim. ${roomName()} mời cả rạp mưa bắp rang!`, false);
    updateLikeBar();
  }

  // ---------------- Giọng đọc (dùng lại cách làm của cảnh Đi Chùa) ----------------
  const speakName = (n) => String(n).replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim() || 'bạn';
  let lastSpeechAt = Date.now();
  let duck = false;
  const voice = {
    q: [], pq: [], busy: false, audio: null,
    say(text, priority) {
      if (!cfg.rapVoice || !text) return;
      (priority ? this.pq : this.q).push(text);
      if (this.q.length > 6) this.q.splice(0, this.q.length - 6);
      if (this.pq.length > 15) this.pq.splice(0, this.pq.length - 15);
      this.next();
    },
    next() {
      if (this.busy || pauseAt || !enabled) return;
      const text = this.pq.shift() || this.q.shift();
      if (!text) return;
      this.busy = true;
      lastSpeechAt = Date.now();
      const done = () => { this.busy = false; this.audio = null; setDuck(false); setTimeout(() => this.next(), 500); };
      ui.caption.textContent = text;
      ui.caption.classList.add('on');
      clearTimeout(this.capT);
      this.capT = setTimeout(() => ui.caption.classList.remove('on'), Math.max(4000, text.length * 85));
      if (sfx.muted()) { setTimeout(done, Math.max(2500, text.length * 70)); return; }
      const a = new Audio(`/api/tts?rate=${cfg.rapRate || 1}&text=${encodeURIComponent(text)}`);
      a.volume = Math.min(1, (cfg.volume ?? 0.7) + 0.25);
      this.audio = a;
      setDuck(true);
      a.onended = done;
      a.onerror = () => this.fallback(text, done);
      a.play().catch(() => this.fallback(text, done));
    },
    fallback(text, done) {
      const ss = window.speechSynthesis;
      const v = ss && ss.getVoices().find((x) => /^vi/i.test(x.lang));
      if (!v) { done(); return; }
      const u = new SpeechSynthesisUtterance(text);
      u.voice = v; u.lang = v.lang; u.rate = cfg.rapRate || 1;
      u.onend = done; u.onerror = done;
      ss.speak(u);
    },
    stop() {
      if (this.audio) { this.audio.pause(); this.audio = null; }
      window.speechSynthesis?.cancel();
      this.busy = false;
      setDuck(false);
    }
  };
  function setDuck(d) { duck = d; if (sfx) syncVideo(); }

  // Chào mừng: gom mỗi 6 giây, tối đa 3 tên một câu
  const greetQ = [];
  let lastGreet = 0;
  function greetTick() {
    if (!cfg.rapGreet || !greetQ.length || Date.now() - lastGreet < 6000) return;
    lastGreet = Date.now();
    const names = greetQ.splice(0, 3).map(speakName);
    const list = names.length > 1 ? names.slice(0, -1).join(', ') + ' và ' + names.at(-1) : names[0];
    voice.say(`Chào mừng ${list} đến với ${roomName()}. Mời bạn vào chỗ ngồi xem phim nhé.`, false);
  }
  function shareReminder() {
    voice.say(`Cảm ơn mọi người đang xem phim cùng ${roomName()}. Thấy phim hay thì thả tim và chia sẻ live cho bạn bè cùng xem nhé.`, false);
  }

  // ---------------- Sự kiện ----------------
  function onEvent(ev) {
    if (!enabled || !ev || pauseAt) return;
    switch (ev.type) {
      case 'chat': {
        const p = getPerson(ev.user);
        if (!p) return;
        p.points += 1;
        p.talkAt = clock();
        const n = norm(ev.text);
        const hit = REACT.find(([re]) => re.test(n));
        if (hit) react(p, hit[1], hit[2]);
        else p.bubble = { text: String(ev.text).slice(0, 60), until: clock() + 3800 };
        return;
      }
      case 'join': {
        const k = keyOf(ev.user);
        if (people.has(k)) return;
        greetQ.push(cleanName(ev.user?.nickname || 'bạn'));
        if (greetQ.length > 30) greetQ.splice(0, greetQ.length - 30);
        setTimeout(() => getPerson(ev.user), SEAT_AFTER_JOIN_MS);
        return;
      }
      case 'gift': onGift(ev); return;
      case 'follow': {
        const p = getPerson(ev.user);
        if (p) { p.points += 5; react(p, 'love', '💜'); }
        return;
      }
      case 'like': {
        const p = people.get(keyOf(ev.user));
        if (p && Math.random() < 0.4) effects.push({ type: 'emoji', emoji: '❤️', x: p.x + rnd(-14, 14), y: headY(p) - 10, t0: clock(), dur: 1500 });
        return;
      }
    }
  }

  function command(c) {
    if (!c) return;
    const a = c.action;
    if (a === 'play') { wantPlay = true; syncVideo(); }
    else if (a === 'pause') { wantPlay = false; syncVideo(); }
    else if (a === 'next') { wantPlay = true; loadMovie(movieIdx + 1); }
    else if (a === 'prev') { wantPlay = true; loadMovie(movieIdx - 1); }
    else if (a === 'index') { wantPlay = true; loadMovie(Number(c.n) || 0); }
    if (!enabled) return;
    if (a === 'speak' && c.text) voice.say(String(c.text).slice(0, 400), true);
    else if (a === 'clap') crowd('clap');
    else if (a === 'rain') startRain(false);
    else if (a === 'share') shareReminder();
    else if (a === 'testLikes') addLikes(Number(c.n) || 100);
    else if (a === 'reset') { for (const p of people.values()) p.points = 0; renderBoard(); }
  }

  // ---------------- Mỗi giây ----------------
  function tick1s() {
    if (!enabled || pauseAt) return;
    greetTick();
    renderBoard();
    updateLikeBar();
    syncVideo();
    if (cfg.rapVoice && Date.now() - lastSpeechAt > 120000 && !voice.busy) shareReminder();
    // im lặng quá lâu (TikTok không báo ai rời live) -> tự đứng dậy ra về, trả ghế
    const idleMs = (Number(cfg.rapIdleMin) || 0) * 60000;
    if (idleMs > 0) {
      const now = Date.now();
      let n = 0;
      for (const p of people.values()) {
        if (n >= 2) break; // mỗi giây tối đa 2 người ra về cho tự nhiên
        if (p.state === 'sit' && !p.vip && p !== spotlight?.p && now - p.active > idleMs) { startLeave(p); n++; }
      }
    }
  }

  function renderBoard() {
    const top = [...people.values()].filter((p) => p.points > 0).sort((a, b) => b.points - a.points).slice(0, 3);
    ui.board.replaceChildren(...top.map((p, i) => {
      const r = document.createElement('div');
      r.className = 'rb-row';
      const a = document.createElement('span'); a.className = 'rb-rank'; a.textContent = ['🥇', '🥈', '🥉'][i];
      const n = document.createElement('span'); n.className = 'rb-name'; n.textContent = p.name;
      const s = document.createElement('span'); s.className = 'rb-pts'; s.textContent = p.points;
      r.append(a, n, s);
      return r;
    }));
    ui.boardEmpty.style.display = top.length ? 'none' : '';
  }

  // Ánh sáng màn hình: lấy màu trung bình của khung phim hiện tại
  function sampleScreen() {
    if (!enabled || pauseAt) return;
    if (ytMode) { // không đọc được màu của YouTube: ánh sáng dịu thay đổi chậm
      const k = performance.now() / 3000;
      glow.r = 120 + 60 * Math.sin(k); glow.g = 120 + 50 * Math.sin(k * 1.3 + 1); glow.b = 160 + 50 * Math.sin(k * 0.7 + 2); glow.a = 0.26;
      return;
    }
    if (video.readyState < 2 || video.paused) { glow.a += (0.12 - glow.a) * 0.3; return; }
    try {
      const sg = sampleG();
      sg.drawImage(video, 0, 0, 8, 8);
      const d = sg.getImageData(0, 0, 8, 8).data;
      let r = 0, gg = 0, b = 0;
      for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; }
      const n = d.length / 4;
      r /= n; gg /= n; b /= n;
      const lum = (0.299 * r + 0.587 * gg + 0.114 * b) / 255;
      glow.r += (r - glow.r) * 0.4; glow.g += (gg - glow.g) * 0.4; glow.b += (b - glow.b) * 0.4;
      glow.a += (0.1 + lum * 0.45 - glow.a) * 0.4;
    } catch { /* phim từ link ngoài không cho đọc màu */ }
  }

  // ---------------- Vòng lặp ----------------
  // Cảnh không được chọn thì dừng hẳn vòng vẽ (không tốn CPU/GPU); kick() chạy lại khi cần
  let rafId = 0;
  let started = false;
  function kick() {
    if (!started || rafId || pauseAt || !enabled) return;
    last = clock();
    rafId = requestAnimationFrame(loop);
  }
  function loop(rt) {
    rafId = 0;
    if (pauseAt || !enabled) return;
    rafId = requestAnimationFrame(loop);
    const t = rt - pausedMs;
    if (t - last < FRAME_MS - 2) return;
    const dt = Math.min(0.06, (t - last) / 1000);
    last = t;
    update(dt, t);
    draw(t);
  }

  function update(dt, t) {
    for (const p of people.values()) {
      p.fade = Math.min(1, p.fade + dt * 2);
      if (p.state === 'walk' || p.state === 'leave') {
        const tgt = p.path[0];
        if (!tgt) {
          if (p.state === 'leave') { people.delete(p.key); continue; }
          p.state = 'sit'; p.sitAt = t; p.x = p.seat.x; p.y = p.seat.y; continue;
        }
        const dx = tgt.x - p.x, dy = tgt.y - p.y;
        const d = Math.hypot(dx, dy);
        const sp = (110 + 220 * scaleAt(p.y)) * dt;
        p.flip = Math.abs(dx) > Math.abs(dy) && dx < 0;
        if (d <= sp) {
          p.x = tgt.x; p.y = tgt.y; p.path.shift();
          if (!p.path.length) {
            if (p.state === 'leave') { people.delete(p.key); continue; }
            p.state = 'sit'; p.sitAt = t; p.x = p.seat.x; p.y = p.seat.y;
          }
        }
        else { p.x += (dx / d) * sp; p.y += (dy / d) * sp; }
        p.walkPh = (p.walkPh || 0) + dt * 9;
      }
    }
    if (spotlight && t > spotlight.until) spotlight = null;
    if (t < rainUntil && bits.length < 220 && Math.random() < 0.7) {
      bits.push({ kind: 'pop', x: rnd(120, 960), y: rnd(-40, 0), vx: rnd(-0.6, 0.6), vy: rnd(2, 4), r: rnd(0, 6), vr: rnd(-0.1, 0.1), life: 99, age: 0 });
    }
    for (let i = bits.length - 1; i >= 0; i--) {
      const b = bits[i];
      b.age += dt; b.x += b.vx; b.y += b.vy; b.r += b.vr;
      if (b.kind === 'confetti') { b.vy += 0.25; b.vx *= 0.98; }
      if (b.age > b.life || b.y > 1460) bits.splice(i, 1);
    }
    for (let i = effects.length - 1; i >= 0; i--) if (t - effects[i].t0 > effects[i].dur) effects.splice(i, 1);
  }

  // ---------------- 4 kiểu phòng chiếu ----------------
  const THEMES = {
    classic: { // Cổ điển: rèm nhung đỏ, viền vàng
      wall: ['#0d0709', '#160b0e', '#070405'], floor: ['#120809', '#050304'], carpet: '#3d0a12',
      seat: ['#8e1b2a', '#6a1220', '#2a060c'], seatHi: 'rgba(255,120,140,.12)', stepLight: '255,190,90',
      accent: '#d4a03c', title: '#fde68a'
    },
    gold: { // VIP Gold: ghế ngả da đen, viền vàng, đèn chùm
      wall: ['#0a0907', '#13110c', '#050403'], floor: ['#0f0d09', '#030302'], carpet: '#1c160a',
      seat: ['#2a2622', '#17140f', '#070605'], seatHi: 'rgba(255,215,140,.18)', trim: '#d4a03c', stepLight: '255,210,120',
      accent: '#e8c06a', title: '#fde68a', recliner: true
    },
    imax: { // IMAX: vách tiêu âm xanh đêm, dải LED, loa
      wall: ['#05070f', '#0a1020', '#03040a'], floor: ['#070a14', '#020308'], carpet: '#0d1630',
      seat: ['#2b3446', '#1b2232', '#0a0d16'], seatHi: 'rgba(120,200,255,.14)', stepLight: '80,200,255',
      accent: '#38bdf8', title: '#bae6fd', led: true
    },
    home: { // Phòng chiếu gia đình: gỗ ấm, sofa, đèn dây
      wall: ['#2a1a10', '#22150d', '#120b06'], floor: ['#3a2416', '#1a0f08'], carpet: '#5b2f1f',
      seat: ['#c9a27a', '#a67c55', '#5c3f27'], seatHi: 'rgba(255,240,215,.22)', stepLight: '255,200,130',
      accent: '#f5c27a', title: '#fde7c2', sofa: true
    }
  };
  const theme = () => THEMES[cfg.rapTheme] || THEMES.classic;
  let paintedTheme = '';

  // ---------------- Vẽ nền phòng chiếu (một lần mỗi khi đổi kiểu phòng) ----------------
  function paintBackground() {
    const T = theme();
    paintedTheme = cfg.rapTheme || 'classic';
    const b = bg.getContext('2d');
    b.clearRect(0, 0, W, H);
    const wall = b.createLinearGradient(0, 0, 0, H);
    wall.addColorStop(0, T.wall[0]); wall.addColorStop(0.45, T.wall[1]); wall.addColorStop(1, T.wall[2]);
    b.fillStyle = wall; b.fillRect(0, 0, W, H);
    const key = paintedTheme;
    if (key === 'classic') paintClassic(b, T);
    else if (key === 'gold') paintGold(b, T);
    else if (key === 'imax') paintImax(b, T);
    else paintHome(b, T);
    // khung đen màn hình
    b.fillStyle = '#000';
    b.fillRect(SCREEN.x - 10, SCREEN.y - 8, SCREEN.w + 20, SCREEN.h + 16);
    paintPerspective(b, T, key);
    // biển EXIT
    if (key !== 'home') {
      for (const x of [150, 930]) {
        b.fillStyle = '#062b15'; b.fillRect(x - 46, 880, 92, 34);
        b.fillStyle = '#34d399'; b.font = '800 24px system-ui'; b.textAlign = 'center'; b.textBaseline = 'middle';
        b.shadowColor = '#34d399'; b.shadowBlur = 14; b.fillText('EXIT', x, 898); b.shadowBlur = 0;
      }
    }
  }

  // Khung phòng 3D: trần, tường bên xiên vào, sàn bậc thang hội tụ về màn hình
  function paintPerspective(b, T, key) {
    const VP = { x: 540, y: 560 };
    const L = (y) => AISLE_X - halfFloor(y), R = (y) => AISLE_X + halfFloor(y);
    // tường bên (tối dần ra ngoài)
    for (const side of [-1, 1]) {
      const xb = side < 0 ? BACK.x0 : BACK.x1, xe = side < 0 ? 0 : W;
      const gr = b.createLinearGradient(xb, 0, xe, 0);
      gr.addColorStop(0, 'rgba(0,0,0,.05)'); gr.addColorStop(1, 'rgba(0,0,0,.6)');
      b.fillStyle = gr;
      b.beginPath(); b.moveTo(xe, 0); b.lineTo(xb, BACK.y0); b.lineTo(xb, BACK.y1); b.lineTo(xe, BACK.y1 + (side < 0 ? (BACK.x0 / 0.25) : ((W - BACK.x1) / 0.25))); b.closePath(); b.fill();
      b.strokeStyle = 'rgba(255,255,255,.07)'; b.lineWidth = 2;
      b.beginPath(); b.moveTo(xb, BACK.y0); b.lineTo(xb, BACK.y1); b.stroke();
      // đèn tường theo phối cảnh
      for (let k = 0; k < 4; k++) {
        const tt = 0.2 + k * 0.22;
        const x = xb + (xe - xb) * tt, y = 330 + (k * 0.22 + 0.2) * -60 + 300 * tt;
        const r = 40 + 90 * tt;
        const gl = b.createRadialGradient(x, y, 2, x, y, r);
        gl.addColorStop(0, `rgba(${T.stepLight},.4)`); gl.addColorStop(1, `rgba(${T.stepLight},0)`);
        b.fillStyle = gl; b.fillRect(x - r, y - r, r * 2, r * 2);
        b.fillStyle = `rgba(${T.stepLight},.9)`; b.fillRect(x - 3 - 3 * tt, y - 8 - 12 * tt, 6 + 6 * tt, 16 + 24 * tt);
      }
    }
    // trần: dầm hội tụ + đèn âm trần
    b.strokeStyle = 'rgba(255,255,255,.05)'; b.lineWidth = 3;
    for (let k = 0; k <= 8; k++) { const x = (k / 8) * W; b.beginPath(); b.moveTo(x, 0); b.lineTo(VP.x + (x - VP.x) * 0.82, BACK.y0); b.stroke(); }
    for (let row = 0; row < 3; row++) {
      const y = 40 + row * 62, spread = 1 - row * 0.18;
      for (let k = -3; k <= 3; k++) {
        const x = 540 + k * 150 * spread, r = 4 + (2 - row) * 2;
        const gl = b.createRadialGradient(x, y, 1, x, y, r * 6);
        gl.addColorStop(0, 'rgba(255,240,210,.9)'); gl.addColorStop(1, 'rgba(255,230,190,0)');
        b.fillStyle = gl; b.fillRect(x - r * 6, y - r * 6, r * 12, r * 12);
        b.fillStyle = '#fff6e0'; b.beginPath(); b.arc(x, y, r, 0, 6.28); b.fill();
      }
    }
    // tường bên: tấm tiêu âm + loa treo tường
    for (const side of [-1, 1]) {
      const xb = side < 0 ? BACK.x0 : BACK.x1, xe = side < 0 ? 0 : W;
      b.strokeStyle = 'rgba(255,255,255,.06)'; b.lineWidth = 2;
      for (let k = 1; k < 4; k++) {
        const tt = k / 4, x = xb + (xe - xb) * tt;
        b.beginPath(); b.moveTo(x, BACK.y0 - BACK.y0 * tt); b.lineTo(x, BACK.y1 + (side < 0 ? BACK.x0 : W - BACK.x1) / 0.25 * tt); b.stroke();
      }
      const sx = xb + (xe - xb) * 0.45, sy = 470;
      b.fillStyle = '#05060a'; b.fillRect(sx - 16, sy - 30, 32, 60);
      b.fillStyle = '#151820'; b.beginPath(); b.arc(sx, sy - 10, 9, 0, 6.28); b.arc(sx, sy + 14, 6, 0, 6.28); b.fill();
    }
    // sàn hình thang
    const fl = b.createLinearGradient(0, BACK.y1, 0, H);
    fl.addColorStop(0, T.floor[0]); fl.addColorStop(1, T.floor[1]);
    b.fillStyle = fl;
    b.beginPath(); b.moveTo(L(BACK.y1), BACK.y1); b.lineTo(R(BACK.y1), BACK.y1); b.lineTo(R(H), H); b.lineTo(L(H), H); b.closePath(); b.fill();
    if (key === 'home') {
      b.strokeStyle = 'rgba(0,0,0,.22)'; b.lineWidth = 2;
      for (let k = -10; k <= 10; k++) { b.beginPath(); b.moveTo(540 + k * 47, BACK.y1); b.lineTo(540 + k * 140, H); b.stroke(); }
      b.fillStyle = T.carpet;
      b.beginPath(); b.ellipse(AISLE_X, 1290, 520, 330, 0, 0, 6.28); b.fill();
      b.strokeStyle = 'rgba(245,194,122,.35)'; b.lineWidth = 6;
      b.beginPath(); b.ellipse(AISLE_X, 1290, 490, 305, 0, 0, 6.28); b.stroke();
      return;
    }
    // khoảng sàn thấp trước màn hình
    const pitY = ROWS[0].y - 92 * ROWS[0].s;
    b.fillStyle = 'rgba(0,0,0,.55)';
    b.beginPath(); b.moveTo(L(BACK.y1), BACK.y1); b.lineTo(R(BACK.y1), BACK.y1); b.lineTo(R(pitY), pitY); b.lineTo(L(pitY), pitY); b.closePath(); b.fill();
    // bậc thang của từng hàng ghế
    ROWS.forEach((row) => {
      const y = row.y + 38 * row.s, h = 46 * row.s;
      const face = b.createLinearGradient(0, y, 0, y + h);
      face.addColorStop(0, 'rgba(120,120,130,.35)'); face.addColorStop(1, 'rgba(0,0,0,.55)');
      b.fillStyle = face;
      b.fillRect(L(y), y, R(y) - L(y), h);
      b.fillStyle = 'rgba(255,255,255,.12)';
      b.fillRect(L(y), y, R(y) - L(y), 2);
    });
    // cầu thang lối đi giữa: 2 bậc giữa mỗi hàng, viền đèn LED
    const aw = (y) => 26 + (y - BACK.y1) * 0.075;
    b.fillStyle = T.carpet;
    b.beginPath(); b.moveTo(AISLE_X - aw(pitY), pitY); b.lineTo(AISLE_X + aw(pitY), pitY); b.lineTo(AISLE_X + aw(H), H); b.lineTo(AISLE_X - aw(H), H); b.fill();
    const stepYs = [];
    for (let r = 0; r < ROWS.length; r++) {
      const y0 = ROWS[r].y + 38 * ROWS[r].s;
      const y1 = r + 1 < ROWS.length ? ROWS[r + 1].y + 38 * ROWS[r + 1].s : y0 + 170;
      stepYs.push(y0, (y0 + y1) / 2);
    }
    stepYs.forEach((y) => {
      const hw = aw(y), riser = 10 + (y - pitY) * 0.02;
      b.fillStyle = 'rgba(0,0,0,.5)';
      b.fillRect(AISLE_X - hw, y, hw * 2, riser);
      b.fillStyle = `rgba(${T.stepLight},.85)`;
      b.fillRect(AISLE_X - hw, y - 1.5, hw * 2, 3);
      const gl = b.createRadialGradient(AISLE_X, y, 1, AISLE_X, y, hw * 1.4);
      gl.addColorStop(0, `rgba(${T.stepLight},.25)`); gl.addColorStop(1, `rgba(${T.stepLight},0)`);
      b.fillStyle = gl; b.fillRect(AISLE_X - hw * 1.4, y - hw * 0.6, hw * 2.8, hw * 1.2);
    });
    b.strokeStyle = 'rgba(190,195,205,.55)'; b.lineWidth = 3;
    for (const side of [-1, 1]) {
      b.beginPath(); b.moveTo(AISLE_X + side * (aw(pitY) + 4), pitY - 18); b.lineTo(AISLE_X + side * (aw(H) + 10), H - 60); b.stroke();
    }
    // lan can phía trước hàng đầu
    const ry = pitY - 6;
    b.strokeStyle = 'rgba(200,205,215,.7)'; b.lineWidth = 3;
    b.beginPath(); b.moveTo(L(ry) + 10, ry - 30); b.lineTo(AISLE_X - aw(ry) - 6, ry - 30); b.moveTo(AISLE_X + aw(ry) + 6, ry - 30); b.lineTo(R(ry) - 10, ry - 30); b.stroke();
    b.lineWidth = 2;
    for (let x = L(ry) + 10; x < R(ry) - 10; x += 38) {
      if (Math.abs(x - AISLE_X) < aw(ry) + 6) continue;
      b.beginPath(); b.moveTo(x, ry - 30); b.lineTo(x, ry); b.stroke();
    }
  }

  function paintClassic(b, T) {
    for (let i = 0; i < 70; i++) { b.fillStyle = `rgba(255,214,150,${rnd(0.15, 0.5)})`; b.beginPath(); b.arc(rnd(0, W), rnd(0, 240), rnd(1, 2.4), 0, 6.28); b.fill(); }
    const curtain = (x0, w) => {
      for (let i = 0; i < 9; i++) {
        const cx = x0 + (i / 9) * w;
        const gr = b.createLinearGradient(cx, 0, cx + w / 9, 0);
        gr.addColorStop(0, '#4a0710'); gr.addColorStop(0.5, '#9b1023'); gr.addColorStop(1, '#3a050c');
        b.fillStyle = gr; b.fillRect(cx, 250, w / 9 + 1, 600);
      }
    };
    curtain(0, 125); curtain(955, 125);
    const top = b.createLinearGradient(0, 250, 0, 300);
    top.addColorStop(0, '#5a0912'); top.addColorStop(1, '#2a0408');
    b.fillStyle = top; b.fillRect(0, 250, W, 50);
    for (let x = 0; x < W; x += 60) { b.fillStyle = '#7a0d1a'; b.beginPath(); b.arc(x + 30, 300, 30, 0, Math.PI); b.fill(); }
    b.fillStyle = T.accent; b.fillRect(0, 296, W, 4);
    stage(b, '#3a2414', '#140a05', 'rgba(255,190,110,.25)');
  }

  function paintGold(b, T) {
    for (const [x0, x1] of [[0, 112], [968, W]]) {
      for (let x = x0 + 8; x < x1; x += 22) {
        const gr = b.createLinearGradient(0, 250, 0, 900);
        gr.addColorStop(0, 'rgba(212,160,60,.65)'); gr.addColorStop(1, 'rgba(212,160,60,.08)');
        b.fillStyle = gr; b.fillRect(x, 250, 3, 650);
      }
    }
    b.strokeStyle = 'rgba(232,192,106,.55)'; b.lineWidth = 3;
    for (let i = 0; i < 5; i++) { b.beginPath(); b.arc(540, 250, 90 + i * 70, Math.PI, 0); b.stroke(); }
    for (const x of [270, 540, 810]) {
      const gl = b.createRadialGradient(x, 60, 4, x, 60, 140);
      gl.addColorStop(0, 'rgba(255,225,160,.6)'); gl.addColorStop(1, 'rgba(255,200,120,0)');
      b.fillStyle = gl; b.fillRect(x - 140, 0, 280, 220);
      b.strokeStyle = '#e8c06a'; b.lineWidth = 2; b.beginPath(); b.moveTo(x, 0); b.lineTo(x, 40); b.stroke();
      for (let i = -3; i <= 3; i++) { b.fillStyle = '#fff3d1'; b.beginPath(); b.arc(x + i * 14, 50 + Math.abs(i) * 6, 4, 0, 6.28); b.fill(); }
    }
    b.fillStyle = T.accent; b.fillRect(110, 292, 860, 3);
    stage(b, '#1b1610', '#070605', 'rgba(232,192,106,.35)');
  }

  function paintImax(b, T) {
    b.strokeStyle = 'rgba(56,189,248,.12)'; b.lineWidth = 2;
    for (let y = 250; y < 900; y += 52) {
      for (let x = (y / 52) % 2 ? 30 : 0; x < W; x += 60) {
        if (x > 105 && x < 975) continue;
        b.beginPath();
        for (let k = 0; k < 6; k++) { const a = (k / 6) * 6.28; b.lineTo(x + Math.cos(a) * 24, y + Math.sin(a) * 24); }
        b.closePath(); b.stroke();
      }
    }
    for (const x of [55, 1025]) {
      b.fillStyle = '#0b1020'; b.fillRect(x - 32, 380, 64, 300);
      for (let y = 410; y < 670; y += 62) { b.fillStyle = '#111a2e'; b.beginPath(); b.arc(x, y, 22, 0, 6.28); b.fill(); b.fillStyle = '#05070f'; b.beginPath(); b.arc(x, y, 9, 0, 6.28); b.fill(); }
    }
    b.save();
    b.shadowColor = '#38bdf8'; b.shadowBlur = 24; b.strokeStyle = '#38bdf8'; b.lineWidth = 4;
    b.strokeRect(SCREEN.x - 18, SCREEN.y - 16, SCREEN.w + 36, SCREEN.h + 32);
    b.beginPath(); b.moveTo(0, 900); b.lineTo(W, 900); b.stroke();
    b.restore();
    b.fillStyle = '#e0f2fe'; b.font = '900 30px system-ui'; b.textAlign = 'center'; b.textBaseline = 'middle';
    b.globalAlpha = 0.18; b.fillText('◢ IMAX ◣', 540, 268); b.globalAlpha = 1;
    stage(b, '#0b1222', '#04060c', 'rgba(56,189,248,.35)');
  }

  function paintHome(b, T) {
    for (let x = 0; x < W; x += 54) {
      b.fillStyle = x % 108 ? 'rgba(0,0,0,.12)' : 'rgba(255,220,180,.04)';
      b.fillRect(x, 0, 54, 900);
    }
    b.strokeStyle = 'rgba(80,60,40,.7)'; b.lineWidth = 2;
    b.beginPath();
    for (let x = 0; x <= W; x += 10) b.lineTo(x, 230 + Math.sin(x / 90) * 18);
    b.stroke();
    for (let x = 20; x < W; x += 45) {
      const y = 232 + Math.sin(x / 90) * 18;
      const gl = b.createRadialGradient(x, y, 1, x, y, 26);
      gl.addColorStop(0, 'rgba(255,214,140,.9)'); gl.addColorStop(1, 'rgba(255,190,110,0)');
      b.fillStyle = gl; b.fillRect(x - 26, y - 26, 52, 52);
    }
    const lamp = (x) => {
      b.fillStyle = '#2b1a0e'; b.fillRect(x - 3, 640, 6, 250);
      b.fillStyle = '#f5d8a8'; b.beginPath(); b.moveTo(x - 40, 640); b.lineTo(x + 40, 640); b.lineTo(x + 26, 580); b.lineTo(x - 26, 580); b.fill();
      const gl = b.createRadialGradient(x, 640, 5, x, 660, 170);
      gl.addColorStop(0, 'rgba(255,210,140,.5)'); gl.addColorStop(1, 'rgba(255,190,110,0)');
      b.fillStyle = gl; b.fillRect(x - 170, 560, 340, 300);
    };
    lamp(60);
    b.fillStyle = '#7a4a2a'; b.fillRect(990, 830, 60, 60);
    for (let i = 0; i < 9; i++) { b.fillStyle = i % 2 ? '#2f6b3a' : '#3f8a4a'; b.beginPath(); b.ellipse(1020 + rnd(-30, 30), 800 - i * 22, 18, 40, rnd(-0.6, 0.6), 0, 6.28); b.fill(); }
    stage(b, '#4a2e1c', '#2a190e', 'rgba(255,214,160,.25)');
  }

  function stage(b, c0, c1, line) {
    const st = b.createLinearGradient(0, 790, 0, 860);
    st.addColorStop(0, c0); st.addColorStop(1, c1);
    b.fillStyle = st; b.fillRect(90, 790, 900, 70);
    b.fillStyle = line; b.fillRect(90, 790, 900, 3);
  }

  // ---------------- Vẽ mỗi khung ----------------
  const walkers = () => [...people.values()].filter((x) => x.state === 'walk' || x.state === 'leave').sort((a, b) => a.y - b.y);

  // Tắt đèn: cả phòng tối dần, chỉ còn màn hình sáng + ánh màn hình hắt xuống
  let lightsK = 0;
  function drawDarkness() {
    const want = cfg.rapLightsOff ? 1 : 0;
    lightsK += (want - lightsK) * 0.06;
    if (lightsK < 0.01) return;
    const { x, y, w, h } = SCREEN;
    g.save();
    g.fillStyle = `rgba(0,0,0,${0.72 * lightsK})`;
    g.beginPath(); g.rect(0, 0, W, H); g.rect(x - 4, y - 4, w + 8, h + 8);
    g.fill('evenodd');
    // ánh màn hình hắt lên khán giả trong bóng tối
    g.globalCompositeOperation = 'lighter';
    const gr = g.createRadialGradient(540, y + h, 60, 540, y + h + 300, 900);
    gr.addColorStop(0, `rgba(${glow.r | 0},${glow.g | 0},${glow.b | 0},${0.32 * lightsK})`);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, y + h, W, H - y - h);
    // đèn viền bậc thang vẫn sáng
    g.fillStyle = `rgba(${theme().stepLight},${0.55 * lightsK})`;
    for (const r of ROWS) {
      const yy = r.y + 38 * r.s, hw = 26 + (yy - 870) * 0.075;
      g.fillRect(540 - hw, yy - 1.5, hw * 2, 3);
    }
    g.restore();
  }

  function draw(t) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(bg, 0, 0);
    drawScreen(t);
    drawRoomLight();
    drawSpotlight(t);
    const dark = lightsK > 0.01 || cfg.rapLightsOff;
    if (!dark) {
      // từng hàng từ xa đến gần: người ngồi rồi tới lưng ghế che phần dưới
      for (let r = 0; r < ROWS.length; r++) {
        for (const p of people.values()) if (p.state === 'sit' && p.seat.r === r) drawSeated(p, t);
        drawSeatRow(r);
      }
      for (const p of walkers()) drawWalker(p);
      drawDarkness();
    } else {
      // Tắt đèn: ghế + phòng tối, khán giả vẫn rõ (ánh màn hình hắt lên), ghế hàng trước vẫn che phần dưới
      for (let r = 0; r < ROWS.length; r++) drawSeatRow(r);
      drawDarkness();
      for (let r = 0; r < ROWS.length; r++) {
        for (const p of people.values()) if (p.state === 'sit' && p.seat.r === r) drawSeated(p, t);
        g.save(); drawSeatRow(r); g.globalAlpha = 0.72 * lightsK; g.fillStyle = '#000';
        for (const seat of SEATS) if (seat.r === r) { const q = seatRect(seat); g.fillRect(q.x - 6 * seat.s, q.y - 9 * seat.s, q.w + 12 * seat.s, q.h + 9 * seat.s); }
        g.restore();
      }
      for (const p of walkers()) drawWalker(p);
    }
    // tên: người im lặng vẽ trước, người vừa hoạt động vẽ sau cùng để nổi lên trên
    const recent = (p) => (p.state !== 'sit' || p.vip ? 1e12 : Math.max(p.talkAt || 0, p.sitAt || 0));
    for (const p of [...people.values()].sort((a, b) => recent(a) - recent(b))) drawTag(p, t);
    drawEffects(t);
    drawBits();
  }

  function drawScreen(t) {
    const { x, y, w, h } = SCREEN;
    const playing = video.getAttribute('src') && video.readyState >= 2;
    if (ytMode) {
      // khung YouTube nằm đè lên đúng vị trí màn hình
      g.fillStyle = '#000'; g.fillRect(x, y, w, h);
    } else if (playing) {
      // giữ đúng tỉ lệ phim, viền đen nếu khác 16:9
      const vw = video.videoWidth || 16, vh = video.videoHeight || 9;
      const k = Math.min(w / vw, h / vh);
      const dw = vw * k, dh = vh * k;
      g.fillStyle = '#000'; g.fillRect(x, y, w, h);
      g.drawImage(video, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
    } else {
      const gr = g.createLinearGradient(x, y, x + w, y + h);
      gr.addColorStop(0, '#1e1b2e'); gr.addColorStop(1, '#0b0a12');
      g.fillStyle = gr; g.fillRect(x, y, w, h);
      // vòng đếm ngược kiểu phim nhựa
      const cx = x + w / 2, cy = y + h / 2 - 20;
      g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 3;
      g.beginPath(); g.arc(cx, cy, 110, 0, 6.28); g.stroke();
      g.beginPath(); g.moveTo(cx - 140, cy); g.lineTo(cx + 140, cy); g.moveTo(cx, cy - 140); g.lineTo(cx, cy + 140); g.stroke();
      const a = ((t / 1000) % 1) * 6.28;
      g.fillStyle = 'rgba(255,255,255,.08)';
      g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, 110, -Math.PI / 2, -Math.PI / 2 + a); g.fill();
      g.fillStyle = '#fde68a'; g.font = '900 54px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('🎬 SẮP CHIẾU', cx, cy);
      g.fillStyle = 'rgba(255,255,255,.75)'; g.font = '700 26px system-ui';
      g.fillText(movies().length ? 'Phim sẽ bắt đầu trong giây lát…' : 'Chủ phòng chưa chọn phim', cx, cy + 150);
    }
    // phản chiếu ánh sáng màn hình lên sân khấu
    const rf = g.createLinearGradient(0, y + h, 0, y + h + 90);
    rf.addColorStop(0, `rgba(${glow.r | 0},${glow.g | 0},${glow.b | 0},${glow.a * 0.9})`);
    rf.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rf; g.fillRect(x, y + h + 8, w, 90);
  }

  function drawRoomLight() {
    // ánh sáng màn hình hắt xuống khán phòng
    const gr = g.createRadialGradient(540, 540, 120, 540, 900, 1050);
    gr.addColorStop(0, `rgba(${glow.r | 0},${glow.g | 0},${glow.b | 0},${glow.a * 0.55})`);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = gr; g.fillRect(0, 780, W, 1140);
    g.restore();
  }

  function drawSpotlight(t) {
    if (!spotlight || !people.has(spotlight.p.key)) return;
    const p = spotlight.p;
    const k = Math.min(1, (t - spotlight.t0) / 500) * Math.min(1, (spotlight.until - t) / 800);
    g.save();
    g.globalCompositeOperation = 'lighter';
    const top = { x: p.x * 0.6 + 540 * 0.4, y: 250 };
    const gr = g.createLinearGradient(top.x, top.y, p.x, p.y);
    gr.addColorStop(0, `rgba(255,236,170,${0.05 * k})`); gr.addColorStop(1, `rgba(255,230,150,${0.35 * k})`);
    g.fillStyle = gr;
    const sw = 70 * p.seat.s;
    g.beginPath(); g.moveTo(top.x - 14, top.y); g.lineTo(top.x + 14, top.y); g.lineTo(p.x + sw, p.y + 10); g.lineTo(p.x - sw, p.y + 10); g.closePath(); g.fill();
    g.restore();
  }

  function seatRect(seat) {
    const s = seat.s;
    return { x: seat.x - 40 * s, y: seat.y - 82 * s, w: 80 * s, h: 120 * s };
  }

  function drawSeatRow(r) {
    const T = theme();
    if (T.sofa) { drawSofaRow(r, T); return; }
    for (const seat of SEATS) {
      if (seat.r !== r) continue;
      const { x, y, w, h } = seatRect(seat);
      const s = seat.s;
      const vip = seat.taken?.vip;
      const c = vip ? ['#d4a03c', '#a36d1c', '#5c3a0c'] : T.seat;
      const gr = g.createLinearGradient(x, y, x, y + h);
      gr.addColorStop(0, c[0]); gr.addColorStop(0.35, c[1]); gr.addColorStop(1, c[2]);
      g.fillStyle = gr;
      if (T.recliner) {
        // ghế ngả: lưng cao, bo tròn, tay vịn rộng
        roundRect(x - 4 * s, y - 8 * s, w + 8 * s, h + 8 * s, 20 * s); g.fill();
        g.strokeStyle = vip ? '#fde68a' : T.trim; g.lineWidth = 2.2 * s;
        roundRect(x + 4 * s, y - 2 * s, w - 8 * s, h - 6 * s, 14 * s); g.stroke();
      } else {
        // lưng ghế cao + tựa đầu + đường may dọc
        roundRect(x, y, w, h, 16 * s); g.fill();
        g.fillStyle = vip ? 'rgba(255,230,160,.35)' : T.seatHi;
        roundRect(x + 7 * s, y + 6 * s, w - 14 * s, 26 * s, 10 * s); g.fill();
        g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = 1.5 * s;
        g.beginPath(); g.moveTo(x + w / 2, y + 36 * s); g.lineTo(x + w / 2, y + h - 10 * s); g.stroke();
      }
      // tay vịn + đèn nhỏ dưới tay vịn
      g.fillStyle = T.recliner ? '#0c0a08' : '#151018';
      roundRect(x - 5 * s, y + h * 0.48, 9 * s, h * 0.5, 4 * s); g.fill();
      roundRect(x + w - 4 * s, y + h * 0.48, 9 * s, h * 0.5, 4 * s); g.fill();
      if (T.led || T.recliner) { g.fillStyle = T.led ? 'rgba(56,189,248,.8)' : 'rgba(232,192,106,.8)'; g.fillRect(x - 3 * s, y + h - 6 * s, 5 * s, 2 * s); }
      g.fillStyle = `rgba(${glow.r | 0},${glow.g | 0},${glow.b | 0},${glow.a * 0.35})`;
      roundRect(x, y, w, 6 * s, 3 * s); g.fill();
    }
  }

  // Phòng gia đình: mỗi bên lối đi là một chiếc sofa dài
  function drawSofaRow(r, T) {
    for (const side of [-1, 1]) {
      const seats = SEATS.filter((q) => q.r === r && Math.sign(q.x - AISLE_X) === side);
      if (!seats.length) continue;
      const s = seats[0].s;
      const xs = seats.map((q) => q.x);
      const x0 = Math.min(...xs) - 46 * s, x1 = Math.max(...xs) + 46 * s;
      const y = seats[0].y - 82 * s, h = 120 * s;
      const gr = g.createLinearGradient(0, y, 0, y + h);
      gr.addColorStop(0, T.seat[0]); gr.addColorStop(0.4, T.seat[1]); gr.addColorStop(1, T.seat[2]);
      g.fillStyle = gr;
      roundRect(x0, y, x1 - x0, h, 22 * s); g.fill();
      // gối tựa từng chỗ
      for (const q of seats) {
        const vip = q.taken?.vip;
        g.fillStyle = vip ? 'rgba(250,204,21,.55)' : T.seatHi;
        roundRect(q.x - 38 * s, y + 6 * s, 76 * s, 30 * s, 12 * s); g.fill();
      }
      // tay vịn
      g.fillStyle = T.seat[2];
      roundRect(x0 - 8 * s, y + 10 * s, 18 * s, h - 10 * s, 9 * s); g.fill();
      roundRect(x1 - 10 * s, y + 10 * s, 18 * s, h - 10 * s, 9 * s); g.fill();
    }
  }

  // đơn vị vẽ người: u (pixel) = tỉ lệ * 1.65
  const seatTop = (seat) => seat.y - 82 * seat.s;
  const SEAT_U = 2.05; // người ngồi to hơn cho dễ thấy
  const WALK_U = 2.0;
  const shoulderSeated = (seat) => seatTop(seat) + 6 * seat.s;
  // đỉnh đầu (để gắn tên ngay trên đầu)
  const headY = (p) => (p.state === 'sit' ? shoulderSeated(p.seat) - 31 * p.seat.s * SEAT_U : p.y - 150 * scaleAt(p.y) * WALK_U);

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const c = (v) => clamp(v + amt, 0, 255);
    return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
  }

  // Thân trên nhìn từ sau lưng: vai, cổ, đầu, tóc. sy = đường vai
  function drawUpper(x, sy, u, L, armSwing = 0, armLen = 30) {
    const w = 19 * u * L.wide;
    // tóc dài / mũ trùm phía sau vai
    if (L.hair === 'long') {
      g.fillStyle = L.hairColor;
      g.beginPath(); g.moveTo(x - 12 * u, sy - 18 * u); g.quadraticCurveTo(x - 15 * u, sy + 6 * u, x - 10 * u, sy + 20 * u);
      g.lineTo(x + 10 * u, sy + 20 * u); g.quadraticCurveTo(x + 15 * u, sy + 6 * u, x + 12 * u, sy - 18 * u); g.fill();
    }
    // tay
    for (const side of [-1, 1]) {
      const sw = side * armSwing;
      g.strokeStyle = L.topKind === 'tee' ? L.skin : shade(L.top, -18);
      g.lineWidth = 7 * u; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x + side * (w - 3 * u), sy + 3 * u); g.lineTo(x + side * (w + 1 * u) + sw * 3 * u, sy + armLen * u - Math.abs(sw) * 2 * u); g.stroke();
      if (L.topKind === 'tee') {
        g.strokeStyle = L.top; g.lineWidth = 8 * u;
        g.beginPath(); g.moveTo(x + side * (w - 3 * u), sy + 3 * u); g.lineTo(x + side * (w - 1 * u) + sw * u, sy + 14 * u); g.stroke();
      }
    }
    // thân áo
    const grd = g.createLinearGradient(x - w, sy, x + w, sy + 60 * u);
    grd.addColorStop(0, shade(L.top, 18)); grd.addColorStop(1, shade(L.top, -28));
    g.fillStyle = grd;
    g.beginPath();
    g.moveTo(x - w + 3 * u, sy + 34 * u);
    g.lineTo(x - w, sy + 8 * u); g.quadraticCurveTo(x - w, sy, x - w + 8 * u, sy - 1 * u);
    g.lineTo(x + w - 8 * u, sy - 1 * u); g.quadraticCurveTo(x + w, sy, x + w, sy + 8 * u);
    g.lineTo(x + w - 3 * u, sy + 34 * u); g.closePath(); g.fill();
    // chi tiết áo: đường may lưng / mũ hoodie / cổ áo khoác
    if (L.topKind === 'hoodie' && L.hair !== 'hood') {
      g.fillStyle = shade(L.top, -22);
      g.beginPath(); g.ellipse(x, sy + 4 * u, 13 * u, 9 * u, 0, 0, 6.28); g.fill();
    } else if (L.topKind === 'jacket') {
      g.fillStyle = shade(L.top, -35);
      g.fillRect(x - 9 * u, sy - 3 * u, 18 * u, 6 * u);
      g.strokeStyle = shade(L.top, -40); g.lineWidth = 1.5 * u;
      g.beginPath(); g.moveTo(x - w + 2 * u, sy + 26 * u); g.lineTo(x + w - 2 * u, sy + 26 * u); g.stroke();
    }
    // cổ
    g.fillStyle = shade(L.skin, -14);
    g.fillRect(x - 5 * u, sy - 9 * u, 10 * u, 10 * u);
    const hy = sy - 17 * u, r = 12.5 * u;
    // tai
    g.fillStyle = L.skin;
    g.beginPath(); g.ellipse(x - r + 0.5 * u, hy + 1 * u, 2.6 * u, 4 * u, 0, 0, 6.28); g.fill();
    g.beginPath(); g.ellipse(x + r - 0.5 * u, hy + 1 * u, 2.6 * u, 4 * u, 0, 0, 6.28); g.fill();
    // đầu (nhìn sau lưng: chủ yếu thấy tóc)
    if (L.hair === 'hood') {
      g.fillStyle = shade(L.top, -10);
      g.beginPath(); g.ellipse(x, hy - 1 * u, r + 3 * u, r + 4 * u, 0, 0, 6.28); g.fill();
      g.strokeStyle = shade(L.top, -30); g.lineWidth = 1.5 * u;
      g.beginPath(); g.moveTo(x, hy - r - 3 * u); g.lineTo(x, hy + r); g.stroke();
    } else {
      g.fillStyle = L.hair === 'buzz' ? shade(L.hairColor, 30) : L.hairColor;
      if (L.hair === 'curly') {
        for (let i = 0; i < 9; i++) { const a = (i / 9) * 6.28; g.beginPath(); g.arc(x + Math.cos(a) * r * 0.75, hy + Math.sin(a) * r * 0.8, r * 0.5, 0, 6.28); g.fill(); }
      }
      g.beginPath(); g.ellipse(x, hy, r, r * 1.08, 0, 0, 6.28); g.fill();
      // ánh tóc
      g.fillStyle = 'rgba(255,255,255,.12)';
      g.beginPath(); g.ellipse(x - 3 * u, hy - 5 * u, r * 0.45, r * 0.3, -0.4, 0, 6.28); g.fill();
      if (L.hair === 'short' || L.hair === 'buzz') {
        g.fillStyle = shade(L.skin, -10);
        g.beginPath(); g.ellipse(x, hy + r * 0.95, r * 0.55, r * 0.22, 0, 0, Math.PI); g.fill();
      }
      if (L.hair === 'bun') { g.fillStyle = L.hairColor; g.beginPath(); g.arc(x, hy - r - 2 * u, 6 * u, 0, 6.28); g.fill(); }
      if (L.hair === 'ponytail') {
        g.strokeStyle = L.hairColor; g.lineWidth = 6 * u; g.lineCap = 'round';
        g.beginPath(); g.moveTo(x, hy + 2 * u); g.quadraticCurveTo(x + 4 * u, hy + 16 * u, x + 1 * u, hy + 26 * u); g.stroke();
        g.fillStyle = '#f472b6'; g.fillRect(x - 3 * u, hy + 1 * u, 6 * u, 3 * u);
      }
      if (L.hair === 'cap') {
        g.fillStyle = L.capColor;
        g.beginPath(); g.ellipse(x, hy - 3 * u, r + 1 * u, r * 0.85, 0, Math.PI, 0); g.fill();
        g.fillRect(x - r - 1 * u, hy - 4 * u, (r + 1 * u) * 2, 4 * u);
        g.fillStyle = shade(L.capColor, -40); g.fillRect(x - 4 * u, hy - 2 * u, 8 * u, 3 * u);
      }
    }
    if (L.phones) {
      g.strokeStyle = '#111827'; g.lineWidth = 2.5 * u;
      g.beginPath(); g.arc(x, hy, r + 1.5 * u, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
      g.fillStyle = '#111827';
      g.beginPath(); g.ellipse(x - r - 1 * u, hy + 1 * u, 3.5 * u, 5 * u, 0, 0, 6.28); g.fill();
      g.beginPath(); g.ellipse(x + r + 1 * u, hy + 1 * u, 3.5 * u, 5 * u, 0, 0, 6.28); g.fill();
    }
  }

  // Người ngồi: đầu + vai nhô lên khỏi lưng ghế
  function drawSeated(p, t) {
    const s = p.seat.s;
    const u = s * SEAT_U;
    const sinkK = Math.min(1, (t - p.sitAt) / 400);
    let bob = 0;
    if (p.react && t - p.react.t0 < p.react.dur) bob = Math.sin((t - p.react.t0) / 80) * 2.5 * s;
    const sy = shoulderSeated(p.seat) + (1 - sinkK) * -18 * s + bob + Math.sin(t / 1100 + p.phase) * 0.8 * s;
    g.save();
    g.globalAlpha = p.fade;
    if (p.glowUntil && t < p.glowUntil) {
      g.save();
      g.globalCompositeOperation = 'lighter';
      const gr = g.createRadialGradient(p.x, sy - 20 * u, 6, p.x, sy - 20 * u, 120 * s);
      gr.addColorStop(0, 'rgba(255,215,130,.8)'); gr.addColorStop(1, 'rgba(255,170,60,0)');
      g.fillStyle = gr; g.fillRect(p.x - 130 * s, sy - 160 * s, 260 * s, 240 * s);
      g.restore();
    }
    drawUpper(p.x, sy, u, p.look, 0);
    // ánh màn hình hắt lên đầu
    g.globalCompositeOperation = 'source-atop';
    g.restore();
  }

  // Người đi vào rạp: toàn thân nhìn sau lưng, bước chân + vung tay
  function drawWalker(p) {
    const u = scaleAt(p.y) * WALK_U;
    const L = p.look;
    const ph = p.walkPh || 0;
    const step = Math.sin(ph);
    g.save();
    g.globalAlpha = p.fade;
    const x = p.x, y = p.y;
    g.fillStyle = 'rgba(0,0,0,.35)';
    g.beginPath(); g.ellipse(x, y + 2 * u, 18 * u, 5 * u, 0, 0, 6.28); g.fill();
    // chân
    for (const side of [-1, 1]) {
      const lift = Math.max(0, side * step) * 7 * u;
      g.strokeStyle = shade(L.pants, side * 8); g.lineWidth = 9 * u; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x + side * 6 * u, y - 62 * u); g.lineTo(x + side * 7 * u, y - 6 * u - lift); g.stroke();
      g.fillStyle = L.shoes;
      g.beginPath(); g.ellipse(x + side * 7 * u, y - 3 * u - lift, 6 * u, 4 * u, 0, 0, 6.28); g.fill();
    }
    // hông / quần
    g.fillStyle = L.pants;
    g.beginPath(); g.ellipse(x, y - 64 * u, 16 * u, 8 * u, 0, 0, 6.28); g.fill();
    g.fillStyle = shade(L.top, -28);
    g.fillRect(x - 17 * u * L.wide, y - 90 * u, 34 * u * L.wide, 28 * u);
    drawUpper(x, y - 120 * u, u, L, step, 40);
    g.restore();
  }

  function drawTag(p, t) {
    // Tên luôn gắn trên đầu. Người vừa hoạt động (20 giây) thì tên to, đủ chữ;
    // còn lại tên gọn theo bề ngang ghế, hai ghế cạnh nhau lệch cao thấp để không chồng chữ.
    const sitting = p.state === 'sit';
    const active = !sitting || p.vip || t - (p.talkAt || -1e9) < 20000 || t - p.sitAt < 6000;
    const ws = sitting ? p.seat.s : scaleAt(p.y);
    const f = clamp(ws / 0.95, 0.6, 1.05) * (active ? 1 : 0.85);
    const x = p.x;
    const stagger = sitting && !active && p.seat.i % 2 ? 30 * ws + 6 : 0;
    const y = headY(p) - 4 - stagger;
    const r = 13 * f, fs = Math.round(16 * f);
    g.save();
    g.globalAlpha = active ? 1 : 0.88;
    g.font = `700 ${fs}px "Be Vietnam Pro", system-ui, sans-serif`;
    const maxW = active ? 104 * f / 0.9 : Math.max(22, 2 * 88 * ws - 10 - r * 2 - 16);
    const label = fitText2(p.name, maxW);
    const w = g.measureText(label).width + r * 2 + 16;
    const h = Math.max(r * 2 + 6, fs + 10);
    g.fillStyle = p.vip ? 'rgba(120,80,10,.92)' : 'rgba(10,8,14,.78)';
    roundRect(x - w / 2, y - h, w, h, h / 2); g.fill();
    if (p.vip) { g.strokeStyle = '#fbbf24'; g.lineWidth = 2; g.stroke(); }
    const ax = x - w / 2 + r + 3, ay = y - h / 2;
    if (p.img && ok(p.img)) {
      g.save(); g.beginPath(); g.arc(ax, ay, r, 0, 6.28); g.clip(); g.drawImage(p.img, ax - r, ay - r, r * 2, r * 2); g.restore();
    } else {
      g.fillStyle = '#4c1d95'; g.beginPath(); g.arc(ax, ay, r, 0, 6.28); g.fill();
      g.fillStyle = '#ede9fe'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `800 ${Math.round(r)}px system-ui`; g.fillText((p.name[0] || '?').toUpperCase(), ax, ay + 1);
      g.font = `700 ${fs}px "Be Vietnam Pro", system-ui, sans-serif`;
    }
    g.fillStyle = p.vip ? '#fde68a' : '#f1f5f9';
    g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillText((p.vip ? '👑 ' : '') + label, ax + r + 5, ay + 1);
    // bong bóng bình luận
    if (p.bubble && t < p.bubble.until) {
      const bf = Math.round(18 * f);
      g.font = `700 ${bf}px "Be Vietnam Pro", system-ui, sans-serif`;
      const text = fitText2(p.bubble.text, 260 * f);
      const bw = g.measureText(text).width + 22;
      const bh = bf + 16;
      const by = y - h - bh - 10;
      const bx = clamp(x - bw / 2, 120, 960 - bw);
      g.globalAlpha = Math.min(1, (p.bubble.until - t) / 300);
      g.fillStyle = 'rgba(255,255,255,.95)';
      roundRect(bx, by, bw, bh, 12); g.fill();
      g.beginPath(); g.moveTo(x - 7, by + bh - 1); g.lineTo(x, by + bh + 9); g.lineTo(x + 7, by + bh - 1); g.fill();
      g.fillStyle = '#111827'; g.textAlign = 'left';
      g.fillText(text, bx + 11, by + bh / 2 + 1);
    }
    g.restore();
  }

  function drawEffects(t) {
    for (const e of effects) {
      if (e.type !== 'emoji') continue;
      const k = (t - e.t0) / e.dur;
      g.globalAlpha = Math.max(0, 1 - k);
      g.font = '40px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(e.emoji, e.x + Math.sin(k * 7) * 10, e.y - k * 110);
      g.globalAlpha = 1;
    }
  }

  function drawBits() {
    for (const b of bits) {
      g.save();
      g.translate(b.x, b.y); g.rotate(b.r);
      if (b.kind === 'confetti') {
        g.globalAlpha = Math.max(0, 1 - b.age / b.life);
        g.fillStyle = b.c; g.fillRect(-6, -3, 12, 6);
      } else {
        // bắp rang: vài cục tròn trắng ngà
        g.fillStyle = '#fff7e0';
        g.beginPath(); g.arc(-5, 0, 7, 0, 6.28); g.arc(4, -4, 6, 0, 6.28); g.arc(3, 5, 6, 0, 6.28); g.fill();
        g.fillStyle = '#f5c56b'; g.beginPath(); g.arc(0, 1, 3, 0, 6.28); g.fill();
      }
      g.restore();
    }
  }

  // ---------------- Tiện ích ----------------
  function roundRect(x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function fitText(s, max) {
    g.font = '700 16px system-ui';
    if (g.measureText(s).width <= max) return s;
    while (s.length > 1 && g.measureText(s + '…').width > max) s = s.slice(0, -1);
    return s + '…';
  }
  function fitText2(s, max) {
    if (g.measureText(s).width <= max) return s;
    while (s.length > 1 && g.measureText(s + '…').width > max) s = s.slice(0, -1);
    return s + '…';
  }

  window.RapScene = { init, setConfig, onEvent, onStats, command, setPaused, isOn: () => enabled };
})();
