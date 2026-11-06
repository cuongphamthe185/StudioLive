<template>
    <section class="view scene-view" id="view-rap">
      <header class="page-head">
        <div>
          <h1>🎬 Rạp Phim Online</h1>
          <p class="muted">Đang mở tab này thì cảnh rạp chiếu phim chạy trên live. Người xem vào được chào, đi vào ghế ngồi xem phim cùng nhau.</p>
        </div>
      </header>
      <div class="feature-layout">
        <div class="preview-wrap">
          <div class="preview-frame feature-frame">
            <iframe class="live-preview" data-for="rap" title="Cảnh rạp phim trên live"></iframe>
          </div>
          <div class="preview-actions">
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              <button class="btn ghost sm" data-pause>⏸ Tạm dừng</button>
              <button class="btn ghost sm" data-open-output>📺 Mở màn hình phát live</button>
              <button class="btn primary sm" data-record-output title="Quay nội dung trong khung live đang xem">⏺ Quay video</button>
              <button class="btn ghost sm" data-reload-preview title="Tải lại khung xem nếu bị đen">↻</button>
            </div>
            <label class="switch-inline"><input type="checkbox" class="preview-safe-cb"> 📱 Vùng bị TikTok che</label>
            <label class="switch-inline"><input type="checkbox" class="preview-sound-cb"> 🔊 Nghe</label>
          </div>
          <p class="hint" style="max-width:405px">Đây chính là màn hình người xem thấy trên live. Đưa lên TikTok: tab <b>Đưa lên live</b>.</p>
        </div>
        <div class="feature-controls">
          <div class="panel">
            <div class="panel-head"><h2>Kiểu phòng chiếu</h2></div>
            <div class="theme-grid" id="rap-theme">
              <button data-theme="classic"><span class="th-sw" style="background:linear-gradient(135deg,#9b1023,#3a050c 60%,#d4a03c)"></span><b>Cổ điển</b><small>Rèm nhung đỏ</small></button>
              <button data-theme="gold"><span class="th-sw" style="background:linear-gradient(135deg,#2a2622,#0a0907 55%,#e8c06a)"></span><b>VIP Gold</b><small>Ghế ngả da, đèn chùm</small></button>
              <button data-theme="imax"><span class="th-sw" style="background:linear-gradient(135deg,#0a1020,#05070f 55%,#38bdf8)"></span><b>IMAX</b><small>Vách tiêu âm, LED xanh</small></button>
              <button data-theme="home"><span class="th-sw" style="background:linear-gradient(135deg,#c9a27a,#3a2416 60%,#f5c27a)"></span><b>Gia đình</b><small>Sofa, gỗ ấm, đèn dây</small></button>
            </div>
          </div>
          <div class="panel">
            <div class="panel-head"><h2>Phim chiếu</h2><button class="btn primary sm" id="rap-add">+ Thêm phim</button></div>
            <div class="file-row" style="margin-bottom:10px">
              <input class="inp" id="rap-link" placeholder="Dán link YouTube hoặc link video .mp4 / .webm">
              <button class="btn ghost sm" id="rap-link-add">+ Thêm link</button>
            </div>
            <ol class="movie-list" id="rap-list"></ol>
            <div class="movie-empty" id="rap-empty">Chưa có phim. Dán <b>link YouTube</b> / link video, hoặc bấm <b>+ Thêm phim</b> để chọn file trên máy (mp4, webm, mov).</div>
            <div class="movie-ctrl">
              <button class="btn ghost sm" data-rap="prev">⏮ Phim trước</button>
              <button class="btn primary sm" data-rap="play">▶ Chiếu</button>
              <button class="btn ghost sm" data-rap="pause">⏸ Dừng</button>
              <button class="btn ghost sm" data-rap="next">Phim sau ⏭</button>
            </div>
            <div class="field">
              <label>Âm lượng phim <span class="val" id="v-rapVolume"></span></label>
              <input type="range" min="0" max="1" step="0.05" data-o="rapVolume" data-num>
            </div>
            <label class="toggle"><span>Hết danh sách thì chiếu lại từ đầu</span><input type="checkbox" data-o="rapLoop"><i></i></label>
            <p class="hint warn-hint">⚠️ Chỉ chiếu phim bạn có quyền phát (phim tự quay, phim đã hết bản quyền, phim được phép chiếu). Chiếu phim có bản quyền lên TikTok rất dễ bị tắt live hoặc khoá tài khoản.</p>
          </div>
          <div class="panel">
            <div class="panel-head"><h2>Tên rạp &amp; giọng đọc</h2></div>
            <div class="field" style="margin-top:0">
              <label>Tên rạp <span class="muted small">(tiêu đề + giọng đọc)</span></label>
              <div class="file-row">
                <input class="inp" id="rap-name" maxlength="40" placeholder="Ví dụ: Rạp Phim Tâm An">
                <button class="btn primary sm" id="rap-name-save">Lưu</button>
              </div>
            </div>
            <div class="toggles" style="margin-top:8px">
              <label class="toggle"><span>Giọng đọc (chào mừng, cảm ơn quà)</span><input type="checkbox" data-o="rapVoice"><i></i></label>
              <label class="toggle"><span>Chào mừng người mới vào rạp</span><input type="checkbox" data-o="rapGreet"><i></i></label>
            </div>
            <div class="field">
              <label>Tốc độ đọc <span class="val" id="v-rapRate"></span></label>
              <input type="range" min="0.6" max="1.3" step="0.05" data-o="rapRate" data-num>
            </div>
            <div class="field">
              <label>Số tim để mưa bắp rang</label>
              <input type="number" class="inp" min="10" data-o="rapLikeGoal" data-num>
            </div>
            <div class="field">
              <label>Tự đứng dậy ra về sau khi im lặng <span class="val" id="v-rapIdleMin"></span></label>
              <input type="range" min="0" max="60" step="5" data-o="rapIdleMin" data-num>
              <p class="hint">TikTok không báo khi một người rời live, nên người im lặng lâu sẽ tự ra về để trả ghế. Rạp đầy (84 ghế) thì người vào rạp lâu nhất đứng dậy ra về, nhường ghế cho người mới. Người tặng quà (ghế VIP) không bị mời ra.</p>
            </div>
          </div>
          <div class="panel">
            <div class="panel-head"><h2>Đọc ngay</h2></div>
            <textarea class="inp" id="rap-speak" rows="2" maxlength="400" placeholder="Ví dụ: Phim sắp bắt đầu, mọi người ổn định chỗ ngồi nhé."></textarea>
            <div class="file-row" style="margin-top:8px"><button class="btn primary sm" id="rap-speak-btn">🔊 Đọc ngay</button></div>
          </div>
          <div class="panel">
            <div class="panel-head"><h2>Điều khiển</h2></div>
            <div class="test-grid">
              <button class="btn ghost lights-btn" id="rap-lights">💡 Tắt đèn phòng</button>
              <button class="btn ghost" data-rap="clap">👏 Cả rạp vỗ tay</button>
              <button class="btn ghost" data-rap="rain">🍿 Mưa bắp rang</button>
              <button class="btn ghost" data-rap="share">📣 Nhắc chia sẻ</button>
              <button class="btn ghost" data-rap="reset">↺ Đặt lại bảng điểm</button>
            </div>
          </div>
          <div class="panel">
            <div class="panel-head"><h2>Gửi thử</h2></div>
            <div class="test-grid">
              <button class="btn ghost" data-test="join">🚪 Vào rạp</button>
              <button class="btn ghost" data-test="chat">💬 Bình luận</button>
              <button class="btn ghost" data-test="clap">👏 Gõ “vỗ tay”</button>
              <button class="btn ghost" data-test="haha">😂 Gõ “haha”</button>
              <button class="btn ghost" data-test="wow">😮 Gõ “wow”</button>
              <button class="btn ghost" data-test="popcorn">🍿 Gõ “bắp”</button>
              <button class="btn ghost" data-test="gift">🎁 Quà nhỏ</button>
              <button class="btn ghost" data-test="bigGift">💎 Quà lớn</button>
              <button class="btn ghost" data-rap="testLikes">❤️ Thả 100 tim</button>
            </div>
          </div>
        </div>
      </div>
    </section>
</template>
