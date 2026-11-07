'use strict';
const path = require('path');
const fs = require('fs');
const { app, BrowserWindow, ipcMain, shell, dialog, clipboard, nativeTheme } = require('electron');
const { Settings } = require('./settings');
const { LiveService, friendlyError } = require('./live');
const { OverlayServer } = require('./server');
const { ClubScore } = require('./clubScore');
const { QuizStore } = require('./quiz-store');

app.setName('StudioLive');
// Cho phép phát âm thanh hiệu ứng mà không cần bấm vào trang trước
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
nativeTheme.themeSource = 'dark';

let win = null;
let settings;
let quizStore;
let quizSession = null;
let quizBatchStartedAt = 0;
const live = new LiveService();
let paused = false;
async function connectLive(username) {
  const s = settings.update({ username: String(username || '') });
  try {
    await live.start(s.username, { autoReconnect: s.autoReconnect });
    return { ok: true };
  } catch (e) {
    const message = friendlyError(e);
    live.setStatus('error', message);
    return { ok: false, message };
  }
}

const overlay = new OverlayServer({
  getConfig: () => settings.get(),
  getSnapshot: () => live.snapshot(),
  getPaused: () => paused,
  getQuizData: () => quizSession?.currentData || quizStore?.activeData(),
  getQuizState: () => quizSession ? {
    active: !!quizSession.currentData,
    running: !!quizSession.running,
    index: settings?.get().overlay.quizIndex || 0,
    reveal: !!settings?.get().overlay.quizReveal,
    seconds: quizSession.seconds
  } : null
});

let serverState = { running: false, port: 0, error: '', clients: 0 };
let outWin = null;
let outWinReady = false;

// Cửa sổ "màn hình phát live": chỉ có cảnh overlay, để TikTok LIVE Studio / OBS quay cửa sổ này
function openOutputWindow() {
  if (outWin && !outWin.isDestroyed()) {
    outWin.show();
    outWin.focus();
    return outWinReady;
  }
  outWinReady = false;
  outWin = new BrowserWindow({
    width: 540,
    height: 960,
    minWidth: 270,
    minHeight: 480,
    title: 'StudioLive - Man hinh phat live',
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true, backgroundThrottling: false }
  });
  outWin.setAspectRatio(9 / 16);
  outWin.on('page-title-updated', (e) => e.preventDefault());
  outWin.webContents.once('did-finish-load', () => {
    outWinReady = true;
    send('output:state', { open: true });
  });
  outWin.loadURL(`http://127.0.0.1:${serverState.port}/?output`);
  outWin.on('closed', () => {
    outWin = null;
    outWinReady = false;
    send('output:state', { open: false });
  });
  return false;
}

const send = (channel, payload) => {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
};

// ---- Điểm DJ Club: tính ở đây để mọi màn hình phát dùng chung, tải lại trang không mất điểm ----
const clubScore = new ClubScore(() => (settings ? settings.get().overlay : {}));
clubScore.on('rank', (p) => {
  overlay.broadcast('clubRank', p);
  send('club:rank', p);
});
overlay.onConnection = (socket) => socket.emit('clubRank', clubScore.payload());

// ---- Chuyển tiếp sự kiện live -> dashboard + overlay ----
live.on('status', (s) => {
  if (s.status === 'live') clubScore.setRoom(live.stats.roomId); // phòng live mới -> phiên điểm mới
  send('live:status', s);
});
live.on('stats', (s) => {
  send('live:stats', s);
  overlay.broadcast('stats', s);
});
live.on('event', (e) => {
  clubScore.onEvent(e);
  send('live:event', e);
  overlay.broadcast('live', e);
});
overlay.onClients = (n) => {
  serverState.clients = n;
  send('server:state', serverState);
};
overlay.onQuizAdvance = (index) => {
  if (!settings) return;
  if (Number(index) === -2) { if (quizSession) quizSession.running = false; return; }
  if (Number(index) < 0) { startNextQuizBatch(); return; }
  settings.update({ overlay: { quizIndex: Math.max(0, Math.round(Number(index) || 0)), quizReveal: false } });
};

async function startServer(port) {
  try {
    await overlay.start(port);
    serverState = { running: true, port, error: '', clients: 0 };
  } catch (e) {
    serverState = {
      running: false, port, clients: 0,
      error: e.code === 'EADDRINUSE' ? `Cổng ${port} đang bị ứng dụng khác dùng. Đổi cổng trong Cài đặt.` : e.message
    };
  }
  send('server:state', serverState);
  if (outWin && !outWin.isDestroyed() && serverState.running) outWin.loadURL(`http://127.0.0.1:${port}/?output`);
  return serverState;
}

