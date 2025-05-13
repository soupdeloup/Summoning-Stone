const path = require('path');
const fs = require('fs');
const { app, ipcMain } = require('electron');

let settingsPath = '';
let settings = {};
let logPath = '';
let notificationLog = [];

function initSettings() {
  settingsPath = path.join(app.getPath('userData'), 'settings.json');
  try {
    settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  } catch {
    settings = {};
  }
  if (settings.deleteAfterProcessing === undefined) settings.deleteAfterProcessing = true;
  if (settings.minimizeToTray === undefined) settings.minimizeToTray = true;
  global.settings = settings;
}

function saveSettings() {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  } catch (err) {
    console.error('Failed to save settings:', err.message);
  }
}

function getSetting(k) { return settings[k]; }
function setSetting(k, v) { settings[k] = v; saveSettings(); return settings[k]; }

function initLog() {
  logPath = path.join(app.getPath('userData'), 'notification-log.json');
  try {
    notificationLog = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  } catch {
    notificationLog = [];
  }
  global.notificationLog = notificationLog;
}

function addLog(entry) {
  notificationLog.unshift({ ts: Date.now(), entry });
  notificationLog = notificationLog.slice(0, 200);
  try {
    fs.writeFileSync(logPath, JSON.stringify(notificationLog, null, 2));
  } catch (err) {
    console.error('Failed to write log:', err.message);
  }
  if (global.mainWindow && !global.mainWindow.isDestroyed())
    global.mainWindow.webContents.send('log-updated', notificationLog);
}

function clearLog() {
  notificationLog = [];
  try {
    fs.writeFileSync(logPath, '[]');
  } catch (err) {
    console.error('Failed to clear log:', err.message);
  }
  if (global.mainWindow && !global.mainWindow.isDestroyed())
    global.mainWindow.webContents.send('log-updated', notificationLog);
}

ipcMain.handle('get-setting', (_e, k) => getSetting(k));
ipcMain.handle('set-setting', (_e, k, v) => setSetting(k, v));

module.exports = {
  initSettings,
  saveSettings,
  getSetting,
  setSetting,
  initLog,
  addLog,
  clearLog
};
