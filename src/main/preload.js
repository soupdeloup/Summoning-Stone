const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  chooseDirectory       : ()       => ipcRenderer.send('choose-directory'),
  detectDirectories     : ()       => ipcRenderer.invoke('detect-directories'),
  onDirectoryChosen     : cb       => ipcRenderer.on('directory-chosen',         (_, v) => cb(v)),
  onDetectionResult     : cb       => ipcRenderer.on('detection-result',         (_, v) => cb(v)),
  onShowAutoDetectedModal: cb      => ipcRenderer.on('show-auto-detected-modal', (_, d) => cb(d)),
  autoDetectedModalAck  : ()       => ipcRenderer.send('auto-detected-modal-ack'),

  startMonitoring       : ()       => ipcRenderer.send('start-monitoring'),
  stopMonitoring        : ()       => ipcRenderer.send('stop-monitoring'),
  onMonitoringStatus    : cb       => ipcRenderer.on('monitoring-status',        (_, v) => cb(v)),
  onMonitoringError     : cb       => ipcRenderer.on('monitoring-status-error',  (_, v) => cb(v)),

  sendTestNotification  : ()       => ipcRenderer.send('send-test-notification'),
  getNtfyInfo           : ()       => ipcRenderer.invoke('get-ntfy-info'),
  regenerateNtfyTopic   : ()       => ipcRenderer.invoke('regenerate-ntfy-topic'),

  requestNotificationLog: ()       => ipcRenderer.invoke('get-notification-log'),
  clearLog              : ()       => ipcRenderer.invoke('clear-log'),
  onLogUpdated          : cb       => ipcRenderer.on('log-updated',              (_, l) => cb(l)),

  getSetting            : key      => ipcRenderer.invoke('get-setting', key),
  setSetting            : (k, v)   => ipcRenderer.invoke('set-setting', k, v),

  requestMinimize       : ()       => ipcRenderer.send('request-minimize'),
  requestAppClose       : ()       => ipcRenderer.send('request-app-close')
});
