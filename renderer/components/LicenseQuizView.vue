<template>
  <section class="view scene-view" id="view-quiz">
    <header class="page-head">
      <div>
        <h1>🚦 Live ôn thi giấy phép lái xe</h1>
        <p class="muted">
          Người xem bình luận A, B, C hoặc D để trả lời. Chủ live bấm hiện đáp
          án rồi chuyển câu.
        </p>
      </div>
    </header>
    <div class="quiz-tabs">
      <button
        class="quiz-tab"
        data-quiz-tab="live"
        :class="{ active: activeTab === 'live' }"
        @click="
          activeTab = 'live';
          refreshLiveData();
        "
      >
        🚦 Phát đề</button
      ><button
        class="quiz-tab"
        data-quiz-tab="manage"
        :class="{ active: activeTab === 'manage' }"
        @click="activeTab = 'manage'"
      >
        🗂️ Quản lý đề thi
      </button>
    </div>
    <div
      class="quiz-pane"
      :class="{ active: activeTab === 'live' }"
      data-quiz-pane="live"
    >
      <div class="feature-layout">
        <div class="preview-wrap">
          <div class="preview-frame feature-frame">
            <iframe
              class="live-preview"
              data-for="quiz"
              title="Cảnh ôn thi GPLX trên live"
            ></iframe>
          </div>
          <div class="preview-actions">
            <div style="display: flex; gap: 6px; flex-wrap: wrap">
              <button class="btn ghost sm" data-pause>⏸ Tạm dừng</button
              ><button class="btn ghost sm" data-open-output>
                📺 Mở màn hình phát live
              </button>
              <button
                class="btn ghost sm"
                data-reload-preview
                title="Tải lại khung xem nếu bị đen"
              >
                ↻
              </button>
            </div>
            <label class="switch-inline"
              ><input type="checkbox" class="preview-safe-cb" /> 📱 Vùng bị
              TikTok che</label
            ><label class="switch-inline"
              ><input type="checkbox" class="preview-sound-cb" /> 🔊 Nghe</label
            ><label class="switch-inline"
              ><input type="checkbox" class="quiz-music-cb" /> 🎵 Nhạc
              nền</label
            >
          </div>
          <p class="hint" style="max-width: 405px">
            Đây chính là màn hình người xem thấy trên live. Đưa lên TikTok: tab
            <b>Đưa lên live</b>.
          </p>
        </div>
        <div class="feature-controls">
          <div class="panel">
            <div class="panel-head"><h2>Điều khiển live</h2></div>
            <div class="quiz-live-settings">
              <label class="lbl"
                >Hạng GPLX<select
                  class="inp"
                  v-model="licenseClass"
                  @change="loadPoolCount"
                >
                  <option
                    v-for="c in licenseClasses"
                    :key="c.code"
                    :value="c.code"
                  >
                    {{ c.code === c.name ? c.code : `${c.code} · ${c.name}` }}
                  </option>
                </select></label
              ><label class="lbl"
                >Số câu mỗi phiên live<input
                  class="inp"
                  :value="classLiveCount"
                  readonly
                  aria-label="Số câu đã cấu hình cho hạng" /></label
              ><label class="lbl"
                >Giây mỗi câu<input
                  class="inp"
                  type="number"
                  min="5"
                  max="120"
                  step="1"
                  v-model.number="seconds"
                  @change="saveSeconds" /></label
              ><label class="lbl"
                >Tốc độ đọc · {{ rate.toFixed(1) }}×<input
                  class="inp"
                  type="range"
                  min="0.6"
                  max="1.5"
                  step="0.1"
                  v-model.number="rate"
                  @change="saveRate" /></label
              ><label class="lbl"
                >Giọng đọc<select
                  class="inp"
                  v-model="voiceGender"
                  @change="saveVoiceGender"
                >
                  <option value="female">Nữ</option>
                  <option value="male">Nam</option>
                  <option value="alternating">Nam nữ xen kẽ</option>
                </select></label
              >
            </div>
            <label class="toggle quiz-voice-toggle"
              ><span>Lặp lại bộ đề khi hết câu</span
              ><input
                type="checkbox"
                v-model="loopEnabled"
                @change="saveLoop" /><i></i
            ></label>
            <label class="toggle quiz-voice-toggle"
              ><span>Đọc câu hỏi và nhắc chọn A/B/C/D</span
              ><input
                type="checkbox"
                v-model="voiceEnabled"
                @change="saveVoice" /><i></i
            ></label>
            <label class="toggle quiz-voice-toggle"
              ><span>Đọc đáp án đúng khi hết giờ</span
              ><input
                type="checkbox"
                v-model="speakAnswerEnabled"
                @change="saveSpeakAnswer" /><i></i
            ></label>
            <label class="toggle quiz-voice-toggle"
              ><span>Phát tiếng tích đếm từng giây</span
              ><input
                type="checkbox"
                v-model="tickEnabled"
                @change="saveTick" /><i></i
            ></label>
            <details class="quiz-appearance-settings">
              <summary>🎨 Tuỳ chỉnh màu giao diện live</summary>
              <div class="quiz-color-grid">
                <label v-for="color in colorFields" :key="color.key" class="lbl"
                  >{{ color.label
                  }}<input
                    class="quiz-color-input"
                    type="color"
                    v-model="colors[color.key]"
                    @change="saveColor(color.key)"
                /></label>
              </div>
            </details>
            <div class="file-row">
              <button
                class="btn primary"
                :disabled="playState === 'running'"
                @click="startQuiz"
              >
                ▶ Phát live</button
              ><button
                class="btn ghost"
                :disabled="playState !== 'running'"
                @click="controlQuiz('pause')"
              >
                ⏸ Tạm dừng
              </button>
            </div>
            <div class="quiz-session-status" :class="`is-${playState}`">
              <span class="quiz-session-dot"></span>
              <div>
                <b>{{
                  playState === "running"
                    ? "Đang phát live"
                    : playState === "paused"
                      ? "Đang tạm dừng"
                      : "Chưa phát live"
                }}</b
                ><span>Thời gian đã phát: {{ elapsedText }}</span>
              </div>
            </div>
            <p
              v-if="message"
              class="hint quiz-live-status"
              :class="{ err: messageIsError }"
            >
              {{ message }}
            </p>
            <p v-else class="hint quiz-live-status">
              Sẽ rút {{ classLiveCount }} câu ngẫu nhiên từ
              {{ classPoolCount }} câu đã gán cho hạng {{ licenseClass }}.
            </p>
            <div class="file-row quiz-answer-controls">
              <button class="btn ghost" @click="controlQuiz('prev')">
                ← Câu trước</button
              ><button class="btn ghost" @click="controlQuiz('reveal')">
                Hiện đáp án</button
              ><button class="btn ghost" @click="controlQuiz('next')">
                Câu tiếp →
              </button>
            </div>
            <div class="file-row quiz-reset-control-row">
              <button class="btn ghost" @click="controlQuiz('reset')">
                ↺ Về câu đầu
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <QuizManager
      :class="{ active: activeTab === 'manage' }"
      @open-live="
        activeTab = 'live';
        refreshLiveData();
      "
      @data-updated="refreshLiveData"
    />
  </section>
