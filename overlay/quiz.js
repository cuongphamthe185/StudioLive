(() => {
  'use strict';
  let data = null, index = 0, reveal = false, root, voiceEnabled = false, speakAnswerEnabled = true, voiceGender = 'male', alternatingVoice = 'male', voiceRate = 1, tickEnabled = true;
  let seconds = 5, remaining = 5, running = false, countdownActive = false, loopEnabled = true, finished = false, tickTimer = 0, advanceTimer = 0, advanceCallback = () => {};
  let votes = new Map();
  let speechQueue = [], speechBusy = false, speechToken = 0, speechAudios = [], speechIdleCallbacks = [];
  let audioContext = null, bgMusic = null, musicEnabled = false, musicMuted = false;
  function syncBackgroundMusic() {
    if (!musicEnabled || musicMuted) { if (bgMusic) bgMusic.pause(); return; }
    if (!bgMusic) { bgMusic = new Audio('/chua-assets/music1.mp3'); bgMusic.loop = true; }
    bgMusic.volume = speechBusy || speechQueue.length ? 0.08 : 0.18;
    if (bgMusic.paused) bgMusic.play().catch(() => {});
  }
  const stopTimers = () => { clearInterval(tickTimer); clearTimeout(advanceTimer); tickTimer = 0; advanceTimer = 0; };
  function flushSpeechIdle() {
    if (speechBusy || speechQueue.length) return;
    const callbacks = speechIdleCallbacks.splice(0);
    callbacks.forEach((callback) => callback());
  }
  function afterSpeech(callback) {
    if (!speechBusy && !speechQueue.length) callback();
    else speechIdleCallbacks.push(callback);
  }
  function stopSpeech() {
    speechToken++; speechQueue = []; speechBusy = false;
    speechAudios.forEach((audio) => { audio.pause(); audio.currentTime = 0; }); speechAudios = [];
    window.speechSynthesis?.cancel();
    syncBackgroundMusic();
    flushSpeechIdle();
  }
  function say(text, channel = 'question') {
    const enabled = channel === 'answer' ? speakAnswerEnabled : voiceEnabled;
    if (enabled && text) { speechQueue.push({ text: String(text), channel }); pumpSpeech(); }
  }
  function pumpSpeech() {
    if (speechBusy) return;
    if (!speechQueue.length) { flushSpeechIdle(); return; }
    const item = speechQueue.shift();
    const enabled = item.channel === 'answer' ? speakAnswerEnabled : voiceEnabled;
    if (!enabled) { pumpSpeech(); return; }
    speechBusy = true;
    syncBackgroundMusic();
    const text = item.text;
    const token = speechToken;
    const done = () => { if (token !== speechToken) return; speechBusy = false; speechAudios = []; syncBackgroundMusic(); pumpSpeech(); };
    let fallbackStarted = false, tracksEnded = 0;
    const fallback = () => {
      if (token !== speechToken || fallbackStarted) return;
      fallbackStarted = true;
      speechAudios.forEach((audio) => { audio.pause(); audio.currentTime = 0; }); speechAudios = [];
      const synth = window.speechSynthesis;
      if (!synth || !window.SpeechSynthesisUtterance) return done();
      const utterance = new SpeechSynthesisUtterance(text); utterance.lang = 'vi-VN'; utterance.rate = Math.min(1.3, Math.max(0.7, voiceRate));
      utterance.onend = done; utterance.onerror = done; synth.speak(utterance);
    };
    const genders = voiceGender === 'both' ? ['female', 'male'] : [voiceGender === 'alternating' ? alternatingVoice : voiceGender];
    if (voiceGender === 'alternating') alternatingVoice = alternatingVoice === 'male' ? 'female' : 'male';
    speechAudios = genders.map((gender) => {
      const audio = new Audio(`/api/tts?rate=${voiceRate}&voice=${gender}&text=${encodeURIComponent(text)}`);
      audio.volume = genders.length > 1 ? 0.72 : 1;
      audio.onended = () => { if (++tracksEnded >= genders.length) done(); };
      audio.onerror = fallback;
      return audio;
    });
    Promise.all(speechAudios.map((audio) => audio.play().catch(fallback)));
  }
  function readQuestion() {
    const item = data?.questions?.[index]; if (!item) return;
    stopSpeech();
    say(item.question);
    const answerLetters = 'ABCD'.slice(0, item.options.length).split('').join(', ');
    say(`Theo bạn chọn đáp án nào? ${answerLetters}?`);
    say(`Bạn có ${seconds} giây để chọn.`);
  }
  function celebrateCorrectAnswers() {
    const layer = root.querySelector('.q-fireworks');
    const sparks = [];
    for (let burst = 0; burst < 7; burst++) {
      const x = 15 + Math.random() * 70, y = 22 + Math.random() * 44;
      for (let i = 0; i < 20; i++) {
        const angle = Math.PI * 2 * i / 20 + Math.random() * 0.12;
        const distance = 90 + Math.random() * 180;
        const spark = document.createElement('span');
        spark.className = 'q-spark';
        spark.style.setProperty('--x', `${x}%`); spark.style.setProperty('--y', `${y}%`);
        spark.style.setProperty('--dx', `${Math.cos(angle) * distance}px`); spark.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);
        spark.style.setProperty('--hue', String(Math.floor(Math.random() * 360)));
        spark.style.animationDelay = `${burst * 0.18}ms`;
        sparks.push(spark);
      }
    }
    layer.replaceChildren(...sparks);
    setTimeout(() => layer.replaceChildren(), 2100);
  }
  function playTick(remaining) {
    if (!tickEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      audioContext ||= new AudioCtx();
      if (audioContext.state === 'suspended') audioContext.resume();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const now = audioContext.currentTime;
      oscillator.type = 'sine'; oscillator.frequency.value = remaining <= 3 ? 1050 : 760;
      gain.gain.setValueAtTime(0.0001, now); gain.gain.exponentialRampToValueAtTime(0.11, now + 0.008); gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.085);
      oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(now); oscillator.stop(now + 0.09);
    } catch { /* AudioContext không khả dụng thì vẫn giữ bộ đếm */ }
  }
  function counts() {
    const result = { A: 0, B: 0, C: 0, D: 0 };
    for (const answer of votes.values()) result[answer]++;
    return result;
  }
  let fitFrame = 0;
  function fitQuestionToSafeArea() {
    if (!root) return;
    cancelAnimationFrame(fitFrame);
    fitFrame = requestAnimationFrame(() => {
      const content = root.querySelector('.q-content');
      const style = getComputedStyle(root);
      const available = root.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
      if (available <= 0) return;
      const image = content.querySelector('.q-question-image');
      const fitStage = (stage) => {
        if (content.scrollHeight <= available - 8) return;
        if (stage === 0 && image && !image.hidden) {
          const currentHeight = image.getBoundingClientRect().height;
          const overflow = content.scrollHeight - available + 8;
          image.style.maxHeight = `${Math.max(120, currentHeight - overflow)}px`;
        } else if (stage === 1) content.classList.add('q-fit-tight');
        else if (stage === 2) content.classList.add('q-fit-text');
      };
      content.classList.remove('q-fit-tight', 'q-fit-text');
      fitStage(0);
      requestAnimationFrame(() => {
        fitStage(1);
        requestAnimationFrame(() => fitStage(2));
      });
    });
  }
  function render() {
    const questions = data?.questions || [];
    const timer = root.querySelector('.q-timer');
    if (!questions.length) {
      root.querySelector('.q-count').textContent = data?.title || 'CHƯA CÓ CÂU HỎI';
    root.querySelector('.q-question-text').textContent = 'Chọn hạng GPLX và nhập ngân hàng câu hỏi trong StudioLive.';
      root.querySelector('.q-options').replaceChildren(); root.querySelector('.q-result').textContent = '';
      timer.textContent = ''; fitQuestionToSafeArea(); return;
    }
    index = ((index % questions.length) + questions.length) % questions.length;
    const item = questions[index];
    root.querySelector('.q-kicker').textContent = '🚦 Cùng Nhau Ôn Tập GPLX';
    root.querySelector('.q-count').textContent = `CÂU ${index + 1} / ${questions.length}`;
    root.querySelector('.q-question-text').textContent = item.question;
    root.querySelector('.q-prompt').textContent = `BÌNH LUẬN ${'ABCD'.slice(0, item.options.length).split('').join(' · ')} ĐỂ TRẢ LỜI`;
    const questionImage = root.querySelector('.q-question-image');
    const nextImageSrc = item.image || '';
    if (questionImage.getAttribute('src') !== nextImageSrc) questionImage.style.maxHeight = '';
    questionImage.hidden = !item.image;
    if (item.image) questionImage.src = item.image; else questionImage.removeAttribute('src');
    root.querySelector('.q-options').replaceChildren(...item.options.map((answer, i) => {
      const row = document.createElement('div'); row.className = 'q-option' + (reveal && i === item.answer ? ' correct' : '');
      const letter = document.createElement('b'); letter.textContent = 'ABCD'[i];
      row.append(letter, document.createTextNode(answer)); return row;
    }));
    timer.textContent = finished ? '🏁 HẾT ĐỀ' : running ? (countdownActive ? `⏱ ${remaining}` : '🔊') : '⏸';
    timer.classList.toggle('urgent', running && countdownActive && remaining <= 5);
    const voteCounts = counts();
    const total = Object.values(voteCounts).reduce((a, b) => a + b, 0);
    const correctCount = voteCounts['ABCD'[item.answer]];
    root.querySelector('.q-result').textContent = reveal
      ? `✅ Đáp án ${'ABCD'[item.answer]} · Đúng ${correctCount} / ${total} lượt chọn${correctCount ? '\n🎉 Chúc mừng các bạn đã chọn đáp án đúng!' : ''}`
      : (total ? `💬 ${total} lượt chọn · A ${voteCounts.A}  B ${voteCounts.B}  C ${voteCounts.C}  D ${voteCounts.D}` : '');
    fitQuestionToSafeArea();
  }
  function showAnswer(fromTimeout = false) {
    if (!data?.questions?.length || reveal || answerPending) return;
    answerPending = true;
    const revealAndRead = () => {
      answerPending = false;
      if (!data?.questions?.length || reveal) return;
      clearInterval(tickTimer); tickTimer = 0; countdownActive = false;
      reveal = true; render();
      const item = data.questions[index];
      if (speakAnswerEnabled) say(`Đáp án đúng là ${'ABCD'[item.answer]}. ${item.options[item.answer]}`, 'answer');
      const correctCount = counts()['ABCD'[item.answer]];
      if (correctCount > 0 || fromTimeout) celebrateCorrectAnswers();
      if (correctCount > 0) {
        if (speakAnswerEnabled) say('Chúc mừng các bạn đã chọn đáp án đúng!', 'answer');
      }
      if (running) afterSpeech(() => { if (running && reveal) advanceTimer = setTimeout(nextQuestion, 3000); });
    };
    afterSpeech(revealAndRead);
  }
  let answerPending = false;
  function startClock() {
    stopTimers(); running = true; countdownActive = false; remaining = seconds; reveal = false; answerPending = false; votes = new Map(); render();
    readQuestion();
    afterSpeech(() => {
      if (!running || reveal) return;
      countdownActive = true; render();
      playTick(remaining);
      tickTimer = setInterval(() => {
        remaining--;
        if (remaining <= 0) { remaining = 0; clearInterval(tickTimer); tickTimer = 0; showAnswer(true); }
        else { playTick(remaining); render(); }
      }, 1000);
    });
  }
  function nextQuestion() {
    if (!data?.questions?.length) return;
    if (index + 1 >= data.questions.length) {
      if (!loopEnabled) {
        running = false; countdownActive = false; finished = true; stopTimers(); stopSpeech(); advanceCallback(-2); render(); return;
      }
      advanceCallback(-1);
      return;
    }
    index++;
    finished = false;
    advanceCallback(index);
    votes = new Map(); reveal = false;
    if (running) startClock(); else { stopSpeech(); render(); }
  }
  window.QuizScene = {
    init() { root = document.querySelector('#quiz-ui'); render(); },
    setConfig(cfg, muted = false) {
      musicEnabled = cfg.quizMusic === true && cfg.mode === 'quiz';
      musicMuted = cfg.sound === false || muted;
      syncBackgroundMusic();
      loopEnabled = cfg.quizLoop !== false;
      voiceEnabled = !!cfg.quizVoice && !muted; tickEnabled = cfg.quizTickSound !== false && !muted;
      speakAnswerEnabled = cfg.quizSpeakAnswer !== false && cfg.sound !== false && !muted;
      voiceGender = ['female', 'male', 'alternating', 'both'].includes(cfg.quizVoiceGender) ? cfg.quizVoiceGender : 'male';
      alternatingVoice = 'male';
      voiceRate = Math.min(1.5, Math.max(0.6, Number(cfg.quizRate) || 1)); if (!voiceEnabled && !speakAnswerEnabled) stopSpeech();
      const colors = { '--quiz-bg': cfg.quizBgColor, '--quiz-accent': cfg.quizAccentColor, '--quiz-card': cfg.quizCardColor, '--quiz-text': cfg.quizTextColor };
      for (const [name, color] of Object.entries(colors)) if (/^#[0-9a-f]{6}$/i.test(String(color || ''))) root.style.setProperty(name, color);
      fitQuestionToSafeArea();
    },
    setData(next) { stopTimers(); stopSpeech(); data = next; index = 0; reveal = false; finished = false; answerPending = false; running = false; countdownActive = false; votes = new Map(); render(); },
    setAdvanceCallback(callback) { advanceCallback = typeof callback === 'function' ? callback : () => {}; },
    command(c) {
      if (!c) return;
      if (Number.isFinite(Number(c.seconds)) && Number(c.seconds) >= 5) seconds = Math.min(120, Number(c.seconds));
      if (c.action === 'start') { index = Number.isInteger(c.index) ? Math.max(0, c.index) : 0; finished = false; reveal = false; advanceCallback(index); startClock(); return; }
      if (c.action === 'pause') { if (Number.isInteger(c.index)) index = Math.max(0, c.index); reveal = !!c.reveal; answerPending = false; votes = new Map(); running = false; countdownActive = false; stopTimers(); stopSpeech(); render(); return; }
      if (c.action === 'next') { nextQuestion(); return; }
      if (c.action === 'finish') { running = false; countdownActive = false; finished = true; stopTimers(); stopSpeech(); render(); return; }
      if (c.action === 'prev') { index = (index + (data?.questions?.length || 1) - 1) % (data?.questions?.length || 1); advanceCallback(index); votes = new Map(); reveal = false; if (running) startClock(); else { stopSpeech(); render(); } return; }
      if (c.action === 'reset') { index = 0; finished = false; advanceCallback(index); running = false; countdownActive = false; stopTimers(); stopSpeech(); reveal = false; answerPending = false; votes = new Map(); render(); return; }
      if (c.action === 'reveal') { showAnswer(); return; }
      if (Number.isInteger(c.index)) { index = c.index; reveal = !!c.reveal; advanceCallback(index); render(); }
    },
    onEvent(ev) {
      const m = String(ev.text || '').trim().match(/^([abcd])(?:$|[\s.!])/i);
      if (!m || reveal) return;
      if ('ABCD'.indexOf(m[1].toUpperCase()) >= (data?.questions?.[index]?.options?.length || 0)) return;
      const who = String(ev.user?.uniqueId || ev.user?.nickname || 'anonymous');
      votes.set(who, m[1].toUpperCase()); render();
    }
  };
})();
