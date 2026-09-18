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
    const fileBuffer = fs.readFileSync(dbFilePath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  createSchema(db);
  return db;
}

/**
 * Lưu dữ liệu SQLite nhị phân ra file trên đĩa
 * @param {Object} db - Instance database sql.js
 * @param {string} dbFilePath - Đường dẫn file .db
 */
function saveDatabaseToFile(db, dbFilePath) {
  const dir = path.dirname(dbFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const binaryArray = db.export();
  fs.writeFileSync(dbFilePath, Buffer.from(binaryArray));
}

module.exports = {
  getSqlEngine,
  createSchema,
  saveJsonToDatabase,
  loadJsonFromDatabase,
  openOrCreateDatabase,
  saveDatabaseToFile
};
