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
});
