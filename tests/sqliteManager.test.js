import { describe, it, expect } from 'vitest';
import { getSqlEngine, createSchema, saveJsonToDatabase, loadJsonFromDatabase } from '../src/services/sqliteManager.cjs';
import { SAMPLE_SCHOOL_INFO, SAMPLE_CLASSES, SAMPLE_TEACHERS } from '../src/data/sampleData.js';

describe('sqliteManager module', () => {
  it('should initialize SQLite engine and create schema successfully', async () => {
    const SQL = await getSqlEngine();
    expect(SQL).toBeDefined();

    const db = new SQL.Database();
    expect(() => createSchema(db)).not.toThrow();

    // Verify tables exist
    const tablesRes = db.exec("SELECT name FROM sqlite_master WHERE type='table';");
    const tableNames = tablesRes[0].values.map(v => v[0]);
    expect(tableNames).toContain('school_info');
    expect(tableNames).toContain('classes');
    expect(tableNames).toContain('teachers');
    expect(tableNames).toContain('departments');
    expect(tableNames).toContain('timetable_slots');
  });

  it('should save JSON data to SQLite and load it back correctly', async () => {
    const SQL = await getSqlEngine();
    const db = new SQL.Database();
    createSchema(db);

    const testData = {
      schoolInfo: SAMPLE_SCHOOL_INFO,
      classes: SAMPLE_CLASSES.slice(0, 2),
      teachers: SAMPLE_TEACHERS.slice(0, 3),
      departments: [
        { id: 'dept_to_123', name: 'Tổ 1, 2, 3', description: 'Tổ 1 2 3', isOffice: false }
      ],
      timetable: {
        '1A1': {
          2: {
            1: {
              subjectId: 'TOAN',
              teacherId: 'GV01',
              teacherCode: 'MAI.NT',
              isLocked: true,
              note: 'Tiết đầu tuần'
            }
          }
        }
      }
    };

    saveJsonToDatabase(db, testData);

    const loaded = loadJsonFromDatabase(db);
    expect(loaded.schoolInfo.name).toBe(SAMPLE_SCHOOL_INFO.name);
    expect(loaded.classes.length).toBe(2);
    expect(loaded.classes[0].id).toBe(SAMPLE_CLASSES[0].id);
    expect(loaded.teachers.length).toBe(3);
    expect(loaded.timetable['1A1'][2][1].subjectId).toBe('TOAN');
    expect(loaded.timetable['1A1'][2][1].isLocked).toBe(true);
    expect(loaded.timetable['1A1'][2][1].note).toBe('Tiết đầu tuần');
  });

  it('phục hồi tự động khi file database bị lỗi (corrupted) và lưu ghi an toàn', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const { openOrCreateDatabase, saveDatabaseToFile } = await import('../src/services/sqliteManager.cjs');

    const testDbPath = path.resolve('scratch_test_corrupt.db');
    // Ghi một file hỏng giả định
    fs.writeFileSync(testDbPath, Buffer.from('NOT A VALID SQLITE FILE CORRUPTED BY ACCIDENT'));

    try {
      // openOrCreateDatabase phải tự phát hiện và tạo DB mới, không throw crash
      const db = await openOrCreateDatabase(testDbPath);
      expect(db).toBeDefined();

      saveDatabaseToFile(db, testDbPath);
      expect(fs.existsSync(testDbPath)).toBe(true);
    } finally {
      try { fs.unlinkSync(testDbPath); } catch {}
      // Xóa file backup corrupt nếu có
      const files = fs.readdirSync(process.cwd());
      files.forEach(f => {
        if (f.startsWith('scratch_test_corrupt.db.corrupt')) {
          try { fs.unlinkSync(f); } catch {}
        }
      });
    }
  });

  it('nạp và migrate schema an toàn từ file SQLite cũ mà không làm hỏng file', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const { getSqlEngine, saveDatabaseToFile, loadJsonFromDatabase, openOrCreateDatabase } = await import('../src/services/sqliteManager.cjs');

    const SQL = await getSqlEngine();
    // Tạo một CSDL cũ không có bảng departments và không có cột department_id
    const legacyDb = new SQL.Database();
    legacyDb.run("CREATE TABLE school_info (id INTEGER PRIMARY KEY, name TEXT);");
    legacyDb.run("INSERT INTO school_info (id, name) VALUES (1, 'Trường Cũ');");
    legacyDb.run("CREATE TABLE classes (id TEXT PRIMARY KEY, name TEXT, grade INTEGER);");
    legacyDb.run("INSERT INTO classes (id, name, grade) VALUES ('L1A', '1A', 1);");
    legacyDb.run("CREATE TABLE teachers (id TEXT PRIMARY KEY, name TEXT, code TEXT);");
    legacyDb.run("INSERT INTO teachers (id, name, code) VALUES ('T1', 'Cô Lan', 'LAN');");

    const testDbPath = path.resolve('scratch_test_legacy.db');
    saveDatabaseToFile(legacyDb, testDbPath);

    try {
      // Mở lại DB cũ, kiểm tra quá trình migrate schema không gây malformed disk image
      const migratedDb = await openOrCreateDatabase(testDbPath);
      const data = loadJsonFromDatabase(migratedDb);
      expect(data.schoolInfo.name).toBe('Trường Cũ');
      expect(data.classes.length).toBe(1);
      expect(data.teachers.length).toBe(1);

      // Lưu lại sau khi migrate
      saveDatabaseToFile(migratedDb, testDbPath);

      // Kiểm tra tính toàn vẹn của file
      const buf = fs.readFileSync(testDbPath);
      const checkDb = new SQL.Database(new Uint8Array(buf));
      const integrity = checkDb.exec("PRAGMA integrity_check;");
      expect(integrity[0].values[0][0]).toBe('ok');
    } finally {
      try { fs.unlinkSync(testDbPath); } catch {}
    }
  });
});
