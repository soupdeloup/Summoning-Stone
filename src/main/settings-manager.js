const path = require('path');
const fs = require('fs');
const { app, ipcMain } = require('electron');
const constants = require('./constants');

let settingsPath = '';
let settings = {};

function initSettings() {
  settingsPath = path.join(app.getPath('userData'), 'settings.json');
  try {
    settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  } catch {
    settings = {};
  }
  settings.deleteAfterProcessing = settings.deleteAfterProcessing ?? constants.DEFAULT_SETTING_VALUES.DELETE_AFTER_PROCESSING;
  settings.minimizeToTray = settings.minimizeToTray ?? constants.DEFAULT_SETTING_VALUES.MINIMIZE_TO_TRAY;
  settings.notificationMethod = settings.notificationMethod ?? constants.DEFAULT_SETTING_VALUES.NOTIFICATION_METHOD;
  settings.showEventLog = settings.showEventLog ?? constants.DEFAULT_SETTING_VALUES.SHOW_EVENT_LOG;
  settings.monitoredDirectory = settings.monitoredDirectory ?? constants.DEFAULT_SETTING_VALUES.MONITORED_DIRECTORY;
  settings.autoDetectModalShown = settings.autoDetectModalShown ?? constants.DEFAULT_SETTING_VALUES.AUTO_DETECT_MODAL_SHOWN;
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

ipcMain.handle('get-setting', (_e, k) => getSetting(k));
ipcMain.handle('set-setting', (_e, k, v) => setSetting(k, v));

module.exports = {
  initSettings,
  saveSettings,
  getSetting,
  setSetting
};