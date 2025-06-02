module.exports = {
  DEFAULT_SETTING_VALUES: {
    DELETE_AFTER_PROCESSING: true,
    MINIMIZE_TO_TRAY: true,
    NOTIFICATION_METHOD: 'web',
    AUTO_DETECT_MODAL_SHOWN: false,
    SHOW_EVENT_LOG: false,
    MONITORED_DIRECTORY: null
  },

  WEB_SERVER_PATHS: {
    EVENTS: '/events',
    API_CONFIG: '/api/config',
    ROOT: '/'
  },
  
  HEARTBEAT_INTERVAL_MS: 5000,
  HEARTBEAT_MESSAGE: 'PING',
  WEB_SERVER_PORT: 3000,
  
  PROBE: { left: 0, top: 0, width: 20, height: 20 },
  TOL: 5,
  
  FILE_WATCHER_STABILITY_THRESHOLD: 500,
  FILE_WATCHER_POLL_INTERVAL: 150,
  
  WINDOW_WIDTH: 500,
  WINDOW_HEIGHT: 800,
  WINDOW_ALWAYS_ON_TOP_DURATION: 1000,
  
  APP_NAME: 'Summoning Stone',
  APP_TITLE: 'Summoning Stone - WoW Alerts',
  TRAY_TOOLTIP: 'Summoning Stone Monitor',
  WEB_PAGE_TITLE: 'Summoning Stone Notifications',
  
  MAX_LOG_ENTRIES: 200,
  MAX_WEB_NOTIFICATIONS: 20,
  
  DEFAULT_NOTIFICATION_TIMER_SECONDS: 30,
  
  POTENTIAL_WOW_PATHS: [
    'C:\\Program Files (x86)\\World of Warcraft\\_retail_',
    'C:\\Program Files\\World of Warcraft\\_retail_',
    'C:\\Games\\World of Warcraft\\_retail_',
    'D:\\Program Files (x86)\\World of Warcraft\\_retail_',
    'D:\\Program Files\\World of Warcraft\\_retail_',
    'D:\\Games\\World of Warcraft\\_retail_',
    'D:\\World of Warcraft\\_retail_',
    'E:\\Program Files (x86)\\World of Warcraft\\_retail_',
    'E:\\Program Files\\World of Warcraft\\_retail_',
    'E:\\Games\\World of Warcraft\\_retail_',
    'E:\\World of Warcraft\\_retail_'
  ]
};