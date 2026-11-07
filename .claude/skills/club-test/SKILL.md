---
name: club-test
description: Chạy StudioLive và kiểm tra cảnh DJ Club bằng mắt (chụp màn hình cửa sổ xuất hình, bắn sự kiện demo, đo fps). Dùng khi cần xem một thay đổi trong overlay/club/ hay club-assets/ chạy thật ra sao, hoặc thử tải nhiều quà cùng lúc.
---

# Kiểm tra DJ Club

Cửa sổ xuất hình (`http://127.0.0.1:3000/?output`) là nơi cảnh chạy thật. Pane trình duyệt bị ẩn sẽ bị hãm khung hình, nên điều khiển cửa sổ này qua Chrome DevTools Protocol (CDP).

## Chạy app có cổng gỡ lỗi

Từ thư mục `StudioLive`, chạy nền:

```bash
./node_modules/electron/dist/electron.exe . --remote-debugging-port=9223
```

`npm start` không mở cổng CDP. Nếu `renderer/dist` cũ so với mã `.vue`, chạy `npm run build:renderer` trước. Trong app, mở tab DJ Club và bật cửa sổ xuất hình.

## Điều khiển và chụp

`cdp.mjs` (cạnh file này) nối vào cửa sổ `?output`, chạy một biểu thức JS và có thể chụp ảnh:

```bash
node .claude/skills/club-test/cdp.mjs 9223 "<biểu thức JS>" [ảnh-ra.jpg]
```

Trong trang có `window.__club = { world, camera, director, cast, fireworks, perf, THREE }`:
- `director.hold('<góc>', ms)` giữ một góc máy; xem tên góc trong `SHOTS` ở `overlay/club/director.js`.
- `cast.dogs` là danh sách nhân vật đang có trên sàn; `perf` cho biết mức giảm chất lượng tự động.

Sự kiện demo (người xem giả có ảnh đại diện) bắn từ nút Test trong tab quản trị, tức IPC `overlay:test` với các loại trong `demoEvent` ở `src/main.js` (`gift`, `gift100`, `gift1000`, `like`, `dance`…).

## Lưu ý

- Đo hiệu năng bằng số rAF/giây trong trang. Máy này yếu GPU; người dùng chấp nhận việc chậm khi có khoảng 40 nhân vật, vì live thật dưới 50 người xem.
- Xem ảnh chụp trước khi kết luận, vì lỗi hình (chân đè bàn DJ, cánh lệch, khói đục) chỉ thấy bằng mắt.
- Khi xong, dừng tiến trình Electron vừa chạy.
