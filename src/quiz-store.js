'use strict';
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const SEED = [
  ['Khi gặp đèn tín hiệu màu đỏ, người điều khiển phương tiện phải làm gì?', ['Tăng tốc đi qua', 'Dừng trước vạch dừng', 'Bấm còi rồi đi', 'Chỉ dừng khi có CSGT'], 1],
  ['Khi người đi bộ đang đi trên vạch sang đường, bạn nên làm gì?', ['Giảm tốc và nhường đường', 'Bấm còi để họ đi nhanh', 'Lách qua phía trước', 'Tăng tốc vượt qua'], 0],
  ['Trước khi chuyển hướng, người lái xe cần làm gì?', ['Chỉ cần giảm tốc độ', 'Quan sát, bật tín hiệu và chuyển hướng an toàn', 'Bấm còi liên tục', 'Chuyển hướng ngay nếu đường vắng'], 1],
  ['Khi đi xe máy, mũ bảo hiểm cần được sử dụng thế nào?', ['Đội và cài quai đúng cách', 'Để trên xe khi đi gần', 'Chỉ đội khi đi đường lớn', 'Đội nhưng không cần cài quai'], 0],
  ['Khi có xe ưu tiên phát tín hiệu, người tham gia giao thông nên làm gì?', ['Tăng tốc đi trước', 'Nhường đường theo quy định', 'Đi sát phía sau xe ưu tiên', 'Dừng giữa giao lộ'], 1],
  ['Khi điều khiển xe, sử dụng điện thoại cầm tay có an toàn không?', ['An toàn nếu đi chậm', 'Chỉ nguy hiểm ban đêm', 'Không, vì làm mất tập trung', 'Được phép khi đường vắng'], 2],
  ['Khi trời mưa, mặt đường trơn, bạn nên làm gì?', ['Tăng tốc để tránh mưa', 'Giữ khoảng cách và giảm tốc độ', 'Phanh gấp khi vào cua', 'Đi sát xe phía trước'], 1],
  ['Vạch kẻ đường và biển báo giao thông có ý nghĩa gì?', ['Chỉ để trang trí đường', 'Hướng dẫn và điều tiết giao thông', 'Chỉ áp dụng khi có cảnh sát', 'Có thể bỏ qua khi đường vắng'], 1],
  ['Khi đi qua đường sắt có rào chắn đang hạ, bạn phải làm gì?', ['Luồn qua nếu chưa thấy tàu', 'Dừng lại trước vạch hoặc rào chắn', 'Đi theo xe phía trước', 'Bấm còi xin đi qua'], 1],
  ['Khi buồn ngủ trong lúc lái xe đường dài, cách xử lý an toàn là gì?', ['Mở nhạc lớn và tiếp tục', 'Tăng tốc để tới nhanh hơn', 'Dừng ở nơi an toàn để nghỉ', 'Uống nước rồi chạy tiếp'], 2]
];
const LICENSE_CLASSES = ['A1', 'A', 'B1', 'B', 'C1', 'C', 'D1', 'D2', 'D', 'BE', 'C1E', 'CE', 'D1E', 'D2E', 'DE'];
const DEFAULT_LIVE_COUNTS = Object.fromEntries(LICENSE_CLASSES.map((code) => [code, ['A1', 'A', 'B1'].includes(code) ? 25 : ['B', 'C1'].includes(code) ? 30 : 45]));

