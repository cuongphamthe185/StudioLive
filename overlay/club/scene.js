/*
 * Cầu nối cho cảnh DJ Club 3D: overlay.js là script thường và gọi window.ClubScene ngay khi tải trang,
 * còn cảnh 3D (club3d.js) là ES module nạp sau. File này giữ các lời gọi lại và chuyển cho cảnh 3D khi nó sẵn sàng.
 */
(() => {
  'use strict';
  const queue = [];
  let impl = null;
  const api = {};
  ['init', 'setConfig', 'onEvent', 'onStats', 'onRank', 'command', 'setPaused'].forEach((fn) => {
    api[fn] = (...args) => {
      if (impl) return impl[fn](...args);
      // chỉ giữ cấu hình / bảng xếp hạng mới nhất, sự kiện thì giữ tối đa 50 cái
      if (fn === 'setConfig' || fn === 'onRank' || fn === 'onStats') {
        const i = queue.findIndex(([f]) => f === fn);
        if (i >= 0) queue.splice(i, 1);
      }
      queue.push([fn, args]);
      if (queue.length > 60) queue.splice(1, queue.length - 60);
      return undefined;
    };
  });
  api.isOn = () => (impl ? impl.isOn() : false);
  window.ClubScene = api;
  window.__clubRegister = (i) => {
    impl = i;
    // init phải chạy trước
    queue.sort((a, b) => (a[0] === 'init' ? -1 : b[0] === 'init' ? 1 : 0));
    for (const [fn, args] of queue.splice(0)) impl[fn](...args);
  };
})();
