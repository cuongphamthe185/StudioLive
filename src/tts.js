'use strict';
/*
 * Giọng đọc tiếng Việt cho chế độ Đi Chùa Online (port từ server.ts của repo gốc).
 * Dùng dịch vụ đọc của Microsoft Edge (giọng tiếng Việt nam/nữ), lỗi thì chuyển sang Google Translate.
 * Lưu ý: cả hai là dịch vụ trực tuyến bên ngoài — câu cần đọc được gửi tới đó.
 */
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

const TTS_VOICES = { male: 'vi-VN-NamMinhNeural', female: 'vi-VN-HoaiMyNeural' };
const escapeXml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function splitTtsText(text, max = 190) {
  const chunks = [];
  let rest = text.trim();
  while (rest.length > max) {
    const win = rest.slice(0, max + 1);
    let cut = Math.max(win.lastIndexOf('. '), win.lastIndexOf('! '), win.lastIndexOf('? '));
    if (cut < max / 2) cut = Math.max(win.lastIndexOf(', '), win.lastIndexOf('; '));
    if (cut < max / 2) cut = win.lastIndexOf(' ');
    if (cut <= 0) cut = max - 1;
    chunks.push(rest.slice(0, cut + 1).trim());
    rest = rest.slice(cut + 1).trim();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

async function edgeTts(text, rate, gender) {
  const tts = new MsEdgeTTS();
  try {
    await tts.setMetadata(TTS_VOICES[gender] || TTS_VOICES.male, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
    const pitch = gender === 'female' ? '0%' : '-4%';
    const { audioStream } = tts.toStream(escapeXml(text), { rate: `${Math.round((rate - 1) * 100)}%`, pitch });
    const chunks = [];
    const read = (async () => {
      for await (const c of audioStream) chunks.push(c);
    })();
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Edge TTS timeout')), 20000));
    await Promise.race([read, timeout]);
    if (!chunks.length) throw new Error('Edge TTS returned no audio');
    return Buffer.concat(chunks);
  } finally {
    tts.close();
  }
}

async function googleTts(text) {
  const parts = [];
  for (const chunk of splitTtsText(text)) {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=${encodeURIComponent(chunk)}`;
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: 'https://translate.google.com/'
      }
    });
    if (!r.ok) throw new Error(`TTS upstream error: ${r.status}`);
    parts.push(Buffer.from(await r.arrayBuffer()));
  }
  return Buffer.concat(parts);
}

const cache = new Map();

async function synthesize(text, rate, gender = 'male') {
  gender = gender === 'female' ? 'female' : 'male';
  const key = `${gender}|${rate}|${text}`;
  let audio = cache.get(key);
  if (!audio) {
    try {
      audio = await edgeTts(text, rate, gender);
    } catch (err) {
      console.warn('[tts] Edge lỗi, chuyển sang Google:', err.message);
      audio = await googleTts(text);
    }
    cache.set(key, audio);
    if (cache.size > 200) cache.delete(cache.keys().next().value);
  }
  return audio;
}

module.exports = { synthesize };
