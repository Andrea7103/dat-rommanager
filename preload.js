const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder:    ()           => ipcRenderer.invoke('select-folder'),
  selectDatFile:   ()           => ipcRenderer.invoke('select-dat-file'),
  selectAnyFiles:  ()           => ipcRenderer.invoke('select-any-files'),
  scanFolder:      (folderPath) => ipcRenderer.invoke('scan-folder', folderPath),
  readFile:        (filePath)   => ipcRenderer.invoke('read-file', filePath),
  readFileBuffer:  (filePath)   => ipcRenderer.invoke('read-file-buffer', filePath),
  saveMerged:      (opts)       => ipcRenderer.invoke('save-merged', opts),
  openExternal:    (url)        => ipcRenderer.invoke('open-external', url),
  checkUpdates:    ()           => ipcRenderer.invoke('check-updates'),
  parseDatFile:    (filePath)   => ipcRenderer.invoke('parse-dat-file', filePath),
  onParseProgress: (cb)         => ipcRenderer.on('parse-progress', (e, data) => cb(data)),
  offParseProgress:()           => ipcRenderer.removeAllListeners('parse-progress'),
  selectOutputFolder: ()           => ipcRenderer.invoke('select-output-folder'),
  saveSplit:          (opts)       => ipcRenderer.invoke('save-split', opts),
  onSplitProgress:    (cb)         => ipcRenderer.on('split-progress', (e, data) => cb(data)),
  offSplitProgress:   ()           => ipcRenderer.removeAllListeners('split-progress'),
});
