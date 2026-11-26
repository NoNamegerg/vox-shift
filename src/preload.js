const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  platform: process.platform,
  listSounds: () => ipcRenderer.invoke('soundboard:list'),
  addSounds: () => ipcRenderer.invoke('soundboard:add'),
  readSound: id => ipcRenderer.invoke('soundboard:read', id),
  removeSound: id => ipcRenderer.invoke('soundboard:remove', id)
});
