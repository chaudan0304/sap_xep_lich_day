// electron/preload.cjs
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true,
  appVersion: '1.0.4',
  startInAppUpdate: (downloadUrl, fileName) => ipcRenderer.invoke('start-in-app-update', { downloadUrl, fileName }),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (event, info) => callback(info)),
  onDownloadProgress: (callback) => ipcRenderer.on('download-progress', (event, progress) => callback(progress)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', (event, info) => callback(info)),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  restartAndInstall: () => ipcRenderer.invoke('restart-app-for-update'),
  printWindow: (options) => ipcRenderer.invoke('print-window', options),
  db: {
    load: () => ipcRenderer.invoke('db-load'),
    save: (data) => ipcRenderer.invoke('db-save', data),
    exportFile: () => ipcRenderer.invoke('db-export-file'),
    importFile: () => ipcRenderer.invoke('db-import-file')
  }
});



