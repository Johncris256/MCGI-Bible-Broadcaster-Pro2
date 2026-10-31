'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('bibleDesktop', {
  getInfo: () => ipcRenderer.invoke('app:get-info'),
  openModule: (id, display = 'primary') => ipcRenderer.invoke('app:open-module', { id, display }),
  copyText: (value) => ipcRenderer.invoke('app:copy-text', value),
  openOutputUrl: () => ipcRenderer.invoke('app:open-output-url'),
  closeCurrentWindow: () => ipcRenderer.invoke('app:close-current-window'),
});
