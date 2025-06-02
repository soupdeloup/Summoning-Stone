const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  chooseDirectory      : ()            => ipcRenderer.send('choose-directory'),
  startMonitoring      : ()            => ipcRenderer.send('start-monitoring'),
  stopMonitoring       : ()            => ipcRenderer.send('stop-monitoring'),
  startWebServer       : ()            => ipcRenderer.send('start-web-server'),
  stopWebServer        : ()            => ipcRenderer.send('stop-web-server'),
  detectDirectories    : ()            => ipcRenderer.invoke('detect-directories'),
  requestNotificationLog: ()           => ipcRenderer.invoke('get-notification-log'),
  clearLog             : ()            => ipcRenderer.invoke('clear-log'),
  getWebServerStatus   : ()            => ipcRenderer.send('get-web-server-status'),
  getSetting           : key           => ipcRenderer.invoke('get-setting', key),
  setSetting           : (k, v)        => ipcRenderer.invoke('set-setting', k, v),
  onDirectoryChosen    : cb            => ipcRenderer.on('directory-chosen',           (_, v) => cb(v)),
  onMonitoringStatus   : cb            => ipcRenderer.on('monitoring-status',          (_, v) => cb(v)),
  onPhonesUpdated      : cb            => ipcRenderer.on('phones-updated',             (_, v) => cb(v)),
  onDetectionResult    : cb            => ipcRenderer.on('detection-result',           (_, v) => cb(v)),
  onMonitoringError    : cb            => ipcRenderer.on('monitoring-status-error',    (_, v) => cb(v)),
  onShowAutoDetectedModal: cb          => ipcRenderer.on('show-auto-detected-modal',    (_, d) => cb(d)),
  autoDetectedModalAck : ()            => ipcRenderer.send('auto-detected-modal-ack'),
  onLogUpdated         : cb            => ipcRenderer.on('log-updated',                (_, l) => cb(l)),
  onWebServerStatus    : cb            => ipcRenderer.on('web-server-status',          (_, s) => cb(s)),
  requestAppClose: () => ipcRenderer.send('request-app-close')
})