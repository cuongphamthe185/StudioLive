# StudioLive — Hướng dẫn cài đặt & sử dụng

StudioLive tạo cảnh tương tác cho TikTok LIVE, chạy hoàn toàn trên máy tính của bạn:

- **👻 Live Ma Online** — người xem hoá ma, gõ “hù / trốn / tìm…” để chơi với nhau.
- **🪷 Đi Chùa Online** — chánh điện, người xem gõ “adidaphat” để lên thắp hương, quà làm sen vàng nở, có giọng đọc cảm ơn.
- **🎬 Rạp Phim Online** — phòng chiếu phim: người xem vào được chào mừng, đi vào ghế ngồi xem phim cùng nhau; gõ “vỗ tay / haha / wow / bắp” để phản ứng; quà làm ghế thành ghế VIP vàng; đủ tim thì mưa bắp rang. Phim chiếu: dán **link YouTube** hoặc link trực tiếp tới file video (.mp4, .webm), hoặc chọn file trên máy (tab Rạp Phim Online → **+ Thêm phim**). Một số video YouTube bị chủ kênh tắt chế độ phát nhúng sẽ không chạy — app tự chuyển sang phim kế tiếp. Có 4 kiểu phòng: Cổ điển, VIP Gold, IMAX, Gia đình.
- **🚦 Ôn thi GPLX** — live trắc nghiệm luật giao thông: chọn hạng bằng lái, app rút ngẫu nhiên câu hỏi từ ngân hàng 600 câu có sẵn (kèm ảnh biển báo, sa hình), người xem bình luận **A / B / C / D** để trả lời, hết giờ hiện đáp án và số người chọn đúng. Xem mục 6.

## 1. Cần có

- Máy tính **macOS 12 trở lên** (chip Apple hoặc Intel) hoặc **Windows 10/11 64-bit**.
- **TikTok LIVE Studio** đã đăng nhập tài khoản được TikTok cho phép live trên máy tính.
- Internet.

## 2. Chọn đúng file tải về

| Máy | File |
|---|---|
| Mac chip Apple (M1, M2, M3, M4…) | `StudioLive-1.0.0-mac-arm64.dmg` |
| Mac chip Intel | `StudioLive-1.0.0-mac-x64.dmg` |
| Windows 64-bit | `StudioLive-Setup-1.0.0-win-x64.exe` |

Không biết Mac của mình chip gì: bấm  (góc trái trên) → **Giới thiệu về máy Mac**. Dòng “Chip: Apple M…” là chip Apple, dòng “Bộ xử lý: Intel…” là chip Intel.

## 3. Cài trên Mac

1. Mở file `.dmg`, **kéo biểu tượng StudioLive vào thư mục Applications**.
2. Mở **Applications**, **bấm chuột phải (hoặc Control + bấm) vào StudioLive → Mở → Mở**.
   App chưa được ký bằng chứng chỉ Apple nên lần đầu macOS sẽ hỏi lại. Chỉ cần làm một lần.
3. Nếu vẫn bị chặn: vào **Cài đặt hệ thống → Quyền riêng tư & Bảo mật**, kéo xuống, bấm **Vẫn mở (Open Anyway)** cạnh dòng StudioLive, nhập mật khẩu máy.
4. Nếu báo **“StudioLive bị hỏng và không thể mở”**: mở ứng dụng **Terminal**, dán lệnh sau rồi Enter, sau đó mở lại app:

   ```
   xattr -cr /Applications/StudioLive.app
   ```

## 4. Cài trên Windows

1. Chạy `StudioLive-Setup-1.0.0-win-x64.exe`.
2. Chọn thư mục cài (để mặc định cũng được) → **Install / Cài đặt**.
3. Mở **StudioLive** từ biểu tượng ngoài Desktop hoặc menu Start.

Khi chạy bộ cài, Windows có thể hiện **“Windows đã bảo vệ PC của bạn”** (SmartScreen) vì app chưa được ký số:
bấm **Thông tin thêm (More info) → Vẫn chạy (Run anyway)**.

## 5. Lên live lần đầu (4 bước)

Trong app, mục **Bảng điều khiển → Bắt đầu nhanh** có đánh dấu ✓ từng bước:

