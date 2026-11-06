# StudioLive

[English](README.en.md) | **Tiếng Việt**

[![Release](https://img.shields.io/github/v/release/tanthuan031/StudioLive)](https://github.com/tanthuan031/StudioLive/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey)

App máy tính tạo **cảnh tương tác cho TikTok LIVE**, chạy hoàn toàn trên máy của bạn. Mã nguồn mở, miễn phí — ai cũng có thể tải về dùng hoặc phát triển thêm.

> ⚠️ **Đọc [Tuyên bố miễn trừ trách nhiệm](DISCLAIMER.md) trước khi dùng.** Nghiêm cấm dùng StudioLive để lừa đảo, trục lợi, lợi dụng tín ngưỡng hay livestream vi phạm pháp luật.

![Bảng điều khiển](docs/screenshots/dashboard.png)

## Tính năng

- **👻 Live Ma Online** — người xem hoá ma, gõ `hù` / `trốn` / `tìm` / `bùa` / `gọi hồn` / `tắt đèn`… để chơi với nhau; quà lớn gọi Bà Ma + jumpscare; vòng TRỐN TÌM định kỳ.
- **🪷 Đi Chùa Online** — chánh điện; người xem ngồi bồ đoàn, gõ `adidaphat` lên thắp hương; quà làm sen vàng nở, giọng đọc cảm ơn và chúc; thả tim đủ mục tiêu thì mưa hoa sen.
- **🎬 Rạp Phim Online** — phòng chiếu phim; người xem được chào, vào ghế ngồi; chiếu danh sách phim (link YouTube, .mp4/.webm hoặc file trên máy); lệnh `vỗ tay` / `haha` / `wow` / `bắp`; quà = ghế VIP; đủ tim = mưa bắp rang. 4 kiểu phòng: Cổ điển, VIP Gold, IMAX, Gia đình.
- **🚦 Ôn thi GPLX** — chọn hạng, xáo ngẫu nhiên ngân hàng câu hỏi, đặt thời gian mỗi câu; hết giờ tự hiện đáp án/kết quả rồi chuyển câu. Có sẵn ngân hàng 600 câu (kèm ảnh biển báo, sa hình); tạo/sửa/xoá câu hỏi và hạng ngay trong app, dữ liệu lưu trong SQLite trên máy. Người xem bình luận A/B/C/D để trả lời, giọng đọc câu hỏi và đáp án.

Mở tab nào thì cảnh đó chạy trên live.

| 👻 Live Ma Online | 🪷 Đi Chùa Online | 🎬 Rạp Phim Online |
|---|---|---|
| ![Live Ma Online](docs/screenshots/live-ma-online.png) | ![Đi Chùa Online](docs/screenshots/di-chua-online.png) | ![Rạp Phim Online](docs/screenshots/rap-phim-online.png) |

## Tải & cài đặt (người dùng)

Tải bản cài sẵn tại **[Releases v1.0.0](https://github.com/tanthuan031/StudioLive/releases/tag/v1.0.0)**:

| Máy | File tải |
|---|---|
| Mac chip Apple (M1, M2, M3, M4…) | [`StudioLive-1.0.0-mac-arm64.dmg`](https://github.com/tanthuan031/StudioLive/releases/download/v1.0.0/StudioLive-1.0.0-mac-arm64.dmg) |
| Mac chip Intel | [`StudioLive-1.0.0-mac-x64.dmg`](https://github.com/tanthuan031/StudioLive/releases/download/v1.0.0/StudioLive-1.0.0-mac-x64.dmg) |
| Windows 10/11 64-bit | [`StudioLive-Setup-1.0.0-win-x64.exe`](https://github.com/tanthuan031/StudioLive/releases/download/v1.0.0/StudioLive-Setup-1.0.0-win-x64.exe) |

Không biết Mac chip gì: bấm  → **Giới thiệu về máy Mac** — “Chip: Apple M…” là chip Apple, “Bộ xử lý: Intel…” là chip Intel.

### macOS (12 trở lên)

1. Mở file `.dmg`, **kéo StudioLive vào thư mục Applications**.
2. Vào **Applications**, **chuột phải (Control + bấm) vào StudioLive → Mở → Mở**. App chưa ký số Apple nên lần đầu macOS hỏi lại, chỉ cần làm một lần.
3. Vẫn bị chặn: **Cài đặt hệ thống → Quyền riêng tư & Bảo mật → Vẫn mở (Open Anyway)**.
4. Báo **“StudioLive bị hỏng và không thể mở”**: mở **Terminal**, chạy lệnh rồi mở lại app:

   ```bash
   xattr -cr /Applications/StudioLive.app
   ```

### Windows

1. Chạy `StudioLive-Setup-1.0.0-win-x64.exe` → chọn thư mục → **Install**.
2. Nếu hiện **“Windows đã bảo vệ PC của bạn”** (SmartScreen, do app chưa ký số): bấm **More info → Run anyway**.
3. Mở **StudioLive** từ Desktop hoặc menu Start.

### Lên live lần đầu

1. **Chọn cảnh**: bấm tab 👻 Ma / 🪷 Chùa / 🎬 Rạp / 🚦 GPLX ở menu trái.
2. **Thêm vào TikTok LIVE Studio**: khung **dọc**, thêm nguồn **Link** `http://lvh.me:3000`, kích thước **1080 × 1920**, kéo phủ kín khung. (LIVE Studio không nhận `localhost`; `lvh.me` luôn trỏ về chính máy bạn.)
3. Bấm **Go LIVE** trên TikTok LIVE Studio.
4. **Kết nối**: ở Bảng điều khiển nhập username TikTok (không cần @) → **Kết nối**.

Chưa live vẫn thử được bằng các nút **Gửi thử** trong từng tab. Hướng dẫn đầy đủ (chất lượng hình, OBS, mẹo khi live, xử lý lỗi): **[docs/HUONG-DAN-CAI-DAT.md](docs/HUONG-DAN-CAI-DAT.md)**.

## Chạy từ mã nguồn (nhà phát triển)

Cần **Node.js 20.19+ (khuyên dùng 22 LTS)** và **git**.

```bash
git clone https://github.com/tanthuan031/StudioLive.git
cd StudioLive
npm install
npm start          # chế độ phát triển (Vite + Electron)
```

| Lệnh | Tác dụng |
|---|---|
| `npm start` / `npm run dev` | Chạy Vite + Electron. Sửa giao diện (`renderer/`) thì tự cập nhật; sửa `src/*.js` thì Electron tự khởi động lại. **Ctrl+C** để dừng (nhấn 2 lần để buộc thoát ngay). |
| `npm run start:prod` | Build giao diện vào `renderer/dist` rồi chạy như bản cài thật. |
| `npm run build:renderer` | Chỉ build giao diện. |

Đóng gói bản cài (không ký số):

```bash
npm run dist:mac   # .dmg + .zip cho arm64 và x64
npm run dist:win   # bộ cài NSIS x64
```

Chi tiết: [docs/BUILD.md](docs/BUILD.md).

### Cấu trúc

```
src/main.js       Tiến trình chính: cửa sổ, IPC, dữ liệu thử, tự kiểm tra (STUDIO_SELFTEST)
src/live.js       Quản lý kết nối TikTok, chuẩn hoá sự kiện, tự kết nối lại
src/direct.js     Đọc sự kiện qua trình duyệt ẩn + giải mã protobuf (tiktok-live-connector 2.0.0, MIT)
src/server.js     Server overlay Express + Socket.IO (chỉ 127.0.0.1) + giọng đọc /api/tts
src/tts.js        Giọng đọc tiếng Việt (Microsoft Edge, dự phòng Google)
src/settings.js   Lưu cài đặt trong thư mục userData
src/quiz-store.js Ngân hàng câu hỏi GPLX (SQLite, node:sqlite)
scripts/dev.js    Chạy chế độ phát triển: Vite + Electron, tự khởi động lại, dừng sạch khi Ctrl+C
renderer/         Giao diện điều khiển Vue 3, build bằng Vite vào renderer/dist trước khi chạy/đóng gói
renderer/App.vue  Khung giao diện điều khiển; LiveMaView.vue, TempleView.vue, CinemaView.vue, LicenseQuizView.vue là các cảnh Vue; QuizManager.vue quản lý ngân hàng đề
renderer/app.js   Cầu nối sự kiện hiện có cho các màn hình và tính năng chưa chuyển thành Vue component
overlay/          Trang hiển thị trên live: game.js (Nhà Ma), temple.js (Đi Chùa), rap.js (Rạp Phim), quiz.js (GPLX), faces.js, audio.js
overlay/chua-assets/  Ảnh, nhân vật, hiệu ứng, nhạc của cảnh Đi Chùa
data/             Ngân hàng 600 câu GPLX (quiz-600-meothilaixe.json) + ảnh câu hỏi (quiz-images/*.webp)
build/icon.png    Icon app
```

Chỉ cảnh đang chọn mới chạy vòng vẽ; các cảnh khác dừng hẳn để máy nhẹ. Ảnh mới thêm vào `data/` hoặc `overlay/` nên dùng **WebP** cho gọn (xem [docs/BUILD.md](docs/BUILD.md#tài-nguyên-ảnh--dung-lượng)).

Cài đặt người dùng lưu tại `~/Library/Application Support/StudioLive/settings.json` (macOS), `%APPDATA%\StudioLive\settings.json` (Windows). Ngân hàng câu hỏi lưu trong `quiz.sqlite` cùng thư mục dữ liệu ứng dụng.

> Lưu ý: giữ `tiktok-live-connector` ở **2.0.0** (MIT). Các bản mới hơn dùng giấy phép AGPL-3.0.

### Đóng góp

Chào mừng mọi đóng góp: fork repo → tạo nhánh → commit → mở Pull Request. Báo lỗi hoặc đề xuất tính năng tại [Issues](https://github.com/tanthuan031/StudioLive/issues).

## Giấy phép & miễn trừ trách nhiệm

- Mã nguồn phát hành theo giấy phép **[MIT](LICENSE)** — © 2026 [Tanthuan031](https://github.com/tanthuan031).
- Thư viện & tài nguyên bên thứ ba giữ giấy phép riêng: [docs/THIRD_PARTY_NOTICES.md](docs/THIRD_PARTY_NOTICES.md).
- **[DISCLAIMER.md](DISCLAIMER.md)** — phần mềm chỉ phục vụ giải trí, học tập. Người dùng tự chịu hoàn toàn trách nhiệm về nội dung livestream; tác giả không chịu trách nhiệm cho mọi hành vi lừa đảo, trục lợi, lợi dụng tín ngưỡng, vi phạm bản quyền hay vi phạm pháp luật của người sử dụng. StudioLive không liên kết với TikTok / ByteDance.

## Tác giả

** Tanthuan031 **
### GitHub: [@tanthuan031](https://github.com/tanthuan031)
### Website: https://thuantech.com
### Facebook: https://www.facebook.com/thuanht31
### Tiktok: https://www.tiktok.com/@rv.dev

## ☕ Mời tác giả ly cà phê

Nếu StudioLive giúp ích cho bạn, có thể mời mình một ly cà phê để có thêm động lực phát triển tiếp. Hoàn toàn tự nguyện — app vẫn miễn phí cho tất cả mọi người. Cảm ơn bạn! 💚

<p align="center">
  <img src="docs/screenshots/donate-qr.png" alt="Mã QR ủng hộ (VietQR / Napas 247)" width="260">
</p>

<p align="center"><sub>Quét bằng app ngân hàng bất kỳ hỗ trợ VietQR / Napas 247.</sub></p>
