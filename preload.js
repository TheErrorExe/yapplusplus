const { contextBridge, ipcRenderer } = require('electron');

const preloadPathArg = process.argv.find(arg => arg.startsWith('--preload-path='));
const preloadPath = preloadPathArg ? preloadPathArg.split('=')[1] : '';

contextBridge.exposeInMainWorld('electronAPI', {
    getPlugins: () => ipcRenderer.invoke('get-plugins'),
    getAsset: (assetName) => ipcRenderer.invoke('get-asset', assetName),
    update: () => ipcRenderer.invoke('update'),
    getPreloadPath: () => preloadPath,
    restartApp: () => ipcRenderer.invoke('restart-app'),
    getThemes: () => ipcRenderer.invoke('get-themes'),
    saveCustomPlugin: (filename, code) => ipcRenderer.invoke('save-custom-plugin', filename, code),
    openExternal: (url) => ipcRenderer.invoke('open-external', url)
});