1. **Chọn cảnh**: bấm tab **👻 Live Ma Online**, **🪷 Đi Chùa Online**, **🎬 Rạp Phim Online** hoặc **🚦 Ôn thi GPLX** ở menu trái. Mở tab nào thì cảnh đó chạy trên live.
2. **Thêm vào TikTok LIVE Studio**: chọn khung **dọc**, thêm nguồn **Link**, dán `http://lvh.me:3000`, đặt kích thước **1080 × 1920**, kéo phủ kín khung.
   (LIVE Studio không nhận chữ “localhost”; `lvh.me` luôn trỏ về chính máy bạn.)
3. **Bấm Go LIVE** trên TikTok LIVE Studio.
4. **Kết nối**: ở Bảng điều khiển nhập username TikTok của bạn (không cần @) và bấm **Kết nối**.
   Khi chưa kết nối, app hiện dòng cảnh báo đỏ — người xem sẽ không hiện trên cảnh.

Chưa live vẫn thử được: vào tab cảnh và bấm các nút **Gửi thử**.

**Cách khác (dự phòng):** tab **Đưa lên live** → bấm nút **Phát …** của cảnh muốn dùng (Ma, Chùa, Rạp Phim, Ôn thi GPLX) để mở cửa sổ phát, rồi trong LIVE Studio thêm nguồn **Chụp cửa sổ** và chọn cửa sổ “StudioLive - Man hinh phat live”. Không thu nhỏ cửa sổ này.

## 6. Live Ôn thi GPLX

Mở tab **🚦 Ôn thi GPLX** ở menu trái. Tab có 2 phần: **🚦 Phát đề** và **🗂️ Quản lý đề thi**.

**Phát đề**

1. Chọn **Hạng GPLX** (A1, A, B1, B, C…). Dòng gợi ý bên dưới cho biết sẽ rút bao nhiêu câu ngẫu nhiên từ bao nhiêu câu của hạng đó.
2. Đặt **Giây mỗi câu** (5–120 giây), **Giọng đọc** (Nữ / Nam / Nam nữ xen kẽ) và **Tốc độ đọc**.
3. Bật/tắt tuỳ ý: đọc câu hỏi và nhắc chọn A/B/C/D, đọc đáp án đúng khi hết giờ, tiếng tích đếm giây, lặp lại bộ đề khi hết câu. Mục **🎨 Tuỳ chỉnh màu giao diện live** để đổi màu khung câu hỏi.
4. Bấm **▶ Phát live**. Mỗi câu hiện trên live cùng đồng hồ đếm ngược; hết giờ app tự hiện đáp án, số lượt chọn đúng, rồi chuyển câu tiếp.
5. Điều khiển tay khi cần: **← Câu trước**, **Hiện đáp án**, **Câu tiếp →**, **↺ Về câu đầu**, **⏸ Tạm dừng**.

Người xem trả lời bằng cách bình luận **một chữ cái A, B, C hoặc D** (không phân biệt hoa thường, ví dụ `a`, `B`, `c nha`). Mỗi người chỉ tính **lần chọn cuối cùng** của câu đó; bình luận sau khi đã hiện đáp án không được tính.

**Quản lý đề thi**

- Ngân hàng **600 câu** (kèm ảnh) được nạp sẵn ở lần mở đầu tiên.
- Tạo/sửa/xoá **hạng** (mã hạng, tên hiển thị, số câu mỗi phiên) và gán câu hỏi cho từng hạng.
- Thêm/sửa câu hỏi: nội dung, 2–4 đáp án, đáp án đúng, hạng áp dụng, **ảnh minh hoạ** (PNG, JPG, WebP, GIF, tối đa 5 MB).
- Toàn bộ đề lưu trong file `quiz.sqlite` ở thư mục dữ liệu của app (cùng chỗ với `settings.json`, xem mục 10). Sao lưu file này nếu muốn giữ bộ đề khi cài lại máy.

## 7. Hình đẹp khi lên TikTok (không vỡ, không nhạt màu)

TikTok nén video rất mạnh: cảnh tối và nhiều mảng chuyển màu dễ bị nhạt, bệt màu, vỡ khối. Cài như sau:

**TikTok LIVE Studio**
- Cài đặt → **Video**: độ phân giải **1080p**, khung hình **30 FPS**, **bitrate cao nhất** cho phép (thường 6000–8000 kbps). Mạng tải lên nên từ 10 Mbps trở lên.
- Nguồn **Link** đặt đúng **1080 × 1920** và phủ vừa khít khung dọc. Không kéo phóng to nguồn (sẽ bị cắt mất chữ ở mép).

