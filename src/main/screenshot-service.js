const { dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const chokidar = require('chokidar');
const sharp = require('sharp');
const { sendNotification } = require('./discovery-service');
const { getSetting, setSetting } = require('./settings-manager');
const logManager = require('./log-manager');
const { sendWebNotification } = require('./web-server');
const { PROBE, TOL, POTENTIAL_WOW_PATHS, FILE_WATCHER_STABILITY_THRESHOLD, FILE_WATCHER_POLL_INTERVAL } = require('./constants');
const windowManager = require('./window-manager');

let currentWatcher = null;
let isMonitoring = false;

async function checkDirectoryExists(dirPath) {
  try { await fsp.access(dirPath); return true; } catch { return false; }
}

function getMonitoringStatus() {
  return isMonitoring;
}

async function handleDetectDirectories() {
  const mainWindow = windowManager.getMainWindow();
  const initialDirectory = getSetting('monitoredDirectory');

  for (const p of POTENTIAL_WOW_PATHS) {
    if (await checkDirectoryExists(p)) {
      const screenshotsPath = path.join(p, 'Screenshots');

      if (await checkDirectoryExists(screenshotsPath)) {
        setSetting('monitoredDirectory', screenshotsPath);
        if (mainWindow && !mainWindow.isDestroyed()) {
          windowManager.sendMessageToRenderer('directory-chosen', screenshotsPath);
        }

        if (!getSetting('autoDetectModalShown')) {
          if (mainWindow && !mainWindow.isDestroyed()) {
            windowManager.sendMessageToRenderer('show-auto-detected-modal', screenshotsPath);
          }
        } else {
          if (mainWindow && !mainWindow.isDestroyed()) {
            if (screenshotsPath === initialDirectory) {
              windowManager.sendMessageToRenderer('detection-result', `Verified existing directory: ${screenshotsPath}`);
            } else {
              windowManager.sendMessageToRenderer('detection-result', `Auto-detected and set directory: ${screenshotsPath}`);
            }
          }
        }
        return screenshotsPath;
      }
    }
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    windowManager.sendMessageToRenderer('detection-result', 'No compatible WoW Screenshot directory automatically found. Please choose it manually.');
  }
  return null;
}

async function chooseDirectory() {
  let ref = windowManager.getMainWindow();
  if (!ref || ref.isDestroyed()) {
    ref = windowManager.createWindow();
    if (ref) {
      await new Promise(resolve => ref.once('ready-to-show', resolve));
    }
  }

  if (isMonitoring) stopMonitoring();
  const res = await dialog.showOpenDialog(ref, { properties: ['openDirectory'] });
  if (!res.canceled && res.filePaths.length) {
    const chosenPath = res.filePaths[0];
    setSetting('monitoredDirectory', chosenPath);
    if (ref && !ref.isDestroyed()) {
      windowManager.sendMessageToRenderer('directory-chosen', chosenPath);
    }
  }
}

async function getBlockColourFast(filePath) {
  const buf = await fsp.readFile(filePath);

  const { data } = await sharp(buf)
    .extract(PROBE)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const [r0, g0, b0] = data;
  for (let i = 0; i < data.length; i += 3) {
    if (Math.abs(data[i] - r0) > TOL ||
      Math.abs(data[i + 1] - g0) > TOL ||
      Math.abs(data[i + 2] - b0) > TOL) return 'mixed';
  }
  return (r0 > g0 && r0 > b0) ? 'red'
    : (g0 > r0 && g0 > b0) ? 'green'
      : (b0 > r0 && b0 > g0) ? 'blue'
        : 'unknown';
}

function startMonitoring() {
  stopMonitoring();

  const currentMonitoredDirectory = getSetting('monitoredDirectory');
  if (!currentMonitoredDirectory) {
    windowManager.sendMessageToRenderer('monitoring-status-error', 'No directory set to monitor.');
    return;
  }

  windowManager.sendMessageToRenderer('monitoring-status-error', '');

  currentWatcher = chokidar.watch(currentMonitoredDirectory, {
    persistent: true,
    ignoreInitial: true,
    depth: 0,
    awaitWriteFinish: { stabilityThreshold: FILE_WATCHER_STABILITY_THRESHOLD, pollInterval: FILE_WATCHER_POLL_INTERVAL }
  });

  currentWatcher.on('add', processScreenshot);
  currentWatcher.on('error', e => {
    windowManager.sendMessageToRenderer('monitoring-status-error', `Error watching directory: ${e.message}`);
    stopMonitoring();
  });

  isMonitoring = true;

  windowManager.sendMessageToRenderer('monitoring-status', isMonitoring);
}

function stopMonitoring() {
  if (currentWatcher) {
    currentWatcher.close();
    currentWatcher = null;
  }

  isMonitoring = false;

  windowManager.sendMessageToRenderer('monitoring-status', isMonitoring);
  windowManager.sendMessageToRenderer('monitoring-status-error', '');
}

async function processScreenshot(filePath) {
  try {
    const time = (path.basename(filePath).match(/\d{6}_(\d{6})/) || [])[1]
    const colour = await getBlockColourFast(filePath)
    if (colour !== 'unknown') {
      const notificationMethod = getSetting('notificationMethod') || 'android';

      if (notificationMethod === 'android' || notificationMethod === 'both') {
        sendNotification(time, colour);
      }

      if (notificationMethod === 'web' || notificationMethod === 'both') {
        sendWebNotification(time, colour);
      }

      if (getSetting('deleteAfterProcessing') !== false) {
        await fsp.unlink(filePath)
        logManager.addLog(`deleted ${path.basename(filePath)} (colour: ${colour})`)
      } else {
        logManager.addLog(`kept ${path.basename(filePath)} (colour: ${colour})`)
      }
    }
  } catch (err) {
    logManager.addLog(`error processing ${path.basename(filePath)}: ${err.message}`)
  }
}

ipcMain.handle('detect-directories', handleDetectDirectories);
ipcMain.on('choose-directory', chooseDirectory);
ipcMain.on('start-monitoring', startMonitoring);
ipcMain.on('stop-monitoring', stopMonitoring);
ipcMain.on('auto-detected-modal-ack', () => {
  setSetting('autoDetectModalShown', true);
});

module.exports = {
  getMonitoringStatus,
  handleDetectDirectories,
  chooseDirectory,
  startMonitoring,
  stopMonitoring
};