<template>
  <div class="quiz-pane" data-quiz-pane="manage">
    <header class="page-head">
      <div>
        <h2>📚 Quản lý hạng và ngân hàng GPLX</h2>
        <p class="muted">
          Quản lý hạng riêng, gán câu hỏi từ ngân hàng 600 và biên soạn ngân
          hàng độc lập.
        </p>
      </div>
      <div class="head-actions">
        <button class="btn primary" @click="$emit('open-live')">
          🚦 Cấu hình phát live
        </button>
      </div>
    </header>
    <div class="quiz-tabs">
      <button
        class="quiz-tab"
        :class="{ active: view === 'classes' }"
        @click="view = 'classes'"
      >
        🚘 Quản lý hạng GPLX</button
      ><button
        class="quiz-tab"
        :class="{ active: view === 'bank' }"
        @click="view = 'bank'"
      >
        📚 Ngân hàng câu hỏi
      </button>
    </div>
    <section v-if="view === 'classes'" class="panel quiz-bank-panel">
      <div class="panel-head">
        <div>
          <h2>Hạng GPLX</h2>
          <p class="muted small">
            Chọn hạng để cấu hình danh sách câu hỏi được dùng khi live.
          </p>
        </div>
        <button class="btn primary" @click="openClassModal()">
          + Thêm hạng
        </button>
      </div>
      <div class="quiz-class-admin-list">
        <div
          v-for="item in licenseClasses"
          :key="item.code"
          class="quiz-class-admin-row"
          :class="{ selected: item.code === licenseClass }"
        >
          <button class="quiz-class-admin-pick" @click="selectClass(item.code)">
            <b>{{ item.code }}</b
            ><span>{{ item.name }}</span
            ><small
              >{{
                item.code === licenseClass
                  ? selectedIds.length
                  : (classCounts[item.code] ?? "…")
              }}
              câu · live {{ item.liveCount }} câu</small
            ></button
          ><button class="btn ghost sm" @click="openClassModal(item)">
            Sửa</button
          ><button
            class="btn danger sm"
            :disabled="licenseClasses.length < 2"
            @click="deleteClass(item.code)"
          >
            Xoá
          </button>
        </div>
      </div>
      <div v-if="licenseClass" class="quiz-class-question-config">
        <div class="quiz-class-live-config">
          <div class="quiz-class-live-copy">
            <b>Cấu hình phát live · {{ licenseClass }}</b
            ><span
              >Mỗi phiên lấy ngẫu nhiên tối đa {{ liveQuestionCount }} câu trong
              {{ selectedIds.length }} câu đã gán cho hạng này.</span
            >
          </div>
          <div class="quiz-class-live-controls">
            <label
              >Số câu mỗi phiên<input
                class="inp"
                type="number"
                min="1"
                max="600"
                v-model.number="liveQuestionCount" /></label
            ><button
              class="btn ghost"
              :disabled="saving"
              @click="saveLiveQuestionCount"
            >
              Lưu cấu hình
            </button>
          </div>
        </div>
        <div class="quiz-list-head">
          <div>
            <h2>Chọn câu thuộc hạng {{ licenseClass }}</h2>
            <span class="muted small"
              >{{ selectedIds.length }} câu đã chọn ·
              {{ filteredQuestions.length }} kết quả từ ngân hàng</span
            >
          </div>
          <div class="file-row">
            <input
              class="inp"
              v-model="search"
              placeholder="Tìm theo số câu hoặc nội dung…"
            /><button class="btn ghost sm" @click="toggleVisible">
              {{
                allVisibleSelected ? "Bỏ chọn đang xem" : "Chọn đang xem"
              }}</button
            ><button class="btn ghost sm" @click="clearClassQuestions">
              Bỏ chọn tất cả
            </button>
          </div>
        </div>
        <div class="quiz-bank-picker-list">
          <label
            v-for="item in visibleQuestions"
            :key="item.id"
            class="quiz-bank-picker-row"
            :class="{ 'has-image': item.image }"
            ><input
              v-model="selectedIds"
              type="checkbox"
              :value="item.id"
              @change="savePool"
            /><img v-if="item.image" :src="imageSrc(item.image)" alt="" /><span
              ><b>Câu {{ questionNumber(item.id) }}</b
              ><small>{{ item.question }}</small></span
            ></label
          >
          <p v-if="!filteredQuestions.length" class="muted">
            Không tìm thấy câu hỏi.
          </p>
        </div>
      </div>
    </section>
    <section v-else class="panel quiz-bank-panel">
      <div class="quiz-list-head">
        <div>
          <h2>Ngân hàng câu hỏi nguồn</h2>
          <span class="muted small"
            >{{ bankQuestions.length }} câu · danh sách độc lập với các hạng
            GPLX</span
          >
        </div>
        <div class="file-row">
          <input
            class="inp"
            v-model="bankSearch"
            placeholder="Tìm câu hỏi…"
          /><button class="btn ghost" @click="loadBank">↻ Tải lại</button
          ><button class="btn primary" @click="openQuestionModal()">
            + Thêm câu hỏi
          </button>
        </div>
      </div>
      <p v-if="bankLoading" class="quiz-empty-state">
        Đang tải danh sách câu hỏi…
      </p>
      <p v-else-if="bankError" class="hint err">{{ bankError }}</p>
      <div v-else class="quiz-question-list">
        <div
          v-for="(item, i) in visibleBankQuestions"
          :key="item.id"
          class="quiz-question-row"
        >
          <span class="quiz-question-summary"
            ><img
              v-if="item.image"
              :src="imageSrc(item.image)"
              alt=""
              class="quiz-question-thumb"
            /><span class="quiz-bank-question-text"
              ><span>{{ questionNumber(item.id) }}. {{ item.question }}</span
              ><span class="quiz-question-class-tags"
                ><b
                  v-for="code in item.classes"
                  :key="code"
                  :title="licenseClassName(code)"
                  >{{ code }}</b
                ><i v-if="!item.classes?.length">Chưa gán hạng</i></span
              ></span
            ></span
          ><button class="btn ghost sm" @click="openQuestionModal(item)">
            Sửa</button
          ><button class="btn danger sm" @click="deleteBankQuestion(item.id)">
            Xoá
          </button>
        </div>
        <p v-if="!filteredBankList.length" class="muted">
          {{
            bankQuestions.length
              ? "Không tìm thấy câu hỏi."
              : "Ngân hàng đang trống. Thêm câu hỏi để bắt đầu."
          }}
        </p>
      </div>
    </section>
    <p class="hint">
      Mỗi hạng có danh sách câu được gán riêng. Khi bắt đầu live, app rút ngẫu
      nhiên số câu đã cấu hình từ danh sách của hạng đó.
    </p>

    <div
      v-if="modal === 'class'"
      class="quiz-modal-backdrop"
      @click.self="closeModal"
    >
      <section class="quiz-modal" role="dialog" aria-modal="true">
        <div class="panel-head">
          <div>
            <h2>{{ classEditing ? "Sửa tên hạng GPLX" : "Thêm hạng GPLX" }}</h2>
            <p class="muted small">
              Mã hạng dùng làm định danh trong cấu hình và câu hỏi.
            </p>
          </div>
          <button class="btn ghost sm" @click="closeModal">Đóng</button>
        </div>
        <label class="lbl"
          >Mã hạng<input
            class="inp"
            v-model="classCode"
            maxlength="8"
            :disabled="!!classEditing"
            placeholder="Ví dụ: C1E" /></label
        ><label class="lbl"
          >Tên hiển thị<input
            class="inp"
            v-model="className"
            maxlength="60"
            placeholder="Ví dụ: Hạng C1E"
        /></label>
        <div class="file-row quiz-modal-actions">
          <button class="btn ghost" @click="closeModal">Huỷ</button
          ><button class="btn primary" @click="saveClass">Lưu hạng</button>
        </div>
      </section>
    </div>
    <div
      v-if="modal === 'question'"
      class="quiz-modal-backdrop"
      @click.self="closeModal"
    >
      <section
        class="quiz-modal quiz-question-modal"
        role="dialog"
        aria-modal="true"
      >
        <div class="panel-head">
          <div>
            <h2>
              {{ editingId ? "Sửa câu hỏi nguồn" : "Thêm câu hỏi nguồn" }}
            </h2>
            <p class="muted small">
              Chọn các hạng áp dụng cho câu này; danh sách và số câu mỗi hạng sẽ
              tự cập nhật.
            </p>
          </div>
          <button class="btn ghost sm" @click="closeModal">Đóng</button>
        </div>
        <label class="lbl"
          >Nội dung câu hỏi<textarea
            class="inp"
            v-model="question"
            rows="3"
            maxlength="500"
          ></textarea></label
        ><label class="lbl"
          >Ảnh minh hoạ (PNG, JPG, WebP, GIF · tối đa 5 MB)<input
            class="inp"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            @change="selectImage"
        /></label>
        <div v-if="image" class="quiz-image-editor">
          <img :src="imageSrc(image)" alt="Ảnh câu hỏi" /><button
            class="btn ghost sm"
            @click="image = ''"
          >
            Gỡ ảnh
          </button>
        </div>
        <label v-for="(letter, i) in letters" :key="letter" class="lbl"
          >Đáp án {{ letter
          }}<input class="inp" v-model="options[i]" maxlength="300" /></label
        ><label class="lbl"
          >Đáp án đúng<select class="inp" v-model.number="answer">
            <option v-for="(letter, i) in letters" :key="letter" :value="i">
              {{ letter }}
            </option>
          </select></label
        >
        <div class="lbl quiz-question-classes-label">Thuộc hạng GPLX</div>
        <div class="quiz-class-list quiz-question-class-picker">
          <label v-for="item in licenseClasses" :key="item.code"
            ><input
              v-model="questionClasses"
              type="checkbox"
              :value="item.code"
            />
            {{ item.code
            }}<small v-if="item.name !== item.code">
              · {{ item.name }}</small
            ></label
          >
        </div>
        <div class="file-row quiz-modal-actions">
          <button class="btn ghost" @click="closeModal">Huỷ</button
          ><button
            class="btn primary"
            :disabled="saving"
            @click="saveBankQuestion"
          >
            {{ saving ? "Đang lưu…" : "Lưu câu hỏi" }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
const emit = defineEmits(["open-live", "data-updated"]);
const api = window.studio;
const letters = ["A", "B", "C", "D"];
const view = ref("classes"),
  licenseClasses = ref([]),
  licenseClass = ref(""),
  bankQuestions = ref([]),
  selectedIds = ref([]),
  liveQuestionCount = ref(25),
  search = ref(""),
  bankSearch = ref(""),
  saving = ref(false),
  bankLoading = ref(false),
  bankError = ref(""),
  message = ref(""),
  isError = ref(false),
  serverPort = ref(3000),
  classCounts = ref({});
const modal = ref(""),
  classEditing = ref(""),
  classCode = ref(""),
  className = ref(""),
  editingId = ref(null),
  question = ref(""),
  options = ref(["", "", "", ""]),
  answer = ref(0),
  image = ref(""),
  questionClasses = ref([]);
const filteredQuestions = computed(() =>
  bankQuestions.value.filter(
    (item, i) =>
      !search.value.trim() ||
      String(i + 1).includes(search.value.trim()) ||
      item.question
        .toLocaleLowerCase("vi")
        .includes(search.value.trim().toLocaleLowerCase("vi")),
  ),
);
const visibleQuestions = computed(() => filteredQuestions.value);
const allVisibleSelected = computed(
  () =>
    visibleQuestions.value.length > 0 &&
    visibleQuestions.value.every((item) => selectedIds.value.includes(item.id)),
);
const filteredBankList = computed(() =>
  bankQuestions.value.filter(
    (item) =>
      !bankSearch.value.trim() ||
      item.question
        .toLocaleLowerCase("vi")
        .includes(bankSearch.value.trim().toLocaleLowerCase("vi")),
  ),
);
const visibleBankQuestions = computed(() => filteredBankList.value);
function notify(text, error = false) {
  message.value = text;
  isError.value = error;
  window.dispatchEvent(
    new CustomEvent("app:notify", { detail: { text, error } }),
  );
}
function imageSrc(src) {
  return String(src || "").startsWith("/quiz-images/")
    ? `http://127.0.0.1:${serverPort.value}${src}`
    : src;
}
function questionNumber(id) {
  return bankQuestions.value.findIndex((item) => item.id === id) + 1;
}
function licenseClassName(code) {
  return licenseClasses.value.find((item) => item.code === code)?.name || code;
}
async function loadClasses() {
  licenseClasses.value = await api.quizLicenseClasses();
  if (!licenseClasses.value.some((item) => item.code === licenseClass.value))
    licenseClass.value = licenseClasses.value[0]?.code || "";
}
async function loadBank() {
  bankLoading.value = true;
  bankError.value = "";
  try {
    const bank = await api.quizBankQuestions();
    bankQuestions.value = bank.questions || [];
  } catch (error) {
    bankError.value = error.message || "Không tải được danh sách câu hỏi";
  } finally {
    bankLoading.value = false;
  }
}
async function loadClassQuestions() {
  if (!licenseClass.value) return;
  search.value = "";
  const result = await api.quizBankClassQuestions(licenseClass.value);
  selectedIds.value = result.assignedIds || [];
  liveQuestionCount.value =
    licenseClasses.value.find((item) => item.code === licenseClass.value)
      ?.liveCount || 25;
}
async function selectClass(code) {
  licenseClass.value = code;
  try {
    await loadClassQuestions();
  } catch (error) {
    notify(error.message || "Không tải được câu hỏi của hạng", true);
  }
}
let poolSaveQueue = Promise.resolve(),
  poolSaveVersion = 0;
function toggleVisible() {
  const visible = visibleQuestions.value.map((item) => item.id);
  selectedIds.value = allVisibleSelected.value
    ? selectedIds.value.filter((id) => !visible.includes(id))
    : [...new Set([...selectedIds.value, ...visible])];
  savePool();
}
function clearClassQuestions() {
  selectedIds.value = [];
  savePool();
}
function savePool() {
  const code = licenseClass.value,
    ids = [...selectedIds.value],
    version = ++poolSaveVersion;
  saving.value = true;
  poolSaveQueue = poolSaveQueue
    .catch(() => {})
    .then(async () => {
      await api.quizAssignBankClass(code, ids);
      classCounts.value[code] = ids.length;
      emit("data-updated");
      if (licenseClass.value === code)
        notify(`Đã tự lưu ${ids.length} câu cho hạng ${code}`);
    })
    .catch((error) => {
      if (licenseClass.value === code)
        notify(error.message || "Không tự lưu được lựa chọn", true);
    })
    .finally(() => {
      if (version === poolSaveVersion) saving.value = false;
    });
  return poolSaveQueue;
}
async function saveLiveQuestionCount() {
  saving.value = true;
  try {
    licenseClasses.value = await api.quizUpdateLicenseClassLiveCount(
      licenseClass.value,
      liveQuestionCount.value,
    );
    liveQuestionCount.value =
      licenseClasses.value.find((item) => item.code === licenseClass.value)
        ?.liveCount || 25;
    emit("data-updated");
    notify(
      `Hạng ${licenseClass.value}: mỗi phiên live sẽ phát ngẫu nhiên ${liveQuestionCount.value} câu`,
    );
  } catch (error) {
    notify(error.message || "Không lưu được số câu live", true);
  } finally {
    saving.value = false;
  }
}
function openClassModal(item = null) {
  classEditing.value = item?.code || "";
  classCode.value = item?.code || "";
  className.value = item?.name || "";
  modal.value = "class";
}
async function saveClass() {
  const wasEditing = !!classEditing.value;
  const code = wasEditing
    ? classEditing.value
    : classCode.value.trim().toUpperCase();
  try {
    licenseClasses.value = wasEditing
      ? await api.quizUpdateLicenseClass(code, className.value)
      : await api.quizCreateLicenseClass(classCode.value, className.value);
    closeModal();
    await loadBank();
    await selectClass(code);
    emit("data-updated");
    notify(wasEditing ? `Đã cập nhật hạng ${code}.` : `Đã thêm hạng ${code}.`);
  } catch (error) {
    notify(
      `Không ${wasEditing ? "cập nhật" : "thêm"} được hạng ${code || "GPLX"}: ${error.message || "Lỗi không xác định."}`,
      true,
    );
  }
}
async function deleteClass(code) {
  if (
    !window.confirm(
      `Xoá hạng ${code}? Các câu hỏi sẽ không còn được gán cho hạng này.`,
    )
  )
    return;
  try {
    licenseClasses.value = await api.quizDeleteLicenseClass(code);
    delete classCounts.value[code];
    if (licenseClass.value === code) licenseClass.value = "";
    await loadBank();
    if (!licenseClass.value && licenseClasses.value.length)
      await selectClass(licenseClasses.value[0].code);
    emit("data-updated");
    notify(`Đã xoá hạng ${code}`);
  } catch (error) {
    notify(error.message || "Không xoá được hạng", true);
  }
}
function openQuestionModal(item = null) {
  editingId.value = item?.id || null;
  question.value = item?.question || "";
  options.value = item ? [...item.options] : ["", "", "", ""];
  answer.value = item?.answer || 0;
  image.value = item?.image || "";
  questionClasses.value = item ? [...item.classes] : [];
  modal.value = "question";
}
function selectImage(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  if (
    !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(
      file.type,
    ) ||
    file.size > 5 * 1024 * 1024
  )
    return notify("Chọn ảnh PNG, JPG, WebP hoặc GIF nhỏ hơn 5 MB", true);
  const reader = new FileReader();
  reader.onload = () => {
    image.value = String(reader.result || "");
  };
  reader.onerror = () => notify("Không đọc được tệp ảnh", true);
  reader.readAsDataURL(file);
}
async function saveBankQuestion() {
  if (saving.value) return;
  const wasEditing = !!editingId.value;
  saving.value = true;
  try {
    await api.quizBankSaveQuestion({
      id: editingId.value,
      question: question.value,
      options: [...options.value],
      answer: answer.value,
      image: image.value,
      classes: [...questionClasses.value],
    });
    closeModal();
    await loadBank();
    await loadClassQuestions();
    await Promise.all(
      licenseClasses.value.map(async (item) => {
        const result = await api.quizBankClassQuestions(item.code);
        classCounts.value[item.code] = result.assignedIds?.length || 0;
      }),
    );
    emit("data-updated");
    notify(
      wasEditing
        ? "Đã cập nhật câu hỏi và các hạng áp dụng."
        : "Đã thêm câu hỏi vào ngân hàng và gán hạng thành công.",
    );
  } catch (error) {
    notify(
      `Không ${wasEditing ? "cập nhật" : "thêm"} được câu hỏi: ${error.message || "Lỗi không xác định."}`,
      true,
    );
  } finally {
    saving.value = false;
  }
}
async function deleteBankQuestion(id) {
  const item = bankQuestions.value.find((question) => question.id === id);
  const summary = item?.question
    ? `\n\n${item.question.slice(0, 140)}${item.question.length > 140 ? "…" : ""}`
    : "";
  if (
    !window.confirm(
      `Bạn có chắc muốn xoá câu hỏi này khỏi ngân hàng nguồn?${summary}`,
    )
  )
    return;
  try {
    await api.quizBankDeleteQuestion(id);
    await loadBank();
    await loadClassQuestions();
    emit("data-updated");
    notify("Đã xoá câu hỏi khỏi ngân hàng");
  } catch (error) {
    notify(error.message || "Không xoá được câu hỏi", true);
  }
}
function closeModal() {
  modal.value = "";
}
onMounted(async () => {
  const required = [
    "quizLicenseClasses",
    "quizCreateLicenseClass",
    "quizUpdateLicenseClassLiveCount",
    "quizBankSaveQuestion",
  ];
  const missing = required.filter((name) => typeof api[name] !== "function");
  if (missing.length) {
    const reloadKey = "studiolive-preload-refresh-attempted";
    if (location.port === "5173" && !sessionStorage.getItem(reloadKey)) {
      sessionStorage.setItem(reloadKey, "1");
      location.reload();
      return;
    }
    notify(
      "Preload Electron đang cũ nên thiếu API quản lý hạng. Hãy khởi động lại app một lần để nạp bridge mới.",
      true,
    );
    return;
  }
  sessionStorage.removeItem("studiolive-preload-refresh-attempted");
  try {
    const init = await api.init();
    serverPort.value = Number(init.server?.port) || 3000;
    await Promise.all([loadClasses(), loadBank()]);
    if (!licenseClass.value)
      licenseClass.value = licenseClasses.value[0]?.code || "";
    await loadClassQuestions();
    for (const item of licenseClasses.value) {
      const result = await api.quizBankClassQuestions(item.code);
      classCounts.value[item.code] = result.assignedIds?.length || 0;
    }
  } catch (error) {
    notify(error.message || "Không tải được ngân hàng GPLX", true);
  }
});
</script>
