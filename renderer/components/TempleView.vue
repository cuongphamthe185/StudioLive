<template>
    <section class="view scene-view" id="view-chua">
      <header class="page-head">
        <div>
          <h1>🪷 Đi Chùa Online</h1>
          <p class="muted">Đang mở tab này thì cảnh chánh điện chạy trên live. Người xem gõ “adidaphat” để lên thắp hương, quà làm sen vàng nở.</p>
        </div>
      </header>
      <div class="feature-layout">
        <div class="preview-wrap">
          <div class="preview-frame feature-frame">
            <iframe class="live-preview" data-for="chua" title="Cảnh chánh điện trên live"></iframe>
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
          <div class="panel-head"><h2>Tên kênh &amp; giọng đọc</h2></div>
          <div class="field" style="margin-top:0">
            <label>Tên kênh <span class="muted small">(tiêu đề trên màn hình + giọng đọc tự xưng)</span></label>
            <div class="file-row">
              <input class="inp" id="chua-name" maxlength="40" placeholder="Ví dụ: Tâm An Nhiên">
              <button class="btn primary sm" id="chua-name-save">Lưu</button>
            </div>
          </div>
          <div class="toggles" style="margin-top:8px">
            <label class="toggle"><span>Giọng đọc (cảm ơn quà, chúc theo điều cầu)</span><input type="checkbox" data-o="chuaVoice"><i></i></label>
            <label class="toggle"><span>Chào người mới vào phòng</span><input type="checkbox" data-o="chuaGreet"><i></i></label>
            <label class="toggle"><span>Nhạc nền thiền</span><input type="checkbox" data-o="chuaMusic"><i></i></label>
          </div>
          <div class="field">
            <label>Âm lượng nhạc nền <span class="val" id="v-chuaMusicVolume"></span></label>
            <input type="range" min="0" max="1" step="0.05" data-o="chuaMusicVolume" data-num>
          </div>
          <div class="field">
            <label>Tốc độ đọc <span class="val" id="v-chuaRate"></span></label>
            <input type="range" min="0.6" max="1.3" step="0.05" data-o="chuaRate" data-num>
          </div>
          <div class="field">
            <label>Số tim để mưa hoa sen</label>
            <input type="number" class="inp" min="10" data-o="chuaLikeGoal" data-num>
          </div>
          <p class="hint">Giọng đọc dùng dịch vụ đọc trực tuyến của Microsoft Edge (lỗi thì chuyển Google Translate, mất mạng thì dùng giọng tiếng Việt có sẵn trên máy nếu có), nên câu cần đọc được gửi tới dịch vụ đó.</p>
        </div>

        <div class="col">
          <div class="panel">
            <div class="panel-head"><h2>Đọc ngay</h2></div>
            <textarea class="inp" id="chua-speak" rows="3" maxlength="400" placeholder="Ví dụ: Cảm ơn cả nhà đã ghé xem live tối nay ạ."></textarea>
            <div class="file-row" style="margin-top:8px">
              <button class="btn primary sm" id="chua-speak-btn">🔊 Đọc ngay</button>
              <span class="muted small">Được đọc trước mọi câu khác.</span>
            </div>
          </div>
          <div class="panel">
            <div class="panel-head"><h2>Điều khiển</h2></div>
            <div class="test-grid">
              <button class="btn ghost" data-chua="bell">🔔 Thỉnh chuông</button>
              <button class="btn ghost" data-chua="mo">🪵 Gõ mõ</button>
              <button class="btn ghost" data-chua="share">📣 Nhắc chia sẻ</button>
              <button class="btn ghost" data-chua="rain">🌸 Mưa hoa sen ngay</button>
              <button class="btn ghost" data-chua="reset">↺ Đặt lại bảng điểm</button>
            </div>
          </div>
          <div class="panel">
            <div class="panel-head"><h2>Gửi thử</h2></div>
            <div class="test-grid">
              <button class="btn ghost" data-test="adidaphat">🙏 Gõ “adidaphat”</button>
              <button class="btn ghost" data-test="join">🚪 Vào phòng</button>
              <button class="btn ghost" data-test="wish">💬 Bình luận cầu chúc</button>
              <button class="btn ghost" data-test="gift">🎁 Quà nhỏ</button>
              <button class="btn ghost" data-test="bigGift">🪷 Quà lớn</button>
              <button class="btn ghost" data-chua="testLikes">❤️ Thả 100 tim</button>
            </div>
          </div>
        </div>
      </div>
      </div>
    </section>
</template>