class QuizStore {
  constructor(userDataDir) {
    fs.mkdirSync(userDataDir, { recursive: true });
    this.db = new DatabaseSync(path.join(userDataDir, 'quiz.sqlite'));
    this.db.exec('PRAGMA foreign_keys = ON; CREATE TABLE IF NOT EXISTS quiz_sets (id INTEGER PRIMARY KEY, title TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP); CREATE TABLE IF NOT EXISTS questions (id INTEGER PRIMARY KEY, set_id INTEGER NOT NULL REFERENCES quiz_sets(id) ON DELETE CASCADE, question TEXT NOT NULL, options TEXT NOT NULL, answer INTEGER NOT NULL CHECK(answer BETWEEN 0 AND 3), position INTEGER NOT NULL DEFAULT 0, license_classes TEXT NOT NULL DEFAULT \'["A1","A","B1","B","C1","C","D1","D2","D","BE","C1E","CE","D1E","D2E","DE"]\', image TEXT NOT NULL DEFAULT \'\'); CREATE TABLE IF NOT EXISTS app_state (key TEXT PRIMARY KEY, value TEXT NOT NULL);');
    this.db.exec('CREATE TABLE IF NOT EXISTS license_classes (code TEXT PRIMARY KEY, name TEXT NOT NULL, live_count INTEGER NOT NULL DEFAULT 25);');
    if (!this.db.prepare('PRAGMA table_info(license_classes)').all().some((c) => c.name === 'live_count')) this.db.exec('ALTER TABLE license_classes ADD COLUMN live_count INTEGER NOT NULL DEFAULT 25');
    const addClass = this.db.prepare('INSERT OR IGNORE INTO license_classes(code,name,live_count) VALUES (?,?,?)');
    LICENSE_CLASSES.forEach((code) => addClass.run(code, code, DEFAULT_LIVE_COUNTS[code]));
    if (!this.db.prepare("SELECT value FROM app_state WHERE key='license_live_count_defaults_v1'").get()) {
      const existing = this.db.prepare('SELECT code,live_count FROM license_classes').all();
      if (existing.length && existing.every((row) => Number(row.live_count) === 25)) {
        const updateCount = this.db.prepare('UPDATE license_classes SET live_count=? WHERE code=?');
        for (const [code, count] of Object.entries(DEFAULT_LIVE_COUNTS)) updateCount.run(count, code);
      }
      this.db.prepare("INSERT OR REPLACE INTO app_state(key,value) VALUES ('license_live_count_defaults_v1','applied')").run();
    }
    if (!this.db.prepare('PRAGMA table_info(questions)').all().some((c) => c.name === 'image')) this.db.exec("ALTER TABLE questions ADD COLUMN image TEXT NOT NULL DEFAULT ''");
    if (!this.db.prepare('PRAGMA table_info(questions)').all().some((c) => c.name === 'license_classes')) {
      this.db.exec('ALTER TABLE questions ADD COLUMN license_classes TEXT NOT NULL DEFAULT \'["A1","A","B1","B","C1","C","D1","D2","D","BE","C1E","CE","D1E","D2E","DE"]\'');
    }
    if (!this.db.prepare('SELECT id FROM quiz_sets LIMIT 1').get()) {
      const result = this.db.prepare('INSERT INTO quiz_sets(title) VALUES (?)').run('Bộ câu hỏi mẫu GPLX');
      const insert = this.db.prepare('INSERT INTO questions(set_id, question, options, answer, position) VALUES (?, ?, ?, ?, ?)');
      SEED.forEach(([question, options, answer], i) => insert.run(Number(result.lastInsertRowid), question, JSON.stringify(options), answer, i));
      this.db.prepare("INSERT OR REPLACE INTO app_state(key,value) VALUES ('active_set',?)").run(String(result.lastInsertRowid));
    }
    if (!this.db.prepare("SELECT value FROM app_state WHERE key='active_set'").get()) this.db.prepare("INSERT INTO app_state(key,value) SELECT 'active_set', CAST(id AS TEXT) FROM quiz_sets ORDER BY id LIMIT 1").run();
  }
  listSets() { return this.db.prepare('SELECT s.id, s.title, COUNT(q.id) AS count FROM quiz_sets s LEFT JOIN questions q ON q.set_id=s.id GROUP BY s.id ORDER BY s.id').all(); }
  listLicenseClasses() { return this.db.prepare('SELECT code,name,live_count AS liveCount FROM license_classes ORDER BY rowid').all(); }
  hasLicenseClass(code) { return !!this.db.prepare('SELECT code FROM license_classes WHERE code=?').get(String(code)); }
  createLicenseClass(code, name) {
    code = String(code || '').trim().toUpperCase(); name = String(name || '').trim().slice(0, 60);
    if (!/^[A-Z0-9]{1,8}$/.test(code) || !name) throw new Error('Nhập mã hạng (1–8 ký tự) và tên hạng');
    if (this.hasLicenseClass(code)) throw new Error('Mã hạng GPLX đã tồn tại');
    this.db.prepare('INSERT INTO license_classes(code,name,live_count) VALUES (?,?,?)').run(code, name, DEFAULT_LIVE_COUNTS[code] || 25);
    return this.listLicenseClasses();
  }
  updateLicenseClass(code, name) {
    code = String(code || '').trim().toUpperCase(); name = String(name || '').trim().slice(0, 60);
    if (!this.hasLicenseClass(code) || !name) throw new Error('Chọn hạng và nhập tên hợp lệ');
    this.db.prepare('UPDATE license_classes SET name=? WHERE code=?').run(name, code);
    return this.listLicenseClasses();
  }
  updateLicenseClassLiveCount(code, count) {
    code = String(code || '').trim().toUpperCase();
    count = Math.min(600, Math.max(1, Math.round(Number(count) || 25)));
    if (!this.hasLicenseClass(code)) throw new Error('Không tìm thấy hạng GPLX');
    this.db.prepare('UPDATE license_classes SET live_count=? WHERE code=?').run(count, code);
    return this.listLicenseClasses();
  }
  deleteLicenseClass(code) {
    code = String(code || '').trim().toUpperCase();
    if (!this.hasLicenseClass(code)) throw new Error('Không tìm thấy hạng GPLX');
    if (this.listLicenseClasses().length <= 1) throw new Error('Phải giữ lại ít nhất một hạng GPLX');
    this.db.prepare('DELETE FROM license_classes WHERE code=?').run(code);
    const update = this.db.prepare('UPDATE questions SET license_classes=? WHERE id=?');
    for (const row of this.db.prepare('SELECT id,license_classes FROM questions').all()) {
      const classes = JSON.parse(row.license_classes).filter((item) => item !== code);
      update.run(JSON.stringify(classes), row.id);
    }
    return this.listLicenseClasses();
  }
  activeId() { return Number(this.db.prepare("SELECT value FROM app_state WHERE key='active_set'").get()?.value || 0); }
  setActive(id) {
    id = Number(id); if (!this.db.prepare('SELECT id FROM quiz_sets WHERE id=?').get(id)) throw new Error('Không tìm thấy bộ đề');
    this.db.prepare("INSERT OR REPLACE INTO app_state(key,value) VALUES ('active_set',?)").run(String(id)); return this.activeData();
  }
  activeData(licenseClass = '') {
    const set = this.getSet(this.activeId());
    if (!set || !licenseClass) return set;
    set.questions = set.questions.filter((q) => q.classes.includes(licenseClass));
    return set;
  }
  getSet(id) {
    const set = this.db.prepare('SELECT id,title FROM quiz_sets WHERE id=?').get(Number(id)); if (!set) return null;
    return { ...set, questions: this.db.prepare('SELECT id,question,options,answer,license_classes,image FROM questions WHERE set_id=? ORDER BY position,id').all(set.id).map(q => ({ id:q.id, question:q.question, options:JSON.parse(q.options), answer:q.answer, classes:JSON.parse(q.license_classes), image:q.image || '' })) };
  }
  createSet(title) {
    title = String(title || '').trim().slice(0, 100); if (!title) throw new Error('Nhập tên bộ đề');
    const id = Number(this.db.prepare('INSERT INTO quiz_sets(title) VALUES (?)').run(title).lastInsertRowid);
    this.setActive(id); return this.getSet(id);
  }
  renameSet(id, title) {
    title = String(title || '').trim().slice(0, 100); if (!title) throw new Error('Nhập tên bộ đề');
    this.db.prepare('UPDATE quiz_sets SET title=? WHERE id=?').run(title, Number(id)); return this.getSet(id);
  }
  deleteSet(id) {
    id = Number(id); this.db.prepare('DELETE FROM quiz_sets WHERE id=?').run(id);
    if (this.activeId() === id) { const next = this.db.prepare('SELECT id FROM quiz_sets ORDER BY id LIMIT 1').get(); this.db.prepare("INSERT OR REPLACE INTO app_state(key,value) VALUES ('active_set',?)").run(next ? String(next.id) : '0'); }
    if (!this.listSets().length) this.createSet('Bộ đề mới'); return this.activeData();
  }
  saveQuestion(q) {
    const id = Number(q.setId); const question = String(q.question || '').trim().slice(0, 500);
    const options = Array.isArray(q.options) ? q.options.map(x => String(x || '').trim().slice(0, 300)) : [];
    const answer = Number(q.answer);
    const image = this.validateImage(q.image);
    const classes = Array.isArray(q.classes) ? [...new Set(q.classes.filter((x) => this.hasLicenseClass(x)))] : this.listLicenseClasses().map((x) => x.code);
    if (!this.db.prepare('SELECT id FROM quiz_sets WHERE id=?').get(id)) throw new Error('Chọn bộ đề');
    if (!question || options.length < 2 || options.length > 4 || options.some(x => !x) || !Number.isInteger(answer) || answer < 0 || answer >= options.length) throw new Error('Nhập câu hỏi, từ 2 đến 4 lựa chọn và chọn đáp án đúng');
    if (q.id) this.db.prepare('UPDATE questions SET question=?,options=?,answer=?,license_classes=?,image=? WHERE id=? AND set_id=?').run(question, JSON.stringify(options), answer, JSON.stringify(classes), image, Number(q.id), id);
    else { const pos = this.db.prepare('SELECT COALESCE(MAX(position),-1)+1 AS n FROM questions WHERE set_id=?').get(id).n; this.db.prepare('INSERT INTO questions(set_id,question,options,answer,position,license_classes,image) VALUES (?,?,?,?,?,?,?)').run(id, question, JSON.stringify(options), answer, pos, JSON.stringify(classes), image); }
    return this.getSet(id);
  }
  importQuestions(setId, items) {
    const id = Number(setId);
    if (!this.db.prepare('SELECT id FROM quiz_sets WHERE id=?').get(id)) throw new Error('Chọn bộ đề');
    if (!Array.isArray(items) || !items.length || items.length > 1000) throw new Error('File cần có từ 1 đến 1.000 câu hỏi');
    const insert = this.db.prepare('INSERT INTO questions(set_id,question,options,answer,position,license_classes,image) VALUES (?,?,?,?,?,?,?)');
    const update = this.db.prepare('UPDATE questions SET question=?,options=?,answer=?,license_classes=?,image=? WHERE id=? AND set_id=?');
    try {
      this.db.exec('BEGIN');
      items.forEach((q, i) => {
        const question = String(q.question || '').trim().slice(0, 500);
        const options = Array.isArray(q.options) ? q.options.map((x) => String(x || '').trim().slice(0, 300)) : [];
        const answer = Number(q.answer);
        const image = this.validateImage(q.image);
        const classes = Array.isArray(q.classes) ? [...new Set(q.classes.filter((x) => this.hasLicenseClass(x)))] : this.listLicenseClasses().map((x) => x.code);
        if (!question || options.length < 2 || options.length > 4 || options.some((x) => !x) || !Number.isInteger(answer) || answer < 0 || answer >= options.length || !classes.length) throw new Error(`Câu ${i + 1}: dữ liệu câu hỏi/đáp án không hợp lệ`);
        if (q.id) update.run(question, JSON.stringify(options), answer, JSON.stringify(classes), image, Number(q.id), id);
        else insert.run(id, question, JSON.stringify(options), answer, this.db.prepare('SELECT COALESCE(MAX(position),-1)+1 AS n FROM questions WHERE set_id=?').get(id).n, JSON.stringify(classes), image);
      });
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
    return this.getSet(id);
  }
  copyQuestions(targetSetId, sourceIds, licenseClass) {
    const targetId = Number(targetSetId);
    if (!this.db.prepare('SELECT id FROM quiz_sets WHERE id=?').get(targetId)) throw new Error('Chọn bộ đề cần thêm câu hỏi');
    const sourceSet = this.db.prepare("SELECT id FROM quiz_sets WHERE title='Ngân hàng 600 câu GPLX · MeoThiLaiXe'").get();
    if (!sourceSet || targetId === Number(sourceSet.id)) throw new Error('Chọn một bộ đề riêng để sao chép câu hỏi');
    if (!this.hasLicenseClass(licenseClass)) throw new Error('Chọn hạng GPLX');
    const ids = [...new Set((Array.isArray(sourceIds) ? sourceIds : []).map(Number).filter(Number.isInteger))];
    if (!ids.length || ids.length > 600) throw new Error('Chọn từ 1 đến 600 câu hỏi');
    const rows = this.db.prepare(`SELECT id,question,options,answer,image FROM questions WHERE set_id=? AND id IN (${ids.map(() => '?').join(',')})`).all(sourceSet.id, ...ids);
    if (rows.length !== ids.length) throw new Error('Một số câu hỏi không còn trong ngân hàng nguồn');
    const insert = this.db.prepare('INSERT INTO questions(set_id,question,options,answer,position,license_classes,image) VALUES (?,?,?,?,?,?,?)');
    let position = this.db.prepare('SELECT COALESCE(MAX(position),-1)+1 AS n FROM questions WHERE set_id=?').get(targetId).n;
    this.db.exec('BEGIN');
    try {
      for (const id of ids) {
        const row = rows.find((item) => item.id === id);
        insert.run(targetId, row.question, row.options, row.answer, position++, JSON.stringify([licenseClass]), row.image || '');
      }
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
    return this.getSet(targetId);
  }
  sourceBank() { return this.db.prepare("SELECT id FROM quiz_sets WHERE title='Ngân hàng 600 câu GPLX · MeoThiLaiXe'").get(); }
  initializeBankClasses(sourceQuestions) {
    if (this.db.prepare("SELECT value FROM app_state WHERE key='bank_class_assignment_v2'").get()) return false;
    const bank = this.sourceBank();
    if (!bank) return false;
    const rows = this.db.prepare('SELECT id,license_classes FROM questions WHERE set_id=? ORDER BY position,id').all(bank.id);
    const allUniversal = rows.length === 600 && rows.every((row) => {
      const classes = JSON.parse(row.license_classes);
      return classes.length === LICENSE_CLASSES.length && LICENSE_CLASSES.every((code) => classes.includes(code));
    });
    const priorAutoClear = this.db.prepare("SELECT value FROM app_state WHERE key='bank_class_assignment_v1'").get()?.value === 'cleared-universal-default';
    const allCleared = rows.length === 600 && rows.every((row) => JSON.parse(row.license_classes).length === 0);
    const source = Array.isArray(sourceQuestions) ? sourceQuestions : [];
    if ((allUniversal || (priorAutoClear && allCleared)) && rows.length === source.length) {
      const update = this.db.prepare('UPDATE questions SET license_classes=? WHERE id=?');
      this.db.exec('BEGIN');
      try {
        rows.forEach((row, index) => {
          const classes = [...new Set((Array.isArray(source[index]?.classes) ? source[index].classes : []).filter((code) => this.hasLicenseClass(code)))];
          update.run(JSON.stringify(classes), row.id);
        });
        this.db.exec('COMMIT');
      } catch (error) { this.db.exec('ROLLBACK'); throw error; }
    }
    this.db.prepare("INSERT OR REPLACE INTO app_state(key,value) VALUES ('bank_class_assignment_v2','initialized-from-source')").run();
    return allUniversal || (priorAutoClear && allCleared);
  }
  getBank() { const bank = this.sourceBank(); return bank ? this.getSet(bank.id) : { questions: [] }; }
  saveBankQuestion(question) {
    const bank = this.sourceBank(); if (!bank) throw new Error('Chưa có ngân hàng câu hỏi nguồn');
    if (question?.id) {
      const old = this.db.prepare('SELECT license_classes FROM questions WHERE id=? AND set_id=?').get(Number(question.id), bank.id);
      if (!old) throw new Error('Không tìm thấy câu hỏi trong ngân hàng nguồn');
      question = { ...question, classes: Array.isArray(question.classes) ? question.classes : JSON.parse(old.license_classes), setId: bank.id };
    } else question = { ...question, classes: Array.isArray(question.classes) ? question.classes : [], setId: bank.id };
    this.saveQuestion(question);
    return this.getSet(bank.id);
  }
  deleteBankQuestion(id) {
    const bank = this.sourceBank(); if (!bank) throw new Error('Chưa có ngân hàng câu hỏi nguồn');
    this.db.prepare('DELETE FROM questions WHERE id=? AND set_id=?').run(Number(id), bank.id);
    return this.getSet(bank.id);
  }
  bankQuestionsForClass(licenseClass) {
    if (!this.hasLicenseClass(licenseClass)) throw new Error('Chọn hạng GPLX');
    const bank = this.sourceBank();
    if (!bank) return { questions: [] };
    const data = this.getSet(bank.id);
    return { ...data, assignedIds: data.questions.filter((q) => q.classes.includes(licenseClass)).map((q) => q.id) };
  }
  assignBankQuestions(licenseClass, sourceIds) {
    if (!this.hasLicenseClass(licenseClass)) throw new Error('Chọn hạng GPLX');
    const bank = this.sourceBank();
    if (!bank) throw new Error('Chưa có ngân hàng 600 câu nguồn');
    const ids = [...new Set((Array.isArray(sourceIds) ? sourceIds : []).map(Number).filter((id) => Number.isInteger(id) && id > 0))];
    const all = this.db.prepare('SELECT id,license_classes FROM questions WHERE set_id=?').all(bank.id);
    if (ids.length > all.length || ids.some((id) => !all.some((row) => row.id === id))) throw new Error('Danh sách câu hỏi không hợp lệ');
    const chosen = new Set(ids);
    const update = this.db.prepare('UPDATE questions SET license_classes=? WHERE id=? AND set_id=?');
    this.db.exec('BEGIN');
    try {
      for (const row of all) {
        const classes = new Set(JSON.parse(row.license_classes));
        if (chosen.has(row.id)) classes.add(licenseClass); else classes.delete(licenseClass);
        update.run(JSON.stringify([...classes]), row.id, bank.id);
      }
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
    return this.bankQuestionsForClass(licenseClass);
  }
  validateImage(value) {
    const image = String(value || '');
    if (!image) return '';
    if (/^\/quiz-images\/cau\d+\.(png|jpe?g|webp)$/i.test(image)) return image;
    if (/^https:\/\/meothilaixe\.top\/images\/cau\d+\.(png|jpe?g|webp)$/i.test(image)) return image;
    if (image.length > 7_000_000 || !/^data:image\/(png|jpeg|webp|gif);base64,[a-z\d+/]+=*$/i.test(image)) throw new Error('Ảnh phải là PNG, JPG, WebP hoặc GIF nhỏ hơn 5 MB, hoặc ảnh từ ngân hàng MeoThiLaiXe');
    return image;
  }
  // Ảnh ngân hàng câu hỏi nằm sẵn trong app (data/quiz-images, định dạng WebP cho nhẹ).
  // Chuyển các đường dẫn cũ (link meothilaixe.top, file .png bản trước) sang file WebP có sẵn.
  localizeMeoThiImages() {
    const rows = this.db.prepare("SELECT id,image FROM questions WHERE image LIKE 'https://meothilaixe.top/images/cau%' OR image LIKE '/quiz-images/cau%.png'").all();
    if (!rows.length) return;
    const update = this.db.prepare('UPDATE questions SET image=? WHERE id=?');
    const root = path.join(__dirname, '..', 'data', 'quiz-images');
    this.db.exec('BEGIN');
    try {
      for (const row of rows) {
        const match = String(row.image).match(/\/(cau\d+)\.(png|jpe?g|webp)$/i);
        const file = match && `${match[1]}.webp`;
        if (file && fs.existsSync(path.join(root, file))) update.run(`/quiz-images/${file}`, row.id);
      }
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  deleteQuestion(id) { this.db.prepare('DELETE FROM questions WHERE id=?').run(Number(id)); return this.activeData(); }
}
module.exports = { QuizStore, LICENSE_CLASSES };
