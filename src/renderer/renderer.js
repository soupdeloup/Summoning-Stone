const $ = (id) => document.getElementById(id);
const showModal = (el) => el.classList.add('show');
const hideModal = (el) => el.classList.remove('show');

const i18n = window.i18n;

const statusIndicator  = $('status-indicator');
const monitoringValue  = $('monitoring-value');
const monitoringError  = $('monitoring-error');
const startBtn         = $('btn-start');
const stopBtn          = $('btn-stop');

const qrCodeContainer  = $('qrcode-container');
const qrPlaceholder    = $('qr-placeholder');
const ntfyTopicValue   = $('ntfy-topic-value');

const directoryValue   = $('directory-value');
const detectionFeedback = $('detection-feedback');
const chooseBtn        = $('btn-choose');
const detectBtn        = $('btn-detect');

const logSection       = $('log-section');
const logList          = $('log-list');
const logEmpty         = $('log-empty');
const clearLogBtn      = $('btn-clear-log');

const storeQrModal     = $('store-qr-modal');
const storeQrTitle     = $('store-qr-title');
const storeQrCode      = $('store-qr-code');

let currentDirectory = null;
let isMonitoring     = false;
let logVisible       = false;

const QR_DEFAULTS = {
  width: 152,
  height: 152,
  colorDark:  '#0f0e1a',
  colorLight: '#ffffff',
  correctLevel: QRCode.CorrectLevel.H
};

function makeQR(container, text) {
  container.innerHTML = '';
  return new QRCode(container, { ...QR_DEFAULTS, text });
}

function updateMonitoringUI() {
  monitoringValue.textContent = i18n.t(isMonitoring ? 'status.monitoring' : 'status.stopped');
  statusIndicator.classList.toggle('active', isMonitoring);
  startBtn.style.display = isMonitoring ? 'none' : '';
  stopBtn.style.display  = isMonitoring ? '' : 'none';
  startBtn.disabled = !currentDirectory;
  chooseBtn.disabled = isMonitoring;
  detectBtn.disabled = isMonitoring;
}

window.electronAPI.onMonitoringStatus(status => {
  isMonitoring = status;
  updateMonitoringUI();
});
window.electronAPI.onMonitoringError(msg => monitoringError.textContent = msg || '');

startBtn.addEventListener('click', () => {
  monitoringError.textContent = '';
  window.electronAPI.startMonitoring();
});
stopBtn.addEventListener('click', () => {
  monitoringError.textContent = '';
  window.electronAPI.stopMonitoring();
});

function updateNtfyUI(info) {
  if (!info) return;
  makeQR(qrCodeContainer, info.protocolUrl);
  qrCodeContainer.style.display = 'block';
  qrPlaceholder.style.display = 'none';

  const shortTopic = info.topic.length > 30 ? info.topic.slice(0, 30) + '…' : info.topic;
  ntfyTopicValue.textContent = shortTopic;
  ntfyTopicValue.title = info.topic;
}

const STORE_URLS = {
  android: 'https://play.google.com/store/apps/details?id=io.heckel.ntfy',
  ios:     'https://apps.apple.com/us/app/ntfy/id1625396347'
};

$('link-android').addEventListener('click', () => showStoreQR('android'));
$('link-ios')    .addEventListener('click', () => showStoreQR('ios'));
$('store-qr-close').addEventListener('click', () => hideModal(storeQrModal));

function showStoreQR(platform) {
  storeQrTitle.textContent = i18n.t(platform === 'android' ? 'connect.androidLink' : 'connect.iosLink');
  makeQR(storeQrCode, STORE_URLS[platform]);
  showModal(storeQrModal);
}

