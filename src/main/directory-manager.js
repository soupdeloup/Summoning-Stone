const { dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const settings = require('./settings-manager');
const windowManager = require('./window-manager');
const i18n = require('./i18n');

const POTENTIAL_WOW_PATHS = [
  // Retail WoW
  'C:\\Program Files (x86)\\World of Warcraft\\_retail_',
  'C:\\Program Files\\World of Warcraft\\_retail_',
  'C:\\Games\\World of Warcraft\\_retail_',
  'D:\\Program Files (x86)\\World of Warcraft\\_retail_',
  'D:\\Program Files\\World of Warcraft\\_retail_',
  'D:\\Games\\World of Warcraft\\_retail_',
  'D:\\World of Warcraft\\_retail_',
  'E:\\Program Files (x86)\\World of Warcraft\\_retail_',
  'E:\\Program Files\\World of Warcraft\\_retail_',
  'E:\\Games\\World of Warcraft\\_retail_',
  'E:\\World of Warcraft\\_retail_'
];

async function dirExists(p) {
  try { await fsp.access(p); return true; } catch { return false; }
}

async function handleDetectDirectories() {
  const initialDirectory = settings.get('monitoredDirectory');

  for (const p of POTENTIAL_WOW_PATHS) {
    if (!(await dirExists(p))) continue;

    const screenshotsPath = path.join(p, 'Screenshots');
    if (!(await dirExists(screenshotsPath))) continue;

    settings.set('monitoredDirectory', screenshotsPath);
    windowManager.sendMessageToRenderer('directory-chosen', screenshotsPath);

    // Show confirmation modal on first auto detect
    if (!settings.get('autoDetectModalShown')) {
      windowManager.sendMessageToRenderer('show-auto-detected-modal', screenshotsPath);
    } else {
      const key = (screenshotsPath === initialDirectory)
        ? 'directory.verified'
        : 'directory.detectedAndSet';
      windowManager.sendMessageToRenderer('detection-result',
        i18n.t(key, { path: screenshotsPath }));
    }
    return screenshotsPath;
  }

  windowManager.sendMessageToRenderer('detection-result', i18n.t('directory.notFound'));
  return null;
}

async function chooseDirectory() {
  let ref = windowManager.getMainWindow();
  if (!ref || ref.isDestroyed()) {
    ref = windowManager.createWindow();
    if (ref) await new Promise(resolve => ref.once('ready-to-show', resolve));
  }

  const { stopMonitoring, getMonitoringStatus } = require('./screenshot-service');
  if (getMonitoringStatus()) stopMonitoring();

  const res = await dialog.showOpenDialog(ref, { properties: ['openDirectory'] });
  if (!res.canceled && res.filePaths.length) {
    settings.set('monitoredDirectory', res.filePaths[0]);
    windowManager.sendMessageToRenderer('directory-chosen', res.filePaths[0]);
  }
}

ipcMain.handle('detect-directories', handleDetectDirectories);
ipcMain.on('choose-directory', chooseDirectory);
ipcMain.on('auto-detected-modal-ack', () => settings.set('autoDetectModalShown', true));

module.exports = {
  handleDetectDirectories,
  chooseDirectory
};
