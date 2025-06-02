const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { WEB_SERVER_PORT, DEFAULT_NOTIFICATION_TIMER_SECONDS, MAX_WEB_NOTIFICATIONS } = require('./constants');
const logManager = require('./log-manager');

function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    for (const alias of iface) {
      if (alias.family === 'IPv4' && !alias.internal) {
        return alias.address;
      }
    }
  }
  return '127.0.0.1';
}

const notifications = [];
let server = null;
let port = WEB_SERVER_PORT;

const clients = [];

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav'
};

function serveStaticFile(filePath, res) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('File not found');
      } else {
        res.writeHead(500);
        res.end('Server error');
      }
      return;
    }

    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
}

function getWebServerStatus() {
  const ipAddress = getLocalIpAddress();
  return {
    running: server !== null,
    url: server ? `http://${ipAddress}:${port}` : null
  };
}

function startWebServer() {
  if (server) return;
  const windowManager = require('./window-manager');
  const webAssetsPath = path.join(__dirname, 'web-assets');
  
  server = http.createServer((req, res) => {
    if (req.url === '/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });
      
      const now = Date.now();
      notifications.forEach(notification => {
        if (!notification.expired && notification.expiresAt && now > notification.expiresAt) {
          notification.expired = true;
        }
      });
      
      notifications.forEach(notification => {
        res.write(`data: ${JSON.stringify(notification)}\n\n`);
      });
      
      const clientId = Date.now();
      clients.push({ id: clientId, res });
      
      req.on('close', () => {
        const index = clients.findIndex(client => client.id === clientId);
        if (index !== -1) {
          clients.splice(index, 1);
        }
      });
    }
    else if (req.url === '/api/config') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        defaultTimerDuration: DEFAULT_NOTIFICATION_TIMER_SECONDS,
        maxNotifications: MAX_WEB_NOTIFICATIONS
      }));
    }
    else {
      let filePath = path.join(webAssetsPath, req.url === '/' ? 'index.html' : req.url);
      
      if (!filePath.startsWith(webAssetsPath)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }
      
      serveStaticFile(filePath, res);
    }
  });
  
  server.listen(port, () => {
    const ipAddress = getLocalIpAddress();
    logManager.addLog(`Web server started at http://${ipAddress}:${port}`);
    windowManager.sendMessageToRenderer('web-server-status', {
      running: true,
      url: `http://${ipAddress}:${port}`
    });
  });
  
  server.on('error', (err) => {
    console.error('Web server error:', err);
    if (err.code === 'EADDRINUSE') {
      port++;
      server.listen(port);
    }
  });
  
  return server;
}

function stopWebServer() {
  if (!server) return;
  const windowManager = require('./window-manager');
  clients.forEach(client => {
    try {
      client.res.end();
    } catch (err) {
      console.error('Error closing client connection:', err);
    }
  });
  clients.length = 0;
  
  server.close(() => {
    windowManager.sendMessageToRenderer('web-server-status', {
      running: false,
      url: null
    });
  
    logManager.addLog('Web server stopped');
  });
  
  server = null;
}

function sendWebNotification(time, colour) {
  const notification = { 
    time, 
    colour, 
    timestamp: Date.now(),
    expiresAt: Date.now() + (DEFAULT_NOTIFICATION_TIMER_SECONDS * 1000),
    expired: false
  };
  
  notifications.unshift(notification);
  if (notifications.length > MAX_WEB_NOTIFICATIONS) {
    notifications.pop();
  }
  
  const now = Date.now();
  notifications.forEach(notification => {
    if (!notification.expired && notification.expiresAt && now > notification.expiresAt) {
      notification.expired = true;
    }
  });
  
  const message = `data: ${JSON.stringify(notification)}\n\n`;
  clients.forEach(client => {
    try {
      client.res.write(message);
    } catch (err) {
      console.error('Error sending to client:', err);
    }
  });
  
  logManager.addLog(`Web notification sent (${time || '1'}) colour:${colour}`);
}

module.exports = {
  startWebServer,
  stopWebServer,
  sendWebNotification,
  getWebServerStatus
};