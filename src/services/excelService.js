// src/services/excelService.js
// Xử lý Toàn diện Nhập & Xuất File Excel (SheetJS XLSX)
// Tương thích cả định dạng chuẩn Bộ GD&ĐT và định dạng STKB thực tế nhiều Sheet (Khối 1 -> 5, Phân công chuyên môn, Tiết đọc TV)

import * as XLSX from 'xlsx';
import { SUBJECTS as DEFAULT_SUBJECTS } from '../constants/subjects.js';
import { DAYS_OF_WEEK, PERIODS, DEFAULT_GRADE_QUOTAS } from '../constants/defaultCurriculum.js';
import { SAMPLE_ROOMS, SAMPLE_CLASSES, SAMPLE_TEACHERS, generateSampleAssignments } from '../data/sampleData.js';

import { parseExcelWorkbook, mapSubjectCodeAndRoom, resolveTeacher } from './excelParser.js';
import { validateParsedExcelData } from './excelValidator.js';
import { mapParsedExcelToAppModel } from './excelMapper.js';

export { mapSubjectCodeAndRoom, resolveTeacher };

/**
 * 1. TẢI FILE MẪU CHUẨN ĐỊNH MỨC (.xlsx)
 */
export const downloadExcelTemplate = () => {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Định Mức Theo Khối
  const quotaRows = [];
  Object.values(DEFAULT_GRADE_QUOTAS).forEach(g => {
    g.subjects.forEach(s => {
      quotaRows.push({
        'Khối': g.grade,
        'Mã Môn': s.subjectId,
        'Tên Môn Học': DEFAULT_SUBJECTS[s.subjectId]?.name || s.subjectId,
        'Số Tiết / Tuần': s.weeklyPeriods,
        'Số Tiết Sáng Tối Đa': s.maxMorning,
        'Số Tiết Chiều Tối Đa': s.maxAfternoon,
        'Cho Phép Tiết Kép (2T)': s.allowDouble ? 'CÓ' : 'KHÔNG',
        'Phòng Chức Năng Yêu Cầu': s.roomType || 'LOP_HOC'
      });
    });
  });
  const wsQuota = XLSX.utils.json_to_sheet(quotaRows);
  XLSX.utils.book_append_sheet(wb, wsQuota, 'Dinh_Muc_Theo_Khoi');

  // Sheet 2: Danh Sách Giáo Viên
  const teacherRows = SAMPLE_TEACHERS.map(t => ({
    'Mã GV': t.id,
    'Họ và Tên': t.name,
    'Mã Viết Tắt': t.code,
    'Là GV Chủ Nhiệm (CÓ/KHÔNG)': t.isHomeroom ? 'CÓ' : 'KHÔNG',
    'Chủ Nhiệm Lớp': t.homeroomClassId || '',
    'Số Điện Thoại': t.phone || '',
    'Email': t.email || '',
    'Số Tiết Tối Đa / Ngày': t.maxPeriodsPerDay || 6,
    'Buổi Đăng Ký Nghỉ': (t.offSessions || []).join(', ')
  }));
  const wsTeacher = XLSX.utils.json_to_sheet(teacherRows);
  XLSX.utils.book_append_sheet(wb, wsTeacher, 'Danh_Sach_Giao_Vien');

  // Sheet 3: Danh Sách Lớp
  const classRows = SAMPLE_CLASSES.map(c => ({
    'Mã Lớp': c.id,
    'Tên Lớp': c.name,
    'Khối': c.grade,
    'Mã GVCN': c.homeroomTeacherId,
    'Phòng Học Chính': c.mainRoom || 'P.101',
    'Sĩ Số Học Sinh': c.studentCount || 35
  }));
  const wsClass = XLSX.utils.json_to_sheet(classRows);
  XLSX.utils.book_append_sheet(wb, wsClass, 'Danh_Sach_Lop');

  // Sheet 4: Phòng Chức Năng
  const roomRows = SAMPLE_ROOMS.map(r => ({
    'Mã Phòng': r.id,
    'Tên Phòng Chức Năng': r.name,
    'Mã Ký Hiệu': r.code,
    'Sức Chứa (Học Sinh)': r.capacity
  }));
  const wsRoom = XLSX.utils.json_to_sheet(roomRows);
  XLSX.utils.book_append_sheet(wb, wsRoom, 'Phong_Chuc_Nang');

  // Sheet 5: Phân Công Giảng Dạy Mẫu
  const sampleAsg = generateSampleAssignments(SAMPLE_CLASSES, DEFAULT_GRADE_QUOTAS, SAMPLE_TEACHERS);
  const asgRows = sampleAsg.map(a => ({
    'Mã Lớp': a.classId,
    'Khối': a.grade,
    'Mã Môn Học': a.subjectId,
    'Mã Giáo Viên Phụ Trách': a.teacherId,
    'Số Tiết / Tuần': a.weeklyPeriods,
    'Phòng Chức Năng': a.roomType
  }));
  const wsAsg = XLSX.utils.json_to_sheet(asgRows);
  XLSX.utils.book_append_sheet(wb, wsAsg, 'Phan_Cong_Giang_Day');

  XLSX.writeFile(wb, 'Mau_Thoi_Khoa_Bieu_Tieu_Hoc.xlsx');
};

