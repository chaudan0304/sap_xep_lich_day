// src/services/excelService.js
// Trung tâm Xử lý Nhập & Xuất File Excel (SheetJS XLSX Parser + ExcelJS Styled Exporter)
// Thiết kế định dạng báo cáo chuẩn sư phạm cao cấp, căn chỉnh dòng cột, màu sắc trang nhã, tối ưu in ấn A4

import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { SUBJECTS as DEFAULT_SUBJECTS } from '../constants/subjects.js';
import { DAYS_OF_WEEK, PERIODS, DEFAULT_GRADE_QUOTAS } from '../constants/defaultCurriculum.js';
import { SAMPLE_ROOMS, SAMPLE_CLASSES, SAMPLE_TEACHERS } from '../data/sampleData.js';

import { parseExcelWorkbook, mapSubjectCodeAndRoom, resolveTeacher, getTeacherShortName } from './excelParser.js';
import { validateParsedExcelData } from './excelValidator.js';
import { mapParsedExcelToAppModel } from './excelMapper.js';

export { mapSubjectCodeAndRoom, resolveTeacher, getTeacherShortName };

// ==========================================
// 🎨 BẢNG MÃ MÀU & STYLE CHUẨN THIẾT KẾ EXCEL
// ==========================================

const BORDER_THIN = {
  top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
};

const BORDER_HEADER = {
  top: { style: 'medium', color: { argb: 'FF1E3A8A' } },
  left: { style: 'thin', color: { argb: 'FF3B82F6' } },
  bottom: { style: 'medium', color: { argb: 'FF1E3A8A' } },
  right: { style: 'thin', color: { argb: 'FF3B82F6' } }
};

const FILL_NAVY_HEADER = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1E3A8A' } // Deep Navy Blue
};

const FILL_BLUE_HEADER = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF2563EB' } // Royal Blue
};

const FILL_MORNING = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFE0E7FF' } // Soft Indigo Light
};

const FILL_AFTERNOON = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFFFEDD5' } // Soft Amber Light
};

const FILL_LUNCH = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF1F5F9' } // Soft Slate
};

const FILL_ZEBRA = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF8FAFC' }
};

const FILL_WHITE = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFFFFFFF' }
};

/**
 * Hàm lưu file tải về trình duyệt với ExcelJS
 */
const saveExcelJSWorkbook = async (workbook, filename) => {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

// ==========================================
// 1. TẢI FILE MẪU CHUẨN ĐỊNH MỨC (.xlsx)
// ==========================================
export const downloadExcelTemplate = async () => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'EduTimetable Tiểu Học';

  // Sheet 1: Dinh_Muc_Theo_Khoi
  const wsQuota = wb.addWorksheet('Dinh_Muc_Theo_Khoi');
  wsQuota.columns = [
    { header: 'Khối', key: 'grade', width: 14 },
    { header: 'Mã Môn', key: 'subjectId', width: 18 },
    { header: 'Tên Môn Học', key: 'subjectName', width: 28 },
    { header: 'Số Tiết / Tuần', key: 'weeklyPeriods', width: 18 },
    { header: 'Sáng Tối Đa', key: 'maxMorning', width: 15 },
    { header: 'Chiều Tối Đa', key: 'maxAfternoon', width: 15 },
    { header: 'Phòng Chức Năng', key: 'roomType', width: 22 }
  ];

  wsQuota.getRow(1).height = 28;
  wsQuota.getRow(1).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  wsQuota.getRow(1).fill = FILL_NAVY_HEADER;
  wsQuota.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  Object.values(DEFAULT_GRADE_QUOTAS).forEach(g => {
    g.subjects.forEach(s => {
      const row = wsQuota.addRow({
        grade: `Khối ${g.grade}`,
        subjectId: s.subjectId,
        subjectName: DEFAULT_SUBJECTS[s.subjectId]?.name || s.subjectId,
        weeklyPeriods: s.weeklyPeriods,
        maxMorning: s.maxMorning,
        maxAfternoon: s.maxAfternoon,
        roomType: s.roomType || 'LOP_HOC'
      });
      row.height = 22;
      row.alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell('subjectName').alignment = { vertical: 'middle', horizontal: 'left' };
      row.eachCell(c => { c.border = BORDER_THIN; });
    });
  });

  // Sheet 2: Danh_Sach_Giao_Vien
  const wsTeacher = wb.addWorksheet('Danh_Sach_Giao_Vien');
  wsTeacher.columns = [
    { header: 'Mã GV', key: 'id', width: 12 },
    { header: 'Họ và Tên', key: 'name', width: 26 },
    { header: 'Mã Viết Tắt (TKB)', key: 'code', width: 18 },
    { header: 'Chủ Nhiệm', key: 'homeroom', width: 16 },
    { header: 'Tổ Chuyên Môn', key: 'department', width: 24 },
    { header: 'Định Mức (Tiết/Tuần)', key: 'dinhMuc', width: 22 },
    { header: 'Buổi Đăng Ký Nghỉ', key: 'off', width: 22 }
  ];

  wsTeacher.getRow(1).height = 28;
  wsTeacher.getRow(1).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  wsTeacher.getRow(1).fill = FILL_NAVY_HEADER;
  wsTeacher.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  SAMPLE_TEACHERS.forEach(t => {
    const row = wsTeacher.addRow({
      id: t.id,
      name: t.name,
      code: t.code || getTeacherShortName(t.name, t.homeroomClassId, t.task),
      homeroom: t.isHomeroom ? `Lớp ${t.homeroomClassId}` : 'Không',
      department: t.department || 'Giáo viên',
      dinhMuc: t.dinhMuc || 23,
      off: (t.offSessions || []).join(', ') || 'Không'
    });
    row.height = 22;
    row.alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell('name').alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell('department').alignment = { vertical: 'middle', horizontal: 'left' };
    row.eachCell(c => { c.border = BORDER_THIN; });
  });

  await saveExcelJSWorkbook(wb, 'Mau_Thoi_Khoa_Bieu_Chuan_Tieu_Hoc.xlsx');
};