function createWindow() {
  win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#0b0d10',
    title: 'StudioLive',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    titleBarOverlay: process.platform === 'darwin' ? false : { color: '#0b0d10', symbolColor: '#9ca3af', height: 40 },
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false
    }
  });
  win.webContents.session.setPermissionRequestHandler((requestingContents, permission, callback) => {
    callback(permission === 'display-capture' && requestingContents === win?.webContents);
  });
  const rendererUrl = process.env.STUDIO_RENDERER_URL;
  if (rendererUrl) win.loadURL(rendererUrl);
  else win.loadFile(path.join(__dirname, '..', 'renderer', 'dist', 'index.html'));
  win.once('ready-to-show', () => { if (!process.env.STUDIO_SELFTEST) win.show(); });
  if (process.env.STUDIO_SELFTEST) selfTest();

  // Link ngoài mở bằng trình duyệt mặc định
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e) => e.preventDefault());

}

// ---- IPC ----
ipcMain.handle('app:init', () => ({
  settings: settings.get(),
  server: serverState,
  live: live.snapshot(),
  outputOpen: !!outWinReady,
  paused,
  clubRank: clubScore.payload(),
  platform: process.platform,
  version: app.getVersion()
}));

ipcMain.handle('settings:update', async (_e, patch) => {
  const before = settings.get();
  const next = settings.update(patch || {});
  if (next.autoReconnect !== before.autoReconnect) live.setAutoReconnect(next.autoReconnect);
  overlay.broadcast('config', next.overlay);
  if (next.overlay.mode !== before.overlay.mode) {
    // đổi chế độ: mọi trang đang hiện cảnh (LIVE Studio, OBS, xem trước) tải lại để sang cảnh mới
    overlay.broadcast('reload');
  }
  if (next.port !== before.port) await startServer(next.port);
  return { settings: next, server: serverState };
});

ipcMain.handle('live:connect', (_e, username) => connectLive(username));

ipcMain.handle('capture:source-id', (event) => {
  if (!win || win.isDestroyed() || event.sender !== win.webContents) throw new Error('Không xác định được cửa sổ điều khiển.');
  return win.webContents.getMediaSourceId(event.sender);
});

ipcMain.handle('live:disconnect', async () => {
  await live.stop();
  return { ok: true };
});

ipcMain.handle('overlay:test', (_e, type) => {
  if (['round', 'thunder', 'jumpscare', 'peek', 'howto'].includes(type)) {
    overlay.broadcast('game', type);
    return true;
  }
  const demo = demoEvent(type);
  if (demo) {
    clubScore.onEvent(demo);
    overlay.broadcast('live', demo);
    send('live:event', { ...demo, test: true });
  }
  return true;
});

ipcMain.handle('overlay:pause', (_e, p) => {
  paused = typeof p === 'boolean' ? p : !paused;
  overlay.broadcast('pause', paused);
  send('pause:state', paused);
  return paused;
});

// Lệnh điều khiển cảnh Rạp Phim: chiếu / dừng / chuyển phim, vỗ tay, mưa bắp, đọc ngay…
ipcMain.handle('rap:command', (_e, c) => {
  const actions = ['play', 'pause', 'next', 'prev', 'index', 'speak', 'clap', 'rain', 'share', 'reset', 'testLikes'];
  if (!c || !actions.includes(c.action)) return false;
  if (c.action === 'index') settings.update({ overlay: { rapIndex: Number(c.n) || 0 } });
  overlay.broadcast('rap', { action: c.action, text: typeof c.text === 'string' ? c.text.slice(0, 400) : undefined, n: Number(c.n) || 0 });
  return true;
});

