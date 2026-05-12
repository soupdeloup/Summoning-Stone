const en = {
  app: {
    name: 'Summoning Stone',
    title: 'Summoning Stone',
    trayTooltip: 'Summoning Stone Monitor'
  },
  titleBar: {
    minimize: 'Minimize',
    settings: 'Settings',
    close: 'Close'
  },
  status: {
    monitoring: 'Monitoring',
    stopped: 'Stopped',
    startMonitoring: 'Start Monitoring',
    stopMonitoring: 'Stop Monitoring'
  },
  connect: {
    title: 'Connect Your Phone',
    description: 'Install the <em>ntfy</em> app on your phone, then scan this QR code to subscribe to notifications.',
    androidLink: 'Android (Google Play)',
    iosLink: 'iOS (App Store)',
    qrLoading: 'Generating…',
    topicLabel: 'Topic',
    sendTest: 'Send Test Notification',
    regenerateTitle: 'Generate new topic'
  },
  directory: {
    title: 'Screenshot Directory',
    none: 'No directory selected',
    chooseFolder: 'Choose Folder',
    autoDetect: 'Auto-Detect',
    detecting: 'Detecting…',
    detectedAndSet: 'Auto-detected: {path}',
    verified: 'Verified existing directory: {path}',
    notFound: 'No WoW Screenshot directory found. Please choose it manually.'
  },
  log: {
    title: 'Event Log',
    clear: 'Clear',
    empty: 'No events yet'
  },
  settings: {
    title: 'Settings',
    deleteProcessed: 'Delete screenshots after processing',
    minimizeToTray: 'Minimize to tray',
    autoStart: 'Auto-start monitoring on launch',
    showEventLog: 'Show Event Log section',
    done: 'Done'
  },
  modals: {
    autoDetectedHeading: 'Directory Detected',
    autoDetectedBody: 'Screenshot directory detected:\n{path}',
    ok: 'OK',
    regenerateTitle: 'Generate a new topic?',
    regenerateBody: "You'll need to re-scan the QR code on your phone.",
    cancel: 'Cancel',
    regenerate: 'Regenerate'
  },
  tray: {
    startMonitoring: 'Start Monitoring',
    stopMonitoring: 'Stop Monitoring',
    show: 'Show',
    quit: 'Quit'
  },
  notifications: {
    queueReady: 'Queue Ready',
    dungeonReady: 'Dungeon Ready',
    arenaReady: 'Arena Ready',
    rareSpawned: 'Rare Spawned',
    alert: 'Alert'
  },
  events: {
    deleted: 'Deleted screenshot ({label})',
    kept: 'Kept screenshot ({label})',
    error: 'Error processing {filename}: {message}',
    ntfySent: 'Sent: {label}',
    ntfyError: 'Send failed: {detail}',
    testSent: 'Test notification sent'
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = en;
}
if (typeof window !== 'undefined') {
  window.SS_LOCALES = window.SS_LOCALES || {};
  window.SS_LOCALES.en = en;
}
