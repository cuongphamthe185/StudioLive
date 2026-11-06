<template>
    <section class="view scene-view" id="view-club">
      <header class="page-head">
        <div>
          <h1>🎧 DJ Club</h1>
          <p class="muted">Đang mở tab này thì sàn nhảy chạy trên live. Người xem thành nhân vật trên sàn; thả tim, tặng quà để có điểm — Top 1 lên làm DJ, Top 2–4 đứng bục vàng, bạc, đồng. Tặng quà thì camera lia vào người tặng.</p>
        </div>
      </header>
      <div class="feature-layout">
        <div class="preview-wrap">
          <div class="preview-frame feature-frame">
            <iframe class="live-preview" data-for="club" title="Sàn nhảy DJ Club trên live"></iframe>
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
          <div class="panel-head"><h2>Sàn nhảy &amp; nhạc</h2></div>
          <div class="field" style="margin-top:0">
            <label>Tên sàn nhảy <span class="muted small">(tiêu đề trên màn hình)</span></label>
            <div class="file-row">
              <input class="inp" id="club-name" maxlength="40" placeholder="Ví dụ: DJ CLUB">
              <button class="btn primary sm" id="club-name-save">Lưu</button>
            </div>
          </div>
          <div class="toggles" style="margin-top:8px">
            <label class="toggle"><span>Phát nhạc nền</span><input type="checkbox" data-o="clubMusic"><i></i></label>
          </div>
          <div class="field">
            <label>Âm lượng nhạc <span class="val" id="v-clubMusicVolume"></span></label>
            <input type="range" min="0" max="1" step="0.05" data-o="clubMusicVolume" data-num>
          </div>
          <div class="field">
            <label>Danh sách nhạc <span class="muted small" id="club-track-count"></span></label>
            <div class="club-tracks" id="club-tracks"></div>
            <div class="file-row" style="margin-top:8px">
              <button class="btn primary sm" id="club-add-music">＋ Thêm nhạc</button>
              <button class="btn ghost sm" id="club-clear-music">Xoá hết</button>
              <button class="btn ghost sm" data-club="prev">⏮</button>
              <button class="btn ghost sm" data-club="next">⏭</button>
            </div>
          </div>
          <div class="field">
            <label>Số tim để mưa pháo giấy</label>
            <input type="number" class="inp" min="10" data-o="clubLikeGoal" data-num>
          </div>
          <div class="field">
            <label>Số nhân vật tối đa trên sàn <span class="val" id="v-clubMaxDogs"></span></label>
            <input type="range" min="5" max="120" step="1" data-o="clubMaxDogs" data-num>
          </div>
          <div class="field">
            <label>Nhịp đèn nháy <span class="val" id="v-clubBpm"></span></label>
            <input type="range" min="60" max="180" step="1" data-o="clubBpm" data-num>
          </div>
          <div class="field">
            <label>Chất lượng hình 3D <span class="muted small">(Thấp: tắt phát sáng lan và phản chiếu sàn, cho máy yếu)</span></label>
            <div class="seg" id="club-quality">
              <button data-q="high">Cao</button>
              <button data-q="low">Thấp</button>
            </div>
          </div>
          <div class="toggles" style="margin-top:8px">
            <label class="toggle"><span>Camera tự đổi góc máy</span><input type="checkbox" data-o="clubCamAuto"><i></i></label>
          </div>
          <div class="field">
            <label>Mỗi góc máy giữ <span class="val" id="v-clubCamEvery"></span></label>
            <input type="range" min="4" max="60" step="1" data-o="clubCamEvery" data-num>
          </div>
          <div class="toggles" style="margin-top:8px">
            <label class="toggle"><span>Tặng quà thì camera lia vào người tặng</span><input type="checkbox" data-o="clubCamera"><i></i></label>
          </div>
          <div class="field">
            <label>Thời gian camera giữ ở người tặng <span class="val" id="v-clubCameraSec"></span></label>
            <input type="range" min="1" max="10" step="1" data-o="clubCameraSec" data-num>
          </div>
        </div>

        <div class="panel">
          <div class="panel-head"><h2>Chữ chạy &amp; màn hình LED</h2></div>
          <div class="field" style="margin-top:0">
            <label>Tiêu đề chạy phía trên <span class="muted small">(trống = tên sàn + hướng dẫn)</span></label>
            <div class="file-row">
              <input class="inp" id="club-headline" maxlength="200" placeholder="Ví dụ: Tối nay quẩy hết mình cùng DJ CLUB">
              <button class="btn primary sm" id="club-headline-save">Lưu</button>
            </div>
          </div>
          <div class="field">
            <label>Chữ chạy trên bàn DJ <span class="muted small">(tự thêm tên DJ và lời cảm ơn quà)</span></label>
            <div class="file-row">
              <input class="inp" id="club-desk" maxlength="200" placeholder="Ví dụ: Chào mừng cả nhà đến DJ CLUB">
              <button class="btn primary sm" id="club-desk-save">Lưu</button>
            </div>
          </div>
          <div class="field">
            <label>Ảnh trên màn hình LED <span class="muted small" id="club-screen-count"></span></label>
            <div class="club-tracks" id="club-screen-list"></div>
            <div class="file-row" style="margin-top:8px">
              <button class="btn primary sm" id="club-add-images">＋ Thêm ảnh</button>
              <button class="btn ghost sm" id="club-clear-images">Xoá hết</button>
              <button class="btn ghost sm" data-club="screen">⏭ Ảnh tiếp</button>
            </div>
          </div>
          <div class="field">
            <label>Mỗi ảnh hiện <span class="val" id="v-clubScreenSec"></span></label>
            <input type="range" min="3" max="60" step="1" data-o="clubScreenSec" data-num>
          </div>
          <p class="hint">Ngoài ảnh của bạn, màn LED còn xen kẽ tên sàn và hiệu ứng nhạc; có quà thì hiện lời cảm ơn, có Top 1 mới thì báo lên.</p>
        </div>

        <div class="panel">
          <div class="panel-head"><h2>Cách tính điểm</h2></div>
          <div class="club-score-grid">
            <label>Điểm mỗi tim<input type="number" class="inp" min="0" data-o="clubPtsLike" data-num></label>
            <label>Tim tối đa / phút / người<input type="number" class="inp" min="0" data-o="clubLikeCapMin" data-num></label>
            <label>Điểm mỗi xu của quà<input type="number" class="inp" min="1" data-o="clubPtsCoin" data-num></label>
            <label>Điểm theo dõi (1 lần)<input type="number" class="inp" min="0" data-o="clubPtsFollow" data-num></label>
            <label>Điểm mỗi lần chia sẻ<input type="number" class="inp" min="0" data-o="clubPtsShare" data-num></label>
            <label>Số lần chia sẻ được tính<input type="number" class="inp" min="0" data-o="clubShareMax" data-num></label>
          </div>
          <div class="toggles" style="margin-top:8px">
            <label class="toggle"><span>Thưởng thêm cho quà đắt (10–99 xu ×1,1 · 100–999 ×1,25 · từ 1.000 ×1,5)</span><input type="checkbox" data-o="clubGiftBonus"><i></i></label>
          </div>
          <p class="hint">Điểm quà = số xu × điểm mỗi xu × hệ số. Tim tối đa / phút = 0 là không giới hạn. Bình luận không tính điểm. Điểm tính theo từng phiên live: buổi live mới về 0, kết nối lại cùng buổi thì giữ.</p>
        </div>

        <div class="col">
          <div class="panel">
            <div class="panel-head"><h2>Bảng điểm phiên này</h2><button class="btn ghost sm" id="club-reset-score">↺ Đặt lại điểm</button></div>
            <div class="club-rank" id="club-rank"></div>
          </div>
          <div class="panel">
            <div class="panel-head"><h2>Điều khiển</h2></div>
            <div class="test-grid">
              <button class="btn ghost" data-club="rain">🎉 Mưa pháo giấy</button>
              <button class="btn ghost" data-club="dance">💃 Cả sàn cùng nhảy</button>
              <button class="btn ghost" data-club="clear">🧹 Dọn sàn</button>
              <button class="btn ghost" data-club="camera">🎥 Đổi góc máy</button>
            </div>
          </div>
          <div class="panel">
            <div class="panel-head"><h2>Gửi thử</h2></div>
            <div class="test-grid">
              <button class="btn ghost" data-club="crowd">🕺 Thêm 10 nhân vật</button>
              <button class="btn ghost" data-test="join">🚪 Vào phòng</button>
              <button class="btn ghost" data-test="chat">💬 Bình luận</button>
              <button class="btn ghost" data-test="dance">💃 Gõ “nhảy”</button>
              <button class="btn ghost" data-test="dogSwap">🔄 Gõ “đổi”</button>
              <button class="btn ghost" data-test="like">❤️ Thả 15 tim</button>
              <button class="btn ghost" data-test="gift">🎁 Quà nhỏ</button>
              <button class="btn ghost" data-test="gift100">🎁 Quà 100 xu</button>
              <button class="btn ghost" data-test="gift1000">💎 Quà 1.000 xu</button>
              <button class="btn ghost" data-test="follow">➕ Theo dõi</button>
              <button class="btn ghost" data-test="share">🔗 Chia sẻ</button>
              <button class="btn ghost" data-club="testLikes">❤️ 100 tim (thanh tim)</button>
            </div>
            <p class="hint">Người thử là 6 tên ngẫu nhiên, nên bấm nhiều lần để thấy họ tranh bục.</p>
          </div>
        </div>
      </div>
      </div>
    </section>
</template>
