'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const express = require('express');
const { Server } = require('socket.io');

const MEDIA_TYPES = {
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
  '.mp4': 'video/mp4', '.m4v': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime'
};

/*
 * Server overlay nội bộ: chỉ lắng nghe 127.0.0.1 nên không ai ngoài máy truy cập được.
 * OBS / TikTok Live Studio thêm Browser Source trỏ tới http://localhost:<port>
 */
class OverlayServer {
  constructor({ getConfig, getSnapshot, getPaused, getQuizData, getQuizState }) {
    this.getConfig = getConfig;
    this.getPaused = getPaused || (() => false);
    this.getSnapshot = getSnapshot;
    this.getQuizData = getQuizData || (() => null);
    this.getQuizState = getQuizState || (() => null);
    this.server = null;
    this.io = null;
    this.port = 0;
  }

  async start(port) {
    await this.stop();
    const app = express();
    app.disable('x-powered-by');

    // Giọng đọc tiếng Việt cho chế độ Đi Chùa
    app.get('/api/tts', async (req, res) => {
      const text = String(req.query.text || '').trim().slice(0, 1500);
      if (!text) return res.status(400).send('Missing text parameter');
      const rate = Math.min(1.5, Math.max(0.5, Number(req.query.rate) || 1));
      const voice = ['female', 'male'].includes(req.query.voice) ? req.query.voice : 'male';
      try {
        const audio = await require('./tts').synthesize(text, rate, voice);
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.send(audio);
      } catch (e) {
        console.error('[tts]', e.message);
        res.status(500).json({ error: 'TTS failed' });
      }
    });

    // Ảnh câu hỏi đã chuyển sang WebP: link .png cũ (bộ đề tự tạo/xuất trước đây) vẫn hiện được
    app.get(/^\/quiz-images\/(cau\d+)\.png$/i, (req, res) => res.redirect(301, `/quiz-images/${req.params[0]}.webp`));
    app.use('/quiz-images', express.static(path.join(__dirname, '..', 'data', 'quiz-images'), {
      fallthrough: false,
      maxAge: '7d',
      immutable: true
    }));
    app.use(express.static(path.join(__dirname, '..', 'overlay'), { index: 'index.html' }));
    // Thư viện Three.js cho cảnh DJ Club 3D (đóng gói kèm app, không tải từ mạng)
    app.use('/vendor/three', express.static(path.join(__dirname, '..', 'node_modules', 'three')));

    // Âm thanh tuỳ chỉnh người dùng chọn trên máy
    app.get('/media/:kind', (req, res) => {
      const o = this.getConfig().overlay;
      const file = {
        gift: o.customGiftSound, chat: o.customChatSound, jumpscare: o.customJumpscare,
        scare: o.customScareSound, ambient: o.customAmbient
      }[req.params.kind] || '';
      const type = MEDIA_TYPES[path.extname(file).toLowerCase()];
      if (!file || !type || !fs.existsSync(file)) return res.sendStatus(404);
      // sendFile hỗ trợ Range -> video tua/phát được trong OBS
      res.sendFile(file, { headers: { 'Content-Type': type, 'Cache-Control': 'no-store' } });
    });

    // Phim cho cảnh Rạp Phim (file trên máy, hỗ trợ tua nhờ sendFile/Range)
    app.get('/rap/:i', (req, res) => {
      const list = this.getConfig().overlay.rapVideos || [];
      const file = list[Number(req.params.i)] || '';
      const type = MEDIA_TYPES[path.extname(file).toLowerCase()];
      if (!file || !type || !type.startsWith('video/') || !fs.existsSync(file)) return res.sendStatus(404);
      res.sendFile(file, { headers: { 'Content-Type': type, 'Cache-Control': 'no-store' } });
    });

    // Nhạc cho cảnh DJ Club (file trên máy người dùng chọn)
    app.get('/club/:i', (req, res) => {
      const list = this.getConfig().overlay.clubTracks || [];
      const file = list[Number(req.params.i)] || '';
      const type = MEDIA_TYPES[path.extname(file).toLowerCase()];
      if (!file || !type || !type.startsWith('audio/') || !fs.existsSync(file)) return res.sendStatus(404);
      res.sendFile(file, { headers: { 'Content-Type': type, 'Cache-Control': 'no-store' } });
    });

    // Ảnh đại diện TikTok cho DJ Club: tải qua server này để trang overlay vẽ được lên cảnh 3D (cùng nguồn).
    // Chỉ nhận ảnh từ máy chủ ảnh của TikTok, giữ tạm trong bộ nhớ.
    const AVATAR_HOSTS = /(^|.)(tiktokcdn(-[a-z]+)?.com|tiktokcdn.net|ibytedtos.com|ibyteimg.com|byteimg.com|muscdn.com|tiktokv.com)$/i;
    const avatarCache = new Map();
    app.get('/club-avatar', async (req, res) => {
      let u;
      try { u = new URL(String(req.query.u || '')); } catch { return res.sendStatus(400); }
      if (u.protocol !== 'https:' || !AVATAR_HOSTS.test(u.hostname)) return res.sendStatus(403);
      let hit = avatarCache.get(u.href);
      if (!hit) {
        try {
          const r = await fetch(u.href, { signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'Mozilla/5.0' } });
          const type = r.headers.get('content-type') || '';
          if (!r.ok || !type.startsWith('image/') || !AVATAR_HOSTS.test(new URL(r.url).hostname)) return res.sendStatus(502);
          const buf = Buffer.from(await r.arrayBuffer());
          if (buf.length > 1.5 * 1024 * 1024) return res.sendStatus(413);
          hit = { type, buf };
          avatarCache.set(u.href, hit);
          if (avatarCache.size > 150) avatarCache.delete(avatarCache.keys().next().value);
        } catch { return res.sendStatus(502); }
      }
      res.set({ 'Content-Type': hit.type, 'Cache-Control': 'public, max-age=3600' });
      res.send(hit.buf);
    });

