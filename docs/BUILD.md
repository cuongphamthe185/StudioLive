# Phát triển & đóng gói StudioLive

## Chuẩn bị

Cần **Node.js 20.19+** (khuyên dùng 22 LTS — Vite 8 không chạy trên Node 18) và **git**.

```bash
git clone https://github.com/tanthuan031/StudioLive.git
cd StudioLive
npm install
```

## Chạy khi phát triển

| Lệnh | Tác dụng |
|---|---|
| `npm start` (= `npm run dev`) | Chạy Vite (giao diện, cổng 5173) + Electron. Sửa file trong `renderer/` thì giao diện tự cập nhật; sửa `src/*.js` thì Electron tự khởi động lại. |
| `npm run start:prod` | Build giao diện vào `renderer/dist` rồi chạy giống bản cài thật. |
| `npm run build:renderer` | Chỉ build giao diện vào `renderer/dist`. |

**Dừng:** nhấn **Ctrl+C** một lần — Vite và Electron đều tắt sạch, terminal trở lại bình thường. Nếu một tiến trình bị treo, sau 3 giây sẽ tự buộc dừng; nhấn Ctrl+C lần 2 để thoát ngay. Đóng cửa sổ app cũng dừng luôn Vite.

**Lỗi thường gặp**

| Hiện tượng | Cách xử lý |
|---|---|
| `Port 5173 is in use` | Còn một phiên dev cũ đang chạy: đóng nó, hoặc `lsof -ti :5173 \| xargs kill` (macOS/Linux). |
| `TypeError: Cannot read properties of undefined (reading 'setName')` khi chạy `electron .` | Terminal đang đặt biến `ELECTRON_RUN_AS_NODE` (hay gặp trong terminal của một số IDE). Chạy `unset ELECTRON_RUN_AS_NODE` rồi thử lại. `npm start` đã tự bỏ biến này. |
| Cổng 3000 bị chiếm | Đổi cổng trong app: Cài đặt → Kết nối TikTok → Nâng cao. |

## Lệnh đóng gói

Lệnh đóng gói tự chạy `build:renderer` trước, không cần build tay.

| Lệnh | Tạo ra (trong `dist/`) | Chạy được trên |
|---|---|---|
| `npm run dist:mac` | `StudioLive-<ver>-mac-arm64.dmg/.zip`, `StudioLive-<ver>-mac-x64.dmg/.zip` | macOS |
| `npm run dist:win` | `StudioLive-Setup-<ver>-win-x64.exe` (bộ cài) | Windows, hoặc Mac chip Apple **đã cài Rosetta** |

Bộ cài Windows dùng NSIS; trên Mac chip Apple cần Rosetta để chạy công cụ `makensis`:

```bash
softwareupdate --install-rosetta --agree-to-license
```

Đổi số phiên bản: sửa `"version"` trong `package.json` trước khi đóng gói (tên file cài đặt lấy theo số này, nên tăng số mỗi lần phát hành để không trùng bản cũ).

Bản cài chỉ chứa `src/`, `renderer/dist/` (giao diện đã build — không kèm mã nguồn `.vue`), `overlay/`, `data/` và `package.json`. Thư mục `dist/` và `renderer/dist/` đã nằm trong `.gitignore`, không commit lên git; file cài đặt đăng lên [GitHub Releases](https://github.com/tanthuan031/StudioLive/releases).

## Tài nguyên ảnh & dung lượng

- Ảnh câu hỏi GPLX nằm ở `data/quiz-images/cau<số>.webp` (định dạng **WebP**, rộng tối đa 960px). Cả 318 ảnh chỉ khoảng 4 MB.
- Thêm/thay ảnh mới: dùng WebP thay cho PNG. Ví dụ với [`cwebp`](https://developers.google.com/speed/webp/download) (`brew install webp`):

  ```bash
  # ảnh rộng hơn 960px thì thu nhỏ, giữ tỉ lệ
  cwebp -q 82 -m 6 -resize 960 0 anh-goc.png -o data/quiz-images/cau601.webp
  # ảnh nhỏ thì chỉ nén
  cwebp -q 82 -m 6 anh-goc.png -o data/quiz-images/cau601.webp
  ```

  Rồi trỏ câu hỏi tới `/quiz-images/cau601.webp` (trong `data/quiz-600-meothilaixe.json` hoặc trong app).
- Đường dẫn `.png` cũ (`/quiz-images/cauN.png`, link `meothilaixe.top`) vẫn chạy: khi mở app, dữ liệu đã lưu tự chuyển sang `.webp`, và server tự chuyển hướng link `.png` sang file `.webp`.

## Không ký số (unsigned)

- **Mac**: cấu hình `"identity": "-"` → ký **ad-hoc** (bắt buộc để chạy trên chip Apple), không notarize. Người dùng mở lần đầu bằng chuột phải → Mở, hoặc `xattr -cr /Applications/StudioLive.app` (xem `HUONG-DAN-CAI-DAT.md`).
- **Windows**: không ký → SmartScreen cảnh báo lần đầu, người dùng bấm “More info → Run anyway”.
- Muốn bỏ các cảnh báo này: mua chứng chỉ Apple Developer (99 USD/năm, ký + notarize) và chứng chỉ ký mã Windows (OV/EV), rồi thêm cấu hình ký vào `package.json`.

## Tự kiểm tra (không hiện cửa sổ)

Từ mã nguồn (cần `npm run build:renderer` trước):

```bash
STUDIO_SELFTEST=/tmp/kq.json npx electron .; cat /tmp/kq.json
```

Bản đã đóng gói:

```bash
STUDIO_SELFTEST=/tmp/kq.json "dist/mac-arm64/StudioLive.app/Contents/MacOS/StudioLive"; cat /tmp/kq.json
```

Kết quả đúng: `server`, `health`, `overlay`, `chuaAssets`, `decoder` đều `true`. Lưu ý: app chỉ chạy một bản cùng lúc, hãy tắt StudioLive đang mở trước khi tự kiểm tra.

## Module native

`bufferutil` / `utf-8-validate` (đi kèm thư viện `websocket`) dùng bản dựng sẵn (`prebuilds/`) cho từng hệ điều hành, nên cấu hình đặt `"npmRebuild": false`. Nếu lỡ chạy biên dịch lại trên Mac, xoá `node_modules/bufferutil/build` và `node_modules/utf-8-validate/build` trước khi đóng gói Windows.

Ngân hàng câu hỏi dùng `node:sqlite` có sẵn trong Node/Electron, không cần module native thêm.
