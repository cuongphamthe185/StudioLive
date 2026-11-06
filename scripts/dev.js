'use strict';

const path = require('node:path');
const { spawn } = require('node:child_process');
const fs = require('node:fs');

const root = path.resolve(__dirname, '..');
const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');
const rendererUrl = 'http://127.0.0.1:5173';
let electron = null;
let stopping = false;
let restarting = false;
let restartTimer = null;

const vite = spawn(process.execPath, [
  viteBin,
  '--config', path.join(root, 'renderer', 'vite.config.mjs'),
  '--host', '127.0.0.1',
  '--port', '5173',
  '--strictPort'
], { cwd: root, stdio: ['inherit', 'pipe', 'pipe'] });

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  if (electron && !electron.killed) electron.kill();
  if (!vite.killed) vite.kill();
  process.exitCode = code;
}

function launchElectron() {
  if (stopping) return;
  electron = spawn(require('electron'), ['.'], {
    cwd: root,
    env: { ...process.env, STUDIO_RENDERER_URL: rendererUrl },
    stdio: 'inherit'
  });
  electron.on('error', (error) => { console.error('[electron]', error.message); stop(1); });
  electron.on('exit', (code) => {
    electron = null;
    if (stopping) return;
    if (restarting) {
      restarting = false;
      launchElectron();
      return;
    }
    stop(code || 0);
  });
}

function restartElectron() {
  if (!electron || stopping || restarting) return;
  restarting = true;
  console.log('[dev] Backend changed; restarting Electron…');
  electron.kill();
}

vite.stdout.on('data', (chunk) => {
  const output = chunk.toString();
  process.stdout.write(output);
  if (!electron && output.includes(rendererUrl)) {
    launchElectron();
  }
});

// Watch only Electron entry files. Recursive fs.watch can exhaust file handles on macOS,
// which prevented the dev app from starting on some machines.
const backendFiles = [
  'src/main.js', 'src/preload.js', 'src/live.js', 'src/direct.js',
  'src/server.js', 'src/settings.js', 'src/quiz-store.js', 'src/tts.js'
];
for (const relativePath of backendFiles) {
  try {
    const watcher = fs.watch(path.join(root, relativePath), () => {
      clearTimeout(restartTimer);
      restartTimer = setTimeout(restartElectron, 250);
    });
    watcher.on('error', (error) => console.error(`[dev] Watch error (${relativePath}):`, error.message));
  } catch (error) {
    console.error(`[dev] Could not watch ${relativePath}:`, error.message);
  }
}
vite.stderr.on('data', (chunk) => process.stderr.write(chunk));
vite.on('error', (error) => { console.error('[vite]', error.message); stop(1); });
vite.on('exit', (code) => {
  if (!stopping) {
    console.error(`Vite stopped (${code ?? 'unknown'}).`);
    stop(code || 1);
  }
});
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