**OBS** (nếu dùng)
- Settings → **Video**: Base và Output đều **1080x1920**, **30 FPS**.
- Settings → **Output**: bitrate **6000 kbps**, Rate control **CBR**, Keyframe **2**.
- Settings → **Advanced**: Color Format **NV12**, Color Space **Rec. 709**, Color Range **Limited (Partial)**. Để **Full** sẽ làm màu trên TikTok bị bạc hoặc tối sầm.

**Trong StudioLive**
- Cài đặt → **Hình ảnh khi live** → **Độ tươi màu khi live**: tăng 10–20% để bù phần TikTok làm nhạt màu (mặc định 15%).
- Chữ, bảng điểm, nhân vật đã nằm trong **vùng an toàn**: tránh thanh trên của TikTok, vùng bình luận phía dưới và hai mép bị cắt trên điện thoại dài. Bật ô **📱 Vùng bị TikTok che** dưới khung xem cảnh để tự kiểm tra.

## 8. Mẹo khi live

- **⏸ Tạm dừng** (tab Đưa lên live): đứng hình cảnh, tắt tiếng, máy nhẹ hơn.
- **Âm thanh trùng 2 lần**: tắt ô “🔊 Nghe” trong app khi đang live (LIVE Studio đã phát tiếng của cảnh).
- **Máy yếu**: chỉ mở một nơi hiển thị cảnh (nguồn Link trong LIVE Studio), đóng cửa sổ phát nếu không dùng. Chỉ cảnh đang chọn mới chạy hiệu ứng; các cảnh khác tự dừng nên không tốn máy.
- **Đi Chùa**: đặt **Tên kênh** trong tab Đi Chùa Online để tiêu đề và giọng đọc xưng đúng tên bạn.

## 9. Gặp lỗi

| Hiện tượng | Cách xử lý |
|---|---|
| “Kênh này hiện không phát live” | Bấm Go LIVE trên TikTok trước rồi mới Kết nối. |
| “TikTok yêu cầu xác minh” | Cài đặt → Kết nối TikTok → **Đăng nhập TikTok**, đăng nhập một lần rồi Kết nối lại. |
| “Cổng 3000 đang bị ứng dụng khác dùng” | Cài đặt → Kết nối TikTok → Nâng cao → đổi cổng (ví dụ 3100), rồi sửa link trong LIVE Studio thành `http://lvh.me:3100`. |
| Cảnh trong LIVE Studio trắng/đen | Kiểm tra app StudioLive đang mở; trong LIVE Studio bấm làm mới nguồn Link. |
| Người xem vào nhưng không hiện | Kiểm tra trạng thái “ĐANG LIVE” ở Bảng điều khiển; nếu chưa, bấm Kết nối. |
| GPLX: người xem bình luận nhưng không tính | Bình luận phải **bắt đầu bằng** A/B/C/D (ví dụ `B` hoặc `b nha`, không phải `chọn B`); câu chỉ có 3 đáp án thì `D` không tính; sau khi hiện đáp án không nhận thêm. |
| GPLX: ảnh câu hỏi không hiện | Bấm nút ↻ tải lại khung xem; nếu vẫn lỗi, mở lại app. |

## 10. Lưu ý

- StudioLive đọc sự kiện công khai của phòng live qua trang web TikTok. Không cần và không lưu mật khẩu TikTok (trừ khi bạn tự đăng nhập ở mục Đăng nhập TikTok — phiên đăng nhập chỉ lưu trên máy bạn).
- Ngân hàng câu hỏi GPLX và cài đặt lưu ngay trên máy: `~/Library/Application Support/StudioLive/` (macOS), `%APPDATA%\StudioLive\` (Windows).
- Giọng đọc (Đi Chùa, Rạp Phim, Ôn thi GPLX) dùng dịch vụ đọc trực tuyến của Microsoft Edge (dự phòng Google Translate), nên câu cần đọc được gửi tới dịch vụ đó.
- TikTok có thể thay đổi hệ thống bất cứ lúc nào khiến việc đọc sự kiện ngừng hoạt động cho tới khi có bản cập nhật.
- **Rạp Phim**: chỉ chiếu phim bạn có quyền phát (phim tự quay, phim đã hết bản quyền, phim được phép chiếu). Chiếu phim có bản quyền lên TikTok rất dễ bị tắt live hoặc khoá tài khoản.
- Bạn tự chịu trách nhiệm tuân thủ điều khoản của TikTok và pháp luật nơi bạn sinh sống khi live và nhận quà.
