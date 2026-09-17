// src/services/sqliteManager.cjs
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

let sqlEngine = null;

async function getSqlEngine() {
  if (!sqlEngine) {
    sqlEngine = await initSqlJs();
  }
  return sqlEngine;
}

/**
 * Khởi tạo Schema đầy đủ cho cơ sở dữ liệu EduTimetable
 * Bảo toàn 100% các trường: code, shortName, vị trí, nhiệm vụ, định mức, phòng học, khóa tiết
 */
function createSchema(db) {
  db.run(`
    -- 1. Bảng thông tin trường học
    CREATE TABLE IF NOT EXISTS school_info (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT NOT NULL,
      district TEXT,
      school_year TEXT,
      principal TEXT,
      scheduler TEXT,
      address TEXT,
      lunch_break TEXT,
      updated_at TEXT,
      extra_data TEXT
    );

    -- 2. Bảng cấu hình khung giờ tiết học
    CREATE TABLE IF NOT EXISTS periods (
      period_number INTEGER PRIMARY KEY,
      name TEXT,
      session TEXT NOT NULL,
      time TEXT NOT NULL,
      session_label TEXT,
      is_active INTEGER DEFAULT 1,
      extra_data TEXT
    );

    -- 3. Bảng danh mục môn học
    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      raw_id TEXT,
      name TEXT NOT NULL,
      short_name TEXT,
      category TEXT,
      color TEXT,
      bg TEXT,
      border TEXT,
      text_color TEXT,
      icon TEXT,
      default_room TEXT,
      description TEXT,
      extra_data TEXT
    );

    -- 4. Bảng metadata định mức khối
    CREATE TABLE IF NOT EXISTS grade_metadata (
      grade INTEGER PRIMARY KEY,
      grade_name TEXT,
      target_weekly_periods INTEGER DEFAULT 32,
      extra_data TEXT
    );

    -- Bảng định mức môn học theo khối
    CREATE TABLE IF NOT EXISTS grade_quotas (
      grade INTEGER NOT NULL,
      subject_id TEXT NOT NULL,
      weekly_periods INTEGER NOT NULL,
      max_morning INTEGER DEFAULT 0,
      max_afternoon INTEGER DEFAULT 0,
      allow_double INTEGER DEFAULT 0,
      room_type TEXT,
      extra_data TEXT,
      PRIMARY KEY (grade, subject_id)
    );

    -- 5. Bảng danh sách lớp học
    CREATE TABLE IF NOT EXISTS classes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      grade INTEGER NOT NULL,
      student_count INTEGER DEFAULT 35,
      main_room TEXT,
      extra_data TEXT
    );

    -- 6. Bảng danh sách giáo viên (đầy đủ code / short_name / nhiệm vụ / định mức)
    CREATE TABLE IF NOT EXISTS teachers (
      id TEXT PRIMARY KEY,
      tt INTEGER,
      name TEXT NOT NULL,
      code TEXT,
      short_name TEXT,
      department TEXT,
      position TEXT,
      task TEXT,
      assigned_periods INTEGER DEFAULT 0,
      dinh_muc INTEGER DEFAULT 23,
      max_periods_per_day INTEGER DEFAULT 7,
      max_periods_per_week INTEGER DEFAULT 23,
      off_sessions TEXT,
      fixed_days_off TEXT,
      phone TEXT,
      email TEXT,
      is_homeroom INTEGER DEFAULT 0,
      homeroom_class_id TEXT,
      color TEXT,
      extra_data TEXT
    );

    -- 7. Bảng phòng học chức năng (đầy đủ code, isSpecialized, allowMultiple)
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT,
      type TEXT,
      capacity INTEGER DEFAULT 40,
      is_specialized INTEGER DEFAULT 0,
      allow_multiple INTEGER DEFAULT 0,
      extra_data TEXT
    );

    -- 8. Bảng phân công chuyên môn
    CREATE TABLE IF NOT EXISTS assignments (
      id TEXT PRIMARY KEY,
      class_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      teacher_id TEXT,
      weekly_periods INTEGER NOT NULL,
      room_type TEXT,
      allow_double INTEGER DEFAULT 0,
      extra_data TEXT
    );

    -- 9. Bảng ma trận thời khóa biểu (bảo toàn teacherCode, teacherName, teacherRaw, isLocked, note)
    CREATE TABLE IF NOT EXISTS timetable_slots (
      id TEXT PRIMARY KEY,
      class_id TEXT NOT NULL,
      day_of_week INTEGER NOT NULL,
      period INTEGER NOT NULL,
      subject_id TEXT,
      teacher_id TEXT,
      teacher_code TEXT,
      teacher_name TEXT,
      teacher_raw TEXT,
      subject_raw TEXT,
      room_id TEXT,
      is_locked INTEGER DEFAULT 0,
      note TEXT,
      extra_data TEXT
    );

    -- Bảng metadata ứng dụng
    CREATE TABLE IF NOT EXISTS app_metadata (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
}

/**
 * Lưu toàn bộ cấu trúc dữ liệu JSON vào các bảng SQLite trong một Transaction duy nhất
 */
function saveJsonToDatabase(db, data) {
  if (!data) return;

  db.run("BEGIN TRANSACTION;");
  try {
    // 1. Lưu thông tin trường học
    if (data.schoolInfo) {
      const s = data.schoolInfo;
      const extra = {};
      Object.keys(s).forEach(k => {
        if (!['name', 'district', 'year', 'schoolYear', 'principal', 'scheduler', 'address', 'lunchBreak'].includes(k)) {
          extra[k] = s[k];
        }
      });

      db.run(
        `INSERT OR REPLACE INTO school_info (id, name, district, school_year, principal, scheduler, address, lunch_break, updated_at, extra_data)
         VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          s.name || 'Trường Tiểu học',
          s.district || '',
          s.year || s.schoolYear || 'Năm học 2026 - 2027',
          s.principal || '',
          s.scheduler || '',
          s.address || '',
          s.lunchBreak || '10:30 - 14:00',
          new Date().toISOString(),
          JSON.stringify(extra)
        ]
      );
    }

    // 2. Lưu khung giờ tiết học
    if (Array.isArray(data.periods) && data.periods.length > 0) {
      db.run("DELETE FROM periods;");
      const stmt = db.prepare(
        `INSERT OR REPLACE INTO periods (period_number, name, session, time, session_label, is_active, extra_data)
         VALUES (?, ?, ?, ?, ?, ?, ?);`
      );
      data.periods.forEach(p => {
        const pNum = p.id || p.period;
        const extra = {};
        Object.keys(p).forEach(k => {
          if (!['id', 'period', 'name', 'session', 'time', 'sessionLabel', 'isActive'].includes(k)) {
            extra[k] = p[k];
          }
        });

        stmt.run([
          pNum,
          p.name || `Tiết ${pNum}`,
          p.session || 'morning',
          p.time || '',
          p.sessionLabel || '',
          p.isActive !== false ? 1 : 0,
          JSON.stringify(extra)
        ]);
      });
      stmt.free();
    }

    // 3. Lưu môn học
    if (data.subjects) {
      db.run("DELETE FROM subjects;");
      const stmt = db.prepare(
        `INSERT OR REPLACE INTO subjects (id, raw_id, name, short_name, category, color, bg, border, text_color, icon, default_room, description, extra_data)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`
      );
      const entries = Array.isArray(data.subjects)
        ? data.subjects.map(s => [s.id, s])
        : Object.entries(data.subjects);

      entries.forEach(([key, sub]) => {
        if (!sub) return;
        const subId = key || sub.id;
        if (!subId) return;

        const extra = {};
        Object.keys(sub).forEach(k => {
          if (!['id', 'name', 'shortName', 'short_name', 'category', 'color', 'bg', 'border', 'text', 'text_color', 'icon', 'defaultRoom', 'default_room', 'description'].includes(k)) {
            extra[k] = sub[k];
          }
        });

        stmt.run([
          subId,
          sub.id || subId,
          sub.name || '',
          sub.shortName || sub.short_name || sub.name || '',
          sub.category || '',
          sub.color || '#2563eb',
          sub.bg || '#eff6ff',
          sub.border || '#93c5fd',
          sub.text || sub.text_color || '#1e40af',
          sub.icon || 'BookOpen',
          sub.defaultRoom || sub.default_room || 'LOP_HOC',
          sub.description || '',
          JSON.stringify(extra)
        ]);
      });
      stmt.free();
    }

    // 4. Lưu định mức khối
    if (data.gradeQuotas) {
      db.run("DELETE FROM grade_metadata;");
      db.run("DELETE FROM grade_quotas;");

      const metaStmt = db.prepare(
        `INSERT OR REPLACE INTO grade_metadata (grade, grade_name, target_weekly_periods, extra_data) VALUES (?, ?, ?, ?);`
      );
      const quotaStmt = db.prepare(
        `INSERT OR REPLACE INTO grade_quotas (grade, subject_id, weekly_periods, max_morning, max_afternoon, allow_double, room_type, extra_data)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?);`
      );

      Object.entries(data.gradeQuotas).forEach(([gradeKey, gData]) => {
        const gradeNum = parseInt(gradeKey, 10);
        if (isNaN(gradeNum)) return;

        metaStmt.run([
          gradeNum,
          gData.gradeName || `Khối ${gradeNum}`,
          gData.targetWeeklyPeriods || 32,
          JSON.stringify({ grade: gData.grade })
        ]);

        if (Array.isArray(gData.subjects)) {
          gData.subjects.forEach(s => {
            if (!s.subjectId) return;
            const extra = {};
            Object.keys(s).forEach(k => {
              if (!['subjectId', 'weeklyPeriods', 'maxMorning', 'maxAfternoon', 'allowDouble', 'roomType'].includes(k)) {
                extra[k] = s[k];
              }
            });

            quotaStmt.run([
              gradeNum,
              s.subjectId,
              s.weeklyPeriods || 0,
              s.maxMorning || 0,
              s.maxAfternoon || 0,
              s.allowDouble ? 1 : 0,
              s.roomType || 'LOP_HOC',
              JSON.stringify(extra)
            ]);
          });
        }
      });
      metaStmt.free();
      quotaStmt.free();
    }

    // 5. Lưu danh sách lớp học
    if (Array.isArray(data.classes)) {
      db.run("DELETE FROM classes;");
      const stmt = db.prepare(
        `INSERT OR REPLACE INTO classes (id, name, grade, student_count, main_room, extra_data)
         VALUES (?, ?, ?, ?, ?, ?);`
      );
      data.classes.forEach(c => {
        if (!c.id) return;
        const extra = {};
        Object.keys(c).forEach(k => {
          if (!['id', 'name', 'grade', 'studentCount', 'mainRoom'].includes(k)) {
            extra[k] = c[k];
          }
        });

        stmt.run([
          c.id,
          c.name || c.id,
          c.grade || parseInt(c.id.match(/\d/)?.[0] || '1', 10),
          c.studentCount || 35,
          c.mainRoom || '',
          JSON.stringify(extra)
        ]);
      });
      stmt.free();
    }

    // 6. Lưu danh sách giáo viên (bảo toàn code, short_name, position, task, dinhMuc, v.v.)
    if (Array.isArray(data.teachers)) {
      db.run("DELETE FROM teachers;");
      const stmt = db.prepare(
        `INSERT OR REPLACE INTO teachers (
          id, tt, name, code, short_name, department, position, task, 
          assigned_periods, dinh_muc, max_periods_per_day, max_periods_per_week, 
          off_sessions, fixed_days_off, phone, email, is_homeroom, homeroom_class_id, color, extra_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`
      );
      data.teachers.forEach(t => {
        if (!t.id) return;
        const teacherCode = t.code || t.shortName || t.short_name || '';
        const extra = {};
        Object.keys(t).forEach(k => {
          if (![
            'id', 'tt', 'name', 'code', 'shortName', 'short_name', 'department',
            'position', 'task', 'assignedPeriods', 'dinhMuc', 'maxPeriodsPerDay',
            'maxPeriodsPerWeek', 'offSessions', 'fixedDaysOff', 'phone', 'email',
            'isHomeroom', 'homeroomClassId', 'color'
          ].includes(k)) {
            extra[k] = t[k];
          }
        });

        stmt.run([
          t.id,
          t.tt || null,
          t.name || '',
          teacherCode,
          teacherCode,
          t.department || 'Giáo viên bộ môn',
          t.position || '',
          t.task || '',
          t.assignedPeriods || 0,
          t.dinhMuc !== undefined ? t.dinhMuc : 23,
          t.maxPeriodsPerDay || 7,
          t.maxPeriodsPerWeek || 23,
          JSON.stringify(t.offSessions || []),
          JSON.stringify(t.fixedDaysOff || []),
          t.phone || '',
          t.email || '',
          t.isHomeroom ? 1 : 0,
          t.homeroomClassId || '',
          t.color || '#3b82f6',
          JSON.stringify(extra)
        ]);
      });
      stmt.free();
    }

    // 7. Lưu phòng học chức năng (bảo toàn code, isSpecialized, allowMultiple)
    if (Array.isArray(data.rooms)) {
      db.run("DELETE FROM rooms;");
      const stmt = db.prepare(
        `INSERT OR REPLACE INTO rooms (id, name, code, type, capacity, is_specialized, allow_multiple, extra_data)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?);`
      );
      data.rooms.forEach(r => {
        if (!r.id) return;
        const extra = {};
        Object.keys(r).forEach(k => {
          if (!['id', 'name', 'code', 'type', 'capacity', 'isSpecialized', 'allowMultiple'].includes(k)) {
            extra[k] = r[k];
          }
        });

        stmt.run([
          r.id,
          r.name || r.id,
          r.code || '',
          r.type || r.id,
          r.capacity || 40,
          r.isSpecialized ? 1 : 0,
          r.allowMultiple ? 1 : 0,
          JSON.stringify(extra)
        ]);
      });
      stmt.free();
    }

    // 8. Lưu phân công chuyên môn
    if (Array.isArray(data.assignments)) {
      db.run("DELETE FROM assignments;");
      const stmt = db.prepare(
        `INSERT OR REPLACE INTO assignments (id, class_id, subject_id, teacher_id, weekly_periods, room_type, allow_double, extra_data)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?);`
      );
      data.assignments.forEach(a => {
        if (!a.id && (!a.classId || !a.subjectId)) return;
        const id = a.id || `ASG_${a.classId}_${a.subjectId}`;
        const extra = {};
        Object.keys(a).forEach(k => {
          if (!['id', 'classId', 'subjectId', 'teacherId', 'weeklyPeriods', 'roomType', 'allowDouble'].includes(k)) {
            extra[k] = a[k];
          }
        });

        stmt.run([
          id,
          a.classId,
          a.subjectId,
          a.teacherId || '',
          a.weeklyPeriods || 0,
          a.roomType || 'LOP_HOC',
          a.allowDouble ? 1 : 0,
          JSON.stringify(extra)
        ]);
      });
      stmt.free();
    }

    // 9. Lưu ma trận thời khóa biểu (bảo toàn teacherCode, teacherName, teacherRaw, isLocked, note)
    if (data.timetable && typeof data.timetable === 'object') {
      db.run("DELETE FROM timetable_slots;");
      const stmt = db.prepare(
        `INSERT OR REPLACE INTO timetable_slots (
          id, class_id, day_of_week, period, subject_id, teacher_id, 
          teacher_code, teacher_name, teacher_raw, subject_raw, room_id, is_locked, note, extra_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`
      );

      Object.entries(data.timetable).forEach(([classId, daysMap]) => {
        if (!daysMap || typeof daysMap !== 'object') return;
        Object.entries(daysMap).forEach(([dayKey, periodsMap]) => {
          const day = parseInt(dayKey, 10);
          if (isNaN(day) || !periodsMap || typeof periodsMap !== 'object') return;

          Object.entries(periodsMap).forEach(([periodKey, slot]) => {
            const period = parseInt(periodKey, 10);
            if (isNaN(period) || !slot) return;

            const slotId = `${classId}_T${day}_P${period}`;
            const extra = {};
            Object.keys(slot).forEach(k => {
              if (![
                'subjectId', 'teacherId', 'teacherCode', 'teacherName', 'teacherRaw',
                'subjectRaw', 'roomId', 'isLocked', 'note'
              ].includes(k)) {
                extra[k] = slot[k];
              }
            });

            stmt.run([
              slotId,
              classId,
              day,
              period,
              slot.subjectId || '',
              slot.teacherId || '',
              slot.teacherCode || '',
              slot.teacherName || '',
              slot.teacherRaw || '',
              slot.subjectRaw || '',
              slot.roomId || 'LOP_HOC',
              slot.isLocked ? 1 : 0,
              slot.note || '',
              JSON.stringify(extra)
            ]);
          });
        });
      });
      stmt.free();
    }

    // Lưu metadata
    db.run(
      `INSERT OR REPLACE INTO app_metadata (key, value) VALUES ('last_updated', ?);`,
      [new Date().toISOString()]
    );
    db.run(
      `INSERT OR REPLACE INTO app_metadata (key, value) VALUES ('schema_version', '1.1');`
    );

    db.run("COMMIT;");
  } catch (err) {
    db.run("ROLLBACK;");
    throw err;
  }
}

