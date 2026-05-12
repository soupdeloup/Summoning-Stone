const { net, ipcMain } = require('electron');
const crypto = require('crypto');
const settings = require('./settings-manager');
const logManager = require('./log-manager');
const i18n = require('./i18n');
const { EVENT_TYPES, NTFY_SERVER } = require('./constants');

const TOPIC_PREFIX = 'summoning-stone-';

function getTopic() {
  let topic = settings.get('ntfyTopic');
  if (!topic) {
    topic = TOPIC_PREFIX + crypto.randomUUID();
    settings.set('ntfyTopic', topic);
  }
  return topic;
}

function getInfo() {
  const topic = getTopic();
  const host = NTFY_SERVER.replace(/^https?:\/\//, '');
  return {
    topic,
    subscribeUrl: `${NTFY_SERVER}/${topic}`,
    protocolUrl:  `ntfy://${host}/${topic}`
  };
}

function regenerate() {
  settings.set('ntfyTopic', TOPIC_PREFIX + crypto.randomUUID());
  return getInfo();
}

function getLabel(eventType, payload) {
  const info = EVENT_TYPES[eventType] || EVENT_TYPES[0];
  let label = i18n.t(info.key);
  if (eventType === 3 && payload.length > 0) label += ` (${payload})`;
  return label;
}

function sendNotification(eventType, payload) {
  const topic = getTopic();
  const label = getLabel(eventType, payload);
  const tag   = (EVENT_TYPES[eventType] || EVENT_TYPES[0]).tag;

  const body = JSON.stringify({
    topic,
    title: i18n.t('app.name'),
    message: label,
    tags: [tag],
    priority: 5
  });

  net.fetch(NTFY_SERVER, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  }).then(res => {
    if (res.ok) {
      logManager.add('events.ntfySent', { label });
    } else {
      logManager.add('events.ntfyError', { detail: `HTTP ${res.status}` });
    }
  }).catch(err => {
    logManager.add('events.ntfyError', { detail: err.message });
  });
}

ipcMain.handle('get-ntfy-info', getInfo);
ipcMain.handle('regenerate-ntfy-topic', regenerate);

module.exports = { getTopic, getInfo, regenerate, getLabel, sendNotification };
