# Tài nguyên cảnh DJ Club (3D)

Thả file vào đúng thư mục rồi khai báo trong `manifest.json`. Thiếu file nào thì cảnh dùng khối / hình vẽ bằng code, nên lúc nào cũng chạy được.
Sửa xong bấm ↻ (tải lại khung xem) trong tab DJ Club.

| Thư mục | Dùng cho | Định dạng | Yêu cầu |
|---|---|---|---|
| `characters/` | Nhân vật người xem (meme) | **WebP động** (nên dùng), GIF, PNG | Nền trong suốt, cao từ 400px, chân sát mép dưới, quay mặt sang phải |
| `wings/` | Cánh Top 1–4 | PNG / WebP trong suốt | **Một cặp cánh** (hai bên) cân giữa ảnh; code tách đôi để vỗ cánh. Một ảnh dùng chung (`pair`, code tự đổi màu tím / vàng / bạc / đồng) hoặc ảnh riêng từng hạng |
| `decor/` | Vương miện / trang trí trên đầu Top 1 | SVG / PNG trong suốt | |
| `stage/` | Nhân vật DJ mặc định khi chưa ai có điểm (không bắt buộc; để trống thì màn LED hiện trái tim mời lên DJ) | WebP / GIF động **nền trong suốt** | |
| `screen/` | Ảnh mặc định cho màn hình LED | JPG / PNG / WebP | Tự co cho vừa; ảnh ngang đẹp nhất |
| `models/` | Mô hình 3D: sân khấu + truss, bộ CDJ, đèn, loa | GLB | Dưới ~5 MB, dưới ~50.000 tam giác, mặt trước quay về +Z, gốc ở giữa đáy |
| `sky/` | Nền thành phố đêm | Ảnh toàn cảnh 360° JPG (tỉ lệ 2:1) | Bản 4K cho chất lượng cao, 2K cho chất lượng thấp |

Nguồn và giấy phép từng file: [CREDITS.md](CREDITS.md). File CC-BY phải giữ dòng ghi công.
Ảnh do người dùng chọn trong tab quản trị (màn LED, nhạc) không cần để ở đây.

## manifest.json

```json
{
  "characters": [{ "file": "characters/meme1.webp", "height": 1, "faces": "right", "feet": 0 }],
  "dj": { "file": "", "width": 330 },
  "wings": { "pair": "wings/gold-angel-wings.png", "top1": "", "gold": "", "silver": "", "bronze": "" },
  "crown": "decor/crown.svg",
  "screen": ["screen/anh1.jpg"],
  "sky": { "file": "sky/night-city-4k.jpg", "low": "sky/night-city-2k.jpg", "crop": [0.36, 0.12, 0.82, 0.52], "brightness": 0.75, "height": 6000, "y": 500 },
  "models": {
    "stage": { "file": "models/concert-stage.glb", "scale": 40 },
    "djController": { "file": "models/dj-pioneer.glb", "scale": 100, "y": 19.7 },
    "movingHead": { "file": "models/moving-head.glb", "scale": 110 },
    "spotLight": { "file": "models/spot-light.glb", "scale": 90 },
    "speaker": { "file": "models/speaker.glb", "scale": 300 }
  }
}
```

- Đơn vị trong cảnh là **cm**. `scale` = số cm cho 1 đơn vị của file GLB (mô hình đo bằng mét thì `scale: 100`).
- `y`, `z`: dịch mô hình lên / ra trước (cm) nếu gốc toạ độ của file không ở giữa đáy. `rotateY`: xoay (radian) nếu mặt trước không quay về +Z.
- Để trống `file` (`""`) hoặc `null` ở một mô hình thì cảnh dùng khối thay thế / bỏ qua món đó.
- `characters.height`: hệ số độ cao nhân vật (1 = 120 cm). `faces`: hướng mặt của ảnh gốc (`right` / `left`).
- `characters.feet`: phần trống dưới chân so với chiều cao ảnh (0–0,4). Ví dụ ảnh 240px có 17px trống ở dưới thì `feet: 0.07`, để chân chạm sàn.
- `wings`: có ảnh riêng cho hạng nào (`top1`, `gold`, `silver`, `bronze`) thì dùng ảnh đó, không thì dùng `pair` và tự đổi màu.
- `sky.crop`: vùng cắt trên ảnh toàn cảnh `[trái, trên, phải, dưới]` (0–1) để lấy dải cao ốc làm phông sau sân khấu.
- Đường dẫn chỉ được nằm trong thư mục `club-assets/`.

## Vì sao WebP động tốt hơn GIF
GIF chỉ có trong suốt "có hoặc không" nên trên nền neon tối hay bị viền răng cưa / viền trắng, chỉ 256 màu và file nặng.
Đổi GIF sang WebP động bằng ezgif.com hoặc ffmpeg. Camera áp sát khi có quà nên ảnh gốc nên to khoảng gấp đôi cỡ hiển thị.