/**
 * 2. ĐỌC VÀ PHÂN TÍCH FILE EXCEL VỚI PREVIEW & VALIDATION ĐẦY ĐỦ
 * @param {File} file File Excel từ trình duyệt
 * @returns {Promise<Object>} { success, previewData, errors, warnings, summary, data }
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

/**
 * Hàm import tương thích ngược
 */
export const importExcelData = async (file) => {
  const result = await importExcelWithPreview(file);
  return result;
};

/**
 * 3. XUẤT THỜI KHÓA BIỂU MA TRẬN TOÀN TRƯỜNG
 */
export const exportMasterTimetable = (timetable, classes, teachers, subjects) => {
  const _subjects = subjects || DEFAULT_SUBJECTS;
  const wb = XLSX.utils.book_new();
  const teacherMap = new Map(teachers.map(t => [t.id, t]));

  const rows = [];

  classes.forEach(cls => {
    for (let period = 1; period <= 7; period++) {
      const periodName = period <= 4 ? `Sáng - Tiết ${period}` : `Chiều - Tiết ${period - 4}`;
      const row = {
        'Lớp': cls.name,
        'Khối': cls.grade,
        'Tiết Học': periodName
      };

      DAYS_OF_WEEK.forEach(day => {
        const slot = timetable[cls.id]?.[day.id]?.[period];
        if (slot && slot.subjectId) {
          const sName = _subjects[slot.subjectId]?.name || DEFAULT_SUBJECTS[slot.subjectId]?.name || slot.subjectId;
          const tName = teacherMap.get(slot.teacherId)?.code || slot.teacherId || '';
          row[day.name] = `${sName} (${tName})`;
        } else {
          row[day.name] = '-';
        }
      });

      rows.push(row);
    }
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'TKB_Toan_Truong_Matrix');
  XLSX.writeFile(wb, 'Thoi_Khoa_Bieu_Toan_Truong.xlsx');
};

/**
 * 4. XUẤT THỜI KHÓA BIỂU TỪNG LỚP (MỖI LỚP 1 SHEET IN A4)
 */
export const exportClassTimetables = (timetable, classes, teachers, subjects) => {
  const _subjects = subjects || DEFAULT_SUBJECTS;
  const wb = XLSX.utils.book_new();
  const teacherMap = new Map(teachers.map(t => [t.id, t]));

  classes.forEach(cls => {
    const rows = [];
    const gvHome = teacherMap.get(cls.homeroomTeacherId);

    rows.push({ 'Buổi': 'TRƯỜNG TIỂU HỌC QUỲNH LỘC B', 'Tiết': '', 'Thời Gian': '', 'Thứ Hai': `THỜI KHÓA BIỂU ${cls.name.toUpperCase()}`, 'Thứ Ba': '', 'Thứ Tư': '', 'Thứ Năm': '', 'Thứ Sáu': '' });
    rows.push({ 'Buổi': `GVCN: ${gvHome?.name || ''}`, 'Tiết': `Phòng: ${cls.mainRoom || ''}`, 'Thời Gian': '', 'Thứ Hai': '', 'Thứ Ba': '', 'Thứ Tư': '', 'Thứ Năm': '', 'Thứ Sáu': '' });
    rows.push({});

    PERIODS.forEach(p => {
      const row = {
        'Buổi': p.session === 'morning' ? 'SÁNG' : 'CHIỀU',
        'Tiết': p.name,
        'Thời Gian': p.time
      };

      DAYS_OF_WEEK.forEach(day => {
        const slot = timetable[cls.id]?.[day.id]?.[p.id];
        if (slot && slot.subjectId) {
          const sName = _subjects[slot.subjectId]?.name || DEFAULT_SUBJECTS[slot.subjectId]?.name || slot.subjectId;
          const tName = teacherMap.get(slot.teacherId)?.name || '';
          row[day.name] = `${sName}\n(${tName})`;
        } else {
          row[day.name] = '';
        }
      });

      rows.push(row);
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, cls.name.replace(/[^a-zA-Z0-9]/g, '_'));
  });

  XLSX.writeFile(wb, 'Thoi_Khoa_Bieu_Cac_Lop.xlsx');
};

/**
 * 5. XUẤT THỜI KHÓA BIỂU CÁ NHÂN GIÁO VIÊN
 */
export const exportTeacherTimetables = (timetable, teachers, classes, subjects) => {
  const _subjects = subjects || DEFAULT_SUBJECTS;
  const wb = XLSX.utils.book_new();

  teachers.forEach(teacher => {
    const rows = [];
    PERIODS.forEach(p => {
      const row = {
        'Buổi': p.session === 'morning' ? 'SÁNG' : 'CHIỀU',
        'Tiết': p.name,
        'Thời Gian': p.time
      };

      DAYS_OF_WEEK.forEach(day => {
        let lessonFound = null;

        classes.forEach(cls => {
          const slot = timetable[cls.id]?.[day.id]?.[p.id];
          if (slot && slot.teacherId === teacher.id) {
            const sName = _subjects[slot.subjectId]?.name || DEFAULT_SUBJECTS[slot.subjectId]?.name || slot.subjectId;
            lessonFound = `${sName} - ${cls.name}`;
          }
        });

        row[day.name] = lessonFound || '-';
      });

      rows.push(row);
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const sheetName = (teacher.code || teacher.name).replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  XLSX.writeFile(wb, 'Thoi_Khoa_Bieu_Giao_Vien.xlsx');
};

/**
 * 6. XUẤT DANH SÁCH GIÁO VIÊN VÀ THỐNG KÊ ĐỊNH MỨC
 */
export const exportTeacherDirectory = (teachers, assignments, timetable, classes) => {
  const wb = XLSX.utils.book_new();

  const rows = teachers.map((t, idx) => {
    const assignedPeriods = assignments
      .filter(a => a.teacherId === t.id)
      .reduce((sum, a) => sum + (Number(a.weeklyPeriods) || 0), 0);

    let actualScheduled = 0;
    classes.forEach(cls => {
      for (let d = 2; d <= 6; d++) {
        for (let p = 1; p <= 7; p++) {
          const slot = timetable[cls.id]?.[d]?.[p];
          if (slot && slot.teacherId === t.id) {
            actualScheduled++;
          }
        }
      }
    });

    return {
      'STT': t.tt || (idx + 1),
      'Mã GV': t.id,
      'Họ và Tên': t.name,
      'Mã Viết Tắt': t.code,
      'Nhiệm Vụ': t.task || (t.isHomeroom ? `GVCN Lớp ${t.homeroomClassId}` : 'GV Bộ Môn'),
      'Định Mức Tiết/Tuần': t.dinhMuc || t.weeklyQuota || 23,
      'Tổng Số Tiết Phân Công / Tuần': assignedPeriods || t.assignedPeriods || 0,
      'Số Tiết Đã Xếp Lịch': actualScheduled,
      'Buổi Đăng Ký Nghỉ': (t.offSessions || []).join(', ')
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Danh_Sach_Giao_Vien');
  XLSX.writeFile(wb, 'Danh_Sach_Giao_Vien_Quynh_Loc_B.xlsx');
};
