const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getPlugins: () => ipcRenderer.invoke('get-plugins'),
    getAsset: (assetName) => ipcRenderer.invoke('get-asset', assetName),
    update: () => ipcRenderer.invoke('update')
});