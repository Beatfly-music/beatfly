const { app, BrowserWindow, ipcMain, protocol } = require('electron');
const path = require('path');
const fs = require('fs');

// Disable sandbox for Linux AppImage
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('no-sandbox');
}

// Protocol handler to serve local assets
function registerLocalResourceProtocol() {
  protocol.registerFileProtocol('app', (request, callback) => {
    const url = request.url.substr(6); // Remove 'app://'
    let resourcePath;
    
    // If the path includes '/assets/' we need to handle it differently
    if (url.includes('/assets/')) {
      resourcePath = path.join(app.getAppPath(), 'dist', url);
    } else {
      resourcePath = path.join(app.getAppPath(), 'dist', url);
    }
    
    callback({ path: resourcePath });
  });
}

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1000,
    minHeight: 600,
    frame: false,
    backgroundColor: '#121212',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false // Allows loading local resources
    }
  });
  
  // Set a proper Content Security Policy header
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const csp = "default-src 'self' 'unsafe-inline' app: file: data:; " + 
                "connect-src 'self' https://api.beatfly-music.xyz app:; " +
                "media-src 'self' file: blob: data: app:; " +
                "img-src 'self' file: data: app: https://api.beatfly-music.xyz; " +
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' app:; " +
                "style-src 'self' 'unsafe-inline' app:";
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp]
      }
    });
  });

  // Let's copy default assets to userData directory for persistence
  const userDataDir = app.getPath('userData');
  const assetsDir = path.join(userDataDir, 'assets');
  
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }
  
  // Copy default assets if they don't exist
  const defaultImages = ['default-album-art.png', 'default-cover.png', 'default-profile-pic.png'];
  defaultImages.forEach(image => {
    const destPath = path.join(assetsDir, image);
    if (!fs.existsSync(destPath)) {
      try {
        const srcPath = path.join(app.getAppPath(), 'dist', image);
        if (fs.existsSync(srcPath)) {
          fs.copyFileSync(srcPath, destPath);
        }
      } catch (err) {
        console.error(`Failed to copy default asset ${image}:`, err);
      }
    }
  });

  // Load the correct URL based on the environment
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(app.getAppPath(), 'dist', 'index.html');
    // Custom protocol for loading files
    mainWindow.loadURL(`app://dist/index.html`);
    mainWindow.webContents.openDevTools(); // Open DevTools in production for debugging
  }
  
  // Intercept and fix file not found errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    // Check if it's a file not found error for default assets
    if (errorCode === -6 && validatedURL.includes('default-')) {
      const fileName = path.basename(validatedURL);
      const redirectURL = `app://dist/${fileName}`;
      
      console.log(`Redirecting ${validatedURL} to ${redirectURL}`);
      mainWindow.loadURL(redirectURL);
    }
  });
  
  return mainWindow;
}

app.whenReady().then(() => {
  // Register custom protocol
  registerLocalResourceProtocol();
  
  const mainWindow = createMainWindow();
  
  // IPC handlers for window controls
  ipcMain.on('minimize-window', () => mainWindow.minimize());
  ipcMain.on('maximize-window', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });
  
  ipcMain.on('close-window', () => mainWindow.close());
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});