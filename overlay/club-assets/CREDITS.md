# Nguồn và giấy phép tài nguyên DJ Club

Tải ngày 06/11/2026. **CC0** = phạm vi công cộng, không bắt buộc ghi công (vẫn ghi lại để tra nguồn).
**CC-BY** = phải ghi tên tác giả khi dùng — giữ nguyên các dòng ghi công dưới đây (cũng có trong `docs/THIRD_PARTY_NOTICES.md`).

| File | Tên gốc | Tác giả | Giấy phép | Nguồn |
|---|---|---|---|---|
| `models/dj-pioneer.glb` | Pioneer DJ System | Tipatat Chennavasin | CC-BY | https://poly.pizza/m/2cMmIwTHoc- |
| `models/dj-gear.glb` | DJ gear | Poly by Google | CC-BY | https://poly.pizza/m/5Zq4tgSECXz |
| `models/concert-stage.glb` | Concert Stage (Concert Pack) | iPoly3D | CC0 | https://poly.pizza/m/CZHsATnid7 |
| `models/moving-head.glb` | Motorised Spotlight (Concert Pack) | iPoly3D | CC0 | https://poly.pizza/m/BLq0yBWHce |
| `models/spot-light.glb` | Spot Light (Concert Pack) | iPoly3D | CC0 | https://poly.pizza/m/eaQqgLn0oJ |
| `models/speaker.glb` | Speaker (Concert Pack) | iPoly3D | CC0 | https://poly.pizza/m/zOQOThSpuo |
| `wings/angel-wings-shape.svg` | Angel wings | liftarn | CC0 (Openclipart) | https://openclipart.org/detail/232340 |
| `wings/gold-angel-wings.png` | Gold Angel Wings No BG | GDJ | CC0 (Openclipart) | https://openclipart.org/detail/306685 |
| `wings/feather-wings.svg` | wings | Lazur | CC0 (Openclipart) | https://openclipart.org/detail/220701 |
| `decor/crown.svg` | Crown | Glumbosch | CC0 (Openclipart) | https://openclipart.org/detail/326866 |
| `sky/night-city-4k.jpg`, `sky/night-city-2k.jpg` | Shanghai Bund (tonemapped JPG, thu nhỏ từ 8192×4096) | Greg Zaal / Poly Haven | CC0 | https://polyhaven.com/a/shanghai_bund |
| `characters/dog*.gif`, `stage/dj.gif`, `screen/space.jpg` | XiuGouDisco (修勾夜店) | mh3400425 | Mulan PSL v2 (mã nguồn); nguồn gốc ảnh chưa rõ | https://github.com/mh3400425/XiuGouDisco-master |

## Ghi chú kỹ thuật (đo từ file)

| File | Kích thước gốc (đơn vị trong file) | Tam giác | Ghi chú |
|---|---|---|---|
| `dj-pioneer.glb` | 1,72 × 0,34 × 1,0 | 3.824 | Đúng tỉ lệ mét, đặt lên mặt bàn DJ |
| `dj-gear.glb` | 5,4 × 1,9 × 16,5 | 1.564 | Nằm dọc trục Z, cần xoay 90° và thu nhỏ; có 1 ảnh texture |
| `concert-stage.glb` | 33,3 × 15,3 × 20,9 | 14.748 | Có giàn truss + vật liệu "Glow"; thu nhỏ ~0,4 lần cho sân khấu 12 m |
| `moving-head.glb` | 0,4 × 0,64 × 0,4 | 1.070 | Có vật liệu "Glow" |
| `spot-light.glb` | 0,67 × 1,18 × 0,63 | 1.114 | Gốc ở trên, treo xuống — gắn thẳng vào truss |
| `speaker.glb` | 0,55 × 0,72 × 0,39 | 794 | Phóng to ~3 lần làm cụm loa sân khấu |
| `gold-angel-wings.png` | 698 × 778 px, có kênh alpha | — | Cặp cánh (hai bên), không phải một bên |
| `angel-wings-shape.svg` | vector, 1 hình bóng đen | — | Cặp cánh; code tô màu theo hạng |
| `feather-wings.svg` | vector 1200 × 1200 | — | Cặp cánh lông vũ, kiểm tra nền khi dùng |
| `night-city-4k.jpg` / `-2k.jpg` | 4096 × 2048 / 2048 × 1024 (ảnh toàn cảnh 360°) | — | Bản 4K cho chất lượng cao, 2K cho chất lượng thấp; bản gốc 8K không giữ trong app (tải lại ở Poly Haven nếu cần) |

Tất cả đã kiểm tra: GLB hợp lệ, không trỏ tới file ngoài, không cần phần mở rộng nén (Draco); SVG không chứa script, sự kiện hay liên kết ngoài.