// ==========================================
// 2. NHẬP EXCEL VỚI PREVIEW & ĐỐI SOÁT VALIDATION
// ==========================================
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

// ==========================================
// 3. XUẤT THỜI KHÓA BIỂU MA TRẬN TOÀN TRƯỜNG
// ==========================================
export const exportMasterTimetable = async (timetable, classes = [], teachers = [], subjects = {}, schoolInfo = {}) => {
  const _subjects = subjects || DEFAULT_SUBJECTS;
  const sName = schoolInfo.name || 'Trường Tiểu Học Quỳnh Lộc B';
  const sYear = schoolInfo.year || 'Năm học 2026 - 2027';
  const teacherMap = new Map((teachers || []).map(t => [t.id, t]));

  const wb = new ExcelJS.Workbook();
  wb.creator = 'EduTimetable Tiểu Học';

  // Helper hàm vẽ ma trận
  const renderMatrixSheet = (ws, sheetClasses, titleSuffix = '') => {
    const totalCols = 3 + (sheetClasses.length * 2);

    // Cấu hình cột
    const cols = [
      { key: 'day', width: 11 },
      { key: 'session', width: 11 },
      { key: 'period', width: 11 }
    ];
    sheetClasses.forEach(c => {
      cols.push({ key: `${c.id}_sub`, width: 20 }, { key: `${c.id}_tch`, width: 17 });
    });
    ws.columns = cols;

    // Row 1: Tên đơn vị
    ws.mergeCells(1, 1, 1, totalCols);
    const r1 = ws.getCell(1, 1);
    r1.value = `UBND PHƯỜNG TÂN MAI — ${sName.toUpperCase()}`;
    r1.font = { name: 'Arial', size: 11, italic: true, color: { argb: 'FF475569' } };
    r1.alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(1).height = 22;

    // Row 2: Tiêu đề lớn
    ws.mergeCells(2, 1, 2, totalCols);
    const r2 = ws.getCell(2, 1);
    r2.value = `THỜI KHÓA BIỂU TOÀN TRƯỜNG ${titleSuffix ? `— ${titleSuffix.toUpperCase()}` : ''}`;
    r2.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF1E3A8A' } };
    r2.alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(2).height = 32;

    // Row 3: Năm học
    ws.mergeCells(3, 1, 3, totalCols);
    const r3 = ws.getCell(3, 1);
    r3.value = `${sYear.toUpperCase()} — (Áp dụng chính thức từ Tuần 01)`;
    r3.font = { name: 'Arial', size: 11, italic: true, color: { argb: 'FF64748B' } };
    r3.alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(3).height = 20;

    // Row 4: Khoảng trống
    ws.getRow(4).height = 8;

    // Row 5: Header bảng
    const headerRowIdx = 5;
    ws.getRow(headerRowIdx).height = 30;
    ws.getCell(headerRowIdx, 1).value = 'Thứ';
    ws.getCell(headerRowIdx, 2).value = 'Buổi';
    ws.getCell(headerRowIdx, 3).value = 'Tiết';

    sheetClasses.forEach((c, idx) => {
      const colSubIdx = 4 + (idx * 2);
      const colTchIdx = colSubIdx + 1;
      ws.getCell(headerRowIdx, colSubIdx).value = `${c.name}\n(Môn học)`;
      ws.getCell(headerRowIdx, colTchIdx).value = `${c.name}\n(Giáo viên)`;
    });

    for (let col = 1; col <= totalCols; col++) {
      const cell = ws.getCell(headerRowIdx, col);
      cell.fill = FILL_NAVY_HEADER;
      cell.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = BORDER_HEADER;
    }

    // Rows dữ liệu (Monday to Friday, Morning & Afternoon)
    let currentRowIdx = 6;
    const days = [
      { id: 2, name: 'Thứ Hai' },
      { id: 3, name: 'Thứ Ba' },
      { id: 4, name: 'Thứ Tư' },
      { id: 5, name: 'Thứ Năm' },
      { id: 6, name: 'Thứ Sáu' }
    ];

    days.forEach(d => {
      const dayStartRow = currentRowIdx;

      // Sáng (Tiết 1..4)
      const morningStartRow = currentRowIdx;
      for (let p = 1; p <= 4; p++) {
        const row = ws.getRow(currentRowIdx);
        row.height = 26;
        row.getCell(1).value = d.name;
        row.getCell(2).value = 'Sáng';
        row.getCell(3).value = `Tiết ${p}`;

        sheetClasses.forEach((c, idx) => {
          const colSubIdx = 4 + (idx * 2);
          const colTchIdx = colSubIdx + 1;
          const slot = timetable[c.id]?.[d.id]?.[p];

          if (slot && slot.subjectId) {
            const subName = _subjects[slot.subjectId]?.name || slot.subjectRaw || slot.subjectId;
            const tch = teacherMap.get(slot.teacherId);
            const tCode = slot.teacherRaw || (tch ? tch.code : '');

            row.getCell(colSubIdx).value = subName;
            row.getCell(colTchIdx).value = tCode;
          } else {
            row.getCell(colSubIdx).value = '-';
            row.getCell(colTchIdx).value = '';
          }
        });

        // Áp dụng border và zebra
        for (let col = 1; col <= totalCols; col++) {
          const cell = row.getCell(col);
          cell.border = BORDER_THIN;
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.font = { name: 'Arial', size: 10, color: { argb: 'FF0F172A' } };
          if (col >= 4 && col % 2 === 0) {
            cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E3A8A' } };
          }
          if (p % 2 === 0) {
            cell.fill = FILL_ZEBRA;
          }
        }

        currentRowIdx++;
      }
      const morningEndRow = currentRowIdx - 1;

      // Chiều (Tiết 5..7)
      const afternoonStartRow = currentRowIdx;
      for (let p = 5; p <= 7; p++) {
        const row = ws.getRow(currentRowIdx);
        row.height = 26;
        row.getCell(1).value = d.name;
        row.getCell(2).value = 'Chiều';
        row.getCell(3).value = `Tiết ${p - 4}`;

        sheetClasses.forEach((c, idx) => {
          const colSubIdx = 4 + (idx * 2);
          const colTchIdx = colSubIdx + 1;
          const slot = timetable[c.id]?.[d.id]?.[p];

          if (slot && slot.subjectId) {
            const subName = _subjects[slot.subjectId]?.name || slot.subjectRaw || slot.subjectId;
            const tch = teacherMap.get(slot.teacherId);
            const tCode = slot.teacherRaw || (tch ? tch.code : '');

            row.getCell(colSubIdx).value = subName;
            row.getCell(colTchIdx).value = tCode;
          } else {
            row.getCell(colSubIdx).value = '-';
            row.getCell(colTchIdx).value = '';
          }
        });

        for (let col = 1; col <= totalCols; col++) {
          const cell = row.getCell(col);
          cell.border = BORDER_THIN;
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.font = { name: 'Arial', size: 10, color: { argb: 'FF0F172A' } };
          if (col >= 4 && col % 2 === 0) {
            cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E3A8A' } };
          }
          if (p % 2 === 1) {
            cell.fill = FILL_ZEBRA;
          }
        }

        currentRowIdx++;
      }
      const afternoonEndRow = currentRowIdx - 1;
      const dayEndRow = currentRowIdx - 1;

      // Merge cột Thứ
      ws.mergeCells(dayStartRow, 1, dayEndRow, 1);
      const dayCell = ws.getCell(dayStartRow, 1);
      dayCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1E293B' } };
      dayCell.alignment = { vertical: 'middle', horizontal: 'center' };

      // Merge cột Buổi Sáng & Chiều
      ws.mergeCells(morningStartRow, 2, morningEndRow, 2);
      const mCell = ws.getCell(morningStartRow, 2);
      mCell.fill = FILL_MORNING;
      mCell.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FF1E40AF' } };
      mCell.alignment = { vertical: 'middle', horizontal: 'center' };

      ws.mergeCells(afternoonStartRow, 2, afternoonEndRow, 2);
      const aCell = ws.getCell(afternoonStartRow, 2);
      aCell.fill = FILL_AFTERNOON;
      aCell.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FFC2410C' } };
      aCell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // Chân trang ký tên
    const sigStart = currentRowIdx + 1;
    ws.getRow(sigStart).height = 20;
    ws.mergeCells(sigStart, totalCols - 3, sigStart, totalCols);
    const dateCell = ws.getCell(sigStart, totalCols - 3);
    dateCell.value = 'Tân Mai, ngày 05 tháng 09 năm 2026';
    dateCell.font = { name: 'Arial', size: 11, italic: true, color: { argb: 'FF475569' } };
    dateCell.alignment = { vertical: 'middle', horizontal: 'center' };

    const sigTitleRow = sigStart + 1;
    ws.getRow(sigTitleRow).height = 24;
    ws.mergeCells(sigTitleRow, 2, sigTitleRow, 4);
    const s1 = ws.getCell(sigTitleRow, 2);
    s1.value = 'NGƯỜI LẬP BIỂU';
    s1.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0F172A' } };
    s1.alignment = { vertical: 'middle', horizontal: 'center' };

    ws.mergeCells(sigTitleRow, totalCols - 3, sigTitleRow, totalCols);
    const s2 = ws.getCell(sigTitleRow, totalCols - 3);
    s2.value = 'HIỆU TRƯỞNG';
    s2.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0F172A' } };
    s2.alignment = { vertical: 'middle', horizontal: 'center' };

    const sigNameRow = sigStart + 5;
    ws.getRow(sigNameRow).height = 24;
    ws.mergeCells(sigNameRow, totalCols - 3, sigNameRow, totalCols);
    const nameCell = ws.getCell(sigNameRow, totalCols - 3);
    nameCell.value = 'Bùi Văn Việt';
    nameCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0F172A' } };
    nameCell.alignment = { vertical: 'middle', horizontal: 'center' };
  };

  // 1. Sheet Ma Trận Toàn Trường
  const wsMaster = wb.addWorksheet('TKB_Toan_Truong');
  renderMatrixSheet(wsMaster, classes, 'Toàn Trường (23 Lớp)');

  // 2. Các Sheet theo từng Khối (Khối 1 -> Khối 5)
  for (let g = 1; g <= 5; g++) {
    const gradeClasses = classes.filter(c => c.grade === g);
    if (gradeClasses.length > 0) {
      const wsGrade = wb.addWorksheet(`Khoi_${g}`);
      renderMatrixSheet(wsGrade, gradeClasses, `Khối ${g}`);
    }
  }

  await saveExcelJSWorkbook(wb, 'Thoi_Khoa_Bieu_Toan_Truong_Ma_Tran.xlsx');
};

// ==========================================
// 4. XUẤT THỜI KHÓA BIỂU TỪNG LỚP IN A4 (CHUẨN ĐẸP)
// ==========================================
export const exportClassTimetables = async (timetable, classes = [], teachers = [], subjects = {}, schoolInfo = {}) => {
  const _subjects = subjects || DEFAULT_SUBJECTS;
  const sName = schoolInfo.name || 'Trường Tiểu Học Quỳnh Lộc B';
  const sYear = schoolInfo.year || 'Năm học 2026 - 2027';
  const teacherMap = new Map((teachers || []).map(t => [t.id, t]));

  const wb = new ExcelJS.Workbook();
  wb.creator = 'EduTimetable Tiểu Học';

  classes.forEach(cls => {
    const ws = wb.addWorksheet(`Lop_${cls.name.replace(/[^a-zA-Z0-9]/g, '_')}`, {
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 1 }
    });

    const gvHome = teacherMap.get(cls.homeroomTeacherId);
    const gvName = gvHome ? `${gvHome.name} (${gvHome.code})` : 'Chưa gán';

    // Cấu hình cột
    ws.columns = [
      { key: 'session', width: 13 },
      { key: 'period', width: 12 },
      { key: 'time', width: 17 },
      { key: 'd2', width: 27 },
      { key: 'd3', width: 27 },
      { key: 'd4', width: 27 },
      { key: 'd5', width: 27 },
      { key: 'd6', width: 27 }
    ];

    // Header Trường
    ws.mergeCells('A1:H1');
    const r1 = ws.getCell('A1');
    r1.value = `UBND PHƯỜNG TÂN MAI — ${sName.toUpperCase()}`;
    r1.font = { name: 'Arial', size: 11, italic: true, color: { argb: 'FF475569' } };
    r1.alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(1).height = 22;

    // Tiêu Đề Lớp
    ws.mergeCells('A2:H2');
    const r2 = ws.getCell('A2');
    r2.value = `THỜI KHÓA BIỂU — ${cls.name.toUpperCase()}`;
    r2.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF1E3A8A' } };
    r2.alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(2).height = 34;

    // Năm học
    ws.mergeCells('A3:H3');
    const r3 = ws.getCell('A3');
    r3.value = `${sYear.toUpperCase()} — (Áp dụng chính thức từ Tuần 01)`;
    r3.font = { name: 'Arial', size: 11, italic: true, color: { argb: 'FF64748B' } };
    r3.alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(3).height = 20;

    // Thông tin GVCN & Phòng
    ws.mergeCells('A4:C4');
    const r4_1 = ws.getCell('A4');
    r4_1.value = `👨‍🏫 GVCN: ${gvName}`;
    r4_1.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1E293B' } };
    r4_1.alignment = { vertical: 'middle', horizontal: 'left' };

    ws.mergeCells('D4:F4');
    const r4_2 = ws.getCell('D4');
    r4_2.value = `🏫 Phòng học: ${cls.mainRoom || (cls.name.startsWith('Lớp ') ? cls.name.replace('Lớp ', 'P.') : `P.${cls.name}`)}`;
    r4_2.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1E293B' } };
    r4_2.alignment = { vertical: 'middle', horizontal: 'center' };

    ws.mergeCells('G4:H4');
    const r4_3 = ws.getCell('G4');
    r4_3.value = `👥 Sĩ số: ${cls.studentCount || 35} học sinh`;
    r4_3.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1E293B' } };
    r4_3.alignment = { vertical: 'middle', horizontal: 'right' };
    ws.getRow(4).height = 24;

    // Spacing
    ws.getRow(5).height = 8;

    // Table Header (Row 6)
    const headerRow = ws.getRow(6);
    headerRow.height = 30;
    const headers = ['Buổi', 'Tiết', 'Thời Gian', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu'];
    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.fill = FILL_NAVY_HEADER;
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = BORDER_HEADER;
    });

    // Buổi Sáng: Tiết 1..4 (Rows 7..10)
    const morningPeriods = [
      { id: 1, name: 'Tiết 1', time: '07:30 - 08:05' },
      { id: 2, name: 'Tiết 2', time: '08:15 - 08:50' },
      { id: 3, name: 'Tiết 3', time: '09:10 - 09:45' },
      { id: 4, name: 'Tiết 4', time: '09:55 - 10:30' }
    ];

    morningPeriods.forEach((p, idx) => {
      const rowIdx = 7 + idx;
      const row = ws.getRow(rowIdx);
      row.height = 42; // Rộng rãi thoáng đãng

      row.getCell(1).value = 'SÁNG';
      row.getCell(2).value = p.name;
      row.getCell(3).value = p.time;

      DAYS_OF_WEEK.forEach((d, dIdx) => {
        const colIdx = 4 + dIdx;
        const slot = timetable[cls.id]?.[d.id]?.[p.id];
        const cell = row.getCell(colIdx);

        if (slot && slot.subjectId) {
          const sub = _subjects[slot.subjectId]?.name || slot.subjectRaw || slot.subjectId;
          const tch = teacherMap.get(slot.teacherId);
          const tCode = slot.teacherRaw || (tch ? tch.code : '');
          cell.value = `${sub}\n(${tCode})`;
          cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0F172A' } };
        } else {
          cell.value = '-';
          cell.font = { name: 'Arial', size: 11, color: { argb: 'FF94A3B8' } };
        }

        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.fill = idx % 2 === 1 ? FILL_ZEBRA : FILL_WHITE;
        cell.border = BORDER_THIN;
      });

      row.getCell(2).font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FF1E293B' } };
      row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(2).border = BORDER_THIN;

      row.getCell(3).font = { name: 'Arial', size: 9.5, color: { argb: 'FF475569' } };
      row.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(3).border = BORDER_THIN;
    });

    // Merge SÁNG
    ws.mergeCells('A7:A10');
    const morningBadge = ws.getCell('A7');
    morningBadge.fill = FILL_MORNING;
    morningBadge.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FF1E40AF' } };
    morningBadge.alignment = { vertical: 'middle', horizontal: 'center' };
    morningBadge.border = BORDER_THIN;

    // Row 11: NGHỈ TRƯA
    ws.mergeCells('A11:H11');
    const lunchRow = ws.getRow(11);
    lunchRow.height = 22;
    const lunchCell = ws.getCell('A11');
    lunchCell.value = '🍽️ NGHỈ TRƯA (10:30 - 14:00)';
    lunchCell.fill = FILL_LUNCH;
    lunchCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF64748B' } };
    lunchCell.alignment = { vertical: 'middle', horizontal: 'center' };
    for (let c = 1; c <= 8; c++) lunchRow.getCell(c).border = BORDER_THIN;

    // Buổi Chiều: Tiết 5..7 (Rows 12..14)
    const afternoonPeriods = [
      { id: 5, name: 'Tiết 1', time: '14:00 - 14:35' },
      { id: 6, name: 'Tiết 2', time: '14:45 - 15:20' },
      { id: 7, name: 'Tiết 3', time: '15:30 - 16:05' }
    ];

    afternoonPeriods.forEach((p, idx) => {
      const rowIdx = 12 + idx;
      const row = ws.getRow(rowIdx);
      row.height = 42;

      row.getCell(1).value = 'CHIỀU';
      row.getCell(2).value = p.name;
      row.getCell(3).value = p.time;

      DAYS_OF_WEEK.forEach((d, dIdx) => {
        const colIdx = 4 + dIdx;
        const slot = timetable[cls.id]?.[d.id]?.[p.id];
        const cell = row.getCell(colIdx);

        if (slot && slot.subjectId) {
          const sub = _subjects[slot.subjectId]?.name || slot.subjectRaw || slot.subjectId;
          const tch = teacherMap.get(slot.teacherId);
          const tCode = slot.teacherRaw || (tch ? tch.code : '');
          cell.value = `${sub}\n(${tCode})`;
          cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0F172A' } };
        } else {
          cell.value = '-';
          cell.font = { name: 'Arial', size: 11, color: { argb: 'FF94A3B8' } };
        }

        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.fill = idx % 2 === 1 ? FILL_ZEBRA : FILL_WHITE;
        cell.border = BORDER_THIN;
      });

      row.getCell(2).font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FF1E293B' } };
      row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(2).border = BORDER_THIN;

      row.getCell(3).font = { name: 'Arial', size: 9.5, color: { argb: 'FF475569' } };
      row.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(3).border = BORDER_THIN;
    });

    // Merge CHIỀU
    ws.mergeCells('A12:A14');
    const afternoonBadge = ws.getCell('A12');
    afternoonBadge.fill = FILL_AFTERNOON;
    afternoonBadge.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFC2410C' } };
    afternoonBadge.alignment = { vertical: 'middle', horizontal: 'center' };
    afternoonBadge.border = BORDER_THIN;

    // Chữ ký (Rows 16..21)
    ws.getRow(15).height = 12;

    ws.mergeCells('F16:H16');
    const sigDate = ws.getCell('F16');
    sigDate.value = 'Tân Mai, ngày 05 tháng 09 năm 2026';
    sigDate.font = { name: 'Arial', size: 11, italic: true, color: { argb: 'FF475569' } };
    sigDate.alignment = { vertical: 'middle', horizontal: 'center' };

    ws.mergeCells('B17:C17');
    const sig1 = ws.getCell('B17');
    sig1.value = 'GIÁO VIÊN CHỦ NHIỆM';
    sig1.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0F172A' } };
    sig1.alignment = { vertical: 'middle', horizontal: 'center' };

    ws.mergeCells('F17:H17');
    const sig2 = ws.getCell('F17');
    sig2.value = 'HIỆU TRƯỞNG';
    sig2.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0F172A' } };
    sig2.alignment = { vertical: 'middle', horizontal: 'center' };

    ws.mergeCells('B18:C18');
    const sigSub1 = ws.getCell('B18');
    sigSub1.value = '(Ký và ghi rõ họ tên)';
    sigSub1.font = { name: 'Arial', size: 9.5, italic: true, color: { argb: 'FF64748B' } };
    sigSub1.alignment = { vertical: 'middle', horizontal: 'center' };

    ws.mergeCells('F18:H18');
    const sigSub2 = ws.getCell('F18');
    sigSub2.value = '(Ký và đóng dấu)';
    sigSub2.font = { name: 'Arial', size: 9.5, italic: true, color: { argb: 'FF64748B' } };
    sigSub2.alignment = { vertical: 'middle', horizontal: 'center' };

    ws.getRow(19).height = 20;
    ws.getRow(20).height = 20;

    ws.mergeCells('B21:C21');
    const sigName1 = ws.getCell('B21');
    sigName1.value = gvHome ? gvHome.name : '';
    sigName1.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0F172A' } };
    sigName1.alignment = { vertical: 'middle', horizontal: 'center' };

    ws.mergeCells('F21:H21');
    const sigName2 = ws.getCell('F21');
    sigName2.value = 'Bùi Văn Việt';
    sigName2.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0F172A' } };
    sigName2.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  await saveExcelJSWorkbook(wb, 'Thoi_Khoa_Bieu_Tung_Lop_In_A4.xlsx');
};

// ==========================================
// 5. XUẤT LỊCH GIẢNG DẠY GIÁO VIÊN
// ==========================================
export const exportTeacherTimetables = async (timetable, teachers = [], classes = [], subjects = {}, schoolInfo = {}) => {
  const _subjects = subjects || DEFAULT_SUBJECTS;
  const sName = schoolInfo.name || 'Trường Tiểu Học Quỳnh Lộc B';
  const sYear = schoolInfo.year || 'Năm học 2026 - 2027';

  const wb = new ExcelJS.Workbook();
  wb.creator = 'EduTimetable Tiểu Học';

  // Sheet 1: Bảng tổng hợp
  const wsSum = wb.addWorksheet('Tong_Hop_Giao_Vien');
  wsSum.columns = [
    { header: 'STT', key: 'stt', width: 8 },
    { header: 'Mã GV', key: 'id', width: 11 },
    { header: 'Họ và Tên', key: 'name', width: 26 },
    { header: 'Tên TKB', key: 'code', width: 17 },
    { header: 'Tổ Chuyên Môn', key: 'department', width: 25 },
    { header: 'Nhiệm Vụ Phân Công', key: 'task', width: 35 },
    { header: 'Tổng Tiết/Tuần', key: 'total', width: 18 }
  ];

  wsSum.getRow(1).height = 28;
  wsSum.getRow(1).fill = FILL_NAVY_HEADER;
  wsSum.getRow(1).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  wsSum.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  teachers.forEach((t, idx) => {
    let count = 0;
    classes.forEach(c => {
      for (let d = 2; d <= 6; d++) {
        for (let p = 1; p <= 7; p++) {
          if (timetable[c.id]?.[d]?.[p]?.teacherId === t.id) count++;
        }
      }
    });

    const row = wsSum.addRow({
      stt: t.tt || (idx + 1),
      id: t.id,
      name: t.name,
      code: t.code || getTeacherShortName(t.name, t.homeroomClassId, t.task),
      department: t.department,
      task: t.task || (t.isHomeroom ? `GVCN Lớp ${t.homeroomClassId}` : t.position),
      total: `${count} tiết`
    });
    row.height = 22;
    row.alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell('name').alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell('task').alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell('total').font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FF1E3A8A' } };
    row.eachCell(c => { c.border = BORDER_THIN; });
  });

  // Sheet riêng từng Giáo viên
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
            lessonFound = `${subName}\n(${cls.name})`;
            totalScheduled++;
          }
        });
        tSchedule[day.id][p.id] = lessonFound;
      });
    });

    if (totalScheduled === 0 && !teacher.isHomeroom && teacher.department === 'Tổ Văn Phòng') return;

    const safeSheetName = (teacher.code || teacher.name).replace(/[^a-zA-Z0-9]/g, '_').substring(0, 28);
    const ws = wb.addWorksheet(safeSheetName, {
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 1 }
    });

    ws.columns = [
      { key: 'session', width: 13 },
      { key: 'period', width: 12 },
      { key: 'time', width: 17 },
      { key: 'd2', width: 27 },
      { key: 'd3', width: 27 },
      { key: 'd4', width: 27 },
      { key: 'd5', width: 27 },
      { key: 'd6', width: 27 }
    ];

    ws.mergeCells('A1:H1');
    const r1 = ws.getCell('A1');
    r1.value = `UBND PHƯỜNG TÂN MAI — ${sName.toUpperCase()}`;
    r1.font = { name: 'Arial', size: 11, italic: true, color: { argb: 'FF475569' } };
    r1.alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(1).height = 22;

    ws.mergeCells('A2:H2');
    const r2 = ws.getCell('A2');
    r2.value = `LỊCH GIẢNG DẠY CÁ NHÂN — ${teacher.name.toUpperCase()}`;
    r2.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF1E3A8A' } };
    r2.alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(2).height = 34;

    ws.mergeCells('A3:H3');
    const r3 = ws.getCell('A3');
    r3.value = `${sYear.toUpperCase()} — (Áp dụng chính thức từ Tuần 01)`;
    r3.font = { name: 'Arial', size: 11, italic: true, color: { argb: 'FF64748B' } };
    r3.alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(3).height = 20;

    ws.mergeCells('A4:C4');
    const r4_1 = ws.getCell('A4');
    r4_1.value = `👨‍🏫 Giáo viên: ${teacher.name} (${teacher.code})`;
    r4_1.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1E293B' } };
    r4_1.alignment = { vertical: 'middle', horizontal: 'left' };

    ws.mergeCells('D4:F4');
    const r4_2 = ws.getCell('D4');
    r4_2.value = `🏢 Tổ: ${teacher.department} | ${teacher.task || teacher.position}`;
    r4_2.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1E293B' } };
    r4_2.alignment = { vertical: 'middle', horizontal: 'center' };

    ws.mergeCells('G4:H4');
    const r4_3 = ws.getCell('G4');
    r4_3.value = `⏰ Tổng số tiết dạy: ${totalScheduled} tiết/tuần`;
    r4_3.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1E293B' } };
    r4_3.alignment = { vertical: 'middle', horizontal: 'right' };
    ws.getRow(4).height = 24;

    ws.getRow(5).height = 8;

    // Header
    const headerRow = ws.getRow(6);
    headerRow.height = 30;
    const headers = ['Buổi', 'Tiết', 'Thời Gian', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu'];
    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.fill = FILL_NAVY_HEADER;
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = BORDER_HEADER;
    });

    // Sáng
    const morningPeriods = [
      { id: 1, name: 'Tiết 1', time: '07:30 - 08:05' },
      { id: 2, name: 'Tiết 2', time: '08:15 - 08:50' },
      { id: 3, name: 'Tiết 3', time: '09:10 - 09:45' },
      { id: 4, name: 'Tiết 4', time: '09:55 - 10:30' }
    ];

    morningPeriods.forEach((p, idx) => {
      const rowIdx = 7 + idx;
      const row = ws.getRow(rowIdx);
      row.height = 42;

      row.getCell(1).value = 'SÁNG';
      row.getCell(2).value = p.name;
      row.getCell(3).value = p.time;

      DAYS_OF_WEEK.forEach((d, dIdx) => {
        const colIdx = 4 + dIdx;
        const lesson = tSchedule[d.id]?.[p.id];
        const cell = row.getCell(colIdx);

        if (lesson) {
          cell.value = lesson;
          cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0F172A' } };
        } else {
          cell.value = '-';
          cell.font = { name: 'Arial', size: 11, color: { argb: 'FF94A3B8' } };
        }

        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.fill = idx % 2 === 1 ? FILL_ZEBRA : FILL_WHITE;
        cell.border = BORDER_THIN;
      });

      row.getCell(2).font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FF1E293B' } };
      row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(2).border = BORDER_THIN;

      row.getCell(3).font = { name: 'Arial', size: 9.5, color: { argb: 'FF475569' } };
      row.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(3).border = BORDER_THIN;
    });

    ws.mergeCells('A7:A10');
    const mBadge = ws.getCell('A7');
    mBadge.fill = FILL_MORNING;
    mBadge.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FF1E40AF' } };
    mBadge.alignment = { vertical: 'middle', horizontal: 'center' };
    mBadge.border = BORDER_THIN;

    // Nghỉ trưa
    ws.mergeCells('A11:H11');
    const lunchRow = ws.getRow(11);
    lunchRow.height = 22;
    const lunchCell = ws.getCell('A11');
    lunchCell.value = '🍽️ NGHỈ TRƯA (10:30 - 14:00)';
    lunchCell.fill = FILL_LUNCH;
    lunchCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF64748B' } };
    lunchCell.alignment = { vertical: 'middle', horizontal: 'center' };
    for (let c = 1; c <= 8; c++) lunchRow.getCell(c).border = BORDER_THIN;

    // Chiều
    const afternoonPeriods = [
      { id: 5, name: 'Tiết 1', time: '14:00 - 14:35' },
      { id: 6, name: 'Tiết 2', time: '14:45 - 15:20' },
      { id: 7, name: 'Tiết 3', time: '15:30 - 16:05' }
    ];

    afternoonPeriods.forEach((p, idx) => {
      const rowIdx = 12 + idx;
      const row = ws.getRow(rowIdx);
      row.height = 42;

      row.getCell(1).value = 'CHIỀU';
      row.getCell(2).value = p.name;
      row.getCell(3).value = p.time;

      DAYS_OF_WEEK.forEach((d, dIdx) => {
        const colIdx = 4 + dIdx;
        const lesson = tSchedule[d.id]?.[p.id];
        const cell = row.getCell(colIdx);

        if (lesson) {
          cell.value = lesson;
          cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0F172A' } };
        } else {
          cell.value = '-';
          cell.font = { name: 'Arial', size: 11, color: { argb: 'FF94A3B8' } };
        }

        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.fill = idx % 2 === 1 ? FILL_ZEBRA : FILL_WHITE;
        cell.border = BORDER_THIN;
      });

      row.getCell(2).font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FF1E293B' } };
      row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(2).border = BORDER_THIN;

      row.getCell(3).font = { name: 'Arial', size: 9.5, color: { argb: 'FF475569' } };
      row.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(3).border = BORDER_THIN;
    });

    ws.mergeCells('A12:A14');
    const aBadge = ws.getCell('A12');
    aBadge.fill = FILL_AFTERNOON;
    aBadge.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFC2410C' } };
    aBadge.alignment = { vertical: 'middle', horizontal: 'center' };
    aBadge.border = BORDER_THIN;

    // Chữ ký
    ws.getRow(15).height = 12;

    ws.mergeCells('F16:H16');
    const sigDate = ws.getCell('F16');
    sigDate.value = 'Tân Mai, ngày 05 tháng 09 năm 2026';
    sigDate.font = { name: 'Arial', size: 11, italic: true, color: { argb: 'FF475569' } };
    sigDate.alignment = { vertical: 'middle', horizontal: 'center' };

    ws.mergeCells('B17:C17');
    const sig1 = ws.getCell('B17');
    sig1.value = 'GIÁO VIÊN';
    sig1.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0F172A' } };
    sig1.alignment = { vertical: 'middle', horizontal: 'center' };

    ws.mergeCells('F17:H17');
    const sig2 = ws.getCell('F17');
    sig2.value = 'HIỆU TRƯỞNG';
    sig2.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0F172A' } };
    sig2.alignment = { vertical: 'middle', horizontal: 'center' };

    ws.getRow(18).height = 20;
    ws.getRow(19).height = 20;

    ws.mergeCells('B20:C20');
    const sigName1 = ws.getCell('B20');
    sigName1.value = teacher.name;
    sigName1.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0F172A' } };
    sigName1.alignment = { vertical: 'middle', horizontal: 'center' };

    ws.mergeCells('F20:H20');
    const sigName2 = ws.getCell('F20');
    sigName2.value = 'Bùi Văn Việt';
    sigName2.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0F172A' } };
    sigName2.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  await saveExcelJSWorkbook(wb, 'Lich_Giang_Day_Tung_Giao_Vien.xlsx');
};

