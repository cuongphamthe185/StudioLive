# StudioLive

App Electron tạo cảnh tương tác cho TikTok LIVE (Live Ma, Đi Chùa, Rạp Phim, GPLX, DJ Club). Người xem tương tác qua chat / quà / tim; app nhận sự kiện bằng `tiktok-live-connector` và đẩy sang overlay qua Socket.IO.

## Kiến trúc

- `src/` — tiến trình chính Electron: `main.js` (cửa sổ, IPC, sự kiện demo `demoEvent`), `server.js` (Express + Socket.IO ở `127.0.0.1:3000`, phục vụ `overlay/`), `live.js` (kết nối TikTok), `settings.js` (cài đặt mặc định), `clubScore.js` (điểm DJ Club theo phiên).
- `renderer/` — giao diện quản trị Vue 3 + Vite (`App.vue`, `components/*View.vue`). `app.js` vẫn nối DOM kiểu imperative, nên đổi id / nhãn trong `.vue` thì kiểm tra cả `app.js`.
- `overlay/` — trang hiển thị cho OBS / LIVE Studio (`index.html`, mở cửa sổ xuất hình bằng `?output`). Mỗi cảnh một file (`temple.js`, `rap.js`, `quiz.js`…).
- `overlay/club/` — DJ Club 3D: three.js 0.187 + lớp CSS3D (nhân vật là DOM nên luôn vẽ đè lên WebGL). `club3d.js` điều phối, `director.js` góc máy, `cast.js` nhân vật / cánh / áp sát, `world.js` sân khấu / sàn / khói, `fireworks.js`, `djbadge.js`, `silhouette.js`. Tài nguyên khai báo ở `overlay/club-assets/manifest.json` (xem `overlay/club-assets/README.md`); thiếu file thì cảnh tự dùng hình vẽ bằng code.

## Lệnh

- `npm start` — Vite (cổng 5173) + Electron, tự khởi động lại khi sửa `src/`.
- `npm run start:prod` — build `renderer/dist` rồi chạy như bản cài.
- `npm run dist:win` / `dist:mac` — đóng gói vào `dist/`.

Repo không có test tự động hay lint; kiểm tra bằng cách chạy app (skill `club-test` cho DJ Club).

## Quy ước

- Người dùng viết tiếng Việt: trả lời, chữ hiển thị trong app và chú thích code đều bằng tiếng Việt.
- File trộn LF và CRLF (vd. `overlay/club/director.js` là CRLF). Script sửa file hàng loạt phải giữ nguyên kiểu xuống dòng.
- Node ≥ 20.19, Electron 45. Terminal IDE có thể đặt `ELECTRON_RUN_AS_NODE`; `npm start` đã tự bỏ.
- Tài nguyên bên thứ ba ghi nguồn ở `overlay/club-assets/CREDITS.md` và `docs/THIRD_PARTY_NOTICES.md` (XiuGouDisco: Mulan PSL v2; file CC-BY giữ dòng ghi công).

## Git

- `origin` là fork của người dùng. Upstream được gộp vào `main` của fork qua PR của chính người dùng; không mở PR lên upstream.
- Việc DJ Club nằm ở nhánh `feature/dj-club-3d`. Giữ thay đổi ở file dùng chung ở mức tối thiểu để gộp upstream dễ.
- Chỉ commit / push khi người dùng yêu cầu.
