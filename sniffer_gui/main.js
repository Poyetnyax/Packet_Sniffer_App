const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execPromise = promisify(exec);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });

  mainWindow.loadFile('index.html');
  
  // Open DevTools for debugging
  mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Handle interface detection
ipcMain.handle('get-network-interfaces', async () => {
  try {
    // Try networksetup first
    const { stdout } = await execPromise('networksetup -listallhardwareports');
    const interfaces = stdout.split('\n')
      .filter(line => line.includes('Device: '))
      .map(line => line.replace('Device: ', '').trim())
      .filter(iface => iface && iface !== 'lo0');

    if (interfaces.length > 0) {
      return interfaces;
    }

    // Fallback to ifconfig
    const { stdout: ifconfigOutput } = await execPromise('ifconfig');
    const ifconfigInterfaces = ifconfigOutput.split('\n')
      .filter(line => line.match(/^[a-z0-9]+:/))
      .map(line => line.split(':')[0])
      .filter(iface => iface && iface !== 'lo0');

    if (ifconfigInterfaces.length > 0) {
      return ifconfigInterfaces;
    }

    // Final fallback
    return ['en0', 'en1', 'en2', 'en3'];
  } catch (error) {
    console.error('Error getting interfaces:', error);
    return ['en0', 'en1', 'en2', 'en3'];
  }
});

// Handle save dialog
ipcMain.handle('show-save-dialog', async (event, options) => {
  try {
    const { filePath } = await dialog.showSaveDialog(options);
    return filePath;
  } catch (error) {
    console.error('Save dialog error:', error);
    throw error;
  }
});