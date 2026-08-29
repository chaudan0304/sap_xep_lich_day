// src/services/excelService.js
// Trung tâm Xử lý Nhập & Xuất File Excel (SheetJS XLSX)
// Thiết kế định dạng báo cáo chuẩn sư phạm, bố cục trang nhã, dễ đọc, dễ hiểu và tối ưu in ấn

import * as XLSX from 'xlsx';
import { SUBJECTS as DEFAULT_SUBJECTS } from '../constants/subjects.js';
import { DAYS_OF_WEEK, PERIODS, DEFAULT_GRADE_QUOTAS } from '../constants/defaultCurriculum.js';
import { SAMPLE_ROOMS, SAMPLE_CLASSES, SAMPLE_TEACHERS, generateSampleAssignments } from '../data/sampleData.js';

import { parseExcelWorkbook, mapSubjectCodeAndRoom, resolveTeacher, getTeacherShortName } from './excelParser.js';
import { validateParsedExcelData } from './excelValidator.js';
import { mapParsedExcelToAppModel } from './excelMapper.js';

export { mapSubjectCodeAndRoom, resolveTeacher, getTeacherShortName };

/**
 * 1. TẢI FILE MẪU CHUẨN ĐỊNH MỨC (.xlsx)
 */
export const downloadExcelTemplate = () => {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Định Mức Theo Khối
  const quotaRows = [
    ['TRƯỜNG TIỂU HỌC QUỲNH LỘC B', '', '', '', '', '', ''],
    ['KHUNG PHÂN PHỐI CHƯƠNG TRÌNH & ĐỊNH MỨC THEO KHỐI (32 TIẾT/TUẦN)', '', '', '', '', '', ''],
    [],
    ['Khối', 'Mã Môn', 'Tên Môn Học', 'Số Tiết / Tuần', 'Sáng Tối Đa', 'Chiều Tối Đa', 'Phòng Chức Năng']
  ];

  Object.values(DEFAULT_GRADE_QUOTAS).forEach(g => {
    g.subjects.forEach(s => {
      quotaRows.push([
        `Khối ${g.grade}`,
        s.subjectId,
        DEFAULT_SUBJECTS[s.subjectId]?.name || s.subjectId,
        s.weeklyPeriods,
        s.maxMorning,
        s.maxAfternoon,
        s.roomType || 'LOP_HOC'
      ]);
    });
  });

  const wsQuota = XLSX.utils.aoa_to_sheet(quotaRows);
  wsQuota['!cols'] = [{ wch: 12 }, { wch: 18 }, { wch: 28 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsQuota, 'Dinh_Muc_Theo_Khoi');

  // Sheet 2: Danh Sách Giáo Viên
  const teacherRows = [
    ['DANH SÁCH CÁN BỘ / GIÁO VIÊN & ĐỊNH MỨC', '', '', '', '', '', '', ''],
    [],
    ['Mã GV', 'Họ và Tên', 'Mã Viết Tắt', 'Chủ Nhiệm', 'Tổ Chuyên Môn', 'Định Mức (Tiết/Tuần)', 'Số Điện Thoại', 'Buổi Nghỉ Đăng Ký']
  ];

  SAMPLE_TEACHERS.forEach(t => {
    teacherRows.push([
      t.id,
      t.name,
      t.code || getTeacherShortName(t.name, t.homeroomClassId, t.task),
      t.isHomeroom ? `Lớp ${t.homeroomClassId}` : 'Không',
      t.department || 'Giáo viên',
      t.dinhMuc || 23,
      t.phone || '',
      (t.offSessions || []).join(', ')
    ]);
  });

  const wsTeacher = XLSX.utils.aoa_to_sheet(teacherRows);
  wsTeacher['!cols'] = [{ wch: 10 }, { wch: 26 }, { wch: 16 }, { wch: 14 }, { wch: 22 }, { wch: 20 }, { wch: 16 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsTeacher, 'Danh_Sach_Giao_Vien');

  // Sheet 3: Danh Sách Lớp
  const classRows = [
    ['DANH SÁCH LỚP HỌC & GIÁO VIÊN CHỦ NHIỆM', '', '', '', '', ''],
    [],
    ['Mã Lớp', 'Tên Lớp', 'Khối', 'Mã GVCN', 'Phòng Học', 'Sĩ Số']
  ];

  SAMPLE_CLASSES.forEach(c => {
    classRows.push([
      c.id,
      c.name,
      `Khối ${c.grade}`,
      c.homeroomTeacherId,
      c.mainRoom || `P.${c.id}`,
      c.studentCount || 35
    ]);
  });

  const wsClass = XLSX.utils.aoa_to_sheet(classRows);
  wsClass['!cols'] = [{ wch: 10 }, { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, wsClass, 'Danh_Sach_Lop');

  XLSX.writeFile(wb, 'Mau_Thoi_Khoa_Bieu_Chuan_Tieu_Hoc.xlsx');
};

/**
 * 2. ĐỌC VÀ PHÂN TÍCH FILE EXCEL VỚI PREVIEW & VALIDATION ĐẦY ĐỦ
 */
export const importExcelWithPreview = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = new Uint8Array(e.target.result);
        const parsed = parseExcelWorkbook(buffer);
        const validation = validateParsedExcelData(parsed);
        const mappedData = mapParsedExcelToAppModel(parsed);

        resolve({
          success: true,
          isValid: validation.isValid,
          previewData: parsed,
          errors: validation.errors,
          warnings: validation.warnings,
          summary: validation.summary,
          data: mappedData
        });
      } catch (err) {
        console.error('Error in importExcelWithPreview:', err);
        reject(err);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

export const importExcelData = async (file) => {
  return await importExcelWithPreview(file);
};

/**
 * 3. XUẤT THỜI KHÓA BIỂU MA TRẬN TOÀN TRƯỜNG (CHUẨN BÁO CÁO SƯ PHẠM)
 */
export const exportMasterTimetable = (timetable, classes = [], teachers = [], subjects = {}, schoolInfo = {}) => {
  const _subjects = subjects || DEFAULT_SUBJECTS;
  const sName = schoolInfo.name || 'TRƯỜNG TIỂU HỌC QUỲNH LỘC B';
  const sYear = schoolInfo.year || 'NĂM HỌC 2026 - 2027';
  const teacherMap = new Map((teachers || []).map(t => [t.id, t]));

  const wb = XLSX.utils.book_new();

  // === SHEET 1: MA TRẬN TỔNG HỢP TOÀN TRƯỜNG (23 LỚP) ===
  const masterRows = [
    ['UBND PHƯỜNG TÂN MAI', '', '', '', '', '', '', '', ''],
    [sName.toUpperCase(), '', '', '', '', '', '', '', ''],
    [`THỜI KHÓA BIỂU TOÀN TRƯỜNG - ${sYear.toUpperCase()}`, '', '', '', '', '', '', '', ''],
    ['(Áp dụng thực hiện chính thức từ Tuần 01)', '', '', '', '', '', '', '', ''],
    []
  ];

  // Dòng Tiêu Đề Các Lớp (Row 6)
  const headerRow = ['Thứ', 'Buổi', 'Tiết'];
  classes.forEach(c => {
    headerRow.push(c.name, `GV (${c.name})`);
  });
  masterRows.push(headerRow);

  // Duyệt qua từng Thứ (2..6) và từng Tiết (1..7)
  const days = [
    { id: 2, name: 'Thứ 2' },
    { id: 3, name: 'Thứ 3' },
    { id: 4, name: 'Thứ 4' },
    { id: 5, name: 'Thứ 5' },
    { id: 6, name: 'Thứ 6' }
  ];

  days.forEach(d => {
    // Buổi Sáng: Tiết 1..4
    for (let p = 1; p <= 4; p++) {
      const row = [d.name, 'Sáng', `Tiết ${p}`];
      classes.forEach(c => {
        const slot = timetable[c.id]?.[d.id]?.[p];
        if (slot && slot.subjectId) {
          const subName = _subjects[slot.subjectId]?.name || slot.subjectRaw || slot.subjectId;
          const tch = teacherMap.get(slot.teacherId);
          const tchName = slot.teacherRaw || (tch ? tch.code : '');
          row.push(subName, tchName);
        } else {
          row.push('-', '');
        }
      });
      masterRows.push(row);
    }

    // Buổi Chiều: Tiết 1..3 (Period 5..7)
    for (let p = 5; p <= 7; p++) {
      const pLabel = `Tiết ${p - 4}`;
      const row = [d.name, 'Chiều', pLabel];
      classes.forEach(c => {
        const slot = timetable[c.id]?.[d.id]?.[p];
        if (slot && slot.subjectId) {
          const subName = _subjects[slot.subjectId]?.name || slot.subjectRaw || slot.subjectId;
          const tch = teacherMap.get(slot.teacherId);
          const tchName = slot.teacherRaw || (tch ? tch.code : '');
          row.push(subName, tchName);
        } else {
          row.push('-', '');
        }
      });
      masterRows.push(row);
    }
  });

  // Chân trang ký tên
  masterRows.push([]);
  masterRows.push(['', '', '', '', '', '', '', 'Tân Mai, ngày 05 tháng 09 năm 2026']);
  masterRows.push(['', '', 'NGƯỜI LẬP BIỂU', '', '', '', '', 'HIỆU TRƯỞNG']);
  masterRows.push([]);
  masterRows.push([]);
  masterRows.push(['', '', '', '', '', '', '', 'Bùi Văn Việt']);

  const wsMaster = XLSX.utils.aoa_to_sheet(masterRows);

  // Cấu hình độ rộng cột tự động
  const colWidths = [{ wch: 10 }, { wch: 10 }, { wch: 10 }];
  classes.forEach(() => {
    colWidths.push({ wch: 18 }, { wch: 16 });
  });
  wsMaster['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, wsMaster, 'TKB_Toan_Truong');

  // === CÁC SHEET THEO TỪNG KHỐI (Khối 1 -> Khối 5) ===
  for (let g = 1; g <= 5; g++) {
    const gradeClasses = classes.filter(c => c.grade === g);
    if (gradeClasses.length === 0) continue;

    const gRows = [
      ['UBND PHƯỜNG TÂN MAI', '', '', ''],
      [sName.toUpperCase(), '', '', ''],
      [`THỜI KHÓA BIỂU KHỐI ${g} - ${sYear.toUpperCase()}`, '', '', ''],
      ['(Thực hiện từ Tuần 01 - Điểm chính)', '', '', ''],
      []
    ];

    const gHeader = ['Thứ', 'Buổi', 'Tiết'];
    gradeClasses.forEach(c => {
      gHeader.push(c.name, `GV (${c.name})`);
    });
    gRows.push(gHeader);

    days.forEach(d => {
      for (let p = 1; p <= 4; p++) {
        const row = [d.name, 'Sáng', `Tiết ${p}`];
        gradeClasses.forEach(c => {
          const slot = timetable[c.id]?.[d.id]?.[p];
          if (slot && slot.subjectId) {
            const subName = _subjects[slot.subjectId]?.name || slot.subjectRaw || slot.subjectId;
            const tch = teacherMap.get(slot.teacherId);
            const tchName = slot.teacherRaw || (tch ? tch.code : '');
            row.push(subName, tchName);
          } else {
            row.push('-', '');
          }
        });
        gRows.push(row);
      }

      for (let p = 5; p <= 7; p++) {
        const row = [d.name, 'Chiều', `Tiết ${p - 4}`];
        gradeClasses.forEach(c => {
          const slot = timetable[c.id]?.[d.id]?.[p];
          if (slot && slot.subjectId) {
            const subName = _subjects[slot.subjectId]?.name || slot.subjectRaw || slot.subjectId;
            const tch = teacherMap.get(slot.teacherId);
            const tchName = slot.teacherRaw || (tch ? tch.code : '');
            row.push(subName, tchName);
          } else {
            row.push('-', '');
          }
        });
        gRows.push(row);
      }
    });

    const wsGrade = XLSX.utils.aoa_to_sheet(gRows);
    const gColWidths = [{ wch: 10 }, { wch: 10 }, { wch: 10 }];
    gradeClasses.forEach(() => {
      gColWidths.push({ wch: 20 }, { wch: 18 });
    });
    wsGrade['!cols'] = gColWidths;

    XLSX.utils.book_append_sheet(wb, wsGrade, `Khoi_${g}`);
  }

  XLSX.writeFile(wb, 'Thoi_Khoa_Bieu_Toan_Truong_Ma_Tran.xlsx');
};

/**
 * 4. XUẤT THỜI KHÓA BIỂU TỪNG LỚP HỌC (MỖI LỚP 1 SHEET CHUẨN IN A4)
 */
export const exportClassTimetables = (timetable, classes = [], teachers = [], subjects = {}, schoolInfo = {}) => {
  const _subjects = subjects || DEFAULT_SUBJECTS;
  const sName = schoolInfo.name || 'TRƯỜNG TIỂU HỌC QUỲNH LỘC B';
  const sYear = schoolInfo.year || 'NĂM HỌC 2026 - 2027';
  const teacherMap = new Map((teachers || []).map(t => [t.id, t]));

  const wb = XLSX.utils.book_new();

  classes.forEach(cls => {
    const gvHome = teacherMap.get(cls.homeroomTeacherId);
    const gvName = gvHome ? `${gvHome.name} (${gvHome.code})` : 'Chưa gán';

    const rows = [
      [sName.toUpperCase(), '', '', '', '', '', '', ''],
      [`THỜI KHÓA BIỂU - ${cls.name.toUpperCase()}`, '', '', '', '', '', '', ''],
      [`${sYear.toUpperCase()} — (Áp dụng từ Tuần 01)`, '', '', '', '', '', '', ''],
      [`Giáo viên chủ nhiệm: ${gvName}`, '', `Phòng học: ${cls.mainRoom || `P.${cls.id}`}`, '', `Sĩ số: ${cls.studentCount || 35} học sinh`, '', '', ''],
      [],
      ['Buổi', 'Tiết', 'Thời Gian', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu']
    ];

    // Buổi Sáng (Tiết 1 -> 4)
    PERIODS.filter(p => p.session === 'morning').forEach(p => {
      const row = ['SÁNG', p.name, p.time || ''];
      DAYS_OF_WEEK.forEach(day => {
        const slot = timetable[cls.id]?.[day.id]?.[p.id];
        if (slot && slot.subjectId) {
          const sub = _subjects[slot.subjectId]?.name || slot.subjectRaw || slot.subjectId;
          const tch = teacherMap.get(slot.teacherId);
          const tCode = slot.teacherRaw || (tch ? tch.code : '');
          row.push(`${sub} (${tCode})`);
        } else {
          row.push('-');
        }
      });
      rows.push(row);
    });

    // Dòng ngăn cách buổi chiều
    rows.push(['---', '---', '--- NGHỈ TRƯA ---', '---', '---', '---', '---', '---']);

    // Buổi Chiều (Tiết 5 -> 7)
    PERIODS.filter(p => p.session === 'afternoon').forEach(p => {
      const row = ['CHIỀU', p.name, p.time || ''];
      DAYS_OF_WEEK.forEach(day => {
        const slot = timetable[cls.id]?.[day.id]?.[p.id];
        if (slot && slot.subjectId) {
          const sub = _subjects[slot.subjectId]?.name || slot.subjectRaw || slot.subjectId;
          const tch = teacherMap.get(slot.teacherId);
          const tCode = slot.teacherRaw || (tch ? tch.code : '');
          row.push(`${sub} (${tCode})`);
        } else {
          row.push('-');
        }
      });
      rows.push(row);
    });

    // Chữ ký xác nhận cuối trang
    rows.push([]);
    rows.push(['', '', '', '', '', 'Tân Mai, ngày 05 tháng 09 năm 2026', '', '']);
    rows.push(['', 'GV CHỦ NHIỆM', '', '', '', 'HIỆU TRƯỞNG', '', '']);
    rows.push([]);
    rows.push([]);
    rows.push(['', gvHome ? gvHome.name : '', '', '', '', 'Bùi Văn Việt', '', '']);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      { wch: 12 }, // Buổi
      { wch: 10 }, // Tiết
      { wch: 16 }, // Thời gian
      { wch: 25 }, // T2
      { wch: 25 }, // T3
      { wch: 25 }, // T4
      { wch: 25 }, // T5
      { wch: 25 }  // T6
    ];

    XLSX.utils.book_append_sheet(wb, ws, cls.name.replace(/[^a-zA-Z0-9]/g, '_'));
  });

  XLSX.writeFile(wb, 'Thoi_Khoa_Bieu_Tung_Lop_In_A4.xlsx');
};

/**
 * 5. XUẤT LỊCH GIẢNG DẠY CÁ NHÂN TỪNG GIÁO VIÊN
 */
export const exportTeacherTimetables = (timetable, teachers = [], classes = [], subjects = {}, schoolInfo = {}) => {
  const _subjects = subjects || DEFAULT_SUBJECTS;
  const sName = schoolInfo.name || 'TRƯỜNG TIỂU HỌC QUỲNH LỘC B';
  const sYear = schoolInfo.year || 'NĂM HỌC 2026 - 2027';

  const wb = XLSX.utils.book_new();

  // 1. Sheet Tổng Hợp Lịch Giảng Dạy Của Tất Cả Giáo Viên
  const summaryRows = [
    [sName.toUpperCase(), '', '', '', '', '', ''],
    [`BẢNG TỔNG HỢP TIẾT DẠY GIÁO VIÊN - ${sYear.toUpperCase()}`, '', '', '', '', '', ''],
    [],
    ['STT', 'Mã GV', 'Họ và Tên', 'Tên TKB', 'Tổ Chuyên Môn', 'Nhiệm Vụ', 'Tổng Tiết/Tuần']
  ];

  teachers.forEach((t, idx) => {
    let count = 0;
    classes.forEach(c => {
      for (let d = 2; d <= 6; d++) {
        for (let p = 1; p <= 7; p++) {
          if (timetable[c.id]?.[d]?.[p]?.teacherId === t.id) count++;
        }
      }
    });

    summaryRows.push([
      t.tt || (idx + 1),
      t.id,
      t.name,
      t.code || getTeacherShortName(t.name, t.homeroomClassId, t.task),
      t.department,
      t.task || t.position,
      count
    ]);
  });

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 8 }, { wch: 10 }, { wch: 25 }, { wch: 16 }, { wch: 22 }, { wch: 35 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Tong_Hop_Giao_Vien');

  // 2. Sheet riêng cho từng Giáo viên có lịch giảng dạy
  teachers.forEach(teacher => {
    let totalScheduled = 0;
    const tSchedule = {};

    DAYS_OF_WEEK.forEach(day => {
      tSchedule[day.id] = {};
      PERIODS.forEach(p => {
        let lessonFound = null;
        classes.forEach(cls => {
          const slot = timetable[cls.id]?.[day.id]?.[p.id];
          if (slot && slot.teacherId === teacher.id) {
            const subName = _subjects[slot.subjectId]?.name || slot.subjectRaw || slot.subjectId;
            lessonFound = `${subName} (${cls.name})`;
            totalScheduled++;
          }
        });
        tSchedule[day.id][p.id] = lessonFound;
      });
    });

    // Chỉ xuất sheet nếu giáo viên có lịch dạy hoặc là GVCN/BGH
    if (totalScheduled === 0 && !teacher.isHomeroom && teacher.department === 'Tổ Văn Phòng') return;

    const tRows = [
      [sName.toUpperCase(), '', '', '', '', '', '', ''],
      ['LỊCH GIẢNG DẠY CÁ NHÂN GIÁO VIÊN', '', '', '', '', '', '', ''],
      [`${sYear.toUpperCase()} — (Áp dụng từ Tuần 01)`, '', '', '', '', '', '', ''],
      [`Họ và tên: ${teacher.name} (${teacher.code})`, '', `Tổ: ${teacher.department}`, '', `Nhiệm vụ: ${teacher.task || teacher.position}`, '', `Tổng tiết: ${totalScheduled} tiết/tuần`, ''],
      [],
      ['Buổi', 'Tiết', 'Thời Gian', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu']
    ];

    // Sáng
    PERIODS.filter(p => p.session === 'morning').forEach(p => {
      const row = ['SÁNG', p.name, p.time || ''];
      DAYS_OF_WEEK.forEach(day => {
        row.push(tSchedule[day.id]?.[p.id] || '-');
      });
      tRows.push(row);
    });

    tRows.push(['---', '---', '--- NGHỈ TRƯA ---', '---', '---', '---', '---', '---']);

    // Chiều
    PERIODS.filter(p => p.session === 'afternoon').forEach(p => {
      const row = ['CHIỀU', p.name, p.time || ''];
      DAYS_OF_WEEK.forEach(day => {
        row.push(tSchedule[day.id]?.[p.id] || '-');
      });
      tRows.push(row);
    });

    tRows.push([]);
    tRows.push(['', '', '', '', '', 'Tân Mai, ngày 05 tháng 09 năm 2026', '', '']);
    tRows.push(['', 'GIÁO VIÊN', '', '', '', 'HIỆU TRƯỞNG', '', '']);
    tRows.push([]);
    tRows.push([]);
    tRows.push(['', teacher.name, '', '', '', 'Bùi Văn Việt', '', '']);

    const wsTeacher = XLSX.utils.aoa_to_sheet(tRows);
    wsTeacher['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 16 },
      { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 25 }
    ];

    const safeSheetName = (teacher.code || teacher.name).replace(/[^a-zA-Z0-9]/g, '_').substring(0, 28);
    XLSX.utils.book_append_sheet(wb, wsTeacher, safeSheetName);
  });

  XLSX.writeFile(wb, 'Lich_Giang_Day_Tung_Giao_Vien.xlsx');
};

/**
 * 6. XUẤT BẢNG TỔNG HỢP DANH BẠ & ĐỊNH MỨC CHUYÊN MÔN
 */
export const exportTeacherDirectory = (teachers = [], assignments = [], timetable = {}, classes = [], schoolInfo = {}) => {
  const sName = schoolInfo.name || 'TRƯỜNG TIỂU HỌC QUỲNH LỘC B';
  const sYear = schoolInfo.year || 'NĂM HỌC 2026 - 2027';

  const wb = XLSX.utils.book_new();

  const rows = [
    ['UBND PHƯỜNG TÂN MAI', '', '', '', '', '', '', '', '', ''],
    [sName.toUpperCase(), '', '', '', '', '', '', '', '', ''],
    [`BẢNG TỔNG HỢP DANH BẠ & ĐỊNH MỨC GIẢNG DẠY - ${sYear.toUpperCase()}`, '', '', '', '', '', '', '', '', ''],
    ['(Thống kê phân công chuyên môn và thực tế đã xếp trên Thời khóa biểu)', '', '', '', '', '', '', '', '', ''],
    [],
    [
      'STT', 
      'Mã GV', 
      'Họ và Tên', 
      'Tên TKB', 
      'Tổ Chuyên Môn', 
      'Nhiệm Vụ / Phân Công', 
      'Định Mức Chuẩn (T/Tuần)', 
      'Số Tiết Phân Công', 
      'Số Tiết Đã Xếp TKB', 
      'Chênh Lệch', 
      'Buổi Nghỉ Đăng Ký'
    ]
  ];

  let totalDinhMuc = 0;
  let totalAssigned = 0;
  let totalScheduled = 0;

  teachers.forEach((t, idx) => {
    const assigned = assignments
      .filter(a => a.teacherId === t.id)
      .reduce((sum, a) => sum + (Number(a.weeklyPeriods) || 0), 0) || t.assignedPeriods || 0;

    let scheduled = 0;
    classes.forEach(c => {
      for (let d = 2; d <= 6; d++) {
        for (let p = 1; p <= 7; p++) {
          if (timetable[c.id]?.[d]?.[p]?.teacherId === t.id) scheduled++;
        }
      }
    });

    const dinhMuc = t.dinhMuc || 23;
    const diff = scheduled - dinhMuc;
    const diffLabel = diff === 0 ? 'Đủ định mức' : (diff > 0 ? `Thừa +${diff}t` : `Thiếu ${diff}t`);

    totalDinhMuc += dinhMuc;
    totalAssigned += assigned;
    totalScheduled += scheduled;

    rows.push([
      t.tt || (idx + 1),
      t.id,
      t.name,
      t.code || getTeacherShortName(t.name, t.homeroomClassId, t.task),
      t.department,
      t.task || (t.isHomeroom ? `GVCN Lớp ${t.homeroomClassId}` : t.position),
      dinhMuc,
      assigned,
      scheduled,
      diffLabel,
      (t.offSessions || []).join(', ') || 'Không'
    ]);
  });

  // Dòng Tổng Cộng
  rows.push([]);
  rows.push([
    'TỔNG',
    `${teachers.length} GV`,
    '',
    '',
    '',
    'TOÀN TRƯỜNG',
    totalDinhMuc,
    totalAssigned,
    totalScheduled,
    totalScheduled === totalDinhMuc ? 'Cân bằng' : `${totalScheduled - totalDinhMuc}t`,
    ''
  ]);

  // Chữ ký
  rows.push([]);
  rows.push(['', '', '', '', '', '', '', 'Tân Mai, ngày 05 tháng 09 năm 2026', '', '']);
  rows.push(['', '', 'NGƯỜI LẬP BIỂU', '', '', '', '', 'HIỆU TRƯỞNG', '', '']);
  rows.push([]);
  rows.push([]);
  rows.push(['', '', '', '', '', '', '', 'Bùi Văn Việt', '', '']);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 8 },  // STT
    { wch: 10 }, // Mã GV
    { wch: 25 }, // Họ tên
    { wch: 16 }, // Tên TKB
    { wch: 24 }, // Tổ CM
    { wch: 40 }, // Nhiệm vụ
    { wch: 22 }, // Định mức
    { wch: 20 }, // Phân công
    { wch: 20 }, // Đã xếp
    { wch: 16 }, // Chênh lệch
    { wch: 20 }  // Buổi nghỉ
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Danh_Ba_Dinh_Muc_Giao_Vien');
  XLSX.writeFile(wb, 'Danh_Ba_Dinh_Muc_Giao_Vien.xlsx');
};
