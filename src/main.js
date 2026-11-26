const { app, BrowserWindow, dialog, ipcMain, session } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const SOUND_EXTENSIONS = new Set(['.wav', '.mp3', '.ogg', '.m4a', '.aac', '.flac', '.webm']);
const MAX_SOUND_SIZE = 30 * 1024 * 1024;
const SOUND_ID_PATTERN = /^[0-9a-f-]{36}$/i;

function getSoundDirectory() {
  return path.join(app.getPath('userData'), 'soundboard');
}

async function listSounds() {
  const directory = getSoundDirectory();
  await fs.mkdir(directory, { recursive: true });
  const files = await fs.readdir(directory);

  return files
    .filter(file => SOUND_EXTENSIONS.has(path.extname(file).toLowerCase()))
    .map(file => {
      const separator = file.indexOf('__');
      if (separator < 0 || !SOUND_ID_PATTERN.test(file.slice(0, separator))) return null;
      return { id: file.slice(0, separator), name: file.slice(separator + 2) };
    })
    .filter(Boolean);
}

ipcMain.handle('soundboard:list', listSounds);

ipcMain.handle('soundboard:add', async event => {
  const window = BrowserWindow.fromWebContents(event.sender);
  const selection = await dialog.showOpenDialog(window, {
    title: 'Добавить звуки в саундпад',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Аудиофайлы', extensions: [...SOUND_EXTENSIONS].map(extension => extension.slice(1)) }]
  });

  if (selection.canceled) return null;

  const directory = getSoundDirectory();
  await fs.mkdir(directory, { recursive: true });

  const selectedFiles = [];
  for (const sourcePath of selection.filePaths) {
    const extension = path.extname(sourcePath).toLowerCase();
    if (!SOUND_EXTENSIONS.has(extension)) {
      throw new Error(`Формат ${extension || 'без расширения'} не поддерживается.`);
    }

    const stats = await fs.stat(sourcePath);
    if (stats.size > MAX_SOUND_SIZE) {
      throw new Error(`Файл "${path.basename(sourcePath)}" больше лимита 30 МБ.`);
    }

    const originalName = path.basename(sourcePath).slice(0, -path.extname(sourcePath).length);
    const safeName = originalName.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 100);
    selectedFiles.push({ sourcePath, safeName, extension });
  }

  for (const file of selectedFiles) {
    await fs.copyFile(file.sourcePath, path.join(directory, `${randomUUID()}__${file.safeName}${file.extension}`));
  }

  return listSounds();
});

ipcMain.handle('soundboard:read', async (_event, id) => {
  if (typeof id !== 'string' || !SOUND_ID_PATTERN.test(id)) {
    throw new Error('Некорректный идентификатор аудиофайла.');
  }

  const directory = getSoundDirectory();
  const files = await fs.readdir(directory);
  const file = files.find(name => name.startsWith(`${id}__`) && SOUND_EXTENSIONS.has(path.extname(name).toLowerCase()));
  if (!file) throw new Error('Аудиофайл не найден.');

  return (await fs.readFile(path.join(directory, file))).toString('base64');
});

ipcMain.handle('soundboard:remove', async (_event, id) => {
  if (typeof id !== 'string' || !SOUND_ID_PATTERN.test(id)) {
    throw new Error('Некорректный идентификатор аудиофайла.');
  }

  const directory = getSoundDirectory();
  const files = await fs.readdir(directory);
  const file = files.find(name => name.startsWith(`${id}__`) && SOUND_EXTENSIONS.has(path.extname(name).toLowerCase()));
  if (!file) throw new Error('Аудиофайл не найден.');

  await fs.unlink(path.join(directory, file));
  return listSounds();
});

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
