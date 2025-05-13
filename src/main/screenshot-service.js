const { dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const chokidar = require('chokidar');
const sharp = require('sharp');
const { sendNotification } = require('./discovery-service');
const { addLog, saveSettings, getSetting } = require('./settings-manager');

/* ─────────────────────────  globals  ─────────────────────────── */
const PROBE = { left: 0, top: 0, width: 20, height: 20 };
const TOL = 5;

let currentWatcher = null;
let monitoredDirectory = null;
let isMonitoring = false;

global.monitoredDirectory = monitoredDirectory;
global.isMonitoring = isMonitoring;

/* ────────────────────── utilities ───────────────────────────── */
async function checkDirectoryExists(dirPath) {
  try { await fsp.access(dirPath); return true; } catch { return false; }
}

/* ─────────────────── auto‑detect WoW path ───────────────────── */
async function handleDetectDirectories() {
  const potentialPaths = [
    'C:\\Program Files (x86)\\World of Warcraft\\_retail_\\Screenshots',
    'C:\\Program Files\\World of Warcraft\\_retail_\\Screenshots',
    'C:\\Games\\World of Warcraft\\_retail_\\Screenshots'
  ];
  for (const p of potentialPaths) {
    if (await checkDirectoryExists(p)) {
      monitoredDirectory = p;
      global.monitoredDirectory = monitoredDirectory;
      
      if (!global.mainWindow) require('./window-manager').createWindow();
      
      if (!global.settings.autoDetectModalShown && global.mainWindow && !global.mainWindow.isDestroyed())
        global.mainWindow.webContents.send('show-auto-detected-modal', monitoredDirectory);
      
      if (global.mainWindow && !global.mainWindow.isDestroyed())
        global.mainWindow.webContents.send('directory-chosen', monitoredDirectory);
      
      return;
    }
  }
}

/* ─────────────────────  directory chooser  ──────────────────── */
async function chooseDirectory() {
  const ref = require('./window-manager').createWindow();
  if (isMonitoring) stopMonitoring();
  const res = await dialog.showOpenDialog(ref, { properties: ['openDirectory'] });
  if (!res.canceled && res.filePaths.length) {
    monitoredDirectory = res.filePaths[0];
    global.monitoredDirectory = monitoredDirectory;
    
    if (ref && !ref.isDestroyed())
      ref.webContents.send('directory-chosen', monitoredDirectory);
  }
}

/* ────────────────  colour‑detection helper  ─────────────────── */
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

/* ─────────────  monitor + process screenshots  ─────────────── */
function startMonitoring() {
  stopMonitoring(); 

  if (!monitoredDirectory) {
    if (global.mainWindow && !global.mainWindow.isDestroyed())
      global.mainWindow.webContents.send('monitoring-status-error', 'No directory set to monitor.');
    return;
  }
  if (global.mainWindow && !global.mainWindow.isDestroyed())
    global.mainWindow.webContents.send('monitoring-status-error', '');

  currentWatcher = chokidar.watch(monitoredDirectory, {
    persistent: true,
    ignoreInitial: true,
    depth: 0,
    awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 150 }
  });

  currentWatcher.on('add', processScreenshot);
  currentWatcher.on('error', e => {
    if (global.mainWindow && !global.mainWindow.isDestroyed())
      global.mainWindow.webContents.send('monitoring-status-error', `Error watching directory: ${e.message}`);
    stopMonitoring();
  });

  isMonitoring = true;
  global.isMonitoring = isMonitoring;
  
  if (global.mainWindow && !global.mainWindow.isDestroyed())
    global.mainWindow.webContents.send('monitoring-status', isMonitoring);
}

function stopMonitoring() {
  if (currentWatcher) { 
    currentWatcher.close(); 
    currentWatcher = null; 
  }
  
  isMonitoring = false;
  global.isMonitoring = isMonitoring;
  
  if (global.mainWindow && !global.mainWindow.isDestroyed()) {
    global.mainWindow.webContents.send('monitoring-status', isMonitoring);
    global.mainWindow.webContents.send('monitoring-status-error', '');
  }
}

//  read file -> colour detect -> notify -> maybe delete
async function processScreenshot (filePath) {
  try {
    const time   = (path.basename(filePath).match(/\d{6}_(\d{6})/) || [])[1]
    const colour = await getBlockColourFast(filePath)
    if (colour !== 'unknown') {
      sendNotification(time, colour)
      if (getSetting('deleteAfterProcessing') !== false) {
        await fsp.unlink(filePath)
        addLog(`deleted ${path.basename(filePath)} (colour: ${colour})`)
      } else {
        addLog(`kept ${path.basename(filePath)} (colour: ${colour})`)
      }
    }
  } catch (err) {
    addLog(`error processing ${path.basename(filePath)}: ${err.message}`)
  }
}

/* ────────────────────  configuration  ─────────────────────────── */
ipcMain.handle('detect-directories', handleDetectDirectories);
ipcMain.handle('get-notification-log', () => global.notificationLog || []);
ipcMain.on('choose-directory', chooseDirectory);
ipcMain.on('start-monitoring', startMonitoring);
ipcMain.on('stop-monitoring', stopMonitoring);
ipcMain.on('auto-detected-modal-ack', () => {
  global.settings.autoDetectModalShown = true;
  saveSettings();
});

// ───────── clear log ─────────
ipcMain.handle('clear-log', () => require('./settings-manager').clearLog());

module.exports = {
  handleDetectDirectories,
  chooseDirectory,
  startMonitoring,
  stopMonitoring
};