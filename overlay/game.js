/*
 * NHÀ MA ONLINE — trò chơi tương tác trên overlay.
 * Người xem bình luận/vào phòng -> hoá thành ma. Lệnh chat: HÙ, TRỐN, TÌM.
 * Quà = bùa hộ mệnh; quà lớn = jumpscare + Bà Ma đi bắt; định kỳ có vòng TRỐN TÌM.
 */
(() => {
  'use strict';

  const W = 1080;
  const H = 1920;
  // vùng ma bay lượn: nằm trong vùng an toàn TikTok (tránh 110px hai bên, bình luận ở dưới)
  const AREA = { x1: 160, x2: 920, y1: 1080, y2: 1300 };
  const MAX_PLAYERS = 40;
  const IDLE_MS = 6 * 60 * 1000;

  const SPOTS = [
    { x: 190, y: 1180, kind: 'grave' },
    { x: 895, y: 1200, kind: 'tree' },
    { x: 270, y: 1395, kind: 'grave' },
    { x: 815, y: 1395, kind: 'coffin' },
    { x: 545, y: 1125, kind: 'door' },
    { x: 540, y: 1430, kind: 'bush' }
  ];

  const BOT_NAMES = ['Ma Xó', 'Ma Lai', 'Ma Trành'];
  const BOT_LINES = ['Hù nè! 👻', 'Ai dám hù lại tui?', 'Hihihi…', 'Sau lưng bạn kìa 👀',
    'Gõ “hù” để hù lại tui nè!', 'Gõ “trốn” đi, Bà Ma sắp tới đó!', 'Gõ “bùa” dán bùa tui thử xem 😜', 'Gõ “gọi hồn” nếu bạn dám…'];
  const HINTS = ['💡 Gõ “hù” để hù người khác!', '💡 Gõ “trốn” để nấp sau mộ', '💡 Gõ “bùa” để đóng băng ai đó', '💡 Gõ “tìm” để soi đèn pin'];
  const SCARED_LINES = ['Á Á Á!!!', 'Mẹ ơi!!! 😱', 'Hết hồn!!!', 'Cứu tuiii!', 'Ối giời ơi!'];

  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // Đồng hồ của trò chơi: đứng yên khi tạm dừng, chạy tiếp đúng chỗ khi bấm chạy lại
  let pausedMs = 0;
  let pauseAt = 0;
  const clock = () => (pauseAt || performance.now()) - pausedMs;
  const wall = () => Date.now() - pausedMs - (pauseAt ? performance.now() - pauseAt : 0);
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').trim();

  let cv, g, bgCanvas, sfx, ui;
  let cfg = {};
  let enabled = false;
  const players = new Map();
  const avatars = new Map();
  const effects = [];
  let boss = null;
  let round = { phase: 'idle', until: 0, next: 0 };
  let flash = 0;
  let darkUntil = 0;
  let lastBlackout = 0;
  let lastSummon = 0;
  let nextPeek = wall() + rnd(60000, 120000);
  let nextHowto = wall() + 6000;
  let newSinceHowto = 0;
  let lastHint = 0;
  let shake = 0;
  let likeMark = -1;
  let lastThunder = 0;
  let last = clock();

  // ---------------- Khởi tạo ----------------
  function init(opts) {
    cv = opts.canvas;
    cv.width = W;
    cv.height = H;
    g = cv.getContext('2d');
    sfx = opts.sfx;
    ui = opts.ui;
    bgCanvas = document.createElement('canvas');
    bgCanvas.width = W;
    bgCanvas.height = H;
    paintBackground();
    started = true;
    kick();
    setInterval(tick1s, 1000);
  }

  function setConfig(next) {
    cfg = next;
    const was = enabled;
    enabled = cfg.mode === 'game';
    cv.style.display = enabled ? '' : 'none';
    ui.root.style.display = enabled ? '' : 'none';
    paintBackground();
    syncBots();
    if (enabled && !was) scheduleRound();
    if (!cfg.roundEvery) round.next = 0;
    else if (!round.next) scheduleRound();
    kick();
  }

  function scheduleRound() {
    round.next = cfg.roundEvery ? wall() + cfg.roundEvery * 60 * 1000 : 0;
  }

  // ---------------- Người chơi ----------------
  function keyOf(user) {
    return String(user?.id || user?.uniqueId || user?.nickname || Math.random());
  }

  function loadAvatar(url) {
    if (!url || !url.startsWith('https://')) return null;
    if (avatars.has(url)) return avatars.get(url);
    const img = new Image();
    img.referrerPolicy = 'no-referrer';
    img.src = url;
    avatars.set(url, img);
    return img;
  }

  function spawnPoint() {
    return { x: rnd(AREA.x1, AREA.x2), y: rnd(AREA.y1, AREA.y2) };
  }

  function getPlayer(user, create = true) {
    const k = keyOf(user);
    let p = players.get(k);
    if (!p && create) {
      if (players.size >= MAX_PLAYERS) evictOne();
      const s = spawnPoint();
      p = {
        key: k, bot: false,
        name: user?.nickname || 'Ẩn danh',
        uid: user?.uniqueId || '',
        img: loadAvatar(user?.avatar),
        x: s.x, y: H + 120, tx: s.x, ty: s.y, vx: 0, vy: 0,
        hue: Math.floor(rnd(0, 360)),
        state: 'wander', stateUntil: 0, target: null,
        score: 0, born: clock(), active: wall(),
        bubble: null, shieldUntil: 0, hiddenAt: null, hat: false,
        cdScare: 0, cdHide: 0, cdSeek: 0, cdFx: 0, phase: rnd(0, 6.28),
        frozenUntil: 0, danceUntil: 0, laughUntil: 0, cryUntil: 0, dashMode: 'scare'
      };
      players.set(k, p);
      say(p, '👻 Mình vừa hoá ma! Gõ “hù” để chơi', 3500);
      sfx.creak();
      newSinceHowto++;
    }
    if (p) {
      p.active = wall();
      if (user?.avatar && !p.img) p.img = loadAvatar(user.avatar);
      if (user?.nickname) p.name = user.nickname;
    }
    return p;
  }

  function evictOne() {
    let oldest = null;
    for (const p of players.values()) {
      if (p.bot) continue;
      if (!oldest || p.active < oldest.active) oldest = p;
    }
    if (oldest) players.delete(oldest.key);
  }

  function syncBots() {
    const want = enabled && cfg.bots;
    for (const name of BOT_NAMES) {
      const k = 'bot:' + name;
      if (want && !players.has(k)) {
        const s = spawnPoint();
        players.set(k, {
          key: k, bot: true, name, uid: '', img: null,
          x: s.x, y: s.y, tx: s.x, ty: s.y, vx: 0, vy: 0,
          hue: name === 'Ma Xó' ? 140 : name === 'Ma Lai' ? 280 : 20,
          state: 'wander', stateUntil: 0, target: null, score: 0, born: clock(),
          active: wall(), bubble: null, shieldUntil: 0, hiddenAt: null, hat: false,
          cdScare: wall() + rnd(8000, 20000), cdHide: 0, cdSeek: 0, cdFx: 0, phase: rnd(0, 6.28),
          frozenUntil: 0, danceUntil: 0, laughUntil: 0, cryUntil: 0, dashMode: 'scare'
        });
      } else if (!want && players.has(k)) {
        players.delete(k);
      }
    }
  }

  function say(p, text, ms = 4200) {
    p.bubble = { text: String(text).slice(0, 80), until: clock() + ms };
  }

  const visible = (p) => p.state !== 'hidden' && p.state !== 'hiding';
  const shielded = (p) => p.shieldUntil > wall();
  const realCount = () => [...players.values()].filter((p) => !p.bot).length;

  // ---------------- Hành động ----------------
  const frozen = (p) => p.frozenUntil > wall();

  function findTarget(p, query, filter) {
    const others = [...players.values()].filter((o) => o !== p);
    if (query) {
      const q = norm(query.replace(/^@/, ''));
      const t = others.find((o) => norm(o.uid) === q) || others.find((o) => norm(o.name).includes(q) || norm(o.uid).includes(q));
      if (t) return t;
    }
    const pool = others.filter(filter);
    const real = pool.filter((o) => !o.bot);
    return pool.length ? pick(real.length && Math.random() < 0.7 ? real : pool) : null;
  }

  function doScare(p, query) {
    const now = wall();
    if (frozen(p)) { say(p, 'Bị dán bùa rồi, không nhúc nhích được 😵', 1800); return; }
    if (p.cdScare > now) { say(p, `⏳ Chờ ${Math.ceil((p.cdScare - now) / 1000)}s nữa mới hù được`, 2000); return; }
    let target = null;
    const others = [...players.values()].filter((o) => o !== p);
    if (query) {
      const q = norm(query.replace(/^@/, ''));
      target = others.find((o) => norm(o.uid) === q) || others.find((o) => norm(o.name).includes(q) || norm(o.uid).includes(q));
      if (target && !visible(target)) { say(p, `Không thấy ${target.name} đâu cả… 👀`); return; }
    }
    if (!target) {
      const pool = others.filter((o) => visible(o) && o.state !== 'scared');
      if (!pool.length) { say(p, 'Không còn ai để hù 😢 Rủ bạn vào chơi đi!'); return; }
      // ưu tiên người thật
      const real = pool.filter((o) => !o.bot);
      target = pick(p.bot && real.length ? real : pool);
    }
    p.cdScare = now + (p.bot ? rnd(15000, 30000) : 6000);
    if (p.state === 'hidden') unhide(p);
    p.state = 'dash';
    p.dashMode = 'scare';
    p.target = target;
    p.stateUntil = clock() + 3500;
    say(p, pick(['HÙ!!! 👻', 'Ú òa!!!', 'Bắt được rồi nhé!', 'Hùuuuu…']), 1800);
  }

  function landScare(p, t) {
    p.state = 'wander';
    p.target = null;
    if (p.dashMode === 'hug') {
      p.dashMode = 'scare';
      burst((p.x + t.x) / 2, (p.y + t.y) / 2 - 60, '#f472b6', 18);
      effects.push({ type: 'hearts', x: (p.x + t.x) / 2, y: (p.y + t.y) / 2 - 80, t0: clock(), dur: 1800 });
      say(p, 'Ôm cái nào 🤗', 2000);
      say(t, pick(['Ấm quá 🥹', 'Ủa ma mà cũng ôm hả?', 'Hihi 💕']), 2000);
      feed(`🤗 ${p.name} ôm ${t.name}`);
      sfx.chime();
      return;
    }
    if (!visible(t)) { say(p, 'Ủa đâu mất rồi? 🤔', 2000); return; }
    if (shielded(t)) {
      say(t, 'Có bùa rồi, hù không được đâu 😎', 2500);
      burst(t.x, t.y - 40, '#facc15', 14);
      feed(`🧧 ${t.name} có bùa, ${p.name} hù hụt`);
      return;
    }
    scared(t, p);
    p.score += 1;
    feed(`👻 ${p.name} gõ “hù” → hù ${t.name} 😱`);
    sfx.boo();
    setTimeout(() => sfx.scream(), 220);
  }

  function scared(t, by) {
    t.state = 'scared';
    t.stateUntil = clock() + 2200;
    const dx = t.x - (by?.x ?? t.x - 1);
    const dy = t.y - (by?.y ?? t.y);
    const d = Math.hypot(dx, dy) || 1;
    t.vx = (dx / d) * 14;
    t.vy = (dy / d) * 10 - 6;
    say(t, pick(SCARED_LINES), 2200);
    burst(t.x, t.y - 40, '#e0f2fe', 10);
    shake = Math.max(shake, 6);
  }

  function doHide(p) {
    const now = wall();
    if (p.state === 'hidden' || p.state === 'hiding') { say(p, 'Đang trốn rồi mà 🤫', 1500); return; }
    if (p.cdHide > now) { say(p, `⏳ ${Math.ceil((p.cdHide - now) / 1000)}s nữa mới trốn được`, 2000); return; }
    p.cdHide = now + 30000;
    const counts = SPOTS.map((s) => [...players.values()].filter((o) => o.hiddenAt === s).length);
    const free = SPOTS.filter((s, i) => counts[i] < 4);
    const spot = pick(free.length ? free : SPOTS);
    p.hiddenAt = spot;
    p.state = 'hiding';
    p.tx = spot.x + rnd(-30, 30);
    p.ty = spot.y - 30;
    p.hideUntil = clock() + (round.phase === 'idle' ? 25000 : 60000);
    say(p, 'Trốn đây… 🤫', 1600);
    sfx.footsteps(3, 0.18);
  }

  function unhide(p) {
    p.hiddenAt = null;
    p.state = 'wander';
  }

  function doSeek(p) {
    const now = wall();
    if (p.cdSeek > now) { say(p, `⏳ ${Math.ceil((p.cdSeek - now) / 1000)}s nữa mới soi được`, 2000); return; }
    p.cdSeek = now + 12000;
    if (p.state === 'hidden' || p.state === 'hiding') unhide(p);
    effects.push({ type: 'torch', who: p, t0: clock(), dur: 2200 });
    sfx.flashlight();
    sfx.heartbeat(3, 110);
    setTimeout(() => {
      let found = 0;
      for (const o of players.values()) {
        if (o === p || o.state !== 'hidden') continue;
        if (Math.hypot(o.x - p.x, o.y - p.y) < 330) {
          unhide(o);
          scared(o, p);
          found++;
          feed(`🔦 ${p.name} tìm ra ${o.name}`);
        }
      }
      if (found) { p.score += 2 * found; say(p, `Tìm thấy ${found} con ma! +${2 * found}`, 2500); sfx.scream(); }
      else say(p, 'Không thấy ai… 👀', 2000);
    }, 900);
  }

  function fxCooldown(p, ms) {
    const now = wall();
    if (p.cdFx > now) { say(p, `⏳ ${Math.ceil((p.cdFx - now) / 1000)}s nữa nha`, 1500); return false; }
    p.cdFx = now + ms;
    return true;
  }

  function doFreeze(p, query) {
    if (frozen(p)) { say(p, 'Đang bị dán bùa mà 😵', 1500); return; }
    if (!fxCooldown(p, 15000)) return;
    const t = findTarget(p, query, (o) => visible(o) && !frozen(o));
    if (!t || !visible(t)) { say(p, 'Không thấy ai để dán bùa 👀', 1800); return; }
    if (shielded(t)) { say(t, 'Có bùa hộ mệnh, dán không dính 😎', 2200); return; }
    effects.push({ type: 'talisman', from: { x: p.x, y: p.y - 40 }, to: t, t0: clock(), dur: 450 });
    say(p, 'Sắc lệnh! 📜', 1500);
    setTimeout(() => {
      if (!players.has(t.key)) return;
      t.frozenUntil = wall() + 6000;
      if (t.state === 'dash') { t.state = 'wander'; t.target = null; }
      say(t, 'Ơ… không cử động được!! 😵', 2500);
      p.score += 1;
      feed(`📜 ${p.name} gõ “bùa” → đóng băng ${t.name}`);
      sfx.talisman();
    }, 450);
  }

  function doHug(p, query) {
    if (frozen(p)) return;
    if (!fxCooldown(p, 8000)) return;
    const t = findTarget(p, query, (o) => visible(o));
    if (!t || !visible(t)) { say(p, 'Không có ai để ôm 🥲', 1800); return; }
    if (p.state === 'hidden') unhide(p);
    p.state = 'dash';
    p.dashMode = 'hug';
    p.target = t;
    p.stateUntil = clock() + 3500;
  }

  function doDance(p) {
    if (!fxCooldown(p, 4000)) return;
    p.danceUntil = clock() + 4000;
    say(p, pick(['💃 Quẩy lên!', '🕺 Nhảy cùng ma nào', '🎶 Tung tăng…']), 2500);
    sfx.musicBox();
  }

  function doLaugh(p) {
    if (!fxCooldown(p, 4000)) return;
    p.laughUntil = clock() + 2500;
    const evil = Math.random() < 0.5;
    say(p, evil ? pick(['Khà khà khà!', 'Hê hê hê… 😈']) : 'Hihihihi…', 2500);
    sfx[evil ? 'evilLaugh' : 'childLaugh']();
  }

  function doCry(p) {
    if (!fxCooldown(p, 4000)) return;
    p.cryUntil = clock() + 3500;
    say(p, pick(['Huhu… 😭', 'Hức hức…', 'Trả mạng cho ta… 😢']), 3000);
    sfx[Math.random() < 0.5 ? 'sob' : 'wail']();
  }

  function doSprint(p) {
    if (frozen(p)) return;
    if (!fxCooldown(p, 5000)) return;
    if (p.state === 'hidden') unhide(p);
    p.state = 'wander';
    p.tx = p.x < W / 2 ? AREA.x2 : AREA.x1;
    p.ty = rnd(AREA.y1, AREA.y2);
    p.sprintUntil = clock() + 1500;
    say(p, 'Chạy điiii! 💨', 1500);
    sfx.footsteps(7, 0.11);
  }

  function doSummon(p) {
    const now = wall();
    if (now - lastSummon < 20000) { say(p, `Hồn chưa về kịp… ${Math.ceil((20000 - (now - lastSummon)) / 1000)}s nữa`, 1800); return; }
    lastSummon = now;
    say(p, 'Hồn ma ơi… về đây!!! 🕯️', 2000);
    feed(`🕯️ ${p.name} gõ “gọi hồn”`);
    sfx.choir();
    p.score += 1;
    setTimeout(() => ui.onPeek(), 900);
    for (const o of players.values()) if (o !== p && visible(o) && Math.random() < 0.5) setTimeout(() => say(o, pick(SCARED_LINES), 1600), 1300);
  }

  function doBlackout(p) {
    const now = wall();
    if (now - lastBlackout < 30000) { say(p, `Đèn vừa cúp xong… ${Math.ceil((30000 - (now - lastBlackout)) / 1000)}s nữa`, 1800); return; }
    lastBlackout = now;
    darkUntil = clock() + 4000;
    say(p, 'Tắt đèn nè… 🌑', 1800);
    feed(`🌑 ${p.name} gõ “tắt đèn” → cúp điện`);
    sfx.blackout();
    setTimeout(() => { if (Math.random() < 0.5) ui.onPeek(); }, 1800);
  }

  function giveShield(p, seconds) {
    p.shieldUntil = Math.max(p.shieldUntil, wall()) + seconds * 1000;
    burst(p.x, p.y - 40, '#facc15', 20);
    say(p, `🧧 Có bùa hộ mệnh ${Math.round((p.shieldUntil - wall()) / 1000)}s`, 2500);
  }

  // ---------------- Bà Ma ----------------
  function summonBoss(byName, ms, reason) {
    const targets = [...players.values()];
    boss = {
      x: -200, y: rnd(AREA.y1, AREA.y2), t0: clock(), until: clock() + ms,
      by: byName, caught: new Set(), reason, tx: W / 2, ty: (AREA.y1 + AREA.y2) / 2, retarget: 0
    };
    if (targets.length) sfx.boss();
  }

  function updateBoss(dt, now) {
    if (!boss) return;
    if (now > boss.until) {
      if (boss.reason === 'round') endRound();
      boss = null;
      return;
    }
    if (now > boss.retarget) {
      const prey = [...players.values()].filter((p) => visible(p) && !shielded(p) && !boss.caught.has(p));
      const t = prey.length ? pick(prey) : null;
      boss.tx = t ? t.x : rnd(AREA.x1, AREA.x2);
      boss.ty = t ? t.y : rnd(AREA.y1, AREA.y2);
      boss.retarget = now + 1200;
    }
    const k = Math.min(1, dt * 2.4);
    boss.x += (boss.tx - boss.x) * k;
    boss.y += (boss.ty - boss.y) * k;
    for (const p of players.values()) {
      if (boss.caught.has(p) || !visible(p) || shielded(p)) continue;
      if (Math.hypot(p.x - boss.x, p.y - boss.y) < 150) {
        boss.caught.add(p);
        scared(p, boss);
        sfx.scream(0.5);
        if (boss.reason !== 'round') feed(`💀 Bà Ma bắt được ${p.name}`);
        const owner = boss.by && [...players.values()].find((o) => o.name === boss.by);
        if (owner && owner !== p) owner.score += 1;
      }
    }
  }

  // ---------------- Vòng trốn tìm ----------------
  function startRound(force = false) {
    if (!enabled || round.phase !== 'idle') return;
    if (!force && realCount() < 1) { scheduleRound(); return; }
    round.phase = 'announce';
    round.until = clock() + 15000;
    sfx.bellToll(3);
    banner('🔦 BÀ MA SẮP ĐI TÌM!', 'Gõ TRỐN ngay để nấp — còn 15s', true);
    for (const p of players.values()) {
      if (p.bot && Math.random() < 0.6) setTimeout(() => doHide(p), rnd(1000, 9000));
    }
  }

  function updateRound(now) {
    if (round.phase === 'announce') {
      const left = Math.ceil((round.until - now) / 1000);
      banner('🔦 BÀ MA SẮP ĐI TÌM!', `Gõ TRỐN ngay để nấp — còn ${Math.max(0, left)}s`, true);
      if (now >= round.until) {
        round.phase = 'hunt';
        banner('💀 BÀ MA ĐANG ĐI TÌM…', 'Ai chưa trốn sẽ bị bắt!', true);
        sfx.heartbeat(14, 125);
        summonBoss('', 12000, 'round');
      }
    } else if (round.phase === 'idle' && round.next && wall() > round.next) {
      startRound();
    }
  }

  function endRound() {
    const all = [...players.values()];
    const caught = boss ? boss.caught : new Set();
    const survivors = all.filter((p) => !caught.has(p));
    for (const p of survivors) {
      if (p.state === 'hidden' || p.state === 'hiding') { p.score += 3; unhide(p); }
    }
    banner('🏁 KẾT THÚC VÒNG', `Sống sót: ${survivors.length} · Bị bắt: ${caught.size} · Ai trốn được +3 điểm`, true);
    round.phase = 'result';
    setTimeout(() => { round.phase = 'idle'; banner(); scheduleRound(); }, 5000);
  }

  // ---------------- Hiệu ứng ----------------
  function burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = rnd(0, Math.PI * 2);
      const s = rnd(2, 7);
      effects.push({ type: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2, life: rnd(0.6, 1.2), age: 0, color });
    }
  }

  function thunder() {
    const now = clock();
    if (now - lastThunder < 5000) return;
    lastThunder = now;
    flash = 1;
    sfx.thunder();
    for (const p of players.values()) if (visible(p) && Math.random() < 0.35) say(p, pick(['Ghê quá!', '😨', 'Sấm kìa!!']), 1500);
  }

  function jumpscare(name, giftName) {
    shake = 30;
    ui.onJumpscare(`${name} triệu hồi BÀ MA bằng ${giftName}!`);
  }

  // ---------------- UI DOM ----------------
  function banner(title, sub, show) {
    const b = ui.banner;
    if (!show) { b.classList.remove('on'); return; }
    b.querySelector('.b-title').textContent = title;
    b.querySelector('.b-sub').textContent = sub;
    b.classList.add('on');
  }

  function feed(text) {
    const li = document.createElement('div');
    li.className = 'kf';
    li.textContent = text;
    ui.feed.prepend(li);
    while (ui.feed.children.length > 3) ui.feed.lastChild.remove();
    setTimeout(() => li.classList.add('gone'), 9000);
    setTimeout(() => li.remove(), 9600);
  }

  function renderBoard() {
    const top = [...players.values()].filter((p) => p.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
    const box = ui.board;
    box.querySelector('.lb-empty').style.display = top.length ? 'none' : '';
    const list = box.querySelector('.lb-list');
    list.replaceChildren(...top.map((p, i) => {
      const row = document.createElement('div');
      row.className = 'lb-row';
      const r = document.createElement('span'); r.className = 'lb-rank'; r.textContent = ['🥇', '🥈', '🥉', '4', '5'][i];
      const n = document.createElement('span'); n.className = 'lb-name'; n.textContent = p.name + (p.bot ? ' 🤖' : '');
      const s = document.createElement('span'); s.className = 'lb-score'; s.textContent = p.score;
      row.append(r, n, s);
      return row;
    }));
  }

  function tick1s() {
    if (!enabled || pauseAt) return;
    renderBoard();
    const now = wall();
    if (now > nextPeek && round.phase === 'idle') { nextPeek = now + rnd(70000, 150000); ui.onPeek(); }
    if (round.phase === 'idle' && !boss) {
      const due = cfg.tutorialEvery && now > nextHowto;
      const crowd = newSinceHowto >= 3 && now > nextHowto - (cfg.tutorialEvery || 2) * 60000 + 45000;
      if (due || crowd) showHowto();
    }
    for (const p of [...players.values()]) {
      if (!p.bot && now - p.active > IDLE_MS && p.state !== 'leaving') { p.state = 'leaving'; p.ty = H + 200; }
      if (p.bot && p.cdScare < now && round.phase === 'idle' && Math.random() < 0.5) {
        if (Math.random() < 0.3) say(p, pick(BOT_LINES), 2500);
        const r = Math.random();
        if (r < 0.12) { p.cdScare = now + rnd(15000, 30000); doFreeze(p); }
        else if (r < 0.22) { p.cdScare = now + rnd(15000, 30000); doLaugh(p); }
        else doScare(p);
      }
    }
  }

  // ---------------- Vòng lặp ----------------
  // Giới hạn 30 khung hình/giây: TikTok cũng chỉ phát ~30 fps, màn hình 120Hz không làm tốn gấp 4 lần
  const FRAME_MS = 1000 / 30;
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
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    update(dt, t);
    draw(t);
  }

  function setPaused(p) {
    if (p && !pauseAt) {
      pauseAt = performance.now();
    } else if (!p && pauseAt) {
      pausedMs += performance.now() - pauseAt;
      pauseAt = 0;
      kick();
    }
  }

  function update(dt, now) {
    updateRound(now);
    updateBoss(dt, now);
    for (const p of [...players.values()]) {
      switch (p.state) {
        case 'wander':
          if (frozen(p)) break;
          if (p.sprintUntil > now) { steer(p, 900, dt); break; }
          if (Math.hypot(p.tx - p.x, p.ty - p.y) < 20 || Math.random() < dt * 0.25) {
            const s = spawnPoint();
            p.tx = s.x; p.ty = s.y;
          }
          steer(p, 70, dt);
          break;
        case 'dash': {
          const tg = p.target;
          if (!tg || !players.has(tg.key) || now > p.stateUntil) { p.state = 'wander'; p.target = null; break; }
          if (frozen(p)) { p.state = 'wander'; p.target = null; break; }
          p.tx = tg.x; p.ty = tg.y;
          steer(p, 620, dt);
          if (Math.hypot(tg.x - p.x, tg.y - p.y) < 80) landScare(p, tg);
          break;
        }
        case 'scared':
          p.x += p.vx; p.y += p.vy;
          p.vx *= 0.9; p.vy = p.vy * 0.9 + 0.4;
          p.x = clamp(p.x, AREA.x1, AREA.x2); p.y = clamp(p.y, AREA.y1 - 120, AREA.y2);
          if (now > p.stateUntil) { p.state = 'wander'; p.tx = p.x; p.ty = p.y; }
          break;
        case 'hiding':
          steer(p, 420, dt);
          if (Math.hypot(p.tx - p.x, p.ty - p.y) < 14) p.state = 'hidden';
          break;
        case 'hidden':
          if (now > p.hideUntil && round.phase === 'idle') unhide(p);
          break;
        case 'leaving':
          steer(p, 160, dt);
          if (p.y > H + 100) players.delete(p.key);
          break;
      }
    }
    separate();
    // hiệu ứng
    for (let i = effects.length - 1; i >= 0; i--) {
      const e = effects[i];
      if (e.type === 'spark') {
        e.age += dt; e.x += e.vx; e.y += e.vy; e.vy += 0.15;
        if (e.age > e.life) effects.splice(i, 1);
      } else if (now - e.t0 > e.dur) effects.splice(i, 1);
    }
    flash = Math.max(0, flash - dt * 2.2);
    shake = Math.max(0, shake - dt * 40);
  }

  // Đẩy các con ma ra xa nhau để không chồng lên nhau
  function separate() {
    const list = [...players.values()].filter((p) => p.state === 'wander' || p.state === 'scared');
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.01;
        if (d < 130) {
          const push = (130 - d) * 0.04;
          const ux = dx / d, uy = dy / d;
          a.x -= ux * push; a.y -= uy * push;
          b.x += ux * push; b.y += uy * push;
        }
      }
    }
    for (const p of list) {
      p.x = clamp(p.x, AREA.x1, AREA.x2);
      if (p.state === 'wander') p.y = clamp(p.y, AREA.y1, AREA.y2);
    }
  }

  function steer(p, speed, dt) {
    const dx = p.tx - p.x;
    const dy = p.ty - p.y;
    const d = Math.hypot(dx, dy);
    if (d < 1) return;
    const s = Math.min(d, speed * dt);
    p.x += (dx / d) * s;
    p.y += (dy / d) * s;
  }

  // ---------------- Vẽ ----------------
  function paintBackground() {
    const b = bgCanvas.getContext('2d');
    b.clearRect(0, 0, W, H);
    const full = cfg.background !== 'transparent';
    if (full) {
      const sky = b.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#060b10');
      sky.addColorStop(0.45, '#0d1a17');
      sky.addColorStop(0.62, '#0a120f');
      sky.addColorStop(1, '#040605');
      b.fillStyle = sky;
      b.fillRect(0, 0, W, H);
      // sao
      for (let i = 0; i < 90; i++) {
        b.fillStyle = `rgba(255,255,255,${rnd(0.15, 0.6)})`;
        b.fillRect(rnd(0, W), rnd(0, 700), rnd(1, 2.5), rnd(1, 2.5));
      }
      // trăng
      const mg = b.createRadialGradient(830, 420, 40, 830, 420, 260);
      mg.addColorStop(0, 'rgba(220,255,200,.35)');
      mg.addColorStop(1, 'rgba(220,255,200,0)');
      b.fillStyle = mg;
      b.fillRect(500, 100, 600, 640);
      b.fillStyle = '#e9f5d8';
      b.beginPath(); b.arc(830, 420, 92, 0, Math.PI * 2); b.fill();
      b.fillStyle = 'rgba(160,180,150,.35)';
      [[800, 395, 18], [860, 450, 12], [845, 380, 8]].forEach(([x, y, r]) => { b.beginPath(); b.arc(x, y, r, 0, Math.PI * 2); b.fill(); });
      // đồi
      b.fillStyle = '#07100c';
      b.beginPath(); b.moveTo(0, 1000);
      b.quadraticCurveTo(270, 900, 540, 980); b.quadraticCurveTo(820, 1050, W, 940);
      b.lineTo(W, H); b.lineTo(0, H); b.fill();
      drawHouse(b);
      // mặt đất
      const gr = b.createLinearGradient(0, 1060, 0, H);
      gr.addColorStop(0, '#0b1611');
      gr.addColorStop(1, '#030504');
      b.fillStyle = gr;
      b.fillRect(0, 1060, W, H - 1060);
      drawTree(b, 70, 1120, 1.1);
      drawTree(b, 1010, 1180, 1.3);
      // hàng rào
      b.fillStyle = '#05090a';
      for (let x = 0; x < W; x += 34) {
        if (x > 470 && x < 620) continue;
        b.fillRect(x, 1030, 8, 70);
        b.beginPath(); b.moveTo(x - 3, 1032); b.lineTo(x + 4, 1012); b.lineTo(x + 11, 1032); b.fill();
      }
      b.fillRect(0, 1048, 470, 6); b.fillRect(620, 1048, W - 620, 6);
    } else {
      const gr = b.createLinearGradient(0, 1300, 0, H);
      gr.addColorStop(0, 'rgba(0,0,0,0)');
      gr.addColorStop(1, 'rgba(0,0,0,.55)');
      b.fillStyle = gr;
      b.fillRect(0, 1300, W, H - 1300);
    }
  }

  function drawHouse(b) {
    b.save();
    b.fillStyle = '#04080a';
    // thân nhà
    b.fillRect(260, 640, 560, 420);
    // mái
    b.beginPath(); b.moveTo(230, 650); b.lineTo(540, 470); b.lineTo(850, 650); b.fill();
    // tháp
    b.fillRect(250, 520, 130, 540);
    b.beginPath(); b.moveTo(232, 530); b.lineTo(315, 330); b.lineTo(398, 530); b.fill();
    b.fillRect(660, 560, 110, 120);
    b.beginPath(); b.moveTo(648, 570); b.lineTo(715, 455); b.lineTo(782, 570); b.fill();
    // ống khói
    b.fillRect(730, 480, 40, 110);
    b.restore();
  }

  const WINDOWS = [
    [290, 600, 70, 90], [430, 700, 80, 100], [570, 700, 80, 100], [690, 600, 50, 60],
    [300, 820, 60, 90], [690, 820, 80, 100], [520, 560, 40, 50]
  ];

  function drawTree(b, x, y, s) {
    b.save();
    b.translate(x, y);
    b.scale(s, s);
    b.strokeStyle = '#05090a';
    b.lineCap = 'round';
    const branch = (len, w, depth) => {
      b.lineWidth = w;
      b.beginPath(); b.moveTo(0, 0); b.lineTo(0, -len); b.stroke();
      if (depth <= 0) return;
      b.translate(0, -len);
      [-0.55, 0.45].forEach((a, i) => {
        b.save(); b.rotate(a + (i ? 0.1 : -0.1)); branch(len * 0.68, w * 0.62, depth - 1); b.restore();
      });
    };
    branch(150, 22, 5);
    b.restore();
  }

  function drawProps(t) {
    for (const s of SPOTS) {
      g.save();
      g.translate(s.x, s.y);
      g.fillStyle = '#1b2421';
      g.strokeStyle = '#2c3a35';
      g.lineWidth = 3;
      if (s.kind === 'grave') {
        g.beginPath(); g.moveTo(-60, 40); g.lineTo(-60, -50); g.arc(0, -50, 60, Math.PI, 0); g.lineTo(60, 40); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = '#3c4b45'; g.font = '800 28px system-ui'; g.textAlign = 'center'; g.fillText('R.I.P', 0, -30);
        g.fillStyle = '#0b120f'; g.fillRect(-80, 34, 160, 16);
      } else if (s.kind === 'coffin') {
        g.fillStyle = '#2a1a14'; g.strokeStyle = '#4a2e22';
        g.beginPath(); g.moveTo(-40, -90); g.lineTo(40, -90); g.lineTo(62, -40); g.lineTo(40, 50); g.lineTo(-40, 50); g.lineTo(-62, -40); g.closePath(); g.fill(); g.stroke();
        g.strokeStyle = '#7c5a3a'; g.lineWidth = 6; g.beginPath(); g.moveTo(0, -60); g.lineTo(0, 10); g.moveTo(-22, -38); g.lineTo(22, -38); g.stroke();
      } else if (s.kind === 'tree') {
        g.fillStyle = '#0c1311'; g.fillRect(-36, -120, 72, 170);
        g.fillStyle = '#050807'; g.beginPath(); g.ellipse(0, -40, 14, 24, 0, 0, Math.PI * 2); g.fill();
      } else if (s.kind === 'door') {
        g.fillStyle = '#120c08'; g.strokeStyle = '#3b2716';
        g.beginPath(); g.moveTo(-56, 30); g.lineTo(-56, -90); g.arc(0, -90, 56, Math.PI, 0); g.lineTo(56, 30); g.closePath(); g.fill(); g.stroke();
        const glow = 0.25 + Math.sin(t / 300) * 0.1;
        g.fillStyle = `rgba(190,242,100,${glow})`; g.beginPath(); g.arc(30, -40, 6, 0, Math.PI * 2); g.fill();
      } else if (s.kind === 'bush') {
        g.fillStyle = '#0d1a12';
        [[-60, 0, 46], [0, -20, 56], [60, 0, 46], [-25, 20, 40], [30, 20, 40]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); });
      }
      g.restore();
    }
  }

  function drawWindows(t) {
    if (cfg.background === 'transparent') return;
    WINDOWS.forEach(([x, y, w, h], i) => {
      const f = 0.45 + 0.35 * Math.sin(t / (500 + i * 130) + i) + (Math.random() < 0.02 ? -0.4 : 0) + flash * 0.5;
      g.fillStyle = `rgba(190, 242, 100, ${clamp(f, 0.05, 1) * 0.55})`;
      g.shadowColor = '#a3e635';
      g.shadowBlur = 30;
      g.fillRect(x, y, w, h);
      g.shadowBlur = 0;
      g.fillStyle = '#04080a';
      g.fillRect(x + w / 2 - 3, y, 6, h);
      g.fillRect(x, y + h / 2 - 3, w, 6);
    });
  }

  function ghostPath(c, t, ph) {
    c.beginPath();
    c.moveTo(-50, -20);
    c.arc(0, -20, 50, Math.PI, 0);
    c.lineTo(50, 50);
    const waves = 4;
    for (let i = 0; i < waves; i++) {
      const x0 = 50 - (i * 100) / waves;
      const x1 = 50 - ((i + 1) * 100) / waves;
      const wob = Math.sin(t / 180 + i + ph) * 8;
      c.quadraticCurveTo((x0 + x1) / 2, 78 + wob, x1, 50);
    }
    c.closePath();
  }

  function drawGhost(p, t) {
    const age = (t - p.born) / 1000;
    const bob = Math.sin(t / 420 + p.phase) * 10;
    let alpha = Math.min(1, age * 2);
    if (p.state === 'hidden') alpha = 0.22;
    if (p.state === 'leaving') alpha = clamp((H + 100 - p.y) / 300, 0, 1);
    const sc = p.bot ? 0.95 : 1;
    let jx = 0;
    let rot = 0;
    if (p.state === 'scared') jx = Math.sin(t / 25) * 6;
    if (p.danceUntil > t) { rot = Math.sin(t / 120) * 0.35; jx += Math.sin(t / 90) * 18; }
    if (frozen(p)) jx = 0;

    g.save();
    g.globalAlpha = alpha;
    g.translate(p.x + jx, p.y + (frozen(p) ? 0 : bob));
    g.rotate(rot);
    g.scale(sc, sc);

    // khiên bùa
    if (shielded(p)) {
      g.save();
      g.rotate(t / 600);
      g.strokeStyle = 'rgba(250,204,21,.85)';
      g.lineWidth = 5;
      g.setLineDash([18, 14]);
      g.beginPath(); g.arc(0, 0, 88, 0, Math.PI * 2); g.stroke();
      g.restore();
    }

    const scaredNow = p.state === 'scared';
    const ice = frozen(p);
    const body = g.createLinearGradient(0, -70, 0, 70);
    body.addColorStop(0, scaredNow ? '#ffffff' : ice ? '#e0f2fe' : `hsl(${p.hue},70%,94%)`);
    body.addColorStop(1, scaredNow ? '#bfdbfe' : ice ? '#7dd3fc' : `hsl(${p.hue},45%,72%)`);
    g.shadowColor = scaredNow ? '#93c5fd' : `hsl(${p.hue},80%,70%)`;
    g.shadowBlur = 30;
    g.fillStyle = body;
    ghostPath(g, t, p.phase);
    g.fill();
    g.shadowBlur = 0;

    // tay
    const arm = scaredNow ? -40 : Math.sin(t / 300 + p.phase) * 10;
    g.fillStyle = `hsl(${p.hue},55%,85%)`;
    g.beginPath(); g.ellipse(-52, 10 + arm * 0.3, 14, 22, -0.6 + arm / 60, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(52, 10 + arm * 0.3, 14, 22, 0.6 - arm / 60, 0, Math.PI * 2); g.fill();

    // mặt
    const img = p.img;
    if (img && img.complete && img.naturalWidth) {
      g.save();
      g.beginPath(); g.arc(0, -22, 34, 0, Math.PI * 2); g.clip();
      g.drawImage(img, -34, -56, 68, 68);
      g.restore();
      g.strokeStyle = scaredNow ? '#60a5fa' : `hsl(${p.hue},70%,60%)`;
      g.lineWidth = 4;
      g.beginPath(); g.arc(0, -22, 34, 0, Math.PI * 2); g.stroke();
      if (scaredNow) { g.fillStyle = 'rgba(147,197,253,.35)'; g.beginPath(); g.arc(0, -22, 34, 0, Math.PI * 2); g.fill(); }
    } else {
      g.fillStyle = '#111';
      const ey = scaredNow ? 13 : 10;
      g.beginPath(); g.ellipse(-17, -26, 8, ey, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(17, -26, 8, ey, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(-15, -29, 2.5, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(19, -29, 2.5, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#222';
      if (scaredNow) { g.beginPath(); g.ellipse(0, 4, 10, 14, 0, 0, Math.PI * 2); g.fill(); }
      else if (p.laughUntil > t) { g.beginPath(); g.arc(0, -6, 18, 0.05 * Math.PI, 0.95 * Math.PI); g.fill(); g.fillStyle = '#fff'; g.fillRect(-10, -4, 20, 4); }
      else if (p.cryUntil > t) { g.beginPath(); g.arc(0, 8, 9, 1.1 * Math.PI, 1.9 * Math.PI); g.fill(); }
      else { g.beginPath(); g.arc(0, -2, 9, 0.1 * Math.PI, 0.9 * Math.PI); g.fill(); }
    }

    // mũ phù thuỷ cho người follow
    if (p.hat) {
      g.fillStyle = '#6d28d9';
      g.beginPath(); g.moveTo(-30, -62); g.lineTo(8, -128); g.lineTo(30, -62); g.closePath(); g.fill();
      g.fillRect(-46, -66, 92, 10);
      g.fillStyle = '#facc15'; g.fillRect(-26, -72, 52, 6);
    }

    if (scaredNow) {
      g.fillStyle = '#fde047';
      g.font = '900 40px system-ui';
      g.textAlign = 'center';
      g.fillText('!!', 58, -64);
    }
    // nước mắt
    if (p.cryUntil > t) {
      g.fillStyle = '#7dd3fc';
      for (let i = 0; i < 2; i++) {
        const k = ((t / 500 + i * 0.5) % 1);
        g.globalAlpha = alpha * (1 - k);
        g.beginPath(); g.ellipse(i ? 18 : -18, -10 + k * 70, 4, 7, 0, 0, Math.PI * 2); g.fill();
      }
      g.globalAlpha = alpha;
    }
    // nốt nhạc khi nhảy
    if (p.danceUntil > t) {
      g.fillStyle = `hsl(${(t / 5) % 360},90%,70%)`;
      g.font = '700 34px system-ui';
      g.fillText('♪', 60 + Math.sin(t / 200) * 10, -60 - ((t / 15) % 40));
      g.fillText('♫', -80, -40 - ((t / 20 + 20) % 40));
    }
    // lá bùa dán trán (cương thi)
    if (ice) {
      g.save();
      g.rotate(-0.08);
      g.fillStyle = '#facc15';
      g.fillRect(-18, -86, 36, 92);
      g.strokeStyle = '#b91c1c';
      g.lineWidth = 3.5;
      g.beginPath();
      g.moveTo(0, -78); g.lineTo(0, -66); g.moveTo(-9, -70); g.lineTo(9, -70);
      g.moveTo(-6, -56); g.quadraticCurveTo(10, -50, -4, -42); g.quadraticCurveTo(12, -34, -2, -26);
      g.moveTo(-8, -14); g.lineTo(8, -14); g.moveTo(0, -20); g.lineTo(0, -2);
      g.stroke();
      g.restore();
    }
    g.restore();

    // bảng tên
    if (p.state !== 'hidden') {
      g.save();
      g.globalAlpha = alpha;
      g.font = '800 24px system-ui, sans-serif';
      g.textAlign = 'center';
      const label = (p.bot ? '🤖 ' : '') + trimText(p.name, 220);
      const w = g.measureText(label).width + 28;
      const y = p.y + bob + 100;
      g.fillStyle = 'rgba(8,10,14,.78)';
      roundRect(g, p.x - w / 2, y - 22, w, 36, 18); g.fill();
      g.fillStyle = p.bot ? '#d1d5db' : '#fde047';
      g.fillText(label, p.x, y + 4);
      if (p.score > 0) {
        g.font = '900 20px system-ui';
        const sw = g.measureText(String(p.score)).width + 22;
        g.fillStyle = '#a3e635';
        roundRect(g, p.x + w / 2 - 10, y - 34, sw, 28, 14); g.fill();
        g.fillStyle = '#1a2e05';
        g.fillText(String(p.score), p.x + w / 2 - 10 + sw / 2, y - 13);
      }
      g.restore();
    }

    // bong bóng lời nói
    if (p.bubble && t < p.bubble.until && p.state !== 'hidden') {
      g.save();
      const fade = Math.min(1, (p.bubble.until - t) / 300);
      g.globalAlpha = fade * alpha;
      g.font = '700 26px system-ui, sans-serif';
      const lines = wrap(p.bubble.text, 340).slice(0, 2);
      const bw = Math.max(...lines.map((l) => g.measureText(l).width)) + 36;
      const bh = lines.length * 32 + 22;
      const bx = clamp(p.x - bw / 2, 16, W - bw - 16);
      const by = p.y + bob - 110 - bh - (p.hat ? 50 : 0);
      g.fillStyle = 'rgba(255,255,255,.95)';
      roundRect(g, bx, by, bw, bh, 20); g.fill();
      g.beginPath(); g.moveTo(p.x - 12, by + bh - 1); g.lineTo(p.x, by + bh + 18); g.lineTo(p.x + 12, by + bh - 1); g.fill();
      g.fillStyle = '#111827';
      g.textAlign = 'left';
      lines.forEach((l, i) => g.fillText(l, bx + 18, by + 38 + i * 32));
      g.restore();
    }
  }

  function drawBoss(t) {
    if (!boss) return;
    const life = clamp((t - boss.t0) / 600, 0, 1) * clamp((boss.until - t) / 600, 0, 1);
    g.save();
    // vùng sáng đỏ quét
    const rg = g.createRadialGradient(boss.x, boss.y, 30, boss.x, boss.y, 260);
    rg.addColorStop(0, `rgba(239,68,68,${0.35 * life})`);
    rg.addColorStop(1, 'rgba(239,68,68,0)');
    g.fillStyle = rg;
    g.fillRect(boss.x - 260, boss.y - 260, 520, 520);
    g.globalAlpha = life;
    g.translate(boss.x, boss.y + Math.sin(t / 200) * 14);
    g.scale(2.1, 2.1);
    const body = g.createLinearGradient(0, -70, 0, 80);
    body.addColorStop(0, '#3b0d1a');
    body.addColorStop(1, '#0a0206');
    g.shadowColor = '#ef4444';
    g.shadowBlur = 40;
    g.fillStyle = body;
    ghostPath(g, t * 1.5, 0);
    g.fill();
    g.shadowBlur = 0;
    // tóc dài
    g.fillStyle = '#050102';
    g.beginPath(); g.moveTo(-52, -30); g.quadraticCurveTo(0, -95, 52, -30); g.lineTo(58, 40); g.lineTo(30, 10); g.lineTo(-30, 10); g.lineTo(-58, 40); g.fill();
    g.fillStyle = '#ef4444';
    g.shadowColor = '#ef4444';
    g.shadowBlur = 20;
    g.beginPath(); g.ellipse(-16, -22, 8, 5, 0.3, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(16, -22, 8, 5, -0.3, 0, Math.PI * 2); g.fill();
    g.shadowBlur = 0;
    g.fillStyle = '#000';
    g.beginPath(); g.ellipse(0, 6, 12, 16, 0, 0, Math.PI * 2); g.fill();
    g.restore();
    g.save();
    g.globalAlpha = life;
    g.font = '900 30px system-ui';
    g.textAlign = 'center';
    g.fillStyle = '#fecaca';
    g.fillText('BÀ MA' + (boss.by ? ` của ${trimText(boss.by, 260)}` : ''), boss.x, boss.y + 200);
    g.restore();
  }

  function drawEffects(t) {
    for (const e of effects) {
      if (e.type === 'spark') {
        g.globalAlpha = 1 - e.age / e.life;
        g.fillStyle = e.color;
        g.beginPath(); g.arc(e.x, e.y, 4, 0, Math.PI * 2); g.fill();
        g.globalAlpha = 1;
      } else if (e.type === 'talisman') {
        const k = clamp((t - e.t0) / e.dur, 0, 1);
        const x = e.from.x + (e.to.x - e.from.x) * k;
        const y = e.from.y + (e.to.y - 60 - e.from.y) * k - Math.sin(k * Math.PI) * 120;
        g.save();
        g.translate(x, y);
        g.rotate(k * 12);
        g.fillStyle = '#facc15';
        g.fillRect(-14, -32, 28, 64);
        g.strokeStyle = '#b91c1c'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(0, -24); g.lineTo(0, 24); g.moveTo(-8, -10); g.lineTo(8, -10); g.stroke();
        g.restore();
      } else if (e.type === 'hearts') {
        const k = (t - e.t0) / e.dur;
        g.globalAlpha = Math.max(0, 1 - k);
        g.font = '40px system-ui';
        g.textAlign = 'center';
        for (let i = 0; i < 4; i++) g.fillText('💕', e.x + Math.sin(i * 1.7 + k * 4) * 50, e.y - k * 120 - i * 26);
        g.globalAlpha = 1;
      } else if (e.type === 'torch' && players.has(e.who.key)) {
        const k = (t - e.t0) / e.dur;
        const r = 330 * Math.min(1, k * 3);
        const a = k < 0.8 ? 0.4 : (1 - k) * 2;
        const rg = g.createRadialGradient(e.who.x, e.who.y, 20, e.who.x, e.who.y, r);
        rg.addColorStop(0, `rgba(254,249,195,${a})`);
        rg.addColorStop(1, 'rgba(254,249,195,0)');
        g.fillStyle = rg;
        g.beginPath(); g.arc(e.who.x, e.who.y, r, 0, Math.PI * 2); g.fill();
      }
    }
  }

  function drawFog(t) {
    for (let i = 0; i < 3; i++) {
      const y = 1250 + i * 180;
      const x = ((t / (60 + i * 25)) % (W + 600)) - 300;
      const rg = g.createRadialGradient(x, y, 20, x, y, 420);
      rg.addColorStop(0, 'rgba(200,230,210,.09)');
      rg.addColorStop(1, 'rgba(200,230,210,0)');
      g.fillStyle = rg;
      g.fillRect(x - 420, y - 420, 840, 840);
    }
  }

  function draw(t) {
    g.save();
    g.clearRect(0, 0, W, H);
    if (shake > 0) g.translate(rnd(-shake, shake), rnd(-shake, shake));
    g.drawImage(bgCanvas, 0, 0);
    drawWindows(t);
    const list = [...players.values()].sort((a, b) => a.y - b.y);
    list.filter((p) => p.state === 'hidden').forEach((p) => drawGhost(p, t));
    drawProps(t);
    drawEffects(t);
    list.filter((p) => p.state !== 'hidden').forEach((p) => drawGhost(p, t));
    drawBoss(t);
    drawFog(t);
    if (round.phase === 'hunt') {
      g.fillStyle = 'rgba(0,0,0,.35)';
      g.fillRect(0, 0, W, H);
    }
    if (darkUntil > t) {
      const k = Math.min(1, (darkUntil - t) / 500, (t - (darkUntil - 4000)) / 200);
      g.fillStyle = `rgba(0,0,0,${0.93 * k})`;
      g.fillRect(0, 0, W, H);
      // chỉ còn thấy những đôi mắt phát sáng
      g.fillStyle = '#ef4444';
      g.shadowColor = '#ef4444';
      g.shadowBlur = 18;
      for (const p of players.values()) {
        if (p.state === 'hidden') continue;
        const by = p.y + Math.sin(t / 420 + p.phase) * 10;
        g.beginPath(); g.ellipse(p.x - 17, by - 26, 6, 4, 0, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.ellipse(p.x + 17, by - 26, 6, 4, 0, 0, Math.PI * 2); g.fill();
      }
      g.shadowBlur = 0;
    }
    if (flash > 0) {
      g.fillStyle = `rgba(220,235,255,${flash * 0.75})`;
      g.fillRect(0, 0, W, H);
    }
    g.restore();
  }

  // ---------------- Tiện ích vẽ ----------------
  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  function trimText(s, max) {
    if (g.measureText(s).width <= max) return s;
    while (s.length > 1 && g.measureText(s + '…').width > max) s = s.slice(0, -1);
    return s + '…';
  }
  function wrap(text, max) {
    const words = String(text).split(/\s+/);
    const lines = [];
    let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (g.measureText(test).width > max && cur) { lines.push(cur); cur = w; } else cur = test;
    }
    if (cur) lines.push(cur);
    if (lines.length > 2) lines[1] = trimText(lines[1] + ' …', max);
    return lines.map((l) => trimText(l, max));
  }

  // ---------------- API cho overlay.js ----------------
  function parseCommand(text) {
    const n = norm(text);
    const raw = String(text).toLowerCase().trim();
    const short = n.split(/\s+/).length <= 4;
    let m = n.match(/^(hu+|boo+|👻)(?:\s+(.+))?$/);
    if (m) return { cmd: 'scare', arg: m[2] || '' };
    m = n.match(/^(bua|dan bua|📜)(?:\s+(.+))?$/);
    if (m) return { cmd: 'freeze', arg: m[2] || '' };
    m = n.match(/^(om|🤗)(?:\s+(.+))?$/);
    if (m && /^ôm|^om\b|^🤗/.test(raw)) return { cmd: 'hug', arg: m[2] || '' };
    if (short && /^goi hon\b/.test(n)) return { cmd: 'summon' };
    if (short && /^(tat den|cup dien)\b/.test(n)) return { cmd: 'blackout' };
    if (short && /^(chạy|chay)\b/.test(raw)) return { cmd: 'sprint' };
    if (short && /^(nhảy|nhay|💃|🕺)/.test(raw)) return { cmd: 'dance' };
    if (short && /^(cười|cuoi|hihi|haha|kaka|😂|🤣)/.test(raw)) return { cmd: 'laugh' };
    if (short && /^(khóc|khoc|huhu|😭)/.test(raw)) return { cmd: 'cry' };
    if (/^(tron|nap)\b/.test(n) && n.split(/\s+/).length <= 3) return { cmd: 'hide' };
    if ((/^tìm\b/.test(raw) || /^soi\b/.test(n)) && n.split(/\s+/).length <= 3) return { cmd: 'seek' };
    return null;
  }

  function onEvent(ev) {
    if (!enabled || !ev) return;
    switch (ev.type) {
      case 'chat': {
        const p = getPlayer(ev.user);
        const c = parseCommand(ev.text);
        if (!c) {
          say(p, ev.text);
          p.chats = (p.chats || 0) + 1;
          // người chưa từng gõ lệnh: nhắc cách chơi ở lần chat thứ 1 và thứ 4
          if (!p.usedCmd && (p.chats === 1 || p.chats === 4) && wall() - lastHint > 8000) {
            lastHint = wall();
            setTimeout(() => say(p, pick(HINTS), 3500), 4300);
          }
          return;
        }
        p.usedCmd = true;
        const actions = {
          scare: () => doScare(p, c.arg), hide: () => doHide(p), seek: () => doSeek(p),
          freeze: () => doFreeze(p, c.arg), hug: () => doHug(p, c.arg), summon: () => doSummon(p),
          blackout: () => doBlackout(p), sprint: () => doSprint(p), dance: () => doDance(p),
          laugh: () => doLaugh(p), cry: () => doCry(p)
        };
        actions[c.cmd]();
        return;
      }
      case 'join':
        if (realCount() < 25) getPlayer(ev.user);
        return;
      case 'follow': {
        const p = getPlayer(ev.user);
        p.hat = true;
        p.score += 2;
        say(p, 'Đã theo dõi 💜 nhận mũ phù thuỷ!', 3000);
        feed(`💜 ${p.name} theo dõi — nhận mũ phù thuỷ`);
        return;
      }
      case 'share': {
        const p = getPlayer(ev.user);
        p.score += 1;
        feed(`🔗 ${p.name} chia sẻ live`);
        return;
      }
      case 'gift': {
        const p = getPlayer(ev.user);
        const total = Number(ev.total || 0);
        p.score += Math.min(10, Math.max(1, Math.round(total / 30)));
        giveShield(p, Math.min(300, 30 * Math.max(1, ev.repeatCount || 1)));
        feed(`🎁 ${p.name} tặng ${ev.giftName} x${ev.repeatCount || 1}`);
        if (cfg.bigGiftDiamonds > 0 && total >= cfg.bigGiftDiamonds && !boss) {
          jumpscare(p.name, ev.giftName || 'quà');
          setTimeout(() => summonBoss(p.name, 12000, 'gift'), 1400);
        }
        return;
      }
    }
  }

  function onStats(s) {
    if (!enabled || !s) return;
    if (likeMark < 0) { likeMark = s.likes; return; }
    if (s.likes - likeMark >= 100) { likeMark = s.likes; thunder(); }
  }

  function showHowto() {
    newSinceHowto = 0;
    nextHowto = wall() + Math.max(1, cfg.tutorialEvery || 2) * 60000;
    ui.onHowto();
  }

  function command(action) {
    if (!enabled) return;
    if (action === 'howto') { showHowto(); return; }
    if (action === 'round') startRound(true);
    else if (action === 'thunder') thunder();
    else if (action === 'jumpscare') ui.onJumpscare('');
    else if (action === 'peek') ui.onPeek();
    else if (action === 'reset') { for (const p of players.values()) p.score = 0; renderBoard(); }
  }

  window.HauntGame = { init, setConfig, onEvent, onStats, command, setPaused, isOn: () => enabled };
})();
