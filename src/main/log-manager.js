const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');
const { app, ipcMain } = require('electron');
const { MAX_LOG_ENTRIES } = require('./constants');

const emitter = new EventEmitter();
let entries = [];
let logPath = '';

function init() {
  logPath = path.join(app.getPath('userData'), 'notification-log.json');
  try {
    entries = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  } catch {
    entries = [];
  }
}

function get() {
  return [...entries];
}

function add(key, vars) {
  entries.unshift({ ts: Date.now(), key, vars: vars || {} });
  if (entries.length > MAX_LOG_ENTRIES) entries.length = MAX_LOG_ENTRIES;
  save();
  emitter.emit('updated', [...entries]);
}

function clear() {
  entries = [];
  save();
  emitter.emit('updated', []);
  return [];
}

function save() {
  try {
    fs.writeFileSync(logPath, JSON.stringify(entries, null, 2));
  } catch (err) {
    console.error('Failed to write log:', err.message);
  }
}

ipcMain.handle('get-notification-log', get);
ipcMain.handle('clear-log', clear);

module.exports = {
  init,
  get,
  add,
  clear,
  on: (event, listener) => emitter.on(event, listener)
};
