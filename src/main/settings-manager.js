const path = require('path');
const fs = require('fs');
const { app, ipcMain } = require('electron');
const { DEFAULTS } = require('./constants');

let settingsPath = '';
let settings = {};

function init() {
  settingsPath = path.join(app.getPath('userData'), 'settings.json');
  try {
    settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  } catch {
    settings = {};
  }

  for (const [key, defaultValue] of Object.entries(DEFAULTS)) {
    settings[key] = settings[key] ?? defaultValue;
  }
}

function get(key) {
  return settings[key];
}

function set(key, value) {
  settings[key] = value;
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  } catch (err) {
    console.error('Failed to save settings:', err.message);
  }
  return value;
}

ipcMain.handle('get-setting', (_e, key)        => get(key));
ipcMain.handle('set-setting', (_e, key, value) => set(key, value));

module.exports = { init, get, set };
