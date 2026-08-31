// src/services/excelMapper.js
// Trình chuyển đổi dữ liệu Excel đã validate sang Model chuẩn của hệ thống EduTimetable Studio

import { DEFAULT_GRADE_QUOTAS } from '../constants/defaultCurriculum.js';
import { SUBJECTS } from '../constants/subjects.js';

/**
 * Chuyển đổi dữ liệu thô đã parse thành cấu trúc dữ liệu chính thức của ứng dụng
 * @param {Object} parsedData Dữ liệu từ excelParser
 * @param {Object} currentAppState State hiện tại của ứng dụng (nếu cần fallback)
 * @returns {Object} { teachers, classes, rooms, gradeQuotas, assignments, timetable, schoolInfo }
 */
export function mapParsedExcelToAppModel(parsedData, currentAppState = {}) {
  const {
    teachers = [],
    classes = [],
    timetable = {},
    assignments = [],
    gradeQuotas = DEFAULT_GRADE_QUOTAS,
    rooms = [],
    schoolInfo = { name: 'Trường TH Quỳnh Lộc', year: 'Năm học 2026 - 2027' }
  } = parsedData || {};

  // 1. Chuẩn hóa danh sách giáo viên
  const cleanTeachers = teachers.map((t, idx) => {
    const tt = t.tt || (idx + 1);
    const id = t.id || `GV_${String(tt).padStart(2, '0')}`;
    return {
      id,
      tt,
      name: t.name || `Giáo viên ${tt}`,
      code: t.code || `GV.${tt}`,
      department: t.department || 'Giáo viên',
      position: t.position || 'Giáo Viên',
      isHomeroom: Boolean(t.isHomeroom),
      homeroomClassId: t.homeroomClassId || null,
      task: t.task || '',
      assignedPeriods: Number(t.assignedPeriods) || 0,
      dinhMuc: Number(t.dinhMuc) || 23,
      maxPeriodsPerDay: Number(t.maxPeriodsPerDay) || 6,
      offSessions: Array.isArray(t.offSessions) ? t.offSessions : [],
      color: t.color || '#3b82f6'
    };
  });

  // 2. Chuẩn hóa danh sách lớp học
  const cleanClasses = classes.map(c => {
    const homeroom = cleanTeachers.find(t => t.homeroomClassId === c.id);
    return {
      id: c.id,
      name: c.name || `Lớp ${c.id}`,
      grade: Number(c.grade) || Number(String(c.id)[0]) || 1,
      homeroomTeacherId: c.homeroomTeacherId || (homeroom ? homeroom.id : 'GV_01'),
      mainRoom: c.mainRoom || `P.${c.id}`,
      studentCount: Number(c.studentCount) || 35
    };
  });

  // 3. Chuẩn hóa phòng chức năng
  const cleanRooms = rooms.length > 0 ? rooms : (currentAppState.rooms || [
    { id: 'PHONG_TIN_HOC', name: 'Phòng Tin học 1 (30 máy)', code: 'TIN-01', capacity: 35, isSpecialized: true, allowMultiple: false },
    { id: 'SAN_THE_CHAT', name: 'Sân / Nhà đa năng Thể chất', code: 'SAN-TC', capacity: 100, isSpecialized: true, allowMultiple: true }
  ]);

  // 4. Chuẩn hóa thời khóa biểu (Timetable)
  const cleanTimetable = {};
  cleanClasses.forEach(cls => {
    cleanTimetable[cls.id] = {
      2: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null },
      3: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null },
      4: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null },
      5: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null },
      6: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null }
    };

    if (timetable[cls.id]) {
      for (let d = 2; d <= 6; d++) {
        if (timetable[cls.id][d]) {
          for (let p = 1; p <= 7; p++) {
            const slot = timetable[cls.id][d][p];
            if (slot && slot.subjectId) {
              cleanTimetable[cls.id][d][p] = {
                subjectId: slot.subjectId,
                subjectRaw: slot.subjectRaw || slot.subjectId,
                teacherId: slot.teacherId || '',
                teacherRaw: slot.teacherRaw || '',
                roomId: slot.roomId || 'LOP_HOC',
                isLocked: slot.isLocked !== undefined ? slot.isLocked : true
              };
            }
          }
        }
      }
    }
  });

  // 5. Chuẩn hóa phân công chuyên môn (Assignments)
  const cleanAssignments = assignments.length > 0 ? assignments : [];
  if (cleanAssignments.length === 0) {
    cleanClasses.forEach(cls => {
      const gQuota = gradeQuotas[cls.grade] || DEFAULT_GRADE_QUOTAS[cls.grade];
      if (!gQuota) return;
      gQuota.subjects.forEach(sub => {
        cleanAssignments.push({
          id: `ASG_${cls.id}_${sub.subjectId}`,
          classId: cls.id,
          grade: cls.grade,
          subjectId: sub.subjectId,
          teacherId: cls.homeroomTeacherId || 'GV_01',
          weeklyPeriods: sub.weeklyPeriods,
          roomType: sub.roomType || 'LOP_HOC',
          allowDouble: sub.allowDouble || false
        });
      });
    });
  }

  return {
    teachers: cleanTeachers,
    classes: cleanClasses,
    rooms: cleanRooms,
    gradeQuotas: gradeQuotas || DEFAULT_GRADE_QUOTAS,
    assignments: cleanAssignments,
    timetable: cleanTimetable,
    schoolInfo: schoolInfo || { name: 'Trường TH Quỳnh Lộc', year: 'Năm học 2026 - 2027' }
  };
}
