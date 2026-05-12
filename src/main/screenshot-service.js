const { ipcMain, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const chokidar = require('chokidar');
const settings = require('./settings-manager');
const logManager = require('./log-manager');
const ntfy = require('./ntfy-service');
const windowManager = require('./window-manager');
const i18n = require('./i18n');
const { BARCODE, FILE_WATCHER } = require('./constants');

let currentWatcher = null;
let isMonitoring = false;

function getMonitoringStatus() {
  return isMonitoring;
}

// The addon paints a horizontal strip of 84 blocks at the top-left corner.
// Blocks 0-1 are a calibration pair (white then black) that let us measure
// block width in pixels regardless of resolution or UI scale.
// Blocks 2-3 encode the event type (2 bits) and blocks 4-83 carry 80 bits
// (10 ASCII bytes) of payload.
// Probably overkill for something so straightforward, but leaves things open
// for other uses in the future.

// how much of the screenshot to extract for barcode reading
const STRIP_HEIGHT_RATIO = 0.05;  // fraction of image height
const STRIP_MAX_HEIGHT   = 120;   // px cap
const STRIP_MAX_WIDTH    = 2400;  // px cap (covers 4K at low UI scale)

// brightness midpoint for black/white classification (0–255)
const BW_THRESHOLD = 128;

async function decodeBarcode(filePath) {
  const buf = await fsp.readFile(filePath);
  const img = nativeImage.createFromBuffer(buf);
  if (img.isEmpty()) return null;
  const { width: imgW, height: imgH } = img.getSize();

  const stripH = Math.min(Math.floor(imgH * STRIP_HEIGHT_RATIO), STRIP_MAX_HEIGHT);
  const stripW = Math.min(imgW, STRIP_MAX_WIDTH);

  const cropped = img.crop({ x: 0, y: 0, width: stripW, height: stripH });
  const data = cropped.toBitmap();  // RGBA, 4 bytes per pixel

  // barcode calibration
  // Scan down column inside block 0 (white) until brightness drops. 
  // This tells us the actual block height in pixels.

  let blockH = 0;
  for (let y = 0; y < stripH; y++) {
    const idx = (y * stripW + 5) * 4;  // x=5, safely inside block 0
    if ((data[idx] + data[idx + 1] + data[idx + 2]) / 3 < BW_THRESHOLD) { blockH = y; break; }
  }
  if (blockH < BARCODE.MIN_BLOCK_WIDTH) return null;

  // scan along  vertical centre to get width
  const midY = Math.floor(blockH / 2);
  let blockW = 0;

  for (let x = 0; x < stripW; x++) {
    const idx = (midY * stripW + x) * 4;
    const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
    if (brightness < BW_THRESHOLD) { blockW = x; break; }
  }

  if (blockW < BARCODE.MIN_BLOCK_WIDTH) return null;

  // center of block 1 should be dark
  const b1x = Math.floor(blockW * 1.5);
  const b1  = (midY * stripW + b1x) * 4;
  if ((data[b1] + data[b1 + 1] + data[b1 + 2]) / 3 > BW_THRESHOLD) return null;

  // read data blocks 2-23
  const sampleR = Math.max(1, Math.floor(blockW / 6));
  const bits = [];

  for (let i = 2; i < BARCODE.TOTAL_BLOCKS; i++) {
    const cx = Math.floor(i * blockW + blockW / 2);
    if (cx >= stripW) return null;

    // overly complex feathering for potential jpeg artifacts
    let sum = 0, n = 0;
    for (let dy = -sampleR; dy <= sampleR; dy++) {
      for (let dx = -sampleR; dx <= sampleR; dx++) {
        const sx = cx + dx, sy = midY + dy;
        if (sx >= 0 && sx < stripW && sy >= 0 && sy < stripH) {
          const idx = (sy * stripW + sx) * 4;
          sum += (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          n++;
        }
      }
    }
    bits.push(sum / n > BW_THRESHOLD ? 1 : 0);
  }

  // decode type + payload
  const eventType = (bits[0] << 1) | bits[1];

  const payloadChars = [];
  for (let ci = 0; ci < BARCODE.PAYLOAD_BYTES; ci++) {
    let byte = 0;
    for (let bi = 0; bi < 8; bi++) {
      byte = (byte << 1) | bits[2 + ci * 8 + bi];
    }
    if (byte > 0) payloadChars.push(byte);
  }
  const payload = String.fromCharCode(...payloadChars);

  return { eventType, payload };
}

function startMonitoring() {
  stopMonitoring();

  const dir = settings.get('monitoredDirectory');
  if (!dir) {
    windowManager.sendMessageToRenderer('monitoring-status-error', 'No directory set to monitor.');
    return;
  }

  windowManager.sendMessageToRenderer('monitoring-status-error', '');

  currentWatcher = chokidar.watch(dir, {
    persistent: true,
    ignoreInitial: true,
    depth: 0,
    awaitWriteFinish: {
      stabilityThreshold: FILE_WATCHER.STABILITY_THRESHOLD,
      pollInterval:       FILE_WATCHER.POLL_INTERVAL
    }
  });

  currentWatcher.on('add', processScreenshot);
  currentWatcher.on('error', (e) => {
    windowManager.sendMessageToRenderer('monitoring-status-error', `Error watching directory: ${e.message}`);
    stopMonitoring();
  });

  isMonitoring = true;
  windowManager.sendMessageToRenderer('monitoring-status', isMonitoring);
}

function stopMonitoring() {
  if (currentWatcher) {
    currentWatcher.close();
    currentWatcher = null;
  }
  isMonitoring = false;
  windowManager.sendMessageToRenderer('monitoring-status', isMonitoring);
  windowManager.sendMessageToRenderer('monitoring-status-error', '');
}

async function processScreenshot(filePath) {
  const filename = path.basename(filePath);
  try {
    const result = await decodeBarcode(filePath);
    if (!result) return; // not a Summoning Stone screenshot

    ntfy.sendNotification(result.eventType, result.payload);
    const label = ntfy.getLabel(result.eventType, result.payload);

    if (settings.get('deleteAfterProcessing') !== false) {
      await fsp.unlink(filePath);
      logManager.add('events.deleted', { label });
    } else {
      logManager.add('events.kept', { label });
    }
  } catch (err) {
    logManager.add('events.error', { filename, message: err.message });
  }
}

ipcMain.on('start-monitoring', startMonitoring);
ipcMain.on('stop-monitoring', stopMonitoring);
ipcMain.on('send-test-notification', () => {
  ntfy.sendNotification(0, 0);
  logManager.add('events.testSent');
});

module.exports = {
  getMonitoringStatus,
  startMonitoring,
  stopMonitoring
};