// ==========================================
// 6. XUẤT BẢNG TỔNG HỢP DANH BẠ & ĐỊNH MỨC GIẢNG DẠY
// ==========================================
export const exportTeacherDirectory = async (teachers = [], assignments = [], timetable = {}, classes = [], schoolInfo = {}) => {
  const sName = schoolInfo.name || 'Trường Tiểu Học Quỳnh Lộc B';
  const sYear = schoolInfo.year || 'Năm học 2026 - 2027';

  const wb = new ExcelJS.Workbook();
  wb.creator = 'EduTimetable Tiểu Học';

  const ws = wb.addWorksheet('Danh_Ba_Dinh_Muc_Giao_Vien');

  ws.columns = [
    { key: 'stt', width: 8 },
    { key: 'id', width: 11 },
    { key: 'name', width: 26 },
    { key: 'code', width: 18 },
    { key: 'department', width: 25 },
    { key: 'task', width: 36 },
    { key: 'dinhMuc', width: 22 },
    { key: 'assigned', width: 20 },
    { key: 'scheduled', width: 20 },
    { key: 'diff', width: 18 },
    { key: 'off', width: 22 }
  ];

  // Header Title
  ws.mergeCells('A1:K1');
  const r1 = ws.getCell('A1');
  r1.value = `UBND PHƯỜNG TÂN MAI — ${sName.toUpperCase()}`;
  r1.font = { name: 'Arial', size: 11, italic: true, color: { argb: 'FF475569' } };
  r1.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(1).height = 22;

  ws.mergeCells('A2:K2');
  const r2 = ws.getCell('A2');
  r2.value = `BẢNG TỔNG HỢP DANH BẠ & ĐỊNH MỨC GIẢNG DẠY — ${sYear.toUpperCase()}`;
  r2.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF1E3A8A' } };
  r2.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(2).height = 34;

  ws.mergeCells('A3:K3');
  const r3 = ws.getCell('A3');
  r3.value = '(Thống kê đối soát phân công chuyên môn và số tiết giảng dạy thực tế trên Thời khóa biểu)';
  r3.font = { name: 'Arial', size: 11, italic: true, color: { argb: 'FF64748B' } };
  r3.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(3).height = 20;

  ws.getRow(4).height = 8;

  // Table Headers (Row 5)
  const headerRow = ws.getRow(5);
  headerRow.height = 30;
  const headers = [
    'STT', 
    'Mã GV', 
    'Họ và Tên', 
    'Tên Viết Tắt TKB', 
    'Tổ Chuyên Môn', 
    'Nhiệm Vụ / Phân Công', 
    'Định Mức Chuẩn (T/Tuần)', 
    'Số Tiết Phân Công', 
    'Số Tiết Đã Xếp Lịch', 
    'Chênh Lệch / Trạng Thái', 
    'Buổi Đăng Ký Nghỉ'
  ];

  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.fill = FILL_NAVY_HEADER;
    cell.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = BORDER_HEADER;
  });

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

    const row = ws.addRow({
      stt: t.tt || (idx + 1),
      id: t.id,
      name: t.name,
      code: t.code || getTeacherShortName(t.name, t.homeroomClassId, t.task),
      department: t.department,
      task: t.task || (t.isHomeroom ? `GVCN Lớp ${t.homeroomClassId}` : t.position),
      dinhMuc: `${dinhMuc} tiết`,
      assigned: `${assigned} tiết`,
      scheduled: `${scheduled} tiết`,
      diff: diffLabel,
      off: (t.offSessions || []).join(', ') || 'Không'
    });

    row.height = 24;
    row.alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell('name').alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell('name').font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FF0F172A' } };
    row.getCell('task').alignment = { vertical: 'middle', horizontal: 'left' };

    row.getCell('scheduled').font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FF1E3A8A' } };

    if (diff > 0) {
      row.getCell('diff').font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF2563EB' } };
    } else if (diff < 0) {
      row.getCell('diff').font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFDC2626' } };
    } else {
      row.getCell('diff').font = { name: 'Arial', size: 10, color: { argb: 'FF16A34A' } };
    }

    if (idx % 2 === 1) {
      row.eachCell(c => { c.fill = FILL_ZEBRA; });
    }
    row.eachCell(c => { c.border = BORDER_THIN; });
  });

  // Dòng Tổng Cộng
  const totalRow = ws.addRow({
    stt: '',
    id: 'TỔNG',
    name: `Toàn trường: ${teachers.length} Giáo viên`,
    code: '',
    department: '',
    task: '',
    dinhMuc: `${totalDinhMuc} tiết`,
    assigned: `${totalAssigned} tiết`,
    scheduled: `${totalScheduled} tiết`,
    diff: totalScheduled === totalDinhMuc ? 'Cân bằng' : `${totalScheduled - totalDinhMuc}t`,
    off: ''
  });

  totalRow.height = 28;
  totalRow.eachCell(c => {
    c.fill = FILL_MORNING;
    c.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1E3A8A' } };
    c.alignment = { vertical: 'middle', horizontal: 'center' };
    c.border = {
      top: { style: 'medium', color: { argb: 'FF1E3A8A' } },
      bottom: { style: 'medium', color: { argb: 'FF1E3A8A' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };
  });

  // Chân trang ký tên
  const sigRowIdx = ws.rowCount + 2;
  ws.mergeCells(sigRowIdx, 8, sigRowIdx, 11);
  const sigDate = ws.getCell(sigRowIdx, 8);
  sigDate.value = 'Tân Mai, ngày 05 tháng 09 năm 2026';
  sigDate.font = { name: 'Arial', size: 11, italic: true, color: { argb: 'FF475569' } };
  sigDate.alignment = { vertical: 'middle', horizontal: 'center' };

  const sigTitleRowIdx = sigRowIdx + 1;
  ws.mergeCells(sigTitleRowIdx, 2, sigTitleRowIdx, 4);
  const s1 = ws.getCell(sigTitleRowIdx, 2);
  s1.value = 'NGƯỜI LẬP BIỂU';
  s1.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0F172A' } };
  s1.alignment = { vertical: 'middle', horizontal: 'center' };

  ws.mergeCells(sigTitleRowIdx, 8, sigTitleRowIdx, 11);
  const s2 = ws.getCell(sigTitleRowIdx, 8);
  s2.value = 'HIỆU TRƯỞNG';
  s2.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0F172A' } };
  s2.alignment = { vertical: 'middle', horizontal: 'center' };

  const sigNameRowIdx = sigTitleRowIdx + 4;
  ws.mergeCells(sigNameRowIdx, 8, sigNameRowIdx, 11);
  const nameCell = ws.getCell(sigNameRowIdx, 8);
  nameCell.value = 'Bùi Văn Việt';
  nameCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0F172A' } };
  nameCell.alignment = { vertical: 'middle', horizontal: 'center' };

  await saveExcelJSWorkbook(wb, 'Danh_Ba_Dinh_Muc_Giao_Vien.xlsx');
};