</template>
<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from "vue";
import QuizManager from "./QuizManager.vue";
const api = window.studio;
const licenseClasses = ref([]);
const licenseClass = ref("B");
const activeTab = ref("live");
const seconds = ref(5);
const classPoolCount = ref(0);
const classLiveCount = computed(
  () =>
    licenseClasses.value.find((item) => item.code === licenseClass.value)
      ?.liveCount || 25,
);
const message = ref("");
const messageIsError = ref(false);
const playState = ref("idle");
const elapsedBaseMs = ref(0);
const elapsedStartedAt = ref(0);
const clockNow = ref(Date.now());
let elapsedInterval = 0;
const elapsedMs = computed(
  () =>
    elapsedBaseMs.value +
    (playState.value === "running"
      ? Math.max(0, clockNow.value - elapsedStartedAt.value)
      : 0),
);
const elapsedText = computed(() => {
  const totalSeconds = Math.floor(elapsedMs.value / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secondsElapsed = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secondsElapsed).padStart(2, "0")}`;
});
const voiceEnabled = ref(false);
const voiceGender = ref("male");
const speakAnswerEnabled = ref(true);
const tickEnabled = ref(true);
const loopEnabled = ref(true);
const rate = ref(1);
const colorFields = [
  { key: "quizBgColor", label: "Màu nền" },
  { key: "quizAccentColor", label: "Màu nhấn/viền" },
  { key: "quizCardColor", label: "Màu thẻ câu hỏi" },
  { key: "quizTextColor", label: "Màu chữ" },
];
const colors = reactive({
  quizBgColor: "#07151b",
  quizAccentColor: "#2dd4bf",
  quizCardColor: "#071b23",
  quizTextColor: "#ffffff",
});
onMounted(async () => {
  elapsedInterval = window.setInterval(() => {
    clockNow.value = Date.now();
  }, 1000);
  window.addEventListener("app:quiz-session-paused", pauseQuizFromSceneSwitch);
  const init = await api.init();
  licenseClasses.value = await api.quizLicenseClasses();
  voiceEnabled.value = !!init.settings.overlay.quizVoice;
  voiceGender.value = init.settings.overlay.quizVoiceGender || "male";
  speakAnswerEnabled.value = init.settings.overlay.quizSpeakAnswer !== false;
  tickEnabled.value = init.settings.overlay.quizTickSound !== false;
  licenseClass.value = licenseClasses.value.some(
    (item) => item.code === init.settings.overlay.quizLicenseClass,
  )
    ? init.settings.overlay.quizLicenseClass
    : licenseClasses.value[0]?.code || "";
  seconds.value = Number(init.settings.overlay.quizSeconds) || 5;
  loopEnabled.value = init.settings.overlay.quizLoop !== false;
  rate.value = Number(init.settings.overlay.quizRate) || 1;
  colorFields.forEach(({ key }) => {
    colors[key] = init.settings.overlay[key] || colors[key];
  });
  await loadPoolCount();
});
function pauseQuizFromSceneSwitch() {
  if (playState.value !== "running") return;
  elapsedBaseMs.value += Math.max(0, Date.now() - elapsedStartedAt.value);
  playState.value = "paused";
  window.dispatchEvent(
    new CustomEvent("app:quiz-session-state", { detail: { running: false } }),
  );
  message.value = "Đã tạm dừng phiên thi để chuyển cảnh live.";
}
onUnmounted(() => {
  window.clearInterval(elapsedInterval);
  window.removeEventListener(
    "app:quiz-session-paused",
    pauseQuizFromSceneSwitch,
  );
});
async function loadPoolCount() {
  const result = await api.quizBankClassQuestions(licenseClass.value);
  classPoolCount.value = result.assignedIds?.length || 0;
}
async function refreshLiveData() {
  try {
    licenseClasses.value = await api.quizLicenseClasses();
    if (!licenseClasses.value.some((item) => item.code === licenseClass.value))
      licenseClass.value = licenseClasses.value[0]?.code || "";
    if (licenseClass.value) await loadPoolCount();
  } catch (error) {
    message.value = `Không tải được cấu hình hạng mới: ${error.message || "Lỗi không xác định."}`;
    messageIsError.value = true;
  }
}
async function persistQuizSetting(label, key, value) {
  try {
    await api.updateSettings({ overlay: { [key]: value } });
    message.value = "";
    window.dispatchEvent(
      new CustomEvent("app:notify", { detail: { text: `Đã lưu ${label}.` } }),
    );
  } catch (error) {
    message.value = "";
    window.dispatchEvent(
      new CustomEvent("app:notify", {
        detail: {
          text: `Không lưu được ${label}: ${error.message || "Lỗi không xác định từ ứng dụng."}`,
          error: true,
        },
      }),
    );
  }
}
async function saveVoice() {
  await persistQuizSetting(
    "cấu hình đọc câu hỏi",
    "quizVoice",
    voiceEnabled.value,
  );
}
async function saveVoiceGender() {
  await persistQuizSetting("giọng đọc", "quizVoiceGender", voiceGender.value);
}
async function saveSpeakAnswer() {
  await persistQuizSetting(
    "cấu hình đọc đáp án đúng",
    "quizSpeakAnswer",
    speakAnswerEnabled.value,
  );
}
async function saveTick() {
  await persistQuizSetting(
    "tiếng tích đếm giây",
    "quizTickSound",
    tickEnabled.value,
  );
}
async function saveLoop() {
  await persistQuizSetting("cấu hình lặp bộ đề", "quizLoop", loopEnabled.value);
}
async function saveSeconds() {
  const value = Math.min(120, Math.max(5, Number(seconds.value) || 5));
  seconds.value = value;
  await persistQuizSetting("thời gian mỗi câu", "quizSeconds", value);
}
async function controlQuiz(action) {
  const result = await api.quiz(action);
  if (result === false)
    message.value =
      "Không gửi được lệnh điều khiển. Hãy kiểm tra kết nối overlay.";
  else if (action === "pause") {
    if (playState.value === "running")
      elapsedBaseMs.value += Math.max(0, Date.now() - elapsedStartedAt.value);
    if (playState.value !== "idle") playState.value = "paused";
    window.dispatchEvent(
      new CustomEvent("app:quiz-session-state", { detail: { running: false } }),
    );
    message.value = "Đã tạm dừng phiên thi.";
  } else if (action === "reset")
    message.value = "Đã đưa bộ đề về câu đầu tiên.";
  else if (action === "next" && !loopEnabled.value)
    message.value = "Đã chuyển sang câu tiếp theo (bộ đề sẽ dừng ở câu cuối).";
  else message.value = "";
}
async function saveRate() {
  await persistQuizSetting("tốc độ đọc", "quizRate", rate.value);
}
async function saveColor(key) {
  const color = colorFields.find((item) => item.key === key);
  await persistQuizSetting(
    `màu ${color?.label || "giao diện live"}`,
    key,
    colors[key],
  );
}
async function startQuiz() {
  await loadPoolCount();
  const result = await api.quiz("start", {
    licenseClass: licenseClass.value,
    seconds: seconds.value,
  });
  if (result?.ok) {
    playState.value = "running";
    window.dispatchEvent(
      new CustomEvent("app:quiz-session-state", { detail: { running: true } }),
    );
    elapsedBaseMs.value = 0;
    elapsedStartedAt.value = Date.now();
    clockNow.value = elapsedStartedAt.value;
  }
  message.value = result?.ok
    ? `Đang thi hạng ${result.licenseClass}: lấy ngẫu nhiên ${result.count.toLocaleString("vi-VN")} câu từ ngân hàng ${result.poolCount.toLocaleString("vi-VN")} câu đã chọn.`
    : result?.message || "Không bắt đầu được phiên thi.";
}
</script>
