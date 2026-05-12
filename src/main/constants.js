module.exports = {
  DEFAULTS: {
    deleteAfterProcessing: true,
    minimizeToTray:        false,
    autoStartMonitoring:   false,
    autoDetectModalShown:  false,
    showEventLog:          false,
    monitoredDirectory:    null,
    ntfyTopic:             null,
    locale:                'en'
  },

  NTFY_SERVER: 'https://ntfy.sh',

  // barcode logic and lengths for parsing from screenshot
  BARCODE: {
    TOTAL_BLOCKS:     84,
    TYPE_BITS:        2,
    PAYLOAD_BITS:     80,
    PAYLOAD_BYTES:    10,
    MIN_BLOCK_WIDTH:  5
  },

  // event types, must match addon constants
  EVENT_TYPES: {
    0: { key: 'notifications.queueReady',   tag: 'rotating_light' },
    1: { key: 'notifications.dungeonReady', tag: 'white_check_mark' },
    2: { key: 'notifications.arenaReady',   tag: 'crossed_swords' },
    3: { key: 'notifications.rareSpawned',  tag: 'dragon' }
  },

  // chokidar file-watcher tuning
  FILE_WATCHER: {
    STABILITY_THRESHOLD: 500,
    POLL_INTERVAL:       150
  },

  WINDOW: {
    WIDTH:  600,
    HEIGHT: 800,
    ALWAYS_ON_TOP_DURATION: 1000
  },

  MAX_LOG_ENTRIES: 200
};