/**
 * Trích xuất toàn bộ dữ liệu từ 9 bảng SQLite thành định dạng JSON chuẩn cho React State
 * Khôi phục đầy đủ code, shortName và các trường chuyên biệt
 */
function loadJsonFromDatabase(db) {
  const result = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    schoolInfo: null,
    periods: [],
    subjects: {},
    gradeQuotas: {},
    classes: [],
    teachers: [],
    rooms: [],
    assignments: [],
    timetable: {}
  };

  // 1. school_info
  try {
    const res = db.exec("SELECT * FROM school_info WHERE id = 1 LIMIT 1;");
    if (res.length > 0 && res[0].values.length > 0) {
      const row = res[0].values[0];
      const cols = res[0].columns;
      const m = {};
      cols.forEach((col, idx) => { m[col] = row[idx]; });

      let extra = {};
      try { extra = JSON.parse(m.extra_data || '{}'); } catch {}

      result.schoolInfo = {
        ...extra,
        name: m.name || '',
        district: m.district || '',
        year: m.school_year || '',
        principal: m.principal || '',
        scheduler: m.scheduler || '',
        address: m.address || '',
        lunchBreak: m.lunch_break || '10:30 - 14:00'
      };
    }
  } catch (e) {
    console.warn("loadJsonFromDatabase: school_info error", e);
  }

  // 2. periods
  try {
    const res = db.exec("SELECT * FROM periods ORDER BY period_number ASC;");
    if (res.length > 0) {
      const cols = res[0].columns;
      result.periods = res[0].values.map(row => {
        const m = {};
        cols.forEach((c, i) => { m[c] = row[i]; });
        let extra = {};
        try { extra = JSON.parse(m.extra_data || '{}'); } catch {}

        return {
          ...extra,
          id: m.period_number,
          period: m.period_number,
          name: m.name || `Tiết ${m.period_number}`,
          session: m.session,
          time: m.time,
          sessionLabel: m.session_label || '',
          isActive: m.is_active === 1
        };
      });
    }
  } catch (e) {
    console.warn("loadJsonFromDatabase: periods error", e);
  }

  // 3. subjects
  try {
    const res = db.exec("SELECT * FROM subjects;");
    if (res.length > 0) {
      const cols = res[0].columns;
      res[0].values.forEach(row => {
        const m = {};
        cols.forEach((c, i) => { m[c] = row[i]; });
        let extra = {};
        try { extra = JSON.parse(m.extra_data || '{}'); } catch {}

        result.subjects[m.id] = {
          ...extra,
          id: m.raw_id || m.id,
          name: m.name,
          shortName: m.short_name || m.name,
          category: m.category,
          color: m.color,
          bg: m.bg,
          border: m.border,
          text: m.text_color,
          icon: m.icon,
          defaultRoom: m.default_room,
          description: m.description
        };
      });
    }
  } catch (e) {
    console.warn("loadJsonFromDatabase: subjects error", e);
  }

  // 4. gradeQuotas
  try {
    const metaRes = db.exec("SELECT * FROM grade_metadata ORDER BY grade ASC;");
    const quotaRes = db.exec("SELECT * FROM grade_quotas ORDER BY grade ASC;");

    const quotasByGrade = {};
    if (metaRes.length > 0) {
      const cols = metaRes[0].columns;
      metaRes[0].values.forEach(row => {
        const m = {};
        cols.forEach((c, i) => { m[c] = row[i]; });
        let extra = {};
        try { extra = JSON.parse(m.extra_data || '{}'); } catch {}

        quotasByGrade[m.grade] = {
          ...extra,
          grade: m.grade,
          gradeName: m.grade_name || `Khối ${m.grade}`,
          targetWeeklyPeriods: m.target_weekly_periods || 32,
          subjects: []
        };
      });
    }

    if (quotaRes.length > 0) {
      const cols = quotaRes[0].columns;
      quotaRes[0].values.forEach(row => {
        const m = {};
        cols.forEach((c, i) => { m[c] = row[i]; });
        let extra = {};
        try { extra = JSON.parse(m.extra_data || '{}'); } catch {}

        const g = m.grade;
        if (!quotasByGrade[g]) {
          quotasByGrade[g] = {
            grade: g,
            gradeName: `Khối ${g}`,
            targetWeeklyPeriods: 32,
            subjects: []
          };
        }
        quotasByGrade[g].subjects.push({
          ...extra,
          subjectId: m.subject_id,
          weeklyPeriods: m.weekly_periods,
          maxMorning: m.max_morning,
          maxAfternoon: m.max_afternoon,
          allowDouble: m.allow_double === 1,
          roomType: m.room_type || 'LOP_HOC'
        });
      });
    }
    result.gradeQuotas = quotasByGrade;
  } catch (e) {
    console.warn("loadJsonFromDatabase: gradeQuotas error", e);
  }

  // 5. classes
  try {
    const res = db.exec("SELECT * FROM classes ORDER BY grade ASC, name ASC;");
    if (res.length > 0) {
      const cols = res[0].columns;
      result.classes = res[0].values.map(row => {
        const m = {};
        cols.forEach((c, i) => { m[c] = row[i]; });
        let extra = {};
        try { extra = JSON.parse(m.extra_data || '{}'); } catch {}

        return {
          ...extra,
          id: m.id,
          name: m.name,
          grade: m.grade,
          studentCount: m.student_count,
          mainRoom: m.main_room
        };
      });
    }
  } catch (e) {
    console.warn("loadJsonFromDatabase: classes error", e);
  }

  // 6. teachers (Bảo toàn đầy đủ code và shortName)
  try {
    const res = db.exec("SELECT * FROM teachers ORDER BY id ASC;");
    if (res.length > 0) {
      const cols = res[0].columns;
      result.teachers = res[0].values.map(row => {
        const m = {};
        cols.forEach((c, i) => { m[c] = row[i]; });

        let fixedOff = [];
        try { fixedOff = JSON.parse(m.fixed_days_off || '[]'); } catch {}

        let offSessions = [];
        try { offSessions = JSON.parse(m.off_sessions || '[]'); } catch {}

        let extra = {};
        try { extra = JSON.parse(m.extra_data || '{}'); } catch {}

        const teacherCode = m.code || m.short_name || '';

        return {
          ...extra,
          id: m.id,
          tt: m.tt !== null ? m.tt : undefined,
          name: m.name,
          code: teacherCode,
          shortName: teacherCode,
          department: m.department,
          position: m.position || '',
          task: m.task || '',
          assignedPeriods: m.assigned_periods || 0,
          dinhMuc: m.dinh_muc !== undefined ? m.dinh_muc : 23,
          maxPeriodsPerDay: m.max_periods_per_day || 7,
          maxPeriodsPerWeek: m.max_periods_per_week || 23,
          offSessions: offSessions,
          fixedDaysOff: fixedOff,
          phone: m.phone || '',
          email: m.email || '',
          isHomeroom: m.is_homeroom === 1,
          homeroomClassId: m.homeroom_class_id || '',
          color: m.color || '#3b82f6'
        };
      });
    }
  } catch (e) {
    console.warn("loadJsonFromDatabase: teachers error", e);
  }

  // 7. rooms (Bảo toàn code, isSpecialized, allowMultiple)
  try {
    const res = db.exec("SELECT * FROM rooms;");
    if (res.length > 0) {
      const cols = res[0].columns;
      result.rooms = res[0].values.map(row => {
        const m = {};
        cols.forEach((c, i) => { m[c] = row[i]; });
        let extra = {};
        try { extra = JSON.parse(m.extra_data || '{}'); } catch {}

        return {
          ...extra,
          id: m.id,
          name: m.name,
          code: m.code || '',
          type: m.type || m.id,
          capacity: m.capacity || 40,
          isSpecialized: m.is_specialized === 1,
          allowMultiple: m.allow_multiple === 1
        };
      });
    }
  } catch (e) {
    console.warn("loadJsonFromDatabase: rooms error", e);
  }

  // 8. assignments
  try {
    const res = db.exec("SELECT * FROM assignments;");
    if (res.length > 0) {
      const cols = res[0].columns;
      result.assignments = res[0].values.map(row => {
        const m = {};
        cols.forEach((c, i) => { m[c] = row[i]; });
        let extra = {};
        try { extra = JSON.parse(m.extra_data || '{}'); } catch {}

        return {
          ...extra,
          id: m.id,
          classId: m.class_id,
          subjectId: m.subject_id,
          teacherId: m.teacher_id || '',
          weeklyPeriods: m.weekly_periods,
          roomType: m.room_type || 'LOP_HOC',
          allowDouble: m.allow_double === 1
        };
      });
    }
  } catch (e) {
    console.warn("loadJsonFromDatabase: assignments error", e);
  }

  // 9. timetable (Bảo toàn teacherCode, teacherName, teacherRaw, isLocked, note)
  try {
    const res = db.exec("SELECT * FROM timetable_slots;");
    const tMap = {};

    // Khởi tạo khung trống cho các lớp đã nạp
    result.classes.forEach(c => {
      tMap[c.id] = { 2: {}, 3: {}, 4: {}, 5: {}, 6: {} };
    });

    if (res.length > 0) {
      const cols = res[0].columns;
      res[0].values.forEach(row => {
        const m = {};
        cols.forEach((c, i) => { m[c] = row[i]; });
        const cId = m.class_id;
        const d = m.day_of_week;
        const p = m.period;

        if (!tMap[cId]) {
          tMap[cId] = { 2: {}, 3: {}, 4: {}, 5: {}, 6: {} };
        }
        if (!tMap[cId][d]) {
          tMap[cId][d] = {};
        }

        let extra = {};
        try { extra = JSON.parse(m.extra_data || '{}'); } catch {}

        tMap[cId][d][p] = {
          ...extra,
          subjectId: m.subject_id || '',
          teacherId: m.teacher_id || '',
          teacherCode: m.teacher_code || '',
          teacherName: m.teacher_name || '',
          teacherRaw: m.teacher_raw || '',
          subjectRaw: m.subject_raw || '',
          roomId: m.room_id || 'LOP_HOC',
          isLocked: m.is_locked === 1,
          note: m.note || ''
        };
      });
    }
    result.timetable = tMap;
  } catch (e) {
    console.warn("loadJsonFromDatabase: timetable error", e);
  }

  return result;
}

/**
 * Mở hoặc tạo mới database từ file SQLite trên đĩa
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
 * Lưu dữ liệu SQLite nhị phân ra đĩa
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
