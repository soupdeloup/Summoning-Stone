const { BrowserWindow, Tray, Menu, screen, app, ipcMain } = require('electron');
const path = require('path');
const { WINDOW_WIDTH, WINDOW_HEIGHT, WINDOW_ALWAYS_ON_TOP_DURATION } = require('./constants');

let mainWindow = null;
let tray = null;

function createWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) return mainWindow;

  const { getSetting } = require('./settings-manager');
  const { getMonitoringStatus } = require('./screenshot-service');

  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  mainWindow = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    center: true,
    resizable: true,
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

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    const currentMonitoredDirectory = getSetting('monitoredDirectory');
    if (mainWindow && !mainWindow.isDestroyed()) {
      const { getDiscoveredPhones } = require('./discovery-service');
      sendMessageToRenderer('directory-chosen', currentMonitoredDirectory);
      sendMessageToRenderer('monitoring-status', getMonitoringStatus()); 
      sendMessageToRenderer('phones-updated', getDiscoveredPhones());
      sendMessageToRenderer('log-updated', global.notificationLog || []);

      const { getWebServerStatus } = require('./web-server'); 
      sendMessageToRenderer('web-server-status', getWebServerStatus());
    }
  });

  return mainWindow;
}

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) createWindow();

  if (mainWindow) {
    mainWindow.setAlwaysOnTop(true);
    mainWindow.show();
    mainWindow.focus();
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setAlwaysOnTop(false);
    }, WINDOW_ALWAYS_ON_TOP_DURATION);
  }
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
        const { getSetting } = require('./settings-manager');
        const currentMonitoredDirectory = getSetting('monitoredDirectory');

        if (currentMonitoredDirectory) {
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
        app.quit();
      }
    }
  ];

  tray.setContextMenu(Menu.buildFromTemplate(menuTemplate));

  tray.on('click', () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      showMainWindow();
    } else {
      mainWindow.isVisible() ? mainWindow.hide() : showMainWindow();
    }
  });
}

function destroyTray() {
  if (tray) tray.destroy();
  tray = null;
}

function getMainWindow() {
  return mainWindow;
}

function getTray() {
  return tray;
}

function sendMessageToRenderer(channel, ...args) {
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
    mainWindow.webContents.send(channel, ...args);
  }
}


ipcMain.on('request-app-close', () => {
  const { getSetting } = require('./settings-manager');
  const minimise = getSetting('minimizeToTray') === true;

  if (minimise) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.hide();
      if (!tray) createTray();
    }
    return;
  }

  app.quit();
});

module.exports = {
  createWindow,
  showMainWindow,
  createTray,
  getMainWindow,
  getTray,
  sendMessageToRenderer,
  destroyTray
};