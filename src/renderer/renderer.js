const directoryValue = document.getElementById('directory-value');
const mobileDevicesSection = document.getElementById('mobile-devices-section');
const monitoringValue = document.getElementById('monitoring-value');
const phonesList = document.getElementById('phones-list');
const detectionFeedback = document.getElementById('detection-feedback');
const noPhonesMsg = document.getElementById('no-phones-msg');
const monitoringError = document.getElementById('monitoring-error');
const closeButton = document.getElementById('btn-close');
const settingsButton = document.getElementById('btn-settings');
const chooseBtn = document.getElementById('btn-choose');
const detectBtn = document.getElementById('btn-detect');
const startBtn = document.getElementById('btn-start');
const stopBtn = document.getElementById('btn-stop');
const clearLogBtn = document.getElementById('btn-clear-log');
const webServerStatus = document.getElementById('web-server-status');
const webServerUrl = document.getElementById('web-server-url');
const toggleWebServerBtn = document.getElementById('btn-toggle-web-server');
const logContainer = document.querySelector('.log-container');
const chkShowEventLog = document.getElementById('chk-show-event-log');
const qrCodeBtn = document.getElementById('btn-qr-code');
const qrCodeContainer = document.getElementById('qrcode-container');

let qrCodeInstance = null;
let currentDirectory = null;
let isMonitoring = false;
let webServerCheckInterval = null;
let isWebServerRunning = false;

if (toggleWebServerBtn) {
  toggleWebServerBtn.textContent = 'Loading Status...';
  toggleWebServerBtn.disabled = true;
}

closeButton.addEventListener('click', () => window.electronAPI.requestAppClose());

window.addEventListener('DOMContentLoaded', async () => {
  await checkWebServerStatus();
  webServerCheckInterval = setInterval(checkWebServerStatus, 5000);
});

async function checkWebServerStatus() {
  window.electronAPI.getWebServerStatus();
}

if (toggleWebServerBtn) {
  toggleWebServerBtn.addEventListener('click', () => {
    toggleWebServerBtn.disabled = true;
    if (isWebServerRunning) {
      window.electronAPI.stopWebServer();
    } else {
      window.electronAPI.startWebServer();
    }
  });
}

if (qrCodeBtn) {
  qrCodeBtn.addEventListener('click', () => {
    if (qrCodeContainer.style.display === 'block' && qrCodeInstance) {
      qrCodeContainer.style.display = 'none';
      qrCodeContainer.innerHTML = '';
      qrCodeInstance = null;
      qrCodeBtn.textContent = 'Show QR Code';
    } else if (isWebServerRunning && webServerUrl.href && webServerUrl.href !== '#') {
      qrCodeContainer.innerHTML = '';
      if (typeof QRCode === 'undefined') {
        console.error('QRCode library is not loaded.');
        detectionFeedback.textContent = 'Error: QR Code library not found.';
        return;
      }
      qrCodeInstance = new QRCode(qrCodeContainer, {
        text: webServerUrl.href,
        width: 160,
        height: 160,
        colorDark: "#FFFFFF",
        colorLight: "#333333",
        correctLevel: QRCode.CorrectLevel.H
      });
      qrCodeContainer.style.display = 'block';
      qrCodeBtn.textContent = 'Hide QR Code';
    }
  });
}

settingsButton.addEventListener('click', async () => {
  document.getElementById('chk-delete-processed').checked =
    (await window.electronAPI.getSetting('deleteAfterProcessing')) !== false;
  document.getElementById('chk-minimize-tray').checked =
    (await window.electronAPI.getSetting('minimizeToTray')) !== false;
  chkShowEventLog.checked = (await window.electronAPI.getSetting('showEventLog')) === true;

  const notificationMethod = await window.electronAPI.getSetting('notificationMethod') || 'android';
  document.getElementById('notification-method-android').checked = notificationMethod === 'android';
  document.getElementById('notification-method-web').checked = notificationMethod === 'web';
  document.getElementById('notification-method-both').checked = notificationMethod === 'both';
  document.getElementById('settings-modal').style.display = 'flex';

});

