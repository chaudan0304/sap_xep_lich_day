// src/services/excel/excelExporterMaster.js
// Xuất Thời Khóa Biểu Ma Trận Toàn Trường & Từng Khối (ExcelJS)

import ExcelJS from 'exceljs';
import { SUBJECTS as DEFAULT_SUBJECTS } from '../../constants/subjects.js';
import { 
  BORDER_THIN, 
  BORDER_HEADER, 
  FILL_NAVY_HEADER, 
  FILL_MORNING, 
  FILL_AFTERNOON, 
  FILL_ZEBRA, 
  saveExcelJSWorkbook 
} from './excelStyles.js';

/**
 * Helper hàm vẽ ma trận TKB chung
 */
export const renderMatrixHelper = (
  ws, 
  sheetClasses, 
  titleSuffix = '', 
  timetable = {}, 
  teacherMap = new Map(), 
  _subjects = DEFAULT_SUBJECTS, 
  schoolInfo = {}
) => {
  const sName = schoolInfo.name || 'Trường Tiểu Học Ánh Dương';
  const sYear = schoolInfo.year || 'Năm học 2026 - 2027';
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
  const sDistrict = (schoolInfo.district || 'Phòng GD&ĐT').toUpperCase();
  r1.value = `${sDistrict} — ${sName.toUpperCase()}`;
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
        if (p % 2 === 0) {
          cell.fill = FILL_ZEBRA;
        }
      }

      currentRowIdx++;
    }
    const afternoonEndRow = currentRowIdx - 1;

    // Merge Thứ
    ws.mergeCells(dayStartRow, 1, afternoonEndRow, 1);
    const dayCell = ws.getCell(dayStartRow, 1);
    dayCell.alignment = { vertical: 'middle', horizontal: 'center' };
    dayCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1E3A8A' } };
    dayCell.fill = FILL_MORNING;

    // Merge Buổi Sáng
    ws.mergeCells(morningStartRow, 2, morningEndRow, 2);
    const mCell = ws.getCell(morningStartRow, 2);
    mCell.alignment = { vertical: 'middle', horizontal: 'center' };
    mCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF3730A3' } };

    // Merge Buổi Chiều
    ws.mergeCells(afternoonStartRow, 2, afternoonEndRow, 2);
    const aCell = ws.getCell(afternoonStartRow, 2);
    aCell.alignment = { vertical: 'middle', horizontal: 'center' };
    aCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF9A3412' } };
    aCell.fill = FILL_AFTERNOON;
  });

  // Footer Ký tên
  const sigStart = currentRowIdx + 2;
  ws.mergeCells(sigStart, totalCols - 3, sigStart, totalCols);
  const dateCell = ws.getCell(sigStart, totalCols - 3);
  dateCell.value = `${schoolInfo.address ? schoolInfo.address.split(',')[0].trim() : 'Ngày 05 tháng 09 năm 2026'}`;
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
  nameCell.value = schoolInfo.principal || 'Thầy Nguyễn Văn An';
  nameCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0F172A' } };
  nameCell.alignment = { vertical: 'middle', horizontal: 'center' };
};

/**
 * Xuất Thời Khóa Biểu Toàn Trường (Ma trận + Khối 1..5)
 */
export const exportMasterTimetable = async (
  timetable, 
  classes = [], 
  teachers = [], 
  subjects = {}, 
  schoolInfo = {}
) => {
  const _subjects = subjects || DEFAULT_SUBJECTS;
  const teacherMap = new Map((teachers || []).map(t => [t.id, t]));

  const wb = new ExcelJS.Workbook();
  wb.creator = 'EduTimetable Tiểu Học';

  // 1. Sheet Ma Trận Toàn Trường
  const wsMaster = wb.addWorksheet('TKB_Toan_Truong');
  renderMatrixHelper(wsMaster, classes, `Toàn Trường (${classes.length} Lớp)`, timetable, teacherMap, _subjects, schoolInfo);

  // 2. Các Sheet theo từng Khối (Khối 1 -> Khối 5)
  for (let g = 1; g <= 5; g++) {
    const gradeClasses = classes.filter(c => c.grade === g);
    if (gradeClasses.length > 0) {
      const wsGrade = wb.addWorksheet(`Khoi_${g}`);
      renderMatrixHelper(wsGrade, gradeClasses, `Khối ${g}`, timetable, teacherMap, _subjects, schoolInfo);
    }
  }

  await saveExcelJSWorkbook(wb, 'Thoi_Khoa_Bieu_Toan_Truong_Ma_Tran.xlsx');
};
