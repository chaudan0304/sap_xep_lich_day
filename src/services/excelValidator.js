// src/services/excelValidator.js
// Trình kiểm tra tính hợp lệ và phát hiện xung đột dữ liệu Excel trước khi Import
// Cung cấp thông tin chẩn đoán chi tiết: Toạ độ ô Excel (Sheet, Dòng, Cột, Ô Excel), Thời gian rõ ràng (Thứ, Buổi, Tiết)

import { SUBJECTS } from '../constants/subjects.js';

/**
 * Chuyển đổi chỉ số cột (1-indexed) thành chữ cái cột Excel (A, B, ..., Z, AA, AB...)
 */
export function getExcelColumnLetter(colNum) {
  let temp = colNum;
  let letter = '';
  while (temp > 0) {
    const mod = (temp - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    temp = Math.floor((temp - 1) / 26);
  }
  return letter || 'A';
}

/**
 * Lấy mô tả thời gian chi tiết và rõ ràng
 */
export function formatPeriodDescription(day, session, period, rawPeriod) {
  const dayStr = `Thứ ${day}`;
  const sessStr = session ? `Buổi ${session}` : (period <= 4 ? 'Buổi Sáng' : 'Buổi Chiều');
  const rawP = rawPeriod || (period <= 4 ? period : period - 4);
  return `${dayStr}, ${sessStr} — Tiết ${rawP} (Tiết ${period} hệ thống)`;
}

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
    rawSlots = []
  } = parsedData || {};

  // 1. KIỂM TRA TỔNG QUAN FILE
  if (!sheetNames || sheetNames.length === 0) {
    errors.push({
      category: 'FORMAT_ERROR',
      sheet: 'Root',
      row: 0,
      col: 0,
      cellRef: 'File',
      type: 'error',
      title: 'Thiếu Sheet dữ liệu',
      message: 'File Excel không chứa bất kỳ Sheet dữ liệu nào.',
      suggestion: 'Vui lòng kiểm tra lại file Excel tải lên.'
    });
  }

  if (classes.length === 0) {
    errors.push({
      category: 'FORMAT_ERROR',
      sheet: 'Root',
      row: 0,
      col: 0,
      cellRef: 'File',
      type: 'error',
      title: 'Không tìm thấy lớp học',
      message: 'Không tìm thấy danh sách lớp học hợp lệ (1A1 -> 5A5) trong bất kỳ sheet nào.',
      suggestion: 'Hãy đảm bảo dòng tiêu đề chứa tên các lớp như 1A1, 1A2... hoặc có sheet Danh_Sach_Lop.'
    });
  }

  if (teachers.length === 0) {
    warnings.push({
      category: 'TEACHER_INFO',
      sheet: 'Phân công chuyên môn',
      row: 0,
      col: 0,
      cellRef: 'Phân công',
      type: 'warning',
      title: 'Chưa có danh sách giáo viên',
      message: 'Không tìm thấy sheet Phân công chuyên môn hoặc danh sách giáo viên.',
      suggestion: 'Hệ thống sẽ tự động tạo danh sách giáo viên mặc định cho từng lớp.'
    });
  }

  // 2. KIỂM TRA LỚP HỌC (Classes)
  const classIdSet = new Set();
  classes.forEach((c, idx) => {
    if (!c.id) {
      errors.push({
        category: 'CLASS_ERROR',
        sheet: 'Danh sách lớp',
        row: idx + 1,
        col: 1,
        cellRef: `Lớp #${idx + 1}`,
        type: 'error',
        title: 'Thiếu mã lớp',
        message: 'Lớp học bị thiếu Mã lớp.',
        value: c.name || '',
        suggestion: 'Đặt mã lớp theo chuẩn: 1A1, 2A1, 3A1, 4A1, 5A1...'
      });
    } else {
      if (classIdSet.has(c.id)) {
        errors.push({
          category: 'CLASS_ERROR',
          sheet: 'Danh sách lớp',
          row: idx + 1,
          col: 1,
          cellRef: `Lớp ${c.id}`,
          type: 'error',
          title: 'Trùng mã lớp',
          message: `Trùng lặp mã lớp học: ${c.id}`,
          value: c.id,
          suggestion: 'Xóa hoặc đổi tên mã lớp bị trùng.'
        });
      }
      classIdSet.add(c.id);

      if (!c.grade || c.grade < 1 || c.grade > 5) {
        warnings.push({
          category: 'CLASS_ERROR',
          sheet: 'Danh sách lớp',
          row: idx + 1,
          col: 2,
          cellRef: `Lớp ${c.id}`,
          type: 'warning',
          title: 'Khối lớp ngoài chuẩn',
          message: `Khối lớp [Khối ${c.grade}] không nằm trong chuẩn Tiểu học (Khối 1 đến 5).`,
          value: String(c.grade),
          suggestion: 'Kiểm tra lại khối lớp của lớp này.'
        });
      }
    }
  });

  // 3. KIỂM TRA GIÁO VIÊN (Teachers)
  const teacherIdSet = new Set();
  teachers.forEach((t, idx) => {
    if (!t.id) {
      errors.push({
        category: 'TEACHER_INFO',
        sheet: 'Phân công chuyên môn',
        row: idx + 8,
        col: 1,
        cellRef: `Dòng ${idx + 8}`,
        type: 'error',
        title: 'Thiếu mã GV',
        message: 'Giáo viên bị thiếu ID định danh.',
        value: t.name || '',
        suggestion: 'Khai báo mã giáo viên như GV_01, GV_02...'
      });
    } else {
      if (teacherIdSet.has(t.id)) {
        errors.push({
          category: 'TEACHER_INFO',
          sheet: 'Phân công chuyên môn',
          row: idx + 8,
          col: 1,
          cellRef: `Dòng ${idx + 8}`,
          type: 'error',
          title: 'Trùng mã GV',
          message: `Trùng lặp ID giáo viên: ${t.id}`,
          value: t.id,
          suggestion: 'Đảm bảo mỗi giáo viên có một mã ID duy nhất.'
        });
      }
      teacherIdSet.add(t.id);
    }

    if (!t.name || t.name.trim() === '') {
      errors.push({
        category: 'TEACHER_INFO',
        sheet: 'Phân công chuyên môn',
        row: idx + 8,
        col: 2,
        cellRef: `Dòng ${idx + 8}`,
        type: 'error',
        title: 'Tên GV trống',
        message: 'Tên giáo viên không được để trống.',
        value: '',
        suggestion: 'Nhập đầy đủ Họ và Tên giáo viên.'
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
    const colLetter = getExcelColumnLetter(slot.col);
    const cellRef = `'${slot.sheet}'!${colLetter}${slot.row}`;

    // Thứ hợp lệ: 2..6
    if (!slot.day || slot.day < 2 || slot.day > 6) {
      errors.push({
        category: 'FORMAT_ERROR',
        sheet: slot.sheet,
        row: slot.row,
        col: slot.col,
        cellRef,
        type: 'error',
        title: 'Thứ không hợp lệ',
        message: `Thứ không hợp lệ: Thứ ${slot.day} (Hệ thống chỉ chấp nhận Thứ 2 đến Thứ 6).`,
        value: String(slot.day),
        classId: slot.classId,
        suggestion: 'Kiểm tra cột Thứ trong file Excel.'
      });
      slotValid = false;
    }

    // Tiết hợp lệ: 1..7
    if (!slot.period || slot.period < 1 || slot.period > 7) {
      errors.push({
        category: 'FORMAT_ERROR',
        sheet: slot.sheet,
        row: slot.row,
        col: slot.col,
        cellRef,
        type: 'error',
        title: 'Tiết học không hợp lệ',
        message: `Tiết học không hợp lệ: Tiết ${slot.period} (Chỉ chấp nhận Tiết 1 đến Tiết 7).`,
        value: String(slot.period),
        classId: slot.classId,
        suggestion: 'Kiểm tra cột Tiết trong file Excel.'
      });
      slotValid = false;
    }

    // Lớp hợp lệ
    if (!slot.classId || !classIdSet.has(slot.classId)) {
      errors.push({
        category: 'CLASS_ERROR',
        sheet: slot.sheet,
        row: slot.row,
        col: slot.col,
        cellRef,
        type: 'error',
        title: 'Lớp không tồn tại',
        message: `Mã lớp [${slot.classId}] không tồn tại trong danh mục lớp học.`,
        value: slot.classId,
        classId: slot.classId,
        suggestion: 'Kiểm tra tiêu đề cột lớp học trong Excel.'
      });
      slotValid = false;
    }

    // Môn học hợp lệ & Phát hiện nghi vấn nhầm cột
    const isTeacherPrefix = /^(?:Đ\/c\.|Đ\/c|Đc\.|Đc|Đ\.c|Thầy\s+giáo|Thầy|Cô\s+giáo|Cô|GV)\s+/i.test(slot.subjectRaw);
    if (isTeacherPrefix) {
      errors.push({
        category: 'SUBJECT_ANOMALY',
        sheet: slot.sheet,
        row: slot.row,
        col: slot.col,
        cellRef,
        type: 'error',
        title: 'Nghi vấn nhầm cột Môn và Giáo viên',
        message: `Cột môn học đang ghi nội dung [${slot.subjectRaw}] (có dấu hiệu là tên giáo viên). Dữ liệu vẫn được giữ nguyên bản.`,
        value: slot.subjectRaw,
        classId: slot.classId,
        day: slot.day,
        period: slot.period,
        rawPeriod: slot.rawPeriod,
        session: slot.session,
        suggestion: 'Kiểm tra và sửa lại tên môn học chính xác cho ô này trên TKB Studio hoặc trong file Excel.'
      });
    } else {
      const isStandardSub = slot.subjectId && (SUBJECTS[slot.subjectId] || slot.subjectId === 'TU_CHON' || slot.subjectId === 'HDTN' || slot.subjectId === 'GD_CONG_DAN_SO');
      if (!isStandardSub) {
        warnings.push({
          category: 'SUBJECT_WARNING',
          sheet: slot.sheet,
          row: slot.row,
          col: slot.col,
          cellRef,
          type: 'warning',
          title: 'Môn học đặc thù / Mới',
          message: `Môn học [${slot.subjectRaw}] được giữ nguyên bản và đã được tự động đưa vào Danh mục môn học của hệ thống.`,
          value: slot.subjectRaw,
          classId: slot.classId,
          day: slot.day,
          period: slot.period,
          rawPeriod: slot.rawPeriod,
          session: slot.session,
          suggestion: 'Bạn có thể chỉnh sửa tên hoặc màu sắc môn học trong tab Quản lý môn học sau khi nạp.'
        });
      }
    }

    // Giáo viên phụ trách
    if (!slot.teacherId) {
      const timeDesc = formatPeriodDescription(slot.day, slot.session, slot.period, slot.rawPeriod);
      if (slot.teacherRaw) {
        warnings.push({
          category: 'TEACHER_NOT_FOUND',
          sheet: slot.sheet,
          row: slot.row,
          col: slot.col,
          cellRef,
          type: 'warning',
          title: 'Giáo viên chưa khớp mã',
          message: `Tên giáo viên [${slot.teacherRaw}] tại ô ${cellRef} (${slot.classId} - ${timeDesc}) chưa khớp với bất kỳ giáo viên nào trong danh mục GV của trường.`,
          value: slot.teacherRaw,
          classId: slot.classId,
          day: slot.day,
          period: slot.period,
          rawPeriod: slot.rawPeriod,
          session: slot.session,
          suggestion: 'Vui lòng kiểm tra lại tên giáo viên trong ô này hoặc bổ sung vào Danh mục Giáo viên.'
        });
      } else {
        warnings.push({
          category: 'TEACHER_EMPTY',
          sheet: slot.sheet,
          row: slot.row,
          col: slot.col,
          cellRef,
          type: 'warning',
          title: 'Chưa phân công giáo viên',
          message: `Tiết học môn [${slot.subjectRaw}] của lớp [${slot.classId}] vào ${timeDesc} đang để trống tên giáo viên.`,
          value: 'Trống',
          classId: slot.classId,
          day: slot.day,
          period: slot.period,
          rawPeriod: slot.rawPeriod,
          session: slot.session,
          suggestion: 'Bạn có thể chỉnh sửa trực tiếp trên Thời khóa biểu hoặc phân công GV trong tab Phân công.'
        });
      }
    }

    // Ghi nhận trùng lớp cùng thời điểm
    const classTimeKey = `${slot.classId}_${slot.day}_${slot.period}`;
    if (!classOccupancyMap.has(classTimeKey)) {
      classOccupancyMap.set(classTimeKey, []);
    }
    classOccupancyMap.get(classTimeKey).push(slot);

    // Ghi nhận trùng giáo viên cùng thời điểm
    if (slot.teacherId) {
      const teacherTimeKey = `${slot.teacherId}_${slot.day}_${slot.period}`;
      if (!teacherOccupancyMap.has(teacherTimeKey)) {
        teacherOccupancyMap.set(teacherTimeKey, []);
      }
      teacherOccupancyMap.get(teacherTimeKey).push(slot);
    }

    // Ghi nhận trùng phòng chức năng độc quyền (Phòng Tin học)
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
  teacherOccupancyMap.forEach((slots) => {
    if (slots.length > 1) {
      const first = slots[0];
      const timeDesc = formatPeriodDescription(first.day, first.session, first.period, first.rawPeriod);
      const colLetter = getExcelColumnLetter(first.col);
      const cellRef = `'${first.sheet}'!${colLetter}${first.row}`;

      const classListDetails = slots.map(s => {
        const cLetter = getExcelColumnLetter(s.col);
        return `${s.classId} (Môn: ${s.subjectRaw}, Ô: ${s.sheet}!${cLetter}${s.row})`;
      }).join(' ⚡ ');

      errors.push({
        category: 'TEACHER_CONFLICT',
        sheet: first.sheet,
        row: first.row,
        col: first.col,
        cellRef,
        type: 'error',
        title: 'Trùng giờ dạy giáo viên',
        message: `Xung đột: Giáo viên [${first.teacherName || first.teacherRaw}] bị xếp dạy đồng thời vào ${timeDesc} cho các lớp: ${classListDetails}`,
        value: first.teacherRaw,
        classId: first.classId,
        day: first.day,
        period: first.period,
        rawPeriod: first.rawPeriod,
        session: first.session,
        teacherId: first.teacherId,
        teacherName: first.teacherName || first.teacherRaw,
        conflictingSlots: slots.map(s => ({
          classId: s.classId,
          subject: s.subjectRaw,
          sheet: s.sheet,
          row: s.row,
          col: s.col,
          day: s.day,
          period: s.period,
          cellRef: `'${s.sheet}'!${getExcelColumnLetter(s.col)}${s.row}`
        })),
        suggestion: 'Mở file Excel tại các ô toạ độ trên để chỉnh sửa lại giáo viên hoặc đổi tiết sang khung giờ khác.'
      });
    }
  });

  // 6. PHÁT HIỆN XUNG ĐỘT TRÙNG PHÒNG CHỨC NĂNG
  roomOccupancyMap.forEach((slots) => {
    if (slots.length > 1) {
      const first = slots[0];
      const timeDesc = formatPeriodDescription(first.day, first.session, first.period, first.rawPeriod);
      const colLetter = getExcelColumnLetter(first.col);
      const cellRef = `'${first.sheet}'!${colLetter}${first.row}`;

      const classListDetails = slots.map(s => {
        const cLetter = getExcelColumnLetter(s.col);
        return `${s.classId} (Ô: ${s.sheet}!${cLetter}${s.row})`;
      }).join(', ');

      warnings.push({
        category: 'ROOM_CONFLICT',
        sheet: first.sheet,
        row: first.row,
        col: first.col,
        cellRef,
        type: 'warning',
        title: 'Trùng phòng Tin học',
        message: `Cảnh báo phòng chức năng: Phòng Tin học bị xếp trùng vào ${timeDesc} cho các lớp: ${classListDetails}`,
        value: first.roomId,
        classId: first.classId,
        roomId: first.roomId,
        conflictingSlots: slots.map(s => ({
          classId: s.classId,
          sheet: s.sheet,
          row: s.row,
          col: s.col,
          cellRef: `'${s.sheet}'!${getExcelColumnLetter(s.col)}${s.row}`
        })),
        suggestion: 'Phòng máy chỉ đủ cho 1 lớp mỗi tiết. Hãy chuyển tiết Tin học của 1 trong các lớp này sang buổi/tiết khác.'
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