$('btn-test').addEventListener('click', () => {
  const btn = $('btn-test');
  if (btn.disabled) return;
  btn.disabled = true;
  const original = btn.textContent;
  btn.textContent = '. . .';
  window.electronAPI.sendTestNotification();
  setTimeout(() => {
    btn.textContent = '✓';
    setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 400);
  }, 500);
});
$('btn-regenerate').addEventListener('click', () => showModal($('regen-modal')));
$('regen-cancel') .addEventListener('click', () => hideModal($('regen-modal')));
$('regen-confirm').addEventListener('click', async () => {
  hideModal($('regen-modal'));
  updateNtfyUI(await window.electronAPI.regenerateNtfyTopic());
});

window.electronAPI.onDirectoryChosen(dir => {
  currentDirectory = dir;
  directoryValue.textContent = dir || i18n.t('directory.none');
  updateMonitoringUI();
  if (dir) detectionFeedback.textContent = '';
});
window.electronAPI.onDetectionResult(msg => detectionFeedback.textContent = msg || '');

window.electronAPI.onShowAutoDetectedModal(dir => {
  $('auto-modal-text').textContent = i18n.t('modals.autoDetectedBody', { path: dir });
  showModal($('auto-modal'));
});

chooseBtn.addEventListener('click', () => {
  detectionFeedback.textContent = '';
  window.electronAPI.chooseDirectory();
});
detectBtn.addEventListener('click', async () => {
  detectionFeedback.textContent = i18n.t('directory.detecting');
  detectBtn.disabled = true;
  await window.electronAPI.detectDirectories();
  detectBtn.disabled = false;
});
$('auto-modal-ok').addEventListener('click', () => {
  hideModal($('auto-modal'));
  window.electronAPI.autoDetectedModalAck();
});

const SETTINGS_TOGGLES = [
  { id: 'chk-delete-processed', key: 'deleteAfterProcessing', defaultOn: true },
  { id: 'chk-minimize-tray',    key: 'minimizeToTray',        defaultOn: true },
  { id: 'chk-auto-start',       key: 'autoStartMonitoring',   defaultOn: false },
  { id: 'chk-show-event-log',   key: 'showEventLog',          defaultOn: false },
];

const settingsModal = $('settings-modal');

$('btn-settings').addEventListener('click', async () => {
  for (const toggle of SETTINGS_TOGGLES) {
    const val = await window.electronAPI.getSetting(toggle.key);
    $(toggle.id).checked = toggle.defaultOn ? val !== false : val === true;
  }
  showModal(settingsModal);
});

$('settings-close').addEventListener('click', async () => {
  for (const toggle of SETTINGS_TOGGLES) {
    await window.electronAPI.setSetting(toggle.key, $(toggle.id).checked);
  }
  hideModal(settingsModal);
  applyLogVisibility();
});

async function applyLogVisibility() {
  logVisible = (await window.electronAPI.getSetting('showEventLog')) === true;
  logSection.style.display = logVisible ? 'block' : 'none';
}

function renderLog(items) {
  logList.innerHTML = '';
  for (const item of items) {
    const li = document.createElement('li');

    const time = document.createElement('span');
    time.className = 'log-time';
    time.textContent = new Date(item.ts).toLocaleTimeString();

    const msg = document.createElement('span');
    msg.className = 'log-msg';
    msg.textContent = i18n.t(item.key, item.vars);

    li.append(time, msg);
    logList.appendChild(li);
  }

  const empty = items.length === 0;
  clearLogBtn.disabled = empty;
  logEmpty.style.display = empty ? 'block' : 'none';
  logList.style.display  = empty ? 'none'  : 'block';
}

clearLogBtn.addEventListener('click', () => window.electronAPI.clearLog());
window.electronAPI.onLogUpdated(renderLog);

$('btn-close')   .addEventListener('click', () => window.electronAPI.requestAppClose());
$('btn-minimize').addEventListener('click', () => window.electronAPI.requestMinimize());

i18n.applyToDOM();
stopBtn.style.display = 'none';
startBtn.disabled = true;

(async () => {
  renderLog(await window.electronAPI.requestNotificationLog());
  updateNtfyUI(await window.electronAPI.getNtfyInfo());
  await applyLogVisibility();
})();
