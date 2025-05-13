# Summoning Stone – Desktop App

**WoW Addon can be found here:** https://www.curseforge.com/wow/addons/summoning-stone

**Android application still under development. If you'd like to be a tester, please join the google group to get access: https://groups.google.com/u/2/g/summoning-stone-android**

**Summoning Stone** is a desktop application built with Electron. It monitors the World of Warcraft screenshot directory for new screenshots and sends a UDP notification to an Android device running the Summoning Stone Android app. It is only functional when used alongside the Summoning Stone World of Warcraft addon and companion Android application.

## Setup Options

### Option 1: Clone and Install

```bash
git clone https://github.com/soupdeloup/summoning_stone.git
cd summoning_stone
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

- The app will try to detect the default WoW screenshot path. If not found, you can manually set it.
- The Android app must be connected to the same local network and will be auto-detected by the app.
- UDP packets are sent to the device whenever a screenshot is detected, triggering a notification alert.
- You can set the application to automatically minimize to the system tray in the settings menu. You can also automatically delete processed screenshots.
