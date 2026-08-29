// electron/main.cjs
const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

let mainWindow = null;
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Cấu hình Tự động Tải Ngầm
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: 'EduTimetable - Hệ Thống Xếp Thời Khóa Biểu Tiểu Học Chuẩn BGD&ĐT',
    backgroundColor: '#0f172a',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  // Tùy biến thanh menu (ẩn menu mặc định cho giao diện phẳng, hiện đại)
  Menu.setApplicationMenu(null);

  // Mở các liên kết ngoài bằng trình duyệt mặc định của hệ thống
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// -------------------------------------------------------------
// Auto Updater Event Listeners & IPC Handlers
// -------------------------------------------------------------
autoUpdater.on('update-available', (info) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-available', info);
  }
});

autoUpdater.on('download-progress', (progressObj) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('download-progress', progressObj);
  }
});

autoUpdater.on('update-downloaded', (info) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-downloaded', info);
  }
});

autoUpdater.on('error', (err) => {
  console.warn('AutoUpdater warning:', err?.message || err);
});

// IPC Handler cho phép Renderer gọi kiểm tra và khởi động lại
ipcMain.handle('check-for-updates', async () => {
  if (isDev) return { isDev: true, message: 'Running in development mode' };
  try {
    return await autoUpdater.checkForUpdates();
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('restart-app-for-update', () => {
  autoUpdater.quitAndInstall(false, true);
});

app.whenReady().then(() => {
  createWindow();

  // Tự động kiểm tra cập nhật sau 3 giây khi mở ứng dụng
  if (!isDev) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch((err) => {
        console.warn('Initial update check error:', err?.message);
      });
    }, 3000);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

