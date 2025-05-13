const { BrowserWindow, Tray, Menu, screen, app, ipcMain } = require('electron');
const path = require('path');

let mainWindow = null;
let tray = null;
let hasShownMinimizeBalloon = false;

function createWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) return mainWindow;

  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  mainWindow = new BrowserWindow({
    width: 350,
    height: 550,
    x: width - 370,
    y: height - 570,
    resizable: false,
    frame: false,
    transparent: true,
    hasShadow: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.setTitle('Summoning Stone - WoW Alerts');
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('show', () => {
    console.log("test!")
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('directory-chosen', global.monitoredDirectory || 'None');
      mainWindow.webContents.send('monitoring-status', global.isMonitoring);
      mainWindow.webContents.send('phones-updated', Object.values(global.discoveredPhonesMap || {}));
      mainWindow.webContents.send('log-updated', global.notificationLog || []);
    }
  });

  global.mainWindow = mainWindow;
  return mainWindow;
}

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) createWindow();
  mainWindow.setAlwaysOnTop(true);
  mainWindow.show();
  mainWindow.focus();
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setAlwaysOnTop(false);
  }, 1000);
}

function createTray() {
  if (tray) return;

  const iconPath = path.join(__dirname, '../../assets/trayIcon.ico');
  tray = new Tray(iconPath);
  tray.setToolTip('Summoning Stone Monitor');

  const menuTemplate = [
    {
      label: 'Start Monitoring',
      click: () => {
        showMainWindow();
        if (global.monitoredDirectory) {
          const { startMonitoring } = require('./screenshot-service');
          startMonitoring();
        } else {
          const { chooseDirectory } = require('./screenshot-service');
          chooseDirectory();
        }
      }
    },
    {
      label: 'Stop Monitoring',
      click: () => {
        showMainWindow();
        const { stopMonitoring } = require('./screenshot-service');
        stopMonitoring();
      }
    },
    { type: 'separator' },
    { label: 'Show', click: showMainWindow },
    {
      label: 'Quit',
      click: () => {
        global.isQuitting = true;
        app.quit();
      }
    }
  ];

  tray.setContextMenu(Menu.buildFromTemplate(menuTemplate));

  tray.on('click', () => {
    (!mainWindow || mainWindow.isDestroyed())
      ? showMainWindow()
      : (mainWindow.isVisible() ? mainWindow.hide() : showMainWindow());
  });

  global.tray = tray;
}

function destroyTray() {
  if (tray) tray.destroy();
  tray = null;
}

ipcMain.on('request-app-close', () => {
  const minimise = global.settings?.minimizeToTray === true;

  if (minimise) {
    if (global.mainWindow && !global.mainWindow.isDestroyed()) {
      global.mainWindow.hide();
      if (!global.tray) createTray();
    }
    return;  // keep process alive
  }

  // quit completely
  global.isQuitting = true;
  app.quit();
});

module.exports = {
  createWindow,
  showMainWindow,
  createTray,
  destroyTray
};
