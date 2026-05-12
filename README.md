# Summoning Stone – Desktop App

**WoW Addon can be found here:** https://www.curseforge.com/wow/addons/summoning-stone

**Summoning Stone** is a desktop application built with Electron. It monitors the World of Warcraft screenshot directory for new screenshots and sends a notification using **https://ntfy.sh/**.

## Setup Options

### Option 1: Clone and Install

```bash
git clone https://github.com/soupdeloup/summoning-stone.git
cd summoning-stone
npm install
```

### Once installed, start through command line:

```bash
npm start
```

### Optionally, you can build an executable instead of using the command line:

```bash
npm run build
```

This uses `electron-builder` to generate a standalone executable in the `dist` folder.

### Option 2: Download the standalone executable from the 'Releases' section of this Github page

*Please note* that the exe is unsigned, which means that you'll probably get Microsoft/anti-virus popups saying the app developer is unknown and that the app may be unsafe. You can ignore these warnings and run application, or you can use option 1 to copy and run the code yourself.

## Usage

- Ensure the Summoning Stone WoW addon is installed into your `World of Warcraft\_retail_\Interface\AddOns` folder (or use your preferred mod manager).
- The app will try to detect the default WoW screenshot path. If not found, you can manually set it.
- Click either the Android or Apple store link and download the ntfy app.
- Once you have the app installed, use your phone camera to scan the main QR code to subscribe to the ntfy notification room.
- Push 'start monitoring' in the bottom right and start the game.