    // Ảnh đại diện giả cho người thử (nút "Gửi thử"): mặt cười đơn giản, mỗi số một màu
    app.get('/club-demo-avatar/:n.svg', (req, res) => {
      const n = Math.abs(parseInt(req.params.n, 10) || 0) % 12;
      const hue = (n * 47) % 360;
      const hair = ['#2b1d16', '#111', '#6b3e1f', '#c98a3c', '#333a56', '#7a2232'][n % 6];
      const skin = ['#f6d3b3', '#e9b98f', '#f3c9a5', '#d9a07a'][n % 4];
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
<defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},75%,62%)"/><stop offset="1" stop-color="hsl(${(hue + 60) % 360},70%,40%)"/></linearGradient></defs>
<rect width="256" height="256" fill="url(#b)"/>
<ellipse cx="128" cy="250" rx="92" ry="70" fill="hsl(${(hue + 180) % 360},55%,45%)"/>
<rect x="110" y="160" width="36" height="40" rx="12" fill="${skin}"/>
<ellipse cx="128" cy="118" rx="62" ry="70" fill="${skin}"/>
<path d="M64 112 Q62 44 128 42 Q196 44 192 112 Q178 76 150 70 Q120 86 80 84 Q70 96 64 112Z" fill="${hair}"/>
<circle cx="104" cy="122" r="8" fill="#2a1a12"/><circle cx="152" cy="122" r="8" fill="#2a1a12"/>
<circle cx="92" cy="146" r="9" fill="#ff8fa3" opacity=".45"/><circle cx="164" cy="146" r="9" fill="#ff8fa3" opacity=".45"/>
<path d="M106 152 Q128 172 150 152" stroke="#7a2e2e" stroke-width="7" fill="none" stroke-linecap="round"/>
</svg>`;
      res.set({ 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' });
      res.send(svg);
    });

    // Ảnh cho màn hình LED của DJ Club (file trên máy người dùng chọn)
    app.get('/club-screen/:i', (req, res) => {
      const list = this.getConfig().overlay.clubScreenImages || [];
      const file = list[Number(req.params.i)] || '';
      const type = MEDIA_TYPES[path.extname(file).toLowerCase()];
      if (!file || !type || !type.startsWith('image/') || !fs.existsSync(file)) return res.sendStatus(404);
      res.sendFile(file, { headers: { 'Content-Type': type, 'Cache-Control': 'no-store' } });
    });

    app.get('/health', (_req, res) => res.json({ ok: true }));

    const server = http.createServer(app);
    const io = new Server(server, { cors: { origin: false } });
    io.on('connection', (socket) => {
      socket.emit('config', this.getConfig().overlay);
      socket.emit('quiz:data', this.getQuizData());
      const quizState = this.getQuizState();
      if (quizState?.active) socket.emit('quiz', { action: quizState.running ? 'start' : 'pause', index: quizState.index, reveal: quizState.reveal, seconds: quizState.seconds });
      socket.emit('stats', this.getSnapshot().stats);
      socket.emit('pause', this.getPaused());
      if (this.onConnection) this.onConnection(socket);
      this.emitClients();
      socket.on('disconnect', () => this.emitClients());
      socket.on('quiz:advance', (index) => {
        if (this.onQuizAdvance) this.onQuizAdvance(Number(index));
      });
    });

    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, '127.0.0.1', () => {
        server.off('error', reject);
        resolve();
      });
    });
    this.server = server;
    this.io = io;
    this.port = port;
    return port;
  }

  emitClients() {
    if (this.onClients) this.onClients(this.io ? this.io.engine.clientsCount : 0);
  }

  broadcast(event, payload) {
    if (this.io) this.io.emit(event, payload);
  }

  async stop() {
    if (!this.server) return;
    const server = this.server;
    this.io.close();
    this.server = null;
    this.io = null;
    await new Promise((r) => server.close(() => r()));
  }
}

module.exports = { OverlayServer };
