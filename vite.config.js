import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import fs from 'fs'
import path from 'path'

import { createRequire } from 'module'
const require = createRequire(import.meta.url)

function getSqliteManager() {
  try {
    delete require.cache[require.resolve('./src/services/sqliteManager.cjs')];
  } catch {}
  return require('./src/services/sqliteManager.cjs');
}

function autoSavePlugin() {
  return {
    name: 'auto-save-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const dbPath = path.resolve(process.cwd(), 'src/data/edutimetable.db');

        // 1. API nạp dữ liệu từ SQLite
        if (req.url === '/api/db/load' && req.method === 'GET') {
          try {
            const { openOrCreateDatabase, saveJsonToDatabase, loadJsonFromDatabase, saveDatabaseToFile } = getSqliteManager();
            const db = await openOrCreateDatabase(dbPath);
            let data = loadJsonFromDatabase(db);

            // Nếu DB mới tinh chưa có trường học, nạp từ sampleData.js
            if (!data.schoolInfo || !data.classes || data.classes.length === 0) {
              try {
                const { getDefaultSampleData } = await import('./src/data/sampleData.js');
                const defaultData = getDefaultSampleData();
                saveJsonToDatabase(db, defaultData);
                saveDatabaseToFile(db, dbPath);
                data = loadJsonFromDatabase(db);
              } catch (seedErr) {
                console.warn('Initial seed to SQLite in Vite middleware notice:', seedErr);
              }
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify(data));
          } catch (err) {
            console.error('Error in /api/db/load:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
          return;
        }

        // 2. API lưu dữ liệu vào SQLite
        if (req.url === '/api/db/save' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              const { openOrCreateDatabase, saveJsonToDatabase, saveDatabaseToFile } = getSqliteManager();
              const payload = JSON.parse(body);
              const db = await openOrCreateDatabase(dbPath);
              saveJsonToDatabase(db, payload);
              saveDatabaseToFile(db, dbPath);

              // Đồng bộ song song ra file json dự phòng
              try {
                fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2), 'utf8');
              } catch (jErr) {
                console.warn('Backup JSON write warning:', jErr);
              }

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, message: 'Saved successfully to SQLite edutimetable.db' }));
            } catch (err) {
              console.error('Error in /api/db/save:', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        // 3. API tải file database SQLite nhị phân (.db)
        if (req.url === '/api/db/download' && req.method === 'GET') {
          try {
            if (fs.existsSync(dbPath)) {
              const fileBuffer = fs.readFileSync(dbPath);
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/x-sqlite3');
              res.setHeader('Content-Disposition', 'attachment; filename="edutimetable.db"');
              res.end(fileBuffer);
            } else {
              res.statusCode = 404;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Database file not found' }));
            }
          } catch (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
          }
          return;
        }

        // 4. API nạp đè file database SQLite nhị phân (.db) từ client
        if (req.url === '/api/db/upload' && req.method === 'POST') {
          const chunks = [];
          req.on('data', chunk => { chunks.push(chunk); });
          req.on('end', async () => {
            try {
              const buffer = Buffer.concat(chunks);
              // Kiểm tra xem buffer có hợp lệ với SQLite không
              const { getSqlEngine, createSchema } = require('./src/services/sqliteManager.cjs');
              const SQL = await getSqlEngine();
              const testDb = new SQL.Database(buffer);
              createSchema(testDb);

              fs.writeFileSync(dbPath, buffer);
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, message: 'Database restored successfully' }));
            } catch (err) {
              console.error('Error in /api/db/upload:', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        // Tương thích ngược: /api/save-data
        if (req.url === '/api/save-data' && req.method === 'POST') {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, message: 'Dữ liệu được quản lý tự động qua SQLite' }));
          return;
        }

        // Tương thích ngược: /api/load-data
        if (req.url === '/api/load-data' && req.method === 'GET') {
          try {
            const { getDefaultSampleData } = await import('./src/data/sampleData.js');
            const data = getDefaultSampleData();
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify(data));
          } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
          return;
        }

        next();
      });
    }
  }
}

export default defineConfig({
  base: './',
  plugins: [react(), autoSavePlugin()],
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('exceljs') || id.includes('xlsx')) {
              return 'vendor-excel';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('canvas-confetti') || id.includes('html-to-image')) {
              return 'vendor-media';
            }
            return 'vendor-libs';
          }
        }
      }
    }
  }
})
