const { app } = require('electron');
const settings = require('./settings-manager');
const logManager = require('./log-manager');
const i18n = require('./i18n');
const ntfy = require('./ntfy-service');
const { handleDetectDirectories } = require('./directory-manager');
const { startMonitoring } = require('./screenshot-service');
const windowManager = require('./window-manager');

app.whenReady().then(async () => {
  settings.init();
  i18n.setLocale(settings.get('locale'));
  logManager.init();

  logManager.on('updated', (log) => {
    windowManager.sendMessageToRenderer('log-updated', log);
  });

  windowManager.createWindow();
  windowManager.createTray();

  // ensure a topic exists on first launch so the QR can render immediately
  ntfy.getTopic();

  // try to find the WoW Screenshots folder automatically if not set
  if (!settings.get('monitoredDirectory')) {
    await handleDetectDirectories();
  }

  if (settings.get('autoStartMonitoring') && settings.get('monitoredDirectory')) {
    startMonitoring();
  }
});

app.on('window-all-closed', () => { });
app.on('activate', () => windowManager.showMainWindow());
app.on('will-quit', () => windowManager.destroyTray());
