<template>
  <div class="vue-app-shell">

  <div class="titlebar"></div>

  <aside class="sidebar">
    <div class="brand">
      <div class="logo">
        <svg viewBox="0 0 100 100"><path d="M50 6C29 6 16 22 16 44v44l9-7 8 8 9-8 8 8 8-8 9 8 8-8 9 7V44C84 22 71 6 50 6z" fill="currentColor"/><ellipse cx="38" cy="42" rx="6" ry="9" fill="#0b0d10"/><ellipse cx="62" cy="42" rx="6" ry="9" fill="#0b0d10"/></svg>
      </div>
      <div>
        <div class="brand-name">StudioLive</div>
        <div class="brand-sub">TikTok Live Overlay</div>
      </div>
    </div>

    <nav>
      <button class="nav-item active" data-view="dashboard">
        <svg viewBox="0 0 24 24"><path d="M3 13h8V3H3zm0 8h8v-6H3zm10 0h8V11h-8zm0-18v6h8V3z"/></svg>Bảng điều khiển
      </button>
      <button class="nav-item" data-view="ma">
        <span class="nav-emoji">👻</span>Live Ma Online<span class="live-dot" data-live-for="ma">LIVE</span>
      </button>
      <button class="nav-item" data-view="chua" id="nav-chua">
        <span class="nav-emoji">🪷</span>Đi Chùa Online<span class="live-dot" data-live-for="chua">LIVE</span>
      </button>
      <button class="nav-item" data-view="rap">
        <span class="nav-emoji">🎬</span>Rạp Phim Online<span class="live-dot" data-live-for="rap">LIVE</span>
      </button>
      <button class="nav-item" data-view="quiz"><span class="nav-emoji">🚦</span>Ôn thi GPLX<span class="live-dot" data-live-for="quiz">LIVE</span></button>
      <button class="nav-item" data-view="overlay">
        <svg viewBox="0 0 24 24"><path d="M21 3H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5v2h8v-2h5a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 14H3V5h18z"/></svg>Đưa lên live
      </button>
      <button class="nav-item" data-view="settings">
        <svg viewBox="0 0 24 24"><path d="M19.14 12.94a7.1 7.1 0 0 0 0-1.88l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7 7 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.49.42l-.36 2.54a7.3 7.3 0 0 0-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.66 8.84a.5.5 0 0 0 .12.64l2.03 1.58a7.2 7.2 0 0 0 0 1.88l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.12.22.38.3.6.22l2.39-.96c.5.38 1.05.7 1.63.94l.36 2.54c.05.24.25.42.49.42h3.84c.25 0 .45-.18.5-.42l.36-2.54a7 7 0 0 0 1.63-.94l2.39.96c.22.08.48 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z"/></svg>Cài đặt
      </button>
    </nav>

    <div class="side-foot">
      <div class="srv" id="srv-box">
        <span class="dot" id="srv-dot"></span>
        <div>
          <div class="srv-title">Server overlay</div>
          <div class="srv-sub" id="srv-sub">Đang khởi động…</div>
        </div>
      </div>
      <div class="ver" id="ver"></div>
    </div>
  </aside>

  <main>
    <!-- ================= DASHBOARD ================= -->
    <section class="view active" id="view-dashboard">
      <header class="page-head">
        <div>
          <h1>Bảng điều khiển</h1>
          <p class="muted">Kết nối phòng live và theo dõi mọi tương tác theo thời gian thực.</p>
        </div>
      </header>

      <div class="warn-bar" id="warn-connect">
        <span class="warn-ico">⚠️</span>
        <div><b>Chưa kết nối TikTok</b> — người xem vào phòng, bình luận, tặng quà sẽ <b>không hiện</b> trên cảnh live. Bật LIVE trên TikTok trước, rồi nhập username bên dưới và bấm <b>Kết nối</b>.</div>
      </div>

      <div class="connect-card">
        <div class="connect-glow"></div>
        <div class="connect-left">
          <label class="lbl" for="username">Kênh TikTok đang live</label>
          <div class="connect-row">
            <div class="input-at">
              <span>@</span>
              <input id="username" placeholder="ten_kenh_cua_ban" autocomplete="off" spellcheck="false">
            </div>
            <button class="btn primary" id="btn-connect">
              <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg><span>Kết nối</span>
            </button>
          </div>
          <div class="status-line">
            <span class="status-pill" id="status-pill"><span class="dot"></span><span id="status-text">Chưa kết nối</span></span>
            <span class="muted small" id="status-msg"></span>
          </div>
        </div>
        <div class="connect-right">
          <div class="meta"><span class="muted small">Thời lượng</span><strong id="uptime">00:00:00</strong></div>
          <div class="meta"><span class="muted small">Màn hình phát đang mở</span><strong id="clients">0</strong></div>
        </div>
      </div>

      <div class="stats">
        <div class="stat" style="--c:#38bdf8"><div class="stat-ico">👁</div><div><div class="stat-val" id="s-viewers">0</div><div class="stat-lbl">Người xem</div></div></div>
        <div class="stat" style="--c:#fb7185"><div class="stat-ico">❤</div><div><div class="stat-val" id="s-likes">0</div><div class="stat-lbl">Lượt tim</div></div></div>
        <div class="stat" style="--c:#a3e635"><div class="stat-ico">💬</div><div><div class="stat-val" id="s-comments">0</div><div class="stat-lbl">Bình luận</div></div></div>
        <div class="stat" style="--c:#f472b6"><div class="stat-ico">🎁</div><div><div class="stat-val" id="s-gifts">0</div><div class="stat-lbl">Quà tặng</div></div></div>
        <div class="stat" style="--c:#facc15"><div class="stat-ico">💎</div><div><div class="stat-val" id="s-diamonds">0</div><div class="stat-lbl">Kim cương</div></div></div>
        <div class="stat" style="--c:#c084fc"><div class="stat-ico">➕</div><div><div class="stat-val" id="s-follows">0</div><div class="stat-lbl">Theo dõi mới</div></div></div>
      </div>

      <div class="grid-2">
        <div class="panel feed-panel">
          <div class="panel-head">
            <h2>Hoạt động trực tiếp</h2>
            <div class="chips" id="feed-filter">
              <button class="chip active" data-f="all">Tất cả</button>
              <button class="chip" data-f="chat">Chat</button>
              <button class="chip" data-f="gift">Quà</button>
              <button class="chip" data-f="social">Follow/Share</button>
            </div>
          </div>
          <div class="feed" id="feed">
            <div class="empty" id="feed-empty">
              <div class="empty-ghost">👻</div>
              <div>Chưa có hoạt động nào</div>
              <div class="muted small">Kết nối live hoặc bấm “Gửi thử” để xem hiệu ứng.</div>
            </div>
          </div>
        </div>

        <div class="col">
          <div class="panel quick">
            <div class="panel-head"><h2>Bắt đầu nhanh</h2></div>
            <ol class="qs">
              <li class="qs-scene-step" data-qs="scene"><span class="qs-n">1</span><div><b>Chọn cảnh</b><small id="qs-scene"></small></div><div class="qs-scene-links"><button class="btn ghost sm" data-goto="ma">👻 Ma</button><button class="btn ghost sm" data-goto="chua">🪷 Chùa</button><button class="btn ghost sm" data-goto="rap">🎬 Rạp</button><button class="btn ghost sm" data-goto="quiz">🚦 GPLX</button></div></li>
              <li data-qs="link"><span class="qs-n">2</span><div><b>Thêm vào TikTok LIVE Studio</b><small>Nguồn <b>Link</b>: <code id="qs-link">http://lvh.me:3000</code> · 1080×1920</small></div><button class="btn ghost sm" id="qs-copy">Sao chép</button></li>
              <li data-qs="golive"><span class="qs-n">3</span><div><b>Bấm Go LIVE trên TikTok</b><small>Bật live trước khi kết nối ở bước 4</small></div></li>
              <li data-qs="connect"><span class="qs-n">4</span><div><b>Kết nối username</b><small>Nhập @username ở trên và bấm Kết nối</small></div></li>
            </ol>
            <p class="hint">Chưa live vẫn thử được: vào tab cảnh và bấm các nút <b>Gửi thử</b>.</p>
          </div>
          <div class="panel">
            <div class="panel-head"><h2>Top tặng quà</h2></div>
            <ol class="leader" id="leader"><li class="muted small leader-empty">Chưa có ai tặng quà</li></ol>
          </div>
        </div>
      </div>
    </section>

    <!-- ================= OVERLAY ================= -->
    <section class="view" id="view-overlay">
      <header class="page-head">
        <div>
          <h1>Đưa lên live</h1>
          <p class="muted">Cách để người xem TikTok nhìn thấy cảnh đang chạy (Live Ma Online, Đi Chùa Online hoặc Rạp Phim Online).</p>
        </div>
        <div class="head-actions">
          <button class="btn ghost" id="btn-reload-overlay">↻ Tải lại cảnh</button>
          <button class="btn pause-btn" data-pause>⏸ Tạm dừng</button>
        </div>
      </header>
      <div class="scene-row">
        <button class="btn scene-btn ma" data-open-scene="ma"><span class="sb-ico">👻</span><span><b>Phát Live Ma Online</b><small>Chuyển live sang Nhà Ma + mở màn hình phát</small></span></button>
        <button class="btn scene-btn chua" data-open-scene="chua"><span class="sb-ico">🪷</span><span><b>Phát Đi Chùa Online</b><small>Chuyển live sang chánh điện + mở màn hình phát</small></span></button>
        <button class="btn scene-btn rap" data-open-scene="rap"><span class="sb-ico">🎬</span><span><b>Phát Rạp Phim Online</b><small>Chuyển live sang rạp phim + mở màn hình phát</small></span></button>
        <button class="btn scene-btn" data-open-scene="quiz"><span class="sb-ico">🚦</span><span><b>Phát Ôn thi GPLX</b><small>Chuyển live sang câu hỏi trắc nghiệm + mở màn hình phát</small></span></button>
      </div>

      <div class="live-guide">
        <div class="col">
          <div class="panel">
            <div class="panel-head"><h2>Đường dẫn overlay</h2></div>
            <div class="url-label">TikTok LIVE Studio — nguồn <b>Link</b> (khuyên dùng)</div>
            <div class="url-box">
              <code id="overlay-url-studio">http://lvh.me:3000</code>
              <button class="btn primary sm" id="btn-copy-studio">Sao chép</button>
            </div>
            <div class="url-label">OBS — nguồn <b>Browser</b></div>
            <div class="url-box">
              <code id="overlay-url">http://localhost:3000</code>
              <button class="btn ghost sm" id="btn-copy-url">Sao chép</button>
            </div>
            <div class="obs-meta">
              <div><span class="muted small">Chiều rộng</span><strong>1080</strong></div>
              <div><span class="muted small">Chiều cao</span><strong>1920</strong></div>
              <div><span class="muted small">Tỉ lệ</span><strong>9:16</strong></div>
            </div>
          </div>

          <div class="panel">
            <div class="panel-head">
              <h2>Cách đưa lên live TikTok</h2>
              <div class="chips" id="guide-tabs">
                <button class="chip active" data-g="studio">TikTok LIVE Studio</button>
                <button class="chip" data-g="obs">OBS</button>
                <button class="chip" data-g="phone">Chỉ có điện thoại</button>
              </div>
            </div>
            <div class="guide" data-guide="studio">
              <p class="hint" style="margin:0 0 10px">Live bằng máy tính với phần mềm <b>TikTok LIVE Studio</b> (tài khoản cần được TikTok cho dùng LIVE Studio).</p>
              <div class="sub-lbl" style="margin-top:4px">Cách 1 — nguồn Link (khuyên dùng, nhẹ máy, có sẵn âm thanh)</div>
              <ol class="steps">
                <li>Trong LIVE Studio chọn khung <b>dọc</b>, thêm nguồn <b>Link</b>.</li>
                <li>Dán link <b>http://lvh.me:3000</b> (nút <b>Sao chép</b> ở trên), đặt kích thước <b>1080 × 1920</b>, kéo phủ kín khung.</li>
                <li>Bấm <b>Go LIVE</b>, rồi ở <b>Bảng điều khiển</b> nhập username và bấm <b>Kết nối</b>.</li>
              </ol>
              <p class="hint">Phải dùng <b>lvh.me</b> vì LIVE Studio không nhận “localhost”. lvh.me trỏ về chính máy bạn, cần có mạng để tra tên miền. Không cần mở cửa sổ phát live.</p>
              <div class="sub-lbl">Để hình trên TikTok không vỡ, không nhạt màu</div>
              <ul class="steps" style="list-style:disc">
                <li>LIVE Studio → Cài đặt → Video: <b>1080p</b>, <b>30 FPS</b>, <b>bitrate cao nhất</b> (6000–8000 kbps).</li>
                <li>Nguồn Link đúng <b>1080 × 1920</b>, phủ vừa khít khung — <b>không kéo phóng to</b>.</li>
                <li>Màu nhạt? Tăng <b>Cài đặt → Độ tươi màu khi live</b> (10–20%).</li>
              </ul>
              <div class="sub-lbl">Cách 2 — chụp cửa sổ (dự phòng)</div>
              <ol class="steps">
                <li>Bấm nút <b>Phát …</b> của cảnh muốn live ở trên. Một cửa sổ dọc chỉ có cảnh đó hiện ra. <b>Đừng thu nhỏ</b> cửa sổ này (có thể để phía sau cửa sổ khác).</li>
                <li>Mở <b>TikTok LIVE Studio</b>, chọn khung <b>dọc</b> (Portrait).</li>
                <li>Thêm nguồn → <b>Chụp cửa sổ</b> (Window capture) → chọn cửa sổ <b>“StudioLive - Man hinh phat live”</b>. Kéo cho phủ kín khung hình.</li>
                <li>Muốn mặt bạn hiện lên: thêm nguồn <b>Camera</b>, đặt nhỏ ở một góc.</li>
                <li>Để người xem nghe âm thanh: bật nguồn <b>âm thanh máy tính</b> (Speaker / Desktop audio) trong LIVE Studio.</li>
                <li>Bấm <b>Go LIVE</b>, rồi quay lại tab <b>Bảng điều khiển</b>, nhập username của bạn và bấm <b>Kết nối</b>.</li>
              </ol>
            </div>
            <div class="guide" data-guide="obs" hidden>
              <ol class="steps">
                <li>Trong OBS: <b>Sources → + → Browser</b>, dán đường dẫn ở trên, đặt 1080 × 1920, tích <b>Control audio via OBS</b>.</li>
                <li>Phát lên TikTok bằng <b>Stream Key</b> (nếu tài khoản có), <b>hoặc</b> bấm <b>Start Virtual Camera</b> trong OBS rồi chọn camera <b>“OBS Virtual Camera”</b> trong TikTok LIVE Studio.</li>
                <li>Bấm <b>Kết nối</b> ở Bảng điều khiển với username của bạn.</li>
              </ol>
            </div>
            <div class="guide" data-guide="phone" hidden>
              <p class="steps-p">App TikTok trên điện thoại <b>không cho chèn màn hình khác</b> vào buổi live, nên người xem sẽ không thấy cảnh nhà ma / chánh điện nếu bạn chỉ live bằng điện thoại.</p>
              <p class="steps-p">Cách làm: cài <b>TikTok LIVE Studio</b> trên máy tính này và live từ máy tính (xem tab đầu). Điện thoại có thể dùng làm camera cho LIVE Studio.</p>
              <p class="steps-p muted">Nếu bạn vẫn live bằng điện thoại, StudioLive vẫn đọc được bình luận để chơi, nhưng chỉ bạn nhìn thấy màn hình trên máy tính.</p>
            </div>
          </div>

          
        </div>
      </div>
    </section>

    <LicenseQuizView />

    <!-- ================= LIVE MA ONLINE ================= -->
    <LiveMaView />

    <!-- ================= ĐI CHÙA ================= -->
    <TempleView />

    <!-- ================= RẠP PHIM ONLINE ================= -->
    <CinemaView />

    <!-- ================= SETTINGS ================= -->
    <section class="view" id="view-settings">
      <header class="page-head">
        <div>
          <h1>Cài đặt</h1>
          <p class="muted">Cài đặt dùng chung cho mọi cảnh. Lưu tự động.</p>
        </div>
      </header>

      <div class="settings-grid">
        <div class="panel">
          <div class="panel-head"><h2>Hình ảnh khi live</h2></div>
          <div class="field" style="margin-top:0">
            <label>Độ tươi màu khi live <span class="val" id="v-liveBoost"></span></label>
            <input type="range" min="0" max="40" step="5" data-o="liveBoost" data-num>
            <p class="hint">TikTok nén video làm màu nhạt và tối đi. Tăng mức này để bù lại; 10–20% là vừa. Đặt 0% nếu thấy màu bị gắt.</p>
          </div>
          <p class="hint">Mọi chữ, bảng điểm, nhân vật đã được đặt trong <b>vùng an toàn</b>: chừa phần trên (thanh TikTok), phần dưới (bình luận) và hai mép (bị cắt trên điện thoại dài). Bật ô <b>📱 Vùng bị TikTok che</b> dưới khung xem cảnh để kiểm tra.</p>
        </div>

        <div class="panel">
          <div class="panel-head"><h2>Âm thanh chung</h2></div>
          <div class="toggles">
            <label class="toggle"><span>Bật âm thanh hiệu ứng</span><input type="checkbox" data-o="sound"><i></i></label>
          </div>
