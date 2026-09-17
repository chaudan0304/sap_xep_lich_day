const { app, BrowserWindow, Menu, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { spawn, execFile } = require('child_process');
const { autoUpdater } = require('electron-updater');
const {
  openOrCreateDatabase,
  saveJsonToDatabase,
  loadJsonFromDatabase,
  saveDatabaseToFile,
  getSqlEngine,
  createSchema
} = require('../src/services/sqliteManager.cjs');

let mainWindow = null;
let pendingUpdateScript = null;
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
// Direct In-App Downloader & Self-Updater Helpers
// -------------------------------------------------------------
function downloadFileWithRedirect(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    const makeRequest = (currentUrl, redirectCount = 0) => {
      if (redirectCount > 8) {
        return reject(new Error('Quá nhiều chuyển hướng khi tải file cập nhật.'));
      }
      try {
        const parsedUrl = new URL(currentUrl);
        const client = parsedUrl.protocol === 'http:' ? http : https;
        const options = {
          headers: {
            'User-Agent': 'EduTimetable-AutoUpdater/1.0.4'
          }
        };

        const req = client.get(currentUrl, options, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const nextUrl = new URL(res.headers.location, currentUrl).toString();
            return makeRequest(nextUrl, redirectCount + 1);
          }

          if (res.statusCode !== 200) {
            return reject(new Error(`Máy chủ báo mã lỗi HTTP ${res.statusCode}`));
          }

          const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
          let downloadedBytes = 0;
          const tmpFile = destPath + '.tmp';
          const fileStream = fs.createWriteStream(tmpFile);

          res.on('data', (chunk) => {
            downloadedBytes += chunk.length;
            if (totalBytes > 0 && onProgress) {
              const percent = Math.min(100, Math.round((downloadedBytes / totalBytes) * 100));
              onProgress({ percent, transferred: downloadedBytes, total: totalBytes });
            }
          });

          res.pipe(fileStream);

          fileStream.on('finish', () => {
            fileStream.close(() => {
              try {
                if (fs.existsSync(destPath)) {
                  fs.unlinkSync(destPath);
                }
                fs.renameSync(tmpFile, destPath);
                resolve(destPath);
              } catch (err) {
                reject(err);
              }
            });
          });

          fileStream.on('error', (err) => {
            try { if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile); } catch (e) {}
            reject(err);
          });
        });

        req.on('error', (err) => {
          reject(err);
        });
      } catch (err) {
        reject(err);
      }
    };

    makeRequest(url);
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

