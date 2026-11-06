# Thông báo bên thứ ba

StudioLive sử dụng các thư viện và tài nguyên sau. Mọi thư viện đi kèm bản phát hành đều dùng giấy phép cho phép sử dụng thương mại (MIT, ISC, BSD, Apache-2.0, BlueOak-1.0.0, 0BSD). Không có thư viện GPL/AGPL.

## Thư viện chính

| Thư viện | Giấy phép | Bản quyền |
|---|---|---|
| Electron | MIT | Copyright (c) Electron contributors |
| express | MIT | Copyright (c) 2009-2014 TJ Holowaychuk |
| socket.io | MIT | Copyright (c) 2014-present Guillermo Rauch and Socket.IO contributors |
| msedge-tts | MIT | Copyright (c) 2023 Migushthe2nd |
| tiktok-live-connector **2.0.0** | MIT | Copyright (c) 2022 zerodytrash |
| protobufjs | BSD-3-Clause | Copyright (c) 2016, Daniel Wirtz |
| axios | MIT | Copyright (c) 2014-present Matt Zabriskie & Collaborators |
| three.js (cảnh DJ Club 3D) | MIT | Copyright © 2010-2026 three.js authors |

Lưu ý: các phiên bản `tiktok-live-connector` **mới hơn 2.0.0** và `tiktok-live-proto` dùng giấy phép **AGPL-3.0**. Không nâng cấp lên các bản đó để StudioLive giữ được giấy phép MIT.

## Tài nguyên & mã tham khảo

### Chánh Điện Online — hình ảnh, nhân vật, hiệu ứng, nhạc nền (`overlay/chua-assets/`)

Theo README của dự án: hình ảnh được tạo bằng Google Flow, nhạc nền tạo bằng Gemini. Hãy kiểm tra điều khoản của các dịch vụ đó trước khi dùng thương mại, hoặc thay bằng tài nguyên của bạn (giữ nguyên tên file).

```
MIT License

Copyright (c) 2026 Kent Juno

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Đi Chùa Online — ý tưởng tính năng và phần giọng đọc (`src/tts.js`)

```
MIT License

Copyright (c) 2026 PVLinh-workingAI

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Dịch vụ trực tuyến

- Giọng đọc (chế độ Đi Chùa): dịch vụ Read Aloud của Microsoft Edge qua `msedge-tts`, dự phòng Google Translate TTS. Đây không phải API chính thức cho mục đích này và có thể bị giới hạn.
- Đọc sự kiện TikTok: trang web công khai của TikTok, đọc ngay trên máy người dùng.

### DJ Club — ý tưởng, hình chó và DJ (`overlay/club/`, `overlay/club-assets/`)

Ý tưởng sàn nhảy "修勾夜店" và các ảnh `dj.gif`, `dog1-4.gif`, `space.jpg` lấy từ dự án [XiuGouDisco](https://github.com/mh3400425/XiuGouDisco-master), phát hành theo **Mulan Permissive Software License v2 (木兰宽松许可证 第2版)** — http://license.coscl.org.cn/MulanPSL2. Mã của cảnh DJ Club được viết lại cho StudioLive. Nguồn gốc bản quyền của các ảnh GIF / ảnh nền chưa rõ: nên thay bằng tài nguyên của bạn trước khi dùng thương mại (giữ nguyên tên file).

### DJ Club — mô hình 3D, cánh, vương miện, nền trời (`overlay/club-assets/`)

Chi tiết từng file: `overlay/club-assets/CREDITS.md`.

Ghi công bắt buộc (Creative Commons Attribution — CC-BY, xem giấy phép trên trang từng mô hình):
- "Pioneer DJ System" by Tipatat Chennavasin — https://poly.pizza/m/2cMmIwTHoc- (`models/dj-pioneer.glb`)
- "DJ gear" by Poly by Google — https://poly.pizza/m/5Zq4tgSECXz (`models/dj-gear.glb`)

Phạm vi công cộng (CC0), ghi lại để tra nguồn:
- Concert Pack (Concert Stage, Motorised Spotlight, Spot Light, Speaker) by iPoly3D — https://poly.pizza/bundle/Concert-Pack-ag2DBgUKV5
- "Angel wings" by liftarn, "Gold Angel Wings No BG" by GDJ, "wings" by Lazur, "Crown" by Glumbosch — Openclipart (https://openclipart.org)
- "Shanghai Bund" HDRI by Greg Zaal — Poly Haven (https://polyhaven.com/a/shanghai_bund)
