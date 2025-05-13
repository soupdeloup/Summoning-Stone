const directoryValue  = document.getElementById('directory-value');
const monitoringValue = document.getElementById('monitoring-value');
const phonesList      = document.getElementById('phones-list');
const detectionFeedback = document.getElementById('detection-feedback');
const noPhonesMsg       = document.getElementById('no-phones-msg');
const monitoringError   = document.getElementById('monitoring-error');
const closeButton       = document.getElementById('btn-close');
const settingsButton    = document.getElementById('btn-settings');
const chooseBtn         = document.getElementById('btn-choose');
const detectBtn         = document.getElementById('btn-detect');
const startBtn          = document.getElementById('btn-start');
const stopBtn           = document.getElementById('btn-stop');
const clearLogBtn       = document.getElementById('btn-clear-log');

let currentDirectory = null;
let isMonitoring     = false;

// ────────────────── window controls ──────────────────
closeButton.addEventListener('click', () => window.electronAPI.requestAppClose());

// ────────────────── settings modal ───────────────────
settingsButton.addEventListener('click', async () => {
  document.getElementById('chk-delete-processed').checked =
    (await window.electronAPI.getSetting('deleteAfterProcessing')) !== false;
  document.getElementById('chk-minimize-tray').checked =
    (await window.electronAPI.getSetting('minimizeToTray')) !== false;
  document.getElementById('settings-modal').style.display = 'flex';
});

document.getElementById('settings-close').addEventListener('click', () => {
  window.electronAPI.setSetting(
    'deleteAfterProcessing',
    document.getElementById('chk-delete-processed').checked
  );
  window.electronAPI.setSetting(
    'minimizeToTray',
    document.getElementById('chk-minimize-tray').checked
  );
  document.getElementById('settings-modal').style.display = 'none';
});

// ───────────── directory + monitoring buttons ─────────
chooseBtn.addEventListener('click', () => {
  detectionFeedback.textContent = '';
  window.electronAPI.chooseDirectory();
});

detectBtn.addEventListener('click', async () => {
  detectionFeedback.textContent = 'Detecting...';
  detectBtn.disabled = true;
  await window.electronAPI.detectDirectories();
  detectBtn.disabled = false;
});

startBtn.addEventListener('click', () => {
  monitoringError.textContent = '';
  window.electronAPI.startMonitoring();
});

stopBtn.addEventListener('click', () => {
  monitoringError.textContent = '';
  window.electronAPI.stopMonitoring();
});

clearLogBtn.addEventListener('click', () => window.electronAPI.clearLog());

// ───────────────────── ipc listeners ─────────────────
window.electronAPI.onDirectoryChosen(dir => {
  currentDirectory = dir;
  directoryValue.textContent = dir || 'None';
  startBtn.disabled = !dir;
  if (dir) detectionFeedback.textContent = '';
});

window.electronAPI.onMonitoringStatus(status => {
  isMonitoring = status;
  monitoringValue.textContent = status ? 'Running' : 'Stopped';
  monitoringValue.style.color = status ? '#80ff80' : '#ff8080';
  startBtn.disabled = status || !currentDirectory;
  stopBtn.disabled  = !status;
  chooseBtn.disabled = status;
  detectBtn.disabled = status;
});

window.electronAPI.onMonitoringError(msg => monitoringError.textContent = msg || '');

window.electronAPI.onPhonesUpdated(phones => {
  phonesList.innerHTML = '';
  if (phones && phones.length) {
    noPhonesMsg.style.display = 'none';
    phones.forEach(p => {
      const li = document.createElement('li');
      li.textContent = `${p.name} (${p.ip}:${p.port})`;
      phonesList.appendChild(li);
    });
  } else {
    noPhonesMsg.style.display = 'block';
    phonesList.appendChild(noPhonesMsg);
  }
});

window.electronAPI.onDetectionResult(msg => detectionFeedback.textContent = msg || '');

// ───────────────────── log handling ──────────────────
const autoModal     = document.getElementById('auto-modal');
const autoModalText = document.getElementById('auto-modal-text');
const autoModalOk   = document.getElementById('auto-modal-ok');

window.electronAPI.onShowAutoDetectedModal(dir => {
  autoModalText.textContent = `Screenshot directory automatically detected:\n${dir}`;
  autoModal.style.display = 'flex';
});

autoModalOk.addEventListener('click', () => {
  autoModal.style.display = 'none';
  window.electronAPI.autoDetectedModalAck();
});

const logList   = document.getElementById('log-list');
const toggleLog = document.getElementById('toggle-log');

function renderLog(items) {
  logList.innerHTML = '';
  items.forEach(({ ts, entry }) => {
    const li = document.createElement('li');
    li.textContent = `${new Date(ts).toLocaleString()} – ${entry}`;
    logList.appendChild(li);
  });
  clearLogBtn.disabled = items.length === 0;
}

toggleLog.addEventListener('click', () => {
  const shown = logList.style.display !== 'none';
  logList.style.display = shown ? 'none' : 'block';
  toggleLog.textContent = `Event Log ${shown ? '+' : '-'}`;
});

(async () => {
  renderLog(await window.electronAPI.requestNotificationLog());
})();

window.electronAPI.onLogUpdated(renderLog);

// initial button states
startBtn.disabled = true;
stopBtn.disabled  = true;
