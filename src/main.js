const { app, BrowserWindow, session, systemPreferences } = require('electron');
const path = require('node:path');

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 620,
    minWidth: 820,
    minHeight: 560,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0b0b0b',
      symbolColor: '#bdbdbd',
      height: 44
    },
    backgroundColor: '#0b0b0b',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === 'media');
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