<div class="field">
            <label>Âm lượng <span class="val" id="v-volume"></span></label>
            <input type="range" min="0" max="1" step="0.05" data-o="volume" data-num>
          </div>
<div class="field">
            <label>Ẩn bình luận chứa từ (ngăn cách bằng dấu phẩy)</label>
            <input type="text" class="inp" data-o="filterWords" placeholder="vd: link, spam, quảng cáo">
          </div>
        </div>

        <div class="panel">
          <div class="panel-head"><h2>Kết nối TikTok</h2></div>
          <label class="toggle"><span>Tự động kết nối lại khi rớt mạng</span><input type="checkbox" id="autoReconnect"><i></i></label>
          <div class="field">
            <label>Tài khoản TikTok <span class="muted small">(không bắt buộc)</span></label>
            <p class="hint" style="margin:0 0 8px">App tự mở trang live TikTok trong trình duyệt ẩn và đọc bình luận/quà ngay trên máy. Dữ liệu chỉ đi giữa máy bạn và TikTok.</p>
            <div class="file-row" id="login-row">
              <button class="btn ghost sm" id="btn-tt-login">Đăng nhập TikTok</button>
              <button class="btn ghost sm" id="btn-tt-logout">Đăng xuất</button>
              <span class="muted small">Không bắt buộc — chỉ cần khi TikTok đòi xác minh.</span>
            </div>
          </div>
          <details class="adv">
            <summary>Nâng cao</summary>
            
            <div class="field">
            <label>Cổng server overlay</label>
            <div class="file-row">
              <input type="number" class="inp" id="port" min="1024" max="65535" style="max-width:140px">
              <button class="btn ghost sm" id="btn-apply-port">Áp dụng</button>
            </div>
          </div>
            
          </details>
        </div>
      </div>
    </section>
  </main>

  <div class="toast-host" id="toast-host"></div>

  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import LiveMaView from './components/LiveMaView.vue';
import TempleView from './components/TempleView.vue';
import CinemaView from './components/CinemaView.vue';
import LicenseQuizView from './components/LicenseQuizView.vue';

onMounted(() => {
  import('./app.js');
});
</script>
