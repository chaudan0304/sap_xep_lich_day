// src/services/sqliteManager.cjs
// Động cơ SQLite WebAssembly (sql.js) - Quản lý CSDL cục bộ EduTimetable
// Tách module chuyên biệt: Schema (sqliteSchema), Ghi (sqliteWriter), Đọc (sqliteReader)

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const { createSchema } = require('./sqlite/sqliteSchema.cjs');
const { saveJsonToDatabase } = require('./sqlite/sqliteWriter.cjs');
const { loadJsonFromDatabase } = require('./sqlite/sqliteReader.cjs');

let sqlEngine = null;

/**
 * Khởi tạo hoặc lấy engine sql.js WebAssembly
 */
async function getSqlEngine() {
  if (!sqlEngine) {
    sqlEngine = await initSqlJs();
  }
  return sqlEngine;
}

/**
 * Mở hoặc tạo mới database từ file SQLite trên đĩa
 * @param {string} dbFilePath - Đường dẫn file .db
 * @returns {Promise<Object>} Instance database sql.js
 */
async function openOrCreateDatabase(dbFilePath) {
  const SQL = await getSqlEngine();
  let db;

  if (fs.existsSync(dbFilePath)) {
    try {
      const fileBuffer = fs.readFileSync(dbFilePath);
      const uint8 = new Uint8Array(fileBuffer);
      db = new SQL.Database(uint8);
      createSchema(db);
      return db;
    } catch (err) {
      console.warn(`Lỗi khi mở SQLite database tại ${dbFilePath} (${err.message}). Tạo bản sao lưu và phục hồi database mới.`);
      try {
        const corruptBackup = `${dbFilePath}.corrupt-${Date.now()}`;
        fs.renameSync(dbFilePath, corruptBackup);
      } catch (backupErr) {
        console.warn('Không thể đổi tên file database hỏng:', backupErr);
      }
    }
  }

  db = new SQL.Database();
  createSchema(db);
  return db;
}

/**
 * Lưu dữ liệu SQLite nhị phân ra file trên đĩa (Ghi nguyên tử - Atomic Write an toàn chống hỏng file)
 * @param {Object} db - Instance database sql.js
 * @param {string} dbFilePath - Đường dẫn file .db
 */
function saveDatabaseToFile(db, dbFilePath) {
  const dir = path.dirname(dbFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const binaryArray = db.export();
  const tempPath = `${dbFilePath}.tmp-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  fs.writeFileSync(tempPath, Buffer.from(binaryArray));
  try {
    fs.renameSync(tempPath, dbFilePath);
  } catch {
    fs.copyFileSync(tempPath, dbFilePath);
    try { fs.unlinkSync(tempPath); } catch {}
  }
}

module.exports = {
  getSqlEngine,
  createSchema,
  saveJsonToDatabase,
  loadJsonFromDatabase,
  openOrCreateDatabase,
  saveDatabaseToFile
};