// IPC Handler cho phép Renderer kích hoạt tải cập nhật trực tiếp ngay trong app
ipcMain.handle('start-in-app-update', async (event, { downloadUrl, fileName }) => {
  try {
    if (!downloadUrl) throw new Error('Không tìm thấy đường dẫn tải file cập nhật.');

    const tempBase = path.join(app.getPath('temp'), 'edutimetable_update');
    if (!fs.existsSync(tempBase)) {
      fs.mkdirSync(tempBase, { recursive: true });
    }

    const safeFileName = fileName || 'EduTimetable_Update.zip';
    const destPath = path.join(tempBase, safeFileName);

    // Bắt đầu tải file với báo tiến độ %
    await downloadFileWithRedirect(downloadUrl, destPath, (progress) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('download-progress', progress);
      }
    });

    // Nếu là file ZIP, giải nén và tạo script tự động thay thế file khi khởi động lại
    if (safeFileName.toLowerCase().endsWith('.zip')) {
      const extractDir = path.join(tempBase, 'unpacked');
      if (fs.existsSync(extractDir)) {
        fs.rmSync(extractDir, { recursive: true, force: true });
      }
      fs.mkdirSync(extractDir, { recursive: true });

      // Sử dụng tar.exe tích hợp sẵn trên Windows để giải nén cực nhanh
      await new Promise((resolve, reject) => {
        execFile('tar.exe', ['-xf', destPath, '-C', extractDir], (err) => {
          if (err) return reject(new Error('Lỗi giải nén bản cập nhật: ' + err.message));
          resolve();
        });
      });

      // Xác định thư mục chứa dữ liệu giải nén (xem có thư mục con bên trong không)
      let sourceDir = extractDir;
      const subEntries = fs.readdirSync(extractDir);
      if (subEntries.length === 1 && fs.statSync(path.join(extractDir, subEntries[0])).isDirectory()) {
        sourceDir = path.join(extractDir, subEntries[0]);
      }

      const appExePath = process.execPath;
      const appDir = path.dirname(appExePath);

      // Tạo file script batch apply_update.bat
      const batPath = path.join(tempBase, 'apply_update.bat');
      const batScript = `@echo off
chcp 65001 > nul
title Cap Nhat EduTimetable
echo ========================================================
echo   DANG HOAN TAT CAP NHAT PHAN MEM EDUTIMETABLE TIEU HOC
echo   Vui long cho trong giay lat...
echo ========================================================

:: Đảm bảo giải phóng hoàn toàn tiến trình cũ
taskkill /F /IM "EduTimetable_TieuHoc.exe" /T > nul 2>&1
taskkill /F /IM "EduTimetable Tiểu Học.exe" /T > nul 2>&1
taskkill /F /IM "electron.exe" /T > nul 2>&1
timeout /t 2 /nobreak > nul

:: Chép đè toàn bộ file mới vào thư mục ứng dụng (thử lại tối đa 3 lần, mỗi lần cách 1 giây)
robocopy "${sourceDir}" "${appDir}" /E /IS /IT /NP /NJH /NJS /R:3 /W:1 > nul
if %ERRORLEVEL% GEQ 8 (
  xcopy "${sourceDir}\\*" "${appDir}" /E /Y /H /R /Q > nul
)

:: Khởi động lại ứng dụng phiên bản mới
start "" "${appExePath}"
exit
`;
      fs.writeFileSync(batPath, batScript, 'utf8');
      pendingUpdateScript = batPath;
    } else if (safeFileName.toLowerCase().endsWith('.exe')) {
      const appExePath = process.execPath;
      const batPath = path.join(tempBase, 'apply_update.bat');
      const batScript = `@echo off
chcp 65001 > nul
title Cap Nhat Tu Dong EduTimetable Tieu Hoc
echo ========================================================
echo   DANG TU DONG CAP NHAT EDUTIMETABLE TIEU HOC (CHAY NGAM)
echo   Vui long cho trong giay lat...
echo ========================================================

:: Đảm bảo giải phóng hoàn toàn tiến trình cũ
taskkill /F /IM "EduTimetable_TieuHoc.exe" /T > nul 2>&1
taskkill /F /IM "EduTimetable Tiểu Học.exe" /T > nul 2>&1
taskkill /F /IM "electron.exe" /T > nul 2>&1
timeout /t 2 /nobreak > nul

:: Chạy trình cài đặt ở chế độ im lặng /S (không hiển thị cửa sổ Setup, tự động ghi đè file mới)
start /wait "" "${destPath}" /S

timeout /t 2 /nobreak > nul

:: Tự động khởi động lại ứng dụng phiên bản mới ngay lập tức
if exist "${appExePath}" (
  start "" "${appExePath}"
) else if exist "%PROGRAMFILES%\\EduTimetable Tiểu Học\\EduTimetable_TieuHoc.exe" (
  start "" "%PROGRAMFILES%\\EduTimetable Tiểu Học\\EduTimetable_TieuHoc.exe"
) else if exist "%PROGRAMFILES(X86)%\\EduTimetable Tiểu Học\\EduTimetable_TieuHoc.exe" (
  start "" "%PROGRAMFILES(X86)%\\EduTimetable Tiểu Học\\EduTimetable_TieuHoc.exe"
)
exit
`;
      fs.writeFileSync(batPath, batScript, 'utf8');
      pendingUpdateScript = batPath;
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-downloaded', { ready: true });
    }

    return { success: true };
  } catch (error) {
    console.error('Lỗi in-app update:', error);
    return { success: false, error: error.message };
  }
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

ipcMain.handle('restart-app-for-update', async () => {
  try {
    if (pendingUpdateScript) {
      const child = spawn('cmd.exe', ['/c', pendingUpdateScript], {
        detached: true,
        stdio: 'ignore'
      });
      child.on('error', (err) => {
        console.error('Lỗi khi chạy script cập nhật .bat:', err);
      });
      child.unref();
      
      app.isQuitting = true;
      app.quit();
      return { success: true };
    }

    try {
      autoUpdater.quitAndInstall(false, true);
    } catch (e) {
      app.relaunch();
      app.quit();
    }
    return { success: true };
  } catch (globalErr) {
    console.error('Lỗi trong restart-app-for-update:', globalErr);
    app.relaunch();
    app.quit();
    return { success: false, error: globalErr.message };
  }
});

