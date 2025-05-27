const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Disable sandbox for Linux AppImage
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('no-sandbox');
}

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      // Preload script to expose limited APIs to renderer
      preload: path.join(__dirname, 'preload.js'),
                                 // Disable sandbox if needed (already set via commandLine)
                                 sandbox: false,
                                 // Security best practices
                                 contextIsolation: true,
                                 nodeIntegration: false
    }
  });

  // Load the index.html from the dist folder
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  mainWindow.loadFile(indexPath)
  .catch(err => {
    console.error('Failed to load index.html:', err);
  });

  // Open the DevTools in development mode
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  // Handle window close via IPC (if used in renderer)
  ipcMain.on('close-window', () => {
    if (mainWindow) {
      mainWindow.close();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
  createMainWindow();

  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
