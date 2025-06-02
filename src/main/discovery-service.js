const Bonjour = require('bonjour');
const dgram = require('dgram');
const os = require('os');
const { HEARTBEAT_MESSAGE } = require('./constants');
const logManager = require('./log-manager');

let bonjour = null;
let udpSocket = null;
let discoveredPhonesMap = {};

function discoverPhones() {
  bonjour = Bonjour();
  udpSocket = dgram.createSocket('udp4');

  const browser = bonjour.find({ type: 'summoningstone', protocol: 'udp' });

  browser.on('up', s => {
    const ip = s.addresses.find(addr => addr && addr.split('.').length === 4);
    if (!ip) return;

    discoveredPhonesMap[ip] = { ip, port: s.port, name: s.name || 'Device' };
    broadcastPhonesUpdate();
  });

  browser.on('down', s => {
    const ip = s.addresses.find(a => a && a.split('.').length === 4);
    if (!ip || !discoveredPhonesMap[ip]) return;
    delete discoveredPhonesMap[ip];
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
  }
}

function getDiscoveredPhones() {
  return Object.values(discoveredPhonesMap);
}

function broadcastPhonesUpdate() {
  const windowManager = require('./window-manager');
  windowManager.sendMessageToRenderer('phones-updated', Object.values(discoveredPhonesMap));
}

function sendNotification(time, colour) {
  const phones = Object.values(discoveredPhonesMap);
  if (!phones.length) return;
  const msg = Buffer.from(time || '1');
  
  phones.forEach(({ ip, port }) => {
    if (udpSocket) {
      udpSocket.send(msg, 0, msg.length, port, ip, () => { });
    }
  });
  
  logManager.addLog(`alert sent (${time || '1'}) colour:${colour}`);
}

function sendHeartbeat() {
  const phones = Object.values(discoveredPhonesMap);
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
  sendHeartbeat,
  getDiscoveredPhones
};