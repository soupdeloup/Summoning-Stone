const { app } = require('electron');
const sharp = require('sharp');
const constants = require('./constants');

/* ─────────────────────────  globals  ─────────────────────────── */
let heartbeatIntervalId = null;
let isQuitting = false;

// Set up global state
global.isQuitting = false;
global.discoveredPhonesMap = {};
global.monitoredDirectory = null;
global.isMonitoring = false;
global.notificationLog = [];
global.settings = {};

/* ─────────────────────  app lifecycle  ─────────────────────── */
app.whenReady().then(async () => {
  const { initSettings, initLog } = require('./settings-manager');
  const { createWindow, createTray } = require('./window-manager');
  const { discoverPhones } = require('./discovery-service');
  const { handleDetectDirectories } = require('./screenshot-service');
  
  // Initialize everything
  initSettings();
  initLog();
  createWindow();
  createTray();
  discoverPhones();
  await handleDetectDirectories();
  
  // Start heartbeat
  const { sendHeartbeat } = require('./discovery-service');
  heartbeatIntervalId = setInterval(sendHeartbeat, constants.HEARTBEAT_INTERVAL_MS);
});

app.once('before-quit', () => {
  const { stopDiscovery } = require('./discovery-service');
  const { stopMonitoring } = require('./screenshot-service');
  
  global.isQuitting = isQuitting = true;
  stopMonitoring();
  stopDiscovery();
  
  if (heartbeatIntervalId) {
    clearInterval(heartbeatIntervalId);
    heartbeatIntervalId = null;
  }
  
  sharp.shutdown({ queue: true });
});

app.on('window-all-closed', () => { /* keep tray running */ });

app.on('activate', () => {
  const { showMainWindow } = require('./window-manager');
  showMainWindow();
});

app.on('will-quit', () => {
  const { destroyTray } = require('./window-manager');
  
  if (heartbeatIntervalId) clearInterval(heartbeatIntervalId);
  
  if (global.udpSocket) {
    try { global.udpSocket.close(); } catch { }
    global.udpSocket = null;
  }
  
  destroyTray();
});