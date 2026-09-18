// src/services/sqlite/sqliteReader.cjs
// Trích xuất toàn bộ dữ liệu từ 10 bảng SQLite thành định dạng JSON chuẩn cho React State

/**
 * Trích xuất toàn bộ dữ liệu từ 10 bảng SQLite thành định dạng JSON chuẩn cho React State
 * Khôi phục đầy đủ code, shortName, departmentId và các trường chuyên biệt
 * @param {Object} db - SQLite database instance từ sql.js
 * @returns {Object} Dữ liệu trạng thái ứng dụng
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

  // 5b. departments (Danh mục Tổ Chuyên Môn / Văn Phòng)
  try {
    const res = db.exec("SELECT * FROM departments ORDER BY is_office ASC, name ASC;");
    if (res.length > 0) {
      const cols = res[0].columns;
      result.departments = res[0].values.map(row => {
        const m = {};
        cols.forEach((c, i) => { m[c] = row[i]; });
        let extra = {};
        try { extra = JSON.parse(m.extra_data || '{}'); } catch {}

        return {
          ...extra,
          id: m.id,
          name: m.name,
          description: m.description || '',
          isOffice: m.is_office === 1,
          createdAt: m.created_at || '',
          updatedAt: m.updated_at || ''
        };
      });
    } else {
      result.departments = [];
    }
  } catch (e) {
    console.warn("loadJsonFromDatabase: departments error", e);
    result.departments = [];
  }

  // 6. teachers (Bảo toàn đầy đủ code, shortName, departmentId)
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
          departmentId: m.department_id || '',
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

  // Auto-migration nếu DB cũ chưa có bảng departments hoặc giáo viên chưa có departmentId
  if (Array.isArray(result.teachers) && result.teachers.length > 0) {
    const deptList = Array.isArray(result.departments) && result.departments.length > 0
      ? [...result.departments]
      : [
          { id: 'dept_to_123', name: 'Tổ 1, 2, 3', description: 'Tổ chuyên môn khối 1, 2, 3', isOffice: false },
          { id: 'dept_to_45', name: 'Tổ 4, 5', description: 'Tổ chuyên môn khối 4, 5', isOffice: false },
          { id: 'dept_bo_mon', name: 'Giáo viên bộ môn', description: 'Tổ giáo viên chuyên trách các môn bộ môn', isOffice: false },
          { id: 'dept_van_phong', name: 'Tổ Văn Phòng', description: 'Tổ cán bộ văn phòng, hành chính', isOffice: true }
        ];

    const deptMap = new Map();
    deptList.forEach(d => {
      deptMap.set(d.id, d);
      deptMap.set(d.name.toLowerCase().trim(), d);
    });

    result.teachers = result.teachers.map(t => {
      const rawDept = (t.department || '').trim();
      const lower = rawDept.toLowerCase();
      let d = t.departmentId && deptMap.has(t.departmentId)
        ? deptMap.get(t.departmentId)
        : (lower && deptMap.has(lower) ? deptMap.get(lower) : null);

      if (!d && rawDept) {
        // Tạo department mới cho các tổ cũ tồn tại trong dữ liệu như "Tổ 1"
        const isOffice = lower.includes('văn phòng') || lower.includes('hành chính');
        let newId = 'dept_' + lower.replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
        d = {
          id: newId,
          name: rawDept,
          description: '',
          isOffice,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        deptList.push(d);
        deptMap.set(d.id, d);
        deptMap.set(lower, d);
      } else if (!d) {
        d = deptMap.get('dept_bo_mon') || deptList[0];
      }

      return {
        ...t,
        departmentId: d ? d.id : 'dept_bo_mon',
        department: d ? d.name : (rawDept || 'Giáo viên bộ môn')
      };
    });

    result.departments = deptList;
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

module.exports = {
  loadJsonFromDatabase
};