// IPC Handler cho phép Renderer kích hoạt in ấn bản Desktop an toàn, giữ nguyên màu nền
ipcMain.handle('print-window', async (event, options = {}) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win || win.isDestroyed()) {
    return { success: false, error: 'Không tìm thấy cửa sổ ứng dụng để in.' };
  }

  return new Promise((resolve) => {
    win.webContents.print(
      {
        silent: false,
        printBackground: true,
        ...options
      },
      (success, errorType) => {
        if (!success && errorType !== 'cancelled') {
          console.warn('Electron print notice:', errorType);
        }
        resolve({ success, errorType });
      }
    );
  });
});

// -------------------------------------------------------------
// IPC Handlers cho Quản Lý Cơ Sở Dữ Liệu SQLite Cục Bộ (.db)
// -------------------------------------------------------------
function getDbPath() {
  if (isDev) {
    return path.resolve(__dirname, '../src/data/edutimetable.db');
  }
  return path.join(app.getPath('userData'), 'edutimetable.db');
}

ipcMain.handle('db-load', async () => {
  try {
    const dbPath = getDbPath();
    const db = await openOrCreateDatabase(dbPath);
    let data = loadJsonFromDatabase(db);

    // Nếu CSDL mới tinh chưa có dữ liệu trường học, tự động di chuyển từ savedData.json mặc định
    if (!data.schoolInfo || !data.classes || data.classes.length === 0) {
      const defaultJsonPath = path.resolve(__dirname, '../src/data/savedData.json');
      if (fs.existsSync(defaultJsonPath)) {
        try {
          const rawJson = fs.readFileSync(defaultJsonPath, 'utf8');
          const parsedJson = JSON.parse(rawJson);
          saveJsonToDatabase(db, parsedJson);
          saveDatabaseToFile(db, dbPath);
          data = loadJsonFromDatabase(db);
        } catch (mErr) {
          console.warn('Initial migration to SQLite in Electron notice:', mErr);
        }
      }
    }
    return { success: true, data };
  } catch (err) {
    console.error('db-load error:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('db-save', async (event, payload) => {
  try {
    const dbPath = getDbPath();
    const db = await openOrCreateDatabase(dbPath);
    saveJsonToDatabase(db, payload);
    saveDatabaseToFile(db, dbPath);
    return { success: true };
  } catch (err) {
    console.error('db-save error:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('db-export-file', async () => {
  try {
    const dbPath = getDbPath();
    if (!fs.existsSync(dbPath)) {
      return { success: false, error: 'Chưa có tập tin cơ sở dữ liệu SQLite để xuất.' };
    }
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Lưu bản sao Cơ sở dữ liệu SQLite (.db)',
      defaultPath: `edutimetable_${new Date().toISOString().slice(0, 10)}.db`,
      filters: [{ name: 'SQLite Database', extensions: ['db', 'sqlite'] }]
    });

    if (result.canceled || !result.filePath) {
      return { success: false, canceled: true };
    }

    fs.copyFileSync(dbPath, result.filePath);
    return { success: true, filePath: result.filePath };
  } catch (err) {
    console.error('db-export-file error:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('db-import-file', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Chọn tập tin Cơ sở dữ liệu SQLite (.db)',
      properties: ['openFile'],
      filters: [{ name: 'SQLite Database', extensions: ['db', 'sqlite', '*'] }]
    });

    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return { success: false, canceled: true };
    }

    const selectedPath = result.filePaths[0];
    const buffer = fs.readFileSync(selectedPath);

    // Kiểm tra tính hợp lệ của file SQLite
    const SQL = await getSqlEngine();
    const testDb = new SQL.Database(buffer);
    createSchema(testDb);
    const data = loadJsonFromDatabase(testDb);

    const dbPath = getDbPath();
    fs.writeFileSync(dbPath, buffer);
    return { success: true, data };
  } catch (err) {
    console.error('db-import-file error:', err);
    return { success: false, error: err.message };
  }
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