async function applyDeviceListVisibility() {
  const notificationMethod = await window.electronAPI.getSetting('notificationMethod');

  if (notificationMethod === 'android' || notificationMethod === 'both') {
    mobileDevicesSection.style.display = 'block';
  } else {
    mobileDevicesSection.style.display = 'none';
  }
}

document.getElementById('settings-close').addEventListener('click', async () => {
  window.electronAPI.setSetting(
    'deleteAfterProcessing',
    document.getElementById('chk-delete-processed').checked
  );
  window.electronAPI.setSetting(
    'minimizeToTray',
    document.getElementById('chk-minimize-tray').checked
  );

  let notificationMethod = 'android';
  if (document.getElementById('notification-method-web').checked) {
    notificationMethod = 'web';
  } else if (document.getElementById('notification-method-both').checked) {
    notificationMethod = 'both';
  }

  const previousMethod = await window.electronAPI.getSetting('notificationMethod') || 'android';
  window.electronAPI.setSetting('notificationMethod', notificationMethod);

  if ((notificationMethod === 'web' || notificationMethod === 'both') &&
    (previousMethod !== 'web' && previousMethod !== 'both')) {
    window.electronAPI.startWebServer();
  } else if ((notificationMethod === 'android') &&
    (previousMethod === 'web' || previousMethod === 'both')) {
    window.electronAPI.stopWebServer();
  }
  await checkWebServerStatus();
  await window.electronAPI.setSetting('showEventLog', chkShowEventLog.checked);
  document.getElementById('settings-modal').style.display = 'none';
  await applyEventLogVisibility();
  await applyDeviceListVisibility();
});

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
  stopBtn.disabled = !status;
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

window.electronAPI.onWebServerStatus(status => {
  isWebServerRunning = status.running;
  if (status.running) {
    webServerStatus.textContent = 'Running';
    webServerStatus.style.color = '#80ff80';
    webServerUrl.textContent = status.url || '';
    webServerUrl.style.display = 'inline';
    if (status.url) {
      webServerUrl.href = status.url;
    }
    if (toggleWebServerBtn) {
      toggleWebServerBtn.textContent = 'Stop Web Server';
      toggleWebServerBtn.disabled = false;
    }
    if (qrCodeBtn) {
      qrCodeBtn.style.display = 'inline-block';
    }
  } else {
    webServerStatus.textContent = 'Stopped';
    webServerStatus.style.color = '#ff8080';
    webServerUrl.style.display = 'none';
    if (toggleWebServerBtn) {
      toggleWebServerBtn.textContent = 'Start Web Server';
      toggleWebServerBtn.disabled = false;
    }
    if (qrCodeBtn) {
      qrCodeBtn.style.display = 'none';
      qrCodeBtn.textContent = 'Show QR Code';
    }
    if (qrCodeContainer) {
      qrCodeContainer.style.display = 'none';
      qrCodeContainer.innerHTML = '';
      qrCodeInstance = null;
    }
  }
});

const autoModal = document.getElementById('auto-modal');
const autoModalText = document.getElementById('auto-modal-text');
const autoModalOk = document.getElementById('auto-modal-ok');

window.electronAPI.onShowAutoDetectedModal(dir => {
  autoModalText.textContent = `Screenshot directory automatically detected:\n${dir}`;
  autoModal.style.display = 'flex';
});

autoModalOk.addEventListener('click', () => {
  autoModal.style.display = 'none';
  window.electronAPI.autoDetectedModalAck();
});

const logList = document.getElementById('log-list');
const toggleLog = document.getElementById('toggle-log');

async function applyEventLogVisibility() {
  const showLog = await window.electronAPI.getSetting('showEventLog');
  if (logContainer) {
    logContainer.style.display = showLog ? 'flex' : 'none';
  }
}

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
  await checkWebServerStatus();
  await applyEventLogVisibility();
  await applyDeviceListVisibility();
})();

window.electronAPI.onLogUpdated(renderLog);

window.addEventListener('beforeunload', () => {
  if (webServerCheckInterval) {
    clearInterval(webServerCheckInterval);
  }
});

startBtn.disabled = true;
stopBtn.disabled = true;