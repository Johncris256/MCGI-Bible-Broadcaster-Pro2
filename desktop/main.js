'use strict';

const path = require('node:path');
const os = require('node:os');
const {
  app,
  BrowserWindow,
  ipcMain,
  clipboard,
  dialog,
  screen,
  shell,
} = require('electron');

const PORT = Number(process.env.PORT || 3300);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const PRELOAD_PATH = path.join(__dirname, 'preload.js');

let dashboardWindow = null;
let serverRuntime = null;
let shutdownStarted = false;
let shutdownComplete = false;
const moduleWindows = new Map();

const MODULES = {
  operator: {
    title: 'Bible Operator',
    url: '/operator/index.html',
    width: 1480,
    height: 960,
  },
  output: {
    title: 'Live Broadcast Output',
    url: '/output/output.html',
    width: 1280,
    height: 720,
  },
  highlighter: {
    title: 'Highlighter Station',
    url: '/highlighter/',
    width: 1280,
    height: 850,
  },
};

function getLocalIPv4() {
  const interfaces = os.networkInterfaces();
  for (const entries of Object.values(interfaces)) {
    for (const item of entries || []) {
      if (item && item.family === 'IPv4' && !item.internal) return item.address;
    }
  }
  return '127.0.0.1';
}

function getAppInfo() {
  const lanIp = getLocalIPv4();
  return {
    appName: app.getName(),
    version: app.getVersion(),
    port: PORT,
    localUrl: `${BASE_URL}/`,
    operatorUrl: `${BASE_URL}/operator/`,
    outputUrl: `http://${lanIp}:${PORT}/output/output.html`,
    localOutputUrl: `${BASE_URL}/output/output.html`,
    highlighterUrl: `http://${lanIp}:${PORT}/highlighter/`,
    localHighlighterUrl: `${BASE_URL}/highlighter/`,
    lanIp,
    dataDirectory: app.getPath('userData'),
    serverRunning: Boolean(serverRuntime && serverRuntime.server && serverRuntime.server.listening),
  };
}

function getWindowOptions(id, displayTarget) {
  const moduleInfo = MODULES[id];
  const options = {
    title: moduleInfo.title,
    width: moduleInfo.width,
    height: moduleInfo.height,
    minWidth: id === 'output' ? 800 : 900,
    minHeight: id === 'output' ? 450 : 600,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0b1220',
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  };

  if (displayTarget === 'second') {
    const displays = screen.getAllDisplays();
    const primary = screen.getPrimaryDisplay();
    const secondary = displays.find((display) => display.id !== primary.id);
    if (secondary) {
      const area = secondary.workArea;
      options.x = area.x;
      options.y = area.y;
      options.width = area.width;
      options.height = area.height;
    }
  }
  return options;
}

function openModule(moduleId, displayTarget = 'primary') {
  if (moduleId === 'settings') return openSettingsWindow();
  const moduleInfo = MODULES[moduleId];
  if (!moduleInfo) throw new Error(`Unknown module: ${moduleId}`);

  const existing = moduleWindows.get(moduleId);
  if (existing && !existing.isDestroyed()) {
    existing.show();
    existing.focus();
    return { opened: true, reused: true, moduleId };
  }

  const win = new BrowserWindow(getWindowOptions(moduleId, displayTarget));
  moduleWindows.set(moduleId, win);
  win.setMenuBarVisibility(false);
  win.once('ready-to-show', () => {
    win.show();
    if (displayTarget === 'second' && screen.getAllDisplays().length > 1) win.maximize();
  });
  win.on('closed', () => moduleWindows.delete(moduleId));
  win.webContents.setWindowOpenHandler(({ url }) => {
    // Keep all app modules under the local broadcast server. External sites are
    // opened in the user's default browser rather than inside the control UI.
    if (/^https?:\/\//i.test(url) && !url.startsWith(BASE_URL)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.loadURL(`${BASE_URL}${moduleInfo.url}`).catch((error) => {
    dialog.showErrorBox(`Unable to open ${moduleInfo.title}`, error.message);
    if (!win.isDestroyed()) win.close();
  });
  return { opened: true, reused: false, moduleId };
}

function openSettingsWindow() {
  const existing = moduleWindows.get('settings');
  if (existing && !existing.isDestroyed()) {
    existing.show();
    existing.focus();
    return { opened: true, reused: true, moduleId: 'settings' };
  }

  const win = new BrowserWindow({
    title: 'Settings',
    width: 760,
    height: 680,
    minWidth: 640,
    minHeight: 560,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0b1220',
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  moduleWindows.set('settings', win);
  win.setMenuBarVisibility(false);
  win.once('ready-to-show', () => win.show());
  win.on('closed', () => moduleWindows.delete('settings'));
  win.loadFile(path.join(__dirname, 'settings.html'));
  return { opened: true, reused: false, moduleId: 'settings' };
}

function createDashboardWindow() {
  dashboardWindow = new BrowserWindow({
    title: 'MCGI Bible Broadcaster Pro',
    width: 1180,
    height: 820,
    minWidth: 900,
    minHeight: 680,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0b1220',
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  dashboardWindow.setMenuBarVisibility(false);
  dashboardWindow.once('ready-to-show', () => dashboardWindow.show());
  dashboardWindow.on('closed', () => { dashboardWindow = null; });
  dashboardWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  dashboardWindow.loadFile(path.join(__dirname, 'dashboard.html'));
}

ipcMain.handle('app:get-info', () => getAppInfo());
ipcMain.handle('app:open-module', (_event, payload) => {
  const id = typeof payload === 'string' ? payload : payload && payload.id;
  const display = payload && typeof payload === 'object' ? payload.display : 'primary';
  return openModule(id, display || 'primary');
});
ipcMain.handle('app:copy-text', (_event, value) => {
  clipboard.writeText(String(value ?? ''));
  return true;
});
ipcMain.handle('app:open-output-url', async () => {
  const url = getAppInfo().outputUrl;
  await shell.openExternal(url);
  return url;
});
ipcMain.handle('app:close-current-window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && win !== dashboardWindow) win.close();
  return true;
});

app.whenReady().then(async () => {
  app.setAppUserModelId('org.mcgi.biblebroadcast.pro');
  // All writable state and uploaded backgrounds live outside app.asar.
  process.env.BIBLE_BROADCAST_DATA_DIR = app.getPath('userData');
  process.env.PORT = String(PORT);

  try {
    serverRuntime = require(path.join(__dirname, '..', 'server.js'));
    await serverRuntime.startServer(PORT, '0.0.0.0');
    createDashboardWindow();
  } catch (error) {
    dialog.showErrorBox(
      'MCGI Bible Broadcaster Pro could not start',
      `The local broadcast server could not start on port ${PORT}.\n\n${error.message}\n\nClose another copy of the app or stop the program already using port ${PORT}, then try again.`,
    );
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0 && !shutdownStarted) createDashboardWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', (event) => {
  if (shutdownComplete) return;
  event.preventDefault();
  if (shutdownStarted) return;
  shutdownStarted = true;

  // Tear down module windows first so their WebSocket/SSE connections close.
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.destroy();
  }

  const finish = () => {
    shutdownComplete = true;
    app.quit();
  };
  if (serverRuntime && typeof serverRuntime.stopServer === 'function') {
    serverRuntime.stopServer().then(finish, finish);
  } else {
    finish();
  }
});
