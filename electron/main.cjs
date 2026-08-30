// electron/main.cjs
const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { spawn, execFile } = require('child_process');
const { autoUpdater } = require('electron-updater');

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
            'User-Agent': 'EduTimetable-AutoUpdater/1.0.1'
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
timeout /t 2 /nobreak > nul

:: Chep de toan bo file moi vao thu muc ung dung
robocopy "${sourceDir}" "${appDir}" /E /IS /IT /NP /NJH /NJS > nul
if %ERRORLEVEL% GEQ 8 (
  xcopy "${sourceDir}\\*" "${appDir}" /E /Y /H /R /Q > nul
)

:: Khoi dong lai ung dung phien ban moi
start "" "${appExePath}"

:: Don dep thu muc tam
timeout /t 2 /nobreak > nul
rd /s /q "${tempBase}" > nul 2>&1
exit
`;
      fs.writeFileSync(batPath, batScript, 'utf8');
      pendingUpdateScript = batPath;
    } else if (safeFileName.toLowerCase().endsWith('.exe')) {
      pendingUpdateScript = destPath;
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

ipcMain.handle('restart-app-for-update', () => {
  if (pendingUpdateScript) {
    if (pendingUpdateScript.endsWith('.bat')) {
      spawn('cmd.exe', ['/c', pendingUpdateScript], {
        detached: true,
        stdio: 'ignore'
      }).unref();
    } else if (pendingUpdateScript.endsWith('.exe')) {
      spawn(pendingUpdateScript, [], {
        detached: true,
        stdio: 'ignore'
      }).unref();
    }
    app.isQuitting = true;
    app.quit();
    return;
  }

  try {
    autoUpdater.quitAndInstall(false, true);
  } catch (e) {
    app.relaunch();
    app.quit();
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


