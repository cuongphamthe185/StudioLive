# StudioLive

**English** | [Tiếng Việt](README.md)

[![Release](https://img.shields.io/github/v/release/tanthuan031/StudioLive)](https://github.com/tanthuan031/StudioLive/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey)

A desktop app that creates **interactive scenes for TikTok LIVE**, running entirely on your own computer. Free and open source — anyone can download it, use it, or build on it.

> ⚠️ **Read the [Disclaimer](DISCLAIMER.md) before use.** Using StudioLive for scams, profiteering, exploiting religious beliefs, or any illegal livestream is strictly prohibited.

> The app interface and in-scene chat commands are in Vietnamese.

![Dashboard](docs/screenshots/dashboard.png)

## Features

- **👻 Live Ma Online (Haunted House)** — viewers turn into ghosts and type `hù` (boo) / `trốn` (hide) / `tìm` (seek) / `bùa` (talisman) / `gọi hồn` (summon) / `tắt đèn` (lights out)… to play with each other; big gifts summon the Granny Ghost + a jumpscare; periodic HIDE-AND-SEEK rounds.
- **🪷 Đi Chùa Online (Temple Visit)** — a temple main hall; viewers sit on meditation cushions and type `adidaphat` to come up and light incense; gifts make golden lotuses bloom, with a voice thanking and blessing them; reaching the like goal triggers a lotus-petal shower.
- **🎬 Rạp Phim Online (Movie Theater)** — a cinema room; viewers are greeted and walk to their seats; the screen plays a playlist (YouTube links, .mp4/.webm links, or local files); commands `vỗ tay` (clap) / `haha` / `wow` / `bắp` (popcorn); gifts = VIP seats; enough likes = popcorn rain. 4 room styles: Classic, VIP Gold, IMAX, Family.
- **🚦 Ôn thi GPLX (Driving-licence quiz)** — a live multiple-choice quiz for the Vietnamese driving licence exam: pick a licence class, shuffle the built-in 600-question bank (with sign/road images), set seconds per question; when time is up the answer and results are shown, then the next question starts. Create/edit questions and classes in the app; data is stored locally in SQLite. Viewers comment A/B/C/D to answer, with voice reading the question and answer.

Whichever tab is open is the scene shown on the live stream.

| 👻 Live Ma Online | 🪷 Đi Chùa Online | 🎬 Rạp Phim Online |
|---|---|---|
| ![Live Ma Online](docs/screenshots/live-ma-online.png) | ![Đi Chùa Online](docs/screenshots/di-chua-online.png) | ![Rạp Phim Online](docs/screenshots/rap-phim-online.png) |

## Download & install (users)

Download the ready-made installers from **[Releases v1.0.0](https://github.com/tanthuan031/StudioLive/releases/tag/v1.0.0)**:

| Computer | File |
|---|---|
| Mac with Apple chip (M1, M2, M3, M4…) | [`StudioLive-1.0.0-mac-arm64.dmg`](https://github.com/tanthuan031/StudioLive/releases/download/v1.0.0/StudioLive-1.0.0-mac-arm64.dmg) |
| Mac with Intel chip | [`StudioLive-1.0.0-mac-x64.dmg`](https://github.com/tanthuan031/StudioLive/releases/download/v1.0.0/StudioLive-1.0.0-mac-x64.dmg) |
| Windows 10/11 64-bit | [`StudioLive-Setup-1.0.0-win-x64.exe`](https://github.com/tanthuan031/StudioLive/releases/download/v1.0.0/StudioLive-Setup-1.0.0-win-x64.exe) |

Not sure which Mac chip you have? Click  → **About This Mac** — “Chip: Apple M…” means Apple chip, “Processor: Intel…” means Intel.

### macOS (12 or later)

1. Open the `.dmg` file and **drag StudioLive into the Applications folder**.
2. In **Applications**, **right-click (Control + click) StudioLive → Open → Open**. The app is not signed with an Apple certificate, so macOS asks once on first launch.
3. Still blocked? Go to **System Settings → Privacy & Security → Open Anyway**.
4. If you see **“StudioLive is damaged and can’t be opened”**: open **Terminal**, run the command below, then open the app again:

   ```bash
   xattr -cr /Applications/StudioLive.app
   ```

### Windows

1. Run `StudioLive-Setup-1.0.0-win-x64.exe` → choose a folder → **Install**.
2. If **“Windows protected your PC”** (SmartScreen, because the app is unsigned) appears: click **More info → Run anyway**.
3. Open **StudioLive** from the Desktop or the Start menu.

### Going live for the first time

1. **Pick a scene**: click the 👻 Ma / 🪷 Chùa / 🎬 Rạp / 🚦 GPLX tab in the left menu.
2. **Add it to TikTok LIVE Studio**: use a **portrait** layout, add a **Link** source `http://lvh.me:3000`, size **1080 × 1920**, stretched to fill the frame. (LIVE Studio rejects `localhost`; `lvh.me` always points back to your own machine.)
3. Click **Go LIVE** in TikTok LIVE Studio.
4. **Connect**: on the Dashboard, enter your TikTok username (no @) → **Kết nối** (Connect).

You can try everything before going live with the **Gửi thử** (Send test) buttons in each tab. Full guide (video quality, OBS, live tips, troubleshooting — Vietnamese): **[docs/HUONG-DAN-CAI-DAT.md](docs/HUONG-DAN-CAI-DAT.md)**.

## Run from source (developers)

Requires **Node.js 20.19+ (22 LTS recommended)** and **git**.

```bash
git clone https://github.com/tanthuan031/StudioLive.git
cd StudioLive
npm install
npm start          # development mode (Vite + Electron)
```

| Command | What it does |
|---|---|
| `npm start` / `npm run dev` | Runs Vite + Electron. UI changes (`renderer/`) hot-reload; changes to `src/*.js` restart Electron automatically. **Ctrl+C** to stop (press twice to force quit). |
| `npm run start:prod` | Builds the UI into `renderer/dist`, then runs it like the installed app. |
| `npm run build:renderer` | Builds the UI only. |

Build installers (unsigned):

```bash
npm run dist:mac   # .dmg + .zip for arm64 and x64
npm run dist:win   # NSIS installer, x64
```

Details: [docs/BUILD.md](docs/BUILD.md).

### Project structure

```
src/main.js       Main process: windows, IPC, test data, self-test (STUDIO_SELFTEST)
src/live.js       TikTok connection manager, event normalisation, auto-reconnect
src/direct.js     Reads events via a hidden browser + protobuf decoding (tiktok-live-connector 2.0.0, MIT)
src/server.js     Express + Socket.IO overlay server (127.0.0.1 only) + /api/tts voice endpoint
src/tts.js        Vietnamese text-to-speech (Microsoft Edge, Google fallback)
src/settings.js   Settings stored in the userData folder
src/quiz-store.js GPLX question bank (SQLite via node:sqlite)
scripts/dev.js    Dev runner: Vite + Electron, auto-restart, clean shutdown on Ctrl+C
renderer/         Control panel UI (Vue 3, built by Vite into renderer/dist before running/packaging)
overlay/          Pages shown on the live stream: game.js (Haunted House), temple.js (Temple), rap.js (Theater), quiz.js (GPLX), faces.js, audio.js
overlay/chua-assets/  Images, characters, effects and music for the Temple scene
data/             600-question GPLX bank (quiz-600-meothilaixe.json) + question images (quiz-images/*.webp)
build/icon.png    App icon
```

Only the selected scene runs its render loop; the others stop completely to keep the app light. Prefer **WebP** for new images in `data/` or `overlay/` (see [docs/BUILD.md](docs/BUILD.md)).

User settings are stored at `~/Library/Application Support/StudioLive/settings.json` (macOS) and `%APPDATA%\StudioLive\settings.json` (Windows). The question bank is stored in `quiz.sqlite` in the same app-data folder.

> Note: keep `tiktok-live-connector` pinned at **2.0.0** (MIT). Newer versions are licensed under AGPL-3.0.

### Contributing

Contributions are welcome: fork the repo → create a branch → commit → open a Pull Request. Report bugs or suggest features in [Issues](https://github.com/tanthuan031/StudioLive/issues).

## License & disclaimer

- Source code is released under the **[MIT License](LICENSE)** — © 2026 [Tanthuan031](https://github.com/tanthuan031).
- Third-party libraries and assets keep their own licenses: [docs/THIRD_PARTY_NOTICES.md](docs/THIRD_PARTY_NOTICES.md).
- **[DISCLAIMER.md](DISCLAIMER.md)** (Vietnamese) — this software is for entertainment and learning only. Users are solely and fully responsible for their livestream content. The author is not responsible for any scam, fraud, profiteering, exploitation of religious beliefs, copyright infringement, or other unlawful conduct by users. StudioLive is not affiliated with, endorsed by, or sponsored by TikTok / ByteDance.

## Author

** Tanthuan031 **
### GitHub: [@tanthuan031](https://github.com/tanthuan031)
### Website: https://thuantech.com
### Facebook: https://www.facebook.com/thuanht31
### Tiktok: https://www.tiktok.com/@rv.dev

## ☕ Buy me a coffee

If StudioLive is useful to you, you can buy me a coffee to keep the project going. Entirely optional — the app stays free for everyone. Thank you! 💚

<p align="center">
  <img src="docs/screenshots/donate-qr.png" alt="Donation QR code (VietQR / Napas 247)" width="260">
</p>

<p align="center"><sub>Scan with any banking app that supports VietQR / Napas 247 (Vietnamese banks).</sub></p>
