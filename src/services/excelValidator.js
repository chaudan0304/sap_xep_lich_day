// src/services/excelValidator.js
// Trình kiểm tra tính hợp lệ và phát hiện xung đột dữ liệu Excel trước khi Import

import { SUBJECTS } from '../constants/subjects.js';

/**
 * Kiểm tra toàn diện dữ liệu đã bóc tách từ Excel
 * @param {Object} parsedData Dữ liệu từ excelParser
 * @returns {Object} { isValid, errors, warnings, summary }
 */
export function validateParsedExcelData(parsedData) {
  const errors = [];
  const warnings = [];

  const {
    sheetNames = [],
    teachers = [],
    classes = [],
    timetable = {},
    rawSlots = [],
    rooms = []
  } = parsedData || {};

  // 1. KIỂM TRA TỔNG QUAN FILE
  if (!sheetNames || sheetNames.length === 0) {
    errors.push({
      sheet: 'Root',
      row: 0,
      col: 0,
      type: 'error',
      message: 'File Excel không chứa bất kỳ Sheet dữ liệu nào.',
      value: ''
    });
  }

  if (classes.length === 0) {
    errors.push({
      sheet: 'Root',
      row: 0,
      col: 0,
      type: 'error',
      message: 'Không tìm thấy danh sách lớp học hợp lệ trong file.',
      value: ''
    });
  }

  if (teachers.length === 0) {
    warnings.push({
      sheet: 'Phân công chuyên môn',
      row: 0,
      col: 0,
      type: 'warning',
      message: 'Không tìm thấy danh sách giáo viên trong sheet Phân công chuyên môn.',
      value: ''
    });
  }

  // 2. KIỂM TRA LỚP HỌC (Classes)
  const classIdSet = new Set();
  classes.forEach((c, idx) => {
    if (!c.id) {
      errors.push({
        sheet: 'Danh sách lớp',
        row: idx + 1,
        col: 1,
        type: 'error',
        message: 'Lớp học bị thiếu Mã lớp.',
        value: c.name || ''
      });
    } else {
      if (classIdSet.has(c.id)) {
        errors.push({
          sheet: 'Danh sách lớp',
          row: idx + 1,
          col: 1,
          type: 'error',
          message: `Trùng lặp mã lớp học: ${c.id}`,
          value: c.id
        });
      }
      classIdSet.add(c.id);

      if (!c.grade || c.grade < 1 || c.grade > 5) {
        warnings.push({
          sheet: 'Danh sách lớp',
          row: idx + 1,
          col: 2,
          type: 'warning',
          message: `Khối lớp ${c.grade} không nằm trong chuẩn Tiểu học (Khối 1 đến 5).`,
          value: String(c.grade)
        });
      }
    }
  });

  // 3. KIỂM TRA GIÁO VIÊN (Teachers)
  const teacherIdSet = new Set();
  teachers.forEach((t, idx) => {
    if (!t.id) {
      errors.push({
        sheet: 'Phân công chuyên môn',
        row: idx + 8,
        col: 1,
        type: 'error',
        message: 'Giáo viên bị thiếu ID định danh.',
        value: t.name || ''
      });
    } else {
      if (teacherIdSet.has(t.id)) {
        errors.push({
          sheet: 'Phân công chuyên môn',
          row: idx + 8,
          col: 1,
          type: 'error',
          message: `Trùng lặp ID giáo viên: ${t.id}`,
          value: t.id
        });
      }
      teacherIdSet.add(t.id);
    }

    if (!t.name || t.name.trim() === '') {
      errors.push({
        sheet: 'Phân công chuyên môn',
        row: idx + 8,
        col: 2,
        type: 'error',
        message: 'Tên giáo viên không được để trống.',
        value: ''
      });
    }
  });

  // 4. KIỂM TRA CHI TIẾT TỪNG TIẾT HỌC (Slots Validation)
  const teacherOccupancyMap = new Map(); // key: teacherId_day_period -> [{ slot }]
  const classOccupancyMap = new Map();   // key: classId_day_period -> [{ slot }]
  const roomOccupancyMap = new Map();    // key: roomId_day_period -> [{ slot }]

  let validSlotsCount = 0;

  rawSlots.forEach(slot => {
    let slotValid = true;

    // Thứ hợp lệ: 2..6
    if (!slot.day || slot.day < 2 || slot.day > 6) {
      errors.push({
        sheet: slot.sheet,
        row: slot.row,
        col: slot.col,
        type: 'error',
        message: `Thứ không hợp lệ: Thứ ${slot.day} (Chỉ chấp nhận Thứ 2 đến Thứ 6).`,
        value: String(slot.day),
        classId: slot.classId
      });
      slotValid = false;
    }

    // Tiết hợp lệ: 1..7
    if (!slot.period || slot.period < 1 || slot.period > 7) {
      errors.push({
        sheet: slot.sheet,
        row: slot.row,
        col: slot.col,
        type: 'error',
        message: `Tiết học không hợp lệ: Tiết ${slot.period} (Chỉ chấp nhận Tiết 1 đến Tiết 7).`,
        value: String(slot.period),
        classId: slot.classId
      });
      slotValid = false;
    }

    // Lớp hợp lệ
    if (!slot.classId || !classIdSet.has(slot.classId)) {
      errors.push({
        sheet: slot.sheet,
        row: slot.row,
        col: slot.col,
        type: 'error',
        message: `Mã lớp [${slot.classId}] không tồn tại trong danh mục lớp học.`,
        value: slot.classId,
        classId: slot.classId
      });
      slotValid = false;
    }

    // Môn học hợp lệ
    if (!slot.subjectId || (!SUBJECTS[slot.subjectId] && slot.subjectId !== 'TU_CHON')) {
      warnings.push({
        sheet: slot.sheet,
        row: slot.row,
        col: slot.col,
        type: 'warning',
        message: `Tên môn học [${slot.subjectRaw}] chưa có trong danh mục chuẩn, sẽ chuyển về Tự chọn.`,
        value: slot.subjectRaw,
        classId: slot.classId
      });
    }

    // Giáo viên hợp lệ
    if (!slot.teacherId) {
      warnings.push({
        sheet: slot.sheet,
        row: slot.row,
        col: slot.col,
        type: 'warning',
        message: `Chưa xác định được giáo viên phụ trách cho môn [${slot.subjectRaw}] tại lớp [${slot.classId}].`,
        value: slot.teacherRaw || 'Trống',
        classId: slot.classId
      });
    }

    // Kiểm tra trùng lớp cùng thời điểm
    const classTimeKey = `${slot.classId}_${slot.day}_${slot.period}`;
    if (!classOccupancyMap.has(classTimeKey)) {
      classOccupancyMap.set(classTimeKey, []);
    }
    classOccupancyMap.get(classTimeKey).push(slot);

    // Kiểm tra trùng giáo viên cùng thời điểm
    if (slot.teacherId) {
      const teacherTimeKey = `${slot.teacherId}_${slot.day}_${slot.period}`;
      if (!teacherOccupancyMap.has(teacherTimeKey)) {
        teacherOccupancyMap.set(teacherTimeKey, []);
      }
      teacherOccupancyMap.get(teacherTimeKey).push(slot);
    }

    // Kiểm tra trùng phòng chức năng độc quyền
    if (slot.roomId && slot.roomId === 'PHONG_TIN_HOC') {
      const roomTimeKey = `${slot.roomId}_${slot.day}_${slot.period}`;
      if (!roomOccupancyMap.has(roomTimeKey)) {
        roomOccupancyMap.set(roomTimeKey, []);
      }
      roomOccupancyMap.get(roomTimeKey).push(slot);
    }

    if (slotValid) {
      validSlotsCount++;
    }
  });

  // 5. PHÁT HIỆN XUNG ĐỘT TRÙNG GIÁO VIÊN
  teacherOccupancyMap.forEach((slots, key) => {
    if (slots.length > 1) {
      const first = slots[0];
      const classNames = slots.map(s => `${s.classId} (${s.subjectRaw})`).join(', ');
      errors.push({
        sheet: first.sheet,
        row: first.row,
        col: first.col,
        type: 'error',
        message: `Xung đột: Giáo viên [${first.teacherName || first.teacherRaw}] bị xếp dạy cùng lúc ở Thứ ${first.day} Tiết ${first.rawPeriod} cho các lớp: ${classNames}`,
        value: first.teacherRaw,
        classId: first.classId,
        teacherName: first.teacherName || first.teacherRaw
      });
    }
  });

  // 6. PHÁT HIỆN XUNG ĐỘT TRÙNG PHÒNG CHỨC NĂNG
  roomOccupancyMap.forEach((slots, key) => {
    if (slots.length > 1) {
      const first = slots[0];
      const classNames = slots.map(s => s.classId).join(', ');
      warnings.push({
        sheet: first.sheet,
        row: first.row,
        col: first.col,
        type: 'warning',
        message: `Cảnh báo phòng chức năng: Phòng Tin học bị xếp trùng tại Thứ ${first.day} Tiết ${first.rawPeriod} cho các lớp: ${classNames}`,
        value: first.roomId,
        classId: first.classId
      });
    }
  });

  // 7. TỔNG HỢP KẾT QUẢ
  const summary = {
    totalSheets: sheetNames.length,
    totalClasses: classes.length,
    totalTeachers: teachers.length,
    totalSlots: rawSlots.length,
    validSlots: validSlotsCount,
    errorCount: errors.length,
    warningCount: warnings.length,
    format: parsedData.format
  };

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary
  };
}