function startNextQuizBatch() {
  if (!quizSession || !quizStore) return { ok: false, message: 'Chưa có phiên thi đang chạy.' };
  const now = Date.now();
  if (now - quizBatchStartedAt < 900) return { ok: true, ignoredDuplicate: true };
  const source = quizStore.bankQuestionsForClass(quizSession.licenseClass);
  const pool = source.questions || [];
  if (!pool.length) return { ok: false, message: `Hạng ${quizSession.licenseClass} hiện chưa được gán câu hỏi.` };
  const wanted = Math.min(quizSession.questionCount, pool.length);
  const byId = new Map(pool.map((question) => [question.id, question]));
  let remaining = quizSession.remainingIds.filter((id) => byId.has(id));
  if (remaining.length < wanted) {
    const carried = new Set(remaining);
    const refill = pool.map((question) => question.id).filter((id) => !carried.has(id));
    for (let i = refill.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [refill[i], refill[j]] = [refill[j], refill[i]]; }
    remaining = [...remaining, ...refill];
  }
  const ids = remaining.splice(0, wanted);
  quizSession.remainingIds = remaining;
  quizSession.lastBatchIds = ids;
  quizBatchStartedAt = now;
  const data = { ...source, title: `${source.title} · HẠNG ${quizSession.licenseClass}`, questions: ids.map((id) => byId.get(id)) };
  quizSession.currentData = data;
  quizSession.running = true;
  settings.update({ overlay: { quizLicenseClass: quizSession.licenseClass, quizSeconds: quizSession.seconds, quizSessionCount: data.questions.length, quizIndex: 0, quizReveal: false } });
  overlay.broadcast('config', settings.get().overlay);
  overlay.broadcast('quiz:data', data);
  overlay.broadcast('quiz', { action: 'start', index: 0, reveal: false, seconds: quizSession.seconds });
  return { ok: true, count: data.questions.length, poolCount: pool.length, licenseClass: quizSession.licenseClass, seconds: quizSession.seconds };
}

ipcMain.handle('quiz:command', (_e, c) => {
  const actions = ['start', 'pause', 'next', 'prev', 'reveal', 'reset'];
  if (!c || !actions.includes(c.action)) return false;
  let o = settings.get().overlay;
  if (c.action === 'start') {
    const licenseClass = quizStore.hasLicenseClass(c.licenseClass) ? c.licenseClass : o.quizLicenseClass;
    const seconds = Math.min(120, Math.max(5, Math.round(Number(c.seconds) || o.quizSeconds)));
    const classSettings = quizStore.listLicenseClasses().find((item) => item.code === licenseClass);
    const requestedCount = Math.min(600, Math.max(1, Number(classSettings?.liveCount) || 25));
    const pool = quizStore.bankQuestionsForClass(licenseClass).questions;
    if (!pool?.length) return { ok: false, message: `Chưa gán câu hỏi cho hạng ${licenseClass}. Vào Quản lý hạng GPLX để chọn câu từ ngân hàng.` };
    quizSession = { licenseClass, seconds, questionCount: requestedCount, remainingIds: [], lastBatchIds: [], currentData: null, running: false };
    quizBatchStartedAt = 0;
    return startNextQuizBatch();
  }
  if (c.action === 'pause') { if (quizSession) quizSession.running = false; overlay.broadcast('quiz', { action: 'pause' }); return true; }
  let index = o.quizIndex || 0;
  let reveal = !!o.quizReveal;
  const count = Math.max(1, Number(o.quizSessionCount) || quizStore.bankQuestionsForClass(o.quizLicenseClass).questions.length);
  if (c.action === 'next') {
    if (index + 1 >= count && o.quizLoop === false) {
      if (quizSession) quizSession.running = false;
      overlay.broadcast('quiz', { action: 'finish' });
      return true;
    }
    if (index + 1 >= count) return startNextQuizBatch();
    index = (index + 1) % count; reveal = false;
  }
  if (c.action === 'prev') { index = (index + count - 1) % count; reveal = false; }
  if (c.action === 'reveal') reveal = !reveal;
  if (c.action === 'reset') { index = 0; reveal = false; }
  settings.update({ overlay: { quizIndex: index, quizReveal: reveal } });
  overlay.broadcast('quiz', { action: c.action, index, reveal, seconds: o.quizSeconds });
  return true;
});

