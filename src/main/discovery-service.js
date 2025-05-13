const Bonjour = require('bonjour');
const dgram = require('dgram');
const os = require('os');
const { HEARTBEAT_INTERVAL_MS, HEARTBEAT_MESSAGE } = require('./constants');

let bonjour = null;
let udpSocket = null;

function discoverPhones() {
  bonjour = Bonjour();
  udpSocket = dgram.createSocket('udp4');
  global.udpSocket = udpSocket;

  const browser = bonjour.find({ type: 'summoningstone', protocol: 'udp' });

  browser.on('up', s => {
    const ip = s.addresses.find(addr => addr && addr.split('.').length === 4);
    if (!ip) return;

    global.discoveredPhonesMap[ip] = { ip, port: s.port, name: s.name || 'Device' };
    broadcastPhonesUpdate();
  });

  browser.on('down', s => {
    const ip = s.addresses.find(a => a && a.split('.').length === 4);
    if (!ip || !global.discoveredPhonesMap[ip]) return;
    delete global.discoveredPhonesMap[ip];
    broadcastPhonesUpdate();
  });
}

function stopDiscovery() {
  if (bonjour) {
    bonjour.destroy();
    bonjour = null;
  }
  
  if (udpSocket) {
    try { 
      udpSocket.close(); 
    } catch (err) {
      console.error('Error closing UDP socket:', err.message);
    }
    udpSocket = null;
    global.udpSocket = null;
  }
}

function broadcastPhonesUpdate() {
  if (global.mainWindow && !global.mainWindow.isDestroyed())
    global.mainWindow.webContents.send('phones-updated', Object.values(global.discoveredPhonesMap));
}

function sendNotification(time, colour) {
  const phones = Object.values(global.discoveredPhonesMap);
  if (!phones.length) return;
  const msg = Buffer.from(time || '1');
  
  phones.forEach(({ ip, port }) => {
    if (udpSocket) {
      udpSocket.send(msg, 0, msg.length, port, ip, () => { });
    }
  });
  
  const { addLog } = require('./settings-manager');
  addLog(`alert sent (${time || '1'}) colour:${colour}`);
}

function sendHeartbeat() {
  const phones = Object.values(global.discoveredPhonesMap);
  if (!phones.length) return;
  
  const buf = Buffer.from(`${os.hostname() || 'Desktop'};${HEARTBEAT_MESSAGE}`);
  phones.forEach(({ ip, port }) => {
    if (udpSocket) {
      udpSocket.send(buf, 0, buf.length, port, ip, () => { });
    }
  });
}

module.exports = {
  discoverPhones,
  stopDiscovery,
  sendNotification,
  sendHeartbeat
};