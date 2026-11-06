'use strict';
const { contextBridge, ipcRenderer } = require('electron');

const on = (channel) => (cb) => {
  const fn = (_e, data) => cb(data);
  ipcRenderer.on(channel, fn);
  return () => ipcRenderer.removeListener(channel, fn);
};

contextBridge.exposeInMainWorld('studio', {
  init: () => ipcRenderer.invoke('app:init'),
  updateSettings: (patch) => ipcRenderer.invoke('settings:update', patch),
  connect: (username) => ipcRenderer.invoke('live:connect', username),
  disconnect: () => ipcRenderer.invoke('live:disconnect'),
  captureSourceId: () => ipcRenderer.invoke('capture:source-id'),
  test: (type) => ipcRenderer.invoke('overlay:test', type),
  reloadOverlay: () => ipcRenderer.invoke('overlay:reload'),
  setPaused: (p) => ipcRenderer.invoke('overlay:pause', p),
  chua: (action, extra) => ipcRenderer.invoke('chua:command', { action, ...extra }),
  rap: (action, extra) => ipcRenderer.invoke('rap:command', { action, ...extra }),
  quiz: (action, extra) => ipcRenderer.invoke('quiz:command', { action, ...(extra || {}) }),
  quizList: () => ipcRenderer.invoke('quiz:list'),
  quizSetActive: (id) => ipcRenderer.invoke('quiz:set-active', id),
  quizCreateSet: (title) => ipcRenderer.invoke('quiz:create-set', title),
  quizRenameSet: (id, title) => ipcRenderer.invoke('quiz:rename-set', id, title),
  quizDeleteSet: (id) => ipcRenderer.invoke('quiz:delete-set', id),
  quizSaveQuestion: (q) => ipcRenderer.invoke('quiz:save-question', q),
  quizDeleteQuestion: (id) => ipcRenderer.invoke('quiz:delete-question', id),
  quizImportQuestions: (setId, items) => ipcRenderer.invoke('quiz:import-questions', setId, items),
  quizBankQuestions: () => ipcRenderer.invoke('quiz:bank-questions'),
  quizLicenseClasses: () => ipcRenderer.invoke('quiz:license-classes'),
  quizCreateLicenseClass: (code, name) => ipcRenderer.invoke('quiz:license-class-create', code, name),
  quizUpdateLicenseClass: (code, name) => ipcRenderer.invoke('quiz:license-class-update', code, name),
  quizUpdateLicenseClassLiveCount: (code, count) => ipcRenderer.invoke('quiz:license-class-live-count', code, count),
  quizDeleteLicenseClass: (code) => ipcRenderer.invoke('quiz:license-class-delete', code),
  quizBankSaveQuestion: (question) => ipcRenderer.invoke('quiz:bank-save-question', question),
  quizBankDeleteQuestion: (id) => ipcRenderer.invoke('quiz:bank-delete-question', id),
  quizBankClassQuestions: (licenseClass) => ipcRenderer.invoke('quiz:bank-class-questions', licenseClass),
  quizAssignBankClass: (licenseClass, ids) => ipcRenderer.invoke('quiz:assign-bank-class', licenseClass, ids),
  quizCopyQuestions: (targetId, sourceIds, licenseClass) => ipcRenderer.invoke('quiz:copy-questions', targetId, sourceIds, licenseClass),
  pickVideos: () => ipcRenderer.invoke('dialog:pickVideos'),
  club: (action, extra) => ipcRenderer.invoke('club:command', { action, ...extra }),
  pickMusic: () => ipcRenderer.invoke('dialog:pickMusic'),
  pickImages: () => ipcRenderer.invoke('dialog:pickImages'),
  clubResetScore: () => ipcRenderer.invoke('club:resetScore'),
  onClubRank: on('club:rank'),
  onPause: on('pause:state'),
  restartServer: () => ipcRenderer.invoke('server:restart'),
  pickSound: (kind) => ipcRenderer.invoke('dialog:pickSound', kind),
  openOutput: () => ipcRenderer.invoke('output:open'),
  onOutput: on('output:state'),
  tiktokLogin: () => ipcRenderer.invoke('tiktok:login'),
  tiktokLogout: () => ipcRenderer.invoke('tiktok:logout'),
  copy: (text) => ipcRenderer.invoke('util:copy', text),
  openExternal: (url) => ipcRenderer.invoke('util:openExternal', url),
  onStatus: on('live:status'),
  onStats: on('live:stats'),
  onEvent: on('live:event'),
  onServer: on('server:state'),
  onPreviewReload: on('preview:reload')
});
