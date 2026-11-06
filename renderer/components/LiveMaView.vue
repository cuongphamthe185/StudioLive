<template>
    <section class="view scene-view" id="view-ma">
      <header class="page-head">
        <div>
          <h1>👻 Live Ma Online</h1>
          <p class="muted">Đang mở tab này thì cảnh Nhà Ma chạy trên live. Người xem hoá ma, gõ “hù / trốn / tìm…” để chơi với nhau.</p>
        </div>
      </header>
      <div class="feature-layout">
        <div class="preview-wrap">
          <div class="preview-frame feature-frame">
            <iframe class="live-preview" data-for="ma" title="Cảnh Nhà Ma trên live"></iframe>
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
        <div class="panel game-panel">
          <div class="panel-head"><h2>Trò chơi</h2></div>
          
          
          <div class="game-opts stack">
            <div class="field">
              <label>Vòng TRỐN TÌM tự động mỗi <span class="val" id="v-roundEvery"></span></label>
              <input type="range" min="0" max="15" step="1" data-o="roundEvery" data-num>
            </div>
            <div class="field">
              <label>Hiện bảng CÁCH CHƠI mỗi <span class="val" id="v-tutorialEvery"></span></label>
              <input type="range" min="0" max="10" step="1" data-o="tutorialEvery" data-num>
            </div>
            <label class="toggle"><span>Ma NPC (Ma Xó, Ma Lai…) đi hù người xem và chỉ cách chơi</span><input type="checkbox" data-o="bots"><i></i></label>
          </div>
        </div>
        <div class="panel">
            <div class="panel-head"><h2>Gửi thử</h2></div>
            <div class="test-grid">
              <button class="btn ghost" data-test="chat">💬 Bình luận</button>
              <button class="btn ghost" data-test="gift">🎁 Quà nhỏ</button>
              <button class="btn ghost" data-test="bigGift">🏰 Quà lớn</button>
              <button class="btn ghost" data-test="follow">➕ Theo dõi</button>
              <button class="btn ghost" data-test="share">🔗 Chia sẻ</button>
              <button class="btn ghost" data-test="join">🚪 Vào phòng</button>
            </div>
            <div class="sub-lbl">Trò chơi Nhà Ma</div>
            <div class="test-grid">
              <button class="btn ghost" data-test="scare">👻 Gõ “hù”</button>
              <button class="btn ghost" data-test="hide">🤫 Gõ “trốn”</button>
              <button class="btn ghost" data-test="seek">🔦 Gõ “tìm”</button>
              <button class="btn ghost" data-test="thunder">⚡ Sấm chớp</button>
              <button class="btn ghost" data-test="jumpscare">😱 Jumpscare</button>
              <button class="btn ghost" data-test="peek">👀 Ma ló mặt</button>
              <button class="btn ghost" data-test="howto">📖 Hiện cách chơi</button>
              <button class="btn ghost" data-test="freeze">📜 Gõ “bùa”</button>
              <button class="btn ghost" data-test="summon">🕯️ Gõ “gọi hồn”</button>
              <button class="btn ghost" data-test="blackout">🌑 Gõ “tắt đèn”</button>
              <button class="btn ghost" data-test="hug">🤗 Gõ “ôm”</button>
              <button class="btn ghost" data-test="dance">💃 Gõ “nhảy”</button>
              <button class="btn ghost" data-test="laugh">😈 Gõ “cười”</button>
              <button class="btn ghost" data-test="cry">😭 Gõ “khóc”</button>
              <button class="btn game-btn" data-test="round">💀 Bắt đầu vòng TRỐN TÌM ngay</button>
            </div>
          </div>
        
        
        <div class="panel">
          <div class="panel-head"><h2>Âm thanh Nhà Ma</h2></div>
          <div class="toggles">
            
            <label class="toggle"><span>Nhạc nền rùng rợn</span><input type="checkbox" data-o="ambient"><i></i></label>
          </div>
          <div class="field">
            <label>Kiểu nhạc nền</label>
            <div class="amb-grid" id="amb-grid">
              <button data-amb="drone"><b>🌫️ U ám</b><span>Tiếng trầm nghịch tai, thì thầm xa</span></button>
              <button data-amb="wind"><b>🌪️ Gió hú</b><span>Gió rít qua khe cửa, cửa kẽo kẹt</span></button>
              <button data-amb="rain"><b>🌧️ Mưa đêm</b><span>Mưa rơi, giọt nước, sấm rền xa</span></button>
              <button data-amb="church"><b>⛪ Nhà thờ hoang</b><span>Đàn organ giọng thứ, chuông xa</span></button>
              <button data-amb="heartbeat"><b>💓 Hồi hộp</b><span>Tim đập chậm, tiếng thở</span></button>
              <button data-amb="musicbox"><b>🎠 Hộp nhạc ma</b><span>Điệu ru lệch tông, đĩa rè</span></button>
              <button data-amb="whispers"><b>🗣️ Thì thầm</b><span>Tiếng thì thầm trái phải, trẻ con cười</span></button>
              <button data-amb="forest"><b>🦉 Rừng đêm</b><span>Dế kêu, cú gáy, gió nhẹ</span></button>
            </div>
            <p class="hint">Bấm chọn là đổi ngay. Nghe thử ở khung xem bên trái (bật 🔊 Nghe).</p>
          </div>
          <div class="field">
            <label>Âm lượng nhạc nền <span class="val" id="v-ambientVolume"></span></label>
            <input type="range" min="0" max="1" step="0.05" data-o="ambientVolume" data-num>
          </div>
          
          
          
          
        </div>
        
        <details class="adv span-2">
          <summary>Tuỳ chỉnh nâng cao (hiển thị, giao diện, âm thanh tự chọn)</summary>
          <div class="adv-grid">
        <div class="panel">
          <div class="panel-head"><h2>Hiển thị trên màn hình</h2></div>
          <div class="toggles">
            <label class="toggle"><span>Bình luận</span><input type="checkbox" data-o="showChat"><i></i></label>
            <label class="toggle"><span>Quà tặng</span><input type="checkbox" data-o="showGifts"><i></i></label>
            <label class="toggle"><span>Thông báo theo dõi</span><input type="checkbox" data-o="showFollows"><i></i></label>
            <label class="toggle"><span>Thông báo chia sẻ</span><input type="checkbox" data-o="showShares"><i></i></label>
            <label class="toggle"><span>Người vào phòng</span><input type="checkbox" data-o="showJoins"><i></i></label>
            <label class="toggle"><span>Bộ đếm tim</span><input type="checkbox" data-o="showLikeCounter"><i></i></label>
            <label class="toggle"><span>Bộ đếm người xem</span><input type="checkbox" data-o="showViewerCounter"><i></i></label>
            <label class="toggle"><span>Bảng “Đại gia đêm nay”</span><input type="checkbox" data-o="showTopGifter"><i></i></label>
          </div>
        </div>
        <div class="panel">
          <div class="panel-head"><h2>Giao diện &amp; hiệu ứng</h2></div>
          <div class="field">
            <label>Nền overlay</label>
            <div class="seg" id="bg-seg">
              <button data-bg="haunted">Cảnh nhà ma 👻</button>
              <button data-bg="transparent">Trong suốt (đè camera)</button>
            </div>
          </div>
          <div class="field">
            <label>Màu chủ đạo</label>
            <div class="swatches" id="swatches">
              <button style="--s:#a3e635" data-c="#a3e635"></button>
              <button style="--s:#22d3ee" data-c="#22d3ee"></button>
              <button style="--s:#c084fc" data-c="#c084fc"></button>
              <button style="--s:#f43f5e" data-c="#f43f5e"></button>
              <button style="--s:#facc15" data-c="#facc15"></button>
              <input type="color" id="accent-custom" title="Màu tuỳ chọn">
            </div>
          </div>
          <div class="field">
            <label>Thời gian hiện bình luận <span class="val" id="v-chatDuration"></span></label>
            <input type="range" min="2" max="12" step="0.5" data-o="chatDuration" data-num>
          </div>
          <div class="field">
            <label>Số bình luận tối đa cùng lúc <span class="val" id="v-maxCards"></span></label>
            <input type="range" min="1" max="12" step="1" data-o="maxCards" data-num>
          </div>
          <div class="field">
            <label>“Quà lớn” (jumpscare + gọi Bà Ma) khi tổng từ (kim cương)</label>
            <input type="number" min="0" class="inp" data-o="bigGiftDiamonds" data-num>
          </div>
          <div class="field">
            <label>Ảnh / video jumpscare <span class="muted small">(tuỳ chọn)</span></label>
            <div class="file-row">
              <span class="file-name" id="f-customJumpscare">Mặc định: 6 mặt ma ngẫu nhiên</span>
              <button class="btn ghost sm" data-pick="customJumpscare" data-kind="media">Chọn file</button>
              <button class="btn ghost sm" data-clear="customJumpscare">Mặc định</button>
            </div>
            <p class="hint">Dùng ảnh hoặc clip kinh dị của bạn (jpg, png, gif, mp4, webm). Video có tiếng sẽ phát tiếng của video.</p>
          </div>
        </div>
        <div class="panel">
          <div class="panel-head"><h2>Âm thanh tự chọn</h2></div>
          <div class="toggles"><label class="toggle"><span>Tiếng “ting” khi có bình luận</span><input type="checkbox" data-o="chatSound"><i></i></label></div>
          <div class="field">
            <label>Âm thanh quà tặng</label>
            <div class="file-row">
              <span class="file-name" id="f-customGiftSound">Mặc định: chuông chùa</span>
              <button class="btn ghost sm" data-pick="customGiftSound">Chọn file</button>
              <button class="btn ghost sm" data-clear="customGiftSound">Mặc định</button>
            </div>
          </div>
          <div class="field">
            <label>Tiếng khi bị hù</label>
            <div class="file-row">
              <span class="file-name" id="f-customScareSound">Mặc định: 4 kiểu tiếng thét ngẫu nhiên</span>
              <button class="btn ghost sm" data-pick="customScareSound">Chọn file</button>
              <button class="btn ghost sm" data-clear="customScareSound">Mặc định</button>
            </div>
          </div>
          <div class="field">
            <label>Nhạc nền</label>
            <div class="file-row">
              <span class="file-name" id="f-customAmbient">Mặc định: gió hú tự tạo</span>
              <button class="btn ghost sm" data-pick="customAmbient">Chọn file</button>
              <button class="btn ghost sm" data-clear="customAmbient">Mặc định</button>
            </div>
          </div>
          <div class="field">
            <label>Âm thanh bình luận</label>
            <div class="file-row">
              <span class="file-name" id="f-customChatSound">Mặc định: ting</span>
              <button class="btn ghost sm" data-pick="customChatSound">Chọn file</button>
              <button class="btn ghost sm" data-clear="customChatSound">Mặc định</button>
            </div>
          </div>
        </div>
          </div>
        </details>
        </div>
      </div>
    </section>
</template>