function publishQuiz(data = quizStore.activeData()) {
  settings.update({ overlay: { quizIndex: 0, quizReveal: false } });
  overlay.broadcast('config', settings.get().overlay);
  const licenseClass = settings.get().overlay.quizLicenseClass;
  const liveData = data ? { ...data, questions: data.questions.filter((q) => q.classes.includes(licenseClass)) } : data;
  overlay.broadcast('quiz:data', liveData);
  return { sets: quizStore.listSets(), activeId: quizStore.activeId(), data };
}
ipcMain.handle('quiz:list', () => ({ sets: quizStore.listSets(), activeId: quizStore.activeId(), data: quizStore.activeData() }));
ipcMain.handle('quiz:set-active', (_e, id) => publishQuiz(quizStore.setActive(id)));
ipcMain.handle('quiz:create-set', (_e, title) => { const data = quizStore.createSet(title); return publishQuiz(data); });
ipcMain.handle('quiz:rename-set', (_e, id, title) => { quizStore.renameSet(id, title); return publishQuiz(); });
ipcMain.handle('quiz:delete-set', (_e, id) => publishQuiz(quizStore.deleteSet(id)));
ipcMain.handle('quiz:save-question', (_e, q) => publishQuiz(quizStore.saveQuestion(q)));
ipcMain.handle('quiz:delete-question', (_e, id) => publishQuiz(quizStore.deleteQuestion(id)));
ipcMain.handle('quiz:import-questions', (_e, setId, items) => publishQuiz(quizStore.importQuestions(setId, items)));
ipcMain.handle('quiz:bank-questions', () => {
  ensureMeoThiLaiXeBank();
  return quizStore.getBank();
});
ipcMain.handle('quiz:license-classes', () => quizStore.listLicenseClasses());
ipcMain.handle('quiz:license-class-create', (_e, code, name) => quizStore.createLicenseClass(code, name));
ipcMain.handle('quiz:license-class-update', (_e, code, name) => quizStore.updateLicenseClass(code, name));
ipcMain.handle('quiz:license-class-live-count', (_e, code, count) => quizStore.updateLicenseClassLiveCount(code, count));
ipcMain.handle('quiz:license-class-delete', (_e, code) => {
  const classes = quizStore.deleteLicenseClass(code);
  const current = settings.get().overlay.quizLicenseClass;
  if (!quizStore.hasLicenseClass(current)) settings.update({ overlay: { quizLicenseClass: classes[0].code } });
  return classes;
});
ipcMain.handle('quiz:bank-save-question', (_e, q) => quizStore.saveBankQuestion(q));
ipcMain.handle('quiz:bank-delete-question', (_e, id) => quizStore.deleteBankQuestion(id));
ipcMain.handle('quiz:bank-class-questions', (_e, licenseClass) => quizStore.bankQuestionsForClass(licenseClass));
ipcMain.handle('quiz:assign-bank-class', (_e, licenseClass, ids) => {
  const data = quizStore.assignBankQuestions(licenseClass, ids);
  publishQuiz(quizStore.activeData());
  return data;
});
ipcMain.handle('quiz:copy-questions', (_e, targetId, sourceIds, licenseClass) => publishQuiz(quizStore.copyQuestions(targetId, sourceIds, licenseClass)));

// Ngân hàng 600 câu chỉ đọc từ đĩa một lần (file ~300KB), các lần sau dùng bản đã nạp
let meoThiBank;
function loadMeoThiBank() {
  if (meoThiBank === undefined) {
    const bankPath = path.join(__dirname, '..', 'data', 'quiz-600-meothilaixe.json');
    meoThiBank = fs.existsSync(bankPath) ? JSON.parse(fs.readFileSync(bankPath, 'utf8')) : null;
  }
  return meoThiBank;
}

function ensureMeoThiLaiXeBank() {
  quizStore.localizeMeoThiImages();
  const bank = loadMeoThiBank();
  if (!bank) return;
  if (!quizStore.listSets().some((set) => set.title === bank.title)) {
    const set = quizStore.createSet(bank.title);
    quizStore.importQuestions(set.id, bank.questions);
  }
  quizStore.initializeBankClasses(bank.questions);
}

ipcMain.handle('dialog:pickVideos', async () => {
  const r = await dialog.showOpenDialog(win, {
    title: 'Chọn phim để chiếu',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Video', extensions: ['mp4', 'webm', 'mov', 'm4v'] }]
  });
  return r.canceled ? [] : r.filePaths;
});

// Lệnh điều khiển cảnh chùa: đọc ngay, thỉnh chuông, gõ mõ, nhắc chia sẻ, mưa hoa sen, đặt lại điểm
ipcMain.handle('chua:command', (_e, c) => {
  const actions = ['speak', 'bell', 'mo', 'share', 'rain', 'reset', 'testLikes'];
  if (!c || !actions.includes(c.action)) return false;
  overlay.broadcast('chua', { action: c.action, text: typeof c.text === 'string' ? c.text.slice(0, 400) : undefined, n: Number(c.n) || undefined });
  return true;
});

