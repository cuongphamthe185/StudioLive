---
name: club-character
description: Thêm nhân vật nhảy (meme / sticker động) vào đám đông DJ Club từ link Tenor hoặc file ảnh người dùng gửi. Dùng khi người dùng gửi link GIF/sticker và bảo thêm, tải hoặc setup nhân vật.
---

# Thêm nhân vật DJ Club

Link Tenor người dùng gửi kèm lời bảo thêm là đã cho phép tải.

1. **Pháp lý** (khi người dùng hỏi, hoặc nhân vật rõ ràng thuộc thương hiệu lớn): nhân vật của thương hiệu lớn (Pokémon, Shin-chan…) có rủi ro cao, nên nói rõ để người dùng quyết định. Fan art hay meme không rõ nguồn có rủi ro vừa, dùng được.
2. **Lấy ảnh**: ưu tiên bản `webp_transparent` của Tenor (mã `AAAAl` trong URL media). Nếu chỉ có GIF nền phẳng, tách nền bằng `tools/rmbg-webp.js` (bên dưới) rồi soát viền bằng `tools/view.js`. Nền có hoạ tiết hay ảnh chụp thì không tách được; báo người dùng.
3. **Đặt tên**: lưu vào `overlay/club-assets/characters/` với tiền tố người dùng chỉ định (`boy_*`, `girl_*`), con vật dùng `pet_*`, tên kebab-case.
4. **Khai báo**: thêm một dòng vào `characters` trong `overlay/club-assets/manifest.json` (chỉnh `faces` theo hướng mặt, `feet` theo phần trống dưới chân) và ghi nguồn vào `overlay/club-assets/CREDITS.md`. Không sửa code; `DEFAULT_ASSETS` trong code chỉ giữ một nhân vật dự phòng.
5. **Không mở app thử từng nhân vật.** Gom nhiều nhân vật rồi kiểm tra một lần bằng skill `club-test`, tìm con bị mờ, vỡ hay lệch chân. Báo lại cho người dùng quyết định có xử lý không.

File tải về để trong thư mục tạm riêng; chỉ ảnh đã xử lý mới chép vào repo.

## Công cụ xử lý ảnh (`tools/`)

Chạy bằng Electron của dự án, từ thư mục gốc repo; tham số truyền qua biến môi trường.

| Script | Việc | Biến môi trường |
|---|---|---|
| `inspect.js` | Đọc ảnh động: số khung, thời gian khung, có trong suốt không, vùng có hình; xuất ảnh ghép các khung | `AN_SRC`, `AN_TYPE` (`image/gif` / `image/webp`), `AN_SHEET` |
| `rmbg-webp.js` | Tách nền phẳng bằng tô loang từ mép, xoá chấm nhiễu, cắt sát, xuất WebP động nền trong suốt | `RB_SRC`, `RB_TYPE`, `RB_OUT`, `RB_SHEET`, `RB_TOL` (độ lệch màu nền, 40), `RB_STEP` (giữ 1 khung mỗi N khung), `RB_Q` (chất lượng 0–1, 0.85), `RB_MAXH` (chiều cao tối đa, 0 = giữ), `RB_MINAREA` (ngưỡng chấm nhiễu, 0.002) |
| `view.js` | Xem khung đầu ở cỡ thật trên nền tối và nền ô | `VW_SRC`, `VW_TYPE`, `VW_OUT` |

```bash
RB_SRC=meme.gif RB_TYPE=image/gif RB_OUT=girl_ten.webp RB_SHEET=xem.png RB_STEP=2 ./node_modules/electron/dist/electron.exe .claude/skills/club-character/tools/rmbg-webp.js
```

Trên macOS dùng `./node_modules/.bin/electron` thay cho `electron.exe`.
