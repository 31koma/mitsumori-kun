const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mitsumoriDesktop', {
  reloadApp: () => ipcRenderer.invoke('mitsumori:reload-app'),
  updateApp: () => ipcRenderer.invoke('mitsumori:update-app'),
});

window.addEventListener('DOMContentLoaded', () => {
  console.log('電工見積もりくん デスクトップラッパーが正常に読み込まれました。');
});