// Lệnh điều khiển cảnh DJ Club: bắn pháo hoa, cả sàn nhảy, thêm chó thử, chuyển bài…
ipcMain.handle('club:resetScore', () => {
  clubScore.reset();
  return true;
});

ipcMain.handle('dialog:pickImages', async () => {
  const r = await dialog.showOpenDialog(win, {
    title: 'Chọn ảnh cho màn hình LED',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Ảnh', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }]
  });
  return r.canceled ? [] : r.filePaths;
});

ipcMain.handle('club:command', (_e, c) => {
  const actions = ['rain', 'dance', 'crowd', 'clear', 'next', 'prev', 'screen', 'camera', 'testLikes'];
  if (!c || !actions.includes(c.action)) return false;
  overlay.broadcast('club', { action: c.action, n: Number(c.n) || 0 });
  return true;
});

ipcMain.handle('dialog:pickMusic', async () => {
  const r = await dialog.showOpenDialog(win, {
    title: 'Chọn nhạc cho DJ Club',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Âm thanh', extensions: ['mp3', 'wav', 'ogg', 'm4a'] }]
  });
  return r.canceled ? [] : r.filePaths;
});

ipcMain.handle('overlay:reload', () => {
  overlay.broadcast('reload');
  return true;
});

ipcMain.handle('server:restart', () => startServer(settings.get().port));

ipcMain.handle('dialog:pickSound', async (_e, kind) => {
  const media = kind === 'media';
  const r = await dialog.showOpenDialog(win, {
    title: media ? 'Chọn ảnh / video jumpscare' : 'Chọn file âm thanh',
    properties: ['openFile'],
    filters: media
      ? [{ name: 'Ảnh hoặc video', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'mp4', 'webm', 'mov'] }]
      : [{ name: 'Âm thanh', extensions: ['mp3', 'wav', 'ogg', 'm4a'] }]
  });
  return r.canceled ? '' : r.filePaths[0];
});

ipcMain.handle('output:open', () => {
  return { open: openOutputWindow() };
});

ipcMain.handle('tiktok:login', () => {
  require('./direct').openLoginWindow(win);
  return true;
});

ipcMain.handle('tiktok:logout', async () => {
  await require('./direct').logoutTikTok();
  return true;
});

ipcMain.handle('util:copy', (_e, text) => {
  clipboard.writeText(String(text));
  return true;
});

