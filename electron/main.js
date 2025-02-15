const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')

function createWindow() {
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
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false // Ensure this is what you intend; it disables some security features.
    }
  })

  // Update CSP to allow loading local file: resources
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' file: http://localhost:5000; media-src 'self' file: blob: http://localhost:5000"
        ]
      }
    })
  })

  // Determine the correct path to load based on environment
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000')
    mainWindow.webContents.openDevTools()
  } else {
    // Use process.resourcesPath for production builds.
    // Check that 'dist/index.html' actually exists in this folder.
    const indexPath = path.join(process.resourcesPath, 'dist', 'index.html')
    console.log('Loading index file from:', indexPath)
    mainWindow.loadFile(indexPath)
  }

  return mainWindow
}

app.whenReady().then(() => {
  const mainWindow = createWindow()

  // IPC handlers for window controls
  ipcMain.on('minimize-window', () => mainWindow.minimize())
  ipcMain.on('maximize-window', () => {
    if (mainWindow.isMaximized()) mainWindow.unmaximize()
    else mainWindow.maximize()
  })
  ipcMain.on('close-window', () => mainWindow.close())
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
