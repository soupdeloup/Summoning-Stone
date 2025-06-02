const fs = require('fs');
const path = require('path');
const { app, ipcMain } = require('electron');
const EventEmitter = require('events');
const { MAX_LOG_ENTRIES } = require('./constants');

let notificationLog = [];
let logPath = '';

class LogManager extends EventEmitter {
  constructor() {
    super();
  }

  initLog() {
    logPath = path.join(app.getPath('userData'), 'notification-log.json');
    try {
      notificationLog = JSON.parse(fs.readFileSync(logPath, 'utf8'));
    } catch {
      notificationLog = [];
    }
  }

  getLog() {
    return [...notificationLog];
  }

  addLog(entryMessage) {
    const newEntry = { ts: Date.now(), entry: entryMessage };
    notificationLog.unshift(newEntry);
    notificationLog = notificationLog.slice(0, MAX_LOG_ENTRIES);
    this._saveLog();
    this.emit('log-updated', [...notificationLog]);
  }

  clearLog() {
    notificationLog = [];
    this._saveLog();
    this.emit('log-updated', [...notificationLog]);
    return [...notificationLog]; 
  }

  _saveLog() {
    try {
      fs.writeFileSync(logPath, JSON.stringify(notificationLog, null, 2));
    } catch (err) {
      console.error('Failed to write log:', err.message);
    }
  }
}

const logManagerInstance = new LogManager();

ipcMain.handle('get-notification-log', () => logManagerInstance.getLog());
ipcMain.handle('clear-log', () => logManagerInstance.clearLog());

module.exports = logManagerInstance;