ipcMain.handle('util:openExternal', (_e, url) => {
  if (/^https?:\/\//.test(url)) shell.openExternal(url);
  return true;
});

// ---- Dữ liệu thử nghiệm ----
const DEMO_NAMES = ['Hồn Ma Áo Trắng', 'Bé Ma Lém Lỉnh', 'Thầy Pháp Tập Sự', 'Cô Hồn Dạ Khúc', 'Quỷ Nhỏ 2k7', 'Ma Da Sông Hàn'];
const DEMO_CHATS = ['Ghê quá streamer ơi 😱', 'Sau lưng anh có gì kìa!!!', 'Tắt đèn đi chơi mới vui', 'Ai đang xem một mình giơ tay 🙋', 'Nghe tiếng chuông rợn người', 'Cho em xin lá bùa với'];
const DEMO_GIFTS = [
  { giftName: 'Hoa Hồng', diamonds: 1, repeatCount: 5 },
  { giftName: 'Kẹo Bông', diamonds: 5, repeatCount: 1 },
  { giftName: 'Mũ Phù Thuỷ', diamonds: 99, repeatCount: 1 },
  { giftName: 'Lâu Đài Ma', diamonds: 299, repeatCount: 2 }
];
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

function demoEvent(type) {
  const nickname = rand(DEMO_NAMES);
  // ảnh đại diện giả (chỉ DJ Club dùng; cảnh khác chỉ nhận ảnh https nên bỏ qua)
  const user = { id: 'demo-' + nickname, uniqueId: 'demo' + DEMO_NAMES.indexOf(nickname), nickname, avatar: '/club-demo-avatar/' + DEMO_NAMES.indexOf(nickname) + '.svg' };
  const ts = Date.now();
  switch (type) {
    case 'chat': return { type: 'chat', user, text: rand(DEMO_CHATS), ts };
    case 'scare': return { type: 'chat', user, text: 'hù', ts };
    case 'adidaphat': return { type: 'chat', user, text: 'adidaphat', ts };
    case 'clap': return { type: 'chat', user, text: 'vỗ tay', ts };
    case 'haha': return { type: 'chat', user, text: 'haha', ts };
    case 'wow': return { type: 'chat', user, text: 'wow', ts };
    case 'popcorn': return { type: 'chat', user, text: 'bắp', ts };
    case 'wish': return { type: 'chat', user, text: rand(['Cầu cho con thi đỗ đại học', 'Cầu sức khỏe cho mẹ', 'Mong sớm gặp người thương', 'Cầu bình an cho gia đình']), ts };
    case 'hide': return { type: 'chat', user, text: 'trốn', ts };
    case 'seek': return { type: 'chat', user, text: 'tìm', ts };
    case 'freeze': return { type: 'chat', user, text: 'bùa', ts };
    case 'summon': return { type: 'chat', user, text: 'gọi hồn', ts };
    case 'blackout': return { type: 'chat', user, text: 'tắt đèn', ts };
    case 'dance': return { type: 'chat', user, text: 'nhảy', ts };
    case 'laugh': return { type: 'chat', user, text: 'cười', ts };
    case 'cry': return { type: 'chat', user, text: 'khóc', ts };
    case 'hug': return { type: 'chat', user, text: 'ôm', ts };
    case 'dogSwap': return { type: 'chat', user, text: 'đổi', ts };
    case 'gift100': return { type: 'gift', user, giftName: 'Quà 100 xu', diamonds: 100, repeatCount: 1, total: 100, giftImage: '', ts };
    case 'gift1000': return { type: 'gift', user, giftName: 'Quà 1.000 xu', diamonds: 1000, repeatCount: 1, total: 1000, giftImage: '', ts };
    case 'like': return { type: 'like', user, count: 15, ts };
    case 'gift': {
      const g = rand(DEMO_GIFTS);
      return { type: 'gift', user, ...g, total: g.diamonds * g.repeatCount, giftImage: '', ts };
    }
    case 'bigGift': {
      const g = DEMO_GIFTS[3];
      return { type: 'gift', user, ...g, total: g.diamonds * g.repeatCount, giftImage: '', ts };
    }
    case 'follow': return { type: 'follow', user, ts };
    case 'share': return { type: 'share', user, ts };
    case 'join': return { type: 'join', user, ts };
    default: return null;
  }
}

// ---- Tự kiểm tra (không hiện cửa sổ): STUDIO_SELFTEST=<file kết quả> ----
function selfTest() {
  const fs = require('fs');
  win.webContents.once('did-finish-load', async () => {
    const r = { server: serverState.running, port: serverState.port };
    try {
      const h = await fetch(`http://127.0.0.1:${serverState.port}/health`).then((x) => x.json());
      r.health = h.ok === true;
      const html = await fetch(`http://127.0.0.1:${serverState.port}/`).then((x) => x.text());
      r.overlay = html.includes('temple.js') && html.includes('game.js');
      const img = await fetch(`http://127.0.0.1:${serverState.port}/chua-assets/hall.jpg`);
      r.chuaAssets = img.ok;
      await new Promise((ok) => setTimeout(ok, 1500));
      r.ui = await win.webContents.executeJavaScript("!!document.querySelector('#view-dashboard') && document.querySelector('#srv-sub').textContent");
      r.decoder = typeof require('tiktok-live-connector').deserializeWebSocketMessage === 'function';
    } catch (e) {
      r.error = String(e.message || e);
    }
    fs.writeFileSync(process.env.STUDIO_SELFTEST, JSON.stringify(r));
    app.quit();
  });
}

// ---- Vòng đời ứng dụng ----
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(async () => {
    settings = new Settings(app.getPath('userData'));
    quizStore = new QuizStore(app.getPath('userData'));
    ensureMeoThiLaiXeBank();
    await startServer(settings.get().port);
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  // Tiến trình đồ hoạ (GPU) sập -> khung xem / màn hình phát dễ bị đen: tự tải lại
  app.on('child-process-gone', (_e, d) => {
    if (d.type !== 'GPU') return;
    setTimeout(() => {
      send('preview:reload');
      if (outWin && !outWin.isDestroyed()) outWin.webContents.reload();
    }, 800);
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('before-quit', () => {
    live.stop(true);
    overlay.stop();
  });

  // Ctrl+C / kill từ terminal: thoát gọn, quá 2 giây thì buộc thoát
  for (const sig of ['SIGINT', 'SIGTERM']) {
    process.on(sig, () => {
      setTimeout(() => app.exit(0), 2000).unref();
      app.quit();
    });
  }
}
