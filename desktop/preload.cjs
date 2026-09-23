const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('taskModel', {
  snapshot: () => ipcRenderer.invoke('tm:snapshot'),
  connect: provider => ipcRenderer.invoke('tm:connect', provider),
  pause: () => ipcRenderer.invoke('tm:pause'),
  evaluate: (id, outcome, category) => ipcRenderer.invoke('tm:evaluate', { id, outcome, category }),
  compact: value => ipcRenderer.invoke('tm:compact', value),
  exportSkill: () => ipcRenderer.invoke('tm:skill'),
  installSkill: () => ipcRenderer.invoke('tm:install-skill'),
  saveManual: data => ipcRenderer.invoke('tm:manual',data),
  hide: () => ipcRenderer.invoke('tm:hide'),
  minimize: () => ipcRenderer.invoke('tm:minimize'),
});
