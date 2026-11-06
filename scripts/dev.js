'use strict';
/*
 * Chế độ phát triển: chạy Vite (giao diện) + Electron, tự khởi động lại Electron khi sửa file trong src/.
 * Ctrl+C dừng sạch cả hai tiến trình (nhấn lần 2 để buộc thoát ngay).
 */
const path = require('node:path');
const fs = require('node:fs');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');
const rendererUrl = 'http://127.0.0.1:5173';
const KILL_TIMEOUT_MS = 3000;

let electron = null;
let stopping = false;
let restarting = false;
let restartTimer = null;
const watchers = [];

const vite = spawn(process.execPath, [
  viteBin,
  '--config', path.join(root, 'renderer', 'vite.config.mjs'),
  '--host', '127.0.0.1',
  '--port', '5173',
  '--strictPort',
  '--clearScreen', 'false'
], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });

const alive = (child) => child && child.exitCode === null && child.signalCode === null;

function exitWhenDone(code) {
  if (alive(vite) || alive(electron)) return;
  process.exit(code);
}

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  clearTimeout(restartTimer);
  for (const w of watchers) { try { w.close(); } catch { /* đã đóng */ } }
  for (const child of [electron, vite]) {
    if (alive(child)) {
      child.once('exit', () => exitWhenDone(code));
      child.kill('SIGTERM');
    }
  }
  // Tiến trình con không chịu thoát -> buộc dừng
  setTimeout(() => {
    for (const child of [electron, vite]) if (alive(child)) child.kill('SIGKILL');
    process.exit(code);
  }, KILL_TIMEOUT_MS).unref();
  exitWhenDone(code);
}

function launchElectron() {
  if (stopping) return;
  const env = { ...process.env, STUDIO_RENDERER_URL: rendererUrl };
  delete env.ELECTRON_RUN_AS_NODE; // một số terminal của IDE đặt biến này -> Electron chạy như Node thường
  electron = spawn(require('electron'), ['.'], {
    cwd: root,
    env,
    stdio: ['ignore', 'inherit', 'inherit']
  });
  electron.on('error', (error) => { console.error('[electron]', error.message); stop(1); });
  electron.on('exit', (code) => {
    if (stopping) return;
    electron = null;
    if (restarting) {
      restarting = false;
      launchElectron();
      return;
    }
    stop(code || 0); // đóng cửa sổ app -> dừng luôn Vite
  });
}

function restartElectron() {
  if (!alive(electron) || stopping || restarting) return;
  restarting = true;
  console.log('[dev] Backend changed; restarting Electron…');
  electron.kill('SIGTERM');
}

vite.stdout.on('data', (chunk) => {
  const output = chunk.toString();
  process.stdout.write(output);
  if (!electron && !stopping && output.includes(rendererUrl)) launchElectron();
});
vite.stderr.on('data', (chunk) => process.stderr.write(chunk));
vite.on('error', (error) => { console.error('[vite]', error.message); stop(1); });
vite.on('exit', (code) => {
  if (stopping) return;
  console.error(`Vite stopped (${code ?? 'unknown'}).`);
  stop(code || 1);
});

// Chỉ theo dõi các file tiến trình chính (fs.watch đệ quy dễ hết file handle trên macOS)
for (const file of fs.readdirSync(path.join(root, 'src')).filter((f) => f.endsWith('.js'))) {
  try {
    const watcher = fs.watch(path.join(root, 'src', file), () => {
      clearTimeout(restartTimer);
      restartTimer = setTimeout(restartElectron, 250);
    });
    watcher.on('error', (error) => console.error(`[dev] Watch error (src/${file}):`, error.message));
    watchers.push(watcher);
  } catch (error) {
    console.error(`[dev] Could not watch src/${file}:`, error.message);
  }
}

for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(sig, () => {
    if (stopping) process.exit(130); // Ctrl+C lần 2: thoát ngay
    console.log('\n[dev] Stopping…');
    stop(0);
  });
}
