// src/services/sqlite/sqliteWriter.cjs
// Lưu toàn bộ dữ liệu cấu hình và thời khóa biểu vào 10 bảng SQLite trong Transaction

/**
 * Lưu toàn bộ cấu trúc dữ liệu JSON vào các bảng SQLite trong một Transaction duy nhất
 * @param {Object} db - SQLite database instance từ sql.js
 * @param {Object} data - Dữ liệu thời khóa biểu toàn trường
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

    // 5b. Lưu danh mục Tổ Chuyên Môn / Văn Phòng động
    if (Array.isArray(data.departments)) {
      db.run("DELETE FROM departments;");
      const stmt = db.prepare(
        `INSERT OR REPLACE INTO departments (
          id, name, description, is_office, created_at, updated_at, extra_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?);`
      );
      data.departments.forEach(d => {
        if (!d.id) return;
        const extra = {};
        Object.keys(d).forEach(k => {
          if (!['id', 'name', 'description', 'isOffice', 'is_office', 'createdAt', 'created_at', 'updatedAt', 'updated_at'].includes(k)) {
            extra[k] = d[k];
          }
        });
        stmt.run([
          d.id,
          d.name || '',
          d.description || '',
          d.isOffice || d.is_office ? 1 : 0,
          d.createdAt || d.created_at || new Date().toISOString(),
          d.updatedAt || d.updated_at || new Date().toISOString(),
          JSON.stringify(extra)
        ]);
      });
      stmt.free();
    }

    // 6. Lưu danh sách giáo viên (bảo toàn code, short_name, position, task, dinhMuc, department_id, v.v.)
    if (Array.isArray(data.teachers)) {
      db.run("DELETE FROM teachers;");
      const stmt = db.prepare(
        `INSERT OR REPLACE INTO teachers (
          id, tt, name, code, short_name, department, department_id, position, task, 
          assigned_periods, dinh_muc, max_periods_per_day, max_periods_per_week, 
          off_sessions, fixed_days_off, phone, email, is_homeroom, homeroom_class_id, color, extra_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`
      );
      data.teachers.forEach(t => {
        if (!t.id) return;
        const teacherCode = t.code || t.shortName || t.short_name || '';
        const extra = {};
        Object.keys(t).forEach(k => {
          if (![
            'id', 'tt', 'name', 'code', 'shortName', 'short_name', 'department', 'departmentId', 'department_id',
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
          t.departmentId || t.department_id || '',
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

module.exports = {
  saveJsonToDatabase
};
