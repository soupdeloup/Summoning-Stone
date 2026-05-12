const { BrowserWindow, Tray, Menu, app, ipcMain } = require('electron');
const path = require('path');
const { WINDOW } = require('./constants');
const i18n = require('./i18n');

let mainWindow = null;
let tray = null;

// lazy loading to avoid circular dependency with screenshot-service / directory-manager
const lazy = {
  get settings()         { return require('./settings-manager'); },
  get screenshotService() { return require('./screenshot-service'); },
  get directoryManager()  { return require('./directory-manager'); }
};

function createWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) return mainWindow;

  mainWindow = new BrowserWindow({
    width:  WINDOW.WIDTH,
    height: WINDOW.HEIGHT,
    center: true,
    resizable: false,
    frame: false,
    transparent: false,
    hasShadow: true,
    backgroundColor: '#14131c',
    icon: path.join(__dirname, '../../assets/trayIcon.ico'),
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.setTitle(i18n.t('app.title'));
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    sendMessageToRenderer('directory-chosen',  lazy.settings.get('monitoredDirectory'));
    sendMessageToRenderer('monitoring-status', lazy.screenshotService.getMonitoringStatus());
  });

  return mainWindow;
}

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) createWindow();
  if (!mainWindow) return;

  mainWindow.setAlwaysOnTop(true);
  mainWindow.show();
  mainWindow.focus();
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setAlwaysOnTop(false);
  }, WINDOW.ALWAYS_ON_TOP_DURATION);
}

function createTray() {
  if (tray) return;
  const iconPath = path.join(__dirname, '../../assets/trayIcon.ico');
  tray = new Tray(iconPath);
  tray.setToolTip(i18n.t('app.trayTooltip'));

  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: i18n.t('tray.startMonitoring'),
      click: () => {
        showMainWindow();
        if (lazy.settings.get('monitoredDirectory')) {
          lazy.screenshotService.startMonitoring();
        } else {
          lazy.directoryManager.chooseDirectory();
        }
      }
    },
    {
      label: i18n.t('tray.stopMonitoring'),
      click: () => {
        showMainWindow();
        lazy.screenshotService.stopMonitoring();
      }
    },
    { type: 'separator' },
    { label: i18n.t('tray.show'), click: showMainWindow },
    { label: i18n.t('tray.quit'), click: () => app.quit() }
  ]));

  tray.on('click', () => {
    if (!mainWindow || mainWindow.isDestroyed() || !mainWindow.isVisible()) {
      showMainWindow();
    } else {
      mainWindow.hide();
    }
  });
}

function destroyTray() {
  if (tray) tray.destroy();
  tray = null;
}

function sendMessageToRenderer(channel, ...args) {
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
    mainWindow.webContents.send(channel, ...args);
  }
}

/**
 * Shared handler for minimize and close: if "minimize to tray" is enabled,
 * hide the window to the tray; otherwise fall back to `fallback()`.
 */
function hideToTrayOr(fallback) {
  if (lazy.settings.get('minimizeToTray') === true) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.hide();
      if (!tray) createTray();
    }
  } else {
    fallback();
  }
}

ipcMain.on('request-minimize', () => {
  hideToTrayOr(() => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize();
  });
});

ipcMain.on('request-app-close', () => {
  hideToTrayOr(() => app.quit());
});

module.exports = {
  createWindow,
  showMainWindow,
  createTray,
  destroyTray,
  getMainWindow: () => mainWindow,
  sendMessageToRenderer
};
