const { app, ipcMain } = require('electron');
const { initSettings, getSetting } = require('./settings-manager');
const logManager = require('./log-manager');
const { discoverPhones, stopDiscovery } = require('./discovery-service');
const { handleDetectDirectories } = require('./screenshot-service');
const { startWebServer, stopWebServer, getWebServerStatus } = require('./web-server');
const constants = require('./constants');
const windowManager = require('./window-manager');

let heartbeatIntervalId = null;

app.whenReady().then(async () => {
  initSettings(); 
  logManager.initLog();

  logManager.on('log-updated', (updatedLog) => {
    windowManager.sendMessageToRenderer('log-updated', updatedLog);
  });
  
  windowManager.createWindow(); 
  windowManager.createTray();  
  discoverPhones();
  
  const savedDirectory = getSetting('monitoredDirectory');
  if (!savedDirectory) {
    await handleDetectDirectories();
  }
  
  const { sendHeartbeat } = require('./discovery-service');
  heartbeatIntervalId = setInterval(sendHeartbeat, constants.HEARTBEAT_INTERVAL_MS);
  
  const notificationMethod = getSetting('notificationMethod');
  if (notificationMethod === 'web' || notificationMethod === 'both') {
    startWebServer();
  }
  
  ipcMain.on('start-web-server', () => {
    startWebServer();
  });
  
  ipcMain.on('stop-web-server', () => {
    const { stopWebServer } = require('./web-server');
    stopWebServer();
  });

  ipcMain.on('get-web-server-status', () => {
    const { getWebServerStatus } = require('./web-server');
    const status = getWebServerStatus();
    windowManager.sendMessageToRenderer('web-server-status', status);
  });
});

app.on('window-all-closed', () => { });

app.on('activate', () => {
  windowManager.showMainWindow();
});

app.on('will-quit', () => {
  if (heartbeatIntervalId) clearInterval(heartbeatIntervalId);
  stopDiscovery();
  stopWebServer();
  windowManager.destroyTray();
});